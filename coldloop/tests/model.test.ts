import { describe, it, expect } from "vitest";
import {
  DEFAULTS,
  MATERIAL,
  addMixture,
  advance,
  chop,
  createState,
  energyResidual,
  enthalpyAt,
  geometry,
  metrics,
  phase,
  removeMixture,
  runTrial,
  setEnabled,
  spread,
  toCSV,
  type Config,
} from "../src/engine/model";
const config = (patch: Partial<Config> = {}) => ({
  ...DEFAULTS,
  noise: 0,
  ...patch,
});
describe("enthalpy and heat transfer", () => {
  it("round-trips sensible and phase-change regions continuously", () => {
    for (const t of [-30, -6.001, -6, -4, -2, -1.999, 8, 30])
      expect(phase(enthalpyAt(t)).temperature).toBeCloseTo(t, 9);
    expect(phase(enthalpyAt(-4)).frozen).toBeCloseTo(0.5);
    expect(phase(enthalpyAt(8)).frozen).toBe(0);
    expect(phase(enthalpyAt(-12)).frozen).toBe(1);
  });
  it("removes sensible and latent energy before reaching a solid state", () => {
    const c = config();
    const s = createState(c);
    addMixture(s, c);
    spread(s, 1);
    advance(s, c, 180);
    expect(s.mixture!.h).toBeLessThan(0);
    expect(s.mixtureTransferJ).toBeGreaterThan(c.mass * MATERIAL.latent);
    expect(Math.abs(energyResidual(s, c))).toBeLessThan(1e-5);
  });
  it("heats an unpowered pan toward ambient without overshooting", () => {
    const c = config();
    const s = createState(c);
    setEnabled(s, false);
    advance(s, c, 3600);
    const expected =
      c.ambient +
      (s.initialPan - c.ambient) *
        Math.exp((-c.ambientUA / c.panCapacity) * 3600);
    expect(s.pan).toBeGreaterThan(s.initialPan);
    expect(s.pan).toBeLessThan(c.ambient);
    expect(s.pan).toBeCloseTo(expected, 3);
  });
  it("warms the pan when warm mixture is added with cooling off", () => {
    const c = config({ ambientUA: 0 });
    const plain = createState(c);
    const loaded = createState(c);
    setEnabled(plain, false);
    setEnabled(loaded, false);
    addMixture(loaded, c);
    advance(plain, c, 20);
    advance(loaded, c, 20);
    expect(loaded.pan).toBeGreaterThan(plain.pan);
    expect(Math.abs(energyResidual(loaded, c))).toBeLessThan(1e-6);
  });
  it("spreading changes contact geometry without adding energy", () => {
    const c = config();
    const s = createState(c);
    addMixture(s, c);
    const h = s.mixture!.h;
    const before = geometry(s.mixture!).conductance;
    spread(s, 1);
    chop(s);
    expect(geometry(s.mixture!).conductance).toBeGreaterThan(before);
    expect(s.mixture!.h).toBe(h);
    expect(geometry(s.mixture!).area).toBeLessThanOrEqual(MATERIAL.panArea);
  });
  it("accounts for exported and imported enthalpy across repeated batches", () => {
    const c = config();
    const s = runTrial(c, 600, "continuous");
    removeMixture(s);
    expect(s.orderIndex).toBe(14);
    expect(Math.abs(energyResidual(s, c))).toBeLessThan(1e-5);
  });
  it("converges when the integration step is halved", () => {
    const c = config();
    const a = createState(c);
    const b = createState(c);
    advance(a, c, 300, "rush", 0.1);
    advance(b, c, 300, "rush", 0.05);
    expect(Math.abs(a.pan - b.pan)).toBeLessThan(0.06);
    expect(Math.abs(a.energyJ - b.energyJ) / a.energyJ).toBeLessThan(0.02);
  });
});
describe("electronic controls and electrical energy", () => {
  it.each(["hysteresis", "adaptive"] as const)(
    "%s respects both compressor dwell constraints",
    (controller) => {
      const c = config({ controller });
      const s = runTrial(c, 1200, "rush");
      const switches = s.events.filter((e) => e.kind === "switch");
      expect(s.starts).toBeGreaterThan(1);
      for (let i = 1; i < switches.length; i++) {
        const elapsed = switches[i].time - switches[i - 1].time;
        expect(elapsed + 1e-6).toBeGreaterThanOrEqual(
          switches[i - 1].message.endsWith("ON") ? c.minOn : c.minOff,
        );
      }
    },
  );
  it("integrates electrical input separately from cooling energy", () => {
    const c = config();
    const s = runTrial(c, 600);
    expect(s.energyJ).toBeCloseTo(
      8 * s.time + (c.cooling / c.cop) * s.onSeconds,
      5,
    );
    expect(s.coolingJ).toBeCloseTo(c.cooling * s.onSeconds, 5);
    expect(metrics(s).energy).toBeCloseTo(s.energyJ / 3600);
  });
  it("uses genuinely different controller decisions on the same schedule", () => {
    const a = runTrial(config({ controller: "hysteresis" }));
    const b = runTrial(config({ controller: "adaptive" }));
    expect(a.orderIndex).toBe(b.orderIndex);
    expect(a.rng).toBe(b.rng);
    expect(a.rows.map((r) => r.command)).not.toEqual(
      b.rows.map((r) => r.command),
    );
  });
  it("reproduces seeded sensor noise and rush outcomes exactly", () => {
    const c = { ...DEFAULTS };
    const a = runTrial(c);
    const b = runTrial(c);
    expect(a.rows).toEqual(b.rows);
    expect(metrics(a)).toEqual(metrics(b));
  });
  it.each(["disconnected", "implausible"] as const)(
    "inhibits cooling on %s and logs detection",
    (fault) => {
      const c = config();
      const s = createState(c);
      advance(s, c, 2);
      expect(s.compressor).toBe(true);
      const atFault = s.time;
      advance(s, { ...c, fault }, 1);
      expect(s.compressor).toBe(false);
      expect(s.faultActive).toBe(true);
      expect(s.events.some((e) => e.kind === "fault")).toBe(true);
      advance(s, c, c.minOff - 2);
      expect(s.compressor).toBe(false);
      expect(s.lastSwitch).toBeGreaterThanOrEqual(atFault - 0.1);
    },
  );
  it("bias and delay alter the measurement, not the true physical temperature", () => {
    const c = config({ bias: 2, delay: 3 });
    const s = createState(c);
    advance(s, c, 2);
    expect(s.measured).toBe(-14);
    expect(s.pan).not.toBe(s.measured);
  });
  it("operator stop immediately disables the compressor", () => {
    const c = config();
    const s = createState(c);
    advance(s, c, 1);
    setEnabled(s, false);
    advance(s, c, 20);
    expect(s.compressor).toBe(false);
    expect(s.onSeconds).toBeCloseTo(1);
  });
});
describe("scenario integration and export", () => {
  it("large-order and fault scenarios exercise their stated disturbances", () => {
    const c = config();
    const large = runTrial(c, 220, "large");
    expect(large.events.some((e) => e.message.includes("320 g"))).toBe(true);
    const sensor = runTrial(c, 260, "sensor");
    expect(
      sensor.rows
        .filter((r) => r.time > 181 && r.time < 239)
        .every((r) => !r.command && r.measured === null),
    ).toBe(true);
    expect(sensor.events.filter((e) => e.kind === "fault").length).toBe(2);
  });
  it("emits real one-second telemetry with units and missing values in CSV", () => {
    const s = runTrial(config(), 10, "manual");
    const csv = toCSV(s.rows);
    expect(s.rows).toHaveLength(11);
    expect(csv.split("\n")).toHaveLength(12);
    expect(csv).toContain("electrical_Wh");
    expect(csv).not.toContain("null");
  });
  it("rejects invalid configuration and integration steps", () => {
    expect(() => createState(config({ cop: 0 }))).toThrow();
    expect(() => createState(config({ sampleHz: 0 }))).toThrow();
    expect(() => advance(createState(), config(), 1, "manual", 1)).toThrow();
    expect(() => advance(createState(), config(), NaN)).toThrow();
  });
});
