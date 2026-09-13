import { CalendarDays } from "lucide-react";
import { periodLabels, type Period } from "../services/analytics";
export function PeriodSelect({
  value,
  onChange,
}: {
  value: Period;
  onChange: (value: Period) => void;
}) {
  return (
    <div className="period-select">
      <CalendarDays size={15} />
      <select
        aria-label="Date range"
        value={value}
        onChange={(e) => onChange(e.target.value as Period)}
      >
        {Object.entries(periodLabels)
          .filter(([key]) => key !== "month")
          .map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
      </select>
    </div>
  );
}
