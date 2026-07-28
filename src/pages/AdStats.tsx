import { useEffect, useMemo, useState, useContext } from "react";
import TelegramAdPreview from "../components/TelegramAdPreview";
import TelegramStatsChart, {
  getStatsPeriodLabel,
} from "../components/TelegramStatsChart";
import { supabase } from "../supabaseClient";
import { AdIdContext } from "../contexts/AdIdContext";
import { fetchCampaignById } from "../lib/campaignApi";

type Range = "days" | "5min";

type StatPointDay = { date: string; views: number; clicks: number; video_opens: number };
type StatPoint5m = { ts: string; views: number; clicks: number; video_opens: number };

type BudgetPointDay = { date: string; amount: number };
type BudgetPoint5m = { ts: string; amount: number };

type ReportRow = { day: string; views: number; amount: number };

export default function AdStats() {
  const adId = useContext(AdIdContext);

  // meta
  const [ad, setAd] = useState<any>(null);
  const [adLoadError, setAdLoadError] = useState<string | null>(null);

  // markup (для клиента)
  const [markupPercent, setMarkupPercent] = useState<number>(0);

  // top chart (Statistics)
  const [statsRange, setStatsRange] = useState<Range>("days");
  const [statsData, setStatsData] = useState<(StatPointDay | StatPoint5m)[]>([]);

  // second chart (Spent budget)
  const [budgetData, setBudgetData] = useState<(BudgetPointDay | BudgetPoint5m)[]>([]);

  // reports
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const monthTabs = useMemo(() => {
    const base = new Date();
    base.setUTCDate(1);
    const arr: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
      arr.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    return arr;
  }, []);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const loadMonthlyReport = async (month: string) => {
    const resp = await fetch(`/api/reports?ad_id=${adId}&ym=${month}`);
    const json = await resp.json();

    if (!resp.ok || json.error) {
      throw new Error(json.error || `Reports API failed (${resp.status})`);
    }

    return (json.data || []).map((r: any) => {
      const baseAmount = Number(r.amount ?? 0);
      return {
        day: r.day,
        views: Number(r.views || 0),
        amount: baseAmount,
      };
    }) as ReportRow[];
  };

  const loadReportForStatsChart = async () => {
    const reportRows = await loadMonthlyReport(selectedMonth).catch(() => []);

    return reportRows
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((row) => ({
        date: row.day,
        views: Number(row.views || 0),
        clicks: 0,
        video_opens: 0,
      }));
  };

  const loadStatsFromApi = async (range: Range) => {
    const resp = await fetch(`/api/stats?ad_id=${adId}&range=${range}`);
    const json = await resp.json();

    if (!resp.ok || json.error) {
      throw new Error(json.error || `Stats API failed (${resp.status})`);
    }

    return (json.data || []).map((r: any) => ({
      ...(range === "days" ? { date: r.date } : { ts: r.ts }),
      views: Number(r.views ?? 0),
      clicks: Number(r.clicks ?? 0),
      video_opens: Number(r.video_opens ?? 0),
    }));
  };

  const loadBudgetFromApi = async (range: Range) => {
    const resp = await fetch(`/api/budget-stats?ad_id=${adId}&range=${range}`);
    const json = await resp.json();

    if (!resp.ok || json.error) {
      throw new Error(json.error || `Budget stats API failed (${resp.status})`);
    }

    return (json.data || []).map((row: any) => ({
      ...(range === "days" ? { date: row.date } : { ts: row.ts }),
      amount: Number(row.amount || 0),
    })) as (BudgetPointDay | BudgetPoint5m)[];
  };

  const reportsTotal = useMemo(
    () => ({
      views: reports.reduce((s, r) => s + (r.views || 0), 0),
      amount: reports.reduce((s, r) => s + (r.amount || 0), 0),
    }),
    [reports]
  );

  const displayedBudgetData = useMemo(() => {
    if (budgetData.length > 0) return budgetData;
    if (statsRange === "days" && reports.length > 0) {
      return reports.map((row) => ({ date: row.day, amount: row.amount }));
    }
    return statsData.map((point) =>
      "date" in point
        ? { date: point.date, amount: 0 }
        : { ts: point.ts, amount: 0 }
    );
  }, [budgetData, reports, statsData, statsRange]);
    // суммарные просмотры по данным top-чарта
  const totalViewsFromStats = useMemo(
    () =>
      statsData.reduce((sum, point: any) => sum + (Number(point.views) || 0), 0),
    [statsData]
  );

  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

const multiplier =
  role === "client" && typeof markupPercent === "number"
    ? 1 + markupPercent / 100
    : 1;


  useEffect(() => {
    const loadMarkup = async () => {
      const roleLocal = localStorage.getItem("role");
      const userId = localStorage.getItem("user_id");
      if (roleLocal === "client" && userId) {
        const { data, error } = await supabase
          .from("client_balances")
          .select("markup_percent")
          .eq("client_id", userId)
          .maybeSingle();
        if (!error && data && typeof data.markup_percent === "number") {
          setMarkupPercent(data.markup_percent);
        }
      }
    };
    loadMarkup();
  }, []);

  // load ad meta
  useEffect(() => {
    if (!adId) return;

    const normalizeAd = (data: any) => {
      let parsed: any = {};
      try {
        parsed = data.raw ? JSON.parse(data.raw) : {};
      } catch {}

      return {
        ...parsed,
        title: data.title,
        text: data.text,
        url: data.url,
        button: data.button,
        mediaUrl: data.media_url,
        mediaType: data.media_type,
        cpm: data.cpm_client ?? data.cpm_net ?? data.cpm,
        budget: data.budget_client ?? data.budget_net ?? data.budget,
        views: data.views,
        createdAt: data.created_at,
      };
    };

    (async () => {
      setAdLoadError(null);
      setAd(null);

      try {
        const apiAd = await fetchCampaignById(adId);
        if (apiAd) {
          setAd(normalizeAd(apiAd));
          return;
        }

        setAdLoadError("This ad is unavailable or you do not have access to it.");
      } catch (apiError) {
        console.error("load ad meta failed:", apiError);
        setAdLoadError("Failed to load ad details.");
      }
    })();
  }, [adId]);

  // load statistics chart
  useEffect(() => {
    if (!adId) return;
    (async () => {
      try {
        const apiStats = await loadStatsFromApi(statsRange);
        setStatsData(
          apiStats.length === 0 && statsRange === "days"
            ? await loadReportForStatsChart()
            : apiStats
        );
      } catch (apiError) {
        console.error("stats api error:", apiError);
        setStatsData(statsRange === "days" ? await loadReportForStatsChart() : []);
      }
    })();
  }, [adId, statsRange, monthTabs, selectedMonth]);

  useEffect(() => {
    if (!adId) return;
    (async () => {
      try {
        setBudgetData(await loadBudgetFromApi(statsRange));
      } catch (error) {
        console.error("budget stats api error:", error);
        setBudgetData([]);
      }
    })();
  }, [adId, statsRange]);

   // load reports (table)
  useEffect(() => {
    if (!adId || !selectedMonth) return;

    (async () => {
      try {
        setReports(await loadMonthlyReport(selectedMonth));
      } catch (e) {
        console.error("reports fetch exception:", e);
        setReports([]);
      }
    })();
  }, [adId, selectedMonth]);


  const downloadServerCSV = (
    type: "stats" | "budget" | "reports",
    options: { range?: Range; month?: string } = {}
  ) => {
    if (!adId) return;
    const params = new URLSearchParams({ ad_id: adId, type });
    if (options.range) params.set("range", options.range);
    if (options.month) params.set("ym", options.month);
    const anchor = document.createElement("a");
    anchor.href = `/api/export-csv?${params.toString()}`;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  if (!adId) return <div className="p-4">⚠️ No ad ID</div>;
  if (adLoadError) return <div className="p-4 text-sm text-gray-600">{adLoadError}</div>;
  if (!ad) return <div className="p-4">Loading…</div>;

  const displayBudget = (() => {
    const base = Number(ad?.budget ?? 0);
    if (!base) return "0.00";
    return base.toFixed(2);
  })();
  
  const displayCpm = (() => {
    if (reportsTotal.views > 0 && reportsTotal.amount > 0) {
      return ((reportsTotal.amount * 1000) / reportsTotal.views).toFixed(2);
    }
    const base = Number(ad?.cpm ?? 0);
    if (!base) return "0.00";
    return (base * multiplier).toFixed(2);
  })();

  const metaViews =
    totalViewsFromStats ||
    reportsTotal.views ||
    Number(ad?.views ?? 0);
  
  return (
    <div className="min-h-screen bg-white">
      <div className="w-full space-y-[30px]">
        {/* ========== Card with preview & meta ========== */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[376px_1fr] md:gap-14">
          <div className="justify-self-center pl-[7px] md:justify-self-start">
            <div className="w-[376px]">
              <TelegramAdPreview
                title={ad.title}
                text={ad.text}
                mediaUrl={ad.mediaUrl}
                mediaType={ad.mediaType}
                button={ad.button}
                showClose={false}
                className="min-h-[294px] w-[376px]"
              />
            </div>
          </div>
          <div className="flex flex-col pt-1 text-[13px] leading-[18px]">
			  <div className="text-left">
				<div className="font-medium text-[#222]">Link</div>
				<a
				  href={ad.url?.startsWith("http") ? ad.url : `https://${ad.url}`}
				  className="block max-w-[390px] break-words text-[#2481cc] hover:underline"
				  target="_blank"
				  rel="noreferrer"
				>
				  {ad.url}
				</a>
			  </div>
            <div className="mt-5">
              <Meta label="Date created">
                {ad.createdAt
                  ? new Date(ad.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "UTC",
                    })
                  : "Unknown"}
              </Meta>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-8">
              <Meta label="CPM">€ {displayCpm}</Meta>
              <Meta label="Budget">€ {displayBudget}</Meta>
              <Meta label="Views">{metaViews.toLocaleString()}</Meta>
            </div>
          </div>
        </div>

        {/* ========== STATISTICS (top chart) ========== */}
        <section className="space-y-2">
          <SectionHeader
            title="Statistics"
            right={<RangeToggle value={statsRange} onChange={setStatsRange} />}
            periodLabel={getStatsPeriodLabel(statsData, statsRange)}
          />
          <TelegramStatsChart
            range={statsRange}
            data={statsData}
            onCSV={() => downloadServerCSV("stats", { range: statsRange })}
          />
          <div className="text-xs text-gray-500 leading-tight">
            * Time and date shown in UTC.
            <br />
            ** Click statistics are available as of August 2023.
            <br />
            *** Video open statistics are available as of October 7, 2024.
          </div>
        </section>

        {/* ========== SPENT BUDGET ========== */}
        <section className="space-y-2">
          <SectionHeader
            title=""
            periodLabel={getStatsPeriodLabel(displayedBudgetData, statsRange)}
          />
          <TelegramStatsChart
            kind="budget"
            range={statsRange}
            data={displayedBudgetData}
            onCSV={() => downloadServerCSV("budget", { range: statsRange })}
          />
          <div className="text-xs leading-tight text-gray-500">
            * Time and date shown in UTC.
          </div>
        </section>

        {/* ========== REPORTS TABLE ========== */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
          <h4 className="text-[16px] font-semibold leading-[18px]">Reports</h4>
          <div className="flex items-center gap-1">
          {monthTabs.map((m) => {
            const rawLabel = new Date(m + "-01").toLocaleString("en-US", {
              month: "short",
              year: "2-digit",
              timeZone: "UTC",
            });
            const label = rawLabel.replace(" ", " '");
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`rounded-full px-3 py-[6px] text-[14px] font-medium leading-4 ${
                  selectedMonth === m
                    ? "bg-[#58a6e7] text-white"
                    : "text-[#0288db] hover:bg-[#eaf4fb]"
                }`}
              >
                {label}
              </button>
            );
          })}
          </div>
          </div>

          <div>
          <table className="w-full table-fixed text-[13px] leading-4">
            <thead>
              <tr>
                <th className="w-1/2 border-b border-[#e6e6e6] py-3 text-left text-[12px] font-semibold">DAY</th>
                <th className="w-1/4 border-b border-[#e6e6e6] py-3 text-left text-[12px] font-semibold">VIEWS</th>
                <th className="w-1/4 border-b border-[#e6e6e6] py-3 text-left text-[12px] font-semibold">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.day}>
                  <td className="border-b border-[#ededed] py-[9px]">
                    {new Date(r.day).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="border-b border-[#ededed] py-[9px]">
                    {(r.views ?? 0).toLocaleString()}
                  </td>
                  <td className="border-b border-[#ededed] py-[9px]">
                    € {(r.amount ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="border-b border-[#e6e6e6] py-[11px]">
                  Total in{" "}
                  {new Date(selectedMonth + "-01").toLocaleString("en-US", {
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </td>
                <td className="border-b border-[#e6e6e6] py-[11px]">
                  {reportsTotal.views.toLocaleString()}
                </td>
                <td className="border-b border-[#e6e6e6] py-[11px]">
                  € {reportsTotal.amount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
          <div className="flex justify-end">
          <button
            onClick={() => downloadServerCSV("reports", { month: selectedMonth })}
            className="flex items-center gap-1.5 px-0 py-1 text-[14px] text-[#2481cc] hover:text-[#1a69a5]"
          >
            <span aria-hidden="true">↧</span> CSV
          </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ========= small UI helpers ========= */

function Meta({ label, children }: { label: string; children: any }) {
  return (
    <div className="text-left">
      <div className="font-medium text-[#222]">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function SectionHeader({
  title,
  right,
  periodLabel,
}: {
  title: string;
  right?: React.ReactNode;
  periodLabel?: string;
}) {
  return (
    <div>
      <div className="flex min-h-[28px] items-center justify-between">
        {title && <div className="text-[16px] font-semibold">{title}</div>}
        <div className="flex items-center gap-3">{right}</div>
      </div>
      {periodLabel && (
        <div className="mt-[9px] text-right text-[13px] font-semibold leading-[18px] text-[#222]">
          {periodLabel}
        </div>
      )}
    </div>
  );
}

function RangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex gap-1 text-[14px] font-medium leading-4">
      <button
        onClick={() => onChange("5min")}
        className={`rounded-full px-3 py-[6px] ${
          value === "5min" ? "bg-[#58a6e7] text-white" : "text-[#0288db] hover:bg-[#eaf4fb]"
        }`}
      >
        5 min
      </button>
      <button
        onClick={() => onChange("days")}
        className={`rounded-full px-3 py-[6px] ${
          value === "days" ? "bg-[#58a6e7] text-white" : "text-[#0288db] hover:bg-[#eaf4fb]"
        }`}
      >
        Days
      </button>
    </div>
  );
}

