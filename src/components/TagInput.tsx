import { useState } from "react";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

export default function TagInput({ value, onChange, placeholder }: Props) {
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
    <div className="flex min-h-[40px] flex-wrap items-center gap-2 rounded-[4px] border border-[#d9d9d9] bg-white px-2 py-1">
      {value.map((tag) => (
        <span
          key={tag}
          className="flex h-[26px] items-center rounded-[3px] bg-[#22A3F5] px-2 text-[11px] font-bold text-white"
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
    </div>
  );
}
