import React, { useEffect, useRef, useState } from "react";

interface Props {
  value: string[];
  options?: string[];
  onChange: (updated: string[]) => void;
  placeholder?: string;
  locked?: boolean;
  disabled?: boolean;
}

const LOCK_ICON =
  "data:image/svg+xml,%3Csvg%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Crect%20fill%3D%22%23c1c4c7%22%20height%3D%228%22%20rx%3D%222%22%20width%3D%2210%22%20x%3D%227%22%20y%3D%2210%22%2F%3E%3Crect%20height%3D%2210.5%22%20rx%3D%222.25%22%20stroke%3D%22%23c1c4c7%22%20stroke-width%3D%221.5%22%20width%3D%224.5%22%20x%3D%229.75%22%20y%3D%225.75%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";

export default function MultiSelect({ value, options = [], onChange, placeholder, locked = false, disabled = false }: Props) {
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
    if (disabled) return;
    if (!value.includes(option)) {
      onChange([...value, option]);
      setFilter("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Backspace" && filter === "" && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const filteredOptions = options.filter(
    (opt) =>
      !value.includes(opt) &&
      opt.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      className={`relative min-h-[40px] rounded-md border border-gray-300 bg-white py-1 pl-2 pr-8 ${
        disabled ? "cursor-default" : "cursor-text"
      }`}
      ref={wrapperRef}
      onClick={() => {
        if (disabled) return;
        setOpen(true);
        inputRef.current?.focus();
      }}
    >
      <div className="flex min-h-[30px] flex-wrap items-center gap-1">
        {value.map((v) => (
          <span
            key={v}
            className="flex h-[26px] items-center rounded bg-[#22A3F5] px-2 text-[12px] font-semibold leading-[16px] text-white"
          >
            {v}
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 border-none bg-transparent px-1 py-[3px] text-sm focus:outline-none"
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
      </div>

      {locked && <img src={LOCK_ICON} alt="" className="pointer-events-none absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2" />}

      {open && filteredOptions.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white text-sm shadow">
          {filteredOptions.map((option) => (
            <div
              key={option}
              onClick={() => addItem(option)}
              className="cursor-pointer px-3 py-2 hover:bg-gray-100"
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
