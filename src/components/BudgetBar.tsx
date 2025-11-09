// src/components/BudgetBar.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Container from "./Container";

const BudgetBar: React.FC = () => {
  const [query, setQuery] = useState("");

  return (
    <div className="border-b bg-white">
      <Container>
        <div className="flex items-center justify-between py-3">
          {/* ----- Поиск ----- */}
          <div className="relative w-[260px] flex-shrink-0 mr-[5px]">
			<svg
			  className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
			  xmlns="http://www.w3.org/2000/svg"
			  width="16"
			  height="16"
			  fill="none"
			  stroke="currentColor"
			  strokeWidth="2"
			  strokeLinecap="round"
			  strokeLinejoin="round"
			  viewBox="0 0 24 24"
			>
			  <circle cx="11" cy="11" r="8" />
			  <line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ads by name or link"
              autoComplete="off"
              className="
                w-full pl-10 pr-3 py-[6px]
                text-sm text-gray-700 placeholder-gray-500
                border border-gray-300 rounded
                focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
              "
            />
          </div>

          {/* ----- Кнопки ----- */}
          <div className="flex gap-2">
            <Link
              to="/budget"
              className="
                flex-shrink-0
                bg-blue-500 hover:bg-blue-600
                text-white px-4 py-2 text-sm rounded transition
              "
            >
              Manage budget
            </Link>

            <Link
              to="/ad/new"
              className="
                flex-shrink-0
                bg-blue-500 hover:bg-blue-600
                text-white px-4 py-2 text-sm rounded transition
              "
            >
              Create a new ad
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default BudgetBar;
