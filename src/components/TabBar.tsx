import { NavLink, useNavigate } from "react-router-dom";

export default function TabBar({
  adId,
  activeTab,
  onTabChange,
}: {
  adId?: string;
  activeTab: "edit" | "stats";
  onTabChange: (tab: "edit" | "stats") => void;
}) {
  const navigate = useNavigate();

  if (!adId) return null;

  const linkStyle =
    "text-[14px] font-semibold px-3 py-[6px] rounded-full transition";
  const activeStyle = "bg-[#139af5] text-white";

  return (
    <div className="flex items-center justify-between border-b pb-2 px-2">
      <div className="flex gap-3">
        {/* ✅ Info ведёт на /create?id=... */}
        <button
          onClick={() => {
            navigate(`/create?id=${adId}`);
            onTabChange("edit");
          }}
          className={`${linkStyle} ${activeTab === "edit" ? activeStyle : "text-[#139af5]"}`}
        >
          Info
        </button>

        <NavLink
          to={`/ad/${adId}/stats`}
          onClick={() => onTabChange("stats")}
          className={({ isActive }) =>
            `${linkStyle} ${isActive ? activeStyle : "text-[#139af5]"}`
          }
        >
          Statistics
        </NavLink>
      </div>
    </div>
  );
}
