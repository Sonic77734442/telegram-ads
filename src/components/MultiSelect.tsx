import React, { useEffect, useRef, useState } from "react";

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      className="relative min-h-[40px] cursor-text rounded-md border border-gray-300 bg-white px-2 py-1"
      ref={wrapperRef}
      onClick={() => {
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
          placeholder=""
          className="min-w-[120px] flex-1 border-none bg-transparent px-1 py-[3px] text-sm focus:outline-none"
          onFocus={() => setOpen(true)}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

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
