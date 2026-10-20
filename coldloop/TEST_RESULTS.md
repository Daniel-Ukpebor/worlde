# Executed validation

Validation performed in the provided Linux cloud environment on October 19, 2026, with Node.js 24.19.0, npm 11.9.0, and system Chromium. These are software verification results, not student-conducted physical experiments or validation of a real machine.

| Command / check                                             | Executed result                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| `npm ci --cache /workspace/.cache/npm --no-audit --no-fund` | Passed; frozen-lockfile clean installation                      |
| `npm test`                                                  | 19 tests passed; 1 test file, no skips or failures              |
| `npm run build`                                             | Passed strict TypeScript checking and Vite production bundling  |
| `npm run test:browser`                                      | 6 Chromium integration tests passed                             |
| Original repository integrity                               | `git diff --exit-code` passed; original tracked files unchanged |
| Student work log                                            | Verified empty (0 bytes)                                        |

## Engine coverage

Enthalpy/temperature inversion and phase boundaries; latent heat removal; unpowered approach to ambient against an analytical solution; warm-batch thermal loading; contact geometry and energy preservation; imported/exported enthalpy across repeated orders; convergence from 0.1 to 0.05 s steps; minimum ON/OFF constraints for both controllers; electrical energy integration; distinct controller decisions; deterministic seeded outcomes; disconnection/implausible-reading inhibition; bias and delay; operator stop; large-order and rush fault schedules; telemetry/CSV units and missing values; invalid configuration rejection.

## Browser coverage

1. Add/chop/spread, setpoint and speed adjustment, live numerical temperature changes, power/energy chart, CSV download, removal, and reset.
2. Calculated two-controller comparison, populated metrics, and thickness-dependent single-batch trials.
3. Sensor disconnection, controller inhibition, user-written notebook save, and persistence after reload.
4. Interactive signal-flow equations, learning-topic navigation, and no page overflow at a 390 × 844 mobile viewport.
5. Scenario load, cooling enable/disable, automatic order disturbance, and restoration of initial settings by seeded replay.
6. Actual pointer drag across the virtual pan removes the mixture and reports energy-accounted removal.

Initial browser tests found Recharts freezing the mutable engine row array. The chart boundary now receives copied rows; all browser workflows passed after correction. Initial compilation also caught select-value typing and a missing Node type dependency; both were corrected. The first package installation failed because the default home npm cache was unavailable; the supported writable `/workspace/.cache/npm` cache resolved it without bypassing TLS, signatures, or package integrity.

## One reproducible automated baseline

Default parameters, seed 42, 600 s after-school rush, eight 120 g orders, fixed 0.1 s maximum step. Computed by `runTrial()` in the actual environment; this is an automated model baseline, not a fabricated student experiment.

| Metric                                  |   Conventional | Trend-adaptive |
| --------------------------------------- | -------------: | -------------: |
| Mean absolute true tracking error       |    0.532077 °C |    0.605246 °C |
| Time outside target ±1 °C band          |         31.4 s |        132.1 s |
| Compressor starts                       |             13 |             14 |
| Operating time                          |        204.0 s |        210.0 s |
| Duty cycle                              |          34.0% |          35.0% |
| Electrical energy                       |     58.0000 Wh |     59.6667 Wh |
| Mean completed first-band return        |      14.9625 s |      19.3125 s |
| Absolute thermal energy ledger residual | 3.38 × 10⁻¹⁰ J | 8.77 × 10⁻¹⁰ J |

The adaptive controller is worse on these selected metrics for this condition. Different sensor/demand/parameter choices can change the outcome. The UI makes no universal winner claim. Energy closure verifies bookkeeping within the model, not physical fidelity.

GitHub Actions validation passed on the first pushed commit. The initial Pages workflow failed because GitHub Pages was not enabled for the repository; public deployment has not been verified. Other browsers, physical mobile devices, physical refrigeration hardware, food texture, sensor calibration, and fresh-task snapshot restoration were not validated. Production and formatting checks are recorded below.

## Final production and setup checks

- Production preview returned HTTP 200 and successfully loaded the bundled application in Chromium. Adding and spreading a batch, starting the clock, and pausing produced a true pan reading of −17.3 °C from the initial −16 °C, with no browser page errors.
- The production layout had a document width of exactly 390 px in a 390 px mobile viewport. Desktop and mobile screenshots were captured in `/workspace/coldloop-running.png` and `/workspace/coldloop-mobile.png`.
- The production build was also served from `/worlde/` using a plain static HTTP server. Chromium returned HTTP 200, displayed the freezing bench, accepted a batch, and reported no page errors. The built HTML refers to relative `./assets/` paths.
- `npm run format:check` passed.
- The saved installation commands were executed successfully with `npm ci` followed by `npm run build`. Development startup was verified on port 5173 with the Vite ready message and an internal HTTP request.
- Environment draft persistence confirmed `status: saved` for `install_script` and `start_skill`. Publication remains a user action in environment settings; fresh-task restoration was not tested.
