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

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="border border-[#d9d9d9] rounded-[4px] px-2 py-1 bg-white flex flex-wrap gap-2">
      {value.map((tag) => (
        <span
          key={tag}
          className="bg-blue-600 text-white text-[11px] px-2 py-[3px] rounded-[3px] cursor-pointer"
          onClick={() => removeTag(tag)}
        >
          {tag} ✕
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] outline-none text-sm"
      />
    </div>
  );
}
