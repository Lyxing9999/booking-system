"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { Form, Input, Button, message, Card } from "antd";
import Cookies from "js-cookie";
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [isPending, startTransition] = useTransition();

  const navigate = (path) => {
    startTransition(() => {
      router.push(path);
    });
  };
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", values);
      const { token, user } = res.data.data;
      localStorage.removeItem("role");
      // localStorage.removeItem("token");
      localStorage.setItem("role", user.role);
      // localStorage.setItem("token", token);
      // document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24}`;
      Cookies.set("role", user.role, {
        expires: 1,
        path: "/",
        secure: true,
        sameSite: "Lax",
      });
      messageApi.success(res.data.message || "Login successful!");
      router.push(user.role === "admin" ? "/admin/slots" : "/user/slots");
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      console.error(err);
      messageApi.error(
        err.response?.data?.message || "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      {contextHolder}
      <Card className="w-full max-w-md p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

        <Form
          name="loginForm"
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          initialValues={{ email: "", password: "" }}
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
            <Button
              type="default"
              block
              onClick={() => navigate("/auth/register")}
            >
              Register
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
