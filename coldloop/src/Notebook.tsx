import { useState } from "react";
import { Save, Download, BookOpen, Code2 } from "lucide-react";
import {
  metrics,
  toCSV,
  type Config,
  type Row,
  type Scenario,
  type State,
} from "./engine/model";
import { Panel, download } from "./ui";
interface Entry {
  id: string;
  savedAt: string;
  hypothesis: string;
  conclusion: string;
  config: Config;
  scenario: Scenario;
  duration: number;
  metrics: ReturnType<typeof metrics>;
  rows: Row[];
}
const KEY = "coldloop.notebook.v1";
function load(): { entries: Entry[]; error: string } {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (
      !Array.isArray(raw) ||
      !raw.every(
        (e) =>
          e &&
          typeof e.id === "string" &&
          typeof e.hypothesis === "string" &&
          typeof e.conclusion === "string" &&
          typeof e.duration === "number" &&
          typeof e.savedAt === "string" &&
          e.metrics &&
          typeof e.metrics.energy === "number" &&
          typeof e.metrics.mae === "number" &&
          e.config &&
          typeof e.config.target === "number" &&
          Array.isArray(e.rows),
      )
    )
      throw new Error("Notebook data has an unsupported format.");
    return { entries: raw, error: "" };
  } catch {
    return {
      entries: [],
      error:
        "Notebook storage could not be read. Existing data has not been overwritten. Export any visible results before leaving.",
    };
  }
}
export default function Notebook({
  state,
  config,
  scenario,
}: {
  state: State;
  config: Config;
  scenario: Scenario;
}) {
  const [initial] = useState(load);
  const [entries, setEntries] = useState<Entry[]>(initial.entries);
  const [hypothesis, setHypothesis] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [message, setMessage] = useState(initial.error);
  function persist(next: Entry[]) {
    if (initial.error) {
      setMessage(
        "Storage format is unreadable; writing is disabled to preserve existing data. Export this run as CSV.",
      );
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setEntries(next);
      setMessage(
        "Saved locally on this device. Export a backup to keep a separate copy.",
      );
    } catch {
      setMessage(
        "Could not save: browser storage is unavailable or full. Export the current run as CSV instead.",
      );
    }
  }
  function save() {
    if (!hypothesis.trim()) {
      setMessage("Write a hypothesis before saving.");
      return;
    }
    if (state.time < 1) {
      setMessage(
        "Run the bench for at least one simulated second before saving a result.",
      );
      return;
    }
    const entry: Entry = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      hypothesis: hypothesis.trim(),
      conclusion: conclusion.trim(),
      config: { ...config },
      scenario,
      duration: state.time,
      metrics: metrics(state),
      rows: state.rows.map((r) => ({ ...r })),
    };
    persist([...entries, entry]);
  }
  return (
    <div>
      <div className="notebook-layout">
        <Panel title="Your next investigation" code="01">
          <div className="notebook-form">
            <label>
              Hypothesis
              <textarea
                aria-label="Hypothesis"
                placeholder="What do you expect to change, and why?"
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
              />
            </label>
            <div className="notebook-snapshot">
              <span>CURRENT BENCH SNAPSHOT</span>
              <p>
                {state.time.toFixed(1)} s · {config.controller} · target{" "}
                {config.target} °C · {config.mass * 1000} g · {config.thickness}{" "}
                mm · {scenario}
              </p>
              <small>
                Includes current settings, telemetry, and integrated metrics. If
                you changed settings during a run, those changes are visible in
                telemetry where logged; the settings snapshot is the final
                configuration.
              </small>
            </div>
            <label>
              Observations and conclusion
              <textarea
                aria-label="Observations and conclusion"
                placeholder="Record your own observations. What does the result support? What remains uncertain?"
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
              />
            </label>
            <button className="primary" onClick={save}>
              <Save size={14} />
              Save current bench run
            </button>
            <p className="inline-note">
              Only your words and executed simulation results are saved. This
              notebook does not invent completed student work. Experiment-panel
              trials have their own export.
            </p>
            {message && (
              <p className="storage-message" role="status">
                {message}
              </p>
            )}
          </div>
        </Panel>
        <Panel title="An engineering challenge" code="02">
          <div className="challenge">
            <Code2 size={26} className="ice" />
            <h3>Reduce overshoot without excessive cycling.</h3>
            <p>
              Modify the trend-adaptive controller. First establish a baseline
              under an identical synthetic order schedule.
            </p>
            <ol>
              <li>
                Find <code>control()</code> in <code>src/engine/model.ts</code>.
              </li>
              <li>
                Vary the 6 s trend horizon, the ±2 °C bound, or the 0.15
                slope-filter weight in <code>sample()</code>.
              </li>
              <li>Keep both controllers’ minimum ON/OFF limits unchanged.</li>
              <li>
                Run <code>npm test</code>, add a meaningful new comparison, and
                record the tradeoff in tracking error, energy, and starts.
              </li>
            </ol>
            <p className="inline-note">
              Relevant checks: “uses genuinely different controller decisions”
              and the parameterized dwell-constraint tests in{" "}
              <code>tests/model.test.ts</code>. A lower error alone is not proof
              of a better controller.
            </p>
            <div className="blank-results">
              <BookOpen size={15} />
              <span>
                Your personal results belong here. No completed experiment has
                been supplied.
              </span>
            </div>
          </div>
        </Panel>
      </div>
      <Panel
        title="Saved experiments"
        aside={
          <button
            className="text-button"
            disabled={!entries.length}
            onClick={() =>
              download(
                "coldloop-notebook.json",
                JSON.stringify({ model: "0.1", entries }, null, 2),
                "application/json",
              )
            }
          >
            <Download size={13} />
            Export notebook
          </button>
        }
      >
        {entries.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hypothesis</th>
                    <th>Controller / setpoint</th>
                    <th>Duration</th>
                    <th>Mean error</th>
                    <th>Starts</th>
                    <th>Electrical energy</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td>{e.hypothesis}</td>
                      <td>
                        {e.config.controller} / {e.config.target} °C
                      </td>
                      <td>{e.duration.toFixed(1)} s</td>
                      <td>{e.metrics.mae.toFixed(2)} °C</td>
                      <td>{e.metrics.starts}</td>
                      <td>{e.metrics.energy.toFixed(2)} Wh</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="saved-entries">
              {entries.map((e) => (
                <details key={e.id}>
                  <summary>
                    {e.hypothesis}
                    <span>{new Date(e.savedAt).toLocaleDateString()}</span>
                  </summary>
                  <p>{e.conclusion || "No conclusion recorded."}</p>
                  <p className="inline-note">
                    {e.scenario} · model v0.1 · seed {e.config.seed} ·{" "}
                    {e.config.mass * 1000} g · {e.config.thickness} mm
                  </p>
                  <button
                    className="secondary"
                    onClick={() =>
                      download(`coldloop-run-${e.id}.csv`, toCSV(e.rows))
                    }
                  >
                    <Download size={13} />
                    Export run CSV
                  </button>
                </details>
              ))}
            </div>
          </>
        ) : (
          <div className="notebook-empty">
            <BookOpen size={27} />
            <h3>No saved experiments yet.</h3>
            <p>Start with a question. Run the bench. Record what you find.</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
