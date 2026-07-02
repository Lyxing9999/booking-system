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
  Avatar,
} from "antd";
import { DownOutlined } from "@ant-design/icons";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import { getGameImageUrl, formatPrice } from "../../utils/image";

export default function UserBookingsPage() {
  const router = useRouter();

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

  function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debounced;
  }
  const debouncedSearch = useDebounce(searchText);

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

  const fetchAvailableSlots = async () => {
    try {
      const res = await api.get("/slots/user/available");
      setAvailableSlots(res.data.slots || []);
    } catch {
      notify.error("Failed to fetch available slots");
    }
  };

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

  const handleReset = () => {
    setFilterDate(null);
    setSearchText("");
    setFilterStatus(null);
    fetchBookings(1);
  };

  const handleCancel = (booking) => {
    if (booking.status !== "pending") {
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
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancelLoading(false);
      setShowCancelModal(false);
    }
  };

  const handleEdit = (booking) => {
    if (booking.status !== "pending") {
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
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to update booking");
    } finally {
      setEditLoading(false);
      setShowEditModal(false);
    }
  };

  const statusLabel = (status) => {
    if (status === "pending") return "Waiting for Confirmation";
    if (status === "confirmed") return "Confirmed";
    if (status === "cancelled") return "Cancelled";
    return status;
  };

  const columns = [
    {
      title: "Game",
      key: "game",
      render: (_, record) => (
        <Space>
          <Avatar
            shape="square"
            size={48}
            src={getGameImageUrl(record.gameImage)}
          />
          <span>{record.gameTitle || "PS5 Game"}</span>
        </Space>
      ),
    },
    { title: "Play Date", dataIndex: "date", key: "date" },
    { title: "Play Time", dataIndex: "time", key: "time" },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
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
      render: (_, record) => {
        const colors = {
          pending: "gold",
          confirmed: "green",
          cancelled: "red",
        };
        return (
          <Tag color={colors[record.status] || "default"}>
            {statusLabel(record.status)}
          </Tag>
        );
      },
    },
    {
      title: "Action",
      render: (_, record) => (
        <Space>
          {record.status === "pending" && (
            <>
              <Button danger onClick={() => handleCancel(record)}>
                Cancel
              </Button>
              <Button onClick={() => handleEdit(record)}>Edit</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const statusMenu = (
    <Menu
      onClick={(e) => setFilterStatus(e.key === "all" ? null : e.key)}
      items={[
        { key: "all", label: "All" },
        { key: "confirmed", label: "Confirmed" },
        { key: "pending", label: "Waiting for Confirmation" },
        { key: "cancelled", label: "Cancelled" },
      ]}
    />
  );

  const getDropdownLabel = () => {
    switch (filterStatus) {
      case "confirmed":
        return "Confirmed";
      case "pending":
        return "Waiting for Confirmation";
      case "cancelled":
        return "Cancelled";
      default:
        return "All";
    }
  };

  const navigate = (path) => startTransition(() => router.push(path));

  return (
    <DashboardLayout>
      {contextHolder}
      <div className="p-6 themed-page">
        <Space className="mb-6" wrap size={[8, 8]}>
          <Button onClick={() => navigate("/user/slots")}>
            Available PS5 Slots
          </Button>
          <Button type="primary" onClick={() => navigate("/user/bookings")}>
            My Bookings
          </Button>
        </Space>

        <h2 className="text-2xl font-semibold mb-4">My Bookings</h2>

        <Space className="mb-4" wrap size={[8, 8]}>
          <DatePicker
            value={filterDate}
            onChange={setFilterDate}
            placeholder="Filter by play date"
          />
          <Input
            placeholder="Search game or time"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Dropdown overlay={statusMenu}>
            <Button>
              {getDropdownLabel()} <DownOutlined />
            </Button>
          </Dropdown>
          <Button onClick={handleReset}>Reset</Button>
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
            onChange: (p) => fetchBookings(p),
            showTotal: (t) => `Total ${t} bookings`,
          }}
          bordered
          size="middle"
          scroll={{ x: "max-content" }}
        />
      </div>

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
            <strong>
              {selectedBooking.gameTitle} — {selectedBooking.date}{" "}
              {selectedBooking.time}
            </strong>
            <br />
            Status:{" "}
            <Tag color="gold">{statusLabel(selectedBooking.status)}</Tag>
          </p>
        )}
      </Modal>

      <Modal
        open={showEditModal}
        title="Edit Booking"
        onCancel={() => setShowEditModal(false)}
        onOk={confirmEdit}
        confirmLoading={editLoading}
      >
        {selectedBooking && (
          <>
            <p>
              Current: {selectedBooking.gameTitle} — {selectedBooking.date}{" "}
              {selectedBooking.time}
            </p>
            <Select
              style={{ width: "100%", marginBottom: 12 }}
              value={editSlotId || selectedBooking.slotId?._id}
              onChange={setEditSlotId}
              placeholder="Select available slot"
            >
              {selectedBooking.slotId && (
                <Select.Option
                  key={selectedBooking.slotId._id}
                  value={selectedBooking.slotId._id}
                >
                  {selectedBooking.gameTitle} — {selectedBooking.date}{" "}
                  {selectedBooking.time} (Current)
                </Select.Option>
              )}
              {availableSlots
                .filter((slot) => slot._id !== selectedBooking.slotId?._id)
                .map((slot) => (
                  <Select.Option key={slot._id} value={slot._id}>
                    {slot.gameTitle} — {slot.date} — {slot.time}
                  </Select.Option>
                ))}
            </Select>
            <Input.TextArea
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Update notes"
            />
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}
