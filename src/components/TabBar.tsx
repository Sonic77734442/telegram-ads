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
    "text-sm px-3 py-[6px] rounded-full hover:bg-blue-100 transition";
  const activeStyle = "bg-blue-500 text-white";

  return (
    <div className="flex items-center justify-between border-b pb-2 px-2">
      <div className="flex gap-3">
        {/* ✅ Info ведёт на /create?id=... */}
        <button
          onClick={() => {
            navigate(`/create?id=${adId}`);
            onTabChange("edit");
          }}
          className={`${linkStyle} ${activeTab === "edit" ? activeStyle : "text-blue-700"}`}
        >
          Info
        </button>

        <NavLink
          to={`/ad/${adId}/stats`}
          onClick={() => onTabChange("stats")}
          className={({ isActive }) =>
            `${linkStyle} ${isActive ? activeStyle : "text-blue-700"}`
          }
        >
          Statistics
        </NavLink>
      </div>
    </div>
  );
}
