import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const resp = await fetch("/api/auth-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const isJson = resp.headers
        .get("content-type")
        ?.includes("application/json");
      const json = isJson ? await resp.json() : null;

      if (!resp.ok || (json && json.error)) {
        const message =
          (json && json.error) ||
          `Login failed (${resp.status} ${resp.statusText})`;
        alert(message);
        return;
      }

      const data = json?.user;

      localStorage.setItem("role", data?.role || "");
      localStorage.setItem("user_id", data?.user_id || "");
      localStorage.setItem(
        "agency_id",
        data?.role === "agency" ? data?.user_id : data?.agency_id ?? ""
      );
      localStorage.setItem("auth", "1");
      localStorage.setItem(
        "markup",
        data?.role === "client" ? data?.agency_markup?.toString() || "0" : "0"
      );

      if (data?.role === "admin") navigate("/admin");
      else navigate("/");
    } catch (e) {
      console.error("auth-login failed:", e);
      alert("Login failed. See console for details.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded shadow-md w-[320px] space-y-4"
      >
        <h2 className="text-xl font-semibold text-center">Login</h2>

        <input
          type="text"
          placeholder="Username or Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
