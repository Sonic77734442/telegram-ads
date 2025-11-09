import { useRef, useState } from "react";
import Container from "../components/Container";
import TelegramAdPreview from "../components/TelegramAdPreview";
import { supabase } from "../supabaseClient";
import TagInput from "../components/TagInput";

/* ──────────────── component ──────────────── */
export default function BotAdForm() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [cpm, setCpm] = useState("0.00");
  const [budget, setBudget] = useState("0.00");
  const [dailyViews, setDailyViews] = useState(1);
  const [status, setStatus] = useState<"active" | "hold">("hold");
  const [schedule, setSchedule] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [targetBots, setTargetBots] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ──────────────── upload handler ──────────────── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filePath = `ads/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
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

  /* ──────────────── create handler ──────────────── */
  const onCreate = async () => {
    if (!agreeTerms) {
      alert("❌ Please agree with the Terms of Service before creating an ad.");
      return;
    }

    const clientId = localStorage.getItem("user_id");
    if (!clientId) {
      alert("❌ Ошибка: user_id отсутствует в localStorage");
      return;
    }

// получаем agency_id клиента из таблицы users
const { data: userData, error: userError } = await supabase
  .from("users")
  .select("agency_id")
  .eq("user_id", clientId)
  .maybeSingle();

if (userError) {
  console.error("Ошибка при загрузке agency_id:", userError.message);
}

const agency_id = userData?.agency_id || null;

// теперь сохраняем кампанию с агентством
	const { error } = await supabase.from("ad_campaigns").insert([
	  {
		title,
		text,
		url,
		cpm,
		budget,
		daily_views: dailyViews,
		status,
		schedule_enabled: schedule,
		media_url: mediaUrl,
		media_type: mediaType,
		target_bots: targetBots,
		created_at: new Date().toISOString(),
		client_id: clientId,
		agency_id, // ✅ вот это — ключевой момент!
	  },
	]);
    if (error) alert("Ошибка при создании рекламы: " + error.message);
    else alert("✅ Реклама успешно создана!");
  };

  /* ──────────────── UI ──────────────── */
  return (
    <Container>
      <div className="flex gap-10 py-6">
        {/* Левая колонка */}
        <form className="w-[320px] flex flex-col gap-5 text-[13px]">
          <Field label="Ad title" info>
            <Input
              placeholder="E.g. My first ad"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label="Ad text">
            <Textarea
              rows={3}
              placeholder="Enter your ad text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Hint>
              You can add custom emoji using <code>@AdsMarkdownBot</code>.
            </Hint>
          </Field>

          <Field label="URL you want to promote" info>
            <Input
              placeholder="t.me/yourbot"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>

          <Checkbox label="Show user picture" />

          <Field label="Ad photo or video">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#22A3F5] hover:bg-[#1D8ED5] text-white font-semibold rounded-[6px] h-[36px] flex items-center justify-center cursor-pointer"
            >
              Upload Photo or Video
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
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
            <Input
              type="number"
              step="0.01"
              placeholder="€ 0.00"
              value={cpm}
              onChange={(e) => setCpm(e.target.value)}
            />
          </Field>

          <Field label="Initial budget in Euro" trailing={<LinkLbl>Set daily limit</LinkLbl>}>
            <Input
              type="number"
              step="0.01"
              placeholder="€ 0.00"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </Field>

			<Field label="Daily views limit per user">
			  <div className="flex gap-3">
				{[1, 2, 3, 4].map((n) => (
				  <button
					key={n}
					type="button"
					onClick={() => setDailyViews(n)}
					className={`w-[74px] h-[32px] text-[13px] font-medium rounded-[6px] border transition-all duration-150 ${
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

          <Field label="Initial status">
            <div className="flex flex-col gap-2 pl-6">
              <Radio label="Active" checked={status === "active"} onChange={() => setStatus("active")} />
              <Radio label="On Hold" checked={status === "hold"} onChange={() => setStatus("hold")} />
            </div>
            <LinkLbl>Set start date</LinkLbl>
          </Field>

          <Field label="Ad Schedule">
            <Checkbox
              label="Run this ad on schedule"
              checked={schedule}
              onChange={(e) => setSchedule(e.target.checked)}
            />
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
          <div className="p-0 bg-transparent">
            <TelegramAdPreview
              title={title}
              text={text}
              button="SEND MESSAGE"
              mediaUrl={mediaUrl}
              mediaType={mediaType || undefined}
            />
          </div>

          <Field label="Target specific bots" info>
            <TagInput
              value={targetBots}
              onChange={setTargetBots}
              placeholder="t.me bot URL"
            />
          </Field>

          <p className="text-xs text-red-600">⚠ Will not be shown anywhere.</p>
          <p className="text-xs text-amber-600">
            ⚠ Target parameters can't be changed after the ad is created.
          </p>
        </div>
      </div>

      {/* Нижний контейнер с кнопками */}
      <div className="flex justify-between items-center border-t pt-4 mt-6">
        <LinkLbl>Clear Draft</LinkLbl>
        <Button onClick={onCreate}>Create Ad</Button>
      </div>
    </Container>
  );
}

/* ──────────────── helpers ──────────────── */
const Field = ({
  label,
  info,
  trailing,
  children,
}: {
  label?: string;
  info?: boolean;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) => (
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
    className="w-full border border-[#d9d9d9] rounded-[4px] px-3 py-[6px] bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
  />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className="w-full border border-[#d9d9d9] rounded-[4px] px-3 py-[6px] resize-none bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
  />
);

const Checkbox = ({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
    <input {...rest} type="checkbox" className="accent-blue-600" />
    {label}
  </label>
);

const Radio = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange?: () => void;
}) => (
  <label className="inline-flex items-center gap-2 cursor-pointer">
    <input type="radio" checked={checked} onChange={onChange} className="accent-blue-600" />
    {label}
  </label>
);

const Button = ({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...rest}
    type="button"
    className="bg-[#22A3F5] hover:bg-[#1D8ED5] text-white text-sm font-semibold px-5 h-[38px] rounded-[6px] transition"
  >
    {children}
  </button>
);

const LinkLbl = ({ children }: { children: React.ReactNode }) => (
  <span className="text-blue-600 text-[12px] cursor-pointer hover:underline">{children}</span>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] text-gray-500">{children}</p>
);
