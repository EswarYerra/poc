// ✅ messageHelper.js — universal message retriever

export const getMessageByCode = (code) => {
  if (!code) return "";

  // Read from localStorage (already JSON stringified)
  const user_error = JSON.parse(localStorage.getItem("user_error")) || {};
  const user_validation = JSON.parse(localStorage.getItem("user_validation")) || {};
  const user_information = JSON.parse(localStorage.getItem("user_information")) || {};

  // ✅ New backend format is dictionary (not array)
  if (code.startsWith("E")) {
    return user_error[code] || ""; // directly access by key
  }
  if (code.startsWith("V") || code.startsWith("VP")) {
    return user_validation[code] || "";
  }
  if (code.startsWith("I")) {
    return user_information[code] || "";
  }
  return "";
};

// Optional helper: log all available messages (for debugging)
export const showAllMessages = () => {
  const all = {
    user_error: JSON.parse(localStorage.getItem("user_error")),
    user_validation: JSON.parse(localStorage.getItem("user_validation")),
    user_information: JSON.parse(localStorage.getItem("user_information")),
  };
  console.log("📦 Cached message tables:", all);
  return all;
};
