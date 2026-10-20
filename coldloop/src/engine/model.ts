/** All default values are illustrative assumptions, not measured machine specifications. */
export type Controller = "hysteresis" | "adaptive";
export type Fault = "none" | "disconnected" | "implausible";
export type Scenario =
  "manual" | "quiet" | "rush" | "continuous" | "large" | "sensor";
export interface Config {
  target: number;
  band: number;
  ambient: number;
  panCapacity: number;
  cooling: number;
  cop: number;
  ambientUA: number;
  minOn: number;
  minOff: number;
  controller: Controller;
  sampleHz: number;
  noise: number;
  bias: number;
  delay: number;
  fault: Fault;
  mass: number;
  inlet: number;
  thickness: number;
  seed: number;
}
export const DEFAULTS: Config = {
  target: -18,
  band: 2,
  ambient: 25,
  panCapacity: 8000,
  cooling: 1600,
  cop: 1.6,
  ambientUA: 7,
  minOn: 15,
  minOff: 20,
  controller: "hysteresis",
  sampleHz: 2,
  noise: 0.08,
  bias: 0,
  delay: 0,
  fault: "none",
  mass: 0.12,
  inlet: 8,
  thickness: 2,
  seed: 42,
};
export const MATERIAL = {
  density: 1050,
  conductivity: 0.45,
  panArea: 0.18,
  cpLiquid: 3500,
  cpSolid: 2000,
  latent: 180000,
  solidus: -6,
  liquidus: -2,
};
const mushCp = MATERIAL.latent / 4 + 2900;
const mushH = mushCp * 4;
export function enthalpyAt(t: number): number {
  if (t < -6) return MATERIAL.cpSolid * (t + 6);
  if (t <= -2) return mushCp * (t + 6);
  return mushH + MATERIAL.cpLiquid * (t + 2);
}
export function phase(h: number) {
  return h < 0
    ? { temperature: -6 + h / MATERIAL.cpSolid, frozen: 1 }
    : h <= mushH
      ? { temperature: -6 + h / mushCp, frozen: 1 - h / mushH }
      : { temperature: -2 + (h - mushH) / MATERIAL.cpLiquid, frozen: 0 };
}
export interface Mixture {
  mass: number;
  h: number;
  thickness: number;
  contact: number;
}
export interface Event {
  time: number;
  message: string;
  kind: "action" | "switch" | "fault";
}
export interface Row {
  time: number;
  pan: number;
  measured: number | null;
  mixture: number | null;
  target: number;
  frozen: number;
  command: number;
  power: number;
  energy: number;
  error: number;
}
export interface State {
  time: number;
  pan: number;
  initialPan: number;
  measured: number | null;
  mixture: Mixture | null;
  enabled: boolean;
  compressor: boolean;
  lastSwitch: number;
  starts: number;
  onSeconds: number;
  energyJ: number;
  ambientJ: number;
  coolingJ: number;
  importedJ: number;
  exportedJ: number;
  mixtureTransferJ: number;
  absError: number;
  outside: number;
  nextSample: number;
  rng: number;
  samples: { time: number; value: number }[];
  slope: number;
  previousReading: number | null;
  faultActive: boolean;
  events: Event[];
  rows: Row[];
  nextRow: number;
  orderIndex: number;
  recoveryStart: number | null;
  recoveryDeparted: boolean;
  recoveries: number[];
}
export function createState(c: Config = DEFAULTS): State {
  validate(c);
  const s: State = {
    time: 0,
    pan: -16,
    initialPan: -16,
    measured: -16,
    mixture: null,
    enabled: true,
    compressor: false,
    lastSwitch: -c.minOff,
    starts: 0,
    onSeconds: 0,
    energyJ: 0,
    ambientJ: 0,
    coolingJ: 0,
    importedJ: 0,
    exportedJ: 0,
    mixtureTransferJ: 0,
    absError: 0,
    outside: 0,
    nextSample: 0,
    rng: c.seed >>> 0,
    samples: [],
    slope: 0,
    previousReading: null,
    faultActive: false,
    events: [],
    rows: [],
    nextRow: 1,
    orderIndex: 0,
    recoveryStart: null,
    recoveryDeparted: false,
    recoveries: [],
  };
  s.rows.push(row(s, c));
  return s;
}
function event(s: State, message: string, kind: Event["kind"] = "action") {
  s.events.push({ time: s.time, message, kind });
  if (s.events.length > 160) s.events.shift();
}
export function validate(c: Config) {
  if (
    Object.values(c).some((v) => typeof v === "number" && !Number.isFinite(v))
  )
    throw new Error("Parameters must be finite.");
  if (
    c.target < -35 ||
    c.target > 0 ||
    c.ambient < 0 ||
    c.ambient > 45 ||
    c.panCapacity < 1000 ||
    c.cooling < 0 ||
    c.cooling > 5000 ||
    c.cop <= 0 ||
    c.ambientUA < 0 ||
    c.band <= 0 ||
    c.minOn < 0 ||
    c.minOff < 0 ||
    c.sampleHz < 0.2 ||
    c.sampleHz > 10 ||
    c.noise < 0 ||
    c.noise > 5 ||
    c.delay < 0 ||
    c.delay > 30 ||
    c.mass < 0.05 ||
    c.mass > 0.5 ||
    c.inlet < 0 ||
    c.inlet > 35 ||
    c.thickness < 0.5 ||
    c.thickness > 8
  )
    throw new Error("Parameters are outside the supported model range.");
}
export function removeMixture(s: State, action = "Scraped / removed batch") {
  if (!s.mixture) return;
  s.exportedJ += s.mixture.mass * s.mixture.h;
  s.mixture = null;
  event(s, action);
}
export function addMixture(s: State, c: Config, mass = c.mass) {
  if (!Number.isFinite(mass) || mass < 0.05 || mass > 0.5)
    throw new Error("Batch mass must be 0.05–0.5 kg.");
  removeMixture(s, "Previous batch removed before next order");
  s.mixture = {
    mass,
    h: enthalpyAt(c.inlet),
    thickness: c.thickness,
    contact: 0.65,
  };
  s.importedJ += mass * s.mixture.h;
  s.recoveryStart = s.time;
  s.recoveryDeparted = false;
  event(s, `Added ${(mass * 1000).toFixed(0)} g mixture at ${c.inlet} °C`);
}
export function spread(s: State, thickness: number) {
  if (!s.mixture) return;
  s.mixture.thickness = Math.max(0.5, Math.min(8, thickness));
  s.mixture.contact = 1;
  event(s, `Spread to ${s.mixture.thickness.toFixed(1)} mm nominal thickness`);
}
export function chop(s: State) {
  if (!s.mixture) return;
  s.mixture.contact = Math.min(1, s.mixture.contact + 0.1);
  event(s, "Chop: assumed contact factor increased by 0.10 (heuristic)");
}
export function geometry(m: Mixture) {
  const area = Math.min(
    MATERIAL.panArea,
    m.mass / MATERIAL.density / (m.thickness / 1000),
  );
  const thickness = m.mass / MATERIAL.density / area;
  return {
    area,
    thickness,
    conductance: ((MATERIAL.conductivity * area) / thickness) * m.contact,
  };
}
export function setEnabled(s: State, enabled: boolean) {
  s.enabled = enabled;
  if (!enabled && s.compressor) switchCompressor(s, false);
  event(
    s,
    enabled
      ? "Cooling enabled; minimum off time still applies"
      : "Cooling disabled by operator",
  );
}
function switchCompressor(s: State, on: boolean) {
  s.compressor = on;
  s.lastSwitch = s.time;
  if (on) s.starts++;
  event(s, on ? "Compressor ON" : "Compressor OFF", "switch");
}
function sample(s: State, c: Config) {
  // Uniform bounded noise, reproducible and controller-independent: one PRNG draw per sample.
  s.rng = (Math.imul(1664525, s.rng) + 1013904223) >>> 0;
  s.samples.push({ time: s.time, value: s.pan });
  const wanted = s.time - c.delay;
  while (s.samples.length > 1 && s.samples[1].time <= wanted + 1e-8)
    s.samples.shift();
  const reading =
    c.fault === "disconnected"
      ? null
      : c.fault === "implausible"
        ? 100
        : s.samples[0].value +
          c.bias +
          ((s.rng / 4294967296) * 2 - 1) * c.noise;
  const fault = reading === null || reading < -50 || reading > 50;
  if (fault !== s.faultActive)
    event(
      s,
      fault
        ? "Sensor invalid: cooling inhibited immediately"
        : "Sensor valid: cooling may resume after minimum off time",
      "fault",
    );
  s.faultActive = fault;
  s.measured = reading;
  if (!fault && reading !== null) {
    const derivative =
      s.previousReading === null
        ? 0
        : (reading - s.previousReading) * c.sampleHz;
    s.slope = 0.85 * s.slope + 0.15 * derivative;
    s.previousReading = reading;
  } else {
    s.slope = 0;
    s.previousReading = null;
  }
}
function control(s: State, c: Config) {
  if (!s.enabled || s.faultActive || s.measured === null) {
    if (s.compressor) switchCompressor(s, false); // fault and operator stop override minimum ON time
    return;
  }
  // Six-second trend projection, bounded to ±2 °C. No future order information.
  const estimate =
    s.measured +
    (c.controller === "adaptive" ? Math.max(-2, Math.min(2, s.slope * 6)) : 0);
  const elapsed = s.time - s.lastSwitch;
  if (
    !s.compressor &&
    estimate >= c.target + c.band / 2 &&
    elapsed >= c.minOff - 1e-8
  )
    switchCompressor(s, true);
  else if (
    s.compressor &&
    estimate <= c.target - c.band / 2 &&
    elapsed >= c.minOn - 1e-8
  )
    switchCompressor(s, false);
}
export const SCENARIOS: Record<
  Scenario,
  { label: string; description: string; interval: number }
> = {
  manual: {
    label: "Manual bench",
    description: "You control each batch and operator action.",
    interval: Infinity,
  },
  quiet: {
    label: "Quiet shift",
    description: "120 g every 180 s; a synthetic demand schedule.",
    interval: 180,
  },
  rush: {
    label: "After-school rush",
    description: "120 g every 75 s; a synthetic demand schedule.",
    interval: 75,
  },
  continuous: {
    label: "Continuous orders",
    description:
      "120 g every 45 s; remaining mixture removed at the next order.",
    interval: 45,
  },
  large: {
    label: "Unexpected large order",
    description: "Quiet schedule, with a 320 g order at 190 s.",
    interval: 180,
  },
  sensor: {
    label: "Sensor error in a rush",
    description: "Rush schedule; sensor disconnects from 180–240 s.",
    interval: 75,
  },
};
export function row(s: State, c: Config): Row {
  const p = s.mixture ? phase(s.mixture.h) : null;
  return {
    time: +s.time.toFixed(2),
    pan: s.pan,
    measured: s.measured,
    mixture: p?.temperature ?? null,
    target: c.target,
    frozen: (p?.frozen ?? 0) * 100,
    command: +s.compressor,
    power: 8 + (s.compressor ? c.cooling / c.cop : 0),
    energy: s.energyJ / 3600,
    error: s.pan - c.target,
  };
}
/** Explicit Euler with <=0.1 s substeps; writes one telemetry row per simulated second. */
export function advance(
  s: State,
  c: Config,
  seconds: number,
  scenario: Scenario = "manual",
  maxStep = 0.1,
) {
  validate(c);
  if (
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    seconds > 3600 ||
    maxStep <= 0 ||
    maxStep > 0.1
  )
    throw new Error("Invalid integration duration or step.");
  const end = s.time + seconds;
  while (s.time < end - 1e-8) {
    const dt = Math.min(maxStep, end - s.time);
    if (
      scenario !== "manual" &&
      s.time >= 10 + s.orderIndex * SCENARIOS[scenario].interval - 1e-8
    ) {
      const mass = scenario === "large" && s.orderIndex === 1 ? 0.32 : c.mass;
      addMixture(s, c, mass);
      spread(s, c.thickness);
      s.orderIndex++;
    }
    const current =
      scenario === "sensor" && s.time >= 180 && s.time < 240
        ? { ...c, fault: "disconnected" as const }
        : c;
    if (s.time >= s.nextSample - 1e-8) {
      sample(s, current);
      s.nextSample = s.time + 1 / c.sampleHz;
    }
    control(s, current);
    const ambient = c.ambientUA * (c.ambient - s.pan);
    const cooling = s.compressor ? c.cooling : 0;
    const transfer = s.mixture
      ? geometry(s.mixture).conductance *
        (phase(s.mixture.h).temperature - s.pan)
      : 0;
    // Equal and opposite inter-node heat flow preserves energy, including phase change.
    s.pan += ((ambient + transfer - cooling) / c.panCapacity) * dt;
    if (s.mixture) s.mixture.h -= (transfer / s.mixture.mass) * dt;
    s.ambientJ += ambient * dt;
    s.coolingJ += cooling * dt;
    s.mixtureTransferJ += transfer * dt;
    s.energyJ += (8 + cooling / c.cop) * dt;
    s.onSeconds += +s.compressor * dt;
    s.absError += Math.abs(s.pan - c.target) * dt;
    if (Math.abs(s.pan - c.target) > c.band / 2) s.outside += dt;
    if (s.recoveryStart !== null && Math.abs(s.pan - c.target) > c.band / 2)
      s.recoveryDeparted = true;
    if (
      s.recoveryStart !== null &&
      s.recoveryDeparted &&
      s.time > s.recoveryStart + 1 &&
      Math.abs(s.pan - c.target) <= c.band / 2
    ) {
      s.recoveries.push(s.time - s.recoveryStart);
      s.recoveryStart = null;
    }
    s.time += dt;
    if (!Number.isFinite(s.pan) || (s.mixture && !Number.isFinite(s.mixture.h)))
      throw new Error("Non-finite simulation state. Reset the experiment.");
    if (s.time >= s.nextRow - 1e-8) {
      s.rows.push(row(s, c));
      s.nextRow += 1;
      if (s.rows.length > 3601) s.rows.shift();
    }
  }
}
export function energyResidual(s: State, c: Config) {
  const stored =
    c.panCapacity * (s.pan - s.initialPan) +
    (s.mixture ? s.mixture.mass * s.mixture.h : 0);
  return stored - (s.ambientJ - s.coolingJ + s.importedJ - s.exportedJ);
}
export function metrics(s: State) {
  return {
    mae: s.time ? s.absError / s.time : 0,
    outside: s.outside,
    starts: s.starts,
    runtime: s.onSeconds,
    duty: s.time ? (s.onSeconds / s.time) * 100 : 0,
    energy: s.energyJ / 3600,
    recovery: s.recoveries.length
      ? s.recoveries.reduce((a, b) => a + b, 0) / s.recoveries.length
      : null,
  };
}
export function runTrial(
  c: Config,
  duration = 600,
  scenario: Scenario = "rush",
): State {
  const s = createState(c);
  advance(s, c, duration, scenario);
  return s;
}
export function toCSV(rows: Row[]) {
  const headers: (keyof Row)[] = [
    "time",
    "pan",
    "measured",
    "mixture",
    "target",
    "frozen",
    "command",
    "power",
    "energy",
    "error",
  ];
  return [
    "time_s,pan_C,measured_C,mixture_C,target_C,frozen_percent,compressor_on,power_W,electrical_Wh,error_C",
    ...rows.map((r) =>
      headers.map((k) => (r[k] === null ? "" : r[k])).join(","),
    ),
  ].join("\n");
}
