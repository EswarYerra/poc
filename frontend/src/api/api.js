// frontend/src/api/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/auth/",
  headers: { "Content-Type": "application/json" },
});

// ✅ Fetch message tables (errors + info)
export async function fetchMessages() {
  const res = await API.get("messages/");
  return res.data;
}

// ✅ Login request
export async function loginUser(username, password) {
  const res = await API.post("login/", { username, password });
  return res.data;
}

export default API;
