// components/EditCpmModal.tsx
import React, { useEffect, useRef } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: number) => void;
  adName: string;
  initialCpm: number;
};

const EditCpmModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  adName,
  initialCpm,
}) => {
  const [value, setValue] = React.useState(initialCpm);
  const inputRef = useRef<HTMLInputElement>(null);

  // auto-focus при открытии
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="
        fixed inset-0 z-40
        flex items-center justify-center
        bg-black/60
      "
    >
      <div className="bg-white rounded-lg shadow-lg w-[460px] p-6">
        <h2 className="text-lg font-semibold">Edit CPM</h2>
        <p className="text-sm text-gray-500 mb-4">for {adName}</p>

        {/* ——— Инпут с иконкой и конвертацией ——— */}
        <div className="relative mb-2">
          {/* иконка TG-коина слева; подменишь на свою svg */}
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600">
            ╰▞▚╯
          </span>

          <input
            ref={inputRef}
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => setValue(+e.target.value)}
            className="
              w-full pl-10 pr-16 py-[10px]
              border rounded text-sm
              focus:ring-1 focus:ring-blue-500 focus:border-blue-500
            "
          />

          {/* курс-евро справа */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            ~ € {(value * 2.73).toFixed(2)}
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-6">
          Price per 1000 impressions.
        </p>

        {/* ——— Кнопки ——— */}
        <div className="flex justify-end gap-4">
          <button
            className="text-blue-600 hover:underline text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="
              px-4 py-2 text-sm rounded
              bg-blue-500 hover:bg-blue-600 text-white
            "
            onClick={() => {
              onSave(value);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCpmModal;
