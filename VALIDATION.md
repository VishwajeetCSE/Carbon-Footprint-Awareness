# VALIDATION.md — Carbon Calculations & Formula Verification

This document verifies the mathematical formulas, EPA & IPCC coefficients, and mathematical assumptions used by **CarbonTrack AI** to compute annual carbon footprints.

---

## 1. Emissions Formulas

The total carbon footprint is calculated by adding transport, energy, food, and shopping emissions:

$$\text{Total Emissions} = \text{Transport} + \text{Energy} + \text{Food} + \text{Shopping}$$

### 1.1 Transportation (Annual Tons CO₂e)

$$\text{Transport} = \left( \frac{\text{Car km} \times 52 \times \text{Car Factor}}{1000} \right) + \left( \frac{\text{Public km} \times 52 \times 0.035}{1000} \right) + \left( \frac{\text{Flights} \times 180}{1000} \right)$$

*   **Car Factors (kg CO₂ / km):**
    *   Petrol: `0.170`
    *   Diesel: `0.171`
    *   Hybrid: `0.101`
    *   Electric: `0.047`
*   **Public Transit Factor:** `0.035 kg CO₂ / km`
*   **Flight Factor:** `180.0 kg CO₂ / flight`

### 1.2 Home Energy (Annual Tons CO₂e)

$$\text{Energy} = \left( \frac{\text{Electricity kWh} \times 12 \times 0.85 \times \text{Solar Multiplier}}{1000} \right) + \left( \frac{\text{Water Liters} \times 365 \times 0.0003}{1000} \right)$$

*   **Grid Electricity Factor:** `0.85 kg CO₂ / kWh`
*   **Water Usage Factor:** `0.0003 kg CO₂ / Liter`
*   **Solar Multipliers:**
    *   No Solar: `1.0`
    *   Partial Solar: `0.5` (50% reduction)
    *   Full Solar: `0.0` (100% reduction)

### 1.3 Diet & Food (Annual Tons CO₂e)

$$\text{Food} = \text{Diet Baseline} \times \text{Local Sourcing Discount} \times \text{Food Waste Multiplier}$$

*   **Diet Baselines:**
    *   Heavy Meat: `2.8 Tons`
    *   Mixed/Average: `1.7 Tons`
    *   Vegetarian: `1.1 Tons`
    *   Vegan: `0.6 Tons`
*   **Local Sourcing Discounts:**
    *   Rarely / Average: `1.0`
    *   Sometimes: `0.9` (10% discount)
    *   Mostly: `0.75` (25% discount)
*   **Food Waste Multipliers:**
    *   Low Waste: `0.95` (5% discount)
    *   Average: `1.0`
    *   High: `1.15` (15% penalty)

### 1.4 Shopping & Consumption (Annual Tons CO₂e)

$$\text{Shopping} = \text{Shopping Baseline} \times \text{Recycle Modifier}$$

*   **Shopping Baselines:**
    *   High Consumer: `1.9 Tons`
    *   Average: `0.8 Tons`
    *   Low / Eco: `0.3 Tons`
*   **Recycling Modifiers:**
    *   Active: `0.85` (15% discount)
    *   Partial: `0.95` (5% discount)
    *   None: `1.05` (5% penalty)

---

## 2. Green Score Calculation

The Green Score is calculated on a linear scale relative to a target 1-ton emission baseline:

$$\text{Green Score} = 100 - \left( \frac{\text{Total Footprint} - 1.0}{12.0 - 1.0} \right) \times 100$$

*   **Clamping:** Clamped between `0` and `100` via `Math.max(0, Math.min(100, score))`.

---

## 3. Data Validation & Boundary Conditions

To maintain robust calculations, the application code applies default boundaries and validation checks:
*   **Slider Inputs Limits:**
    *   `input-car-km`: `0` to `800` km
    *   `input-public-km`: `0` to `500` km
    *   `input-flights`: `0` to `20` flights
    *   `input-electricity`: `0` to `1000` kWh
    *   `input-water`: `0` to `400` Liters
*   **Scale Clamping:** Any parsed floating-point number is verified to prevent `NaN` or infinite states. If corrupted inputs are detected, defaults (e.g. median range values) are applied.
