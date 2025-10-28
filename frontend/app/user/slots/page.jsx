"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Table,
  Tag,
  DatePicker,
  Input,
  Button,
  Space,
  message,
  Modal,
  Form,
  Typography,
  Dropdown,
} from "antd";
import { BookOutlined, DownOutlined } from "@ant-design/icons";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import { useRouter } from "next/navigation";

export default function UserSlotsPage() {
  const router = useRouter();

  // ---------------- State ----------------
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterDate, setFilterDate] = useState(null);

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form] = Form.useForm();

  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const notify = {
    success: (text) => messageApi.success(text, 3),
    error: (text) => messageApi.error(text, 3),
  };

  // ---------------- Debounce ----------------
  function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      setLoading(true);
      const timer = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
  }
  const debouncedSearch = useDebounce(searchText);

  // ---------------- Fetch Slots ----------------
  const fetchSlots = async (p = 1, status = filterStatus) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit });
      if (status) params.append("status", status);
      if (filterDate) params.append("date", filterDate.format("YYYY-MM-DD"));
      if (debouncedSearch) params.append("search", debouncedSearch);

      const res = await api.get(`/slots/user?${params.toString()}`);
      setSlots(res.data.slots || []);
      setTotal(res.data.total || res.data.slots?.length || 0);
      setPage(p);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to fetch slots");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Effects ----------------
  useEffect(() => {
    fetchSlots(1);
  }, []);

  useEffect(() => {
    fetchSlots(1);
  }, [filterDate, debouncedSearch, filterStatus]);

  // ---------------- Booking Modal ----------------
  const openBookingModal = (slot) => {
    setSelectedSlot(slot);
    setBookingModalVisible(true);
    form.resetFields();
  };

  const handleBooking = async (values) => {
    try {
      await api.post("/bookings", { slotId: selectedSlot._id, notes: values.notes });
      notify.success("Booking successful");
      setBookingModalVisible(false);
      fetchSlots(page);
    } catch {
      notify.error("Booking failed");
    }
  };

  // ---------------- Table Columns ----------------
  const columns = [
    { title: "Date", dataIndex: "date" },
    { title: "Time", dataIndex: "time" },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => {
        const colors = { available: "green", booked: "red", expired: "gray" };
        const text = status === "available" ? "Available" : status === "booked" ? "Booked" : "Expired";
        return <Tag color={colors[status] || "default"}>{text}</Tag>;
      },
    },
    {
      title: "Action",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<BookOutlined />}
          disabled={record.status !== "available"}
          onClick={() => openBookingModal(record)}
        >
          Book
        </Button>
      ),
    },
  ];

  // ---------------- Status Dropdown ----------------
  const statusMenu = {
    items: [
      { key: "all", label: "All" },
      { key: "available", label: "Available" },
      { key: "booked", label: "Booked" },
    ],
    onClick: ({ key }) => setFilterStatus(key === "all" ? null : key),
  };

  const getDropdownLabel = () =>
    filterStatus === "available" ? "Available" : filterStatus === "booked" ? "Booked" : "All";

  // ---------------- Navigation ----------------
  const navigate = (path) => {
    startTransition(() => router.push(path));
  };

  // ---------------- Render ----------------
  return (
    <DashboardLayout role="user">
      {contextHolder}
      <div className="p-6">
        <Space className="mb-6">
          <Button type="primary" onClick={() => navigate("/user/slots")}>
            Available Slots
          </Button>
          <Button onClick={() => navigate("/user/bookings")}>My Bookings</Button>
        </Space>

        <h2 className="text-2xl font-semibold mb-4">Available Slots</h2>

        {/* Filters */}
        <Space className="mb-4">
          <DatePicker value={filterDate} onChange={setFilterDate} placeholder="Filter by date" />
          <Input
            placeholder="Search time"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Dropdown menu={statusMenu}>
            <Button>
              {getDropdownLabel()} <DownOutlined />
            </Button>
          </Dropdown>
          <Button
            onClick={() => {
              setFilterDate(null);
              setSearchText("");
              setFilterStatus(null);
              fetchSlots(1);
            }}
          >
            Reset
          </Button>
        </Space>

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={slots}
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            onChange: (p) => fetchSlots(p, filterStatus),
            showTotal: (t) => `Total ${t} slots`,
          }}
          bordered
          size="middle"
        />

        {/* Booking Modal */}
        <Modal
          title={
            <Space>
              <BookOutlined style={{ color: "#1890ff" }} />
              <Typography.Title level={5} style={{ margin: 0 }}>
                Book Slot {selectedSlot?.date} {selectedSlot?.time}
              </Typography.Title>
            </Space>
          }
          open={bookingModalVisible}
          onCancel={() => setBookingModalVisible(false)}
          okText="Book"
          onOk={() => form.submit()}
          destroyOnClose
          centered
          bodyStyle={{ padding: "24px 32px" }}
        >
          <Form form={form} layout="vertical" onFinish={handleBooking}>
            <Form.Item label="Notes" name="notes">
              <Input.TextArea
                placeholder="Write your notes (optional)"
                autoSize={{ minRows: 3, maxRows: 6 }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}