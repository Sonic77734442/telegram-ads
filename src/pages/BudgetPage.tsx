import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Container from "../components/Container";
import { fetchAccountBalance } from "../lib/campaignApi";

export default function BudgetPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState("");
  const refresh = async () => {
    try {
      const account = await fetchAccountBalance();
      setBalance(account.balance);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось загрузить баланс.");
    }
  };
  useEffect(() => {
    void refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  return <>
    <Header />
    <Container>
      <h1 className="mt-8 text-xl font-semibold">Account budget</h1>
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
      <p className="my-6 text-3xl">{balance === null ? "Loading…" : `€${balance.toFixed(2)}`}</p>
      <p>To top up your account, contact your agency manager.</p>
      <p className="mt-2">To adjust an ad budget or daily limit, use the ad menu on the dashboard.</p>
      <div className="mt-6 flex gap-6 text-blue-600">
        <button type="button" onClick={refresh}>Refresh balance</button>
        <Link to="/">Back to ads</Link>
      </div>
    </Container>
  </>;
}
