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
  message,
  Space,
  Tag,
  Input,
  Select,
  Popconfirm,
  InputNumber,
  Upload,
  Avatar,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getTodayCambodia } from "../../utils/time";
import { getGameImageUrl, formatPrice } from "../../utils/image";

export default function AdminSlotsClient() {
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
  const [imageFile, setImageFile] = useState(null);

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
    disabled: "default",
  };

  const fetchSlots = async ({
    pageNum = page,
    date = selectedDate,
    search = searchText,
    status = statusFilter,
  } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageNum, limit });
      if (search) params.append("search", search);
      if (date) params.append("date", date);
      if (status) params.append("status", status);

      const { data } = await api.get(`/slots/admin?${params.toString()}`);
      setSlots(data.slots || []);
      setTotal(data.total || 0);
      setPage(pageNum);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to load slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => fetchSlots({ pageNum: 1 }), 300);
    return () => clearTimeout(handler);
  }, [selectedDate, searchText, statusFilter]);

  const openModal = (slot = null) => {
    setEditingSlot(slot);
    setImageFile(null);
    setShowModal(true);

    if (slot) {
      form.setFieldsValue({
        gameTitle: slot.gameTitle,
        description: slot.description,
        date: dayjs(slot.date),
        time: slot.time,
        price: slot.price,
        maxPlayers: slot.maxPlayers,
        status: slot.status,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ price: 0, maxPlayers: 1, status: "available" });
    }
  };

  const buildFormData = (values) => {
    const formData = new FormData();
    formData.append("gameTitle", values.gameTitle);
    formData.append("description", values.description || "");
    formData.append("date", values.date.format("YYYY-MM-DD"));
    formData.append("time", values.time);
    formData.append("price", String(values.price ?? 0));
    formData.append("maxPlayers", String(values.maxPlayers ?? 1));
    if (values.status) formData.append("status", values.status);
    if (imageFile) formData.append("gameImage", imageFile);
    return formData;
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (!editingSlot && !imageFile) {
        notify.error("Game image is required");
        return;
      }

      const formData = buildFormData(values);

      if (editingSlot) {
        await api.patch(`/slots/admin/${editingSlot._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        notify.success("Slot updated");
      } else {
        await api.post("/slots/admin", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        notify.success("Slot created");
      }

      setShowModal(false);
      setEditingSlot(null);
      setImageFile(null);
      form.resetFields();
      fetchSlots({ pageNum: 1 });
    } catch (err) {
      notify.error(err?.response?.data?.message || "Error saving slot");
    }
  };

  const handleDisable = async (id) => {
    try {
      await api.delete(`/slots/admin/${id}`);
      notify.success("Slot disabled");
      fetchSlots({ pageNum: page });
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to disable slot");
    }
  };

  const handleReset = () => {
    setSelectedDate(null);
    setSearchText("");
    setStatusFilter(null);
    fetchSlots({ pageNum: 1 });
  };

  const slotColumns = [
    {
      title: "Image",
      dataIndex: "gameImage",
      render: (img, record) => (
        <Avatar shape="square" size={56} src={getGameImageUrl(img)} alt={record.gameTitle} />
      ),
    },
    { title: "Game", dataIndex: "gameTitle" },
    { title: "Play Date", dataIndex: "date" },
    { title: "Play Time", dataIndex: "time" },
    {
      title: "Price",
      dataIndex: "price",
      render: (price) => formatPrice(price),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status, record) => {
        const s = record.expired ? "expired" : status || "available";
        const colors = { ...statusColors, expired: "red" };
        return (
          <Tag color={colors[s] || "default"}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Tag>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: (d) => (d ? dayjs(d).format("YYYY-MM-DD HH:mm") : "-"),
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button type="primary" onClick={() => openModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Disable this slot?"
            description="This will hide it from users."
            onConfirm={() => handleDisable(record._id)}
            okText="Disable"
            disabled={record.status === "disabled"}
          >
            <Button danger disabled={record.status === "disabled"}>
              Disable
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const navigate = (path) => startTransition(() => router.push(path));

  return (
    <div className="p-6 themed-page">
      {contextHolder}

      <Space className="mb-6" wrap size={[8, 8]}>
        <Button onClick={() => navigate("/admin/users")}>Users</Button>
        <Button type="primary" onClick={() => navigate("/admin/slots")}>
          PS5 Slots
        </Button>
        <Button onClick={() => navigate("/admin/bookings")}>All Bookings</Button>
        <Button onClick={() => navigate("/admin/confirmed-bookings")}>
          Confirmed Bookings
        </Button>
      </Space>

      <h2 className="text-2xl font-semibold mb-4">PS5 Slot Management</h2>

      <Space className="mb-4" wrap size={[8, 8]}>
        <DatePicker
          value={selectedDate ? dayjs(selectedDate) : null}
          onChange={(date) =>
            setSelectedDate(date ? date.format("YYYY-MM-DD") : null)
          }
          placeholder="Filter by date"
        />
        <Input.Search
          placeholder="Search game, date, or time"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          value={statusFilter || "all"}
          onChange={(value) => setStatusFilter(value === "all" ? null : value)}
          style={{ width: 140 }}
        >
          <Select.Option value="all">All</Select.Option>
          <Select.Option value="available">Available</Select.Option>
          <Select.Option value="booked">Booked</Select.Option>
          <Select.Option value="disabled">Disabled</Select.Option>
        </Select>
        <Button onClick={handleReset} disabled={loading}>
          Reset
        </Button>
        <Button type="primary" onClick={() => openModal()}>
          Create PS5 Slot
        </Button>
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
          showTotal: (t) => `Total ${t} slots`,
        }}
        bordered
        size="middle"
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={editingSlot ? "Edit PS5 Slot" : "Create PS5 Slot"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSave}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Game Title"
            name="gameTitle"
            rules={[{ required: true, message: "Game title is required" }]}
          >
            <Input placeholder="e.g. FIFA 25" />
          </Form.Item>

          <Form.Item label="Game Image" required={!editingSlot}>
            <Upload
              beforeUpload={(file) => {
                setImageFile(file);
                return false;
              }}
              maxCount={1}
              accept="image/*"
              onRemove={() => setImageFile(null)}
              listType="picture"
            >
              <Button icon={<UploadOutlined />}>
                {editingSlot ? "Replace image (optional)" : "Upload cover image"}
              </Button>
            </Upload>
            {editingSlot?.gameImage && !imageFile && (
              <img
                src={getGameImageUrl(editingSlot.gameImage)}
                alt="Current"
                style={{ marginTop: 8, height: 80, borderRadius: 4 }}
              />
            )}
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} placeholder="Short game description" />
          </Form.Item>

          <Form.Item
            label="Play Date"
            name="date"
            rules={[{ required: true, message: "Date is required" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              disabledDate={(current) =>
                current && current < dayjs(getTodayCambodia())
              }
            />
          </Form.Item>

          <Form.Item
            label="Play Time"
            name="time"
            rules={[{ required: true, message: "Time is required" }]}
            extra='e.g. "14:00 - 15:00" or "14:00"'
          >
            <Input placeholder="14:00 - 15:00" />
          </Form.Item>

          <Space style={{ width: "100%" }} size="large">
            <Form.Item label="Price ($/hr)" name="price">
              <InputNumber min={0} step={0.5} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item label="Max Players" name="maxPlayers">
              <InputNumber min={1} max={4} style={{ width: 100 }} />
            </Form.Item>
          </Space>

          {editingSlot && (
            <Form.Item label="Status" name="status">
              <Select>
                <Select.Option value="available">Available</Select.Option>
                <Select.Option value="booked">Booked</Select.Option>
                <Select.Option value="disabled">Disabled</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
