import type { ReactNode } from "react";
export function Panel({
  title,
  code,
  children,
  className = "",
  aside,
}: {
  title: string;
  code?: string;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>
          {code && <span>{code}</span>}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="range-field">
      <span>
        <span>{label}</span>
        <output>
          {value.toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)}{" "}
          <small>{unit}</small>
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}
export function Stat({
  label,
  value,
  unit,
  note,
  tone = "",
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  tone?: string;
}) {
  return (
    <div className={`stat ${tone}`}>
      <span className="stat-label">{label}</span>
      <div className="stat-value">
        {value}
        <small>{unit}</small>
      </div>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}
export function download(name: string, body: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const fmtTime = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
