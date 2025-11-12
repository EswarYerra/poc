// frontend/src/pages/EditProfilePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./EditProfilePage.css";

// ✅ Universal fallback: fetch message from backend constants if DB doesn't have it
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


function EditProfilePage() {
  const [user, setUser] = useState({
    username: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    role: "User",
    is_active: true,
    date_joined: "",
  });

  const [address, setAddress] = useState({
    id: null,
    house_flat: "",
    street: "",
    landmark: "",
    area: "",
    district: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
  });

  const [tables, setTables] = useState({
    user_error: [],
    user_validation: [],
    user_information: [],
  });

  const [errors, setErrors] = useState({}); // field -> message
  const [successMsg, setSuccessMsg] = useState("");
  const [loadingPinLookup, setLoadingPinLookup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const token = localStorage.getItem("access");
  const navigate = useNavigate();
  const { userId } = useParams();
  const isAdminView = !!userId;

  // ---------- Helpers to read DB messages ----------
  // ✅ Message fetchers with backend fallback
const getErrorText = async (code) => {
  if (!Array.isArray(tables.user_error)) {
    return await fetchBackendMessage(code, "error");
  }
  const e = tables.user_error.find(
    (x) => (x.error_code || "").toUpperCase() === (code || "").toUpperCase()
  );
  return e?.error_message || (await fetchBackendMessage(code, "error"));
};

const getValidationText = async (code) => {
  if (!Array.isArray(tables.user_validation)) {
    return await fetchBackendMessage(code, "validation");
  }
  const v = tables.user_validation.find(
    (x) => (x.validation_code || "").toUpperCase() === (code || "").toUpperCase()
  );
  return v?.validation_message || (await fetchBackendMessage(code, "validation"));
};

const getInfoText = async (code) => {
  if (!Array.isArray(tables.user_information)) {
    return await fetchBackendMessage(code, "information");
  }
  const i = tables.user_information.find(
    (x) => (x.information_code || "").toUpperCase() === (code || "").toUpperCase()
  );
  return i?.information_text || (await fetchBackendMessage(code, "information"));
};

  // ---------- Load message tables (cached or backend) ----------
  useEffect(() => {
    const loadTables = async () => {
      try {
        const e = JSON.parse(localStorage.getItem("user_error") || "[]");
        const v = JSON.parse(localStorage.getItem("user_validation") || "[]");
        const i = JSON.parse(localStorage.getItem("user_information") || "[]");

        if (Array.isArray(e) && Array.isArray(v) && Array.isArray(i) && (e.length || v.length || i.length)) {
          setTables({ user_error: e, user_validation: v, user_information: i });
        } else {
          const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
          if (res.ok) {
            const data = await res.json();
            setTables({
              user_error: Array.isArray(data.user_error) ? data.user_error : [],
              user_validation: Array.isArray(data.user_validation) ? data.user_validation : [],
              user_information: Array.isArray(data.user_information) ? data.user_information : [],
            });
            localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
            localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
            localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
          } else {
            // leave default empty arrays
            console.warn("Failed to fetch messages table:", res.status);
          }
        }
      } catch (err) {
        console.error("Failed to load message tables:", err);
      }
    };
    loadTables();
  }, []);

  // ---------- Load profile and address (edit mode) ----------
  useEffect(() => {
    const fetchProfileAndAddress = async () => {
      if (!token) {
        // not logged in - redirect to login
        navigate("/login");
        return;
      }

      setLoadingData(true);
      try {
        // fetch profile
        const userUrl = isAdminView
          ? `http://127.0.0.1:8000/api/viewprofile/admin/users/${userId}/`
          : "http://127.0.0.1:8000/api/auth/profile/";

        const userRes = await fetch(userUrl, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser((prev) => ({
            ...prev,
            username: userData.username || "",
            first_name: userData.first_name || "",
            last_name: userData.last_name || "",
            phone: userData.phone || "",
            email: userData.email || "",
            role: userData.role || "User",
            is_active: typeof userData.is_active === "boolean" ? userData.is_active : prev.is_active,
            date_joined: userData.date_joined || prev.date_joined,
          }));
        } else {
          console.warn("Failed to fetch profile:", userRes.status);
        }

        // fetch address. try /me/ first (preferred), fallback to list endpoint
        let addrRes = await fetch("http://127.0.0.1:8000/api/addresses/me/", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });

        if (!addrRes.ok) {
          // fallback: list endpoint (admin uses ?user=)
          const addrUrl = isAdminView
            ? `http://127.0.0.1:8000/api/addresses/?user=${userId}`
            : "http://127.0.0.1:8000/api/addresses/";
          addrRes = await fetch(addrUrl, {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          });
        }

        if (addrRes.ok) {
          const addrData = await addrRes.json();
          if (Array.isArray(addrData) && addrData.length > 0) {
            const a = addrData[0];
            setAddress((prev) => ({
              ...prev,
              id: a.id || null,
              house_flat: a.house_flat || "",
              street: a.street || "",
              landmark: a.landmark || "",
              area: a.area || "",
              district: a.district || "",
              city: a.city || "",
              state: a.state || "",
              postal_code: a.postal_code || "",
              country: a.country || "India",
            }));
          } else if (addrData && typeof addrData === "object" && Object.keys(addrData).length) {
            setAddress((prev) => ({
              ...prev,
              id: addrData.id || null,
              house_flat: addrData.house_flat || "",
              street: addrData.street || "",
              landmark: addrData.landmark || "",
              area: addrData.area || "",
              district: addrData.district || "",
              city: addrData.city || "",
              state: addrData.state || "",
              postal_code: addrData.postal_code || "",
              country: addrData.country || "India",
            }));
          } else {
            // no existing address - keep add mode (id=null)
          }
        } else {
          console.info("Address fetch returned not ok:", addrRes.status);
        }
      } catch (err) {
        console.error("Error loading profile/address:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchProfileAndAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId, navigate, isAdminView]);

  // ---------- Validation rules ----------
  const NAME_RE = /^[A-Za-z\s]+$/;
  const USERNAME_RE = /^[A-Za-z0-9_]+$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[0-9]{10}$/;
  const ALNUM_SPACE_HYPHEN = /^[A-Za-z0-9\s-]+$/;
  const ALNUM_ONLY = /^[A-Za-z0-9]+$/;

  const validatePersonalField = async (name, val) => {
  let msg = "";
  const v = String(val || "").trim();

  if (!v) {
    msg = await getValidationText("VA002");
  } else if ((name === "first_name" || name === "last_name") && !NAME_RE.test(v)) {
    msg = await getValidationText("VA001");
  } else if (name === "username" && !USERNAME_RE.test(v)) {
    msg = await getValidationText("VA003");
  } else if (name === "email" && !EMAIL_RE.test(v)) {
    msg = await getValidationText("VA005");
  } else if (name === "phone" && !PHONE_RE.test(v)) {
    msg = await getValidationText("VA007");
  }

  setErrors((p) => ({ ...p, [name]: msg }));
  return !msg;
};


  const validateAddressField = async (name, val) => {
  let msg = "";
  const v = String(val || "");

  if (name === "landmark") {
    if (v && !ALNUM_SPACE_HYPHEN.test(v)) msg = await getErrorText("EA003");
  } else if (name === "postal_code") {
    if (!v.trim()) msg = await getErrorText("EA008");
    else if (!ALNUM_ONLY.test(v)) msg = await getErrorText("EA005");
    else if (v.length < 4 || v.length > 10) msg = await getErrorText("EA006");
  } else {
    if (!v.trim()) msg = await getErrorText("EA004");
    else if (!ALNUM_SPACE_HYPHEN.test(v)) msg = await getErrorText("EA003");
  }

  setErrors((p) => ({ ...p, [name]: msg }));
  return !msg;
};


  // ---------- Postal lookup ----------
const lookupPostalCode = (postalCodeValue, countryValue) => {
  (async () => {
    try {
      setLoadingPinLookup(true);

      // 🧠 Case 1: too short or empty postal code
      if (!postalCodeValue || postalCodeValue.length < 4) {
        const msg = await getErrorText("EA006");
        setErrors((p) => ({ ...p, postal_code: msg }));
        return;
      }

      // 🇮🇳 Case 2: Try India Post API first
      if ((countryValue || "India") === "India") {
        const indiaRes = await fetch(`https://api.postalpincode.in/pincode/${postalCodeValue}`);
        const indiaData = await indiaRes.json();

        if (Array.isArray(indiaData) && indiaData[0]?.Status === "Success") {
          const info = indiaData[0]?.PostOffice?.[0];
          if (info) {
            setAddress((prev) => ({
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
      }

      // 🌍 Case 3: Fallback to Zippopotam.us API
      const res = await fetch(`https://api.zippopotam.us/${(countryValue || "us").toLowerCase()}/${postalCodeValue}`);

      if (!res.ok) {
        // 404 or network issue — invalid pin
        const msg = await getErrorText("EA007");
        setErrors((p) => ({ ...p, postal_code: msg }));
        return;
      }

      const data = await res.json();
      const place = data.places?.[0];

      if (place) {
        // ✅ valid pin found
        setAddress((prev) => ({
          ...prev,
          city: place["place name"] || prev.city,
          state: place["state"] || prev.state,
          country: data["country"] || prev.country,
        }));
        setErrors((p) => ({ ...p, postal_code: "" }));
      } else {
        // ❌ pin code not recognized even after success
        const msg = await getErrorText("EA006");
        setErrors((p) => ({ ...p, postal_code: msg }));
      }
    } catch (err) {
      console.error("Postal lookup failed:", err);
      const msg = await getErrorText("EA007");
      setErrors((p) => ({ ...p, postal_code: msg }));
    } finally {
      setLoadingPinLookup(false);
    }
  })();
};

  // ---------- Handlers ----------
  const handleChangeUser = async (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    if (["first_name", "last_name", "username", "email", "phone"].includes(name)) {
      await validatePersonalField(name, value);
      
    }
  };

  const handleChangeAddress = async  (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
    if (name === "postal_code") {
      await validateAddressField(name, value);
      if (value.length >= 5) lookupPostalCode(value, address.country);
    } else {
      await validateAddressField(name, value);
    }
  };

  const validateAll = async () => {
  const personalFields = ["username", "first_name", "last_name", "phone", "email"];
  const addrFields = ["house_flat", "street", "area", "district", "city", "state", "postal_code", "country"];

  const personalChecks = await Promise.all(personalFields.map((f) => validatePersonalField(f, user[f])));
  const addrChecks = await Promise.all(addrFields.map((f) => validateAddressField(f, address[f])));

  return [...personalChecks, ...addrChecks].every(Boolean);
};


  // ---------- Save (PUT profile, then create/update address) ----------
  const handleSave = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrors({});
    if (!(await validateAll())) return;

    setSaving(true);
    try {
      const userUrl = isAdminView
        ? `http://127.0.0.1:8000/api/viewprofile/admin/users/${userId}/`
        : "http://127.0.0.1:8000/api/auth/profile/";

      const userRes = await fetch(userUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(user),
      });

      if (!userRes.ok) {
        // try parse response — could be validation dict
        let data = {};
        try {
          data = await userRes.json();
        } catch {
          // fallback generic error
          setErrors((p) => ({ ...p, general: "Failed to update profile." }));
          setSaving(false);
          return;
        }

        // Map backend responses to field errors (common patterns)
        const newErrs = {};
        // backend might return: { username: ["..."], email: ["..."] } or {detail: "..."} or code keys
        if (data.username) {
          newErrs.username = Array.isArray(data.username) ? String(data.username[0]) : String(data.username);
        }
        if (data.email) {
          newErrs.email = Array.isArray(data.email) ? String(data.email[0]) : String(data.email);
        }
        // if backend returned a code key or custom code string, map EP016/ES003 -> friendly text
        // Sometimes backend returns { code: "EP016" } or { detail: "EP016" } or string code inside.
        if (typeof data === "string" && (data.includes("EP016") || data.includes("ES003"))) {
          if (data.includes("EP016")) newErrs.username = getErrorText("EP016") || "Username already exists.";
          if (data.includes("ES003")) newErrs.email = getErrorText("ES003") || "Email already exists.";
        } else {
          // check inside object values for codes
          Object.values(data).forEach((val) => {
            if (typeof val === "string" && val.includes("EP016")) newErrs.username = getErrorText("EP016") || "Username already exists.";
            if (typeof val === "string" && val.includes("ES003")) newErrs.email = getErrorText("ES003") || "Email already exists.";
          });
        }

        // If still no mapped field but there is 'detail' -> set general
        if (Object.keys(newErrs).length === 0) {
          if (data.detail) newErrs.general = String(data.detail);
          else newErrs.general = "Failed to update profile. Check input.";
        }

        setErrors((p) => ({ ...p, ...newErrs }));
        setSaving(false);
        return;
      }

      // Profile updated ok -> save address
      const addrUrl = address.id
        ? `http://127.0.0.1:8000/api/addresses/${address.id}/`
        : "http://127.0.0.1:8000/api/addresses/";
      const method = address.id ? "PUT" : "POST";

      const payload = { ...address };
      // if admin creating new address attach user param
      if (!address.id && isAdminView) payload.user = userId;

      const addrRes = await fetch(addrUrl, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!addrRes.ok) {
        let data = {};
        try {
          data = await addrRes.json();
        } catch {
          setErrors((p) => ({ ...p, general: "Failed to save address." }));
          setSaving(false);
          return;
        }
        // map backend field errors into errors object
        const newErrs = {};
        if (data && typeof data === "object") {
          Object.keys(data).forEach((k) => {
            newErrs[k] = Array.isArray(data[k]) ? String(data[k][0]) : String(data[k]);
          });
        } else if (data.detail) {
          newErrs.general = String(data.detail);
        } else {
          newErrs.general = "Failed to save address.";
        }
        setErrors((p) => ({ ...p, ...newErrs }));
        setSaving(false);
        return;
      }

      // Success
      const infoCode = address.id ? "IA004" : "IA001";
      const infoMsg = (await getInfoText(infoCode)) || (address.id ? "Address updated successfully." : "Address added successfully.");
      setSuccessMsg(infoMsg);

      // short delay then navigate back
      setTimeout(() => {
        if (isAdminView) navigate("/admin/dashboard");
        else navigate("/profile");
      }, 1500);
    } catch (err) {
      console.error("Error saving:", err);
      setErrors((p) => ({ ...p, general: "Unexpected error while saving. See console." }));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isAdminView) navigate("/admin/dashboard");
    else navigate("/profile");
  };

  // 🔹 inside your component (EditProfilePage, AddressPage, etc.)

const handleLogout = async () => {
  try {
    // 1️⃣ Reconnect to DB and fetch latest message tables
    const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
    if (res.ok) {
      const data = await res.json();

      // ✅ store updated tables in localStorage cache
      localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
      localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
      localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
      console.log("✅ Refreshed system messages from database on logout.");
    } else {
      console.warn("⚠️ Could not refresh message tables. Server responded:", res.status);
    }
  } catch (err) {
    console.error("⚠️ Failed to fetch message tables on logout:", err);
  }

  // 2️⃣ Clear sensitive user/session data
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");

  // ✅ Optional: clear cache to avoid stale messages (only if you want total wipe)
  // localStorage.removeItem("user_error");
  // localStorage.removeItem("user_validation");
  // localStorage.removeItem("user_information");

  // 3️⃣ Redirect to login
  navigate("/login");
};


  // ---------- Render ----------
  // while loading initial data show only header / skeleton (keeps layout predictable)
  return (
    <div className="edit-profile-page">
      <div className="edit-profile-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{isAdminView ? `Edit User: ${user.username || ""}` : "Edit Profile"}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="edit-profile-content">
        <form onSubmit={handleSave} noValidate>
          {/* Account Information */}
          <div className="edit-profile-card">
            <h3 className="edit-subsection-title">Account Information</h3>
            <div className="edit-form-grid">
              <div className="edit-form-group">
                <label>Role</label>
                {isAdminView ? (
                  <select name="role" value={user.role} onChange={(e) => setUser((p) => ({ ...p, role: e.target.value }))}>
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                ) : (
                  <input readOnly value={user.role} />
                )}
                {errors.role && <div className="alert-box alert-error">{errors.role}</div>}
              </div>

              <div className="edit-form-group">
                <label>Status</label>
                {isAdminView ? (
                  <select name="is_active" value={user.is_active ? "Active" : "Inactive"} onChange={(e) => setUser((p) => ({ ...p, is_active: e.target.value === "Active" }))}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                ) : (
                  <input readOnly value={user.is_active ? "Active" : "Inactive"} />
                )}
                {errors.is_active && <div className="alert-box alert-error">{errors.is_active}</div>}
              </div>

              <div className="edit-form-group">
                <label>Date Joined</label>
                <input readOnly value={user.date_joined ? new Date(user.date_joined).toLocaleDateString() : ""} />
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="edit-profile-card">
            <h3 className="edit-subsection-title">Personal Details</h3>
            <div className="edit-form-grid">
              <div className="edit-form-group">
                <label>Username</label>
                <input type="text" name="username" value={user.username} onChange={handleChangeUser} />
                {errors.username && <div className="alert-box alert-error">{errors.username}</div>}
              </div>

              <div className="edit-form-group">
                <label>FIRST NAME</label>
                <input type="text" name="first_name" value={user.first_name} onChange={handleChangeUser} />
                {errors.first_name && <div className="alert-box alert-error">{errors.first_name}</div>}
              </div>

              <div className="edit-form-group">
                <label>LAST NAME</label>
                <input type="text" name="last_name" value={user.last_name} onChange={handleChangeUser} />
                {errors.last_name && <div className="alert-box alert-error">{errors.last_name}</div>}
              </div>

              <div className="edit-form-group">
                <label>PHONE</label>
                <input type="text" name="phone" value={user.phone} onChange={handleChangeUser} />
                {errors.phone && <div className="alert-box alert-error">{errors.phone}</div>}
              </div>

              <div className="edit-form-group">
                <label>EMAIL</label>
                <input type="text" name="email" value={user.email} onChange={handleChangeUser} />
                {errors.email && <div className="alert-box alert-error">{errors.email}</div>}
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div className="edit-profile-card">
            <h3 className="edit-subsection-title">Address Details</h3>
            <div className="edit-form-grid">
              {[
                { key: "house_flat", label: "House / Flat No." },
                { key: "street", label: "Street" },
                { key: "landmark", label: "Landmark (optional)" },
                { key: "area", label: "Area" },
                { key: "district", label: "District" },
                { key: "city", label: "City / Town" },
                { key: "state", label: "State" },
                { key: "postal_code", label: "Pincode" },
                { key: "country", label: "Country" },
              ].map((f) => (
                <div className="edit-form-group" key={f.key}>
                  <label>
                    {f.label}
                    {f.key === "postal_code" && loadingPinLookup && (
                      <span style={{ marginLeft: 8, color: "#888", fontSize: "0.9em" }}>(Fetching…)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name={f.key}
                    value={address[f.key] || ""}
                    onChange={handleChangeAddress}
                    onBlur={(e) => validateAddressField(f.key, e.target.value)}
                  />
                  {errors[f.key] && <div className="alert-box alert-error">{errors[f.key]}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* general errors */}
          {errors.general && <div className="alert-box alert-error" style={{ marginTop: 12 }}>{errors.general}</div>}

          {/* success message above buttons */}
          {successMsg && <div className="alert-box alert-success" style={{ marginTop: 12 }}>{successMsg}</div>}

          {/* action buttons */}
          <div className="action-buttons" style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
            <button type="button" className="cancel-btn" onClick={handleCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfilePage;
