import { useState } from "react";
import {
  Play,
  Download,
  ArrowRight,
  GitCompareArrows,
  FlaskConical,
} from "lucide-react";
import {
  DEFAULTS,
  SCENARIOS,
  addMixture,
  advance,
  createState,
  metrics,
  phase,
  runTrial,
  spread,
  toCSV,
  type Config,
  type Scenario,
  type State,
} from "./engine/model";
import { ComparisonChart, TelemetryChart } from "./Charts";
import { Panel, Range, Stat, download } from "./ui";
interface PerfectTrial {
  id: number;
  config: Config;
  duration: number;
  pan: number;
  mixture: number;
  frozen: number;
  heat: number;
  energy: number;
  duty: number;
}
export default function Experiments({ config }: { config: Config }) {
  const [mode, setMode] = useState<"rush" | "roll">("rush");
  const [scenario, setScenario] = useState<Scenario>("rush");
  const [duration, setDuration] = useState(600);
  const [pair, setPair] = useState<{
    a: State;
    b: State;
    config: Config;
    scenario: Scenario;
    duration: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [trialConfig, setTrialConfig] = useState<Config>({ ...config });
  const [freezeTime, setFreezeTime] = useState(90);
  const [trials, setTrials] = useState<PerfectTrial[]>([]);
  const [latest, setLatest] = useState<State | null>(null);
  const patch = <K extends keyof Config>(key: K, value: Config[K]) =>
    setTrialConfig((c) => ({ ...c, [key]: value }));
  function compare() {
    setBusy(true);
    setError("");
    setTimeout(() => {
      try {
        const c = { ...config };
        const a = runTrial(
          { ...c, controller: "hysteresis" },
          duration,
          scenario,
        );
        const b = runTrial(
          { ...c, controller: "adaptive" },
          duration,
          scenario,
        );
        setPair({ a, b, config: c, scenario, duration });
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy(false);
      }
    }, 20);
  }
  function freeze() {
    setBusy(true);
    setError("");
    setTimeout(() => {
      try {
        const c = { ...trialConfig };
        const s = createState(c);
        addMixture(s, c);
        spread(s, c.thickness);
        advance(s, c, freezeTime);
        const p = phase(s.mixture!.h);
        const m = metrics(s);
        const trial = {
          id: trials.length + 1,
          config: c,
          duration: freezeTime,
          pan: s.pan,
          mixture: p.temperature,
          frozen: p.frozen * 100,
          heat: s.mixtureTransferJ / 1000,
          energy: m.energy,
          duty: m.duty,
        };
        setTrials((t) => [...t, trial]);
        setLatest(s);
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy(false);
      }
    }, 20);
  }
  const a = pair ? metrics(pair.a) : null;
  const b = pair ? metrics(pair.b) : null;
  return (
    <div className="experiments">
      <div className="experiment-switch">
        <button
          className={mode === "rush" ? "active" : ""}
          onClick={() => setMode("rush")}
        >
          <GitCompareArrows size={17} />
          Rush Hour Lab<span>01</span>
        </button>
        <button
          className={mode === "roll" ? "active" : ""}
          onClick={() => setMode("roll")}
        >
          <FlaskConical size={17} />
          The Perfect Roll Problem<span>02</span>
        </button>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {mode === "rush" ? (
        <div className="experiment-layout">
          <Panel title="Define the disturbance" code="01">
            <div className="experiment-settings">
              <p>
                Can a temperature-trend controller handle repeated warm batches
                with less tracking error or electrical energy? The answer
                depends on the conditions.
              </p>
              <label className="select-field">
                Synthetic order schedule
                <select
                  aria-label="Comparison scenario"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value as Scenario)}
                >
                  {Object.entries(SCENARIOS)
                    .filter(([k]) => k !== "manual")
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                </select>
              </label>
              <p className="inline-note">
                {SCENARIOS[scenario].description} Orders begin at 10 s; each new
                order removes any remaining prior batch and spreads the new one.
              </p>
              <Range
                label="Comparison duration"
                value={duration}
                min={300}
                max={1800}
                step={60}
                unit="s"
                onChange={setDuration}
              />
              <div className="spec-list">
                <div>
                  <span>Initial pan</span>
                  <b>−16 °C</b>
                </div>
                <div>
                  <span>Bench setpoint</span>
                  <b>{config.target} °C</b>
                </div>
                <div>
                  <span>Batch / thickness</span>
                  <b>
                    {config.mass * 1000} g / {config.thickness} mm
                  </b>
                </div>
                <div>
                  <span>Ambient</span>
                  <b>{config.ambient} °C</b>
                </div>
                <div>
                  <span>Seed / sensor fault</span>
                  <b>
                    {config.seed} / {config.fault}
                  </b>
                </div>
                <div>
                  <span>Shared minimum ON / OFF</span>
                  <b>
                    {config.minOn} / {config.minOff} s
                  </b>
                </div>
              </div>
              <p className="inline-note">
                Uses current bench and sensor settings. Only the controller
                strategy changes. Neither receives future demand. Random draws
                use the same seed and sample schedule.
              </p>
              <button
                className="primary full"
                disabled={busy}
                onClick={compare}
              >
                <Play size={14} />
                {busy ? "Computing…" : "Compare controllers"}
                <ArrowRight size={15} />
              </button>
            </div>
          </Panel>
          <div className="experiment-results">
            <Panel
              title="Controller response"
              code="02"
              aside={
                pair && (
                  <span className="tiny-tag">
                    {pair.duration} s · SEED {pair.config.seed}
                  </span>
                )
              }
            >
              {pair ? (
                <>
                  <p className="result-caption">
                    {SCENARIOS[pair.scenario].label} · target{" "}
                    {pair.config.target} °C · {pair.config.mass * 1000} g ·{" "}
                    {pair.config.thickness} mm · ambient {pair.config.ambient}{" "}
                    °C. Results remain tied to this parameter snapshot.
                  </p>
                  <ComparisonChart a={pair.a.rows} b={pair.b.rows} />
                </>
              ) : (
                <div className="experiment-empty">
                  <GitCompareArrows size={34} />
                  <h3>Same workload. Two decisions.</h3>
                  <p>
                    Run a comparison to calculate both temperature trajectories
                    and electrical measurements.
                  </p>
                </div>
              )}
            </Panel>
            {a && b && pair && (
              <Panel title="Measured simulation outcomes">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Conventional</th>
                        <th>Trend-adaptive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        [
                          "Mean absolute tracking error",
                          `${a.mae.toFixed(2)} °C`,
                          `${b.mae.toFixed(2)} °C`,
                        ],
                        [
                          "Time outside target ± band/2",
                          `${a.outside.toFixed(1)} s`,
                          `${b.outside.toFixed(1)} s`,
                        ],
                        ["Compressor starts", a.starts, b.starts],
                        [
                          "Compressor operating time",
                          `${a.runtime.toFixed(1)} s`,
                          `${b.runtime.toFixed(1)} s`,
                        ],
                        [
                          "Duty cycle",
                          `${a.duty.toFixed(1)} %`,
                          `${b.duty.toFixed(1)} %`,
                        ],
                        [
                          "Electrical energy",
                          `${a.energy.toFixed(2)} Wh`,
                          `${b.energy.toFixed(2)} Wh`,
                        ],
                        [
                          "Mean first return to target band",
                          a.recovery === null
                            ? "Not observed"
                            : `${a.recovery.toFixed(1)} s`,
                          b.recovery === null
                            ? "Not observed"
                            : `${b.recovery.toFixed(1)} s`,
                        ],
                        [
                          "Unresolved latest recovery",
                          pair.a.recoveryStart === null
                            ? "None"
                            : "Still pending / censored",
                          pair.b.recoveryStart === null
                            ? "None"
                            : "Still pending / censored",
                        ],
                      ].map(([label, av, bv]) => (
                        <tr key={label}>
                          <td>{label}</td>
                          <td>{av}</td>
                          <td>{bv}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="result-footer">
                  <p>
                    Recovery requires departure from the band, then first return
                    after ≥1 s; it does not imply settling. A new order censors
                    the previous pending recovery. No controller is declared
                    universally better.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => {
                      download("coldloop-conventional.csv", toCSV(pair.a.rows));
                      download("coldloop-adaptive.csv", toCSV(pair.b.rows));
                    }}
                  >
                    Export both CSVs <Download size={13} />
                  </button>
                </div>
              </Panel>
            )}
            <div className="research-prompt">
              <span>ENGINEERING QUESTION</span>
              <p>
                When order frequency rises, does a lower tracking error come at
                the cost of more compressor starts? Use the table to support
                your answer.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="experiment-layout">
            <Panel title="One batch, one hypothesis" code="01">
              <div className="experiment-settings">
                <p>
                  Does maintaining a thermal range offer a more useful operating
                  condition than simply cooling harder? This model measures
                  thermal outcomes. It cannot tell you whether a real roll will
                  curl or crack.
                </p>
                <Range
                  label="Trial setpoint"
                  value={trialConfig.target}
                  min={-30}
                  max={-8}
                  step={0.5}
                  unit="°C"
                  onChange={(v) => patch("target", v)}
                />
                <Range
                  label="Trial thickness"
                  value={trialConfig.thickness}
                  min={0.5}
                  max={8}
                  step={0.1}
                  unit="mm"
                  onChange={(v) => patch("thickness", v)}
                />
                <Range
                  label="Trial mass"
                  value={trialConfig.mass * 1000}
                  min={50}
                  max={500}
                  step={10}
                  unit="g"
                  onChange={(v) => patch("mass", v / 1000)}
                />
                <Range
                  label="Ambient temperature"
                  value={trialConfig.ambient}
                  min={15}
                  max={40}
                  unit="°C"
                  onChange={(v) => patch("ambient", v)}
                />
                <Range
                  label="Mixture inlet temperature"
                  value={trialConfig.inlet}
                  min={0}
                  max={25}
                  unit="°C"
                  onChange={(v) => patch("inlet", v)}
                />
                <Range
                  label="Freezing duration"
                  value={freezeTime}
                  min={15}
                  max={300}
                  step={5}
                  unit="s"
                  onChange={setFreezeTime}
                />
                <label className="select-field">
                  Trial controller
                  <select
                    aria-label="Trial controller"
                    value={trialConfig.controller}
                    onChange={(e) =>
                      patch(
                        "controller",
                        e.target.value as Config["controller"],
                      )
                    }
                  >
                    <option value="hysteresis">Conventional hysteresis</option>
                    <option value="adaptive">Trend-adaptive hysteresis</option>
                  </select>
                </label>
                <button
                  className="primary full"
                  disabled={busy}
                  onClick={freeze}
                >
                  <Play size={14} />
                  {busy ? "Computing…" : "Run freezing trial"}
                </button>
                <button
                  className="text-button"
                  onClick={() => setTrialConfig({ ...DEFAULTS })}
                >
                  Restore trial defaults
                </button>
              </div>
            </Panel>
            <div className="experiment-results">
              <Panel title="Latest trial trajectory" code="02">
                {latest ? (
                  <TelemetryChart rows={latest.rows} mode="thermal" />
                ) : (
                  <div className="experiment-empty">
                    <FlaskConical size={34} />
                    <h3>Investigate the conditions.</h3>
                    <p>
                      Start at −16 °C, add one batch at 0 s, spread it, and
                      observe the calculated thermal response.
                    </p>
                  </div>
                )}
              </Panel>
              {trials.length > 0 && (
                <div className="trial-stats">
                  <Stat
                    label="Mixture heat removed"
                    value={trials.at(-1)!.heat.toFixed(1)}
                    unit="kJ"
                  />
                  <Stat
                    label="Frozen estimate"
                    value={trials.at(-1)!.frozen.toFixed(0)}
                    unit="%"
                  />
                  <Stat
                    label="Electrical input"
                    value={trials.at(-1)!.energy.toFixed(2)}
                    unit="Wh"
                  />
                </div>
              )}
              <div className="research-prompt">
                <span>NO ROLLABILITY SCORE</span>
                <p>
                  Frozen fraction estimates energy stored in phase change. It
                  does not describe viscosity, ice crystal size, brittleness, or
                  successful rolling. Keep these thermal results separate from
                  texture observations.
                </p>
              </div>
            </div>
          </div>
          <Panel
            title="Trial comparison"
            aside={
              <button
                className="text-button"
                disabled={!trials.length}
                onClick={() =>
                  download(
                    "coldloop-freezing-trials.json",
                    JSON.stringify({ model: "0.1", trials }, null, 2),
                    "application/json",
                  )
                }
              >
                <Download size={13} />
                Export trials
              </button>
            }
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {[
                      "Trial",
                      "Controller",
                      "Setpoint",
                      "Mass",
                      "Depth",
                      "Ambient",
                      "Inlet",
                      "Time",
                      "Pan",
                      "Mixture",
                      "Frozen est.",
                      "Heat removed",
                      "Duty",
                      "Electricity",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trials.map((t) => (
                    <tr key={t.id}>
                      <td>#{t.id}</td>
                      <td>{t.config.controller}</td>
                      <td>{t.config.target} °C</td>
                      <td>{t.config.mass * 1000} g</td>
                      <td>{t.config.thickness} mm</td>
                      <td>{t.config.ambient} °C</td>
                      <td>{t.config.inlet} °C</td>
                      <td>{t.duration} s</td>
                      <td>{t.pan.toFixed(1)} °C</td>
                      <td>{t.mixture.toFixed(1)} °C</td>
                      <td>{t.frozen.toFixed(0)} %</td>
                      <td>{t.heat.toFixed(1)} kJ</td>
                      <td>{t.duty.toFixed(0)} %</td>
                      <td>{t.energy.toFixed(2)} Wh</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!trials.length && (
                <p className="empty-table">
                  No completed trials. Your results will appear here.
                </p>
              )}
            </div>
            <p className="result-caption">
              Trials are retained while this experiment panel is open. Export
              before navigating away to preserve the full parameter snapshots.
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}
