import { useEffect, useState, useContext } from "react";
import TelegramAdPreview from "../components/TelegramAdPreview";
import { supabase } from "../supabaseClient";
import Header from "../components/Header";
import Container from "../components/Container";
import TabBar from "../components/TabBar";
import { AdIdContext } from "./AdPageLayout";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdStats() {
  const adId = useContext(AdIdContext);
  const [ad, setAd] = useState<any>(null);
  const [range, setRange] = useState<"5min" | "days">("days");
  const [activeTab, setActiveTab] = useState<"edit" | "stats">("stats");
  const [statsData, setStatsData] = useState<any[]>([]);

  useEffect(() => {
    if (!adId) return;

    const fetchAd = async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("id", adId)
        .single();

      if (error) {
        console.error("Ошибка загрузки кампании:", error);
        return;
      }

      if (data) {
        const parsed = data.raw ? (() => {
          try {
            return JSON.parse(data.raw);
          } catch (e) {
            console.warn("❗ Ошибка парсинга raw:", e);
            return {};
          }
        })() : {};

        setAd({
          ...parsed,
          title: data.title,
          text: data.text,
          url: data.url,
          button: data.button,
          mediaUrl: data.media_url,
          mediaType: data.media_type,
          cpm: data.cpm,
          budget: data.budget,
          views: data.views,
          createdAt: data.created_at,
        });
      }
    };

const fetchStats = async () => {
  const { data, error } = await supabase.rpc("get_daily_ad_stats", {
    input_ad_id: adId,
  });

  if (error) {
    console.error("Ошибка загрузки статистики:", error);
    return;
  }

  setStatsData(data);
};



    fetchAd();
    fetchStats();
  }, [adId]);

  if (!adId) return <div className="p-4">⚠️ No ad ID</div>;
  if (!ad) return <div className="p-4">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col items-center justify-center gap-6 py-8 text-center">
        {/* Preview + meta */}
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-[280px]">
            <TelegramAdPreview
              title={ad.title}
              text={ad.text}
              mediaUrl={ad.mediaUrl}
              mediaType={ad.mediaType}
              button={ad.button}
            />
          </div>

          <div className="flex flex-col text-sm items-start">
            <div>
              <div className="text-gray-500">Link</div>
			  <a
			  href={ad.url.startsWith("http") ? ad.url : `https://${ad.url}`}
			  className="text-blue-600 hover:underline"
			  target="_blank"
			  rel="noopener noreferrer"
			   >
			  {ad.url}
			</a>
            </div>
            <div>
              <div className="text-gray-500">Date created</div>
              <div>{ad.createdAt ? new Date(ad.createdAt).toUTCString() : "Unknown"}</div>
            </div>
            <div>
              <div className="text-gray-500">CPM</div>
              <div>⋯ {ad.cpm}</div>
            </div>
            <div>
              <div className="text-gray-500">Budget</div>
              <div>⋯ {ad.budget}</div>
            </div>
            <div>
              <div className="text-gray-500">Views</div>
              <div>{ad.views}</div>
            </div>
          </div>
        </div>

        {/* Диапазон времени */}
        <div className="flex items-center justify-between mt-6 w-full max-w-3xl">
          <div className="text-lg font-semibold">Statistics</div>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setRange("5min")}
              className={`px-3 py-1 rounded-full ${
                range === "5min" ? "bg-blue-500 text-white" : "text-blue-700 hover:bg-blue-100"
              }`}
            >
              5 min
            </button>
            <button
              onClick={() => setRange("days")}
              className={`px-3 py-1 rounded-full ${
                range === "days" ? "bg-blue-500 text-white" : "text-blue-700 hover:bg-blue-100"
              }`}
            >
              Days
            </button>
          </div>
        </div>

        {/* График */}
			<div className="h-[300px] w-full max-w-3xl">
			  {statsData.length > 0 ? (
				<ResponsiveContainer width="100%" height="100%">
				  <LineChart data={statsData}>
					<CartesianGrid stroke="#ccc" />
					<XAxis dataKey="date" tickFormatter={(date) => date.slice(5, 10)} />
					<YAxis />
					<Tooltip />
					<Line type="monotone" dataKey="daily_views" stroke="#ff7300" name="Views per Day" />
					<Line type="monotone" dataKey="daily_clicks" stroke="#00c49f" name="Clicks per Day" />
				  </LineChart>
				</ResponsiveContainer>
			  ) : (
				<div className="flex justify-center items-center h-full text-sm text-gray-400">
				  Not enough data to display.
				</div>
			  )}
			</div>

        {/* Подсказки */}
        <div className="text-xs text-gray-500 leading-tight mt-2 max-w-3xl text-left">
          <p>* Time and date shown in local format.</p>
          <p>** Stats are synced from your admin dashboard.</p>
        </div>
      </div>
    </div>
  );
}
