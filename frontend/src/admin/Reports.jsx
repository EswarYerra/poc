import React from "react";
import "../layouts/AdminLayout.css";


export default function Reports() {
  return (
    <div className="admin-page">
      <h2>Reports</h2>
      <p>Track application usage, performance, and user activity.</p>

      <div className="reports-container">
        <div className="report-card">
          <h3>Monthly Active Users</h3>
          <p>1,234</p>
        </div>
        <div className="report-card">
          <h3>Reports Generated</h3>
          <p>58</p>
        </div>
        <div className="report-card">
          <h3>Errors Logged</h3>
          <p>3</p>
        </div>
      </div>
    </div>
  );
}
