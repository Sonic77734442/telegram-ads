import { useEffect, useState } from "react";
import Header from "../components/Header";
import Container from "../components/Container";
import ChannelAdForm from "../forms/ChannelAdForm";
import UserAdForm from "../forms/UserAdForm";
import BotAdForm from "../forms/BotAdForm";
import SearchAdForm from "../forms/SearchAdForm";
import TabBar from "../components/TabBar";
import { supabase } from "../supabaseClient";
import { useAdId } from "../hooks/useAdId";

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
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("type,target,locations,countries,langs,topics,channels")
        .eq("id", adId)
        .maybeSingle();

      if (!error) {
        setActiveTab(tabFromCampaign(data));
      }
    };

    loadCampaignType();
  }, [adId]);

  return (
    <div className="min-h-screen bg-gray-50 border-t">
      <Header />

      <Container>
        <div className="flex flex-wrap items-center justify-between mt-6 mb-4">
          <h4 className="text-[19.5px] leading-[27px] font-semibold text-[#212121] tracking-[-0.2px]">
            {adId ? "Edit Advertisement" : "Create Your Ad"}
          </h4>

          <div className="flex items-center flex-wrap gap-2 text-[14px]">
            <span className="text-gray-700 font-medium">Target:</span>
            {(["search", "bots", "users", "channels"] as TargetTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-[4px] rounded-full border text-sm font-medium transition-all duration-150 ${
                    activeTab === tab
                      ? "bg-[#2AABEE] text-white border-[#2AABEE]"
                      : "bg-white text-gray-700 border-gray-300 hover:border-[#2AABEE] hover:text-[#2AABEE]"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

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
