import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from '../components/Header';
import BudgetBar from '../components/BudgetBar';
import AdTable from '../components/AdTable';

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("auth") !== "1") {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="font-sans">
      <Header />
      <BudgetBar />
      <AdTable />
    </div>
  );
};

export default Dashboard;
