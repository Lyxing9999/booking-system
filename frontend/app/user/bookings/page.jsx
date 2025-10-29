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
  Modal,
  Select,
  Dropdown,
  Menu,
} from "antd";
import { DownOutlined } from "@ant-design/icons";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";

export default function UserBookingsPage() {
  const router = useRouter();

  // ---------------- State ----------------
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [cancelLoading, setCancelLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editSlotId, setEditSlotId] = useState("");

  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const notify = {
    success: (text) => messageApi.success(text, 3),
    error: (text) => messageApi.error(text, 3),
  };

  // ---------------- Debounce Hook ----------------
  function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      setLoading(true);
      const handler = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debounced;
  }
  const debouncedSearch = useDebounce(searchText);

  // ---------------- Fetch Bookings ----------------
  const fetchBookings = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageNum, limit });
      if (filterDate) params.append("date", filterDate.format("YYYY-MM-DD"));
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filterStatus) params.append("status", filterStatus);

      const res = await api.get(`/bookings/user?${params.toString()}`);
      setBookings(res.data.bookings || []);
      setTotal(res.data.total || 0);
      setPage(pageNum);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Fetch Available Slots ----------------
  const fetchAvailableSlots = async () => {
    try {
      const res = await api.get("/slots/user/available");
      setAvailableSlots(res.data.slots || []);
    } catch {
      notify.error("Failed to fetch available slots");
    }
  };

  // ---------------- Effects ----------------
  useEffect(() => {
    fetchBookings();
    fetchAvailableSlots();
  }, []);

  useEffect(() => {
    if (showEditModal) fetchAvailableSlots();
  }, [showEditModal]);

  useEffect(() => {
    fetchBookings(1);
  }, [filterDate, debouncedSearch, filterStatus]);

  // ---------------- Actions ----------------
  const handleReset = () => {
    setFilterDate(null);
    setSearchText("");
    setFilterStatus(null);
    fetchBookings(1);
  };

  const handleCancel = (booking) => {
    if (booking.status === "confirmed" || booking.status === "cancelled") {
      notify.error("Cannot cancel after admin confirmed/cancelled");
      return;
    }
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!selectedBooking) return;
    setCancelLoading(true);
    try {
      await api.delete(`/bookings/user/${selectedBooking._id}`);
      notify.success("Booking cancelled successfully!");
      fetchBookings(page);
    } catch {
      notify.error("Failed to cancel booking");
    } finally {
      setCancelLoading(false);
      setShowCancelModal(false);
    }
  };

  const handleEdit = (booking) => {
    if (booking.status === "confirmed" || booking.status === "cancelled") {
      notify.error("Cannot edit after admin confirmed/cancelled");
      return;
    }
    setSelectedBooking(booking);
    setEditNotes(booking.notes || "");
    setEditSlotId(booking.slotId?._id || booking.slotId || "");
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!selectedBooking) return;
    setEditLoading(true);
    try {
      await api.patch(`/bookings/user/${selectedBooking._id}`, {
        notes: editNotes,
        slotId: editSlotId,
      });
      notify.success("Booking updated successfully!");
      fetchBookings(page);
    } catch {
      notify.error("Failed to update booking");
    } finally {
      setEditLoading(false);
      setShowEditModal(false);
    }
  };

  // ---------------- Table Columns ----------------
  const columns = [
    { title: "Date", dataIndex: "date", key: "date" },
    { title: "Time", dataIndex: "time", key: "time" },
    {
      title: "Notes",
      dataIndex: "notes",
      render: (text) =>
        text ? <span>{text}</span> : <span style={{ color: "#999", fontStyle: "italic" }}>No notes</span>,
    },
    {
      title: "Status",
      render: (_, record) => {
        let color = "gold";
        let text = "PENDING";
        if (record.status === "cancelled") {
          color = "red";
          text = "CANCELLED";
        } else if (record.status === "confirmed") {
          color = "green";
          text = "CONFIRMED";
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Action",
      render: (_, record) => (
        <Space>
          {record.status === "pending" && (
            <>
              <Button danger onClick={() => handleCancel(record)}>Cancel</Button>
              <Button onClick={() => handleEdit(record)}>Edit</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  // ---------------- Status Dropdown ----------------
  const statusMenu = (
    <Menu
      onClick={(e) => setFilterStatus(e.key === "all" ? null : e.key)}
      items={[
        { key: "all", label: "All" },
        { key: "confirmed", label: "Confirmed" },
        { key: "pending", label: "Pending" },
        { key: "cancelled", label: "Cancelled" },
      ]}
    />
  );

  const getDropdownLabel = () => {
    switch (filterStatus) {
      case "confirmed": return "Confirmed";
      case "pending": return "Pending";
      case "cancelled": return "Cancelled";
      default: return "All";
    }
  };

  // ---------------- Navigation ----------------
  const navigate = (path) => startTransition(() => router.push(path));

  // ---------------- Render ----------------
  return (
    <DashboardLayout>
      {contextHolder}
      <div className="p-6">
        <Space className="mb-6">
          <Button onClick={() => navigate("/user/slots")}>Available Slots</Button>
          <Button type="primary" onClick={() => navigate("/user/bookings")}>My Bookings</Button>
        </Space>

        <h2 className="text-2xl font-semibold mb-4">My Bookings</h2>

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
          <Dropdown overlay={statusMenu}>
            <Button>{getDropdownLabel()} <DownOutlined /></Button>
          </Dropdown>
          <Button onClick={handleReset}>Reset</Button>
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
            onChange: (p) => fetchBookings(p),
            showTotal: (t) => `Total ${t} bookings`,
          }}
          bordered
          size="middle"
        />
      </div>

      {/* Cancel Modal */}
      <Modal
        open={showCancelModal}
        title="Cancel Booking"
        onCancel={() => setShowCancelModal(false)}
        onOk={confirmCancel}
        confirmLoading={cancelLoading}
      >
        {selectedBooking && (
          <p>
            Are you sure you want to cancel this booking?
            <br />
            <strong>{selectedBooking.date} — {selectedBooking.time}</strong>
            <br />
            Status:{" "}
            <Tag color={selectedBooking.status === "cancelled" ? "red" : selectedBooking.status === "confirmed" ? "green" : "gold"}>
              {selectedBooking.status.toUpperCase()}
            </Tag>
          </p>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        title="Edit Booking"
        onCancel={() => setShowEditModal(false)}
        onOk={confirmEdit}
        confirmLoading={editLoading}
      >
        {selectedBooking && (
          <>
            <p>Current: {selectedBooking.date} — {selectedBooking.time}</p>
            <Select
              style={{ width: "100%", marginBottom: 12 }}
              value={editSlotId || selectedBooking.slotId?._id}
              onChange={setEditSlotId}
              loading={loading}
              placeholder="Select available slot"
              disabled={selectedBooking.status !== "pending"}
            >
              {selectedBooking.slotId && selectedBooking.status === "pending" && (
                <Select.Option key={selectedBooking.slotId._id} value={selectedBooking.slotId._id}>
                  {selectedBooking.date} — {selectedBooking.time} (Current)
                </Select.Option>
              )}
              {availableSlots
                .filter(slot => slot._id !== selectedBooking.slotId?._id)
                .map(slot => (
                  <Select.Option key={slot._id} value={slot._id}>
                    {slot.date} — {slot.time}
                  </Select.Option>
                ))}
            </Select>
            <Input.TextArea
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Update notes"
              disabled={selectedBooking.status !== "pending"}
            />
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}