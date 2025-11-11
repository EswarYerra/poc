// frontend/src/pages/RegisterPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { getMessageByCode } from "../api/messageHelper";
import "./RegisterPage.css";

export default function RegisterForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Check if DB message tables are in cache
  const hasStoredMessages = () => {
    try {
      const ue = localStorage.getItem("user_error");
      return ue && Object.keys(JSON.parse(ue)).length > 0;
    } catch {
      return false;
    }
  };

  // ✅ Load from DB (or constants fallback)
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
        localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
        localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
        console.log("✅ Messages loaded successfully from backend");
      } catch (err) {
        console.error("❌ Failed to fetch messages:", err);
      }
    };

    if (!hasStoredMessages()) fetchMessages();
  }, []);

  // ✅ Error setter
  const setFieldError = (field, message) => {
    setErrors((prev) => {
      const newErr = { ...prev };
      if (!message) delete newErr[field];
      else newErr[field] = message;
      return newErr;
    });
  };

  // ✅ Validation using your constants.py codes
  const validateFieldClient = (name, value) => {
    const v = value?.trim() || "";

    if (!v) {
      switch (name) {
        case "firstName":
        case "lastName":
          return getMessageByCode("VA002"); // Field cannot be empty
        case "username":
          return getMessageByCode("VA002"); // Required
        case "email":
          return getMessageByCode("VA002");
        case "phone":
          return getMessageByCode("VA002");
        case "password":
          return getMessageByCode("VA002");
        default:
          return getMessageByCode("VA002");
      }
    }

    if (["firstName", "lastName"].includes(name)) {
      if (!/^[A-Za-z\s]+$/.test(v)) return getMessageByCode("VA001"); // Only alphabets
      if (v.length > 50) return getMessageByCode("VA003"); // Max 50 chars
    }

    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      return getMessageByCode("VA005"); // Invalid email

    if (name === "phone") {
      if (!/^[0-9]+$/.test(v)) return getMessageByCode("VA006"); // Must be numeric
      if (v.length !== 10) return getMessageByCode("VA007"); // 10 digits
    }

    if (name === "password" && v.length < 6)
      return getMessageByCode("EA004"); // This field is required or weak password msg

    return "";
  };

  // ✅ Async username/email existence checks
  const handleBlur = async (e) => {
    const { name, value } = e.target;
    const clientErr = validateFieldClient(name, value);
    setFieldError(name, clientErr);

    if (!clientErr && value.trim()) {
      try {
        if (name === "username") {
          const res = await fetch(
            `http://127.0.0.1:8000/api/auth/check-username/?username=${encodeURIComponent(value.trim())}`
          );
          if (res.ok) {
            const json = await res.json();
            if (json.exists)
              setFieldError("username", getMessageByCode("EP016")); // Username exists
          }
        }

        if (name === "email") {
          const res = await fetch(
            `http://127.0.0.1:8000/api/auth/check-email/?email=${encodeURIComponent(value.trim())}`
          );
          if (res.ok) {
            const json = await res.json();
            if (json.exists)
              setFieldError("email", getMessageByCode("ES003")); // Email exists
          }
        }
      } catch (err) {
        console.warn("⚠️ Validation API error:", err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.blur();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldError(name, "");
    setFieldError("general", "");
  };

  const parseBackendErrors = async (response) => {
    try {
      const data = await response.json();
      if (data && data.message) return { general: data.message };
      if (data && typeof data === "object") {
        const out = {};
        Object.keys(data).forEach((k) => {
          const v = data[k];
          out[k] = Array.isArray(v) ? v[0] : String(v);
        });
        return out;
      }
    } catch {
      /* ignore */
    }
    return { general: getMessageByCode("EA004") };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setFieldError("general", "");

    const fields = ["firstName", "lastName", "username", "email", "phone", "password"];
    const newErrors = {};
    let hasError = false;

    fields.forEach((f) => {
      const err = validateFieldClient(f, formData[f]);
      if (err) {
        newErrors[f] = err;
        hasError = true;
      }
    });

    if (hasError) {
      setErrors(newErrors);
      setFieldError("general", getMessageByCode("VA002"));
      return;
    }

    const payload = {
      username: formData.username,
      email: formData.email,
      phone: formData.phone,
      first_name: formData.firstName,
      last_name: formData.lastName,
      password: formData.password,
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess(getMessageByCode("IR001")); // Account created successfully
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("user");
        setTimeout(() => navigate("/login", { replace: true }), 1200);
        return;
      }

      const be = await parseBackendErrors(response);
      setErrors(be);
    } catch (err) {
      console.error("Registration failed:", err);
      setFieldError("general", getMessageByCode("EA004")); // Fallback from constants
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <h2>Create Account</h2>
          <p className="subtitle">Join us by filling out the details below</p>

          <form onSubmit={handleSubmit} noValidate>
            <input
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.firstName && <p className="error">{errors.firstName}</p>}

            <input
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.lastName && <p className="error">{errors.lastName}</p>}

            <input
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.username && <p className="error">{errors.username}</p>}

            <input
              name="email"
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.email && <p className="error">{errors.email}</p>}

            <input
              name="phone"
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {errors.phone && <p className="error">{errors.phone}</p>}

            <div className="password-wrapper">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
              <span className="password-toggle" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
            {errors.password && <p className="error">{errors.password}</p>}

            {errors.general && <p className="error">{errors.general}</p>}
            {success && <p className="success">{success}</p>}

            <button type="submit">Create Account</button>
          </form>

          <p className="redirect">
            Already have an account?
            <Link to="/login" className="login-link"> Login here </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
