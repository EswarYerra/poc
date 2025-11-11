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
    user_error: null,
    user_information: null,
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // ✅ Load DB messages (error/info)
  useEffect(() => {
    const loadTables = async () => {
      try {
        const e = JSON.parse(localStorage.getItem("user_error") || "null");
        const i = JSON.parse(localStorage.getItem("user_information") || "null");
        if (e && i) {
          setTables({ user_error: e, user_information: i });
          return;
        }

        const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        const data = await res.json();
        localStorage.setItem("user_error", JSON.stringify(data.user_error || {}));
        localStorage.setItem("user_information", JSON.stringify(data.user_information || {}));
        setTables({
          user_error: data.user_error || {},
          user_information: data.user_information || {},
        });
      } catch (err) {
        console.error("❌ Failed to fetch message tables:", err);
      }
    };
    loadTables();
  }, []);

  // ✅ Lookup helper
  const lookupFromTable = (table, code, codeKey, textKey) => {
    if (!table || !code) return "";
    try {
      if (Array.isArray(table)) {
        const entry = table.find(
          (x) => (x[codeKey] || "").toUpperCase() === code.toUpperCase()
        );
        return entry ? entry[textKey] : "";
      } else if (typeof table === "object") {
        return table[code] || table[code.toUpperCase()] || "";
      }
    } catch (err) {
      console.warn("Lookup error:", err);
    }
    return "";
  };

  const getErrorText = (code) =>
    lookupFromTable(tables.user_error, code, "error_code", "error_message");

  const getInfoText = (code) =>
    lookupFromTable(tables.user_information, code, "information_code", "information_text");

  // ✅ Field handlers
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validateOtp = (value) => {
    const otpRegex = /^[0-9]{6}$/;
    if (!otpRegex.test(value)) {
      setErrors((prev) => ({ ...prev, otp: getErrorText("EF002") }));
      return false;
    }
    setErrors((prev) => ({ ...prev, otp: "" }));
    return true;
  };

  const validatePasswords = () => {
    if (form.new_password !== form.confirm_password) {
      setErrors((prev) => ({ ...prev, confirm_password: getErrorText("EF003") }));
      return false;
    }
    setErrors((prev) => ({ ...prev, confirm_password: "" }));
    return true;
  };

  const handleOtpBlur = (e) => validateOtp(e.target.value);

  // ✅ Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setErrors({});
    const otpValid = validateOtp(form.otp);
    const pwdValid = validatePasswords();
    if (!otpValid || !pwdValid) return;

    setLoading(true);
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/password-reset/verify-otp/",
        form
      );

      const detail = res.data?.detail?.toLowerCase?.() || "";

      // 🔸 Handle backend error response text
      if (detail.includes("failed to update password")) {
        setErrors({ general: getErrorText("EF006") });
        setLoading(false);
        return;
      }

      // 🔸 Show success only on actual success
      if (res.status === 200) {
        const successMessage =
          getInfoText("IFP002") || res.data?.detail || "[MISSING: IF003]";
        setMessage(successMessage);

        // Redirect after short delay
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setErrors({ general: getErrorText("EA010") });
      }
    } catch (err) {
      const data = err.response?.data || {};
      const detail = data.detail?.toLowerCase?.() || "";

      // 🔸 Match known backend error phrases to constants
      if (detail.includes("invalid verification code")) {
        setErrors({ otp: getErrorText("EF005") });
      } else if (detail.includes("session ended")) {
        setErrors({ otp: getErrorText("EF004") });
      } else if (detail.includes("email not registered")) {
        setErrors({ general: getErrorText("EF001") });
      } else if (detail.includes("failed to update password")) {
        setErrors({ general: getErrorText("EF006") });
      } else {
        setErrors({ general: getErrorText("EA010") });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Render
  return (
    <div className="verify-container">
      <div className="verify-card">
        <h2 className="verify-title">{getInfoText("IF005")}</h2>
        <p className="verify-subtext">{getInfoText("IF004")}</p>

        <form onSubmit={handleSubmit}>
          {/* Email */}
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

          {/* OTP */}
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

          {/* New Password */}
          <div className="form-group password-field">
            <label>New Password</label>
            <div className="password-wrapper">
              <input
                type={showNewPass ? "text" : "password"}
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                placeholder={getInfoText("IFP001")}
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

          {/* Confirm Password */}
          <div className="form-group password-field">
            <label>Confirm Password</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPass ? "text" : "password"}
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                placeholder={getInfoText("IFP002")}
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

          {/* General + Success messages */}
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
