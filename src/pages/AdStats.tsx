import { useEffect, useMemo, useState, useContext, useRef } from "react";
import TelegramAdPreview from "../components/TelegramAdPreview";
import { supabase } from "../supabaseClient";
import { AdIdContext } from "./AdPageLayout";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

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
  const [budgetRange, setBudgetRange] = useState<Range>("days");
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
    for (let i = 5; i >= 0; i--) {
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
      const baseAmount = Number(r.amount_client ?? r.amount ?? 0);
      return {
        day: r.day,
        views: Number(r.views || 0),
        amount: baseAmount,
      };
    }) as ReportRow[];
  };

  const loadReportForStatsChart = async () => {
    const months = monthTabs.includes(selectedMonth)
      ? monthTabs
      : [...monthTabs, selectedMonth];
    const reportsByMonth = await Promise.all(
      months.map((month) => loadMonthlyReport(month).catch(() => []))
    );

    return reportsByMonth
      .flat()
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((row) => ({
        date: row.day,
        views: Number(row.views || 0),
        clicks: 0,
        video_opens: 0,
      }));
  };

  const reportsTotal = useMemo(
    () => ({
      views: reports.reduce((s, r) => s + (r.views || 0), 0),
      amount: reports.reduce((s, r) => s + (r.amount || 0), 0),
    }),
    [reports]
  );
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

    const loadAdFromCampaignsApi = async () => {
      const role = localStorage.getItem("role") || "client";
      const clientId = localStorage.getItem("user_id") || "";
      const agencyId = localStorage.getItem("agency_id") || "";
      const params = new URLSearchParams({ mode: role });

      if (role === "client" && clientId) params.set("client_id", clientId);
      if (role === "agency" && agencyId) params.set("agency_id", agencyId);

      const resp = await fetch(`/api/campaigns?${params.toString()}`);
      const json = await resp.json();

      if (!resp.ok || json.error) {
        throw new Error(json.error || `Campaigns API failed (${resp.status})`);
      }

      return (json.data || []).find((campaign: any) => campaign.id === adId) || null;
    };

    (async () => {
      setAdLoadError(null);
      setAd(null);

      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("id", adId)
        .maybeSingle();

      if (!error && data) {
        setAd(normalizeAd(data));
        return;
      }

      if (error) {
        console.warn("direct ad meta load failed; falling back to API:", error);
      }

      try {
        const apiAd = await loadAdFromCampaignsApi();
        if (apiAd) {
          setAd(normalizeAd(apiAd));
          return;
        }

        setAdLoadError("This ad is unavailable or you do not have access to it.");
      } catch (apiError) {
        console.error("load ad meta from campaigns API failed:", apiError);
        setAdLoadError("Failed to load ad details.");
      }
    })();
  }, [adId]);

  // load statistics chart
  useEffect(() => {
    if (!adId) return;
    (async () => {
      const fn = statsRange === "days" ? "get_daily_ad_stats" : "get_5min_ad_stats";
      const { data, error } = await supabase.rpc(fn, { input_ad_id: adId });
      if (error) {
        console.error("stats rpc error:", error);
        if (statsRange === "days") {
          setStatsData(await loadReportForStatsChart());
          return;
        }
        setStatsData([]);
        return;
      }
      const normalized = (data || []).map((r: any) => ({
        ...(statsRange === "days" ? { date: r.date } : { ts: r.ts }),
        views: Number(r.views ?? 0),
        clicks: Number(r.clicks ?? 0),
        video_opens: Number(r.video_opens ?? 0),
      }));
      setStatsData(
        normalized.length === 0 && statsRange === "days"
          ? await loadReportForStatsChart()
          : normalized
      );
    })();
  }, [adId, statsRange, monthTabs, selectedMonth]);

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


  // csv helpers
  const downloadCSV = (rows: any[], fileName: string) => {
  if (!rows?.length) return;

  const separator = ";"; // под Windows/Excel на русском нужен ;

  const headers = Object.keys(rows[0]);

  const csvLines: string[] = [];

  // заголовок
  csvLines.push(headers.join(separator));

  // строки
  for (const row of rows) {
    const line = headers
      .map((h) => {
        const raw = row[h] ?? "";
        const value = String(raw).replace(/"/g, '""'); // эскейпим кавычки
        return `"${value}"`; // каждое значение в кавычках
      })
      .join(separator);
    csvLines.push(line);
  }

  const csv = csvLines.join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    // BOM чтобы Excel нормально понял UTF-8
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};


  // экспорт для клиента из v_ad_export_client_flat
  const exportClientReport = async () => {
    if (!adId) return;
    const { data, error } = await supabase
      .from("v_ad_export_client_flat")
      .select(
        `"Ad ID","Title","Date","Views","Opens","Clicks","Joins","CPC","CTR","CPA","CPO","Spent Budget"`
      )
      .eq("ad_id", adId); // служебная колонка из view

    if (error) {
      console.error("client export error:", error.message);
      return;
    }
    if (!data || !data.length) {
      alert("Нет данных для экспорта");
      return;
    }
    downloadCSV(data as any[], `ad_${adId}_client_report.csv`);
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
      <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-10">
        {/* ========== Card with preview & meta ========== */}
        <div className="grid grid-cols-1 md:grid-cols-[320px,1fr] gap-6">
          <div className="justify-self-center md:justify-self-start">
            <div className="w-[280px]">
              <TelegramAdPreview
                title={ad.title}
                text={ad.text}
                mediaUrl={ad.mediaUrl}
                mediaType={ad.mediaType}
                button={ad.button}
              />
            </div>
          </div>
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
			  {/* Link на всю строку */}
			  <div className="col-span-2 md:col-span-3 text-left">
				<div className="text-gray-500">Link</div>
				<a
				  href={ad.url?.startsWith("http") ? ad.url : `https://${ad.url}`}
				  className="text-blue-600 hover:underline break-all"
				  target="_blank"
				  rel="noreferrer"
				>
				  {ad.url}
				</a>
			  </div>
            <Meta label="Date created">
              {ad.createdAt ? new Date(ad.createdAt).toUTCString() : "Unknown"}
            </Meta>
            <Meta label="CPM">€ {displayCpm}</Meta>
            <Meta label="Budget">€ {displayBudget}</Meta>
            <Meta label="Views">{metaViews.toLocaleString()}</Meta>
          </div>
        </div>

        {/* ========== STATISTICS (top chart) ========== */}
        <SectionHeader
          title="Statistics"
          right={<RangeToggle value={statsRange} onChange={setStatsRange} />}
          periodLabel={periodLabel()}
        />
        <ChartContainer>
          <UPlotChart range={statsRange} data={statsData} />
        </ChartContainer>
        <UnderChartBar
          leftBadges={["Views", "Opened video", "Clicks"]}
          onCSV={() => downloadCSV(statsData as any[], `stats_${statsRange}.csv`)}
        />
        <div className="text-xs text-gray-500 leading-tight">
          * Time and date shown in UTC.
          <br />
          ** Click statistics are available as of August 8, 2023.
          <br />
          *** Video open statistics are available as of October 7, 2023.
        </div>

        {/* ========== REPORTS TABLE ========== */}
        <div className="flex items-center gap-3 justify-end">
          {monthTabs.map((m) => {
            const label = new Date(m + "-01").toLocaleString("en-US", {
              month: "short",
              year: "2-digit",
              timeZone: "UTC",
            });
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 rounded-full ${
                  selectedMonth === m
                    ? "bg-blue-500 text-white"
                    : "text-blue-700 hover:bg-blue-100"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">DAY</th>
                <th className="px-4 py-2 text-right">VIEWS</th>
                <th className="px-4 py-2 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.day} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(r.day).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {(r.views ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    € {(r.amount ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="px-4 py-2">
                  Total in{" "}
                  {new Date(selectedMonth + "-01").toLocaleString("en-US", {
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </td>
                <td className="px-4 py-2 text-right">
                  {reportsTotal.views.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">
                  € {reportsTotal.amount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex justify-end">
          <button
            onClick={
              role === "client"
                ? exportClientReport
                : () => downloadCSV(reports as any[], `reports_${selectedMonth}.csv`)
            }
            className="text-blue-700 hover:bg-blue-100 rounded-full px-3 py-1 text-sm"
          >
            CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function UPlotChart({
  range,
  data,
}: {
  range: Range;
  data: (StatPointDay | StatPoint5m)[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);

  const chartData = useMemo(() => {
    const x: number[] = [];
    const views: number[] = [];
    const opens: number[] = [];
    const clicks: number[] = [];

    for (const point of data) {
      const key =
        range === "days"
          ? (point as StatPointDay).date
          : (point as StatPoint5m).ts;
      const ts = Date.parse(range === "days" ? `${key}T00:00:00Z` : key);
      if (Number.isNaN(ts)) continue;
      x.push(ts);
      views.push(Number(point.views ?? 0));
      opens.push(Number(point.video_opens ?? 0));
      clicks.push(Number(point.clicks ?? 0));
    }

    return [x, views, opens, clicks] as uPlot.AlignedData;
  }, [data, range]);

  useEffect(() => {
    if (!containerRef.current) return;

    const render = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth || 600;
      const height = containerRef.current.clientHeight || 300;

      const opts: uPlot.Options = {
        width,
        height,
        scales: { x: { time: true } },
        axes: [
          {
            grid: { show: true, stroke: "#e5e7eb", width: 1 },
            stroke: "#9ca3af",
            values: (_, vals) =>
              vals.map((v) =>
                range === "days"
                  ? new Date(v).toISOString().slice(5, 10)
                  : new Date(v).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
              ),
          },
          {
            grid: { show: true, stroke: "#e5e7eb", width: 1 },
            stroke: "#9ca3af",
          },
        ],
        series: [
          {},
          { label: "Views", stroke: "#007bff", width: 2 },
          { label: "Opened video", stroke: "#34d399", width: 2 },
          { label: "Clicks", stroke: "#10b981", width: 2 },
        ],
      };

      plotRef.current?.destroy();
      plotRef.current = new uPlot(opts, chartData, containerRef.current);
    };

    render();

    const ro = new ResizeObserver(() => {
      render();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [chartData, range]);

  return <div ref={containerRef} className="h-full w-full" />;
}

/* ========= small UI helpers ========= */

function Meta({ label, children }: { label: string; children: any }) {
  return (
    <div className="text-left">
      <div className="text-gray-500">{label}</div>
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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {title && <div className="text-lg font-semibold">{title}</div>}
        <div className="hidden md:block text-sm text-gray-500">{periodLabel}</div>
      </div>
      <div className="flex items-center gap-3">{right}</div>
    </div>
  );
}

function ChartContainer({ children }: { children: React.ReactNode }) {
  return <div className="h-[300px] w-full">{children}</div>;
}

function RangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex gap-2 text-sm">
      <button
        onClick={() => onChange("5min")}
        className={`px-3 py-1 rounded-full ${
          value === "5min" ? "bg-blue-500 text-white" : "text-blue-700 hover:bg-blue-100"
        }`}
      >
        5 min
      </button>
      <button
        onClick={() => onChange("days")}
        className={`px-3 py-1 rounded-full ${
          value === "days" ? "bg-blue-500 text-white" : "text-blue-700 hover:bg-blue-100"
        }`}
      >
        Days
      </button>
    </div>
  );
}

function UnderChartBar({
  leftBadges,
  leftButtonLabel,
  extraRight,
  onCSV,
}: {
  leftBadges?: string[];
  leftButtonLabel?: string;
  extraRight?: React.ReactNode;
  onCSV: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-2">
        {leftBadges?.map((b) => (
          <span
            key={b}
            className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700"
          >
            {b}
          </span>
        ))}
        {leftButtonLabel && (
          <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700">
            {leftButtonLabel}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {extraRight}
        <button
          onClick={onCSV}
          className="text-blue-700 hover:bg-blue-100 rounded-full px-3 py-1 text-sm"
        >
          CSV
        </button>
      </div>
    </div>
  );
}

function periodLabel() {
  // декоративная подпись "10 November 2025 – 25 November 2025"
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 3);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}
