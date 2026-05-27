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
    <div className="min-h-screen bg-gray-50 border-t">
      <Header />

      <Container>
        {!adId && <div className="border-t border-[#e6e6e6]" />}

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
