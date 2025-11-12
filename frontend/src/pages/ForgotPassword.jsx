// ✅ frontend/src/pages/ForgotPassword.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [tables, setTables] = useState({
    user_error: [],
    user_validation: [],
    user_information: [],
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  // ✅ Load message tables from cache or backend
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const cached = {
          user_error: JSON.parse(localStorage.getItem("user_error") || "[]"),
          user_validation: JSON.parse(localStorage.getItem("user_validation") || "[]"),
          user_information: JSON.parse(localStorage.getItem("user_information") || "[]"),
        };

        if (
          (Array.isArray(cached.user_error) && cached.user_error.length) ||
          (typeof cached.user_error === "object" && Object.keys(cached.user_error).length)
        ) {
          setTables(cached);
        } else {
          const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
          const data = await res.json();
          setTables(data);

          localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
          localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
          localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
        }

        console.log("✅ Message tables loaded successfully.");
      } catch (err) {
        console.error("❌ Failed to load message tables:", err);
      }
    };
    loadMessages();
  }, []);

  // ✅ Universal helper to fetch message text
  const findMessage = (table, codeKey, msgKey, code) => {
    if (!table || !code) return "";
    if (Array.isArray(table)) {
      const entry = table.find(
        (x) => (x[codeKey] || "").toUpperCase() === code.toUpperCase()
      );
      return entry ? entry[msgKey] : "";
    } else if (typeof table === "object") {
      return table[code] || table[code.toUpperCase()] || "";
    }
    return "";
  };

  // ✅ Helper functions
  const getErrorText = (code) =>
    findMessage(tables.user_error, "error_code", "error_message", code);

  const getValidationText = (code) =>
    findMessage(tables.user_validation, "validation_code", "validation_message", code);

  const getInfoText = (code) =>
    findMessage(tables.user_information, "information_code", "information_text", code);

  // ✅ Validate email field
  const validateEmail = (value) => {
    let msg = "";
    if (!value || !value.trim()) {
      msg = getValidationText("VA002"); // Field cannot be empty
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        msg = getValidationText("VA005"); // Invalid email format
      }
    }
    setErrors((prev) => ({ ...prev, email: msg }));
    return msg === "";
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrors({});
    const valid = validateEmail(email);
    if (!valid) return;

    setLoading(true);
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/password-reset/send-otp/",
        { email }
      );

      if (res.status === 200) {
  // ✅ Success case — handle any backend format (detail/message/sent)
  const msg =
    res.data.message ||
    res.data.detail ||
    getInfoText("IFP001") ||
    "Verification code sent successfully!..";
  setSuccessMsg(msg);

  setTimeout(() => {
    navigate("/verify-otp", { state: { email } });
  }, 1500);
} else {
  // ❌ Fallback only on non-200
  const fallback =
    res.data?.detail ||
    getErrorText("EF001") ||
    "Email not registered....";
  setErrors({ email: fallback });
}

    } catch (err) {
      console.error("❌ Error sending OTP:", err);
      const backendError =
        err.response?.data?.detail ||
        getErrorText("EF001"); // Email not registered
      setErrors({ email: backendError });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-wrapper">
      <div className="forgot-container">
        <h2 className="forgot-title">Forgot Password</h2>
        <p className="forgot-subtext">
          Enter your registered email to receive a verification code.
        </p>

        <form onSubmit={handleSubmit} className="forgot-form" noValidate>
          <div className="form-group">
            <label>Email Address</label>
            <input
              className="forgot-input"
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => validateEmail(e.target.value)}
              required
            />
            {errors.email && <p className="error-msg">{errors.email}</p>}
          </div>

          {successMsg && <p className="success-msg">{successMsg}</p>}

          <button className="forgot-btn" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Verification Code"}
          </button>
        </form>
      </div>
    </div>
  );
}
