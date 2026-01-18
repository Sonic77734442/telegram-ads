import { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Container from "../components/Container";
import MultiSelect from "../components/MultiSelect";
import TagInput from "../components/TagInput";
import TelegramAdPreview from "../components/TelegramAdPreview";
import { supabase } from "../supabaseClient";

/* ──────────────── constants ──────────────── */
const COUNTRIES = ["Kazakhstan", "Uzbekistan", "Russia", "Armenia"];
const LANGS = ["English", "Russian", "Uzbek"];
const TOPICS = [
  "Finance",
  "Technology",
  "Entertainment",
  "Sports",
  "Crypto",
  "Food & Cooking",
  "Health & Medicine",
];
const DEVICES = ["All devices", "Mobile", "Desktop", "iOS", "Android"];

/* ──────────────── component ──────────────── */
export default function UserAdForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adId = searchParams.get("id");

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cpm, setCpm] = useState("0.00");
  const [budget, setBudget] = useState("0.00");
  const [dailyViews, setDailyViews] = useState(1);
  const [status, setStatus] = useState<"active" | "hold">("hold");
  const [schedule, setSchedule] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const clientId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const [markupPercent, setMarkupPercent] = useState(0);
  const [markupLoaded, setMarkupLoaded] = useState(role !== "client");
  const multiplier = role === "client" && markupPercent > 0 ? 1 + markupPercent / 100 : 1;

  const [countries, setCountries] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [exTopics, setExTopics] = useState<string[]>([]);
  const [devices, setDevices] = useState<string[]>(["All devices"]);

  const [targetChannels, setTargetChannels] = useState<string[]>([]);
  const [excludeChannels, setExcludeChannels] = useState<string[]>([]);
  const [politicsOnly, setPoliticsOnly] = useState(false);
  const [excludePolitics, setExcludePolitics] = useState(false);
  
  /* ──────────────── date schedule states ──────────────── */
const [showDatePicker, setShowDatePicker] = useState(false);
const [startDate, setStartDate] = useState<string>("");
const [endDate, setEndDate] = useState<string>("");
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Load client markup to present CPM/budget with markup in client role.
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

  /* ──────────────── upload handler ──────────────── */
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

  /* ──────────────── load existing ad ──────────────── */
  useEffect(() => {
    const fetchAd = async () => {
      if (!adId || !markupLoaded) return;
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("id", adId)
        .single();

      if (error || !data) return;

      setTitle(data.title || "");
      setText(data.text || "");
      setUrl(data.url || "");
      setCpm(resolveValueForInput(data.cpm_client ?? data.cpm_net, data.cpm));
      const budgetValue = data.budget_client ?? data.budget_net ?? data.budget ?? 0;
      setBudget(Number(budgetValue || 0).toFixed(2));
      setDailyViews(data.daily_views || 1);
      setStatus(data.status || "hold");
      setSchedule(data.schedule_enabled || false);
      setStartDate(data.start_date || "");
      setEndDate(data.end_date || "");
      setShowDatePicker(Boolean(data.start_date || data.end_date));
      setMediaUrl(data.media_url || "");
      setMediaType(data.media_type || null);
      setTargetChannels(data.channels || []);
      setExcludeChannels(data.exclude_channels || []);
      setCountries(data.countries || []);
      setLangs(data.langs || []);
      setTopics(data.topics || []);
      setExTopics(data.ex_topics || []);
      setDevices(data.devices || ["All devices"]);
    };
    fetchAd();
  }, [adId, markupLoaded]);

  /* ──────────────── clear handler ──────────────── */
  const onClear = () => {
    setTitle("");
    setText("");
    setUrl("");
    setCpm("0.00");
    setBudget("0.00");
    setDailyViews(1);
    setStatus("hold");
    setSchedule(false);
    setAgreeTerms(false);
    setMediaUrl("");
    setMediaType(null);
    setCountries([]);
    setLangs([]);
    setTopics([]);
    setExTopics([]);
    setDevices(["All devices"]);
    setTargetChannels([]);
    setExcludeChannels([]);
    setPoliticsOnly(false);
    setExcludePolitics(false);
    setShowDatePicker(false);
    setStartDate("");
    setEndDate("");
    alert("🧹 Черновик очищен");
  };

  /* ──────────────── create / update handler ──────────────── */
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
    const scheduleEnabled = schedule || Boolean(startDate || endDate);

    const { data: userData } = await supabase
      .from("users")
      .select("agency_id")
      .eq("user_id", clientId)
      .maybeSingle();

    const agency_id = userData?.agency_id || null;

    // 🔹 если редактирование
    if (adId) {
      const { error } = await supabase
        .from("ad_campaigns")
        .update({
          title,
          text,
          url,
          cpm: Number(cpmNet.toFixed(4)),
          budget: Number(budgetNumber.toFixed(4)),
          daily_views: dailyViews,
          status,
          schedule_enabled: scheduleEnabled,
          start_date: startDate || null,
          end_date: endDate || null,
          media_url: mediaUrl,
          media_type: mediaType,
          countries,
          langs,
          topics,
          ex_topics: exTopics,
          channels: targetChannels,
          exclude_channels: excludeChannels,
          devices,
          politics_only: politicsOnly,
          exclude_politics: excludePolitics,
          updated_at: new Date().toISOString(),
        })
        .eq("id", adId);

      if (error) alert("Ошибка при обновлении: " + error.message);
      else {
        alert("✅ Кампания обновлена!");
        navigate("/");
      }
      return;
    }

    // 🔹 если новая
    const { error } = await supabase.from("ad_campaigns").insert([
      {
        title,
        text,
        url,
        cpm: Number(cpmNet.toFixed(4)),
        budget: Number(budgetNumber.toFixed(4)),
        daily_views: dailyViews,
        status,
        schedule_enabled: scheduleEnabled,
        start_date: startDate || null,
        end_date: endDate || null,
        media_url: mediaUrl,
        media_type: mediaType,
        countries,
        langs,
        topics,
        ex_topics: exTopics,
        channels: targetChannels,
        exclude_channels: excludeChannels,
        devices,
        politics_only: politicsOnly,
        exclude_politics: excludePolitics,
        created_at: new Date().toISOString(),
        client_id: clientId,
        agency_id,
      },
    ]);

    if (error) alert("Ошибка при создании рекламы: " + error.message);
    else {
      alert("✅ Реклама успешно создана!");
      navigate("/");
    }
  };

  /* ──────────────── UI ──────────────── */
  return (
    <Container>
      <div className="flex gap-10 py-6">
        {/* Левая колонка */}
        <form className="w-[320px] flex flex-col gap-5 text-[13px]">
          <Field label="Ad title" info>
            <Input placeholder="E.g. My first ad" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <Field label="Ad text">
            <Textarea rows={3} placeholder="Enter your ad text" value={text} onChange={(e) => setText(e.target.value)} />
            <Hint>
              You can add custom emoji using <code>@AdsMarkdownBot</code>.
            </Hint>
          </Field>

          <Field label="URL you want to promote" info>
            <Input placeholder="t.me/yourlink" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>

          <Checkbox label="Show user picture" />

          <Field label="Ad photo or video">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#22A3F5] hover:bg-[#1D8ED5] text-white font-semibold rounded-[6px] h-[36px] flex items-center justify-center cursor-pointer"
            >
              Upload Photo or Video
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
            {mediaUrl && (
              <div className="mt-2 rounded-md overflow-hidden border">
                {mediaType === "video" ? (
                  <video src={mediaUrl} controls className="w-full h-[160px] object-cover" />
                ) : (
                  <img src={mediaUrl} className="w-full h-[160px] object-cover" alt="Preview" />
                )}
              </div>
            )}
          </Field>

          <Field label="CPM in Euro" info>
            <Input type="number" step="0.01" placeholder="€ 0.00" value={cpm} onChange={(e) => setCpm(e.target.value)} />
          </Field>

          <Field label="Initial budget in Euro" trailing={<LinkLbl>Set daily limit</LinkLbl>}>
            <Input type="number" step="0.01" placeholder="€ 0.00" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Field>

          <Field label="Daily views limit per user">
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDailyViews(n)}
                  className={`w-[74px] h-[32px] text-[13px] font-medium rounded-[6px] border transition-all duration-150 ${
                    n === dailyViews ? "bg-[#22A3F5] text-white border-[#22A3F5]" : "bg-white text-gray-700 border-[#d9d9d9] hover:bg-gray-100"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Initial status">
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
				  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
				/>
				<input
				  type="time"
				  value={startDate ? startDate.split("T")[1]?.slice(0, 5) : ""}
				  onChange={(e) =>
					setStartDate(
					  startDate.split("T")[0] + "T" + e.target.value
					)
				  }
				  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
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
					className="border border-gray-300 rounded-md px-2 py-1 text-sm"
				  />
				  <input
					type="time"
					value={endDate ? endDate.split("T")[1]?.slice(0, 5) : ""}
					onChange={(e) =>
					  setEndDate(
						endDate.split("T")[0] + "T" + e.target.value
					  )
					}
					className="border border-gray-300 rounded-md px-2 py-1 text-sm"
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

          <Checkbox
            label="I have read and agree with the Telegram Ad Platform Terms of Service"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
          />

        </form>

        {/* Правая колонка */}
        <div className="flex flex-col gap-5 text-[13px] flex-1">
          <div className="text-black-600 font-medium text-sm mb-1">Preview</div>
          <TelegramAdPreview title={title} text={text} button="SEND MESSAGE" mediaUrl={mediaUrl} mediaType={mediaType || undefined} />

          {/* ─── Targeting section ───────────────────────────── */}
          <div className="flex flex-col gap-5 text-[13px] mt-4">
            <Field label="Target channel languages" info>
              <MultiSelect value={langs} options={LANGS} onChange={setLangs} />
            </Field>

            <Field label="Target topics" info>
              <MultiSelect value={topics} options={TOPICS} onChange={setTopics} />
            </Field>

            <Field label="Target specific channels" info>
              <TagInput
                value={targetChannels}
                onChange={setTargetChannels}
                placeholder="t.me channel URL (optional)"
              />
            </Field>

            <Field label="Exclude topics" info>
              <MultiSelect value={exTopics} options={TOPICS} onChange={setExTopics} />
            </Field>

            <Field label="Exclude specific channels" info>
              <TagInput
                value={excludeChannels}
                onChange={setExcludeChannels}
                placeholder="t.me channel URL to exclude (optional)"
              />
            </Field>

            <p className="text-xs text-red-600">⚠ Will not be shown anywhere.</p>
            <p className="text-xs text-amber-600">
              ⚠ Target parameters can't be changed after the ad is created.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center border-t pt-4 mt-6">
        <LinkLbl onClick={onClear}>Clear Draft</LinkLbl>
        <Button onClick={onCreate}>{adId ? "Save Changes" : "Create Ad"}</Button>
      </div>
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
  <input {...props} className="w-full border border-[#d9d9d9] rounded-[4px] px-3 py-[6px] bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className="w-full border border-[#d9d9d9] rounded-[4px] px-3 py-[6px] resize-none bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
);

const Checkbox = ({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
    <input {...rest} type="checkbox" className="accent-blue-600" />
    {label}
  </label>
);

const Radio = ({ label, checked, onChange }: { label: string; checked?: boolean; onChange?: () => void }) => (
  <label className="inline-flex items-center gap-2 cursor-pointer">
    <input type="radio" checked={checked} onChange={onChange} className="accent-blue-600" />
    {label}
  </label>
);

const Button = ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...rest} type="button" className="bg-[#22A3F5] hover:bg-[#1D8ED5] text-white text-sm font-semibold px-5 h-[38px] rounded-[6px] transition">
    {children}
  </button>
);

const LinkLbl = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
  <span onClick={onClick} className="text-blue-600 text-[12px] cursor-pointer hover:underline select-none">
    {children}
  </span>
);

const Hint = ({ children }: { children: React.ReactNode }) => <p className="text-[11px] text-gray-500">{children}</p>;
