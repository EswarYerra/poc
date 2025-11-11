import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { Edit2, Trash2 } from "lucide-react";
import "./ManageUsers.css";

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const initialStatusFilter = location.state?.statusFilter || "All Status";
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [showConfirm, setShowConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const usersPerPage = 10;
  const token = localStorage.getItem("access");
  const navigate = useNavigate();

  // ====== Fetch Users ======
  useEffect(() => {
    fetchUsers();
  },);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/viewprofile/admin/users/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fetchedUsers = Array.isArray(res.data) ? res.data : res.data.results || [];

      const formatted = fetchedUsers.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role_display || (u.role === "admin" ? "Admin" : "User"),
        status: u.is_active ? "Active" : "Inactive",
        dateJoined: u.date_joined ? u.date_joined.split("T")[0] : "—",
      }));

      setUsers(formatted);
    } catch (err) {
      console.error("Error fetching users:", err.response?.data || err.message);
    }
  };

  // ====== Filters & Search ======
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All Status" || u.status === statusFilter;
    const matchesRole = roleFilter === "All Roles" || u.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  // ====== Pagination ======
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));

  const handleNextPage = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);
  const handlePrevPage = () =>
    currentPage > 1 && setCurrentPage(currentPage - 1);

  // ====== Navigation ======
  const handleEditClick = (user) => {
    navigate(`/admin/users/edit/${user.id}`);
  };

  const handleAddUser = () => {
    navigate("/admin/users/add");
  };

  // ====== Delete User ======
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/viewprofile/admin/users/${userToDelete.id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.filter((u) => u.id !== userToDelete.id));
    } catch (err) {
      console.error("Error deleting user:", err.response?.data || err.message);
    } finally {
      setShowConfirm(false);
      setUserToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setUserToDelete(null);
  };

  // ====== Export Users ======
  const handleExport = () => {
    const csv = [
      ["Username", "Email", "Role", "Status", "Joined"],
      ...users.map((u) => [u.username, u.email, u.role, u.status, u.dateJoined]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "users.csv";
    link.click();
  };

  return (
    <div className="manage-users-container">
      <div className="page-header">
        <h2>User Management</h2>
        <p>View, edit, and manage all registered users efficiently.</p>
        <div className="header-actions">
          <button className="export-btn" onClick={handleExport}>
            Export
          </button>
          <button className="add-btn" onClick={handleAddUser}>
            + Add User
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by username or email..."
          className="search-box"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <select
          className="filter-select"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option>All Roles</option>
          <option>Admin</option>
          <option>User</option>
        </select>
      </div>

      {/* ====== Users Table ====== */}
      <table className="users-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.length > 0 ? (
            currentUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`role-badge ${u.role.toLowerCase()}`}>{u.role}</span>
                </td>
                <td>
                  <span className={`status-badge ${u.status.toLowerCase()}`}>
                    {u.status}
                  </span>
                </td>
                <td>{u.dateJoined}</td>
                <td>
                  <button
                    className="action-btn edit"
                    onClick={() => handleEditClick(u)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDeleteClick(u)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ====== Pagination ====== */}
      {filteredUsers.length > usersPerPage && (
        <div className="pagination-controls">
          <button
            className="btn btn-gray"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            &lt;&lt; Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-gray"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next &gt;&gt;
          </button>
        </div>
      )}

      {/* ====== Delete Confirmation ====== */}
      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to delete{" "}
              <strong>{userToDelete?.username}</strong>?
            </p>
            <div className="confirm-buttons">
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
              <button className="btn btn-gray" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
