import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ChangePassword.css";
import { Eye, EyeOff } from "lucide-react";

export default function ChangePassword() {
  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [tables, setTables] = useState({
    user_error: [],
    user_information: [],
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  // ✅ Load message tables safely
  useEffect(() => {
    const loadTables = async () => {
      try {
        let e = localStorage.getItem("user_error");
        let i = localStorage.getItem("user_information");

        e = e ? JSON.parse(e) : [];
        i = i ? JSON.parse(i) : [];

        // ensure they are arrays
        e = Array.isArray(e) ? e : [];
        i = Array.isArray(i) ? i : [];

        if (e.length && i.length) {
          setTables({ user_error: e, user_information: i });
        } else {
          const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
          if (res.ok) {
            const data = await res.json();

            const errArray = Array.isArray(data.user_error)
              ? data.user_error
              : [];
            const infoArray = Array.isArray(data.user_information)
              ? data.user_information
              : [];

            setTables({
              user_error: errArray,
              user_information: infoArray,
            });

            localStorage.setItem("user_error", JSON.stringify(errArray));
            localStorage.setItem("user_information", JSON.stringify(infoArray));
          }
        }
      } catch (err) {
        console.error("Failed to load message tables:", err);
        setTables({ user_error: [], user_information: [] });
      }
    };

    loadTables();
  }, []);

  // ✅ Helper to safely find messages
  const getErrorText = (code) => {
  const data = tables.user_error;

  // Handle case where data is array
  if (Array.isArray(data)) {
    const found = data.find(
      (x) =>
        typeof x === "object" &&
        (x.error_code || "").toUpperCase() === code.toUpperCase()
    );
    return found ? found.error_message : "";
  }

  // Handle case where data is object (key-value)
  if (typeof data === "object" && data !== null) {
    const key = Object.keys(data).find(
      (k) => k.toUpperCase() === code.toUpperCase()
    );
    return key ? data[key] : "";
  }

  return "";
};

  const getInfoText = (code) => {
    if (!Array.isArray(tables.user_information)) return "";
    const i = tables.user_information.find(
      (x) =>
        typeof x === "object" &&
        (x.information_code || "").toUpperCase() === code.toUpperCase()
    );
    return i ? i.information_text : "";
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({});
  };

  const toggleShowPassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess("");

    // ✅ EF003: mismatch message from DB
    if (form.new_password !== form.confirm_password) {
  const mismatchMsg = getErrorText("EF003") || "New password and confirm password do not match.";
  setErrors({ confirm_password: mismatchMsg });
  return;
}

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/change-password/",
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ success message from DB ICP001
      const infoMsg =
        res.data.detail || getInfoText("ICP001") || "Password changed successfully.";
      setSuccess(infoMsg);
      setTimeout(() => navigate("/profile"), 2000);
    } catch (err) {
      console.error("Password change failed:", err);
      let errMsg = "";

      if (err.response?.data?.old_password) {
        errMsg = err.response.data.old_password;
        setErrors({
          old_password:
            errMsg || getErrorText("EC001") || "Wrong old password.",
        });
      } else if (err.response?.data?.confirm_password) {
        errMsg = err.response.data.confirm_password;
        setErrors({ confirm_password: errMsg });
      } else {
        setErrors({ general: "Something went wrong." });
      }
    }
  };

  return (
    <div className="change-password-container">
      <h2>Change Password</h2>

      <form onSubmit={handleSubmit} className="change-password-form">
        {/* ✅ Success + general error */}
        {success && <div className="alert-box alert-success">{success}</div>}
        {errors.general && (
          <div className="alert-box alert-error">{errors.general}</div>
        )}

        {["old_password", "new_password", "confirm_password"].map((field) => (
          <div key={field} className="input-group">
            <div className="password-field">
              <input
                type={showPassword[field.split("_")[0]] ? "text" : "password"}
                name={field}
                placeholder={
                  field === "old_password"
                    ? "Current Password"
                    : field === "new_password"
                    ? "New Password"
                    : "Confirm New Password"
                }
                value={form[field]}
                onChange={handleChange}
                className="change-password-input"
                required
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => toggleShowPassword(field.split("_")[0])}
              >
                {showPassword[field.split("_")[0]] ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
            {errors[field] && (
              <div className="alert-box alert-error">{errors[field]}</div>
            )}
          </div>
        ))}

        <button type="submit" className="change-password-button">
          Update Password
        </button>
      </form>

      <p className="back-to-profile">
        <button
          type="button"
          className="change-password-back-btn"
          onClick={() => navigate("/profile")}
        >
          Back to Profile
        </button>
      </p>
    </div>
  );
}
