import React, { createContext, useEffect, useState } from "react";
import axios from "axios";

export const UserContext = createContext();

export default function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("access");
        if (token) {
          const res = await axios.get("http://127.0.0.1:8000/api/me/", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(res.data);
        }
      } catch (error) {
        console.error("User fetch failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}
