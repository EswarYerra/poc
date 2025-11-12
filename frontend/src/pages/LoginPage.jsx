// ✅ frontend/src/pages/LoginPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "./LoginPage.css";

// 🔸 Only fallback codes, not texts
const FALLBACK_CODES = {
  LOGIN_FAILED: "EL001",
  LOGIN_SUCCESS: "IL001",
  SERVER_ERROR: "EA010",
};

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const navigate = useNavigate();

  const [msgTables, setMsgTables] = useState({
    user_error: {},
    user_information: {},
    user_validation: {},
  });

  // --- Normalizer converts arrays or objects to simple { CODE: "text" }
  const normalize = (maybeArrOrObj, type = "error") => {
    try {
      if (!maybeArrOrObj) return {};
      if (Array.isArray(maybeArrOrObj)) {
        const map = {};
        maybeArrOrObj.forEach((item) => {
          if (!item) return;
          if (type === "error") {
            const c = (item.error_code || item.code || "").toUpperCase();
            if (c) map[c] = item.error_message || item.message || "";
          } else if (type === "validation") {
            const c = (item.validation_code || "").toUpperCase();
            if (c) map[c] = item.validation_message || "";
          } else if (type === "info") {
            const c = (item.information_code || "").toUpperCase();
            if (c) map[c] = item.information_text || "";
          }
        });
        return map;
      }
      if (typeof maybeArrOrObj === "object") {
        const map = {};
        Object.entries(maybeArrOrObj).forEach(([k, v]) => {
          if (v && typeof v === "object") {
            map[k.toUpperCase()] =
              v.error_message ||
              v.information_text ||
              v.validation_message ||
              String(v);
          } else map[k.toUpperCase()] = String(v || "");
        });
        return map;
      }
      return {};
    } catch {
      return {};
    }
  };

  // --- Loader: try DB first → cache → constants fallback
  useEffect(() => {
    const loadAllMessages = async () => {
      try {
        // 🔹 Try cached messages first
        const e = JSON.parse(localStorage.getItem("user_error") || "[]");
        const i = JSON.parse(localStorage.getItem("user_information") || "[]");
        const v = JSON.parse(localStorage.getItem("user_validation") || "[]");

        if (e.length || i.length || v.length) {
          setMsgTables({
            user_error: normalize(e, "error"),
            user_information: normalize(i, "info"),
            user_validation: normalize(v, "validation"),
          });
          return;
        }

        // 🔹 Try API from DB + constants.py merge
        let res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        if (!res.ok) throw new Error("messages fetch failed");
        const data = await res.json();

        const eMap = normalize(data.user_error, "error");
        const iMap = normalize(data.user_information, "info");
        const vMap = normalize(data.user_validation, "validation");

        localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
        localStorage.setItem(
          "user_information",
          JSON.stringify(data.user_information || [])
        );
        localStorage.setItem(
          "user_validation",
          JSON.stringify(data.user_validation || [])
        );
        setMsgTables({ user_error: eMap, user_information: iMap, user_validation: vMap });
      } catch (err) {
        console.warn("⚠️ DB messages failed, fallback to constants API:", err);
        try {
          const res2 = await fetch("http://127.0.0.1:8000/api/auth/constants/");
          const data2 = await res2.json();
          const eMap = normalize(data2.ERRORS, "error");
          const iMap = normalize(data2.INFORMATION, "info");
          const vMap = normalize(data2.VALIDATIONS, "validation");
          setMsgTables({
            user_error: eMap,
            user_information: iMap,
            user_validation: vMap,
          });
        } catch (err2) {
          console.error("❌ Fallback to constants failed:", err2);
          setMsgTables({ user_error: {}, user_information: {}, user_validation: {} });
        }
      }
    };
    loadAllMessages();
  }, []);

  const getErrorText = (code) =>
    msgTables.user_error[(code || "").toUpperCase()] || "";
  const getInfoText = (code) =>
    msgTables.user_information[(code || "").toUpperCase()] || "";

  // --- Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errCode =
          (data.code && String(data.code)) || FALLBACK_CODES.LOGIN_FAILED;
        const text = data.message || getErrorText(errCode);
        setMessage(text || getErrorText(FALLBACK_CODES.SERVER_ERROR) || "");
        setMessageType("error");
        return;
      }

      const infoCode =
        (data.code && String(data.code)) || FALLBACK_CODES.LOGIN_SUCCESS;
      const text = data.message || getInfoText(infoCode);
      setMessage(text);
      setMessageType("success");

      if (data.access) localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);
      if (data.username || data.email) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: data.username,
            email: data.email,
            is_admin: data.is_admin,
          })
        );
      }

      const token = data.access;

      setTimeout(async () => {
        if (data.is_admin) {
          navigate("/admin/dashboard", { replace: true });
          return;
        }
        try {
          const addrRes = await fetch(
            "http://127.0.0.1:8000/api/addresses/check_address/",
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const addrData = await addrRes.json().catch(() => ({}));
          if (addrRes.ok && addrData.has_address)
            navigate("/profile", { replace: true });
          else navigate("/addresses", { replace: true });
        } catch {
          navigate("/addresses", { replace: true });
        }
      }, 800);
    } catch (err) {
      console.error("❌ Login request failed:", err);
      setMessage(getErrorText(FALLBACK_CODES.SERVER_ERROR) || "");
      setMessageType("error");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="login-container">
        <h2>Login</h2>

        <form onSubmit={handleLogin} className="login-form">
          <input
            className="login-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div className="password-wrapper">
            <input
              className="login-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>

          {message && (
            <p
              className={`login-message ${
                messageType === "error" ? "error-text" : "success-text"
              }`}
            >
              {message}
            </p>
          )}

          <button className="login-button" type="submit">
            Login
          </button>
        </form>

        <div className="login-links">
          <p>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          <p>
            Don’t have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
