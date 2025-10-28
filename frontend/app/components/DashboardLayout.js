"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Dropdown,
  message,
  Modal,
  Form,
  Button,
  Space,
  Input,
} from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import api from "../lib/api";

export default function DashboardLayout({ children, role = "user" }) {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // "profile" or "password"

  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const notify = {
    success: (text) => messageApi.success(text, 3),
    error: (text) => messageApi.error(text, 3),
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout"); // backend clears cookies
      localStorage.removeItem("token");
      localStorage.removeItem("userId");

      message.success("Logged out successfully");
      router.push("/auth/login");
    } catch (err) {
      console.error("Logout failed:", err);
      message.error(err?.response?.data?.message || "Logout failed");
    }
  };

  useEffect(() => {
    if (isProfileModalOpen) {
      (async () => {
        try {
          const res = await api.get("/user/profile");
          profileForm.setFieldsValue({
            name: res.data.name,
            email: res.data.email,
          });
        } catch (err) {
          notify.error("Failed to load profile");
        }
      })();
    }
  }, [isProfileModalOpen]);

  const handleProfileUpdate = async (values) => {
    try {
      const payload = { name: values.name };
      if (values.email) payload.email = values.email;
      if (values.currentPassword)
        payload.currentPassword = values.currentPassword;

      await api.patch("/user/profile", payload);
      notify.success("Profile updated successfully");
      profileForm.resetFields();
      setIsProfileModalOpen(false);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Update failed");
    }
  };

  const handlePasswordUpdate = async (values) => {
    try {
      await api.patch("/user/profile", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      notify.success("Password updated successfully");
      passwordForm.resetFields();
      setIsProfileModalOpen(false);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Update failed");
    }
  };

  const menuItems = [
    {
      key: "profile",
      label: "Profile",
      icon: <UserOutlined />,
      onClick: () => setIsProfileModalOpen(true),
    },
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  // Dynamically set dashboard title
  const dashboardTitle =
    role.toLowerCase() === "admin" ? "Admin Dashboard" : "User Dashboard";

  return (
    <>
      {contextHolder}
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-gray-100 border-b shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">{dashboardTitle}</h1>
          <Dropdown menu={{ items: menuItems }} placement="bottomRight">
            <Avatar
              style={{ cursor: "pointer", backgroundColor: "#1890ff" }}
              icon={<UserOutlined />}
            />
          </Dropdown>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-white">{children}</main>
      </div>

      {/* Profile / Password Modal */}
      <Modal
        title="Edit Profile"
        open={isProfileModalOpen}
        onCancel={() => setIsProfileModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        {/* Tabs */}
        <Space style={{ marginBottom: 16 }}>
          <Button
            type={activeTab === "profile" ? "primary" : "default"}
            onClick={() => setActiveTab("profile")}
          >
            Edit Profile
          </Button>
          <Button
            type={activeTab === "password" ? "primary" : "default"}
            onClick={() => setActiveTab("password")}
          >
            Change Password
          </Button>
        </Space>

        {/* Edit Profile */}
        {activeTab === "profile" && (
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleProfileUpdate}
            preserve={true}
          >
            <Form.Item label="Name" name="name">
              <Input placeholder="Your name" />
            </Form.Item>
            <Form.Item label="Email" name="email">
              <Input placeholder="Your email" />
            </Form.Item>
            <Form.Item label="Current Password" name="currentPassword">
              <Input.Password placeholder="Required to change email" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Save Profile
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* Change Password */}
        {activeTab === "password" && (
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordUpdate}
            preserve={true}
          >
            <Form.Item label="Current Password" name="currentPassword">
              <Input.Password placeholder="Current password" />
            </Form.Item>
            <Form.Item label="New Password" name="newPassword">
              <Input.Password placeholder="New password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Change Password
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}
