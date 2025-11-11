// frontend/src/pages/LoginPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "./LoginPage.css";

// fallback codes only (no hard-coded text)
const FALLBACK_CODES = {
  LOGIN_FAILED: "EL001",
  LOGIN_SUCCESS: "IL001",
  SERVER_ERROR: "EA004",
};

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const navigate = useNavigate();

  // store normalized maps { CODE: "Message text" }
  const [msgTables, setMsgTables] = useState({
    user_error: {}, // map
    user_information: {},
    user_validation: {},
  });

  // Helper: normalize array/object returned by backend into a code->text map
  const normalize = (maybeArrOrObj, type = "error") => {
    // backend might return array of objects [{error_code, error_message}, ...]
    // or it might already be a map { "EL001": "text", ... }
    try {
      if (!maybeArrOrObj) return {};
      // If it's an array
      if (Array.isArray(maybeArrOrObj)) {
        const map = {};
        maybeArrOrObj.forEach((item) => {
          if (!item) return;
          if (type === "error") {
            const code = (item.error_code || item.code || "").toString();
            if (code) map[code.toUpperCase()] = item.error_message || item.message || "";
          } else if (type === "validation") {
            const code = (item.validation_code || "").toString();
            if (code) map[code.toUpperCase()] = item.validation_message || "";
          } else if (type === "info") {
            const code = (item.information_code || "").toString();
            if (code) map[code.toUpperCase()] = item.information_text || "";
          }
        });
        return map;
      }

      // If it's an object map already, normalize keys to uppercase and values to string
      if (typeof maybeArrOrObj === "object") {
        const map = {};
        Object.keys(maybeArrOrObj).forEach((k) => {
          const val = maybeArrOrObj[k];
          // If val is object with text prop, try to extract
          if (typeof val === "object" && val !== null) {
            // common names
            map[k.toUpperCase()] = val.error_message || val.information_text || val.validation_message || String(val) || "";
          } else {
            map[k.toUpperCase()] = String(val || "");
          }
        });
        return map;
      }
      return {};
    } catch {
      return {};
    }
  };

  // Load messages (from localStorage if present else from backend)
  useEffect(() => {
    const loadMessages = async () => {
      try {
        // Try to read stored raw JSON first
        const rawError = JSON.parse(localStorage.getItem("user_error") || "null");
        const rawInfo = JSON.parse(localStorage.getItem("user_information") || "null");
        const rawVal = JSON.parse(localStorage.getItem("user_validation") || "null");

        if (rawError || rawInfo || rawVal) {
          // Normalize whatever we have
          const eMap = normalize(rawError, "error");
          const iMap = normalize(rawInfo, "info");
          const vMap = normalize(rawVal, "validation");
          setMsgTables({ user_error: eMap, user_information: iMap, user_validation: vMap });
          return;
        }

        // Fetch from backend and normalize to maps
        const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const eMap = normalize(data.user_error, "error");
        const iMap = normalize(data.user_information, "info");
        const vMap = normalize(data.user_validation, "validation");

        // persist raw arrays/objects for future loads (we store the original backend payload)
        localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
        localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
        localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));

        setMsgTables({ user_error: eMap, user_information: iMap, user_validation: vMap });
      } catch (err) {
        console.error("❌ Failed to load message tables:", err);
        // set empty maps (safe)
        setMsgTables({ user_error: {}, user_information: {}, user_validation: {} });
      }
    };

    loadMessages();
  }, []);

  // Getters: return text or empty string
  const getErrorText = (code) => {
    if (!code) return "";
    return msgTables.user_error[(code || "").toUpperCase()] || "";
  };

  const getInfoText = (code) => {
    if (!code) return "";
    return msgTables.user_information[(code || "").toUpperCase()] || "";
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      // Attempt to parse JSON safely
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Prefer a code from backend (data.code). If missing, use fallback code.
        const errCode = (data.code && String(data.code)) || FALLBACK_CODES.LOGIN_FAILED;
        const errText = getErrorText(errCode) || ""; // might be empty
        // If backend also provided 'message' field with text, prefer that
        const finalMsg = data.message || errText || ""; // intentionally not a literal text
        setMessage(finalMsg || ""); // if still empty, show nothing (or show code if you want)
        setMessageType("error");
        return;
      }

      // Success
      const infoCode = (data.code && String(data.code)) || FALLBACK_CODES.LOGIN_SUCCESS;
      const infoText = getInfoText(infoCode) || data.message || "";
      setMessage(infoText);
      setMessageType("success");

      // Save tokens & user
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

      // Post-login navigation (admin vs user)
      setTimeout(async () => {
        if (data.is_admin) {
          navigate("/admin/dashboard", { replace: true });
          return;
        }

        // Check address presence
        try {
          const addressRes = await fetch("http://127.0.0.1:8000/api/addresses/check_address/", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (!addressRes.ok) {
            // Couldn't check: route to addresses as safe default
            navigate("/addresses", { replace: true });
            return;
          }

          const addressData = await addressRes.json().catch(() => ({}));
          if (addressData.has_address) navigate("/profile", { replace: true });
          else navigate("/addresses", { replace: true });
        } catch (err) {
          console.error("❌ Error checking address:", err);
          navigate("/addresses", { replace: true });
        }
      }, 900);
    } catch (err) {
      console.error("❌ Login error:", err);
      // fallback server error code text if available
      const fallback = getErrorText(FALLBACK_CODES.SERVER_ERROR) || "";
      setMessage(fallback || "");
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

          {/* Dynamic DB message (no hard-coded user-facing text in code) */}
          {message && (
            <p className={`login-message ${messageType === "error" ? "error-text" : "success-text"}`}>
              {message}
            </p>
          )}

          <button className="login-button" type="submit">
            Login
          </button>
        </form>

        <div className="login-links">
          <p><Link to="/forgot-password">Forgot password?</Link></p>
          <p>Don’t have an account? <Link to="/register">Register</Link></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
