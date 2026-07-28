// src/components/BudgetBar.tsx
import React from "react";
import { Link } from "react-router-dom";

const SEARCH_INPUT_ICON =
  "data:image/svg+xml,%3Csvg%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23999%22%20stroke-width%3D%221.3%22%3E%3Ccircle%20cx%3D%2213.18%22%20cy%3D%2210.5%22%20r%3D%224.85%22%2F%3E%3Cpath%20d%3D%22m9.83%2014.38-3.83%203.83%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";

type BudgetBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

const BudgetBar: React.FC<BudgetBarProps> = ({ query, onQueryChange }) => {
  return (
    <div className="h-[65px] bg-white">
      <div className="relative mx-auto h-[65px] w-full max-w-[842px]" style={{ fontFamily: "Roboto, sans-serif" }}>
          {/* ----- Поиск ----- */}
          <div className="absolute left-0 top-[10px] h-[40px] w-[395px]">
            <img
              src={SEARCH_INPUT_ICON}
              alt=""
              className="pointer-events-none absolute left-[10px] top-1/2 h-6 w-6 -translate-y-1/2"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search ads by name or link"
              autoComplete="off"
              className="h-full w-full rounded-[4px] border-0 bg-white py-[11px] pl-[44px] pr-[38px] text-[14px] leading-[18px] text-[#222] shadow-[inset_0_0_0_1px_#d9d9d9] placeholder:text-[#808080] focus:outline-none focus:shadow-[inset_0_0_0_1px_#119af5]"
            />
          </div>

          {/* ----- Кнопки ----- */}
          <div className="absolute right-0 top-[12px] flex gap-[18px]">
            <Link
              to="/budget"
              className="
                flex-shrink-0
                inline-flex items-center justify-center
                w-[140px] h-[36px]
                bg-[#119af5]
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
                w-[141px] h-[36px]
                bg-[#119af5]
                text-white font-semibold text-[14px] leading-[20px] rounded-[6px] transition
              "
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              Create a new ad
            </Link>
          </div>
      </div>
    </div>
  );
};

export default BudgetBar;
