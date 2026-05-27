import { useEffect, useMemo, useState } from "react";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const ALL_SLOTS = DAYS.flatMap((day) => HOURS.map((hour) => `${day}-${hour}`));

export default function AdScheduleControl({ checked, onChange }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(
    () => new Set(ALL_SLOTS)
  );

  useEffect(() => {
    if (checked && selectedSlots.size === 0) {
      setSelectedSlots(new Set(ALL_SLOTS));
    }
  }, [checked, selectedSlots.size]);

  const summary = useMemo(() => {
    if (selectedSlots.size === ALL_SLOTS.length) return "Mon-Sun: 00-24";
    if (selectedSlots.size === 0) return "No hours selected";

    const selectedDays = DAYS.filter((day) =>
      HOURS.some((hour) => selectedSlots.has(`${day}-${hour}`))
    );
    return `${selectedDays.join(", ")}: custom schedule`;
  }, [selectedSlots]);

  const [summaryLead, summaryRest] = summary.includes(":")
    ? summary.split(/:(.*)/s)
    : [summary, ""];

  const toggleSlot = (slot: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

  const clearSchedule = () => {
    setSelectedSlots(new Set());
    onChange(false);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <label className="inline-flex cursor-pointer items-center gap-3 text-[15px] leading-[22px] text-[#222]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-[21px] w-[21px] rounded-[4px] accent-[#5a9fec]"
          />
          Run this ad on schedule
        </label>

        {checked && (
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="grid h-[130px] w-full overflow-hidden rounded-[6px] border border-[#5a9fec]"
              style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              aria-label="Edit schedule"
            >
              {DAYS.map((day) =>
                HOURS.map((hour) => {
                  const slot = `${day}-${hour}`;
                  return (
                    <span
                      key={slot}
                      className={`border-b border-r border-[#77b2f1] last:border-r-0 ${
                        selectedSlots.has(slot) ? "bg-[#5a9fec]" : "bg-white"
                      }`}
                    />
                  );
                })
              )}
            </button>
            <div className="mt-2 text-center text-[14px] leading-[20px] text-[#222]">
              <strong>{summaryLead}{summaryRest ? ":" : ""}</strong>{summaryRest}{" "}
              <span className="text-[#999]">(viewer's timezone)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mx-auto mt-1 block text-[14px] leading-[20px] text-[#5288b1] hover:text-[#3e769f]"
            >
              Edit Schedule
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="w-full max-w-[1074px] rounded-[6px] bg-white px-9 pb-5 pt-8 shadow-[0_10px_28px_rgba(0,0,0,0.32)]">
            <div className="mb-12 flex items-center justify-between">
              <h2 className="text-[22px] font-bold leading-[28px] text-[#222]">
                Ad Schedule
              </h2>
              <button
                type="button"
                onClick={clearSchedule}
                className="text-[18px] leading-[24px] text-[#5288b1] hover:text-[#3e769f]"
              >
                Clear schedule
              </button>
            </div>

            <div className="grid grid-cols-[52px_1fr] gap-x-4">
              <div />
              <div
                className="grid text-center text-[14px] leading-[18px] text-[#333]"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {HOURS.map((hour) => (
                  <div key={hour}>{hour}</div>
                ))}
              </div>

              <div
                className="mt-3 grid text-right text-[16px] leading-[45px] text-[#333]"
                style={{ gridTemplateRows: "repeat(7, 45px)" }}
              >
                {DAYS.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="mt-3 overflow-hidden rounded-[6px] border border-[#d9d9d9]">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="grid h-[45px] border-b border-[#ebebeb] last:border-b-0"
                    style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
                  >
                    {HOURS.map((hour, index) => (
                      <button
                        key={`${day}-${hour}`}
                        type="button"
                        onClick={() => toggleSlot(`${day}-${hour}`)}
                        className={`border-r border-[#ebebeb] last:border-r-0 ${
                          selectedSlots.has(`${day}-${hour}`)
                            ? "bg-[#5a9fec] hover:bg-[#4b92df]"
                            : "bg-white hover:bg-[#eef6ff]"
                        }`}
                        aria-label={`${day} ${hour}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-11">
              <h3 className="text-[20px] font-bold leading-[26px] text-[#222]">
                Time Zone Settings
              </h3>
              <div className="mt-7 flex flex-col gap-5 text-[18px] leading-[24px] text-[#222]">
                <label className="inline-flex items-center gap-4">
                  <input type="radio" checked readOnly className="h-[24px] w-[24px] accent-[#5a9fec]" />
                  Use timezone of the viewer
                </label>
                <label className="inline-flex items-center gap-4">
                  <input type="radio" readOnly className="h-[24px] w-[24px] accent-[#5a9fec]" />
                  Select a timezone
                  <select
                    disabled
                    value="UTC+5:00"
                    className="ml-4 h-[40px] rounded-[6px] border border-[#d9d9d9] bg-white px-4 text-[18px] text-[#222]"
                  >
                    <option>UTC+5:00</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-8">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded px-1 py-1 text-[18px] font-bold text-[#5288b1] hover:text-[#3e769f]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-[46px] rounded-[6px] bg-[#5a9fec] px-7 text-[18px] font-bold text-white hover:bg-[#4b92df]"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
