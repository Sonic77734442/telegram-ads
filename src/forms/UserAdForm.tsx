import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Container from "../components/Container";
import MultiSelect from "../components/MultiSelect";
import TagInput from "../components/TagInput";
import TelegramAdPreview from "../components/TelegramAdPreview";
import { supabase } from "../supabaseClient";
import { useAdId } from "../hooks/useAdId";
import { fetchCampaignById } from "../lib/campaignApi";

/* ──────────────── constants ──────────────── */
const LANGS = ["English", "Russian", "Uzbek"];
const TOPICS = [
  "Art & Design",
  "Bets & Gambling",
  "Books",
  "Business & Entrepreneurship",
  "Cars & Other Vehicles",
  "Celebrities & Lifestyle",
  "Cryptocurrencies",
  "Culture & Events",
  "Curious Facts",
  "Directories of Channels & Bots",
  "Economy & Finance",
  "Education",
  "Fashion & Beauty",
  "Fitness",
  "Food & Cooking",
  "Foreign Language Learning",
  "Health & Medicine",
  "History",
  "Humor & Memes",
  "Investments",
  "Job Listing",
  "Kids & Parenting",
  "Marketing & PR",
  "Motivation & Self-Development",
  "Movies",
  "Music",
  "Offers & Promotion",
  "Pets",
  "Politics & Incidents",
  "Psychology & Relationships",
  "Real Estate",
  "Recreation & Entertainment",
  "Religion & Spirituality",
  "Science",
  "Sports",
  "Technology & Internet",
  "Travel & Tourism",
  "Video Games",
  "Other",
];
const DEVICES = ["All devices", "Mobile", "Desktop", "iOS", "Android"];
const COUNTRIES = ["Kazakhstan", "Uzbekistan", "Russia", "Armenia", "Other"];
const AUDIENCES = ["Crypto traders", "Gamers", "Investors", "Developers", "Marketing professionals"];
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  Kazakhstan: ["Almaty", "Astana", "Shymkent", "Karaganda", "Atyrau", "Aktau", "Kostanay"],
  Uzbekistan: ["Tashkent", "Samarkand", "Bukhara", "Namangan", "Andijan", "Fergana", "Nukus"],
  Russia: ["Moscow", "Saint Petersburg", "Kazan", "Novosibirsk", "Yekaterinburg", "Sochi"],
  Armenia: ["Yerevan", "Gyumri", "Vanadzor"],
  Other: [],
};
const AD_BUTTON_OPTIONS = [
  "OPEN WEBSITE",
  "SUBSCRIBE",
  "VIEW",
  "READ",
  "LEARN MORE",
  "DOWNLOAD",
  "OPEN",
  "SIGN UP",
  "BUY",
  "ORDER",
  "PLAY",
  "TRY",
  "LEAVE A REQUEST",
];
const MEDIA_BUTTON_ICON =
  "data:image/svg+xml,%3Csvg%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20width%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%3Cmask%20id%3D%22a%22%20fill%3D%22%23fff%22%3E%3Cpath%20d%3D%22m20%200v20h-20v-20zm-4%20.15h-.14c-1.08%200-1.95.87-1.95%201.95v.03h-.9c-1.07%200-1.95.87-1.95%201.95v.14c0%201.08.88%201.95%201.95%201.95h.9v.9c0%201.07.87%201.94%201.95%201.94h.14c1.08%200%201.95-.87%201.95-1.94v-.9h.03c1.07%200%201.94-.87%201.94-1.95v-.14c0-1.08-.87-1.95-1.94-1.95h-.03v-.03c0-1.08-.87-1.95-1.95-1.95z%22%20fill%3D%22%23fff%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fmask%3E%3Cg%20fill%3D%22%23fff%22%20fill-rule%3D%22evenodd%22%3E%3Crect%20height%3D%227.28%22%20rx%3D%22.79%22%20width%3D%221.58%22%20x%3D%2215.14%22%20y%3D%22.51%22%2F%3E%3Crect%20height%3D%221.58%22%20rx%3D%22.79%22%20width%3D%227.28%22%20x%3D%2212.29%22%20y%3D%223.36%22%2F%3E%3Cpath%20d%3D%22m13.24%202.69c2.1%200%203.8%201.69%203.8%203.79v7.59c0%202.1-1.7%203.8-3.8%203.8h-7.59c-2.1%200-3.8-1.7-3.8-3.8v-7.59c0-2.1%201.7-3.79%203.8-3.79zm-1.21%207.19c-.17-.23-.51-.23-.69-.01l-2.5%202.74c-.12.13-.32.14-.44.02l-1.64-1.51c-.18-.21-.51-.2-.67.02l-1.85%202.74c-.23.28-.23%201.31.65%201.31h9.21c.8%200%20.8-1.02.58-1.31z%22%20mask%3D%22url%28%23a%29%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";


/* ──────────────── component ──────────────── */
export default function ChannelAdForm() {
  const navigate = useNavigate();
  const adId = useAdId();

  /* form state */
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [websiteName, setWebsiteName] = useState("");
  const [showUserPic, setShowUserPic] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [adButton, setAdButton] = useState("OPEN WEBSITE");
  const [placement, setPlacement] = useState<"message" | "banner">("message");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cpm, setCpm] = useState("0.00");
  const [budget, setBudget] = useState("0.00");
  const [dailyBudget, setDailyBudget] = useState("0.00");
  const [dailyViews, setDailyViews] = useState(1);
  const [status, setStatus] = useState<"active" | "hold">("hold");
  const [schedule, setSchedule] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [otherInfo, setOtherInfo] = useState("");
  const [conversionEvent, setConversionEvent] = useState("");
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const clientId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const [markupPercent, setMarkupPercent] = useState(0);
  const [markupLoaded, setMarkupLoaded] = useState(role !== "client");
  const multiplier = role === "client" && markupPercent > 0 ? 1 + markupPercent / 100 : 1;

  const [countries, setCountries] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [exTopics, setExTopics] = useState<string[]>([]);
  const [targetChannels, setTargetChannels] = useState<string[]>([]);
  const [audiences, setAudiences] = useState<string[]>([]);
  const [excludeChannels, setExcludeChannels] = useState<string[]>([]);
  const [devices, setDevices] = useState<string[]>(["All devices"]);
  const [politicsOnly, setPoliticsOnly] = useState(false);
  const [excludePolitics, setExcludePolitics] = useState(false);
  		/* ──────────────── date schedule states ──────────────── */
const [showDatePicker, setShowDatePicker] = useState(false);
const [startDate, setStartDate] = useState<string>("");
const [endDate, setEndDate] = useState<string>("");
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Load client markup to show CPM/budget with markup for client role.
  useEffect(() => {
    const loadMarkup = async () => {
      if (role !== "client" || !clientId) {
        setMarkupLoaded(true);
        return;
      }

      const { data, error } = await supabase
        .from("client_balances")
        .select("markup_percent")
        .eq("client_id", clientId)
        .maybeSingle();

      if (!error && data && typeof data.markup_percent === "number") {
        setMarkupPercent(Number(data.markup_percent) || 0);
      }
      setMarkupLoaded(true);
    };

    loadMarkup();
  }, [role, clientId]);

  const applyMarkupForInput = (baseValue: any) => {
    const num = Number(baseValue || 0);
    return role === "client" ? (num * multiplier).toFixed(2) : num.toFixed(2);
  };

  const resolveValueForInput = (valueWithMarkup: any, baseValue: any) => {
    if (role === "client") {
      if (valueWithMarkup !== undefined && valueWithMarkup !== null) {
        return Number(valueWithMarkup || 0).toFixed(2);
      }
      return applyMarkupForInput(baseValue);
    }
    const effective = valueWithMarkup ?? baseValue ?? 0;
    return Number(effective || 0).toFixed(2);
  };


  /* upload */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filePath = `ads/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(filePath, file, { contentType: file.type });

    if (!error) {
      const url = supabase.storage.from("media").getPublicUrl(filePath).data?.publicUrl;
      if (url) {
        setMediaUrl(url);
        setMediaType(file.type.startsWith("video") ? "video" : "image");
      }
    }
  };

  /* load existing */
  useEffect(() => {
    const fetchAd = async () => {
      if (!adId || !markupLoaded) return;
      const data = await fetchCampaignById(adId);

      setTitle(data.title || "");
      setText(data.text || "");
      setUrl(data.url || "");
      setWebsiteName(data.website_name || "");
      setCpm(resolveValueForInput(data.cpm_client ?? data.cpm_net, data.cpm));
      const budgetValue = data.budget_client ?? data.budget_net ?? data.budget ?? 0;
      setBudget(Number(budgetValue || 0).toFixed(2));
      const dailyBudgetValue =
        data.daily_budget_client ?? data.daily_budget_net ?? data.daily_budget ?? 0;
      setDailyBudget(Number(dailyBudgetValue || 0).toFixed(2));
      setDailyViews(data.daily_views || 1);
      setStatus(data.status || "hold");
      setSchedule(data.schedule_enabled || false);
      setOtherInfo(data.other_info || "");
      setConversionEvent(data.conversion_event || "");
      setStartDate(data.start_date || "");
      setEndDate(data.end_date || "");
      setShowDatePicker(Boolean(data.start_date || data.end_date));
      setCountries(data.countries || []);
      setLangs(data.langs || []);
      setTopics(data.topics || []);
      setExTopics(data.ex_topics || []);
      setTargetChannels(data.channels || []);
      setAudiences(data.audiences || []);
      setExcludeChannels(data.exclude_channels || []);
      setDevices(data.devices || ["All devices"]);
      setPoliticsOnly(data.politics_only || false);
      setExcludePolitics(data.exclude_politics || false);
      setMediaUrl(data.media_url || "");
      setMediaType(data.media_type || null);
      setAdButton(data.button || "OPEN WEBSITE");
      setPlacement(data.placement || "message");
	  setLocations(data.locations || []);
    };
    fetchAd();
  }, [adId, markupLoaded]);

  /* clear */
  const onClear = () => {
    setTitle("");
    setText("");
    setUrl("");
    setWebsiteName("");
    setCpm("0.00");
    setBudget("0.00");
    setDailyBudget("0.00");
    setDailyViews(1);
    setStatus("hold");
    setSchedule(false);
    setAgreeTerms(false);
    setMediaUrl("");
    setMediaType(null);
    setAdButton("OPEN WEBSITE");
    setCountries([]);
    setLangs([]);
    setTopics([]);
    setExTopics([]);
    setTargetChannels([]);
    setAudiences([]);
    setExcludeChannels([]);
    setDevices(["All devices"]);
    setShowUserPic(false);
    setPoliticsOnly(false);
    setExcludePolitics(false);
    setOtherInfo("");
    setConversionEvent("");
    setShowDatePicker(false);
    setStartDate("");
    setEndDate("");
    alert("🧹 Черновик очищен");
  };

  /* create/update */
  const onCreate = async () => {
    if (!agreeTerms) {
      alert("❌ Please agree with the Terms of Service before creating an ad.");
      return;
    }

    if (!clientId) {
      alert("❌ Ошибка: user_id отсутствует в localStorage");
      return;
    }

    const cpmNet = role === "client" ? Number(cpm || 0) / multiplier : Number(cpm || 0);
    const budgetNumber = Number(budget || 0);
    const dailyBudgetNumber = Number(dailyBudget || 0);
    const scheduleEnabled = schedule || Boolean(startDate || endDate);

    const { data: userData } = await supabase
      .from("users")
      .select("agency_id")
      .eq("user_id", clientId)
      .maybeSingle();

    const agency_id = userData?.agency_id || null;

    const adData = {
      title,
      text,
      url,
      website_name: websiteName,
      cpm: Number(cpmNet.toFixed(4)),
      budget: Number(budgetNumber.toFixed(4)),
      daily_budget: Number(dailyBudgetNumber.toFixed(4)),
      daily_views: dailyViews,
      status,
      schedule_enabled: scheduleEnabled,
      start_date: startDate || null,
      end_date: endDate || null,
      media_url: mediaUrl,
      media_type: mediaType,
      button: adButton,
      countries,
	  locations, 
      langs,
      topics,
      ex_topics: exTopics,
      channels: targetChannels,
      audiences,
      exclude_channels: excludeChannels,
      devices,
      politics_only: politicsOnly,
      exclude_politics: excludePolitics,
      placement,
      other_info: otherInfo,
      conversion_event: conversionEvent,
      type: "user",
      updated_at: new Date().toISOString(),
      client_id: clientId,
      agency_id,
    };

    if (adId) {
      const { error } = await supabase.from("ad_campaigns").update(adData).eq("id", adId);
      if (error) alert("Ошибка при обновлении: " + error.message);
      else {
        alert("✅ Кампания обновлена!");
        navigate("/");
      }
      return;
    }

    const { error } = await supabase
      .from("ad_campaigns")
      .insert([{ ...adData, created_at: new Date().toISOString() }]);
    if (error) alert("Ошибка при создании рекламы: " + error.message);
    else {
      alert("✅ Реклама успешно создана!");
      navigate("/");
    }
  };

  /* UI */
  return (
    <Container>
      <div className="flex gap-10 py-6">
        {/* LEFT */}
        <form className="w-[320px] flex flex-col gap-5 text-[13px]">
          <Field label="Ad title" info trailing={<LinkLbl>Create a similar ad</LinkLbl>}>
            <Input placeholder="E.g. My first ad" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <Field label="Ad text">
            <Textarea rows={3} placeholder="Enter your ad text" value={text} onChange={(e) => setText(e.target.value)} />
            <Hint>
              You can add custom emoji using{" "}
              <a href="https://t.me/AdsMarkdownBot" target="_blank" rel="noreferrer" className="text-[#5288b1] hover:underline">
                @AdsMarkdownBot
              </a>
              .
            </Hint>
          </Field>

          <Field label="URL you want to promote" info>
            <div className="relative">
              <Input
                placeholder="t.me/yourchannel"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                aria-label="Open promoted URL"
                onClick={() => {
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#5aa7ee] text-white"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 4.93" />
                  <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19.07" />
                </svg>
              </button>
            </div>
          </Field>

          <Field label="Website name" info>
            <Input
              placeholder="Website name"
              value={websiteName}
              onChange={(e) => setWebsiteName(e.target.value)}
            />
          </Field>

          <Checkbox label="Show picture" checked={showUserPic} onChange={(e) => setShowUserPic(e.target.checked)} />

          <Field label="Ad photo or video">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
            <div className="rounded-md overflow-hidden border bg-gray-50">
              {mediaUrl ? (
                mediaType === "video" ? (
                  <video src={mediaUrl} controls className="w-full h-[160px] object-cover" />
                ) : (
                  <img src={mediaUrl} className="w-full h-[160px] object-cover" alt="Preview" />
                )
              ) : (
                <div className="flex h-[96px] items-center justify-center text-[13px] text-gray-400">
                  No photo or video uploaded
                </div>
              )}
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 flex h-[40px] cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#22A3F5] font-semibold text-white hover:bg-[#1D8ED5]"
            >
              {mediaUrl && <img src={MEDIA_BUTTON_ICON} alt="" className="h-5 w-5" />}
              <span>{mediaUrl ? "Change Media" : "Upload Photo or Video"}</span>
            </div>
          </Field>

          <Field label="Ad Button" info>
            <select
              value={adButton}
              onChange={(e) => setAdButton(e.target.value)}
              className="min-h-[40px] w-full rounded-[4px] border border-[#d9d9d9] bg-white px-3 py-[5px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {AD_BUTTON_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="CPM in Euro" info>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-[#222]">€</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cpm}
                onChange={(e) => setCpm(e.target.value)}
                className="pl-8 pr-20"
              />
              {role === "client" && markupPercent > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[5px] bg-[#fff1e8] px-2 py-1 text-[13px] font-bold text-[#c98667]">
                  +{markupPercent}%
                </span>
              )}
            </div>
          </Field>

          <Field label="Current budget in Euro">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-[#222]">€</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="pl-8"
              />
            </div>
            <Hint>Ad will be put on hold once the budget is depleted.</Hint>
          </Field>

          <Field label="Daily budget in Euro" info trailing={<LinkLbl onClick={() => setDailyBudget("0.00")}>Remove</LinkLbl>}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-[#222]">€</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                className="pl-8"
              />
            </div>
            <Hint>€{Number(dailyBudget || 0).toFixed(2)} remaining today</Hint>
          </Field>

          <Field label="Daily views limit per user" info>
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDailyViews(n)}
                  className={`h-[32px] w-[75.3px] rounded-[6px] border text-[13px] font-medium ${
                    n === dailyViews
                      ? "bg-[#22A3F5] text-white border-[#22A3F5]"
                      : "bg-white text-gray-700 border-[#d9d9d9] hover:bg-gray-100"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Ad status" info>
            <div className="flex flex-col gap-2 pl-6">
              <Radio label="Active" checked={status === "active"} onChange={() => setStatus("active")} />
              <Radio label="On Hold" checked={status === "hold"} onChange={() => setStatus("hold")} />
            </div>
          </Field>
		<Field label="Start date" info>
		  {showDatePicker ? (
			<div className="flex flex-col gap-2">
			  <div className="flex gap-2 items-center">
				<input
				  type="date"
				  value={startDate ? startDate.split("T")[0] : ""}
				  onChange={(e) => setStartDate(e.target.value + "T00:00")}
				  className="min-h-[40px] rounded-md border border-gray-300 px-2 py-[5px] text-sm"
				/>
				<input
				  type="time"
				  value={startDate ? startDate.split("T")[1]?.slice(0, 5) : ""}
				  onChange={(e) =>
					setStartDate(
					  startDate.split("T")[0] + "T" + e.target.value
					)
				  }
				  className="min-h-[40px] rounded-md border border-gray-300 px-2 py-[5px] text-sm"
				/>
				<span className="text-[12px] text-gray-600">UTC+5:00</span>
				<LinkLbl onClick={() => { setShowDatePicker(false); setStartDate(""); setEndDate(""); }}>
				  Remove
				</LinkLbl>
			  </div>

			  {endDate && (
				<div className="flex gap-2 items-center mt-1">
				  <input
					type="date"
					value={endDate ? endDate.split("T")[0] : ""}
					onChange={(e) => setEndDate(e.target.value + "T00:00")}
					className="min-h-[40px] rounded-md border border-gray-300 px-2 py-[5px] text-sm"
				  />
				  <input
					type="time"
					value={endDate ? endDate.split("T")[1]?.slice(0, 5) : ""}
					onChange={(e) =>
					  setEndDate(
						endDate.split("T")[0] + "T" + e.target.value
					  )
					}
					className="min-h-[40px] rounded-md border border-gray-300 px-2 py-[5px] text-sm"
				  />
				  <span className="text-[12px] text-gray-600">UTC+5:00</span>
				</div>
			  )}

			  {!endDate && (
				<LinkLbl onClick={() => setEndDate(new Date().toISOString())}>
				  Set end date
				</LinkLbl>
			  )}
			</div>
		  ) : (
			<LinkLbl onClick={() => setShowDatePicker(true)}>Set start date</LinkLbl>
		  )}
		</Field>

          <Field label="Ad Schedule" info>
            <Checkbox
              label="Run this ad on schedule"
              checked={schedule}
              onChange={(e) => setSchedule(e.target.checked)}
            />
          </Field>

          <Field label="Conversion event" info trailing={<LinkLbl>Create Pixel</LinkLbl>}>
            <Input
              placeholder="Create a pixel first (optional)"
              value={conversionEvent}
              onChange={(e) => setConversionEvent(e.target.value)}
            />
            <Hint>
              To track conversions, create a pixel first. <LinkLbl>Read more</LinkLbl>
            </Hint>
          </Field>

          <Field label="Other information" info>
            <Input placeholder="E.g., ad identifier (optional)" value={otherInfo} onChange={(e) => setOtherInfo(e.target.value)} />
          </Field>

        </form>

        {/* RIGHT */}
        <div className="flex flex-col gap-5 text-[13px] flex-1">
          <div className="text-black-600 font-medium text-sm mb-1">Preview</div>
          <TelegramAdPreview title={title} text={text} button={adButton} mediaUrl={mediaUrl} mediaType={mediaType || undefined} />

          <Field label="Ad placement">
            <div className="flex flex-col gap-2 pl-6">
              <Radio label="Message in Channel" checked={placement === "message"} onChange={() => setPlacement("message")} />
              <Radio label="Banner in Video" checked={placement === "banner"} onChange={() => setPlacement("banner")} />
            </div>
          </Field>

          <Field label="Target countries">
            <MultiSelect value={countries} options={COUNTRIES} onChange={setCountries} locked />
          </Field>
		  
		<Field label="Target locations" info>
		  <MultiSelect
			value={locations}
			options={
			  countries.length === 0
				? []
				: countries.flatMap((c) => CITIES_BY_COUNTRY[c] || [])
			}
			onChange={setLocations}
      locked
		  />
		  <Hint>
			{countries.length === 0
			  ? "Select a country to see available cities."
			  : `Cities available for ${countries.join(", ")}.`}
		  </Hint>
		</Field>



          <Field label="Target user languages">
            <MultiSelect value={langs} options={LANGS} onChange={setLangs} placeholder="Select languages (optional)" locked />
          </Field>

          <Field label="Target topics">
            <MultiSelect value={topics} options={TOPICS} onChange={setTopics} placeholder="Select topics (optional)" locked />
          </Field>

          <Field label="Target channel audiences">
            <TagInput value={targetChannels} onChange={setTargetChannels} placeholder="t.me channel URL (optional)" locked />
          </Field>

          <Field label="Target audiences" info>
            <MultiSelect
              value={audiences}
              options={AUDIENCES}
              onChange={setAudiences}
              placeholder="Select audiences or create a new one (optional)"
              locked
            />
          </Field>

          <Field label="Target device type">
            <MultiSelect value={devices} options={DEVICES} onChange={setDevices} locked />
          </Field>

          <Checkbox
            label={
              <>
                Show this ad in channels related to <strong>Politics & Incidents</strong> only
              </>
            }
            checked={politicsOnly}
            onChange={(e) => setPoliticsOnly(e.target.checked)}
          />

          <Field label="Exclude topics">
            <MultiSelect value={exTopics} options={TOPICS} onChange={setExTopics} placeholder="Select topics to exclude (optional)" locked />
          </Field>
		  
		  <Field label="Exclude channel audiences" info>
		  <TagInput
			value={excludeChannels}
			onChange={setExcludeChannels}
			placeholder="t.me channel URL to exclude (optional)"
      locked
		  />
		</Field>

		<Field label="Exclude audiences" info>
		  <MultiSelect
			value={[]}
			options={AUDIENCES}
			onChange={() => {}}
      placeholder="Select audiences to exclude (optional)"
      locked
		  />
		  <Hint>Only users from Uzbekistan will be affected.</Hint>
		</Field>
		
		 <Checkbox
            label="Do not show this ad in channels related to Politics & Incidents"
            checked={excludePolitics}
            onChange={(e) => setExcludePolitics(e.target.checked)}
          />
		

          <p className="text-xs text-red-600">⚠ Will not be shown anywhere.</p>
          <p className="text-xs text-amber-600">⚠ Target parameters can't be changed after the ad is created.</p>
        </div>
      </div>

      {adId ? (
        <div className="mt-8 flex items-center justify-between border-t border-[#e6e6e6] pb-8 pt-6">
          <p className="text-[15px] leading-[22px] text-[#222]">
            Changes will become visible to users once they are approved by the moderators.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="h-[46px] w-[217px] rounded-[6px] bg-[#22A3F5] text-[16px] font-bold text-white transition hover:bg-[#1D8ED5]"
          >
            Save Changes
          </button>
        </div>
      ) : (
        <div className="mt-8 flex items-center justify-between border-t border-[#e6e6e6] pb-8 pt-6">
          <label className="inline-flex items-center gap-3 text-[15px] leading-[22px] text-[#222]">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="h-[18px] w-[18px] accent-[#5a9fec]"
            />
            <span>
              I have read and agree with the{" "}
              <span className="text-[#5288b1]">Telegram Ad Platform Terms of Service</span>
            </span>
          </label>
          <div className="flex items-center gap-10">
            <LinkLbl onClick={onClear}>Clear Draft</LinkLbl>
            <button
              type="button"
              onClick={onCreate}
              className="h-[46px] w-[217px] rounded-[6px] bg-[#22A3F5] text-[16px] font-bold text-white transition hover:bg-[#1D8ED5]"
            >
              Create Ad
            </button>
          </div>
        </div>
      )}
    </Container>
  );
}

/* ──────────────── helpers ──────────────── */
const Field = ({ label, info, trailing, children }: any) => (
  <div className="space-y-1">
    {label && (
      <label className="flex items-center justify-between font-medium">
        <span className="flex items-center gap-1">
          {label}
          {info && <InfoIcon />}
        </span>
        {trailing}
      </label>
    )}
    {children}
  </div>
);

const InfoIcon = () => (
  <svg className="w-[12px] h-[12px] text-gray-400" viewBox="0 0 20 20" fill="currentColor">
    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="10" cy="6" r="1" fill="currentColor" />
    <rect x="9" y="9" width="2" height="7" rx="1" fill="currentColor" />
  </svg>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`min-h-[40px] w-full rounded-[4px] border border-[#d9d9d9] bg-white px-3 py-[5px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${props.className || ""}`}
  />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className="min-h-[40px] w-full resize-none rounded-[4px] border border-[#d9d9d9] bg-white px-3 py-[5px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
  />
);

const Checkbox = ({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) => (
  <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
    <input {...rest} type="checkbox" className="accent-blue-600" />
    {label}
  </label>
);

const Radio = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className="inline-flex items-center gap-2 cursor-pointer">
    <input type="radio" checked={checked} onChange={onChange} className="accent-blue-600" />
    {label}
  </label>
);

const Button = ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...rest} type="button" className="h-[40px] rounded-[6px] bg-[#22A3F5] px-5 text-sm font-semibold text-white transition hover:bg-[#1D8ED5]">
    {children}
  </button>
);

const LinkLbl = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
  <span onClick={onClick} className="text-blue-600 text-[12px] cursor-pointer hover:underline select-none">
    {children}
  </span>
);

const Hint = ({ children }: { children: React.ReactNode }) => <p className="text-[11px] text-gray-500">{children}</p>;
