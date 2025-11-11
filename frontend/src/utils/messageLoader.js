export async function loadMessages() {
  try {
    const e = JSON.parse(localStorage.getItem("user_error") || "[]");
    const v = JSON.parse(localStorage.getItem("user_validation") || "[]");
    const i = JSON.parse(localStorage.getItem("user_information") || "[]");

    if (e.length && v.length && i.length) {
      return { user_error: e, user_validation: v, user_information: i };
    }

    const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
    const data = await res.json();

    localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
    localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
    localStorage.setItem("user_information", JSON.stringify(data.user_information || []));

    return data;
  } catch (err) {
    console.error("Failed to load messages:", err);
    return { user_error: [], user_validation: [], user_information: [] };
  }
}

// Helper functions
export const getErrorText = (tables, code) =>
  tables.user_error?.find(e => e.error_code === code)?.error_message || "";

export const getValidationText = (tables, code) =>
  tables.user_validation?.find(v => v.validation_code === code)?.validation_message || "";

export const getInfoText = (tables, code) =>
  tables.user_information?.find(i => i.information_code === code)?.information_text || "";
