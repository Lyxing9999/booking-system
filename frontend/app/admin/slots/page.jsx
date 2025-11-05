"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import {
  Table,
  Button,
  Modal,
  Form,
  DatePicker,
  TimePicker,
  message,
  Space,
  Tag,
  Input,
  Select,
  Popconfirm,
} from "antd";
import dayjs from "dayjs";
import DashboardLayout from "../../components/DashboardLayout";
import { getTodayCambodia, getNowCambodiaRounded } from "../../utils/time";

export default function AdminSlotsPage() {
  const router = useRouter();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [selectedDate, setSelectedDate] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [modalDate, setModalDate] = useState(null);

  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [isPending, startTransition] = useTransition();

  const notify = {
    success: (text) => messageApi.success(text, 3),
    error: (text) => messageApi.error(text, 3),
  };

  const statusColors = {
    available: "green",
    booked: "blue",
    expired: "red",
  };

  // ---------------- Fetch Slots ----------------
  const fetchSlots = async ({ pageNum = page, date = selectedDate, search = searchText, status = statusFilter } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageNum, limit });
      if (search) params.append("search", search);
      if (date) params.append("date", date);
      if (status) params.append("status", status);

      const { data } = await api.get(`/slots/admin?${params.toString()}`);
      const fetchedSlots = data.slots || data;

      setSlots(fetchedSlots);
      setTotal(data.total || fetchedSlots.length);
      setPage(pageNum);
    } catch (err) {
      notify.error(err.message || "Failed to load slots");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Effects ----------------
  // Fetch slots on filter/search change
  useEffect(() => {
    setLoading(true);
    const handler = setTimeout(() => fetchSlots({ pageNum: 1 }), 300);
    return () => clearTimeout(handler);
  }, [selectedDate, searchText, statusFilter]);

  // ---------------- Helpers ----------------
  const getDisabledTime = (date) => {
    const today = getTodayCambodia();
    if (!date || date !== today) return {};

    const now = getNowCambodiaRounded();
    return {
      disabledHours: () => Array.from({ length: now.h }, (_, i) => i),
      disabledMinutes: (hour) => (hour === now.h ? Array.from({ length: now.m }, (_, i) => i) : []),
      disabledSeconds: () => [],
    };
  };

  const openModal = (slot = null) => {
    setEditingSlot(slot);
    setShowModal(true);

    form.setFieldsValue(
      slot
        ? { ...slot, date: dayjs(slot.date), time: slot.time ? dayjs(`1970-01-01T${slot.time}`) : null }
        : { date: null, time: null }
    );

    setModalDate(slot ? dayjs(slot.date).format("YYYY-MM-DD") : getTodayCambodia());
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const slotData = {
        date: values.date.format("YYYY-MM-DD"),
        time: values.time?.format("HH:mm") || null,
      };

      if (editingSlot) {
        const { data } = await api.put(`/slots/${editingSlot._id}`, slotData);
        setSlots((prev) => prev.map((s) => (s._id === editingSlot._id ? data : s)));
        notify.success("Slot updated");
      } else {
        const { data } = await api.post("/slots", slotData);
        setSlots((prev) => [...prev, data]);
        notify.success("Slot created");
      }

      setShowModal(false);
      setEditingSlot(null);
      form.resetFields();

      fetchSlots({ pageNum: 1 });
    } catch {
      notify.error("Error saving slot");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/slots/${id}`);
      setSlots((prev) => prev.filter((s) => s._id !== id));
      notify.success("Slot removed");
    } catch {
      notify.error("Failed to delete slot");
    }
  };

  const handleReset = () => {
    setSelectedDate(null);
    setSearchText("");
    setStatusFilter(null);
    fetchSlots({ pageNum: 1 });
  };

  // ---------------- Components ----------------

  const SlotActions = ({ slot }) => {
    const disabled = slot.status !== "available";
  
    return (
      <div className="flex gap-2">
        <Button type="primary" onClick={() => openModal(slot)} disabled={disabled}>
          Edit
        </Button>
  
        <Popconfirm
          title="Are you sure you want to remove this slot?"
          onConfirm={() => handleDelete(slot._id)}
          okText="Yes"
          cancelText="No"
          disabled={disabled} // disables popconfirm if the slot is not available
        >
          <Button danger disabled={disabled}>Remove</Button>
        </Popconfirm>
      </div>
    );
  };

  const slotColumns = [
    { title: "Date", dataIndex: "date" },
    { title: "Time", dataIndex: "time" },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => {
        const s = status || "available";
        return (
          <Tag color={statusColors[s]} style={{ padding: "0 8px", fontWeight: 500 }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Tag>
        );
      },
    },
    { title: "Actions", render: (_, record) => <SlotActions slot={record} /> },
  ];

  // ---------------- Navigation ----------------
  const navigate = (path) => {
    startTransition(() => {
      router.push(path);
    });
  };
  // ---------------- Render ----------------
  return (
    <DashboardLayout role="admin">
      <div className="p-6">
        {contextHolder}

        <Space className="mb-6" wrap size={[8, 8]}>
          <Button onClick={() => navigate("/admin/users")}>Users</Button>
          <Button type="primary" onClick={() => navigate("/admin/slots")}>Slots</Button>
          <Button onClick={() => navigate("/admin/bookings")}>All Bookings</Button>
          <Button onClick={() => navigate("/admin/confirmed-bookings")}>Confirmed Bookings</Button>
        </Space>

        <h2 className="text-2xl font-semibold mb-4">Slots</h2>

        <Space className="mb-4" wrap size={[8, 8]}>
          <DatePicker
            value={selectedDate ? dayjs(selectedDate) : null}
            onChange={(date) => setSelectedDate(date ? date.format("YYYY-MM-DD") : null)}
            placeholder="Filter by date"
          />
          <Input.Search
            placeholder="Search time"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            value={statusFilter || "all"}
            onChange={(value) => setStatusFilter(value === "all" ? null : value)}
            style={{ width: 120 }}
          >
            <Select.Option value="all">All</Select.Option>
            <Select.Option value="available">Available</Select.Option>
            <Select.Option value="booked">Booked</Select.Option>
            <Select.Option value="expired">Expired</Select.Option>
          </Select>

          <Button onClick={handleReset} disabled={loading}>Reset</Button>
          <Button type="primary" onClick={() => openModal()}>Create Slot</Button>
        </Space>

        <Table
          rowKey="_id"
          columns={slotColumns}
          dataSource={slots}
          loading={loading || isPending}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            onChange: (p) => fetchSlots({ pageNum: p }),
            showTotal: (total) => `Total ${total} slots`,
          }}
          bordered
          size="middle"
          scroll={{ x: 'max-content' }}
        />

        <Modal
          title={editingSlot ? "Edit Slot" : "New Slot"}
          open={showModal}
          onCancel={() => setShowModal(false)}
          onOk={handleSave}
        >
          <Form form={form} layout="vertical">
            <Form.Item label="Date" name="date" rules={[{ required: true, message: "Please pick a date" }]}>
              <DatePicker
                value={modalDate ? dayjs(modalDate) : null}
                onChange={(date) => setModalDate(date ? date.format("YYYY-MM-DD") : null)}
                disabledDate={(current) => current && current < dayjs(getTodayCambodia())}
              />
            </Form.Item>

            <Form.Item label="Time" name="time" rules={[{ required: true, message: "Please pick a time" }]}>
              <TimePicker
                format="HH:mm"
                use12Hours={false}
                showNow={false}
                disabledTime={() => getDisabledTime(modalDate)}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}