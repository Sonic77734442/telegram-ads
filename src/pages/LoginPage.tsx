import { supabase } from "../supabaseClient";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bcrypt from "bcryptjs";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", email)
        .maybeSingle();

      // если по username нет, пробуем email (если есть колонка)
      if ((!data || error) && !data?.username) {
        const { data: byEmail } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .maybeSingle();
        data = byEmail;
      }

      if (!data) {
        alert("Неверный логин или пароль");
        return;
      }

      const passwordMatch = await bcrypt.compare(password, data.password_hash);
      if (!passwordMatch) {
        alert("Неверный логин или пароль");
        return;
      }

      localStorage.setItem("role", data.role);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem(
        "agency_id",
        data.role === "agency" ? data.user_id : data.agency_id ?? ""
      );
      localStorage.setItem("auth", "1");
      localStorage.setItem(
        "markup",
        data.role === "client" ? data.agency_markup?.toString() || "0" : "0"
      );

      console.log("✅ Авторизация успешна:");

      if (data.role === "admin") navigate("/admin");
      else navigate("/");
    } catch (e) {
      console.error("❌ Ошибка входа:", e);
      alert("Ошибка при входе. Проверь консоль.");
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
