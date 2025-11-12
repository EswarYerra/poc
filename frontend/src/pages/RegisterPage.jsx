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
  const [checking, setChecking] = useState({ username: false, email: false });

  // Load messages once (attempt; not required to succeed)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        if (!res.ok) return;
        const data = await res.json();
        localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
        localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
        localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
      } catch (e) {
        // silent
      }
    })();
  }, []);

  // helper: set single field error
  const setFieldError = (field, msg) =>
    setErrors((prev) => {
      const copy = { ...prev };
      if (!msg) delete copy[field];
      else copy[field] = msg;
      return copy;
    });

  // Validation mapping to codes (returns resolved string or empty string)
  const validateField = (name, value) => {
    const v = (value || "").trim();
    if (!v) return getMessageByCode("VA002"); // generic "Field cannot be empty"

    // Name (special char -> EP001 requested)
    if (name === "firstName" || name === "lastName") {
      if (!/^[A-Za-z\s]+$/.test(v)) return getMessageByCode("EP001"); // special char error code
      if (v.length > 50) return getMessageByCode("VA003");
      return "";
    }

    if (name === "username") {
      if (!/^[A-Za-z0-9_]+$/.test(v)) return getMessageByCode("VA008");
      if (v.length < 3 || v.length > 20) return getMessageByCode("VA009");
      return "";
    }

    if (name === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return getMessageByCode("VA005");
      return "";
    }

    if (name === "phone") {
      if (!/^[0-9]+$/.test(v)) return getMessageByCode("VA006"); // numeric required
      if (v.length !== 10) return getMessageByCode("VP009"); // phone length code per request
      return "";
    }

    if (name === "password") {
      if (v.length < 6) return getMessageByCode("EA004");
      return "";
    }

    return "";
  };

  // run validation for one field and optionally do server checks (username/email)
  const runValidationForField = async (name, value) => {
    const clientMsg = validateField(name, value);
    setFieldError(name, clientMsg);

    if (clientMsg) return; // stop if client validation fails

    // server-side existence checks on blur
    if (name === "username") {
      try {
        setChecking((c) => ({ ...c, username: true }));
        const res = await fetch(
          `http://127.0.0.1:8000/api/auth/check-username/?username=${encodeURIComponent(value.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.exists) setFieldError("username", getMessageByCode("EP016"));
        }
      } catch (e) {
        // ignore network check failures (don't block user)
      } finally {
        setChecking((c) => ({ ...c, username: false }));
      }
    }

    if (name === "email") {
      try {
        setChecking((c) => ({ ...c, email: true }));
        const res = await fetch(
          `http://127.0.0.1:8000/api/auth/check-email/?email=${encodeURIComponent(value.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.exists) setFieldError("email", getMessageByCode("ES003"));
        }
      } catch (e) {
        // ignore
      } finally {
        setChecking((c) => ({ ...c, email: false }));
      }
    }
  };

  // Handler: blur triggers validation + server checks
  const handleBlur = async (e) => {
    const { name, value } = e.target;
    await runValidationForField(name, value);
  };

  // When pressing Enter while in an input: blur it & run validation (but do not submit)
  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const el = e.target;
      if (el && el.blur) el.blur(); // will call onBlur which runs validation
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setFieldError(name, "");
    setFieldError("general", "");
    setSuccess("");
  };

  // Validate all fields before submitting; returns boolean
  const validateAll = async () => {
    const fields = ["firstName", "lastName", "username", "email", "phone", "password"];
    const newErrs = {};
    let ok = true;

    // client validations first
    for (const f of fields) {
      const msg = validateField(f, formData[f]);
      if (msg) {
        newErrs[f] = msg;
        ok = false;
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrs }));
    if (!ok) return false;

    // then check username/email existence with server
    try {
      const u = formData.username.trim();
      const e = formData.email.trim();

      if (u) {
        const resU = await fetch(`http://127.0.0.1:8000/api/auth/check-username/?username=${encodeURIComponent(u)}`);
        if (resU.ok) {
          const data = await resU.json();
          if (data.exists) {
            setFieldError("username", getMessageByCode("EP016"));
            ok = false;
          }
        }
      }

      if (e) {
        const resE = await fetch(`http://127.0.0.1:8000/api/auth/check-email/?email=${encodeURIComponent(e)}`);
        if (resE.ok) {
          const data = await resE.json();
          if (data.exists) {
            setFieldError("email", getMessageByCode("ES003"));
            ok = false;
          }
        }
      }
    } catch {
      // server checks failing should not block submission (optional)
    }

    return ok;
  };

  // Submit
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSuccess("");
    setFieldError("general", "");

    const ok = await validateAll();
    if (!ok) {
      setFieldError("general", getMessageByCode("VA002"));
      return;
    }

    const payload = {
      username: formData.username.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      password: formData.password,
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // success message from DB code IP001 as requested
        setSuccess(getMessageByCode("IP001"));
        // clear sensitive fields
        setFormData((p) => ({ ...p, password: "" }));
        setTimeout(() => navigate("/login"), 1200);
        return;
      }

      // parse backend errors (map codes inside messages back to friendly text)
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      // If backend returned field-level errors, map them to UI
      if (data && typeof data === "object") {
        const mapped = {};
        Object.entries(data).forEach(([k, v]) => {
          const str = Array.isArray(v) ? String(v[0]) : String(v);
          // try to detect code inside value and resolve
          const codeMatch = (str || "").match(/\b([A-Z]{1,3}\d{3})\b/);
          if (codeMatch && codeMatch[1]) {
            mapped[k] = getMessageByCode(codeMatch[1]) || str;
          } else {
            mapped[k] = str;
          }
        });
        setErrors((p) => ({ ...p, ...mapped }));
      } else {
        setFieldError("general", getMessageByCode("EA004"));
      }
    } catch (err) {
      console.error("Registration network error:", err);
      setFieldError("general", getMessageByCode("EA004"));
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <h2>Create Account</h2>

          {/* success shown above form as requested */}
          {success && <p className="success" style={{ marginBottom: 12 }}>{success}</p>}

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
            {checking.username ? (
              <p style={{ fontSize: 12, color: "#666" }}>Checking username...</p>
            ) : (
              errors.username && <p className="error">{errors.username}</p>
            )}

            <input
              name="email"
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            {checking.email ? (
              <p style={{ fontSize: 12, color: "#666" }}>Checking email...</p>
            ) : (
              errors.email && <p className="error">{errors.email}</p>
            )}

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

            <div className="password-wrapper" style={{ position: "relative" }}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
              <span
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                style={{ position: "absolute", right: 10, top: 8, cursor: "pointer" }}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
            {errors.password && <p className="error">{errors.password}</p>}

            {errors.general && <p className="error">{errors.general}</p>}

            <button type="submit">Create Account</button>
          </form>

          <p className="redirect">
            Already have an account?{" "}
            <Link to="/login" className="login-link">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
