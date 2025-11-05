"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, Button, DatePicker, Input, Space, message, Tag, Select } from "antd";

import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import AntdWarningSuppressor from "../../ClientWrapper";

export default function AdminBookingsPage() {
  const router = useRouter();

  // ---------------- State ----------------
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterDate, setFilterDate] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [isPending, startTransition] = useTransition();
  const [loadingRows, setLoadingRows] = useState({});

  const [messageApi, contextHolder] = message.useMessage();
  const notify = {
    success: (text) => messageApi.success(text, 3),
    error: (text) => messageApi.error(text, 3),
  };

  // ---------------- Fetch Bookings ----------------
  const fetchBookings = async ({ pageNum = 1, date = filterDate, search = searchText, status = statusFilter } = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: pageNum, limit });
      if (date) params.append("date", date.format("YYYY-MM-DD"));
      if (search) params.append("search", search);
      if (status) params.append("status", status);

      const { data } = await api.get(`/bookings/admin?${params.toString()}`);
      setBookings(data.bookings || []);
      setTotal(data.total || data.count || (data.bookings ? data.bookings.length : 0));
      setPage(pageNum);
    } catch (err) {
      notify.error(err?.message || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Debounce Hook ----------------
  const useDebounce = (value, delay = 300) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      setLoading(true);
      const handler = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debounced;
  };

  const debouncedSearch = useDebounce(searchText);
  const debouncedDate = useDebounce(filterDate);
  const debouncedStatus = useDebounce(statusFilter);

  // ---------------- Effects ----------------
  useEffect(() => {
    fetchBookings({ pageNum: 1, date: debouncedDate, search: debouncedSearch, status: debouncedStatus });
  }, [debouncedSearch, debouncedDate, debouncedStatus]);

  // ---------------- Actions ----------------
  const handleReset = () => {
    setFilterDate(null);
    setSearchText("");
    setStatusFilter(null);
    setPage(1);
    fetchBookings({ pageNum: 1, date: null, search: "", status: null });
  };

  const updateBookingStatus = async (id, status) => {
    try {
      setLoadingRows(prev => ({ ...prev, [id]: true }));
  
      const { data } = await api.patch(`/bookings/admin/${id}/status`, { status });

      setBookings(prev => prev.map(b => (b._id === id ? { ...b, status: data.status } : b)));
      notify.success(`Booking ${status}`);
  
      fetchBookings({ pageNum: page });
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to update booking");
    } finally {
      setLoadingRows(prev => ({ ...prev, [id]: false }));
    }
  };

  // ---------------- Constants ----------------
  const statusColors = { pending: "orange", confirmed: "green", cancelled: "red" };

  const columns = [
    { title: "Order ID", dataIndex: "orderId"  },
    { title: "User", dataIndex: ["user", "name"] },
    { title: "Email", dataIndex: ["user", "email"] },
    { title: "Date", dataIndex: ["slot", "date"] },
    { title: "Time", dataIndex: ["slot", "time"] },
    {
      title: "Notes",
      dataIndex: "notes",
      render: (text) => (text ? <span>{text}</span> : <span style={{ color: "#999", fontStyle: "italic" }}>No notes</span>),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => (
        <Tag color={statusColors[status] || "gray"} style={{ fontWeight: 500 }}>
          {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      render: (_, record) => {
        const disabled = record.status === "confirmed" || record.status === "cancelled";
        return (
          <Space>
            <Button type="primary" loading={loadingRows[record._id]} onClick={() => updateBookingStatus(record._id, "confirmed")} disabled={disabled}>
              Confirm
            </Button>
            <Button danger loading={loadingRows[record._id]} onClick={() => updateBookingStatus(record._id, "cancelled")} disabled={disabled}>
              Cancel
            </Button>
          </Space>
        );
      },
    },
  ];

  const statusOptions = ["all", "pending", "confirmed", "cancelled"];

  // ---------------- Navigation ----------------
  const navigate = (path) => startTransition(() => router.push(path));

  // ---------------- Render ----------------
  return (
    <AntdWarningSuppressor>
      <DashboardLayout role="admin">
        {contextHolder}
        <div className="p-6">
          {/* Navigation */}
          <Space className="mb-6" wrap size={[8, 8]}>
            <Button onClick={() => navigate("/admin/users")}>Users</Button>
            <Button onClick={() => navigate("/admin/slots")}>Slots</Button>
            <Button type="primary" onClick={() => navigate("/admin/bookings")}>All Bookings</Button>
            <Button onClick={() => navigate("/admin/confirmed-bookings")}>Confirmed Bookings</Button>
          </Space>

          <h2 className="text-2xl font-semibold mb-4">Bookings</h2>

          {/* Filters */}
          <Space className="mb-4" wrap size={[8, 8]}>
            <DatePicker value={filterDate} onChange={setFilterDate} placeholder="Filter by date" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name or email"
              style={{ width: 200 }}
            />
            <Select
              value={statusFilter || "all"}
              onChange={(value) => setStatusFilter(value === "all" ? null : value)}
              style={{ width: 150 }}
            >
              {statusOptions.map((s) => (
                <Select.Option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Select.Option>
              ))}
            </Select>
            <Button onClick={handleReset} disabled={loading}>
              Reset
            </Button>
          </Space>

          {/* Table */}
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={bookings}
            loading={loading || isPending}
            pagination={{
              current: page,
              pageSize: limit,
              total,
              onChange: (p) => fetchBookings({ pageNum: p }),
              showTotal: (total) => `Total ${total} bookings`,
            }}
            bordered
            size="middle"
            scroll={{ x: 'max-content' }}
          />
        </div>
      </DashboardLayout>
    </AntdWarningSuppressor>
  );
}