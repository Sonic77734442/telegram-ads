import { useEffect, useState } from "react";

type TelegramEntity = {
  title: string;
  avatar: string | null;
};

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
  };
};

const MESSAGE_BUBBLE_TAIL =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%228%22%20height%3D%2216%22%20viewBox%3D%220%200%208%2016%22%20style%3D%22filter%3Adrop-shadow%280%200.5px%200%20rgba%28118%2C%20142%2C%20106%2C%20.3%29%29%3B%22%3E%3Cpath%20fill%3D%22%23fff%22%20fill-rule%3D%22evenodd%22%20d%3D%22M%200.33%200%20L%200.4%203.17%20C%200.4%205.6%200.67%208.67%202%2010.67%20C%203%2012.17%204.35%2013.13%205.7%2013.7%20C%205.8%2013.75%206%2013.95%206%2014.25%20C%206%2014.34%206%2014.43%206%2014.56%20C%206%2014.7%205.86%2015%205.53%2015%20C%205.32%2015%203.14%2015%20-1%2015%20L%20-1%200%20L%200.33%200%20Z%22%20transform%3D%22matrix%28-1%200%200%201%207%200%29%22%20style%3D%22filter%3Adrop-shadow%280%201px%201px%20rgba%2825%2C%2044%2C%2089%2C%20.1%29%29%3B%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E";

export default function BotAdPreview({
  url,
  text,
  showChannelPicture,
}: {
  url: string;
  text: string;
  showChannelPicture: boolean;
}) {
  const [entity, setEntity] = useState<TelegramEntity>(() => fallbackEntity(url));

  useEffect(() => {
    setEntity(fallbackEntity(url));
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
          });
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.warn("Telegram bot preview metadata unavailable");
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  return (
    <div className="h-[198px] w-[430px] overflow-hidden rounded-[5px] border border-[#88a47b] bg-[#6fa786]">
      <div className="relative h-[79px] bg-white px-[13px] pb-[10px] pt-[10px]">
        <button
          type="button"
          aria-label="Close preview"
          className="absolute right-[10px] top-[10px] flex h-[20px] w-[20px] items-center justify-center text-[#9a9a9a]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="m5 5 8 8m0-8-8 8"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.2"
            />
          </svg>
        </button>

        <a
          href={url.startsWith("http") ? url : `https://${url}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-full min-w-0 pr-[30px] text-[#222]"
        >
          {showChannelPicture && entity.avatar && (
            <img
              src={entity.avatar}
              alt=""
              className="mr-[10px] h-[52px] w-[52px] flex-none rounded-full object-cover"
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium leading-[16px] text-[#5288b1]">
              Ad
            </span>
            <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium leading-[20px] text-[#222]">
              {entity.title}
            </span>
            <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[14px] leading-[18px] text-[#222]">
              {text}
            </span>
          </span>
        </a>
      </div>

      <div
        className="h-[119px] bg-[#9fc18c] bg-cover bg-center px-[22px] pt-[16px]"
        style={{ backgroundImage: "url(/assets/AdPreviewBackground.jpg)" }}
      >
        <div className="relative w-[257px] rounded-[8px] bg-white px-[11px] pb-[7px] pt-[7px] text-[13px] leading-[16px] text-[#222] shadow-sm">
          <img
            src={MESSAGE_BUBBLE_TAIL}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-[-5px] h-[16px] w-[8px]"
          />
          Welcome aboard! You can now tap the
          <br />
          button below to start this bot{" "}
          <img
            src="https://telegram.org/img/emoji/40/F09FA496.png"
            alt="🤖"
            className="inline-block h-[16px] w-[16px] align-[-3px]"
          />
          <span className="ml-[8px] text-[11px] leading-[13px] text-[#aaa]">9:00</span>
        </div>
        <button
          type="button"
          className="mt-[5px] h-[34px] w-[257px] rounded-[8px] bg-[rgba(65,105,55,0.28)] text-[14px] font-semibold leading-[18px] text-white"
        >
          Start
        </button>
      </div>
    </div>
  );
}
