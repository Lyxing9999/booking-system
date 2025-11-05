"use client";

import { useState, useEffect, useTransition } from "react";
import { Table, message, Button, DatePicker, Input, Space } from "antd";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import { getTodayCambodia } from "../../utils/time";

export default function AdminConfirmedBookingsPage() {
  const router = useRouter();

  // ---------------- State ----------------
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(dayjs(getTodayCambodia()));
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [isPending, startTransition] = useTransition();

  const [messageApi, contextHolder] = message.useMessage();
  const notify = { error: (text) => messageApi.error(text, 3) };

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

  // ---------------- Fetch Confirmed Bookings ----------------
  const fetchConfirmedBookings = async (pageNum = 1, dateParam = debouncedDate, searchParam = debouncedSearch) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: pageNum, limit });

      if (dateParam?.format) params.append("date", dateParam.format("YYYY-MM-DD"));
      if (searchParam) params.append("search", searchParam);

      const res = await api.get(`/bookings/admin/confirmed?${params.toString()}`);
      setBookings(res.data.bookings || []);
      setTotal(res.data.total || 0);
      setPage(pageNum);
    } catch (err) {
      notify.error(err.message || "Failed to fetch confirmed bookings");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Effects ----------------
  useEffect(() => {
    fetchConfirmedBookings();
  }, []);

  useEffect(() => {
    fetchConfirmedBookings(1);
  }, [debouncedSearch, debouncedDate]);

  // ---------------- Actions ----------------
  const handleReset = () => {
    const today = dayjs(getTodayCambodia());
    setFilterDate(today);
    setSearchText("");
    setPage(1);
    fetchConfirmedBookings(1, today, "");
  };

  // ---------------- Table Columns ----------------
  const columns = [
    { title: "Order ID", dataIndex: "orderId" },
    { title: "User", dataIndex: ["user", "name"] },
    { title: "Email", dataIndex: ["user", "email"] },
    { title: "Date", dataIndex: ["slot", "date"] },
    { title: "Time", dataIndex: ["slot", "time"] },
    {
      title: "Notes",
      dataIndex: "notes",
      render: (text) =>
        text ? (
          <span style={{ color: "#333", fontStyle: "normal" }}>{text}</span>
        ) : (
          <span style={{ color: "#999", fontStyle: "italic" }}>No notes</span>
        ),
    },
  ];

  // ---------------- Navigation ----------------
  const navigate = (path) => startTransition(() => router.push(path));

  // ---------------- Render ----------------
  return (
    <DashboardLayout role="admin">
      {contextHolder}
      <div className="p-6">
        {/* Navigation */}
        <Space className="mb-6" wrap size={[8, 8]}>
          <Button onClick={() => navigate("/admin/users")}>Users</Button>
          <Button onClick={() => navigate("/admin/slots")}>Slots</Button>
          <Button onClick={() => navigate("/admin/bookings")}>All Bookings</Button>
          <Button type="primary" onClick={() => navigate("/admin/confirmed-bookings")}>
            Confirmed Bookings
          </Button>
        </Space>

        <h2 className="text-2xl font-semibold mb-4">Confirmed Bookings</h2>

        {/* Filters */}
        <Space wrap className="mb-4" size={[8, 8]}>
          <DatePicker
            value={filterDate ? dayjs(filterDate) : null}
            onChange={setFilterDate}
            placeholder="Filter by date"
          />
          <Input
            placeholder="Search by name or email"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
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
            onChange: (p) => fetchConfirmedBookings(p),
            showTotal: (total) => `Total ${total} bookings`,
          }}
          bordered
          size="middle"
          scroll={{ x: 'max-content' }}
        />
      </div>
    </DashboardLayout>
  );
}