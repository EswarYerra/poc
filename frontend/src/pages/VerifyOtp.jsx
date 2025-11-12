// ✅ frontend/src/pages/VerifyOtp.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "./VerifyOtp.css";

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefilledEmail = location.state?.email || "";

  const [form, setForm] = useState({
    email: prefilledEmail,
    otp: "",
    new_password: "",
    confirm_password: "",
  });

  const [tables, setTables] = useState({
    user_error: {},
    user_information: {},
    user_validation: {},
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Normalize array/object → map { CODE: "Message" }
  const normalize = (data, type = "error") => {
    try {
      if (!data) return {};
      if (Array.isArray(data)) {
        const map = {};
        data.forEach((item) => {
          if (!item) return;
          if (type === "error") {
            const code = (item.error_code || "").toUpperCase();
            if (code) map[code] = item.error_message || "";
          } else if (type === "info") {
            const code = (item.information_code || "").toUpperCase();
            if (code) map[code] = item.information_text || "";
          } else if (type === "validation") {
            const code = (item.validation_code || "").toUpperCase();
            if (code) map[code] = item.validation_message || "";
          }
        });
        return map;
      }
      if (typeof data === "object") {
        const map = {};
        Object.entries(data).forEach(([k, v]) => {
          if (v && typeof v === "object") {
            map[k.toUpperCase()] =
              v.error_message || v.information_text || v.validation_message || String(v);
          } else {
            map[k.toUpperCase()] = String(v || "");
          }
        });
        return map;
      }
      return {};
    } catch {
      return {};
    }
  };

  // Load messages from cache → DB → constants
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const e = JSON.parse(localStorage.getItem("user_error") || "[]");
        const i = JSON.parse(localStorage.getItem("user_information") || "[]");
        const v = JSON.parse(localStorage.getItem("user_validation") || "[]");

        if (e.length || i.length || v.length) {
          setTables({
            user_error: normalize(e, "error"),
            user_information: normalize(i, "info"),
            user_validation: normalize(v, "validation"),
          });
          return;
        }

        const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        if (!res.ok) throw new Error("messages endpoint failed");
        const data = await res.json();

        localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
        localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
        localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));

        setTables({
          user_error: normalize(data.user_error, "error"),
          user_information: normalize(data.user_information, "info"),
          user_validation: normalize(data.user_validation, "validation"),
        });
      } catch {
        const res2 = await fetch("http://127.0.0.1:8000/api/auth/constants/");
        const data2 = await res2.json();
        setTables({
          user_error: normalize(data2.ERRORS, "error"),
          user_information: normalize(data2.INFORMATION, "info"),
          user_validation: normalize(data2.VALIDATIONS, "validation"),
        });
      }
    };
    loadMessages();
  }, []);

  const getErrorText = (code) =>
    tables.user_error[(code || "").toUpperCase()] || "";
  const getInfoText = (code) =>
    tables.user_information[(code || "").toUpperCase()] || "";

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const validateOtp = (value) => {
    const otpRegex = /^[0-9]{6}$/;
    if (!otpRegex.test(value)) {
      setErrors({ otp: getErrorText("EF002") });
      return false;
    }
    setErrors({ otp: "" });
    return true;
  };

  const validatePasswords = () => {
    if (form.new_password !== form.confirm_password) {
      setErrors({ confirm_password: getErrorText("EF003") });
      return false;
    }
    setErrors({ confirm_password: "" });
    return true;
  };

  const handleOtpBlur = (e) => validateOtp(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setErrors({});
    if (!validateOtp(form.otp) || !validatePasswords()) return;

    setLoading(true);
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/password-reset/verify-otp/",
        form
      );

      const data = res.data || {};
      if (res.status === 200) {
        const infoCode = data.code || "IF003";
        setMessage(getInfoText(infoCode));
        setTimeout(() => navigate("/login"), 2000);
      } else {
        const errCode = data.code || "EA010";
        setErrors({ general: getErrorText(errCode) });
      }
    } catch (err) {
      const data = err.response?.data || {};
      const errCode = data.code || "EA010";
      setErrors({ general: getErrorText(errCode) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-card">
        <h2 className="verify-title">{getInfoText("IF005")}</h2>
        <p className="verify-subtext">{getInfoText("IF004")}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              readOnly
              className="readonly-input"
            />
          </div>

          <div className="form-group">
            <label>Verification Code</label>
            <input
              type="text"
              name="otp"
              value={form.otp}
              onChange={handleChange}
              onBlur={handleOtpBlur}
              placeholder="Enter 6-digit code"
              maxLength="6"
              required
            />
            {errors.otp && <p className="error-msg">{errors.otp}</p>}
          </div>

          <div className="form-group password-field">
            <label>New Password</label>
            <div className="password-wrapper">
              <input
                type={showNewPass ? "text" : "password"}
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                placeholder="Enter new password"
                required
              />
              <span
                className="toggle-eye"
                onClick={() => setShowNewPass(!showNewPass)}
              >
                {showNewPass ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
          </div>

          <div className="form-group password-field">
            <label>Confirm Password</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPass ? "text" : "password"}
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                placeholder="Enter your password again"
                required
              />
              <span
                className="toggle-eye"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
              >
                {showConfirmPass ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
            {errors.confirm_password && (
              <p className="error-msg">{errors.confirm_password}</p>
            )}
          </div>

          {errors.general && <p className="error-msg">{errors.general}</p>}
          {message && <p className="success-msg">{message}</p>}

          <button type="submit" className="verify-btn" disabled={loading}>
            {loading ? getInfoText("IA006") : getInfoText("IF006")}
          </button>
        </form>
      </div>
    </div>
  );
}
