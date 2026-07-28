import { NavLink, useLocation, useNavigate } from "react-router-dom";

export default function TabBar({
  adId,
  activeTab,
  onTabChange,
}: {
  adId?: string;
  activeTab?: "edit" | "stats";
  onTabChange?: (tab: "edit" | "stats") => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!adId) return null;

  const linkStyle =
    "rounded-full px-[11px] pb-[5px] pt-[6px] text-[14px] font-medium leading-4 transition";
  const activeStyle = "bg-[#58a6e7] text-white";
  const isStatsPath = location.pathname.endsWith("/stats");
  const isInfoActive = !isStatsPath && activeTab === "edit";

  return (
    <div className="flex h-[35px] items-start justify-between">
      <div className="flex gap-1">
        {/* ✅ Info ведёт на /create?id=... */}
        <button
          onClick={() => {
            navigate(`/create?id=${adId}`);
            onTabChange?.("edit");
          }}
          className={`${linkStyle} ${isInfoActive ? activeStyle : "text-[#139af5]"}`}
        >
          Info
        </button>

        <span className={`${linkStyle} cursor-default text-[#0288db]`}>
          Budget
        </span>

        <NavLink
          to={`/ad/${adId}/stats`}
          onClick={() => onTabChange?.("stats")}
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
