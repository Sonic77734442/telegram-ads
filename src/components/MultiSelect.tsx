import React, { useState, useRef, useEffect } from "react";

interface Props {
  value: string[];
  options?: string[];
  onChange: (updated: string[]) => void;
}

export default function MultiSelect({ value, options = [], onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addItem = (option: string) => {
    if (!value.includes(option)) {
      onChange([...value, option]);
      setFilter("");
    }
  };

  const removeItem = (option: string) => {
    onChange(value.filter((v) => v !== option));
  };

  const filteredOptions = options.filter(
    (opt) =>
      !value.includes(opt) &&
      opt.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      className="relative border border-gray-300 rounded-md px-3 py-2 bg-white"
      ref={wrapperRef}
    >
      {/* Теги */}
      <div className="flex flex-wrap gap-1">
        {value.map((v) => (
          <span
            key={v}
            className="bg-[#229ED9] text-white text-xs px-2 py-1 rounded flex items-center gap-1"
          >
            {v}
            <button
              type="button"
              onClick={() => removeItem(v)}
              className="text-white text-[10px] hover:text-red-200"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      {/* Обёртка с иконкой ▼ */}
		<div className="relative mt-1">
		  <input
			ref={inputRef}
			type="text"
			placeholder="Select…"
			className="w-full text-sm px-2 py-1 pr-6 border border-gray-200 rounded focus:outline-none appearance-none"
			onFocus={() => setOpen(true)}
			value={filter}
			onChange={(e) => setFilter(e.target.value)}
		  />

		  {/* Стрелка ▼ */}
		  <div className="pointer-events-none absolute right-2 inset-y-0 flex items-center text-gray-400 text-xs">
			▼
		  </div>
		</div>

      {/* Дропдаун */}
      {open && filteredOptions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full border rounded bg-white shadow text-sm max-h-60 overflow-auto">
          {filteredOptions.map((option) => (
            <div
              key={option}
              onClick={() => addItem(option)}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
