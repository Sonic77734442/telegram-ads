import React from "react";

type Props = {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
};

export default function Field({ label, value, onChange, placeholder = "", type = "text" }: Props) {
  return (
    <div className="mb-4">
      <label className="mx-[13px] mb-[5px] flex h-[18px] items-center text-[14px] font-semibold leading-[19px] antialiased">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="border rounded px-3 py-2 w-full"
      />
    </div>
  );
}
