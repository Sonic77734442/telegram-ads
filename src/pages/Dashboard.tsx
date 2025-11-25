import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BudgetBar from "../components/BudgetBar";
import AdTable from "../components/AdTable";

const Dashboard = () => {
  const navigate = useNavigate();

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
      <BudgetBar />

      {/* 👉 Передаём роль в таблицу */}
      <AdTable currentRole={currentRole} />
    </div>
  );
};

export default Dashboard;
