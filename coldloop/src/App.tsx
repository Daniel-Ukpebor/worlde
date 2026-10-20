import { useEffect, useRef, useState } from "react";
import {
  Snowflake,
  Play,
  Pause,
  RotateCcw,
  Download,
  ChevronRight,
  Activity,
  Cpu,
  BookOpen,
  FlaskConical,
  SlidersHorizontal,
  ArrowUpRight,
  Plus,
  Waves,
  MoveHorizontal,
  Scissors,
  CircleHelp,
  Radio,
  Power,
  AlertTriangle,
} from "lucide-react";
import {
  DEFAULTS,
  SCENARIOS,
  addMixture,
  advance,
  chop,
  createState,
  energyResidual,
  geometry,
  metrics,
  phase,
  removeMixture,
  setEnabled,
  spread,
  toCSV,
  type Config,
  type Scenario,
} from "./engine/model";
import Pan from "./Pan";
import { TelemetryChart, type ChartMode } from "./Charts";
import { Panel, Range, Stat, download, fmtTime } from "./ui";
import Experiments from "./Experiments";
import Notebook from "./Notebook";
import Learning, { FlowDiagram } from "./Learning";
type Tab = "bench" | "experiments" | "sensors" | "learning" | "notebook";
const tabs = [
  { key: "bench", label: "Control room", icon: Activity },
  { key: "experiments", label: "Experiments", icon: FlaskConical },
  { key: "sensors", label: "Sensor lab", icon: Radio },
  { key: "learning", label: "Under the hood", icon: BookOpen },
  { key: "notebook", label: "Notebook", icon: Cpu },
] as const;
export default function App() {
  const [config, setConfig] = useState<Config>({ ...DEFAULTS });
  const cfg = useRef(config);
  cfg.current = config;
  const engine = useRef(createState(config));
  const [, render] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [tab, setTab] = useState<Tab>("bench");
  const [scenario, setScenario] = useState<Scenario>("manual");
  const scenarioRef = useRef(scenario);
  scenarioRef.current = scenario;
  const [chart, setChart] = useState<ChartMode>("thermal");
  const [notice, setNotice] = useState(
    "Bench initialized. Start the clock, then add a batch.",
  );
  const [error, setError] = useState("");
  const replayConfig = useRef(config);
  const replayScenario = useRef<Scenario>("manual");
  const patch = <K extends keyof Config>(key: K, value: Config[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000) * speed;
      last = now;
      try {
        advance(engine.current, cfg.current, dt, scenarioRef.current);
        render((n) => n + 1);
      } catch (e) {
        setError(String(e));
        setRunning(false);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [running, speed]);
  function reset(next = scenario, replay = false) {
    const c = replay ? replayConfig.current : config;
    const sc = replay ? replayScenario.current : next;
    if (replay) setConfig(c);
    else {
      replayConfig.current = { ...c };
      replayScenario.current = sc;
    }
    engine.current = createState(c);
    setScenario(sc);
    setRunning(false);
    setError("");
    setNotice(
      replay
        ? "Initial parameters restored. Replay starts the seeded scenario; manual actions must be repeated."
        : `Fresh run · ${SCENARIOS[sc].label}. Seed ${c.seed}.`,
    );
    render((n) => n + 1);
  }
  const s = engine.current;
  const m = metrics(s);
  const mix = s.mixture ? phase(s.mixture.h) : null;
  function action(fn: () => void, message: string) {
    fn();
    setNotice(message);
    render((n) => n + 1);
  }
  const scrape = () =>
    action(
      () => removeMixture(s),
      "Batch removed and its remaining enthalpy accounted for. Roll shape and texture are not predicted.",
    );
  const faultCount = s.events.filter((e) => e.kind === "fault").length;
  const title =
    tab === "bench"
      ? "The freezing bench"
      : tab === "experiments"
        ? "Ask a better freezing question."
        : tab === "sensors"
          ? "Trust the measurement?"
          : tab === "learning"
            ? "Follow the energy. Close the loop."
            : "Leave a trail of evidence.";
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("bench");
          }}
        >
          <span className="brand-icon">
            <Snowflake size={24} />
          </span>
          <span>
            COLD<span className="ice">LOOP</span>
            <small>ENGINEERING THE PERFECT FREEZE</small>
          </span>
        </a>
        <div className="header-meta">
          <span className="status-dot" /> LOCAL SIMULATION
          <span className="header-divider" />
          MODEL v0.1 <span className="model-badge">NOT HARDWARE</span>
        </div>
        <button
          className="icon-button"
          aria-label="Open model explanation"
          onClick={() => setTab("learning")}
        >
          <CircleHelp size={18} />
        </button>
      </header>
      <nav className="main-nav" aria-label="Laboratory sections">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "active" : ""}
            onClick={() => setTab(t.key)}
          >
            <t.icon size={15} />
            {t.label}
            {t.key === "notebook" && <span className="nav-dot" />}
          </button>
        ))}
        <span className="nav-right">REFRIGERATION & CONTROL LAB / 001</span>
      </nav>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              {String(tabs.findIndex((t) => t.key === tab) + 1).padStart(
                2,
                "0",
              )}{" "}
              / INTERACTIVE ENGINEERING LABORATORY
            </div>
            <h1>{title}</h1>
            <p>
              {tab === "bench"
                ? "A cold surface. A warm batch. A feedback loop you can investigate."
                : tab === "experiments"
                  ? "Repeatable conditions. Comparable controllers. Outcomes calculated, not assumed."
                  : tab === "sensors"
                    ? "Change what the controller sees. Watch what the thermal plant actually does."
                    : tab === "learning"
                      ? "The assumptions, equations, and decisions behind every instrument."
                      : "Your hypotheses, measured simulation results, and conclusions. Stored on this device."}
            </p>
          </div>
          <div className={`run-indicator ${running ? "live" : ""}`}>
            <span className="status-dot" />
            {running ? "SIMULATION RUNNING" : "SIMULATION PAUSED"}
            <b>
              {fmtTime(s.time)} <small>sim</small>
            </b>
          </div>
        </div>
        {(tab === "bench" || tab === "sensors") && (
          <>
            <div className="transport">
              <div className="transport-left">
                <button
                  className="primary compact"
                  onClick={() => setRunning(!running)}
                >
                  {running ? <Pause size={14} /> : <Play size={14} />}{" "}
                  {running ? "Pause" : "Run simulation"}
                </button>
                <button
                  className="icon-button"
                  aria-label="Reset simulation"
                  onClick={() => reset()}
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  className="text-button"
                  onClick={() => reset(scenario, true)}
                >
                  Replay seed
                </button>
                <span className="transport-divider" />
                <label className="speed-control">
                  SPEED{" "}
                  <select
                    aria-label="Simulation speed"
                    value={speed}
                    onChange={(e) => setSpeed(+e.target.value)}
                  >
                    {[1, 5, 20, 60].map((v) => (
                      <option key={v} value={v}>
                        {v}×
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="scenario-select">
                <span>LOAD SCENARIO</span>
                <select
                  aria-label="Load scenario"
                  value={scenario}
                  onChange={(e) => reset(e.target.value as Scenario)}
                >
                  {Object.entries(SCENARIOS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            {tab === "bench" ? (
              <>
                <div className="bench-layout">
                  <div className="machine-column">
                    <Panel
                      title="Freezing workstation"
                      code="A"
                      aside={<span className="tiny-tag">VIRTUAL PAN</span>}
                    >
                      <Pan state={s} scrape={scrape} />
                      <div className="pan-state-strip">
                        <div>
                          <span>SURFACE</span>
                          <b>
                            {s.pan.toFixed(1)}
                            <small> °C</small>
                          </b>
                        </div>
                        <div>
                          <span>MIXTURE</span>
                          <b>
                            {mix ? mix.temperature.toFixed(1) : "—"}
                            <small> {mix ? "°C" : "no batch"}</small>
                          </b>
                        </div>
                        <div>
                          <span>PHASE ESTIMATE</span>
                          <b>
                            {mix ? (mix.frozen * 100).toFixed(0) : "—"}
                            <small> {mix ? "% frozen" : "—"}</small>
                          </b>
                        </div>
                      </div>
                      <div className="operator-block">
                        <div className="section-label">
                          <span>OPERATOR ACTIONS</span>
                          <span>YOU ARE PART OF THE LOOP</span>
                        </div>
                        <div className="action-grid">
                          <button
                            onClick={() =>
                              action(
                                () => addMixture(s, config),
                                `Added ${Math.round(config.mass * 1000)} g. Warm mixture now exchanges heat with the pan.`,
                              )
                            }
                          >
                            <Plus size={16} />
                            Add mixture
                          </button>
                          <button
                            disabled={!s.mixture}
                            onClick={() =>
                              action(
                                () => chop(s),
                                "Contact factor increased by 0.10. This is an explicit heuristic, not a calibrated chopping law.",
                              )
                            }
                          >
                            <Waves size={16} />
                            Chop / mix
                          </button>
                          <button
                            disabled={!s.mixture}
                            onClick={() =>
                              action(
                                () => spread(s, config.thickness),
                                "Nominal thickness applied; area follows mass conservation, capped at the pan area.",
                              )
                            }
                          >
                            <MoveHorizontal size={16} />
                            Spread
                          </button>
                          <button disabled={!s.mixture} onClick={scrape}>
                            <Scissors size={16} />
                            Scrape batch
                          </button>
                        </div>
                        <div className="operator-sliders">
                          <Range
                            label="Batch mass"
                            value={config.mass * 1000}
                            min={50}
                            max={500}
                            step={10}
                            unit="g"
                            onChange={(v) => patch("mass", v / 1000)}
                          />
                          <Range
                            label="Nominal thickness"
                            value={config.thickness}
                            min={0.5}
                            max={8}
                            step={0.1}
                            unit="mm"
                            onChange={(v) => {
                              patch("thickness", v);
                              if (s.mixture)
                                action(
                                  () => spread(s, v),
                                  "Thickness updated. Effective contact area recalculated.",
                                );
                            }}
                          />
                        </div>
                        <div className="inline-note">
                          {s.mixture
                            ? `${(geometry(s.mixture).area * 1e4).toFixed(0)} cm² contact · ${(geometry(s.mixture).thickness * 1000).toFixed(1)} mm effective depth · contact factor ${s.mixture.contact.toFixed(2)}`
                            : "Batch settings apply on addition. Spreading changes thermal contact."}
                        </div>
                      </div>
                    </Panel>
                  </div>
                  <div className="instrument-column">
                    <Panel
                      title="Live instruments"
                      code="B"
                      aside={<Activity size={14} className="ice" />}
                    >
                      <div className="sensor-display">
                        <span className="section-label">
                          PAN TEMPERATURE · TRUE STATE
                        </span>
                        <div className="big-temperature">
                          {s.pan.toFixed(1)}
                          <span>°C</span>
                        </div>
                        <div className="sensor-meta">
                          <span>
                            SENSOR{" "}
                            <b className={s.faultActive ? "fault-text" : ""}>
                              {s.measured === null
                                ? "DISCONNECTED"
                                : `${s.measured.toFixed(1)} °C`}
                            </b>
                          </span>
                          <span>
                            ERROR{" "}
                            <b>
                              {s.pan - config.target > 0 ? "+" : ""}
                              {(s.pan - config.target).toFixed(1)} °C
                            </b>
                          </span>
                        </div>
                      </div>
                      <div className="output-block">
                        <div className="section-label">
                          <span>COOLING COMMAND</span>
                          <b className={s.compressor ? "ice" : ""}>
                            {s.compressor ? "ON / 100%" : "OFF / 0%"}
                          </b>
                        </div>
                        <div className="output-track">
                          <span
                            style={{ width: s.compressor ? "100%" : "0%" }}
                          />
                        </div>
                        <div className="output-labels">
                          <span>0 W</span>
                          <span>{config.cooling} W thermal</span>
                        </div>
                      </div>
                      <div className="instrument-metrics">
                        <Stat
                          label="Electrical energy"
                          value={m.energy.toFixed(2)}
                          unit="Wh"
                          note="Integrated electrical input"
                          tone="ice"
                        />
                        <Stat
                          label="Compressor duty"
                          value={m.duty.toFixed(0)}
                          unit="%"
                          note={`${m.starts} starts · ${m.runtime.toFixed(0)} s operating`}
                        />
                        <Stat
                          label="Mixture heat removed"
                          value={(s.mixtureTransferJ / 1000).toFixed(1)}
                          unit="kJ"
                          note="Net transfer across all batches"
                        />
                        <Stat
                          label="Energy balance residual"
                          value={Math.abs(
                            energyResidual(s, config),
                          ).toExponential(1)}
                          unit="J"
                          note="Numerical accounting check"
                        />
                      </div>
                      <button
                        className="link-button instrument-link"
                        onClick={() => setTab("learning")}
                      >
                        Inspect the model <ArrowUpRight size={14} />
                      </button>
                    </Panel>
                  </div>
                  <div className="control-column">
                    <Panel
                      title="Electronic controller"
                      code="C"
                      aside={<SlidersHorizontal size={14} />}
                    >
                      <div className="controller-body">
                        <div className="setpoint-header">
                          <label htmlFor="setpoint">TARGET TEMPERATURE</label>
                          <div>
                            {config.target.toFixed(1)}
                            <span>°C</span>
                          </div>
                        </div>
                        <input
                          id="setpoint"
                          aria-label="Target temperature"
                          type="range"
                          min="-30"
                          max="-8"
                          step=".5"
                          value={config.target}
                          onChange={(e) => patch("target", +e.target.value)}
                        />
                        <div className="range-extents">
                          <span>−30 °C</span>
                          <span>−8 °C</span>
                        </div>
                        <div className="section-label controller-label">
                          CONTROL STRATEGY
                        </div>
                        <div className="controller-options">
                          <button
                            className={
                              config.controller === "hysteresis"
                                ? "selected"
                                : ""
                            }
                            onClick={() => patch("controller", "hysteresis")}
                          >
                            <span className="radio-mark" />
                            <span>
                              Conventional hysteresis
                              <small>Switch at fixed band thresholds</small>
                            </span>
                          </button>
                          <button
                            className={
                              config.controller === "adaptive" ? "selected" : ""
                            }
                            onClick={() => patch("controller", "adaptive")}
                          >
                            <span className="radio-mark" />
                            <span>
                              Trend-adaptive hysteresis
                              <small>Bounded 6 s temperature projection</small>
                            </span>
                          </button>
                        </div>
                        <Range
                          label="Hysteresis band"
                          value={config.band}
                          min={0.5}
                          max={6}
                          step={0.5}
                          unit="°C"
                          onChange={(v) => patch("band", v)}
                        />
                        <div className="spec-list">
                          <div>
                            <span>Minimum ON / OFF</span>
                            <b>
                              {config.minOn} / {config.minOff} s
                            </b>
                          </div>
                          <div>
                            <span>Illustrative cooling capacity</span>
                            <b>{config.cooling} W</b>
                          </div>
                          <div>
                            <span>Assumed COP</span>
                            <b>{config.cop.toFixed(1)}</b>
                          </div>
                          <div>
                            <span>Electrical power now</span>
                            <b>
                              {(
                                8 +
                                (s.compressor ? config.cooling / config.cop : 0)
                              ).toFixed(0)}{" "}
                              W
                            </b>
                          </div>
                        </div>
                        <button
                          className={`power-button ${s.enabled ? "enabled" : ""}`}
                          onClick={() => {
                            const enabled = !s.enabled;
                            action(
                              () => setEnabled(s, enabled),
                              enabled
                                ? "Cooling enabled."
                                : "Cooling stopped. Ambient heat transfer continues when the clock runs.",
                            );
                          }}
                        >
                          <Power size={15} />
                          {s.enabled ? "Cooling enabled" : "Cooling disabled"}
                          <span className="status-dot" />
                        </button>
                      </div>
                    </Panel>
                  </div>
                </div>
                <div className="lower-layout">
                  <Panel
                    title="Thermal & electrical telemetry"
                    code="D"
                    aside={
                      <button
                        className="text-button"
                        onClick={() =>
                          download("coldloop-telemetry.csv", toCSV(s.rows))
                        }
                      >
                        <Download size={12} />
                        CSV
                      </button>
                    }
                  >
                    <div className="chart-tabs">
                      {(
                        ["thermal", "electrical", "control", "phase"] as const
                      ).map((c) => (
                        <button
                          key={c}
                          className={chart === c ? "active" : ""}
                          onClick={() => setChart(c)}
                        >
                          {c === "thermal"
                            ? "Temperature"
                            : c === "electrical"
                              ? "Power & energy"
                              : c === "control"
                                ? "Error & switching"
                                : "Freezing estimate"}
                        </button>
                      ))}
                      <span>Δt ≤ 0.1 s / 1 Hz LOG</span>
                    </div>
                    <TelemetryChart rows={s.rows} mode={chart} />
                  </Panel>
                  <Panel
                    title="Bench log"
                    code="E"
                    aside={
                      <span className="tiny-tag">{s.events.length} EVENTS</span>
                    }
                  >
                    <div className="bench-log">
                      {s.events.length ? (
                        s.events
                          .slice(-9)
                          .reverse()
                          .map((e, i) => (
                            <div key={`${e.time}-${i}`} className={e.kind}>
                              <time>{fmtTime(e.time)}</time>
                              <span>{e.message}</span>
                            </div>
                          ))
                      ) : (
                        <div className="empty-log">
                          <Activity size={20} />
                          <p>Your experiment starts here.</p>
                          <small>
                            Operator actions, compressor switches, and sensor
                            faults appear as they occur.
                          </small>
                        </div>
                      )}
                    </div>
                    <button
                      className="link-button log-link"
                      onClick={() => setTab("notebook")}
                    >
                      Record this run <ChevronRight size={14} />
                    </button>
                  </Panel>
                </div>
                <FlowDiagram compact />
              </>
            ) : (
              <div className="sensor-layout">
                <Panel title="Measurement chain" code="F">
                  <div className="sensor-settings">
                    <p className="muted">
                      These settings affect the controller’s measurement. The
                      true pan temperature remains a separate physical state.
                    </p>
                    <Range
                      label="Sampling frequency"
                      value={config.sampleHz}
                      min={0.5}
                      max={10}
                      step={0.5}
                      unit="Hz"
                      onChange={(v) => patch("sampleHz", v)}
                    />
                    <Range
                      label="Bounded noise amplitude"
                      value={config.noise}
                      min={0}
                      max={3}
                      step={0.05}
                      unit="± °C"
                      onChange={(v) => patch("noise", v)}
                    />
                    <Range
                      label="Calibration bias"
                      value={config.bias}
                      min={-8}
                      max={8}
                      step={0.1}
                      unit="°C"
                      onChange={(v) => patch("bias", v)}
                    />
                    <Range
                      label="Measurement delay"
                      value={config.delay}
                      min={0}
                      max={20}
                      step={0.5}
                      unit="s"
                      onChange={(v) => patch("delay", v)}
                    />
                    <label className="select-field">
                      Sensor fault
                      <select
                        aria-label="Sensor fault"
                        value={config.fault}
                        onChange={(e) =>
                          patch("fault", e.target.value as Config["fault"])
                        }
                      >
                        <option value="none">None / valid measurement</option>
                        <option value="disconnected">Disconnect sensor</option>
                        <option value="implausible">
                          Implausible reading (+100 °C)
                        </option>
                      </select>
                    </label>
                    <button
                      className="secondary"
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          sampleHz: 2,
                          noise: 0.08,
                          bias: 0,
                          delay: 0,
                          fault: "none",
                        }))
                      }
                    >
                      Restore sensor defaults
                    </button>
                    <p className="inline-note">
                      Detection: disconnected or outside −50…50 °C → immediate
                      cooling inhibit at next sample. Minimum ON time is
                      overridden; minimum OFF time still applies. Bias and
                      plausible stale values are not detected. Not safety
                      certified.
                    </p>
                  </div>
                </Panel>
                <div>
                  <div className="fault-stats">
                    <Stat label="True pan" value={s.pan.toFixed(2)} unit="°C" />
                    <Stat
                      label="Sensor reading"
                      value={s.measured === null ? "—" : s.measured.toFixed(2)}
                      unit="°C"
                    />
                    <Stat
                      label="Detection status"
                      value={s.faultActive ? "FAULT" : "VALID"}
                      tone={s.faultActive ? "fault-text" : "ice"}
                    />
                  </div>
                  <Panel title="True vs measured temperature">
                    <TelemetryChart rows={s.rows} mode="thermal" />
                  </Panel>
                  <Panel
                    title="Fault history"
                    aside={
                      <span className="tiny-tag">{faultCount} TRANSITIONS</span>
                    }
                  >
                    <div className="fault-history">
                      {s.events
                        .filter((e) => e.kind === "fault")
                        .map((e, i) => (
                          <p key={i}>
                            <time>{fmtTime(e.time)}</time> {e.message}
                          </p>
                        ))}
                      {!faultCount && (
                        <p>
                          No detected faults in this run. Inject one while the
                          clock runs.
                        </p>
                      )}
                    </div>
                  </Panel>
                </div>
              </div>
            )}
            <div className="notice" role="status">
              <span className="status-dot" />
              {notice}
            </div>
          </>
        )}
        {tab === "experiments" && <Experiments config={config} />}
        {tab === "learning" && <Learning onNavigate={setTab} />}
        {tab === "notebook" && (
          <Notebook state={s} config={config} scenario={scenario} />
        )}
        <div className="model-disclosure">
          <AlertTriangle size={13} />
          <span>
            Illustrative software model. Parameters are assumptions, not
            specifications of the machine at Ice’s Corner. Frozen fraction is an
            enthalpy estimate; texture and roll quality are not predicted.
          </span>
        </div>
      </main>
      <footer>
        <span>
          <Snowflake size={12} />
          COLDLOOP <b>/</b> FROM A WORKPLACE OBSERVATION TO AN ENGINEERING
          QUESTION
        </span>
        <button onClick={() => setTab("learning")}>
          MODEL ASSUMPTIONS <ArrowUpRight size={11} />
        </button>
      </footer>
    </div>
  );
}
