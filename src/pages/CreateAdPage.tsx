import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Container from "../components/Container";
import ChannelAdForm from "../forms/ChannelAdForm";
import UserAdForm from "../forms/UserAdForm";
import BotAdForm from "../forms/BotAdForm";
import TabBar from "../components/TabBar"; // ✅ добавляем TabBar

export default function CreateAdPage() {
  const [activeTab, setActiveTab] = useState<"search" | "bots" | "users" | "channels">("channels");
  const [subTab, setSubTab] = useState<"edit" | "stats">("edit"); // ✅ для TabBar
  const [adId, setAdId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setAdId(id);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 border-t">
      <Header />

      <Container>
        {/* Верхняя панель с заголовком и переключателями */}
        <div className="flex flex-wrap items-center justify-between mt-6 mb-4">
          <h4 className="text-[19.5px] leading-[27px] font-semibold text-[#212121] tracking-[-0.2px]">
            {adId ? "Edit Advertisement" : "Create Your Ad"}
          </h4>

          <div className="flex items-center flex-wrap gap-2 text-[14px]">
            <span className="text-gray-700 font-medium">Target:</span>
            {["search", "bots", "users", "channels"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 py-[4px] rounded-full border text-sm font-medium transition-all duration-150 ${
                  activeTab === tab
                    ? "bg-[#2AABEE] text-white border-[#2AABEE]"
                    : "bg-white text-gray-700 border-gray-300 hover:border-[#2AABEE] hover:text-[#2AABEE]"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ Вкладки “Information” и “Statistics” показываем только если есть adId */}
        {adId && <TabBar adId={adId} activeTab={subTab} onTabChange={setSubTab} />}

        {/* Контент */}
        <div className="mt-6">
          {activeTab === "channels" && <ChannelAdForm />}
          {activeTab === "users" && <UserAdForm />}
          {activeTab === "bots" && <BotAdForm />}
          {activeTab === "search" && (
            <div className="bg-white p-6 rounded-md text-gray-600 text-sm shadow-sm">
              <p>Search targeting form — coming soon.</p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
