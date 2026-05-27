import { useState } from "react";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  locked?: boolean;
};

const LOCK_ICON =
  "data:image/svg+xml,%3Csvg%20height%3D%2218%22%20viewBox%3D%220%200%2018%2018%22%20width%3D%2218%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208V6.2C5%204.43%206.4%203%208.13%203h1.74C11.6%203%2013%204.43%2013%206.2V8h.45c.58%200%201.05.47%201.05%201.05v4.9c0%20.58-.47%201.05-1.05%201.05h-8.9c-.58%200-1.05-.47-1.05-1.05v-4.9C3.5%208.47%203.97%208%204.55%208H5Zm1.5%200h5V6.2c0-.94-.73-1.7-1.63-1.7H8.13c-.9%200-1.63.76-1.63%201.7V8Z%22%20fill%3D%22%23b8b8b8%22%2F%3E%3C%2Fsvg%3E";

export default function TagInput({ value, onChange, placeholder, locked = false }: Props) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      />
      {locked && <img src={LOCK_ICON} alt="" className="pointer-events-none absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2" />}
    </div>
  );
}
