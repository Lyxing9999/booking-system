"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, message } from "antd";
import api from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // ---------------- Handle Registration ----------------
  const handleFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/register", values);
      messageApi.success(
        res.data.message || "Registration successful! Please login."
      );
      setTimeout(() => router.push("/auth/login"), 600);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Something went wrong";
      messageApi.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Render ----------------
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      {contextHolder}
      <div className="w-full max-w-md bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">Register</h1>

        <Form
          layout="vertical"
          onFinish={handleFinish}
          autoComplete="off"
          requiredMark={false}
          className="space-y-2"
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
            <div className="flex flex-col gap-3">
              <Button type="primary" htmlType="submit" block loading={loading}>
                {loading ? "Registering..." : "Register"}
              </Button>

              <Button
                block
                type="default"
                onClick={() => router.push("/auth/login")}
                disabled={loading}
              >
                Login
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
