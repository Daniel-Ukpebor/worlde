# Proposed personal investigations

These are uncompleted investigations for the student to carry out. No hypotheses or results have been inserted into the personal work log.

## 1. The thickness/contact tradeoff

Form your own hypothesis about whether spreading thinner changes time in the modeled mushy interval at a fixed setpoint. In Perfect Roll, use 120 g, 8 °C inlet, 25 °C ambient, conventional hysteresis, and −18 °C target. Compare nominal depths of 1, 2, and 4 mm for 30, 60, and 90 s. Export each trial set before navigating away. Record contact geometry, mixture temperature, frozen estimate, heat transfer, and electrical energy. Account for area saturation and do not infer roll quality from a phase estimate. Decide whether the observed mechanism follows the assumed `G = kA/d` relation, and describe what physical measurements could disprove that relation.

## 2. When does anticipation help?

Write a predicted tradeoff before running Rush Hour Lab. Reset sensor settings, then compare both controllers for 1200 s under quiet, after-school, and continuous synthetic schedules. Use the same setpoint, batch, thickness, and seed. Export both CSVs for every schedule. Compare mean absolute error, starts, time outside band, electrical energy, and recovery censoring. Then vary one sensor property, such as delay at 0, 2, and 5 s. Does controller ranking change? A more complex controller winning one condition is not a general result. Keep any chosen metric and acceptable switching constraint explicit before selecting settings.

## 3. Sensor credibility and hidden error

Hypothesize whether a stable displayed temperature can conceal true error. Hold the target at −18 °C and sampling at 2 Hz. Compare bias 0, +2, and −2 °C with the same rush schedule, then compare disconnection and implausible reading faults. Keep noise/delay fixed. Export true and measured temperature, command, and energy. Record which conditions the detector catches and which it misses. Propose a detection rule and explain what additional independent information it would need; a single biased measurement cannot independently reveal its own calibration error.

## A repeatable record

Reset before each fixed-configuration bench trial; set all parameters before running. For exactly repeatable demand use the experiment runner. Save configuration snapshots, raw CSV, model version, hypothesis, metrics selected in advance, controller changes, failures, and your own conclusion. Do not overwrite inconvenient results. Separate simulations from any future physical observations.

The notebook is for your words and actual executed bench data. Its final configuration snapshot does not reconstruct mid-run edits. For controller-comparison trials, keep the experiment export alongside your personal notes. An honest inconclusive result is acceptable.
