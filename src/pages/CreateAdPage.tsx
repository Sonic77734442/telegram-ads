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
  const [activeTab, setActiveTab] = useState<TargetTab>("search");
  const [subTab, setSubTab] = useState<"edit" | "stats">("edit");
  const adId = useAdId();

  useEffect(() => {
    if (!adId) {
      setActiveTab("search");
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
    <div className="min-h-screen bg-white">
      <Header />

      <Container>
        <div className="border-t border-[#e6e6e6]" />

        {!adId && (
          <div className="mb-[10px] mt-[16px] flex h-[27px] items-stretch justify-between">
            <h4 className="h-[27px] w-[330px] px-[13px] pb-[3px] pt-[5px] text-[16px] font-bold leading-[19px] text-[#222]">
              Create Your Ad
            </h4>

            <div className="flex h-[27px] items-stretch text-[14px] leading-[16px]">
              <span className="px-[4px] pb-[5px] pt-[6px] font-medium text-[#222]">
                Target:
              </span>
              {(["search", "bots", "users", "channels"] as TargetTab[]).map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`ml-[5px] h-[27px] rounded-[14px] px-[12px] text-[14px] font-bold leading-[18px] transition-colors ${
                      activeTab === tab
                        ? "bg-[#119af5] text-white"
                        : "bg-white text-[#5288b1] hover:text-[#0278c1]"
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
          <div className="mt-6">
            <TabBar adId={adId} activeTab={subTab} onTabChange={setSubTab} />
          </div>
        )}

        <div className={adId ? "mt-[15px]" : ""}>
          {activeTab === "channels" && <ChannelAdForm />}
          {activeTab === "users" && <UserAdForm />}
          {activeTab === "bots" && <BotAdForm />}
          {activeTab === "search" && <SearchAdForm />}
        </div>
      </Container>
    </div>
  );
}
