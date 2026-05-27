import { useState } from "react";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  locked?: boolean;
  disabled?: boolean;
};

const LOCK_ICON =
  "data:image/svg+xml,%3Csvg%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Crect%20fill%3D%22%23c1c4c7%22%20height%3D%228%22%20rx%3D%222%22%20width%3D%2210%22%20x%3D%227%22%20y%3D%2210%22%2F%3E%3Crect%20height%3D%2210.5%22%20rx%3D%222.25%22%20stroke%3D%22%23c1c4c7%22%20stroke-width%3D%221.5%22%20width%3D%224.5%22%20x%3D%229.75%22%20y%3D%225.75%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";

export default function TagInput({ value, onChange, placeholder, locked = false, disabled = false }: Props) {
  const [input, setInput] = useState("");

  const addTag = () => {
    if (disabled) return;
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
      return;
    }

    if (e.key === "Backspace" && input === "" && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="relative flex min-h-[40px] flex-wrap items-center gap-2 rounded-[4px] border border-[#d9d9d9] bg-white py-1 pl-2 pr-8">
      {value.map((tag) => (
        <span
          key={tag}
          className="flex h-[26px] items-center rounded-[3px] bg-[#22A3F5] px-2 text-[12px] font-semibold leading-[16px] text-white"
        >
          {tag}
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-w-[120px] flex-1 text-sm outline-none"
        disabled={disabled}
      />
      {locked && <img src={LOCK_ICON} alt="" className="pointer-events-none absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2" />}
    </div>
  );
}
