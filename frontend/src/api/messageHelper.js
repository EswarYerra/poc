// ✅ frontend/src/api/messageHelper.js — universal message retriever

export const getMessageByCode = (code) => {
  if (!code) return "";

  const safeParse = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  };

  const errors = safeParse("user_error");
  const validations = safeParse("user_validation");
  const infos = safeParse("user_information");

  // ✅ Normalize: if backend gave dictionary form, convert to array-like access
  const findMsg = (list, keyName, valName) => {
    if (!Array.isArray(list)) {
      // if it's already a dict, use direct lookup
      return list?.[code] || "";
    }
    const found = list.find(
      (item) =>
        item[keyName]?.toUpperCase?.() === code.toUpperCase()
    );
    return found ? found[valName] : "";
  };

  if (code.startsWith("E")) {
    return findMsg(errors, "error_code", "error_message") || "";
  }
  if (code.startsWith("V") || code.startsWith("VP")) {
    return findMsg(validations, "validation_code", "validation_message") || "";
  }
  if (code.startsWith("I")) {
    return findMsg(infos, "information_code", "information_text") || "";
  }
  return "";
};

// ✅ Optional: view everything in localStorage
export const showAllMessages = () => {
  const parse = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  };
  const all = {
    user_error: parse("user_error"),
    user_validation: parse("user_validation"),
    user_information: parse("user_information"),
  };
  console.log("📦 Cached message tables:", all);
  return all;
};
