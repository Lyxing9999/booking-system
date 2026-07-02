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
  Typography,
} from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  BgColorsOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import api from "../lib/api";
import { useTheme } from "./ThemeProvider";
import { THEMES } from "../lib/themes";

export default function DashboardLayout({ children, role = "user" }) {
  const router = useRouter();
  const { themeId, saveTheme } = useTheme();
  const [messageApi, contextHolder] = message.useMessage();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [savingTheme, setSavingTheme] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(themeId);

  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const notify = {
    success: (text) => messageApi.success(text, 3),
    error: (text) => messageApi.error(text, 3),
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      message.success("Logged out successfully");
      router.push("/auth/login");
    } catch (err) {
      message.error(err?.response?.data?.message || "Logout failed");
    }
  };

  useEffect(() => {
    setSelectedTheme(themeId);
  }, [themeId]);

  useEffect(() => {
    if (isProfileModalOpen) {
      (async () => {
        try {
          const res = await api.get("/user/profile");
          profileForm.setFieldsValue({
            name: res.data.name,
            email: res.data.email,
          });
          if (res.data.theme) setSelectedTheme(res.data.theme);
        } catch {
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

  const handleThemeSave = async () => {
    setSavingTheme(true);
    try {
      await saveTheme(selectedTheme);
      notify.success("Appearance saved — your PS5 lounge is ready!");
    } catch {
      notify.error("Failed to save theme");
    } finally {
      setSavingTheme(false);
    }
  };

  const menuItems = [
    {
      key: "profile",
      label: "Profile & Appearance",
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

  const dashboardTitle =
    role.toLowerCase() === "admin"
      ? "PS5 Admin Dashboard"
      : "PS5 Booking Dashboard";

  const tabs = [
    { key: "profile", label: "Edit Profile" },
    { key: "password", label: "Change Password" },
    { key: "appearance", label: "Appearance", icon: <BgColorsOutlined /> },
  ];

  return (
    <>
      {contextHolder}
      <div className="themed-layout min-h-screen flex flex-col">
        <header className="themed-header flex items-center justify-between p-4 shadow-sm">
          <div>
            <h1 className="text-xl font-bold">{dashboardTitle}</h1>
            <p className="text-sm m-0" style={{ color: "var(--theme-text-muted)" }}>
              Book your next PS5 play session
            </p>
          </div>
          <Dropdown menu={{ items: menuItems }} placement="bottomRight">
            <Avatar
              style={{
                cursor: "pointer",
                backgroundColor: "var(--theme-accent)",
              }}
              icon={<UserOutlined />}
            />
          </Dropdown>
        </header>

        <main className="themed-main flex-1 p-6">{children}</main>
      </div>

      <Modal
        title="Profile & Settings"
        open={isProfileModalOpen}
        onCancel={() => setIsProfileModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={520}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              type={activeTab === tab.key ? "primary" : "default"}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </Space>

        {activeTab === "profile" && (
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleProfileUpdate}
            preserve
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

        {activeTab === "password" && (
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordUpdate}
            preserve
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

        {activeTab === "appearance" && (
          <div>
            <Typography.Paragraph type="secondary">
              Pick a look for your PS5 booking experience. Your choice is saved
              to your account and applies across all pages.
            </Typography.Paragraph>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {Object.values(THEMES).map((theme) => (
                <div
                  key={theme.id}
                  className={`theme-option ${selectedTheme === theme.id ? "selected" : ""}`}
                  onClick={() => setSelectedTheme(theme.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setSelectedTheme(theme.id)
                  }
                >
                  <div className="theme-preview-strip">
                    {theme.preview.map((color) => (
                      <span key={color} style={{ background: color }} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{theme.name}</div>
                      <div
                        className="text-xs mt-1"
                        style={{ color: "var(--theme-text-muted)" }}
                      >
                        {theme.description}
                      </div>
                    </div>
                    {selectedTheme === theme.id && (
                      <CheckOutlined style={{ color: "var(--theme-accent)" }} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="primary"
              block
              loading={savingTheme}
              onClick={handleThemeSave}
            >
              Save Appearance
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
