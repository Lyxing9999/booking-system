"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  DatePicker,
  Input,
  Space,
  message,
  Tag,
  Select,
  Avatar,
  Modal,
} from "antd";

import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import AntdWarningSuppressor from "../../ClientWrapper";
import { getGameImageUrl, formatPrice } from "../../utils/image";

export default function AdminBookingsPage() {
  const router = useRouter();

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
  const [cancelModal, setCancelModal] = useState({ open: false, booking: null });
  const [cancelReason, setCancelReason] = useState("");

  const [messageApi, contextHolder] = message.useMessage();
  const notify = {
    success: (text) => messageApi.success(text, 3),
    error: (text) => messageApi.error(text, 3),
  };

  const fetchBookings = async ({
    pageNum = 1,
    date = filterDate,
    search = searchText,
    status = statusFilter,
  } = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: pageNum, limit });
      if (date) params.append("date", date.format("YYYY-MM-DD"));
      if (search) params.append("search", search);
      if (status) params.append("status", status);

      const { data } = await api.get(`/bookings/admin?${params.toString()}`);
      setBookings(data.bookings || []);
      setTotal(data.total || 0);
      setPage(pageNum);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const useDebounce = (value, delay = 300) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debounced;
  };

  const debouncedSearch = useDebounce(searchText);
  const debouncedDate = useDebounce(filterDate);
  const debouncedStatus = useDebounce(statusFilter);

  useEffect(() => {
    fetchBookings({
      pageNum: 1,
      date: debouncedDate,
      search: debouncedSearch,
      status: debouncedStatus,
    });
  }, [debouncedSearch, debouncedDate, debouncedStatus]);

  const handleReset = () => {
    setFilterDate(null);
    setSearchText("");
    setStatusFilter(null);
    setPage(1);
    fetchBookings({ pageNum: 1, date: null, search: "", status: null });
  };

  const updateBookingStatus = async (id, status, cancelledReason = "") => {
    try {
      setLoadingRows((prev) => ({ ...prev, [id]: true }));

      const body = { status };
      if (status === "cancelled" && cancelledReason) {
        body.cancelledReason = cancelledReason;
      }

      await api.patch(`/bookings/admin/${id}/status`, body);
      notify.success(`Booking ${status}`);
      fetchBookings({ pageNum: page });
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to update booking");
    } finally {
      setLoadingRows((prev) => ({ ...prev, [id]: false }));
    }
  };

  const openCancelModal = (booking) => {
    setCancelModal({ open: true, booking });
    setCancelReason("");
  };

  const confirmAdminCancel = async () => {
    const { booking } = cancelModal;
    if (!booking) return;
    await updateBookingStatus(booking._id, "cancelled", cancelReason);
    setCancelModal({ open: false, booking: null });
  };

  const statusColors = { pending: "orange", confirmed: "green", cancelled: "red" };

  const columns = [
    {
      title: "Order ID",
      dataIndex: "orderId",
      render: (id) => <span className="text-muted" style={{ fontSize: 12 }}>{id}</span>,
    },
    { title: "User", dataIndex: ["user", "name"] },
    { title: "Email", dataIndex: ["user", "email"] },
    {
      title: "Game",
      key: "game",
      render: (_, record) => (
        <Space>
          <Avatar
            shape="square"
            size={40}
            src={getGameImageUrl(record.slot?.gameImage)}
          />
          {record.slot?.gameTitle || "-"}
        </Space>
      ),
    },
    { title: "Play Date", dataIndex: ["slot", "date"] },
    { title: "Play Time", dataIndex: ["slot", "time"] },
    {
      title: "Price",
      dataIndex: ["slot", "price"],
      render: (price) => formatPrice(price),
    },
    {
      title: "Notes",
      dataIndex: "notes",
      render: (text) =>
        text ? (
          <span>{text}</span>
        ) : (
          <span className="text-muted" style={{ fontStyle: "italic" }}>No notes</span>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => (
        <Tag color={statusColors[status] || "gray"}>
          {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
        </Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: (d) => (d ? new Date(d).toLocaleString() : "-"),
    },
    {
      title: "Actions",
      render: (_, record) => {
        const isCancelled = record.status === "cancelled";
        const isConfirmed = record.status === "confirmed";
        return (
          <Space>
            <Button
              type="primary"
              loading={loadingRows[record._id]}
              onClick={() => updateBookingStatus(record._id, "confirmed")}
              disabled={isCancelled || isConfirmed}
            >
              Confirm
            </Button>
            <Button
              danger
              loading={loadingRows[record._id]}
              onClick={() => openCancelModal(record)}
              disabled={isCancelled}
            >
              Cancel
            </Button>
          </Space>
        );
      },
    },
  ];

  const statusOptions = ["all", "pending", "confirmed", "cancelled"];
  const navigate = (path) => startTransition(() => router.push(path));

  return (
    <AntdWarningSuppressor>
      <DashboardLayout role="admin">
        {contextHolder}
        <div className="p-6 themed-page">
          <Space className="mb-6" wrap size={[8, 8]}>
            <Button onClick={() => navigate("/admin/users")}>Users</Button>
            <Button onClick={() => navigate("/admin/slots")}>PS5 Slots</Button>
            <Button type="primary" onClick={() => navigate("/admin/bookings")}>
              All Bookings
            </Button>
            <Button onClick={() => navigate("/admin/confirmed-bookings")}>
              Confirmed Bookings
            </Button>
          </Space>

          <h2 className="text-2xl font-semibold mb-4">Booking Management</h2>

          <Space className="mb-4" wrap size={[8, 8]}>
            <DatePicker
              value={filterDate}
              onChange={setFilterDate}
              placeholder="Filter by play date"
            />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search user, game, or order ID"
              style={{ width: 240 }}
            />
            <Select
              value={statusFilter || "all"}
              onChange={(value) =>
                setStatusFilter(value === "all" ? null : value)
              }
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
              showTotal: (t) => `Total ${t} bookings`,
            }}
            bordered
            size="middle"
            scroll={{ x: "max-content" }}
          />
        </div>

        <Modal
          title="Cancel Booking"
          open={cancelModal.open}
          onCancel={() => setCancelModal({ open: false, booking: null })}
          onOk={confirmAdminCancel}
        >
          <p>Cancel this booking and release the slot?</p>
          <Input.TextArea
            rows={2}
            placeholder="Reason for cancellation (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </Modal>
      </DashboardLayout>
    </AntdWarningSuppressor>
  );
}
