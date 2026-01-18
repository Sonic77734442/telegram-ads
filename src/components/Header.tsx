import React, { useEffect, useState } from "react";
import Container from "./Container";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

const LOGO_SVG =
  "data:image/svg+xml,%3Csvg%20height%3D%2222%22%20viewBox%3D%220%200%2024%2022%22%20width%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%23119af5%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22m11.68%2015.58.31%202.6c.12.96-.57%201.83-1.54%201.94-.03.01-.06.01-.1.01l-.19.02c-1%20.06-1.94-.5-2.34-1.41l-1.46-2.88c-.12-.24-.03-.53.21-.66.07-.03.15-.05.22-.05h4.41c.24%200%20.45.19.48.43z%22%2F%3E%3Cpath%20d%3D%22m6%205.95h6.21c.27%200%20.49.22.49.49v7.02c0%20.27-.22.49-.49.49h-6.21c-2.21%200-4-1.79-4-4s1.79-4%204-4z%22%2F%3E%3Cpath%20d%3D%22m15.36%205.35%203.43-2.04c.7-.41%201.59-.18%202.01.51.13.23.2.49.2.75v10.86c0%20.81-.66%201.46-1.46%201.46-.27%200-.52-.07-.75-.2l-3.43-2.03c-.84-.5-1.36-1.41-1.36-2.39v-4.54c0-.98.52-1.89%201.36-2.38z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";

const Header = () => {
  const [totalSpend, setTotalSpend] = useState(0);
  const [balance, setBalance] = useState(0);

  const role = localStorage.getItem("role") || "client";
  const userId = localStorage.getItem("user_id") || "";
  const agencyId = localStorage.getItem("agency_id") || "";
  const [markupPercent, setMarkupPercent] = useState(0);

  useEffect(() => {
    const fetchBalance = async () => {
      if (role === "client" && userId) {
        const { data, error } = await supabase
          .from("client_balances")
          .select("balance, markup_percent")
          .eq("client_id", userId)
          .maybeSingle();

        if (!error && data) {
          const markup = parseFloat(data.markup_percent) || 0;

          // 👇 Баланс показываем БЕЗ маркапа
          setBalance(data.balance || 0);
          // Маркап запоминаем отдельно для расчёта CPM/Spend
          setMarkupPercent(markup);
        }
      } else if (role === "agency" && agencyId) {
        const { data, error } = await supabase
          .from("client_balances")
          .select("balance")
          .eq("agency_id", agencyId);

        if (!error && data) {
          const total = data.reduce(
            (sum, row) => sum + (row.balance || 0),
            0
          );
          setBalance(total);
        } else {
          console.warn("❌ Ошибка получения баланса агента:", error);
        }
      }
    };

    fetchBalance();
  }, [role, userId, agencyId]);

  useEffect(() => {
    const shouldFetch = role === "client" ? markupPercent > 0 : true;
    if (!shouldFetch) return;

    const fetchSpend = async () => {
      let query = supabase.from("ad_campaigns").select("views, cpm");

      if (role === "client" && userId) {
        query = query.eq("client_id", userId);
      } else if (role === "agency" && agencyId) {
        query = query.eq("agency_id", agencyId);
      } else {
        return;
      }

      const { data, error } = await query;
      if (error) {
        console.error("❌ Ошибка загрузки трат:", error);
        return;
      }

      const total = (data || []).reduce((sum, ad: any) => {
        const views = Number(ad.views) || 0;
        let cpm = parseFloat(ad.cpm) || 0;

        // Для клиента — CPM с маркапом
        if (role === "client") {
          cpm *= 1 + markupPercent / 100;
        }

        return sum + (views / 1000) * cpm;
      }, 0);

      setTotalSpend(total);
    };

    fetchSpend();
  }, [role, userId, agencyId, markupPercent]);

  const remainingBalance = balance - totalSpend;

  return (
    <header className="bg-white h-[48px]">
      <Container className="px-0">
        <div className="flex items-center justify-between h-[48px]">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 cursor-pointer"
          >
            <img src={LOGO_SVG} alt="logo" className="w-[22px] h-[22px]" />
            <span className="font-semibold text-[16px] text-[#119af5]">
              Telegram Ads
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-[14px] text-gray-600 font-bold">
              Budget: €{balance.toFixed(2)}
            </span>
            {/* Если захочешь — можно вывести и остаток:
            <span className="text-[12px] text-gray-500">
              Remaining: €{remainingBalance.toFixed(2)}
            </span>
            */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-300" />
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/login";
                }}
                className="text-[12px] text-gray-500 hover:text-red-500 transition"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;
