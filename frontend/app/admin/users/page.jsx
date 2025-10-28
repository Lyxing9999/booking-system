"use client";

import { useState, useEffect, useTransition } from "react";
import { Table, Button, Input, Space, message, Tag, Popconfirm, Modal, Form } from "antd";
import { useRouter } from "next/navigation";

import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";

export default function AdminUsersPage() {
  const router = useRouter();

  // ---------------- State ----------------
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isPending, startTransition] = useTransition();

  const [messageApi, contextHolder] = message.useMessage();
  const notify = {
    success: (text) => messageApi.success(text, 3),
    error: (text) => messageApi.error(text, 3),
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [form] = Form.useForm();

  // ---------------- Debounce Hook ----------------
  const useDebounce = (value, delay = 300) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      setLoading(true);
      const handler = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debounced;
  };

  const debouncedSearch = useDebounce(searchText);

  // ---------------- Fetch Users ----------------
  const fetchUsers = async (pageNum = 1, searchParam = debouncedSearch) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: pageNum, limit });
      if (searchParam) params.append("search", searchParam);

      const res = await api.get(`/user/admin/users?${params.toString()}`);
      const filteredUsers = (res.data.users || []).filter((u) => u.role === "user");

      setUsers(filteredUsers);
      setTotal(res.data.total || filteredUsers.length);
      setPage(pageNum);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchUsers(1);
  }, [debouncedSearch]);

  // ---------------- Actions ----------------
  const handleReset = () => {
    setSearchText("");
    setPage(1);
    fetchUsers(1, "");
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/user/admin/users/${id}`);
      notify.success("User deleted successfully");
      fetchUsers(page, debouncedSearch);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Failed to delete user");
    }
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setCurrentUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setIsEdit(true);
    setCurrentUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
    });
    setIsModalOpen(true);
  };
  // ---------------- Modal Submit ----------------
  const handleModalSubmit = async (values) => {
    try {
      if (isEdit && !values.password) delete values.password;
  
      if (isEdit && currentUser) {
        await api.put(`/user/admin/users/${currentUser._id}`, values);
        notify.success("User updated successfully");
      } else {
        await api.post(`/user/admin/users`, values);
        notify.success("User created successfully");
      }
      setIsModalOpen(false);
      fetchUsers(page, debouncedSearch);
    } catch (err) {
      notify.error(err?.response?.data?.message || "Operation failed");
    }
  };

  // ---------------- Table Columns ----------------
  const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Email", dataIndex: "email" },
    {
      title: "Bookings",
      dataIndex: "bookingCount",
      render: (count) => <Tag color="green">{count}</Tag>,
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button type="primary" onClick={() => openEditModal(record)}>Edit</Button>
          <Popconfirm
            title="Are you sure to delete this user?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ---------------- Navigation ----------------
  const navigate = (path) => startTransition(() => router.push(path));

  // ---------------- Render ----------------
  return (
    <DashboardLayout role="admin">
      {contextHolder}
      <div className="p-6">
        {/* Navigation */}
        <Space className="mb-6">
          <Button type="primary" onClick={() => navigate("/admin/users")}>Users</Button>
          <Button onClick={() => navigate("/admin/slots")}>Slots</Button>
          <Button onClick={() => navigate("/admin/bookings")}>All Bookings</Button>
          <Button onClick={() => navigate("/admin/confirmed-bookings")}>Confirmed Bookings</Button>
        </Space>

        <h2 className="text-2xl font-semibold mb-4">Users</h2>

        {/* Actions */}
        <Space className="mb-4">
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name or email"
            style={{ width: 250 }}
          />
          <Button onClick={handleReset} disabled={loading}>Reset</Button>
          <Button type="primary" onClick={openCreateModal}>Create User</Button>
        </Space>

        {/* Users Table */}
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={users}
          loading={loading || isPending}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            onChange: (p) => fetchUsers(p, debouncedSearch),
            showTotal: (total) => `Total ${total} users`,
          }}
          bordered
          size="middle"
        />

        {/* Modal for Create/Edit */}
        <Modal
          open={isModalOpen}
          title={isEdit ? "Edit User" : "Create User"}
          onCancel={() => setIsModalOpen(false)}
          onOk={() => form.submit()}
          okText={isEdit ? "Update" : "Create"}
        >
          <Form form={form} layout="vertical" onFinish={handleModalSubmit}>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: "Please input the name" }]}
            >
              <Input placeholder="Enter full name" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please input the email" },
                { type: "email", message: "Please enter a valid email" },
              ]}
            >
              <Input placeholder="Enter email address" />
            </Form.Item>

            <Form.Item
              name="password"
              label={isEdit ? "New Password (leave empty to keep current)" : "Password"}
              rules={isEdit ? [] : [{ required: true, message: "Please input the password" }]}
            >
              <Input.Password placeholder={isEdit ? "Enter new password if changing" : "Enter password"} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}