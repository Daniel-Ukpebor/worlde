import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Thermometer,
  Cpu,
  Gauge,
  Snowflake,
  Radio,
} from "lucide-react";
import { Panel } from "./ui";
const components = [
  {
    name: "Sensor",
    icon: Thermometer,
    tag: "MEASURE",
    input: "True pan temperature (°C)",
    output: "Sampled, delayed temperature (°C) or invalid",
    equation: "y[k] = Tpan(tk − delay) + bias + noise[k]",
    detail:
      "Uniform noise is bounded by the selected amplitude. A seeded generator makes experiments repeatable. Readings are held between samples. Startup delay is filled with the initial pan temperature.",
  },
  {
    name: "Controller",
    icon: Cpu,
    tag: "DECIDE",
    input: "Measurement, target, band, timing state",
    output: "Binary cooling command (0 / 1)",
    equation: "ON if ŷ ≥ Tset + band/2; OFF if ŷ ≤ Tset − band/2",
    detail:
      "Conventional hysteresis uses the latest reading. Trend-adaptive hysteresis uses ŷ = y + clamp(6 × filtered slope, −2, +2) °C. The slope filter is 85% previous slope and 15% new difference. Both strategies respect the same 15 s ON and 20 s OFF dwell times. Invalid sensors and operator stop override ON time.",
  },
  {
    name: "Actuator",
    icon: Gauge,
    tag: "COOL",
    input: "Binary command and enabled state",
    output: "Cooling heat flow (W), electrical input (W)",
    equation: "Qcool = u × 1600 W; Pelectric = 8 W + Qcool / COP",
    detail:
      "Cooling capacity is thermal power removed from the pan. Electrical power is energy drawn per second. An assumed constant COP of 1.6 relates them. These are illustrative values; this model does not solve a refrigerant cycle.",
  },
  {
    name: "Thermal plant",
    icon: Snowflake,
    tag: "RESPOND",
    input: "Ambient gain, mixture heat, cooling",
    output: "Pan temperature and mixture enthalpy",
    equation: "Cpan dTpan/dt = UA(Tambient − Tpan) + G(Tmix − Tpan) − Qcool",
    detail:
      "A lumped pan node (8000 J/K) is coupled to a mixture enthalpy node. Contact conductance G = kA/d × contact factor. Area A = min(0.18, mass/(density × nominal depth)) m²; effective depth follows mass conservation. Equal and opposite contact heat flows preserve energy.",
  },
  {
    name: "Feedback",
    icon: Radio,
    tag: "OBSERVE",
    input: "True temperature from thermal plant",
    output: "New sensor sample; tracking error",
    equation: "etrue = Tpan − Tset; emeasured = y − Tset",
    detail:
      "True tracking error is available to you as the experimenter. The simulated controller only sees the measured value. A biased sensor can appear accurate to the controller while the actual pan misses the target.",
  },
];
export function FlowDiagram({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = useState(1);
  const item = components[selected];
  return (
    <Panel
      title="The feedback loop"
      code="F"
      className="flow-panel"
      aside={<span className="tiny-tag">SELECT A COMPONENT</span>}
    >
      <div className="flow-chain">
        {components.map((c, i) => (
          <div className="flow-step" key={c.name}>
            <button
              className={selected === i ? "selected" : ""}
              onClick={() => setSelected(i)}
            >
              <c.icon size={compact ? 17 : 23} />
              <span>
                <small>{c.tag}</small>
                {c.name}
              </span>
            </button>
            {i < components.length - 1 && (
              <ArrowRight size={15} className="flow-arrow" />
            )}
          </div>
        ))}
      </div>
      <div className="loop-return">
        ↑ <span>MEASURED TEMPERATURE RETURNS TO THE CONTROLLER</span> ↵
      </div>
      <div className="flow-explanation">
        <div>
          <h3>{item.name}</h3>
          <p>{item.detail}</p>
        </div>
        <div>
          <code>{item.equation}</code>
          <p className="flow-io">
            <b>IN</b> {item.input}
            <br />
            <b>OUT</b> {item.output}
          </p>
        </div>
      </div>
    </Panel>
  );
}
const lessons = [
  {
    title: "How refrigeration works",
    text: "A refrigerator moves thermal energy from a colder surface to a warmer room using electrical work. ColdLoop represents that process as a switched cooling capacity and an assumed COP. It does not compute refrigerant pressure, expansion, evaporator saturation, or condenser temperature.",
    equation: "COP = cooling heat-transfer rate / electrical power",
    link: "bench",
  },
  {
    title: "How the pan transfers heat",
    text: "Mixture transfers energy to the cold pan when it is warmer than the pan. Spreading changes contact area and depth while conserving mass. A thinner sheet generally increases the assumed conductance. The model caps contact area at 0.18 m².",
    equation: "Qmixture = (k A / d) × contact × (Tmixture − Tpan)",
    link: "bench",
  },
  {
    title: "Why mixture freezes",
    text: "Temperature alone does not track the energy needed for phase change. We use specific enthalpy with an assumed mushy interval from −6 to −2 °C, effective latent heat 180 kJ/kg, and sensible heat capacities. This simplified interval is not a measured ice cream freezing curve.",
    equation:
      "mass × dh/dt = −Qmixture; frozen estimate = clamp((−2 − Tmix)/4, 0, 1)",
    link: "experiments",
  },
  {
    title: "What a sensor measures",
    text: "A real sensor responds at its physical location. This ideal sensor samples the uniform modeled pan temperature, then adds delay, calibration bias, and reproducible bounded noise. Spatial gradients and sensor thermal inertia are omitted.",
    equation: "measurement = delayed temperature + calibration bias + noise",
    link: "sensors",
  },
  {
    title: "What feedback changes",
    text: "The controller compares a measured state with a target and changes cooling. A thermal disturbance from a warm batch affects the physical state, then the measurement, then future controller decisions. The controller never sees the model’s true-state tracking error.",
    equation:
      "target → error → controller → actuator → plant → sensor → controller",
    link: "bench",
  },
  {
    title: "How hysteresis works",
    text: "A band prevents switching at every tiny measurement change. Above the upper threshold, cooling turns on; below the lower threshold, it turns off. Inside the band, the current state is retained. A trend projection can anticipate threshold crossings, but noise or delay can make that anticipation less useful.",
    equation: "upper = target + band/2; lower = target − band/2",
    link: "experiments",
  },
  {
    title: "Why compressors cycle",
    text: "An on/off actuator cannot deliver an arbitrary continuous cooling power. It alternates between full modeled capacity and no cooling. Minimum dwell times constrain switching. For detected faults or operator stop, inhibition immediately overrides minimum ON time; restarting still requires minimum OFF time.",
    equation: "duty cycle = compressor ON seconds / elapsed seconds",
    link: "bench",
  },
  {
    title: "How controllers influence temperature",
    text: "Both controllers receive the same information and timing constraints. The adaptive option projects the filtered measured temperature trend six seconds forward, bounded to ±2 °C. It can cut cooling earlier, or switch it on earlier while warming. Compare actual results rather than assuming improvement.",
    equation: "ŷ = y + clamp(6 s × filtered d(y)/dt, −2 °C, +2 °C)",
    link: "experiments",
  },
  {
    title: "How electrical energy is calculated",
    text: "Heat-transfer rate and electrical power are both measured in watts, but represent different flows. Electrical energy integrates input power, including an assumed 8 W standby draw. The thermal ledger separately accounts for ambient heat, cooling, and enthalpy imported or exported with batches.",
    equation: "Eelectric [Wh] = Σ Pelectric [W] × Δt [s] / 3600",
    link: "bench",
  },
  {
    title: "Why models differ from machines",
    text: "A 0.1 s explicit Euler integrator updates two uniform nodes. No spatial surface field, fluid flow, refrigerant dynamics, ice crystal size, viscosity, cracking, or roll geometry is predicted. Chopping increases a contact factor by 0.10 as an uncalibrated heuristic. No model parameter is calibrated to Ice’s Corner.",
    equation:
      "energy residual = stored energy change − net imported energy ≈ 0 J",
    link: "notebook",
  },
];
export default function Learning({
  onNavigate,
}: {
  onNavigate: (
    tab: "bench" | "experiments" | "sensors" | "learning" | "notebook",
  ) => void;
}) {
  const [lesson, setLesson] = useState(0);
  const selected = lessons[lesson];
  return (
    <div>
      <FlowDiagram />
      <div className="learning-layout">
        <Panel title="Under the hood" code="10 TOPICS">
          <div className="lesson-list">
            {lessons.map((l, i) => (
              <button
                key={l.title}
                className={i === lesson ? "selected" : ""}
                onClick={() => setLesson(i)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {l.title}
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={selected.title}>
          <div className="lesson-body">
            <span className="eyebrow">
              ENGINEERING NOTE / {String(lesson + 1).padStart(2, "0")}
            </span>
            <h2>{selected.title}</h2>
            <p>{selected.text}</p>
            <code>{selected.equation}</code>
            <button
              className="primary"
              onClick={() =>
                onNavigate(
                  selected.link as
                    "bench" | "experiments" | "sensors" | "notebook",
                )
              }
            >
              Investigate this in the lab <ArrowUpRight size={14} />
            </button>
          </div>
        </Panel>
      </div>
      <Panel title="Assumed parameters, explicit units">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Default</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Pan thermal capacitance",
                  "8000 J/K",
                  "Uniform effective thermal mass",
                ],
                ["Ambient conductance", "7 W/K", "Linear pan heat gain"],
                [
                  "Cooling capacity",
                  "1600 W",
                  "Thermal rate while compressor is ON",
                ],
                [
                  "Electrical COP / standby",
                  "1.6 / 8 W",
                  "Constant illustrative electrical model",
                ],
                [
                  "Density / conductivity",
                  "1050 kg/m³ / 0.45 W/(m·K)",
                  "Assumed homogeneous mixture",
                ],
                [
                  "Liquid / solid heat capacity",
                  "3500 / 2000 J/(kg·K)",
                  "Sensible heat outside mushy range",
                ],
                [
                  "Latent heat / mushy range",
                  "180 kJ/kg / −6…−2 °C",
                  "Linear effective-enthalpy approximation",
                ],
                [
                  "Mushy sensible heat capacity",
                  "2900 J/(kg·K)",
                  "Added to latent heat spread over 4 K",
                ],
                [
                  "Initial / spread contact factor",
                  "0.65 / 1.0",
                  "Heuristic multiplier, increased 0.10 per chop",
                ],
                [
                  "Integration / telemetry",
                  "≤0.1 s / 1 s",
                  "Explicit Euler / saved measurements",
                ],
              ].map(([p, v, d]) => (
                <tr key={p}>
                  <td>{p}</td>
                  <td>{v}</td>
                  <td>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="research-prompt">
        <span>FROM OBSERVATION TO EVIDENCE</span>
        <p>
          Inspired by preparing rolled ice cream at Ice’s Corner. The workplace
          observations motivate the question; they are not validation data. This
          implementation was generated with AI assistance. The notebook starts
          without invented experiments or personal conclusions.
        </p>
      </div>
    </div>
  );
}
