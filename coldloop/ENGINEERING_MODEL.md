# Engineering model v0.1

## State and units

The pan has one uniform temperature `Tp` in °C. Each batch has mass `m` in kg and specific enthalpy `h` in J/kg. Temperature differences in °C equal differences in K. We use °C for readable state values; COP here is assumed constant, not computed from absolute temperatures.

```
Cp dTp/dt = UA (Ta - Tp) + G (Tm - Tp) - u Qrated
m dh/dt   = -G (Tm - Tp)
```

`Cp` is pan thermal capacitance, J/K; `UA` is ambient conductance, W/K; `G` is mixture contact conductance, W/K; `u` is compressor command 0 or 1. `Qrated` is cooling capacity, W of thermal energy removed per second. Heat flows can reverse if the mixture is colder than the pan.

```
A = min(Apan, m / (rho * dnominal))
deffective depth d = m / (rho * A)
G = k * A / d * contactFactor
```

Area is m², depths are converted from mm to m, density is kg/m³, conductivity is W/(m·K). Changing thickness conserves batch mass and enthalpy. Addition replaces any previous batch, explicitly exporting its remaining enthalpy. Spreading sets the contact factor to 1; chopping increases it by 0.10 up to 1. This contact behavior is a declared heuristic, not a measured law of chopping.

## Enthalpy approximation

The enthalpy reference is zero at the assumed solidus, −6 °C. The assumed liquidus is −2 °C. Effective latent heat is distributed linearly across this four-kelvin mushy interval.

```
T < -6:        h = 2000 * (T + 6)
-6 <= T <= -2: h = (2900 + 180000/4) * (T + 6)
T > -2:        h = 191600 + 3500 * (T + 2)
```

The inverse `phase(h)` recovers temperature. The modeled frozen fraction is `clamp(1 - h/191600, 0, 1)` in the mushy region, zero above and one below. This is a linear effective-enthalpy fraction, not a validated ice fraction curve for any recipe. Values of `h < 0` simply refer to temperatures below the reference; they are not negative absolute thermal energy.

## Default assumptions

| Parameter                                |            Default | Unit             |
| ---------------------------------------- | -----------------: | ---------------- |
| Pan thermal capacitance                  |               8000 | J/K              |
| Pan area                                 |               0.18 | m²               |
| Ambient conductance                      |                  7 | W/K              |
| Ambient temperature                      |                 25 | °C               |
| Cooling capacity while ON                |               1600 | W thermal        |
| COP                                      |                1.6 | dimensionless    |
| Standby electrical draw                  |                  8 | W electrical     |
| Initial pan / target                     |          −16 / −18 | °C               |
| Default batch / inlet / nominal depth    |       0.12 / 8 / 2 | kg / °C / mm     |
| Density / conductivity                   |        1050 / 0.45 | kg/m³ / W/(m·K)  |
| Liquid / solid / mushy sensible capacity | 3500 / 2000 / 2900 | J/(kg·K)         |
| Effective latent heat                    |             180000 | J/kg             |
| Initial / spread contact factor          |           0.65 / 1 | dimensionless    |
| Band, full width                         |                  2 | °C               |
| Minimum ON / OFF                         |            15 / 20 | s                |
| Sampling / bounded uniform noise         |          2 / ±0.08 | Hz / °C          |
| Noise seed                               |                 42 | unsigned integer |

None is a manufacturer specification or a fitted value from Ice’s Corner. Conservation of energy and thermal resistance equations are standard engineering relations; the parameter choices and enthalpy curve are illustrative. No measurements or research citations are fabricated. Useful independent background: OpenStax _University Physics Volume 2_, sections on heat transfer and refrigerators; an actual future calibration requires recipe and machine data.

## Sensor and controls

A seeded LCG draws one bounded uniform noise sample per measurement. Measurements use zero-order hold, a configurable delay buffer, bias, and optional invalid readings. At startup the initial state fills unavailable delay history. Sampling occurs on the first integration boundary after its scheduled time, so quantization can add up to one integration step. Noise sequences use the same seed and draw count for both comparison controllers, though physical temperature trajectories differ.

Conventional hysteresis switches ON above `target + band/2`, OFF below `target - band/2`, retaining state within the band. The adaptive strategy replaces measured temperature with `measurement + clamp(6*slope, -2, 2)` °C. The slope is `0.85*previousSlope + 0.15*sampleDifference*sampleHz`. This filter is per sample; changing frequency changes its effective time constant. It is an explainable trend heuristic, not optimized adaptive identification or model predictive control.

Both strategies share dwell constraints and sensor information. An invalid/disconnected or outside −50…50 °C measurement inhibits cooling at the next sample, overriding minimum ON time. Operator stop also overrides it. Restart still respects minimum OFF time. Bias, plausible stale data, and modest sensor failures can go undetected. Valid measurements automatically clear inhibition; there is no latched manual reset or certified safety claim.

## Energy and metrics

```
Pelectric [W] = 8 + u * Qrated / COP
Eelectric [Wh] = integral(Pelectric dt) / 3600
Duty [%] = 100 * compressor ON seconds / elapsed seconds
MAE [°C] = integral(abs(Tp - target) dt) / elapsed seconds
```

A watt is a rate (J/s); a joule or Wh is energy (1 Wh = 3600 J). Cooling heat transfer, electrical power, and accumulated electrical energy are separate measurements. Mixture heat removed is the cumulative **net** energy crossing the contact interface over all batches, not only the current one.

The thermal ledger checks:

```
Cp*(Tp - Tinitial) + m*h_current
= ambientEnergy - coolingEnergy + importedBatchEnthalpy - exportedBatchEnthalpy
```

The displayed residual is the difference in J. A small residual proves internal bookkeeping, not physical validity. The mixture mass term is zero when empty. Cooling-to-electric conversion does not belong in the thermal ledger; compressor heat rejection is outside the modeled boundary.

Recovery is time from batch addition to first return into the target band after departing it and after at least one second. It is not settling time. A pending recovery is censored when another order arrives. The table reports mean completed recoveries, plus whether the latest one remains unresolved. Time outside the band includes startup. Demand is synthetic; new orders replace previous batches even if not ready, so this is not a queue or a service-quality prediction.

## Integration and repeatability

Explicit Euler uses substeps no larger than 0.1 s; tests also use 0.05 s. The worst supported mixture contact conductance at full pan coverage and 0.5 mm depth is 162 W/K. A 0.0945 kg mixture has at least 189 J/K sensible capacity: `dt*G/Cmix <= 0.086` at 0.1 s. The pan capacity is at least 1000 J/K. These configured scales are compatible with the selected explicit step; phase change increases effective heat capacity. More extreme future parameters require a new stability analysis.

Scenario trials use a fixed step and fixed initial state for deterministic comparisons. Live interaction timing follows the browser clock and may vary with render load; simulation remains integrated with controlled substeps. Display logs at one-second boundaries; non-integer live frame endings can shift logged time slightly. Charts use the same state and log, without invented histories. The last 3601 rows are retained. Numerical convergence is checked with absolute pan-temperature and relative electrical-energy tolerances; switching discontinuities can change exact transition times.
