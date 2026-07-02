"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Card,
  Tag,
  DatePicker,
  Input,
  Button,
  Space,
  message,
  Modal,
  Form,
  Typography,
  Row,
  Col,
  Empty,
  Spin,
} from "antd";
import { BookOutlined } from "@ant-design/icons";
import api from "../../lib/api";
import { useRouter } from "next/navigation";
import { getGameImageUrl, formatPrice } from "../../utils/image";

export default function UserSlotsPageClient() {
  const router = useRouter();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
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

  function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const timer = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
  }
  const debouncedSearch = useDebounce(searchText);

  const fetchSlots = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit });
      if (filterDate) params.append("date", filterDate.format("YYYY-MM-DD"));
      if (debouncedSearch) params.append("search", debouncedSearch);

      const res = await api.get(`/slots/user/available?${params.toString()}`);
      setSlots(res.data.slots || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to fetch slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots(1);
  }, [filterDate, debouncedSearch]);

  const openBookingModal = (slot) => {
    setSelectedSlot(slot);
    setBookingModalVisible(true);
    form.resetFields();
  };

  const handleBooking = async (values) => {
    try {
      await api.post("/bookings/user", {
        slotId: selectedSlot._id,
        notes: values.notes,
      });
      notify.success("Booking created — waiting for confirmation");
      setBookingModalVisible(false);
      fetchSlots(page);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Booking failed");
    }
  };

  const navigate = (path) => startTransition(() => router.push(path));

  return (
    <div className="p-6 themed-page">
      {contextHolder}

      <Space className="mb-6" wrap size={[8, 8]}>
        <Button type="primary">Available PS5 Slots</Button>
        <Button onClick={() => navigate("/user/bookings")}>My Bookings</Button>
      </Space>

      <h2 className="text-2xl font-semibold mb-4">Available PS5 Slots</h2>

      <Space className="mb-6" wrap size={[8, 8]}>
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
        <Button
          onClick={() => {
            setFilterDate(null);
            setSearchText("");
          }}
        >
          Reset
        </Button>
      </Space>

      <Spin spinning={loading || isPending}>
        {slots.length === 0 && !loading ? (
          <Empty description="No available PS5 slots right now" />
        ) : (
          <Row gutter={[16, 16]}>
            {slots.map((slot) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={slot._id}>
                <Card
                  hoverable
                  cover={
                    <img
                      alt={slot.gameTitle}
                      src={getGameImageUrl(slot.gameImage)}
                      style={{ height: 180, objectFit: "cover" }}
                    />
                  }
                  actions={[
                    <Button
                      key="book"
                      type="primary"
                      icon={<BookOutlined />}
                      onClick={() => openBookingModal(slot)}
                    >
                      Book Now
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={
                      <Space>
                        {slot.gameTitle}
                        <Tag color="green">Available</Tag>
                      </Space>
                    }
                    description={
                      <div className="space-y-1 mt-2">
                        {slot.description && (
                          <Typography.Paragraph
                            type="secondary"
                            ellipsis={{ rows: 2 }}
                            style={{ marginBottom: 8 }}
                          >
                            {slot.description}
                          </Typography.Paragraph>
                        )}
                        <div>
                          <strong>Play Date:</strong> {slot.date}
                        </div>
                        <div>
                          <strong>Play Time:</strong> {slot.time}
                        </div>
                        <div>
                          <strong>Price:</strong> {formatPrice(slot.price)}/hr
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {total > limit && (
        <div className="mt-6 flex justify-center gap-2">
          <Button disabled={page <= 1} onClick={() => fetchSlots(page - 1)}>
            Previous
          </Button>
          <span className="self-center">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <Button
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => fetchSlots(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Modal
        title={
          <Space>
            <BookOutlined style={{ color: "var(--theme-accent)" }} />
            <Typography.Title level={5} style={{ margin: 0 }}>
              Book {selectedSlot?.gameTitle}
            </Typography.Title>
          </Space>
        }
        open={bookingModalVisible}
        onCancel={() => setBookingModalVisible(false)}
        okText="Confirm Booking"
        onOk={() => form.submit()}
        destroyOnClose
        centered
      >
        {selectedSlot && (
          <div className="mb-4">
            <img
              src={getGameImageUrl(selectedSlot.gameImage)}
              alt={selectedSlot.gameTitle}
              style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }}
            />
            <p className="mt-2 mb-0">
              {selectedSlot.date} · {selectedSlot.time} ·{" "}
              {formatPrice(selectedSlot.price)}/hr
            </p>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleBooking}>
          <Form.Item label="Notes (optional)" name="notes">
            <Input.TextArea
              placeholder="e.g. I want to play with my friend"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
