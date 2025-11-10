import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

type AdRow = {
  id: string;
  title: string | null;
  status: string | null;
  target?: string | null;
  created_at: string;
  // метрики
  views?: number;          // когда читаем ad_campaigns/v_adcampaigns_agency
  actions?: number;
  impressions?: number;    // когда читаем v_adcampaigns_client_compat
  // деньги
  cpm: number | string;
  budget: number | string;
  spend?: number | string;
  // базовые поля (есть во вьюхе client_compat — опционально)
  budget_base?: number | string;
  cpm_base?: number | string;
  spend_base?: number | string;
};

export default function AdTable() {
  const [ads, setAds] = useState<AdRow[]>([]);

  // ---- 1) общий загрузчик, источник зависит от роли ----
  const fetchAds = async () => {
    const role = localStorage.getItem("role");        // "client" | "agency" | "admin"
    const userId = localStorage.getItem("user_id");
    const agencyId = localStorage.getItem("agency_id");

    // Клиент -> читаем готовые данные с маркапом и совместимыми именами
    // Агентство/админ -> без маркапа
	const source =
	  role === "client"
		? "v_adcampaigns_client_compat"
		: "ad_campaigns";


    let query = supabase.from(source).select("*");

    if (role === "client") {
      // во вьюхе client_compat в каждой строке уже проверенный client_id/agency_id,
      // фильтрация на клиенте по своему user_id
      if (userId) query = query.eq("client_id", userId);
    } else if (role === "agency") {
      if (agencyId) query = query.eq("agency_id", agencyId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch ads:", error.message);
      setAds([]);
      return;
    }

    // Нормализуем поля для рендера (CTR, views и т.п.)
    const rows: AdRow[] = (data ?? []).map((ad: any) => {
      // во вьюхе client_compat метрики называются impressions/actions
      const views = Number(ad.views ?? ad.impressions ?? 0);
      const actions = Number(ad.actions ?? 0);

      const cpm = Number(ad.cpm ?? 0);
      const budget = Number(ad.budget ?? 0);

      // spend уже приходит из client_compat; для agency считаем по views*cpm
      const spend =
        ad.spend !== undefined
          ? Number(ad.spend)
          : Number(((views / 1000) * cpm).toFixed(2));

      return {
        ...ad,
        views,
        actions,
        cpm,
        budget,
        spend,
        ctr: views > 0 ? (actions / views) * 100 : 0,
      };
    });

    setAds(rows);
  };

  useEffect(() => {
    fetchAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 2) мутации разрешаем только не-клиентам ----
  const handleDelete = async (id: string) => {
    const role = localStorage.getItem("role");
    if (role === "client") return; // read-only для клиента

    const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
    if (error) {
      console.error("Error deleting ad:", error.message);
    } else {
      setAds((prev) => prev.filter((ad) => ad.id !== id));
    }
  };

  // +$10 увеличиваем ТОЛЬКО базовый бюджет (в таблице ad_campaigns)
  // если источник client_compat, у строки есть budget_base — используем его
  const handleAddBudget = async (id: string, ad: AdRow) => {
    const role = localStorage.getItem("role");
    if (role === "client") return; // клиент не может менять

    const base = Number(ad.budget_base ?? ad.budget ?? 0);
    const next = (base + 10).toFixed(2);

    const { error } = await supabase
      .from("ad_campaigns")
      .update({ budget: next })
      .eq("id", id);

    if (error) {
      console.error("Failed to update budget:", error.message);
    } else {
      fetchAds();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 mt-6">
      <div className="overflow-x-auto bg-white border rounded shadow-sm">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 text-xs uppercase text-gray-500 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Ad Title</th>
              <th className="px-4 py-3 text-left">Views</th>
              <th className="px-4 py-3 text-left">Actions</th>
              <th className="px-4 py-3 text-left">CPM</th>
              <th className="px-4 py-3 text-left">Budget</th>
              <th className="px-4 py-3 text-left">CTR (%)</th>
              <th className="px-4 py-3 text-left">Spend</th>
              <th className="px-4 py-3 text-left">Target</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Date Added</th>
              <th className="px-4 py-3 text-left">Tools</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ads.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-gray-400">
                  No ads created yet.
                </td>
              </tr>
            ) : (
              ads.map((ad) => {
                const role = localStorage.getItem("role");
                return (
                  <tr key={ad.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-blue-600 font-medium">
                      <Link to={`/create?id=${ad.id}`} className="hover:underline">
                        {ad.title || "Untitled"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{ad.views}</td>
                    <td className="px-4 py-3">{ad.actions}</td>
                    <td className="px-4 py-3">${Number(ad.cpm).toFixed(2)}</td>
                    <td className="px-4 py-3">${Number(ad.budget).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {Number((ad as any).ctr ?? (ad.views ? (ad.actions / ad.views) * 100 : 0)).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">${Number(ad.spend ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{(ad as any).target}</td>
                    <td className="px-4 py-3 text-blue-500">{ad.status}</td>
                    <td className="px-4 py-3">
                      {new Date(ad.created_at).toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {role !== "client" && (
                        <>
                          <button
                            className="text-red-600 hover:underline text-xs"
                            onClick={() => handleDelete(ad.id)}
                          >
                            Delete
                          </button>
                          <button
                            className="text-blue-600 hover:underline text-xs"
                            onClick={() => handleAddBudget(ad.id, ad)}
                          >
                            + $10
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
