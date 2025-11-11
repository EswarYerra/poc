import React from "react";
import "../layouts/AdminLayout.css";


export default function AdminSettings() {
  return (
    <div className="admin-page">
      <h2>Admin Settings</h2>
      <p>Manage admin preferences, appearance, and access controls.</p>

      <div className="settings-form">
        <div className="form-group">
          <label>Site Title</label>
          <input type="text" placeholder="Enter site title" />
        </div>

        <div className="form-group">
          <label>Notification Email</label>
          <input type="email" placeholder="admin@example.com" />
        </div>

        <div className="form-group">
          <label>Theme</label>
          <select>
            <option>Dark Blue</option>
            <option>Light</option>
          </select>
        </div>

        <button className="btn btn-primary">Save Changes</button>
      </div>
    </div>
  );
}
