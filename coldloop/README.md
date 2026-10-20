# ColdLoop — Engineering the Perfect Freeze

An interactive refrigeration and electrical control laboratory inspired by making rolled ice cream at Ice’s Corner. The question is whether feedback control can manage useful thermal conditions during repeated orders. This is a software simulation, not refrigeration hardware or a calibrated model of that workplace machine.

The selected checkout was `Daniel-Ukpebor/worlde`, which contains a Python Wordle game. No existing ColdLoop engineering code, tests, or research were present. This independent `coldloop/` project preserves the original repository files unchanged.

## Launch

Requirements: Node.js 22.12+ (validated with 24.19), npm, and a modern browser. No backend, database, account, API key, or external runtime service is needed.

```bash
cd /workspace/worlde/coldloop
npm ci --cache /workspace/.cache/npm --no-audit --no-fund
npm run dev -- --port 5173 --strictPort
```

On your own computer, change into the cloned repository’s `coldloop` directory; a normal writable npm cache can be used instead. Vite listens on all interfaces. Use the address printed by your local Vite server. The cloud onboarding UI does not provide a web preview.

```bash
npm test                  # simulation unit and scenario integration checks
npm run build             # strict TypeScript + production bundle
npm run preview -- --port 4173 --strictPort
npm run test:browser      # real Chromium application workflows
```

Browser tests use `/usr/bin/chromium` by default. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for another system Chromium executable. Alternatively install Playwright's Chromium with `npx playwright install chromium` and set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=managed`. Linux CI may need browser system dependencies. The test runner starts its own Vite server on port 5173 and preserves failed-test output in ignored `test-results/`.

## Publish the website

The repository includes `.github/workflows/coldloop-pages.yml`. On a push to `main`, it installs dependencies, runs the simulation tests, builds the static app, and deploys `coldloop/dist` with GitHub Pages. The Vite build uses relative asset paths, so the app works at the repository path `/worlde/`. The expected public address is `https://daniel-ukpebor.github.io/worlde/` after a successful deployment.

GitHub Pages must be enabled for the repository with **Settings → Pages → Build and deployment → Source: GitHub Actions**. Check the **Publish ColdLoop** workflow in Actions for its actual deployment result and URL. A successful local build or a push alone does not establish that the public site is live.

## Use the laboratory

1. Start **Run simulation**. Adjust target temperature and choose conventional or trend-adaptive hysteresis. The independent **Cooling enabled** button enables/disables the actuator while the clock and ambient heat transfer continue.
2. Add a warm batch, chop, spread, change nominal thickness, and scrape. Dragging the scraper across more than 130 SVG coordinate units also removes the batch. Removal exports its remaining enthalpy; no successful physical roll is claimed.
3. Inspect temperature, electrical power/energy, true tracking error/compressor command, and modeled frozen fraction. All data comes from the same thermal engine. Export the one-second log as CSV.
4. Load a seeded synthetic customer schedule, or run both controllers in **Rush Hour Lab**. Both use identical initial conditions, sensor settings, demand, and minimum switching times. No future order information is supplied.
5. In **The Perfect Roll Problem**, vary one thermal condition and run single-batch trials. Compare thermal outcomes and export complete parameter snapshots. Results are session-local until exported; navigating away from Experiments clears them.
6. Use **Sensor lab** to add noise, delay, bias, disconnection, or implausible readings. Valid but biased readings are not automatically detected.
7. Open the feedback components and ten **Under the hood** topics for equations and units. Save your own hypothesis, executed bench run, and conclusion in **Notebook**. Notebook records survive reload on the same browser origin. Export JSON as a backup; there is no cloud synchronization or import UI.

**Reset** initializes the current settings. **Replay seed** restores the last reset’s initial configuration and seeded schedule; press Run to execute it. Manual operator actions and mid-run setting edits are not automatically replayed. Charts keep the last 3601 one-second rows and downsample display above 900 points; CSV preserves the retained full log. This is not an unlimited archival recorder.

## Engineering and provenance

- [ENGINEERING_MODEL.md](ENGINEERING_MODEL.md): equations, parameters, units, numerical method, and accounting.
- [EXPERIMENTS.md](EXPERIMENTS.md): three personal investigations and reproducibility guidance.
- [LIMITATIONS.md](LIMITATIONS.md): omitted physics and interpretation boundaries.
- [AI_ASSISTANCE.md](AI_ASSISTANCE.md): AI-generated work and authentic student contribution.
- [STUDENT_WORK_LOG.md](STUDENT_WORK_LOG.md): intentionally empty for the student’s own work.
- [CODE_GUIDE.md](CODE_GUIDE.md): architecture and three suggested code changes.
- [TEST_RESULTS.md](TEST_RESULTS.md): checks actually executed in this environment.

No rollability score is supplied: thermal enthalpy alone cannot validate texture, cracking, or curling. All numerical machine and mixture parameters are explicitly illustrative assumptions. The app is not an industrial safety controller.
