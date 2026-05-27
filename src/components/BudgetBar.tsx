// src/components/BudgetBar.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

const SEARCH_INPUT_ICON =
  "data:image/svg+xml,%3Csvg%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23999%22%20stroke-width%3D%221.3%22%3E%3Ccircle%20cx%3D%2213.18%22%20cy%3D%2210.5%22%20r%3D%224.85%22%2F%3E%3Cpath%20d%3D%22m9.83%2014.38-3.83%203.83%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";

const BudgetBar: React.FC = () => {
  const [query, setQuery] = useState("");

  return (
    <div className="bg-white h-[65px]">
      <div className="w-full max-w-[842px] mx-auto h-[65px]" style={{ fontFamily: "Roboto, sans-serif" }}>
        <div className="flex items-center justify-between h-[65px]">
          {/* ----- Поиск ----- */}
          <div className="relative w-[395px] h-[40px] flex-shrink-0 mr-[5px]">
            <img
              src={SEARCH_INPUT_ICON}
              alt=""
              className="pointer-events-none absolute left-2.5 top-1/2 h-6 w-6 -translate-y-1/2"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ads by name or link"
              autoComplete="off"
              className="
                w-full h-full pl-10 pr-3
                text-sm text-gray-700 placeholder-gray-500
                border border-gray-300 rounded
                focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
              "
            />
          </div>

          {/* ----- Кнопки ----- */}
          <div className="flex gap-[20px]">
            <Link
              to="/budget"
              className="
                flex-shrink-0
                inline-flex items-center justify-center
                w-[140px] h-[36px]
                bg-[#139af5]
                text-white font-semibold text-[14px] leading-[20px] rounded-[6px] transition
              "
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              Manage budget
            </Link>

            <Link
              to="/ad/new"
              className="
                flex-shrink-0
                inline-flex items-center justify-center
                w-[140.57px] h-[36px]
                bg-[#139af5]
                text-white font-semibold text-[14px] leading-[20px] rounded-[6px] transition
              "
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              Create a new ad
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetBar;
