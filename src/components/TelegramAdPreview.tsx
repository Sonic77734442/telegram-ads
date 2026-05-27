import React from "react";

interface TelegramAdPreviewProps {
  mediaUrl?: string;
  mediaType?: "image" | "video";
  title?: string;
  text?: string;
  button?: string;
  className?: string;
}

const TelegramAdPreview: React.FC<TelegramAdPreviewProps> = ({
  mediaUrl,
  mediaType,
  title,
  text,
  button,
  className = "min-h-[323px] w-[430px]",
}) => {
  const bgUrl = "/assets/AdPreviewBackground.jpg";
  const hasMedia = Boolean(mediaUrl);
  const closeIcon =
    "data:image/svg+xml,%3Csvg%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23fff%22%20stroke-linecap%3D%22round%22%20stroke-width%3D%221.8%22%3E%3Cpath%20d%3D%22M8%2016%2016%208M8%208%2016%2016%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";

  return (
    <div
      data-preview-version="telegram-card-v1"
      className={`relative overflow-hidden rounded-[6px] ${className}`}
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#9fc18c",
      }}
    >
      <button
        type="button"
        aria-label="Close preview"
        className="absolute left-[316px] top-[26px] flex h-9 w-9 items-center justify-center rounded-full bg-[#6f9561]/70 text-white"
      >
        <img src={closeIcon} alt="" className="h-6 w-6" />
      </button>

      <div className="relative min-h-[323px] w-[328px]">
        <div className="relative left-[34px] top-8 w-[260px] rounded-[14px] bg-white p-2 shadow-[0_8px_18px_rgba(64,92,63,0.18)]">
          <div className="absolute bottom-0 left-[-8px] h-0 w-0 border-r-[18px] border-t-[12px] border-r-white border-t-transparent" />
          <div className="relative overflow-hidden rounded-[8px] bg-[#eef6ff]">
            <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[#4da3df]" />

            {hasMedia && (
              <div className="bg-white px-3 pt-3">
                {mediaType === "video" ? (
                  <video
                    src={mediaUrl}
                    className="h-[118px] w-full rounded-[3px] object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Preview"
                    className="h-[118px] w-full rounded-[3px] object-cover"
                  />
                )}
              </div>
            )}

            <div className="px-3 pb-3 pt-2">
              <div className="text-[13px] font-semibold leading-[17px] text-[#5da0d7]">Ad</div>
              {title && (
                <div className="mt-0.5 text-[14px] font-semibold leading-[18px] text-[#1f2630]">
                  {title}
                </div>
              )}
              {text && (
                <div className="mt-0.5 whitespace-pre-line text-[14px] leading-[18px] text-[#1f2630]">
                  {text}
                </div>
              )}

              {button && (
                <>
                  <div className="mt-3 h-px bg-[#cfd9e3]" />
                  <div className="pt-2 text-center text-[12px] font-semibold uppercase leading-[18px] text-[#5d9bcc]">
                    {button}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramAdPreview;
