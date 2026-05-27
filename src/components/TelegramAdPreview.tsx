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
      className="relative flex min-h-[468px] items-start justify-center overflow-hidden rounded-[6px] p-5 pr-12"
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
        className="absolute right-3 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#6f9561]/70 text-white"
      >
        <X size={22} strokeWidth={2.6} />
      </button>

      <div className="relative mt-0 w-full max-w-[380px] rounded-[18px] bg-white p-[10px] shadow-[0_8px_18px_rgba(64,92,63,0.18)]">
        <div className="absolute -bottom-1 -left-[10px] h-7 w-7 rounded-br-[22px] bg-white" />
        <div className="relative overflow-hidden rounded-[8px] bg-[#eef6ff]">
          <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[#4da3df]" />

          {hasMedia && (
            <div className="bg-white px-3 pt-3">
              {mediaType === "video" ? (
                <video
                  src={mediaUrl}
                  className="h-[176px] w-full rounded-[3px] object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Preview"
                  className="h-[176px] w-full rounded-[3px] object-cover"
                />
              )}
            </div>
          )}

          <div className="px-4 pb-4 pt-3">
            <div className="text-[20px] leading-[24px] text-[#5da0d7]">Ad</div>
            {title && (
              <div className="mt-1 text-[20px] font-semibold leading-[25px] text-[#1f2630]">
                {title}
              </div>
            )}
            {text && (
              <div className="mt-1 whitespace-pre-line text-[20px] leading-[25px] text-[#1f2630]">
                {text}
              </div>
            )}

            {button && (
              <>
                <div className="mt-4 h-px bg-[#cfd9e3]" />
                <div className="pt-3 text-center text-[16px] font-semibold uppercase leading-[22px] text-[#5d9bcc]">
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
