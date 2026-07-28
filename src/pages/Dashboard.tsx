import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BudgetBar from "../components/BudgetBar";
import AdTable from "../components/AdTable";

const Dashboard = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (localStorage.getItem("auth") !== "1") {
      navigate("/login");
    }
  }, [navigate]);

  // 👉 Берём роль из localStorage
  const storedRole = localStorage.getItem("role");
  const currentRole =
    storedRole === "client" || storedRole === "agency" || storedRole === "admin"
      ? storedRole
      : "agency"; // по умолчанию агентство

  return (
    <div className="font-sans">
      <Header />
      <BudgetBar query={query} onQueryChange={setQuery} />

      {/* 👉 Передаём роль в таблицу */}
      <AdTable currentRole={currentRole} searchQuery={query} />
    </div>
  );
};

export default Dashboard;
