import React from "react";

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
  // 🔹 Рабочий путь для Vercel: public/asset → доступно как /asset/
  const bgUrl =
    "https://eoybnbhpqsqxeygsikkz.supabase.co/storage/v1/object/public/public-assets/AdPreviewBackground.jpg";

  return (
    <div
      data-preview-version="v7"
      className="flex justify-center items-start rounded-lg p-4 min-h-[145px] transition-all duration-200"
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#6fa786", // базовый цвет Telegram
      }}
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-lg w-[320px] px-3 py-3 text-sm relative shadow-md">
        {/* Media */}
        {mediaUrl && (
          <div className="rounded overflow-hidden mb-2 relative">
            {mediaType === "image" ? (
              <img src={mediaUrl} alt="Preview" className="w-full rounded" />
            ) : mediaType === "video" ? (
              <div className="relative">
                <video
                  src={mediaUrl}
                  className="w-full rounded"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <span className="absolute top-1 left-1 bg-black/70 text-white text-[11px] px-1 rounded">
                  0:03
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* Ad label */}
        <div className="flex items-center gap-1 text-[11px] text-purple-600 font-semibold mb-1">
          <span className="border-l-4 border-purple-400 pl-2">Ad</span>
          <span className="underline text-gray-400 cursor-pointer">
            what’s this?
          </span>
        </div>

        {/* Title */}
        <div className="font-semibold text-[14px] text-gray-900">{title}</div>

        {/* Text */}
        <div className="text-[13px] text-gray-700 mt-1">{text}</div>

        {/* CTA */}
        {button && (
          <div className="text-[#8e8ee0] font-semibold text-center mt-4 text-[12px] uppercase">
            {button}
          </div>
        )}

        {/* Menu / Close */}
        <div className="absolute top-2 right-2 text-gray-400">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[16px]">
            ⋮
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramAdPreview;
