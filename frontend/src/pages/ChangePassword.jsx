// ✅ frontend/src/pages/ChangePassword.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ChangePassword.css";
import { Eye, EyeOff } from "lucide-react";

// ✅ Fetch fallback message from backend constants if DB missing
const fetchBackendMessage = async (code, type) => {
  try {
    const cached = localStorage.getItem(`${type}_${code}`);
    if (cached) return cached;

    const res = await fetch(`http://127.0.0.1:8000/api/auth/messages/${type}/${code}/`);
    if (res.ok) {
      const data = await res.json();
      const message = data?.message || "";
      if (message) localStorage.setItem(`${type}_${code}`, message);
      return message;
    }
  } catch (err) {
    console.warn("⚠️ Could not fetch backend message:", code, type, err);
  }
  return "";
};

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

  // ✅ Load message tables safely (from cache or backend)
  useEffect(() => {
    const loadTables = async () => {
      try {
        let e = localStorage.getItem("user_error");
        let i = localStorage.getItem("user_information");

        e = e ? JSON.parse(e) : [];
        i = i ? JSON.parse(i) : [];

        if (Array.isArray(e) && Array.isArray(i) && (e.length || i.length)) {
          setTables({ user_error: e, user_information: i });
        } else {
          const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
          if (res.ok) {
            const data = await res.json();
            setTables({
              user_error: Array.isArray(data.user_error) ? data.user_error : [],
              user_information: Array.isArray(data.user_information) ? data.user_information : [],
            });
            localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
            localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
          }
        }
      } catch (err) {
        console.error("Failed to load message tables:", err);
        setTables({ user_error: [], user_information: [] });
      }
    };

    loadTables();
  }, []);

  // ✅ Safe helper with backend fallback
  const getErrorText = async (code) => {
    const data = tables.user_error;
    let msg = "";

    if (Array.isArray(data)) {
      const found = data.find(
        (x) =>
          typeof x === "object" &&
          (x.error_code || "").toUpperCase() === (code || "").toUpperCase()
      );
      msg = found?.error_message || "";
    } else if (typeof data === "object" && data !== null) {
      msg = data[code] || data[code.toUpperCase()] || "";
    }

    if (!msg) msg = await fetchBackendMessage(code, "error");
    return msg;
  };

  const getInfoText = async (code) => {
    const data = tables.user_information;
    let msg = "";

    if (Array.isArray(data)) {
      const found = data.find(
        (x) =>
          typeof x === "object" &&
          (x.information_code || "").toUpperCase() === (code || "").toUpperCase()
      );
      msg = found?.information_text || "";
    } else if (typeof data === "object" && data !== null) {
      msg = data[code] || data[code.toUpperCase()] || "";
    }

    if (!msg) msg = await fetchBackendMessage(code, "information");
    return msg;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({});
  };

  const toggleShowPassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // ✅ handle submit with all messages dynamic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess("");

    // 🔹 Validate confirm password
    if (form.new_password !== form.confirm_password) {
      const mismatchMsg = await getErrorText("EF003"); // “Passwords do not match”
      setErrors({ confirm_password: mismatchMsg });
      return;
    }

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/change-password/",
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ success message from DB or constants (ICP001)
      const infoMsg = (await getInfoText("ICP001")) || res.data?.detail;
      setSuccess(infoMsg);
      setTimeout(() => navigate("/profile"), 2000);
    } catch (err) {
      console.error("Password change failed:", err);

      let newErrors = {};

      if (err.response?.data?.old_password) {
        // old password invalid
        const msg =
          err.response.data.old_password ||
          (await getErrorText("EC001")); // “Invalid old password”
        newErrors.old_password = msg;
      } else if (err.response?.data?.new_password) {
        const msg =
          err.response.data.new_password ||
          (await getErrorText("EC002")); // e.g., “Weak password”
        newErrors.new_password = msg;
      } else if (err.response?.data?.confirm_password) {
        const msg =
          err.response.data.confirm_password ||
          (await getErrorText("EF003")); // mismatch
        newErrors.confirm_password = msg;
      } else {
        const msg = await getErrorText("EG001"); // generic fallback “Something went wrong”
        newErrors.general = msg;
      }

      setErrors(newErrors);
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

        {["old_password", "new_password", "confirm_password"].map((field) => {
          const fieldKey = field.split("_")[0];
          return (
            <div key={field} className="input-group">
              <div className="password-field">
                <input
                  type={showPassword[fieldKey] ? "text" : "password"}
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
                  onClick={() => toggleShowPassword(fieldKey)}
                >
                  {showPassword[fieldKey] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors[field] && (
                <div className="alert-box alert-error">{errors[field]}</div>
              )}
            </div>
          );
        })}

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
