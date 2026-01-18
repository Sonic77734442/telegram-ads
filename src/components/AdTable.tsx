import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

const GEAR_ICON_SRC =
  "data:image/svg+xml;charset=utf-8;base64,PHN2ZyBoZWlnaHQ9IjE4IiB2aWV3Qm94PSIwIDAgMTggMTgiIHdpZHRoPSIxOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJtOS40MyA0Yy40NyAwIC44Ni4zNi45My44NC4wMy4yNS4wNy40Ni4xMS42NC4wMS4wNC4wOC4wOS4yLjE2bC4wNS4wMy4wNi4wMy4wNy4wNC4wNy4wMy4wOC4wMy4wOC4wNC4wOS4wNGMuMDIgMCAuMDMuMDEuMDUuMDIuMTMtLjA1LjI3LS4xLjQzLS4xNmwuMTQtLjA2Yy40My0uMTguOTMgMCAxLjE2LjQybC40Mi43N2MuMjMuNDEuMTUuOTItLjE5IDEuMjNsLS4xMS4xMS0uMjUuMjMtLjA5LjA4LS4xMi4xMWMtLjAxLjAxLS4wMi4wMy0uMDMuMDR2LjA1bC0uMDEuMDhjLS4wMS4wNy0uMDIuMTQtLjAyLjE5di4wN2MwIC4xNC4wMS4yMy4wNS4yNmwuMzQuMzMuMjUuMjZjLjMxLjMuMzkuNzguMTkgMS4xN2wtLjAyLjA0LS40My43OS0uMDIuMDNjLS4yNC40LS43Mi41Ny0xLjE1LjM5bC0uMDYtLjAyLS4xMy0uMDYtLjExLS4wNC0uMTEtLjA0LS4xMS0uMDQtLjEtLjA0Yy0uMDEgMC0uMDMtLjAxLS4wNC0uMDFzLS4wMSAwLS4wMiAwbC0uMDguMDQtLjA3LjAzYy0uMDMuMDItLjA1LjAzLS4wNy4wNGwtLjA2LjA0Yy0uMTcuMDktLjI2LjE4LS4yOC4yNGwtLjA0LjE5LS4xNS42Yy0uMS40Mi0uNDYuNzItLjg3Ljc0aC0uMDQtLjgzYy0uNDEgMC0uNzctLjI3LS45LS42OGwtLjA0LS4xNC0uMDQtLjE0LS4wMi0uMDctLjA0LS4xMy0uMDMtLjEyLS4wMy0uMTFjLS4wMS0uMDQtLjAyLS4wOC0uMDMtLjExIDAtLjAxIDAtLjAxIDAtLjAybC0uMDgtLjA1LS4wNi0uMDUtLjA3LS4wNS0uMDYtLjA0LS4wNS0uMDMtLjAzLS4wMi0uMDUtLjAzLS4wNC0uMDJjLS4wMS0uMDEtLjAyLS4wMS0uMDMtLjAxbC0uMDMtLjAyLS4wNC0uMDJjLS4wNC0uMDEtLjA3LS4wMi0uMS0uMDFsLS4xLjA0LS4xMi4wNC0uMTIuMDQtLjE0LjA1LS4xNC4wNmMtLjQxLjE2LS44OC0uMDEtMS4xMi0uNGwtLjAyLS4wNC0uNDMtLjc4Yy0uMjMtLjQxLS4xNS0uOTIuMTktMS4yM2wuMjEtLjIuMDktLjA5LjEtLjA5LjEyLS4xMmMuMDEtLjAxLjAyLS4wMi4wNC0uMDQuMDMtLjAzLjA0LS4xLjA0LS4yMXYtLjA2YzAtLjAzLS4wMS0uMDgtLjAxLS4xMmwtLjAxLS4wNy0uMDEtLjA4LS4wMS0uMDgtLjAyLS4wOS0uMDItLjFjLS4xMy0uMTItLjI4LS4yNi0uNDctLjQyLS4zNi0uMjktLjQ3LS44MS0uMjYtMS4yM2wuMDItLjAzLjQ0LS43OWMuMjEtLjM5LjY2LS41OCAxLjA4LS40NWwuMzIuMS4yOC4wOWMuMDIuMDEuMDQuMDEuMDcuMDIuMDEuMDEuMDMuMDEuMDUuMDEuMTMtLjA2LjI0LS4xMS4zMy0uMTUuMDctLjA1LjE2LS4xMy4yNi0uMjFsLjE4LS43NWMuMS0uNDQuNDgtLjc1LjkxLS43NXptLS40MyAzLjJjLS45MyAwLTEuNjkuODEtMS42OSAxLjhzLjc2IDEuOCAxLjY5IDEuOCAxLjY5LS44MSAxLjY5LTEuOC0uNzYtMS44LTEuNjktMS44eiIgZmlsbD0iIzJiMmIyYiIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+";

const PERSONS_ICON =
  "data:image/svg+xml;charset=utf-8;base64,PHN2ZyBoZWlnaHQ9IjE4IiB2aWV3Qm94PSIwIDAgMTggMTgiIHdpZHRoPSIxOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48c3R5bGU+LmF7ZmlsbDojN2Q4MWFiO308L3N0eWxlPjwvZGVmcz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMiAtMikiPjxwYXRoIGNsYXNzPSJhIiBkPSJNMTIgMi41QTMuNSAzLjUgMCAxIDAgMTUuNSwgNUEzLjUzIDMuNTMgMCAwIDAgMTIsIDIuNVptMCA1QTEuNSAxLjUgMCAxIDEgMTMuNSwgNiwxLjUxIDEuNTEgMCAwIDEgMTIsIDcuNVpNMTIgMTFhNS41IDUuNSAwIDAgMC00LjY4LDIuNDdBMSAxIDAgMCAwIDcuOTMsMTVoOC4xN0ExIDEgMCAwIDAgMTYsMTMuNDdBNS41IDUuNSAwIDAgMCwxMiwgMTFaTTcuNSwxMGEzLjUgMy41IDAgMCAxIDcuMCwwQTQuNSA0LjUgMCAwIDAgMTIsIDlzLTIuNjQsLjA5LTQuNSwxLjQ5QTEuNSAxLjUgMCAwIDEgNy41LDEwWiIvPjxnIGNsYXNzPSJhIj48cGF0aCBkPSJNNSAxNC4yNUEyLjI1IDIuMjUgMCAwIDEgNy4yNSAxMmgzLjVhMi4yNSAyLjI1IDAgMCAxIDIuMjUgMi4yNVYxNUg1WiIvPjwvZz48L2c+PC9zdmc+";

type AdRow = {
  id: string;
  title: string | null;
  status: string | null;
  target?: string | null;
  created_at: string;

  // метрики
  views?: number;
  opened?: number; // opened video / opens
  clicks?: number;
  actions?: number;

  // деньги (то, что показываем в таблице)
  cpm: number | string;
  budget: number | string;
  daily_budget: number | string;
  spend?: number | string;

  // дневной бюджет
  daily_budget?: number | string;
  daily_budget_base?: number | string;

  // сырые значения из вьюх / таблиц
  budget_base?: number | string;
  cpm_base?: number | string;
  spend_base?: number | string;

  // НОВОЕ: явные поля из Supabase
  spend_raw?: number | string; // агентский спент
  spend_with_markup?: number | string; // клиентский спент

  // вычисляемые
  ctr?: number; // %
  cvr?: number; // %
  cpc?: number;
  cpa?: number;
  cpv?: number;

  url?: string | null;
};

type ColumnConfig<Key extends keyof AdRow = keyof AdRow> = {
  id: Key;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  widthClass?: string;
  defaultVisible?: boolean;
  format?: (value: AdRow[Key], row: AdRow) => JSX.Element | string | number;
};

// порядок и подписи под Telegram Ads
const TABLE_COLUMNS: ColumnConfig[] = [
  {
    id: "title",
    label: "AD TITLE",
    sortable: true,
    align: "left",
    defaultVisible: true,
  },
  {
    id: "views",
    label: "VIEWS",
    sortable: true,
    align: "left",
    widthClass: "w-[76.2px]",
    defaultVisible: true,
    format: (v) => (Number(v) || 0).toLocaleString("en-US"),
  },
  {
    id: "opened",
    label: "OPENED",
    sortable: true,
    align: "left",
    widthClass: "w-[73.98px]",
    defaultVisible: false,
    format: (v) => (Number(v) || 0).toLocaleString("en-US"),
  },
  {
    id: "clicks",
    label: "CLICKS",
    sortable: true,
    align: "left",
    widthClass: "w-[69.3px]",
    defaultVisible: true,
    format: (v) => (Number(v) || 0).toLocaleString("en-US"),
  },
  {
    id: "actions",
    label: "ACTIONS",
    sortable: true,
    align: "left",
    widthClass: "w-[78.47px]",
    defaultVisible: true,
    format: (v) => (Number(v) || 0).toLocaleString("en-US"),
  },
  {
    id: "ctr",
    label: "CTR",
    sortable: true,
    align: "left",
    defaultVisible: true,
    widthClass: "w-[65px]",
    format: (v) => `${(Number(v) || 0).toFixed(2)}%`,
  },
  {
    id: "cvr",
    label: "CVR",
    sortable: true,
    align: "left",
    defaultVisible: false,
    widthClass: "w-[65px]",
    format: (v) => `${(Number(v) || 0).toFixed(2)}%`,
  },
  {
    id: "cpm",
    label: "CPM",
    sortable: true,
    align: "left",
    defaultVisible: true,
    widthClass: "w-[65px]",
    format: (v, row) => {
      const cpm =
        Number(v) ||
        Number((row as any).cpm) ||
        Number((row as any).cpm_base) ||
        0;

      return <span className="text-[#139af5] font-normal">€ {cpm.toFixed(2)}</span>;
    },
  },
  {
    id: "cpc",
    label: "CPC",
    sortable: true,
    align: "left",
    defaultVisible: true,
    widthClass: "w-[65px]",
    format: (v) => `€ ${(Number(v) || 0).toFixed(2)}`,
  },
  {
    id: "cpa",
    label: "CPA",
    sortable: true,
    align: "left",
    defaultVisible: false,
    widthClass: "w-[65px]",
    format: (v) => `€ ${(Number(v) || 0).toFixed(2)}`,
  },
  {
    id: "spend",
    label: "SPENT",
    sortable: true,
    align: "left",
    defaultVisible: true,
    widthClass: "w-[85px]",
    format: (v) => `€ ${(Number(v) || 0).toFixed(2)}`,
  },
  {
    id: "budget",
    label: "BUDGET",
    sortable: true,
    align: "left",
    defaultVisible: true,
    widthClass: "w-[85px]",
    render: (row: AdRow) => (
      <div className="flex flex-col items-end leading-tight">
        {/* Верхняя строка — общий бюджет кампании */}
        <div>€ {(Number(row.budget) || 0).toFixed(2)}</div>

        {/* Нижняя строка — дневной бюджет, открывает модалку */}
        <button
          type="button"
          className="text-xs text-blue-500 underline"
          onClick={() => openBudgetModal("edit", row)}
        >
          € {(Number((row as any).daily_budget ?? 0) || 0).toFixed(2)}
        </button>
      </div>
    ),
  },
  {
    id: "target",
    label: "TARGET",
    sortable: false,
    align: "left",
    defaultVisible: true,
    widthClass: "w-[140px]",
    format: (v) => {
      if (!v) return "—";
      const parts = String(v)
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean);

      return (
        <div className="flex flex-col text-[11px] text-gray-700">
          {parts.map((p, i) => (
            <span key={i}>{p}</span>
          ))}
        </div>
      );
    },
  },
  {
    id: "status",
    label: "STATUS",
    sortable: true,
    align: "left",
    defaultVisible: true,
    widthClass: "w-[85px]",
  },
  {
    id: "created_at",
    label: "DATE ADDED",
    sortable: true,
    align: "left",
    defaultVisible: true,
    widthClass: "w-[114px]",
    format: (v) => {
      if (!v) return "";
      const d = new Date(String(v));
      if (Number.isNaN(d.getTime())) return "";

      const datePart = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
      const timePart = d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      return `${datePart} ${timePart}`;
    },
  },
];

const STORAGE_KEY = "tgads_campaign_table_columns";

export default function AdTable() {
  const [ads, setAds] = useState<AdRow[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<{ id: string; dir: "asc" | "desc" } | null>(
    null
  );
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // ===== BUDGET MODAL =====
  const [budgetModalMode, setBudgetModalMode] = useState<"increase" | "edit" | null>(
    null
  );
  const [selectedAd, setSelectedAd] = useState<AdRow | null>(null);
  const [budgetInput, setBudgetInput] = useState<string>("");

  const openBudgetModal = (mode: "increase" | "edit", ad: AdRow) => {
    setSelectedAd(ad);
    setBudgetModalMode(mode);

    if (mode === "increase") {
      setBudgetInput("");
    } else {
      setBudgetInput((Number(ad.budget) || 0).toFixed(2));
    }
  };

  const closeBudgetModal = () => {
    setBudgetModalMode(null);
    setBudgetInput("");
  };

  const handleBudgetSubmit = async () => {
    if (!selectedAd || !budgetModalMode) return;

    const raw = budgetInput.replace(",", ".").trim();
    const amount = Number(raw || 0);

    if (!Number.isFinite(amount) || amount < 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      const resp = await fetch("/api/campaigns-budget", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ad_id: selectedAd.id,
          mode: budgetModalMode, // "increase" | "edit"
          amount,
        }),
      });

      const json = await resp.json();

      if (!resp.ok || json.error) {
        console.error("budget api error:", json.error || json);
        alert("Failed to update budget");
        return;
      }

      await fetchAds();
      closeBudgetModal();
    } catch (e) {
      console.error("budget api exception:", e);
      alert("Failed to update budget");
    }
  };

  // ===== STATUS MODAL =====
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusValue, setStatusValue] = useState<string>("Active");
  const [runOnSchedule, setRunOnSchedule] = useState(false);
  const [endDate, setEndDate] = useState<string>("");

  const openStatusModal = (ad: AdRow) => {
    setSelectedAd(ad);
    setIsStatusModalOpen(true);
    setStatusValue(ad.status || "Active");
    setRunOnSchedule(false);
    setEndDate("");
  };

  const closeStatusModal = () => {
    setIsStatusModalOpen(false);
  };

  const handleStatusSubmit = async () => {
    if (!selectedAd) return;

    try {
      // если ещё нет API — просто оставь этот fetch, потом подменишь URL
      const resp = await fetch("/api/campaigns-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ad_id: selectedAd.id,
          status: statusValue, // "Active" | "On Hold"
          run_on_schedule: runOnSchedule,
          end_date: endDate || null,
        }),
      });

      const json = await resp.json();

      if (!resp.ok || json.error) {
        console.error("status api error:", json.error || json);
        alert("Failed to update status");
        return;
      }

      await fetchAds();
      closeStatusModal();
    } catch (e) {
      console.error("status api exception:", e);
      alert("Failed to update status");
    }
  };

  const fetchAds = async () => {
    try {
      const role = localStorage.getItem("role") || "client"; // client | agency | admin
      const clientId = localStorage.getItem("user_id") || "";
      const agencyId = localStorage.getItem("agency_id") || "";

      const params = new URLSearchParams({ mode: role });

      if (role === "client" && clientId) params.set("client_id", clientId);
      if (role === "agency" && agencyId) params.set("agency_id", agencyId);

      const resp = await fetch(`/api/campaigns?${params.toString()}`);
      const json = await resp.json();

      if (json.error) {
        console.error("API campaigns error:", json.error);
        setAds([]);
        return;
      }

      const rows: AdRow[] = json.data.map((c: any) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        target: c.target,
        created_at: c.created_at,

        views: c.views,
        opened: 0,
        clicks: c.clicks,
        actions: 0,

        cpm: c.cpm_client,
        cpm_base: c.cpm_net,

        budget: c.budget_client,
        budget_base: c.budget_net,

        daily_budget: c.daily_budget_client,
        daily_budget_base: c.daily_budget_net,

        spend: c.spend_client,
        spend_base: c.spend_net,

        ctr: c.ctr,
        cvr: 0,
        cpc: 0,
        cpa: 0,
        cpv: 0,

        spend_raw: c.spend_net,
        spend_with_markup: c.spend_client,

        url: c.url,
      }));

      setAds(rows);
    } catch (e) {
      console.error("Campaigns API exception:", e);
      setAds([]);
    }
  };

  useEffect(() => {
    fetchAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- инициализация видимых колонок ----
  useEffect(() => {
    const savedRaw = localStorage.getItem(STORAGE_KEY);

    const allIds = TABLE_COLUMNS.map((c) => c.id as string);
    const defaultIds = TABLE_COLUMNS.filter((c) => c.defaultVisible).map(
      (c) => c.id as string
    );

    if (savedRaw) {
      try {
        const saved: string[] = JSON.parse(savedRaw);

        const validSaved = saved.filter((id) => allIds.includes(id));

        const merged = Array.from(new Set([...validSaved, ...defaultIds]));

        setVisibleColumns(merged);
      } catch {
        setVisibleColumns(defaultIds);
      }
    } else {
      setVisibleColumns(defaultIds);
    }
  }, []);

  const columnsToRender = useMemo(
    () =>
      TABLE_COLUMNS.filter((c) =>
        c.id === "title" ? true : visibleColumns.includes(c.id as string)
      ),
    [visibleColumns]
  );

  const sortedAds = useMemo(() => {
    if (!sortBy) return ads;
    const col = TABLE_COLUMNS.find((c) => c.id === sortBy.id);
    if (!col?.sortable) return ads;

    return [...ads].sort((a, b) => {
      const av = a[col.id];
      const bv = b[col.id];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (typeof av === "number" && typeof bv === "number") {
        return sortBy.dir === "asc" ? av - bv : bv - av;
      }

      return sortBy.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [ads, sortBy]);

  const handleToggleSort = (id: string) => {
    setSortBy((prev) => {
      if (!prev || prev.id !== id) return { id, dir: "desc" };
      if (prev.dir === "desc") return { id, dir: "asc" };
      return null;
    });
  };

  const handleToggleColumn = (id: string) => {
    setVisibleColumns((prev) => {
      let next: string[];

      if (prev.includes(id)) {
        next = prev.filter((x) => x !== id);
      } else {
        next = [...prev, id];
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Хедер */}
      <div className="flex items-center justify-between"></div>

      {/* Таблица */}
      <div className="tg-root w-full flex justify-center">
        <div className="w-full max-w-[1365px]">
          <table className="w-max mx-auto text-[12px] leading-[15px] text-gray-800 table-fixed border-collapse">
            <thead className="text-[11px] font-semibold text-gray-600">
              <tr className="h-[38px]">
                {columnsToRender.map((col) => (
                  <th
                    key={col.id as string}
                    className={`px-3 ${col.id === "title" ? "w-[200px]" : ""} ${col.widthClass || ""} ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.sortable ? "cursor-pointer select-none" : ""}`}
                    onClick={() =>
                      col.sortable && handleToggleSort(col.id as string)
                    }
                  >
                    <span className="inline-flex items-center gap-1 tracking-wide">
                      {col.label}
                      {col.sortable && col.id !== "target" && col.id !== "status" && (
                        <span className="inline-flex flex-col gap-[1px] text-black">
                          {sortBy?.id === col.id ? (
                            sortBy.dir === "asc" ? (
                              <svg width="7" height="4" viewBox="0 0 7 4" aria-hidden="true">
                                <polygon points="3.5,0 7,4 0,4" fill="currentColor" />
                              </svg>
                            ) : (
                              <svg width="7" height="4" viewBox="0 0 7 4" aria-hidden="true">
                                <polygon points="0,0 7,0 3.5,4" fill="currentColor" />
                              </svg>
                            )
                          ) : (
                            <>
                              <svg width="7" height="4" viewBox="0 0 7 4" aria-hidden="true">
                                <polygon points="3.5,0 7,4 0,4" fill="currentColor" />
                              </svg>
                              <svg width="7" height="4" viewBox="0 0 7 4" aria-hidden="true">
                                <polygon points="0,0 7,0 3.5,4" fill="currentColor" />
                              </svg>
                            </>
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                ))}

                <th className="w-8 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => setIsCustomizeOpen(true)}
                    className="inline-flex h-[23.99px] w-[23.99px] items-center justify-center rounded hover:bg-gray-100"
                  >
                    <img src={GEAR_ICON_SRC} className="h-[23.99px] w-[23.99px]" alt="settings" />
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedAds.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnsToRender.length + 1}
                    className="text-center py-8 text-gray-400"
                  >
                    No ads created yet.
                  </td>
                </tr>
              ) : (
                sortedAds.map((ad, index) => (
                  <tr
                    key={ad.id}
                    className={`h-[38px] ${index % 2 === 0 ? "bg-[#f6f7f9]" : "bg-transparent"} hover:bg-[#e9f0f7]`}
                  >
                    {columnsToRender.map((col) => {
                      const value = ad[col.id];

                      // ==== AD TITLE ====
                      if (col.id === "title") {
                        return (
                          <td
                            key={col.id as string}
                            className={`p-0 align-middle w-[200px] h-[38px] ${col.widthClass || ""}`}
                          >
                            <div className="flex items-center gap-[6px] w-[200px] h-[38px]">
                              <div className="flex h-[18px] w-[18px] items-center justify-center rounded bg-gray-100 flex-shrink-0">
                                <img
                                  src="data:image/svg+xml;charset=utf-8;base64,PHN2ZyBoZWlnaHQ9IjE4IiB2aWV3Qm94PSIwIDAgMTggMTgiIHdpZHRoPSIxOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjMmIyYjJiIj48cGF0aCBkPSJNIDEyLjEgOS40NSBDIDEzLjEyIDkuNDUgMTMuOTQgOC43MSAxMy45NCA3LjggQyAxMy45NCA2Ljg4IDEzLjEyIDYuMTUgMTIuMSA2LjE1IEMgMTEuMDcgNi4xNSAxMC4yNSA2Ljg4IDEwLjI1IDcuOCBDIDEwLjI1IDguNzEgMTEuMDcgOS40NSAxMi4xIDkuNDUgWiBNIDYuNzkgOS4yNSBDIDguMDIgOS4yNSA5IDguMyA5IDcuMTIgUyA4LjAyIDUgNi43OSA1IFMgNC41NyA1Ljk1IDQuNTcgNy4xMiBTIDUuNTYgOS4yNSA2Ljc5IDkuMjUgWiBNIDYuNjggMTAuMTYgQyA1LjEyIDEwLjE2IDIgMTAuODkgMiAxMi4zNiBWIDEzLjA4IEMgMiAxMy40MyAyLjUzIDEzLjkzIDIuOSAxMy45MyBIIDEwLjY4IEMgMTEuMDUgMTMuOTMgMTEuMzUgMTMuNjUgMTEuMzUgMTMuMyBWIDEyLjM2IEMgMTEuMzUgMTAuODkgOC4yMyAxMC4xNiA2LjY4IDEwLjE2IFogTSAxMS44OSAxMC40NiBDIDExLjcyIDEwLjQ2IDExLjUzIDEwLjQ3IDExLjMyIDEwLjQ5IEMgMTEuMzQgMTAuNSAxMS4zNCAxMC41MSAxMS4zNSAxMC41MSBDIDEyLjAyIDExIDEyLjczIDExLjY2IDEyLjczIDEyLjUzIFYgMTMuNDEgQyAxMi43MyAxMy42MiAxMi42OSAxMy44MiAxMi42MiAxNCBIIDE1LjE5IEMgMTUuNTEgMTQgMTYgMTMuNTEgMTYgMTMuMTkgViAxMi41MyBDIDE2IDExLjE1IDEzLjI2IDEwLjQ2IDExLjg5IDEwLjQ2IFoiLz48L2c+PC9zdmc+"
                                  className="h-[18px] w-[18px]"
                                  alt=""
                                />
                              </div>

                              <div className="flex flex-col justify-center w-[175px] h-[31px]">
                                <Link
                                  to={`/create?id=${ad.id}`}
                                  className="tg-title-link block text-[13px] font-semibold text-black truncate leading-[15px]"
                                >
                                  {ad.title || "Untitled"}
                                </Link>

                                {ad.url && (
                                  <a
                                    href={ad.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-[11px] text-blue-600 hover:underline truncate leading-[15px]"
                                  >
                                    {ad.url}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      // ==== BUDGET (TOTAL + DAILY, кликабельные) ====
                      if (col.id === "budget") {
                        const role = localStorage.getItem("role");
                        const isClient = role === "client";

                        const totalBudget = isClient ? ad.budget : ad.budget_base;
                        const dailyBudget = isClient
                          ? ad.daily_budget
                          : ad.daily_budget_base;

                        return (
                          <td
                            key={col.id as string}
                            className={`px-3 py-[4px] text-left whitespace-nowrap ${col.widthClass || ""}`}
                          >
                            {/* верх — общий бюджет (Increase Budget) */}
                            <button
                              type="button"
                              onClick={() => openBudgetModal("increase", ad)}
                              className="text-[#139af5] font-normal hover:underline"
                            >
                              € {Number(totalBudget || 0).toFixed(2)}
                            </button>

                            {/* низ — дневной бюджет (Edit Daily Budget) */}
                            <button
                              type="button"
                              onClick={() => openBudgetModal("edit", ad)}
                              className="block text-[11px] leading-[15px] text-[#139af5] font-normal hover:underline text-left"
                            >
                              € {Number(dailyBudget || 0).toFixed(2)}
                            </button>
                          </td>
                        );
                      }

                      // ==== STATUS (кликабельный) ====
                      if (col.id === "status") {
                        return (
                          <td
                            key={col.id as string}
                            className={`px-3 py-[4px] text-left ${col.widthClass || ""}`}
                          >
                            <button
                              type="button"
                              onClick={() => openStatusModal(ad)}
                              className="inline-flex items-center px-3 py-1 text-[13px] font-normal text-[#139af5] whitespace-nowrap"
                            >
                              {ad.status || "Active"}
                            </button>
                          </td>
                        );
                      }

                        const baseClass = "text-left";

                      const display = col.format
                        ? col.format(value as any, ad)
                        : (value as any) ?? "—";

                      return (
                        <td
                          key={col.id as string}
                          className={`px-3 py-[4px] ${baseClass} ${col.widthClass || ""} ${col.id === "created_at" ? "whitespace-nowrap" : ""}`}
                        >
                          {display === "" ||
                          display === null ||
                          display === undefined
                            ? "—"
                            : display}
                        </td>
                      );
                    })}

                    <td className="w-8 px-2" />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка кастомизации */}
      {isCustomizeOpen && (
        <CustomizeTableModal
          visibleIds={visibleColumns}
          onToggle={handleToggleColumn}
          onClose={() => setIsCustomizeOpen(false)}
        />
      )}

      {/* Модалка бюджета (Increase / Edit) */}
      {budgetModalMode && selectedAd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white shadow-lg">
            <div className="border-b px-6 py-4">
              <h2 className="text-[15px] font-semibold text-gray-900">
                {budgetModalMode === "increase"
                  ? "Increase Budget"
                  : "Edit Daily Budget"}
              </h2>
              <p className="mt-1 text-[13px] text-gray-700">
                for {selectedAd.title || "Untitled"}
              </p>
            </div>

            <div className="px-6 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[18px] text-gray-700">€</span>
                <input
                  type="number"
                  step="0.01"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder={budgetModalMode === "increase" ? "0.00" : ""}
                  className="flex-1 rounded-md border border-[#2a9cf0] px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-[#2a9cf0]/50"
                />
              </div>

              {budgetModalMode === "edit" && (
                <p className="text-[12px] text-gray-500">
                  €{" "}
                  {Math.max(
                    0,
                    (Number(selectedAd.budget) || 0) -
                      (Number(selectedAd.spend_raw) || 0)
                  ).toFixed(2)}{" "}
                  remaining today
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4 border-t px-6 py-3 text-[13px]">
              <button
                type="button"
                onClick={closeBudgetModal}
                className="text-[#2481cc] hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBudgetSubmit}
                className="rounded bg-[#1890ff] px-4 py-1.5 text-white font-semibold hover:bg-[#1273cc]"
              >
                {budgetModalMode === "increase" ? "Add to budget" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка статуса */}
      {isStatusModalOpen && selectedAd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white shadow-lg">
            <div className="border-b px-6 py-4">
              <h2 className="text-[15px] font-semibold text-gray-900">
                Edit Status
              </h2>
              <p className="mt-1 text-[13px] text-gray-700">
                for {selectedAd.title || "Untitled"}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4 text-[13px] text-gray-800">
              {/* Status radio */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="Active"
                    checked={statusValue === "Active"}
                    onChange={() => setStatusValue("Active")}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span>Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="On Hold"
                    checked={statusValue === "On Hold"}
                    onChange={() => setStatusValue("On Hold")}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span>On Hold</span>
                </label>

                {/* Set end date */}
                <div className="mt-1">
                  <button
                    type="button"
                    className="text-[#2481cc] hover:underline text-[12px]"
                    onClick={() => {
                      /* просто даём фокус на input ниже */
                      const el = document.getElementById(
                        "status-end-date-input"
                      ) as HTMLInputElement | null;
                      el?.focus();
                    }}
                  >
                    Set end date
                  </button>
                  <input
                    id="status-end-date-input"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-[12px] focus:ring-1 focus:ring-[#2a9cf0]"
                  />
                </div>
              </div>

              {/* Ad schedule */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center gap-1 text-[12px] text-gray-700">
                  <span className="font-medium">Ad Schedule</span>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-500">
                    i
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-[12px]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-blue-600"
                    checked={runOnSchedule}
                    onChange={(e) => setRunOnSchedule(e.target.checked)}
                  />
                  <span>Run this ad on schedule</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-4 border-t px-6 py-3 text-[13px]">
              <button
                type="button"
                onClick={closeStatusModal}
                className="text-[#2481cc] hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusSubmit}
                className="rounded bg-[#1890ff] px-4 py-1.5 text-white font-semibold hover:bg-[#1273cc]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Модальное окно Customize Table
type CustomizeProps = {
  visibleIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
};

function CustomizeTableModal({ visibleIds, onToggle, onClose }: CustomizeProps) {
  const customizable = TABLE_COLUMNS.filter((c) => c.id !== "title");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white shadow-lg">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            Customize Table
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Toggle columns to show in the campaigns list.
          </p>
        </div>

        <div className="max-h-[420px] space-y-1 overflow-y-auto px-4 py-3 text-sm">
          {customizable.map((col) => (
            <label
              key={col.id as string}
              className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={visibleIds.includes(col.id as string)}
                onChange={() => onToggle(col.id as string)}
              />
              <span className="text-gray-800">{col.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end border-t px-4 py-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
