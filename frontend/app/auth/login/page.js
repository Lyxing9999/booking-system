"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { Form, Input, Button, message, Card, Typography } from "antd";
import Cookies from "js-cookie";
import { useTheme } from "../../components/ThemeProvider";

export default function LoginPage() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [isPending, startTransition] = useTransition();

  const navigate = (path) => {
    startTransition(() => router.push(path));
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", values);
      const { user } = res.data.data;

      document.cookie = `token=${res.data.data.token || "session"}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

      Cookies.set("role", user.role, {
        expires: 1,
        path: "/",
        sameSite: "Lax",
      });

      if (user.theme) {
        setTheme(user.theme, true);
      }

      messageApi.success("Login successful!");
      router.push(user.role === "admin" ? "/admin/slots" : "/user/slots");
    } catch (err) {
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      messageApi.error(
        err.response?.data?.message || "Something went wrong. Try again."
      );
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
          <Typography.Title level={2} style={{ margin: 0, color: "var(--theme-text)" }}>
            PS5 Booking
          </Typography.Title>
          <Typography.Text style={{ color: "var(--theme-text-muted)" }}>
            Sign in to book your play session
          </Typography.Text>
        </div>

        <Form
          name="loginForm"
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          initialValues={{ email: "", password: "" }}
          className="mt-6"
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please input your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input placeholder="Email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading || isPending}
              block
            >
              Login
            </Button>
          </Form.Item>

          <Form.Item>
            <Button type="default" block onClick={() => navigate("/auth/register")}>
              Register
            </Button>
          </Form.Item>
        </Form>

        <div
          className="mt-4 p-3 rounded-lg text-xs"
          style={{
            background: "var(--theme-surface)",
            border: "1px solid var(--theme-border)",
            color: "var(--theme-text-muted)",
          }}
        >
          <strong style={{ color: "var(--theme-text)" }}>Demo accounts</strong>
          <br />
          Admin: admin@ps5booking.com / Admin@123
          <br />
          User: user@ps5booking.com / User@123
        </div>
      </Card>
    </div>
  );
}
