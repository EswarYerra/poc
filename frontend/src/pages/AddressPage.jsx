import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./AddressPage.css";

/*
  AddressPage (robust)
  - Reads message tables from localStorage (populated by /api/auth/messages/)
  - Supports both array-of-objects and object-mapping shapes
  - Validates on blur and when user presses Enter
  - Shows error strings from message tables by code (EA003, EA004, EA005, EA006, EA007, EA008, IA001, IA002, IA006)
  - If code missing, shows "[MISSING: CODE]" as visible indicator and logs to console (so backend constants can be updated)
*/

export default function AddressPage() {
  const [form, setForm] = useState({
    id: null,
    house_flat: "",
    street: "",
    landmark: "",
    area: "",
    district: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  const [tables, setTables] = useState({
    user_error: null, // could be array or object
    user_validation: null,
    user_information: null,
  });

  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refs = useRef({});
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // --- message table loader (robust)
  useEffect(() => {
    const loadTables = async () => {
      try {
        // read whatever is in localStorage (could be object map or array)
        const rawErr = localStorage.getItem("user_error");
        const rawVal = localStorage.getItem("user_validation");
        const rawInfo = localStorage.getItem("user_information");

        const parsedErr = rawErr ? JSON.parse(rawErr) : null;
        const parsedVal = rawVal ? JSON.parse(rawVal) : null;
        const parsedInfo = rawInfo ? JSON.parse(rawInfo) : null;

        // if we already have reasonable data, set it
        if (
          (parsedErr && (Array.isArray(parsedErr) || typeof parsedErr === "object")) &&
          (parsedVal && (Array.isArray(parsedVal) || typeof parsedVal === "object")) &&
          (parsedInfo && (Array.isArray(parsedInfo) || typeof parsedInfo === "object"))
        ) {
          setTables({
            user_error: parsedErr,
            user_validation: parsedVal,
            user_information: parsedInfo,
          });
          // still proceed to refresh in background? NO — keep simple
          return;
        }

        // fetch from backend
        const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Data shape might be arrays of objects OR objects mapping codes -> message
        // Save to localStorage and state exactly as returned (we handle both shapes)
        localStorage.setItem("user_error", JSON.stringify(data.user_error || {}));
        localStorage.setItem("user_validation", JSON.stringify(data.user_validation || {}));
        localStorage.setItem("user_information", JSON.stringify(data.user_information || {}));

        setTables({
          user_error: data.user_error || {},
          user_validation: data.user_validation || {},
          user_information: data.user_information || {},
        });
      } catch (err) {
        console.error("Failed to load message tables:", err);
        // Leave tables null -> getMessage will still provide a visible fallback
      }
    };

    loadTables();
  }, []);

  // --- load existing address (edit)
  useEffect(() => {
    const loadAddress = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/addresses/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setForm((prev) => ({ ...prev, ...data, id: data.id }));
        }
      } catch (err) {
        console.error("Failed to load address:", err);
      }
    };
    if (token) loadAddress();
  }, [token]);

  // --- message lookup helper (handles array-of-objects or code->text objects)
  const lookupFromTable = (table, code, codeFieldName, textFieldName) => {
    try {
      if (!table) return null;

      // if table is object mapping like { "EA003": "Invalid characters." }
      if (!Array.isArray(table) && typeof table === "object") {
        const v = table[code];
        return v || null;
      }

      // if table is an array of objects like [{error_code, error_message}, ...]
      if (Array.isArray(table)) {
        const found = table.find((x) => {
          const c = (x[codeFieldName] || "").toString().toUpperCase();
          return c === (code || "").toString().toUpperCase();
        });
        if (found) return found[textFieldName] || null;
      }

      return null;
    } catch (err) {
      console.error("lookupFromTable error:", err);
      return null;
    }
  };

  const getErrorText = (code) => {
    const txt =
      lookupFromTable(tables.user_error, code, "error_code", "error_message") ||
      lookupFromTable(tables.user_error, code, "code", "message"); // try common alt keys
    if (txt) return txt;
    console.warn(`Message code not found in user_error: ${code}`);
    return `[MISSING: ${code}]`; // visible diagnostic to frontend
  };

  const getValidationText = (code) => {
    const txt =
      lookupFromTable(tables.user_validation, code, "validation_code", "validation_message") ||
      lookupFromTable(tables.user_validation, code, "code", "message");
    if (txt) return txt;
    console.warn(`Message code not found in user_validation: ${code}`);
    return `[MISSING: ${code}]`;
  };

  const getInfoText = (code) => {
    const txt =
      lookupFromTable(tables.user_information, code, "information_code", "information_text") ||
      lookupFromTable(tables.user_information, code, "code", "message");
    if (txt) return txt;
    console.warn(`Message code not found in user_information: ${code}`);
    return `[MISSING: ${code}]`;
  };

  // --- validation regexes
  const ALNUM_SPACE_HYPHEN = /^[A-Za-z0-9\s-]+$/;
  const ALNUM_ONLY = /^[A-Za-z0-9]+$/;

  // Validate a single field and set error message using codes only
  const validateField = (name, value) => {
    let msgCode = null;

    if (name === "landmark") {
      if (value && !ALNUM_SPACE_HYPHEN.test(value)) msgCode = "EA003"; // invalid chars
      setErrors((p) => ({ ...p, [name]: msgCode ? getErrorText(msgCode) : "" }));
      return !msgCode;
    }

    if (name === "postal_code") {
      if (!value || !value.toString().trim()) msgCode = "EA008";
      else if (!ALNUM_ONLY.test(value)) msgCode = "EA005";
      else if (value.length < 4 || value.length > 10) msgCode = "EA006";
      setErrors((p) => ({ ...p, [name]: msgCode ? getErrorText(msgCode) : "" }));
      return !msgCode;
    }

    // other required fields (area, street, house_flat, district, city, state, country)
    if (!value || !value.toString().trim()) {
      msgCode = "EA004";
    } else if (!ALNUM_SPACE_HYPHEN.test(value)) {
      msgCode = "EA003";
    }

    setErrors((p) => ({ ...p, [name]: msgCode ? getErrorText(msgCode) : "" }));
    return !msgCode;
  };

  // On Enter: validate this field; if valid then move focus to next field
  const handleEnter = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const ok = validateField(field, form[field]);
      if (!ok) return;
      const fields = Object.keys(form).filter((f) => f !== "id");
      const idx = fields.indexOf(field);
      const next = fields[idx + 1];
      if (next && refs.current[next]) refs.current[next].focus();
    }
  };

  // Postal code change + auto-fill (same as your earlier logic)
  const handlePostalCodeChange = async (e) => {
    const postal_code = e.target.value;
    setForm((prev) => ({ ...prev, postal_code }));
    validateField("postal_code", postal_code);

    if (!postal_code || postal_code.length < 5) return;

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${postal_code}`);
      const data = await res.json();
      if (data && Array.isArray(data) && data[0]?.Status === "Success") {
        const info = data[0].PostOffice?.[0];
        if (info) {
          setForm((prev) => ({
            ...prev,
            district: info.District || prev.district,
            city: info.Block || info.Name || prev.city,
            state: info.State || prev.state,
            country: "India",
          }));
          setErrors((p) => ({ ...p, postal_code: "" }));
          return;
        }
      }
      // non-success: show EA007 (invalid pin) or EA013 (postal lookup fail)
      setErrors((p) => ({ ...p, postal_code: getErrorText("EA007") }));
    } catch (err) {
      console.error("Postal lookup failed:", err);
      setErrors((p) => ({ ...p, postal_code: getErrorText("EA013") || getErrorText("EA014") }));
    }
  };

  const validateAll = () => {
    const fields = Object.keys(form).filter((f) => f !== "id");
    let ok = true;
    fields.forEach((f) => {
      if (!validateField(f, form[f])) ok = false;
    });
    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    setSubmitting(true);
    setSuccessMsg("");
    setErrors({});

    try {
      const url = form.id ? `http://127.0.0.1:8000/api/addresses/${form.id}/` : "http://127.0.0.1:8000/api/addresses/";
      const res = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const infoCode = form.id ? "IA002" : "IA001";
        const txt = getInfoText(infoCode);
        setSuccessMsg(txt);
        // short delay to let user see success
        setTimeout(() => navigate("/profile", { replace: true }), 1300);
        return;
      }

      // If backend returned field-level errors, parse and map them
      let backend = {};
      try {
        backend = await res.json();
      } catch (_) {
        // not JSON
      }
      if (backend && typeof backend === "object" && Object.keys(backend).length) {
        // map backend fields (idiosyncratic mapping allowed)
        const newErrors = {};
        Object.keys(backend).forEach((k) => {
          // backend might return keyed messages arrays like { "street": ["can't be blank"] }
          const v = Array.isArray(backend[k]) ? String(backend[k][0]) : String(backend[k]);
          // try to attach to closest field
          newErrors[k] = v;
        });
        setErrors((p) => ({ ...p, ...newErrors }));
      } else {
        setErrors({ general: getErrorText("EA011") }); // EA011 = Unable to save address. Please try again.
      }
    } catch (err) {
      console.error("Error saving address:", err);
      setErrors({ general: getErrorText("EA012") }); // EA012 = Unexpected error while saving address.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="address-page">
      <div className="address-container">
        <h2 className="address-title">{form.id ? getInfoText("IA004") : getInfoText("IA005")}</h2>

        <form onSubmit={handleSubmit} className="address-form" noValidate>
          {[
            { label: "House / Flat No.", name: "house_flat" },
            { label: "Street", name: "street" },
            { label: "Landmark (optional)", name: "landmark" },
            { label: "Area", name: "area" },
            { label: "District", name: "district" },
            { label: "City / Town", name: "city" },
            { label: "State", name: "state" },
            { label: "Country", name: "country" },
            { label: "Pincode", name: "postal_code" },
          ].map((f) => (
            <div key={f.name} className="address-form-group">
              <label>{f.label}</label>
              <input
                ref={(el) => (refs.current[f.name] = el)}
                type="text"
                value={form[f.name] || ""}
                onChange={(e) =>
                  f.name === "postal_code" ? handlePostalCodeChange(e) : setForm((p) => ({ ...p, [f.name]: e.target.value }))
                }
                onBlur={(e) => validateField(f.name, e.target.value)}
                onKeyDown={(e) => handleEnter(e, f.name)}
                required={!["landmark"].includes(f.name)}
              />
              {errors[f.name] && <div className="alert-box alert-error">{errors[f.name]}</div>}
            </div>
          ))}

          {errors.general && <div className="alert-box alert-error">{errors.general}</div>}

          {successMsg && (
            <div className="alert-box alert-success address-success-alert" role="status" aria-live="polite">
              {successMsg}
            </div>
          )}

          <button type="submit" className="address-button" disabled={submitting}>
            {submitting ? getInfoText("IA006") || "[MISSING: IA006]" : form.id ? getInfoText("IA002") || "[MISSING: IA002]" : getInfoText("IA001") || "[MISSING: IA001]"}
          </button>
        </form>
      </div>
    </div>
  );
}
