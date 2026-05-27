import React from "react";
import { X } from "lucide-react";

interface TelegramAdPreviewProps {
  mediaUrl?: string;
  mediaType?: "image" | "video";
  title?: string;
  text?: string;
  button?: string;
}

const TelegramAdPreview: React.FC<TelegramAdPreviewProps> = ({
  mediaUrl,
  mediaType,
  title,
  text,
  button,
}) => {
  const bgUrl = "/assets/AdPreviewBackground.jpg";
  const hasMedia = Boolean(mediaUrl);

  return (
    <div
      data-preview-version="telegram-card-v1"
      className="relative flex min-h-[300px] items-start justify-center overflow-hidden rounded-[6px] p-4 pr-11"
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
        className="absolute right-2 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#6f9561]/70 text-white"
      >
        <X size={20} strokeWidth={2.6} />
      </button>

      <div className="relative mt-0 w-full max-w-[320px] rounded-[14px] bg-white p-2 shadow-[0_8px_18px_rgba(64,92,63,0.18)]">
        <div className="absolute -bottom-[1px] -left-[12px] h-0 w-0 border-b-[15px] border-r-[22px] border-b-transparent border-r-white" />
        <div className="relative overflow-hidden rounded-[8px] bg-[#eef6ff]">
          <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[#4da3df]" />

          {hasMedia && (
            <div className="bg-white px-3 pt-3">
              {mediaType === "video" ? (
                <video
                  src={mediaUrl}
                className="h-[132px] w-full rounded-[3px] object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Preview"
                  className="h-[132px] w-full rounded-[3px] object-cover"
                />
              )}
            </div>
          )}

          <div className="px-3 pb-3 pt-2">
            <div className="text-[14px] leading-[18px] text-[#5da0d7]">Ad</div>
            {title && (
              <div className="mt-0.5 text-[15px] font-semibold leading-[19px] text-[#1f2630]">
                {title}
              </div>
            )}
            {text && (
              <div className="mt-0.5 whitespace-pre-line text-[15px] leading-[19px] text-[#1f2630]">
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
  );
};

export default TelegramAdPreview;
