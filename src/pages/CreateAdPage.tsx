import { useEffect, useState } from "react";
import Header from "../components/Header";
import Container from "../components/Container";
import ChannelAdForm from "../forms/ChannelAdForm";
import UserAdForm from "../forms/UserAdForm";
import BotAdForm from "../forms/BotAdForm";
import SearchAdForm from "../forms/SearchAdForm";
import TabBar from "../components/TabBar";
import { useAdId } from "../hooks/useAdId";
import { fetchCampaignById } from "../lib/campaignApi";

type TargetTab = "search" | "bots" | "users" | "channels";

const hasItems = (value: unknown) =>
  Array.isArray(value) ? value.length > 0 : Boolean(value);

const tabFromCampaign = (campaign?: any): TargetTab => {
  const normalized = (campaign?.type || "").toLowerCase();
  if (normalized === "search") return "search";
  if (normalized === "bot" || normalized === "bots") return "bots";
  if (normalized === "user" || normalized === "users") return "users";
  if (normalized === "channel" || normalized === "channels") return "channels";

  const target = typeof campaign?.target === "string" ? campaign.target : "";
  if (target && !/t\.me\/|@/.test(target.toLowerCase())) return "search";
  if (hasItems(campaign?.locations) || hasItems(campaign?.countries)) return "users";
  if (hasItems(campaign?.langs) || hasItems(campaign?.topics) || hasItems(campaign?.channels)) {
    return "channels";
  }

  return "channels";
};

export default function CreateAdPage() {
  const [activeTab, setActiveTab] = useState<TargetTab>("channels");
  const [subTab, setSubTab] = useState<"edit" | "stats">("edit");
  const adId = useAdId();

  useEffect(() => {
    if (!adId) {
      setActiveTab("channels");
      return;
    }

    const loadCampaignType = async () => {
      try {
        const data = await fetchCampaignById(adId);
        setActiveTab(tabFromCampaign(data));
      } catch (error) {
        console.error("Failed to load campaign type:", error);
      }
    };

    loadCampaignType();
  }, [adId]);

  return (
    <div className="min-h-screen bg-white border-t">
      <Header />

      <Container>
        <div className="border-t border-[#e6e6e6]" />

        {!adId && (
          <div className="mt-6 mb-4 flex flex-wrap items-center justify-between">
            <h4 className="text-[19.5px] leading-[27px] font-semibold tracking-[-0.2px] text-[#212121]">
              Create Your Ad
            </h4>

            <div className="flex flex-wrap items-center gap-2 text-[14px]">
              <span className="font-medium text-gray-700">Target:</span>
              {(["search", "bots", "users", "channels"] as TargetTab[]).map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full border px-3 py-[4px] text-sm font-medium transition-all duration-150 ${
                      activeTab === tab
                        ? "border-[#22A3F5] bg-[#22A3F5] text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-[#22A3F5] hover:text-[#22A3F5]"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {adId && (
          <TabBar adId={adId} activeTab={subTab} onTabChange={setSubTab} />
        )}

        <div className="mt-6">
          {activeTab === "channels" && <ChannelAdForm />}
          {activeTab === "users" && <UserAdForm />}
          {activeTab === "bots" && <BotAdForm />}
          {activeTab === "search" && <SearchAdForm />}
        </div>
      </Container>
    </div>
  );
}
