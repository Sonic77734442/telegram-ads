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
      className="relative border border-gray-300 rounded-md px-2 py-2 bg-white min-h-[34px] cursor-text"
      ref={wrapperRef}
      onClick={() => {
        setOpen(true);
        inputRef.current?.focus();
      }}
    >
      {/* Теги + инпут в одной строке */}
      <div className="flex flex-wrap gap-1 items-center">
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

        <input
          ref={inputRef}
          type="text"
          placeholder=""
          className="flex-1 min-w-[120px] text-sm px-1 py-1 bg-transparent border-none focus:outline-none"
          onFocus={() => setOpen(true)}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
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
