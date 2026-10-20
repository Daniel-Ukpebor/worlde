# Code guide

| Location                       | Responsibility                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `src/engine/model.ts`          | Typed states/configuration, enthalpy inversion, geometry, controls, fault detection, integration, demand, metrics, CSV |
| `src/App.tsx`                  | Bench clock, configuration, transport, sensor lab, navigation, instrumentation                                         |
| `src/Pan.tsx`                  | SVG stainless surface, enthalpy-linked mixture display, pointer scraper                                                |
| `src/Charts.tsx`               | Telemetry and comparison plots; copies engine data before passing it to Recharts                                       |
| `src/Experiments.tsx`          | Deterministic comparison runners and single-batch trial snapshots                                                      |
| `src/Notebook.tsx`             | Browser-local user-written records and exports; storage errors are surfaced                                            |
| `src/Learning.tsx`             | Interactive feedback components and model explanations                                                                 |
| `src/ui.tsx`, `src/styles.css` | Shared inputs, panels, download helper, responsive instrument design                                                   |
| `tests/model.test.ts`          | Thermal, energy, numerical, controller, fault, and scenario checks                                                     |
| `tests/browser/lab.spec.ts`    | Chromium workflows across controls, charts, trials, faults, notebook, and mobile layout                                |

`advance()` is the shared source of numerical truth. UI components never synthesize performance histories. `enthalpyAt()` and `phase()` must remain inverses. Internal mixture/pan heat flow must stay equal and opposite. `control()` uses measured temperature only; metrics can use true temperature. The event and one-second row buffers are bounded to protect rendering performance.

## Three code changes to make yourself

1. **Tune and test the adaptive horizon.** In `control()`, change the six-second projection or ±2 °C bound. Establish a baseline with `runTrial()`, preserve both controllers’ dwell times, and add a test of the specific tradeoff you expect under two demand schedules. Record actual outcomes rather than assuming improvement.
2. **Make the slope filter frequency-consistent.** In `sample()`, replace the fixed 0.15 weight with `1 - exp(-samplePeriod/tau)` using a named time constant. Explain the units, compare 1/2/5 Hz sampling with identical noise assumptions, and test a known ramp response. Document how this changes the controller.
3. **Add a transparent demand scenario.** Extend `Scenario`, `SCENARIOS`, and the order logic in `advance()` with an explicit finite schedule. Add tests for exact order times/masses and energy conservation across all replacements. Compare both controllers without revealing future demand to only one of them.

Use small Git commits for your own changes and keep the work log in your own words. The original Wordle repository files are outside this application and remain preserved. Publishing configuration is in `.github/workflows/coldloop-pages.yml` at the repository root.
