import { useRef } from "react";
import { CalendarDays } from "lucide-react";

type DateInputProps = {
  value: string;
  ariaLabel: string;
  onChange: (value: string) => void;
};

export function DateInput({ value, ariaLabel, onChange }: DateInputProps) {
  const pickerRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }
    picker.click();
  };

  return (
    <div className="date-input">
      <input
        value={value}
        inputMode="numeric"
        placeholder="YYYY-MM-DD"
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="button" onClick={openPicker} aria-label={`${ariaLabel} 달력 열기`} title="달력 열기">
        <CalendarDays size={17} />
      </button>
      <input
        ref={pickerRef}
        className="date-input-picker"
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
