"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, message, Card, Typography } from "antd";
import api from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/register", values);
      messageApi.success(
        res.data.message || "Registration successful! Please login."
      );
      setTimeout(() => router.push("/auth/login"), 600);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Something went wrong";
      messageApi.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "var(--theme-bg)" }}
    >
      {contextHolder}
      <Card
        className="w-full max-w-md rounded-xl shadow-lg"
        style={{
          background: "var(--theme-card)",
          borderColor: "var(--theme-border)",
        }}
      >
        <div className="text-center mb-2">
          <Typography.Title
            level={2}
            style={{ margin: 0, color: "var(--theme-text)" }}
          >
            Join PS5 Booking
          </Typography.Title>
          <Typography.Text style={{ color: "var(--theme-text-muted)" }}>
            Create an account to book play sessions
          </Typography.Text>
        </div>

        <Form
          layout="vertical"
          onFinish={handleFinish}
          autoComplete="off"
          requiredMark={false}
          className="mt-6"
        >
          <Form.Item
            label="Full Name"
            name="name"
            rules={[{ required: true, message: "Please enter your full name" }]}
          >
            <Input placeholder="Full Name" disabled={loading} />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input placeholder="Email" disabled={loading} />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password placeholder="Password" disabled={loading} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              block
              type="default"
              onClick={() => router.push("/auth/login")}
              disabled={loading}
            >
              Back to Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
