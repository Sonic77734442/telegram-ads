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
    "text-[14px] font-semibold px-3 py-[6px] rounded-full transition";
  const activeStyle = "bg-[#139af5] text-white";
  const isStatsPath = location.pathname.endsWith("/stats");
  const isInfoActive = !isStatsPath && activeTab === "edit";

  return (
    <div className="flex items-center justify-between pb-2 px-2">
      <div className="flex gap-3">
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
