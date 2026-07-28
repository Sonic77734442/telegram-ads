import { useEffect, useMemo, useState } from "react";

type TelegramEntity = {
  title: string;
  avatar: string | null;
  kind: "channel" | "bot";
};

type SearchAdPreviewProps = {
  url: string;
  query: string;
};

const COLORS = ["#d89952", "#8c72c8"];

const getUsername = (url: string) => {
  const match = url
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/([A-Za-z0-9_]{5,32})/i);
  return match?.[1] || "";
};

const fallbackEntity = (url: string): TelegramEntity => {
  const username = getUsername(url);
  return {
    title: username ? `@${username}` : "Promoted channel",
    avatar: null,
    kind: username.toLowerCase().endsWith("bot") ? "bot" : "channel",
  };
};

const initials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "T";

function ResultAvatar({
  title,
  src,
  color = "#222",
}: {
  title: string;
  src?: string | null;
  color?: string;
}) {
  return src ? (
    <img src={src} alt="" className="h-[38px] w-[38px] flex-none rounded-full object-cover" />
  ) : (
    <span
      className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {initials(title)}
    </span>
  );
}

function SearchResult({
  title,
  avatar,
  promoted = false,
  color,
  kind = "channel",
}: {
  title: string;
  avatar?: string | null;
  promoted?: boolean;
  color?: string;
  kind?: "channel" | "bot";
}) {
  return (
    <div className="flex h-[48px] w-full items-center px-[8px] py-[5px]">
      <ResultAvatar title={title} src={avatar} color={color} />
      <div className="ml-[9px] min-w-0 flex-1">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium leading-[20px] text-[#222]">
          {title}
        </div>
        <div className="text-[12px] leading-[18px] text-[#808080]">{kind}</div>
      </div>
      {promoted && (
        <div className="mx-[2px] mb-[4px] mt-[4px] rounded-[9px] bg-[rgba(51,145,212,0.13)] px-[7px] pb-[2px] pt-[3px] text-[12px] leading-[13px] text-[#3391d4]">
          Ad
        </div>
      )}
    </div>
  );
}

export default function SearchAdPreview({ url, query }: SearchAdPreviewProps) {
  const [entity, setEntity] = useState<TelegramEntity>(() => fallbackEntity(url));

  useEffect(() => {
    const fallback = fallbackEntity(url);
    setEntity(fallback);

    if (!getUsername(url)) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/telegram-preview?url=${encodeURIComponent(url.trim())}`,
          { signal: controller.signal }
        );
        if (!response.ok) return;
        const json = await response.json();
        if (json?.data?.title) {
          setEntity({
            title: String(json.data.title),
            avatar: json.data.avatar ? String(json.data.avatar) : null,
            kind: json.data.kind === "bot" ? "bot" : "channel",
          });
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.warn("Telegram preview metadata unavailable");
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  const sampleResults = useMemo(() => {
    const normalized = query.trim() || "telegram";
    return [
      `${normalized} news`,
      `${normalized} community`,
    ];
  }, [query]);

  return (
    <div className="h-[214px] w-[430px] overflow-hidden rounded-[5px] border border-[#d9d9d9] bg-white">
      <div className="flex h-[41px] items-center border-b border-[#ededed]">
        <span className="flex h-[41px] w-[46px] flex-none items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="8" cy="8" r="4.7" fill="none" stroke="#8a8f94" strokeWidth="1.4" />
            <path d="m11.5 11.5 3 3" stroke="#8a8f94" strokeLinecap="round" strokeWidth="1.4" />
          </svg>
        </span>
        <div className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap py-[11px] pr-[12px] text-[14px] leading-[19px] text-[#222]">
          {query.trim() || "Search"}
        </div>
      </div>

      <div className="h-[28px] bg-[#f5f5f5] px-[13px] py-[5px] text-[12px] font-medium leading-[18px] text-[#84888c]">
        Global search
      </div>

      <div className="h-[144px]">
        <SearchResult
          title={entity.title}
          avatar={entity.avatar}
          kind={entity.kind}
          promoted
        />
        <SearchResult title={sampleResults[0]} color={COLORS[0]} />
        <SearchResult title={sampleResults[1]} color={COLORS[1]} />
      </div>
    </div>
  );
}
