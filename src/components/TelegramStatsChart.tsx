import { useEffect, useMemo, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

type Range = "days" | "5min";

type StatsPoint = {
  date?: string;
  ts?: string;
  views: number;
  clicks: number;
  video_opens: number;
};

type SeriesKey = "views" | "video_opens" | "clicks";

const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: "views", label: "Views", color: "#0086d3" },
  { key: "video_opens", label: "Opened video", color: "#65b9ac" },
  { key: "clicks", label: "Clicks", color: "#73c03a" },
];

const numberFormatter = new Intl.NumberFormat("en-US");

function toTimestamp(point: StatsPoint, range: Range) {
  const value = range === "days" ? point.date : point.ts;
  if (!value) return NaN;
  return Date.parse(range === "days" ? `${value}T00:00:00Z` : value);
}

function formatCompact(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) {
    return `${Number((value / 1_000_000).toFixed(1))}M`;
  }
  if (absolute >= 1_000) {
    return `${Number((value / 1_000).toFixed(1))}K`;
  }
  return String(Math.round(value));
}

function formatAxisDate(timestamp: number, range: Range) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    ...(range === "days"
      ? { day: "numeric", month: "short" }
      : { hour: "2-digit", minute: "2-digit", hour12: false }),
  }).format(new Date(timestamp));
}

function formatTooltipDate(timestamp: number, range: Range) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...(range === "5min"
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : {}),
  }).format(new Date(timestamp));
}

function nearestIndex(values: number[], target: number) {
  if (!values.length) return -1;
  let low = 0;
  let high = values.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (values[mid] < target) low = mid + 1;
    else high = mid;
  }
  if (low > 0 && Math.abs(values[low - 1] - target) < Math.abs(values[low] - target)) {
    return low - 1;
  }
  return low;
}

export default function TelegramStatsChart({
  range,
  data,
  onCSV,
}: {
  range: Range;
  data: StatsPoint[];
  onCSV: () => void;
}) {
  const mainRef = useRef<HTMLDivElement | null>(null);
  const navigatorRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<Record<SeriesKey, boolean>>({
    views: true,
    video_opens: true,
    clicks: true,
  });
  const [windowPercent, setWindowPercent] = useState<[number, number]>([0, 100]);
  const [tooltip, setTooltip] = useState<{
    index: number;
    left: number;
    top: number;
  } | null>(null);

  const parsed = useMemo(() => {
    return data
      .map((point) => ({ point, timestamp: toTimestamp(point, range) }))
      .filter((item) => Number.isFinite(item.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data, range]);

  useEffect(() => {
    setWindowPercent(parsed.length > 30 ? [Math.max(0, 100 - (30 / parsed.length) * 100), 100] : [0, 100]);
    setTooltip(null);
  }, [parsed.length, range]);

  const fullData = useMemo(() => {
    const x = parsed.map((item) => item.timestamp / 1000);
    return [
      x,
      parsed.map((item) => Number(item.point.views || 0)),
      parsed.map((item) => Number(item.point.video_opens || 0)),
      parsed.map((item) => Number(item.point.clicks || 0)),
    ] as uPlot.AlignedData;
  }, [parsed]);

  const visibleBounds = useMemo(() => {
    if (!parsed.length) return { start: 0, end: 0 };
    const last = parsed.length - 1;
    const start = Math.max(0, Math.min(last, Math.floor((windowPercent[0] / 100) * last)));
    const end = Math.max(start, Math.min(last, Math.ceil((windowPercent[1] / 100) * last)));
    return { start, end };
  }, [parsed.length, windowPercent]);

  const visibleData = useMemo(() => {
    return fullData.map((series) =>
      series.slice(visibleBounds.start, visibleBounds.end + 1)
    ) as uPlot.AlignedData;
  }, [fullData, visibleBounds]);

  useEffect(() => {
    if (!mainRef.current || visibleData[0].length === 0) return;
    const host = mainRef.current;
    let plot: uPlot | null = null;

    const render = () => {
      plot?.destroy();
      const width = Math.max(320, host.clientWidth);
      const height = Math.max(230, host.clientHeight);
      const stepped = uPlot.paths.stepped?.({ align: 1 });

      const opts: uPlot.Options = {
        width,
        height,
        padding: [8, 8, 0, 0],
        legend: { show: false },
        cursor: {
          show: true,
          x: true,
          y: false,
          points: { show: false },
        },
        scales: {
          x: { time: true },
          y: { auto: true, range: (_u, min, max) => [Math.min(0, min), max * 1.06 || 1] },
        },
        axes: [
          {
            stroke: "#7d7f81",
            size: 34,
            gap: 8,
            font: "12px Roboto, sans-serif",
            grid: { show: false },
            ticks: { show: false },
            values: (_u, values) => values.map((value) => formatAxisDate(value * 1000, range)),
          },
          {
            stroke: "#8e969d",
            size: 48,
            gap: 8,
            font: "12px Roboto, sans-serif",
            grid: { show: true, stroke: "rgba(24, 45, 59, 0.1)", width: 1 },
            ticks: { show: false },
            values: (_u, values) => values.map(formatCompact),
          },
        ],
        series: [
          {},
          {
            label: "Views",
            stroke: SERIES[0].color,
            width: 2,
            show: active.views,
            paths: stepped,
          },
          {
            label: "Opened video",
            stroke: SERIES[1].color,
            width: 2,
            show: active.video_opens,
            paths: stepped,
          },
          {
            label: "Clicks",
            stroke: SERIES[2].color,
            width: 2,
            show: active.clicks,
            paths: stepped,
          },
        ],
        hooks: {
          setCursor: [
            (u) => {
              const idx = u.cursor.idx;
              if (idx == null || u.cursor.left == null || u.cursor.top == null) {
                setTooltip(null);
                return;
              }
              setTooltip({
                index: idx,
                left: Math.max(8, Math.min(width - 184, u.cursor.left + 14)),
                top: Math.max(8, Math.min(height - 105, u.cursor.top - 42)),
              });
            },
          ],
          setSeries: [() => setTooltip(null)],
        },
      };

      plot = new uPlot(opts, visibleData, host);
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(host);
    return () => {
      observer.disconnect();
      plot?.destroy();
    };
  }, [active, range, visibleData]);

  useEffect(() => {
    if (!navigatorRef.current || fullData[0].length === 0) return;
    const host = navigatorRef.current;
    let plot: uPlot | null = null;

    const render = () => {
      plot?.destroy();
      const width = Math.max(320, host.clientWidth);
      const height = Math.max(38, host.clientHeight);
      const stepped = uPlot.paths.stepped?.({ align: 1 });
      plot = new uPlot(
        {
          width,
          height,
          padding: [3, 0, 3, 0],
          legend: { show: false },
          cursor: { show: false },
          select: { show: false },
          axes: [{ show: false }, { show: false }],
          scales: { x: { time: true }, y: { auto: true, range: (_u, min, max) => [Math.min(0, min), max || 1] } },
          series: [
            {},
            { stroke: SERIES[0].color, width: 1, show: active.views, paths: stepped },
            { stroke: SERIES[1].color, width: 1, show: active.video_opens, paths: stepped },
            { stroke: SERIES[2].color, width: 1, show: active.clicks, paths: stepped },
          ],
        },
        fullData,
        host
      );
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(host);
    return () => {
      observer.disconnect();
      plot?.destroy();
    };
  }, [active, fullData]);

  const beginDrag = (
    event: React.PointerEvent,
    mode: "left" | "right" | "window"
  ) => {
    event.preventDefault();
    const rect = navigatorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = event.clientX;
    const original = windowPercent;
    const minimum = parsed.length > 1 ? Math.min(20, Math.max(2, 200 / parsed.length)) : 100;

    const move = (moveEvent: PointerEvent) => {
      const delta = ((moveEvent.clientX - startX) / rect.width) * 100;
      if (mode === "left") {
        setWindowPercent([Math.max(0, Math.min(original[1] - minimum, original[0] + delta)), original[1]]);
      } else if (mode === "right") {
        setWindowPercent([original[0], Math.min(100, Math.max(original[0] + minimum, original[1] + delta))]);
      } else {
        const width = original[1] - original[0];
        const left = Math.max(0, Math.min(100 - width, original[0] + delta));
        setWindowPercent([left, left + width]);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  const toggleSeries = (key: SeriesKey) => {
    const enabledCount = Object.values(active).filter(Boolean).length;
    if (active[key] && enabledCount === 1) return;
    setActive((current) => ({ ...current, [key]: !current[key] }));
  };

  const tooltipIndex =
    tooltip == null ? -1 : visibleBounds.start + tooltip.index;
  const tooltipPoint = tooltipIndex >= 0 ? parsed[tooltipIndex] : null;

  return (
    <div className="telegram-stats-chart">
      <div className="relative h-[300px] w-full" onMouseLeave={() => setTooltip(null)}>
        <div ref={mainRef} className="h-full w-full" />
        {tooltip && tooltipPoint && (
          <div
            className="pointer-events-none absolute z-20 min-w-[172px] rounded-[10px] bg-white px-3 pb-1 pt-2 shadow-[0_1px_5px_rgba(0,0,0,0.135)]"
            style={{ left: tooltip.left, top: tooltip.top }}
          >
            <div className="mb-1.5 text-[13px] font-bold tracking-[-0.015em]">
              {formatTooltipDate(tooltipPoint.timestamp, range)}
            </div>
            {SERIES.map((series) =>
              active[series.key] ? (
                <div key={series.key} className="mb-[7px] flex h-[14px] items-center justify-between gap-5 text-[13px]">
                  <span>{series.label}</span>
                  <strong style={{ color: series.color }}>
                    {numberFormatter.format(Number(tooltipPoint.point[series.key] || 0)).replace(/,/g, "\u00a0")}
                  </strong>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      <div className="relative mx-4 mt-1 h-10 overflow-hidden rounded-[8px] bg-[#edf4f8]">
        <div ref={navigatorRef} className="absolute inset-0 opacity-45" />
        <div
          className="absolute inset-y-0 bg-white/45"
          style={{ left: 0, width: `${windowPercent[0]}%` }}
        />
        <div
          className="absolute inset-y-0 bg-white/45"
          style={{ left: `${windowPercent[1]}%`, right: 0 }}
        />
        <div
          className="absolute inset-y-0 cursor-grab border-y border-[#9ebbd0] active:cursor-grabbing"
          style={{
            left: `${windowPercent[0]}%`,
            width: `${windowPercent[1] - windowPercent[0]}%`,
          }}
          onPointerDown={(event) => beginDrag(event, "window")}
        />
        <button
          type="button"
          aria-label="Resize statistics range from the left"
          className="absolute inset-y-0 z-10 w-[10px] -translate-x-1/2 cursor-col-resize rounded-l-[5px] border border-[#a8bfd1] bg-[#bdd0df] after:absolute after:left-[4px] after:top-[13px] after:h-3 after:w-px after:bg-white"
          style={{ left: `${windowPercent[0]}%` }}
          onPointerDown={(event) => beginDrag(event, "left")}
        />
        <button
          type="button"
          aria-label="Resize statistics range from the right"
          className="absolute inset-y-0 z-10 w-[10px] -translate-x-1/2 cursor-col-resize rounded-r-[5px] border border-[#a8bfd1] bg-[#bdd0df] after:absolute after:left-[4px] after:top-[13px] after:h-3 after:w-px after:bg-white"
          style={{ left: `${windowPercent[1]}%` }}
          onPointerDown={(event) => beginDrag(event, "right")}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 px-4">
        <div className="flex flex-wrap gap-x-1.5">
          {SERIES.map((series) => (
            <button
              type="button"
              key={series.key}
              onClick={() => toggleSeries(series.key)}
              className="relative mb-2 h-9 rounded-[18px] px-[22px] text-sm font-medium tracking-[-0.035em] transition-colors"
              style={{
                color: active[series.key] ? "#fff" : series.color,
                backgroundColor: active[series.key] ? series.color : "transparent",
                boxShadow: `inset 0 0 0 2px ${series.color}`,
                paddingLeft: active[series.key] ? 30 : 22,
              }}
            >
              {active[series.key] && (
                <span className="absolute left-[9px] top-[9px] text-base leading-none">✓</span>
              )}
              {series.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCSV}
          className="mt-2 flex items-center gap-1.5 text-[14px] text-[#2481cc] hover:text-[#1a69a5]"
        >
          <span aria-hidden="true" className="text-[15px]">↧</span>
          CSV
        </button>
      </div>
    </div>
  );
}

export function getStatsPeriodLabel(data: StatsPoint[], range: Range) {
  const timestamps = data
    .map((point) => toTimestamp(point, range))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!timestamps.length) return "";
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(timestamps[0]))} – ${formatter.format(
    new Date(timestamps[timestamps.length - 1])
  )}`;
}
