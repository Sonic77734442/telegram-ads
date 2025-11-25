import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Тип кампании
interface Ad {
  id: number;
  title: string;
  views: number;
  actions: number;
  cpm: number;
  status: string;
  target: string;
  date_added: string;
  budget: number;
  ctr?: number;
  spend?: number;
}

export default function AdminDashboard() {
  const [globalBudget, setGlobalBudget] = useState<number | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [clients, setClients] = useState<{ client_id: string }[]>([]);

  // Стейты для ручного ввода дневной статистики
  const [statAdId, setStatAdId] = useState<number | null>(null);
  const [statDate, setStatDate] = useState<string>("");
  const [statViews, setStatViews] = useState<string>("");
  const [statClicks, setStatClicks] = useState<string>("");

  // === Глобальный бюджет ===
  useEffect(() => {
    const fetchGlobalBudget = async () => {
      const { data, error } = await supabase
        .from("global_settings")
        .select("total_budget")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) setGlobalBudget(data.total_budget);
      else console.error("Ошибка загрузки бюджета:", error?.message);
    };

    fetchGlobalBudget();
  }, []);

  // === Кампании ===
  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select("*")
      .order("id", { ascending: false });

    if (!error && data) {
      const enriched = data.map((ad: any) => {
        const views = Number(ad.views) || 0;
        const actions = Number(ad.actions) || 0;
        const cpm = parseFloat(ad.cpm || "0");
        const budget = parseFloat(ad.budget || "0");
        const spend = (views / 1000) * cpm;
        const ctr = views > 0 ? (actions / views) * 100 : 0;
        return { ...ad, cpm, budget, spend, ctr };
      });
      setAds(enriched);
    } else {
      console.error("Ошибка загрузки кампаний:", error?.message);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  // === Агентства ===
  const fetchAgencies = async () => {
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Ошибка загрузки агентств:", error.message);
    else setAgencies(data || []);
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  // === CRUD Кампаний ===
  const handleUpdate = async (ad: Ad) => {
    await supabase
      .from("ad_campaigns")
      .update({
        title: ad.title,
        cpm: ad.cpm,
        status: ad.status,
        budget: ad.budget,
        // views / actions лучше не апдейтить руками —
        // они будут пересчитываться из ad_stats
      })
      .eq("id", ad.id);

    setEditingId(null);
    fetchAds();
  };

  const handleChange = (id: number, field: keyof Ad, value: string | number) => {
    setAds((prev) =>
      prev.map((ad) =>
        ad.id === id
          ? {
              ...ad,
              [field]:
                field === "title" || field === "status"
                  ? value
                  : Number(String(value).replace(/^0+(?!$)/, "")),
            }
          : ad
      )
    );
  };

  const handleDelete = async (id: number) => {
    await supabase.from("ad_campaigns").delete().eq("id", id);
    fetchAds();
  };

  const handleDecreaseBudget = async (ad: Ad, amount: number) => {
    const newBudget = Math.max(0, ad.budget - amount);
    await supabase
      .from("ad_campaigns")
      .update({ budget: newBudget })
      .eq("id", ad.id);
    fetchAds();
  };

  // === Добавление дневной статистики ===
  const handleAddDailyStat = async () => {
    if (!statAdId || !statDate || !statViews) {
      alert("Выбери кампанию, дату и укажи просмотры");
      return;
    }

    const viewsNum = Number(statViews) || 0;
    const clicksNum = Number(statClicks) || 0;

    try {
      // 1. Вставляем строку в ad_stats
      const { error: insertError } = await supabase.from("ad_stats").insert([
        {
          ad_id: statAdId,
          timestamp: new Date(statDate + "T00:00:00").toISOString(),
          views: viewsNum,
          clicks: clicksNum,
        },
      ]);

      if (insertError) {
        console.error("Ошибка при вставке в ad_stats:", insertError.message);
        alert("Не удалось сохранить дневную статистику");
        return;
      }

      // 2. Считаем totals по этой кампании
      const { data: statsRows, error: statsError } = await supabase
        .from("ad_stats")
        .select("views, clicks")
        .eq("ad_id", statAdId);

      if (statsError || !statsRows) {
        console.error("Ошибка при чтении ad_stats:", statsError?.message);
        alert("Не удалось пересчитать totals для кампании");
        return;
      }

      const totalViews = statsRows.reduce(
        (sum: number, row: any) => sum + (Number(row.views) || 0),
        0
      );
      const totalClicks = statsRows.reduce(
        (sum: number, row: any) => sum + (Number(row.clicks) || 0),
        0
      );

      // 3. Обновляем totals в ad_campaigns
      const { error: updError } = await supabase
        .from("ad_campaigns")
        .update({
          views: totalViews,
          actions: totalClicks,
        })
        .eq("id", statAdId);

      if (updError) {
        console.error("Ошибка при обновлении кампании:", updError.message);
        alert("Статистика за день сохранена, но totals не обновились");
      } else {
        alert("Дневная статистика сохранена и totals обновлены ✅");
      }

      // 4. Сброс формы + обновление списка
      setStatViews("");
      setStatClicks("");
      // дату можно не сбрасывать, удобно вводить подряд
      fetchAds();
    } catch (e: any) {
      console.error(e);
      alert("Ошибка при сохранении статистики");
    }
  };

  // === Балансы клиентов ===
  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from("client_balances")
        .select("client_id");
      if (!error && data) setClients(data);
    };
    fetchClients();
  }, []);

  const handleTopUp = async () => {
    if (!selectedClientId || topUpAmount <= 0) return;

    const { data: existing } = await supabase
      .from("client_balances")
      .select("balance")
      .eq("client_id", selectedClientId)
      .maybeSingle();

    const newBalance = existing?.balance
      ? Number(existing.balance) + topUpAmount
      : topUpAmount;

    await supabase.from("client_balances").upsert(
      {
        client_id: selectedClientId,
        agency_id: localStorage.getItem("user_id") || null,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: ["client_id"] }
    );

    alert("Баланс пополнен ✅");
    setTopUpAmount(0);
  };

  // === Создание агентства ===
  const handleCreateAgency = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    try {
      const form = e.currentTarget;
      const email = (form.elements.namedItem("email") as HTMLInputElement)
        .value;
      const password = (
        form.elements.namedItem("password") as HTMLInputElement
      ).value;
      const name = (form.elements.namedItem("name") as HTMLInputElement).value;
      const markup = Number(
        (form.elements.namedItem("markup") as HTMLInputElement).value
      );
      const balance = Number(
        (form.elements.namedItem("balance") as HTMLInputElement).value
      );

      const res = await fetch(
        "https://eoybnbhpqsqxeygsikkz.functions.supabase.co/create-agency",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name,
            markup_percent: markup,
            balance,
          }),
        }
      );

      const data = await res.json();
      if (data.error) {
        alert("❌ " + data.error);
        return;
      }

      alert("✅ Агентство создано и может войти!");
      form.reset();
      await fetchAgencies();
    } catch (err: any) {
      alert("❌ Ошибка: " + (err?.message ?? String(err)));
    }
  };

  // === UI ===
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>

      {/* === Общий бюджет === */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h3 className="text-md font-semibold mb-2">Общий рекламный бюджет</h3>
        <div className="flex items-center gap-4">
          <input
            type="number"
            className="border px-3 py-1 rounded w-[200px]"
            value={globalBudget ?? ""}
            onChange={(e) => setGlobalBudget(Number(e.target.value))}
            placeholder="Введите бюджет"
          />
          <button
            className="bg-blue-600 text-white px-4 py-1 rounded"
            onClick={async () => {
              const { error } = await supabase
                .from("global_settings")
                .update({
                  total_budget: globalBudget,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", 1);
              if (error) console.error("Ошибка при обновлении:", error.message);
              else alert("Бюджет обновлён");
            }}
          >
            Сохранить
          </button>
        </div>
      </div>

      {/* === Таблица кампаний === */}
      <table className="w-full text-sm border border-gray-300 mb-6">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="p-2 border">Title</th>
            <th className="p-2 border">Views</th>
            <th className="p-2 border">Actions</th>
            <th className="p-2 border">CTR (%)</th>
            <th className="p-2 border">CPM</th>
            <th className="p-2 border">Spend</th>
            <th className="p-2 border">Budget</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Tools</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <tr key={ad.id} className="border">
              <td className="p-2 border">
                {editingId === ad.id ? (
                  <input
                    className="w-full border px-1"
                    value={ad.title}
                    onChange={(e) =>
                      handleChange(ad.id, "title", e.target.value)
                    }
                  />
                ) : (
                  ad.title
                )}
              </td>
              <td className="p-2 border">
                {editingId === ad.id ? (
                  <input
                    className="w-full border px-1"
                    value={ad.views}
                    type="number"
                    onChange={(e) =>
                      handleChange(ad.id, "views", e.target.value)
                    }
                  />
                ) : (
                  ad.views
                )}
              </td>
              <td className="p-2 border">
                {editingId === ad.id ? (
                  <input
                    className="w-full border px-1"
                    value={ad.actions}
                    type="number"
                    onChange={(e) =>
                      handleChange(ad.id, "actions", e.target.value)
                    }
                  />
                ) : (
                  ad.actions
                )}
              </td>
              <td className="p-2 border">{ad.ctr?.toFixed(2)}</td>
              <td className="p-2 border">
                {editingId === ad.id ? (
                  <input
                    className="w-full border px-1"
                    value={ad.cpm}
                    type="number"
                    onChange={(e) =>
                      handleChange(ad.id, "cpm", e.target.value)
                    }
                  />
                ) : (
                  ad.cpm
                )}
              </td>
              <td className="p-2 border">${ad.spend?.toFixed(2)}</td>
              <td className="p-2 border">
                ${ad.budget.toFixed(2)}
                <button
                  className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded"
                  onClick={() => handleDecreaseBudget(ad, 10)}
                >
                  –10
                </button>
              </td>
              <td className="p-2 border">
                {editingId === ad.id ? (
                  <select
                    className="w-full border px-1"
                    value={ad.status}
                    onChange={(e) =>
                      handleChange(ad.id, "status", e.target.value)
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                  </select>
                ) : (
                  ad.status
                )}
              </td>
              <td className="p-2 border">{ad.date_added}</td>
              <td className="p-2 border">
                {editingId === ad.id ? (
                  <button
                    className="text-green-600 text-sm mr-2"
                    onClick={() => handleUpdate(ad)}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    className="text-blue-600 text-sm mr-2"
                    onClick={() => setEditingId(ad.id)}
                  >
                    Edit
                  </button>
                )}
                <button
                  className="text-red-500 text-sm"
                  onClick={() => handleDelete(ad.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* === Форма добавления дневной статистики === */}
      <div className="mb-8 p-4 border rounded bg-gray-50">
        <h3 className="text-md font-semibold mb-3">
          Добавить дневную статистику для кампании
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <select
            className="border rounded px-2 py-1 min-w-[220px]"
            value={statAdId ?? ""}
            onChange={(e) =>
              setStatAdId(
                e.target.value ? Number(e.target.value) : null
              )
            }
          >
            <option value="">Выберите кампанию</option>
            {ads.map((ad) => (
              <option key={ad.id} value={ad.id}>
                {ad.title} (id: {ad.id})
              </option>
            ))}
          </select>

          <input
            type="date"
            className="border rounded px-2 py-1"
            value={statDate}
            onChange={(e) => setStatDate(e.target.value)}
          />

          <input
            type="number"
            className="border rounded px-2 py-1 w-28"
            placeholder="Views"
            value={statViews}
            onChange={(e) => setStatViews(e.target.value)}
          />

          <input
            type="number"
            className="border rounded px-2 py-1 w-28"
            placeholder="Clicks"
            value={statClicks}
            onChange={(e) => setStatClicks(e.target.value)}
          />

          <button
            className="bg-blue-600 text-white px-4 py-1 rounded"
            onClick={handleAddDailyStat}
          >
            Сохранить день
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Строка добавляется в <code>ad_stats</code>, после чего
          автоматически пересчитываются суммарные просмотры и клики
          кампании в <code>ad_campaigns</code>.
        </p>
      </div>

      {/* === Создание агентства === */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h3 className="text-md font-semibold mb-3">Создать агентство</h3>
        <form
          onSubmit={handleCreateAgency}
          className="flex flex-wrap gap-3 items-end"
        >
          <input
            name="name"
            placeholder="Название"
            className="border rounded px-2 py-1"
            required
          />
          <input
            name="email"
            placeholder="Email"
            className="border rounded px-2 py-1"
            required
          />
          <input
            name="password"
            placeholder="Пароль"
            type="password"
            className="border rounded px-2 py-1"
            required
          />
          <input
            name="markup"
            type="number"
            placeholder="Маржа %"
            className="border rounded px-2 py-1 w-20"
            defaultValue={20}
          />
          <input
            name="balance"
            type="number"
            placeholder="Баланс €"
            className="border rounded px-2 py-1 w-24"
            defaultValue={0}
          />
          <button className="bg-blue-600 text-white px-4 py-1 rounded">
            Создать
          </button>
        </form>
      </div>

      {/* === Список агентств === */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h3 className="text-md font-semibold mb-2">Список агентств</h3>
        {agencies.length === 0 ? (
          <p className="text-gray-500 text-sm">
            Пока нет зарегистрированных агентств
          </p>
        ) : (
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-2 border">Название</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Маржа %</th>
                <th className="p-2 border">Баланс</th>
                <th className="p-2 border">Дата создания</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((a) => (
                <tr key={a.id ?? a.agency_id}>
                  <td className="p-2 border">{a.name}</td>
                  <td className="p-2 border">{a.email}</td>
                  <td className="p-2 border">{a.markup_percent}%</td>
                  <td className="p-2 border">€{a.balance}</td>
                  <td className="p-2 border">
                    {new Date(a.created_at).toLocaleDateString("ru-RU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
