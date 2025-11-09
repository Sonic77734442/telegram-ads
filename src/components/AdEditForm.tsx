import TelegramAdPreview from "./TelegramAdPreview";
import MultiSelect from "./MultiSelect";
import TagInput from "./TagInput";
import Container from "./Container";
import { useRef } from "react";

type Props = {
  title: string;
  setTitle: (v: string) => void;
  text: string;
  setText: (v: string) => void;
  url: string;
  setUrl: (v: string) => void;
  websiteName: string;
  setWebsiteName: (v: string) => void;
  button: string;
  setButton: (v: string) => void;
  cpm: string;
  setCpm: (v: string) => void;
  budget: string;
  setBudget: (v: string) => void;
  dailyViews: number;
  setDailyViews: (v: number) => void;
  target: string;
  setTarget: (v: string) => void;
  mediaUrl: string;
  mediaType: string | null;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onCreate: () => void;
  onSave: () => void;

  c: ReturnType<typeof useMulti<string>>;
  l: ReturnType<typeof useMulti<string>>;
  t: ReturnType<typeof useMulti<string>>;
  exTopics: ReturnType<typeof useMulti<string>>;
  devices: ReturnType<typeof useMulti<string>>;

  channels: string[];
  setChannels: (v: string[]) => void;
  excludeSensitiveCategories: boolean;
  setExcludeSensitiveCategories: (v: boolean) => void;
};

export default function AdEditForm({
  title, setTitle,
  text, setText,
  url, setUrl,
  websiteName, setWebsiteName,
  button, setButton,
  cpm, setCpm,
  budget, setBudget,
  dailyViews, setDailyViews,
  target, setTarget,
  mediaUrl, mediaType,
  handleFileUpload, fileInputRef,
  onCreate, onSave,
  c, l, t, exTopics, devices,
  channels, setChannels,
  excludeSensitiveCategories, setExcludeSensitiveCategories
}: Props) {
  return (
    <Container>
      {
        <div className="flex gap-10 py-8">
          {/* left column */}
          <form className="w-[310px] flex flex-col gap-5 text-[13px]">
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
				type="url"
				placeholder="https://…"
				value={url}
				onChange={(e) => setUrl(e.target.value)}
			  />
			</Field>


            <Field label="Website name" info>
              <Input />
            </Field>

			<Field label="Ad photo or video">
			  {mediaUrl ? (
				<div className="w-full h-[160px] bg-gray-100 border rounded-[4px] mb-2 overflow-hidden">
				  {mediaType === "video" ? (
					<video src={mediaUrl} controls className="w-full h-full object-cover" />
				  ) : (
					<img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
				  )}
				</div>
			  ) : (
				<div
				  onClick={() => fileInputRef.current?.click()}
				  className="w-full h-[160px] bg-gray-100 border rounded-[4px] mb-2 flex items-center justify-center text-gray-400 text-sm cursor-pointer hover:bg-gray-200"
				>
				  Click to upload
				</div>
			  )}

			  <input
				type="file"
				accept="image/*,video/*"
				ref={fileInputRef}
				onChange={handleFileUpload}
				className="hidden"
			  />

			  <button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				className="w-full bg-[#22A3F5] hover:bg-[#1d8ed5] text-white text-[13px] font-semibold rounded-[6px] h-[36px] flex items-center justify-center gap-2"
			  >
				<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-white" viewBox="0 0 24 24">
				  <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM5 5h14v4l-2.5-2.5-3 3L9 7 5 11V5zm0 14v-1l4-4 2.5 2.5L17 11l4 4v4H5z" />
				</svg>
				Change Media
			  </button>
			</Field>


			
			<Field label="Ad Button" info>
			  <Select value={button} onChange={(e) => setButton(e.target.value)}>
				<option>VIEW CHANNEL</option>
				<option>BUY</option>
			  </Select>
			</Field>


			<Field label="CPM in $" info>
			  <div className="relative">
				<Input
				  type="number"
				  step="0.01"
				  placeholder="$ 0.00"
				  value={cpm}
				  onChange={(e) => setCpm(e.target.value)}
				/>
				<Badge>+50 %</Badge>
			  </div>
			</Field>


			<Field label="Current budget in $" trailing={<LinkLbl>Set daily limit</LinkLbl>}>
			  <Input
				type="number"
				step="0.01"
				placeholder="€ 0"
				value={budget}
				onChange={(e) => setBudget(e.target.value)}
			  />
			  <Hint>Ad will be put on hold once the budget is depleted.</Hint>
			</Field>


            <Field label="Daily views limit per user">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDailyViews(n)}
                    className={`w-10 h-[26px] rounded-[3px] border text-[13px] ${
                      n === dailyViews
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Ad status" info>
              <div className="flex flex-col gap-2 pl-6">
				  <Radio
					  name="placement"
					  label="Active"
					  value="Active"
					  checked={target === "Message in Channel"}
					  onChange={() => setTarget("Message in Channel")}
					/>
					<Radio
					  name="placement"
					  label="Hold"
					  value="Hold"
					  checked={target === "Banner in Video"}
					  onChange={() => setTarget("Banner in Video")}
					/>
              </div>
              <LinkLbl>
                <span className="pl-6">Set end date</span>
              </LinkLbl>
            </Field>

            <Field label="Ad schedule" info>
              <Checkbox label="Run this ad on schedule" />
            </Field>

            <Field
              label="Conversion event"
              trailing={<LinkLbl>Create Event</LinkLbl>}
            >
              <Input placeholder="Select event or create a new one (optional)" />
              <Hint>
                To track conversions, install a pixel on your website and set up
                the selected event. <LinkLbl>Read more</LinkLbl>
              </Hint>
            </Field>

            <Field label="Other information">
              <Input placeholder="e.g., ad identifier (optional)" />
            </Field>

            <p className="text-xs text-gray-500">
              Changes will become visible to users once they are approved by the
              moderators.
            </p>

<div className="flex gap-3 mt-6">
  <button
    type="button"
    onClick={onCreate} // функция создания рекламы
    className="bg-[#22A3F5] hover:bg-[#1D8ED5] text-white font-semibold text-sm px-5 h-[40px] rounded-[6px] transition"
  >
    Create Ad
  </button>

  <button
    type="button"
    onClick={onSave} // функция сохранения
    className="bg-[#E5E7EB] hover:bg-[#D1D5DB] text-gray-800 font-semibold text-sm px-5 h-[40px] rounded-[6px] transition"
  >
    Save Changes
  </button>
</div>


          </form>

          {/* right column */}
          <div className="flex-1 max-w-[420px] flex flex-col gap-6">
            <div className="border border-[#d9d9d9] rounded-[8px] overflow-hidden">
              <div className="bg-gray-100 text-center py-2 text-sm font-medium">
                Preview
              </div>
              <div className="p-3">
				<TelegramAdPreview
				  title={title}
				  text={text}
				  button="VIEW CHANNEL"
				  mediaUrl={mediaUrl}
				  mediaType={mediaType}
				/>
              </div>
            </div>

            <div className="flex flex-col gap-6 text-[13px]">
				<Field label="Ad placement" info>
				  <div className="flex flex-col gap-2 pl-6">
					<Radio name="placement" label="Message in Channel" />
					<Radio name="placement" label="Banner in Video" defaultChecked />
				  </div>
				</Field>

			<Field label="Target countries" info>
			  <MultiSelect
				value={c.value}
				options={COUNTRIES as unknown as string[]}
				onSelect={(v) => c.select({ target: { selectedOptions: [{ value: v }] } } as any)}
				onRemove={c.remove}
			  />
			</Field>

			<Field label="Target user languages" info>
			  <MultiSelect
				value={l.value}
				options={LANGS as unknown as string[]}
				onSelect={(v) => l.select({ target: { selectedOptions: [{ value: v }] } } as any)}
				onRemove={l.remove}
			  />
			</Field>

			<Field label="Target topics" info>
			  <MultiSelect
				value={t.value}
				options={TOPICS as unknown as string[]}
				onSelect={(v) => t.select({ target: { selectedOptions: [{ value: v }] } } as any)}
				onRemove={t.remove}
			  />
			  <Checkbox label="Only target users interested in all selected topics" />
			</Field>

			<Field label="Target channel audiences" info>
			  <TagInput
				value={channels}
				onChange={setChannels}
				placeholder="e.g. @channelname"
			  />
			</Field>

              <Field label="Target audiences" info>
                <Input placeholder="Select audiences (optional)" />
              </Field>

			<Field label="Target device type" info>
			  <MultiSelect
				value={devices.value}
				options={DEVICES as unknown as string[]}
				onSelect={(v) => devices.select({ target: { selectedOptions: [{ value: v }] } } as any)}
				onRemove={devices.remove}
			  />
			</Field>


			<Field label="Exclude topics" info>
			  <MultiSelect
				value={exTopics.value}
				options={TOPICS as unknown as string[]}
				onSelect={(v) => exTopics.select({ target: { selectedOptions: [{ value: v }] } } as any)}
				onRemove={exTopics.remove}
			  />
			</Field>


              <Field label="Exclude channel audiences" info>
                <Input placeholder="t.me channel URL to exclude (optional)" />
              </Field>

              <Checkbox
				  label="Do not show this ad in channels related to Politics & Incidents"
				  checked={excludeSensitiveCategories}
				  onChange={(e) => setExcludeSensitiveCategories(e.target.checked)}
				/>


              <p className="text-xs text-green-600 flex gap-1">
                <span>✔</span>
                Will be shown for users from {c.value.join(", ")} and who speak{" "}
                {l.value.join(", ")} and who subscribed to{" "}
                {t.value.join(" or ")}
              </p>
            </div>
          </div>
        </div>}
    </Container>
  );
}
