import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import type { Row } from "./engine/model";
export type ChartMode = "thermal" | "electrical" | "control" | "phase";
const series: Record<
  ChartMode,
  { key: keyof Row; label: string; color: string; dashed?: boolean }[]
> = {
  thermal: [
    { key: "pan", label: "Pan", color: "#78cce2" },
    { key: "mixture", label: "Mixture", color: "#eac894" },
    { key: "measured", label: "Sensor", color: "#9babb4", dashed: true },
    { key: "target", label: "Target", color: "#d9e2e6", dashed: true },
  ],
  electrical: [
    { key: "power", label: "Electrical power (W)", color: "#eac894" },
    { key: "energy", label: "Energy (Wh) · right axis", color: "#78cce2" },
  ],
  control: [
    { key: "error", label: "True tracking error (°C)", color: "#78cce2" },
    {
      key: "command",
      label: "Compressor (0/1) · right axis",
      color: "#eac894",
    },
  ],
  phase: [
    { key: "frozen", label: "Modeled frozen fraction (%)", color: "#78cce2" },
  ],
};
export function TelemetryChart({
  rows,
  mode,
}: {
  rows: Row[];
  mode: ChartMode;
}) {
  // Recharts' development store can freeze its input. Never hand it mutable engine state.
  const shown = rows
    .filter(
      (_, i) =>
        rows.length <= 900 ||
        i % Math.ceil(rows.length / 900) === 0 ||
        i === rows.length - 1,
    )
    .map((r) => ({ ...r }));
  const dual = mode === "electrical" || mode === "control";
  const unit =
    mode === "thermal" || mode === "control"
      ? "°C"
      : mode === "phase"
        ? "%"
        : "W";
  return (
    <div className="chart" aria-label={`${mode} telemetry chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={shown}
          margin={{ top: 15, right: dual ? 14 : 24, bottom: 19, left: 2 }}
        >
          <CartesianGrid
            stroke="#2a3339"
            strokeDasharray="2 5"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", (max: number) => Math.max(60, max)]}
            tick={{ fill: "#83939d", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Elapsed time (s)",
              position: "bottom",
              offset: 3,
              fill: "#83939d",
              fontSize: 10,
            }}
          />
          <YAxis
            yAxisId="left"
            width={43}
            domain={mode === "phase" ? [0, 100] : ["auto", "auto"]}
            tick={{ fill: "#83939d", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: unit,
              position: "insideTopLeft",
              fill: "#83939d",
              fontSize: 10,
            }}
          />
          {dual && (
            <YAxis
              yAxisId="right"
              orientation="right"
              width={48}
              domain={mode === "control" ? [0, 1] : ["auto", "auto"]}
              tick={{ fill: "#83939d", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              label={{
                value: mode === "control" ? "on/off" : "Wh",
                position: "insideTopRight",
                fill: "#83939d",
                fontSize: 10,
              }}
            />
          )}
          <Tooltip
            contentStyle={{
              background: "#192126",
              border: "1px solid #42515c",
              borderRadius: 3,
              fontSize: 11,
            }}
            labelFormatter={(label) => `${Number(label).toFixed(1)} s`}
            formatter={(value, name) => [
              typeof value === "number" ? value.toFixed(2) : "—",
              name,
            ]}
          />
          {mode === "control" && (
            <ReferenceLine yAxisId="left" y={0} stroke="#52626d" />
          )}
          {series[mode].map((s, i) => (
            <Line
              key={s.key}
              yAxisId={dual && i === 1 ? "right" : "left"}
              type={
                s.key === "command" || s.key === "power"
                  ? "stepAfter"
                  : "linear"
              }
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={s.key === "measured" ? 1 : 1.7}
              strokeDasharray={s.dashed ? "4 4" : undefined}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
          <Legend
            verticalAlign="top"
            height={30}
            iconType="plainline"
            wrapperStyle={{ fontSize: 10, top: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ComparisonChart({ a, b }: { a: Row[]; b: Row[] }) {
  const rows = a
    .filter((_, i) => i % 3 === 0)
    .map((r) => ({
      time: r.time,
      conventional: r.pan,
      adaptive: b.find((v) => v.time === r.time)?.pan,
      target: r.target,
    }));
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ right: 20, bottom: 18 }}>
          <CartesianGrid
            stroke="#2a3339"
            vertical={false}
            strokeDasharray="2 5"
          />
          <XAxis
            dataKey="time"
            tick={{ fill: "#83939d", fontSize: 10 }}
            label={{
              value: "Elapsed time (s)",
              position: "bottom",
              fill: "#83939d",
              fontSize: 10,
            }}
          />
          <YAxis
            tick={{ fill: "#83939d", fontSize: 10 }}
            domain={["auto", "auto"]}
            label={{
              value: "Pan (°C)",
              angle: -90,
              position: "insideLeft",
              fill: "#83939d",
              fontSize: 10,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#192126",
              border: "1px solid #42515c",
            }}
            formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)}
          />
          <Legend
            verticalAlign="top"
            iconType="plainline"
            wrapperStyle={{ fontSize: 11 }}
          />
          <Line
            dataKey="conventional"
            name="Conventional hysteresis"
            stroke="#eac894"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="adaptive"
            name="Trend-adaptive hysteresis"
            stroke="#78cce2"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="target"
            name="Target"
            stroke="#83939d"
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
