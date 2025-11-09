import { useState } from "react";

const TargetSelector = () => {
  const options = ["Search", "Bots", "Channels"];
  const [active, setActive] = useState("Channels");

  return (
    <div className="flex justify-between items-center border-b py-3 px-4">
      {/* Слева: Create Your Ad (beta) */}
      <div className="flex items-center gap-2">
        <h1 className="font-semibold">Create Your Ad</h1>
        <span className="text-gray-500 text-sm">(beta)</span>
      </div>

      {/* Справа: Target selector */}
      <div className="flex items-center gap-2">
        <span className="font-semibold">Target:</span>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => setActive(opt)}
            className={
              active === opt
                ? "bg-blue-500 text-white px-3 py-1 rounded-full"
                : "text-blue-600 hover:underline"
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TargetSelector;
