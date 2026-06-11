# CarbonTrack AI - Code Quality Audit Report

This report summarizes the findings of a forensic code quality and maintainability audit conducted on the CarbonTrack AI repository.

---

## 1. Function Size and Complexity Metrics

### A. Largest Functions (Line Count)
Below is the list of the largest functions remaining in the application:
1. **`startAutoplayDemo` (252 lines)** — *Location: `src/app.js`*
   * *Purpose:* Triggers and executes the sequential, automated end-to-end user tour.
   * *Nesting Level:* Low (1 level). All previously nested `setTimeout` callbacks have been refactored into sequential `await sleep()` expressions.
2. **`renderTrendLineChart` (94 lines)** — *Location: `src/charts.js`*
   * *Purpose:* Renders the SVG trend line chart with gridlines, data paths, points, and hover interactive tooltips.
3. **`calculateCarbonFootprint` (88 lines)** — *Location: `src/calculator.js`*
   * *Purpose:* Performs annual carbon footprint math using emission factors, updates global state, saves parameters to localStorage, and updates UI routing.
4. **`validateStateSchema` (81 lines)** — *Location: `src/storage.js`*
   * *Purpose:* Asserts types and constraints on loaded configurations to prevent prototype pollution or type mismatches.

### B. Cyclomatic Complexity Hotspots
* **`getCoachResponse`** (High Complexity)
  * *Reason:* Checks user messages against multiple keyword combinations (diet, energy, transport, etc.) to return relevant, contextual response text.
* **`validateStateSchema`** (Moderate-High Complexity)
  * *Reason:* Contains structured validation checks and bounds clamping for each property of the state object (e.g. checking arrays, types, and escaping strings).
* **`renderTrendLineChart`** (Moderate Complexity)
  * *Reason:* Scales SVG coordinates, maps data streams, handles chart hover coordinates, and adjusts legend states dynamically.

---

## 2. Forensic Audit & Refactoring Findings

### A. Nested Callbacks (`setTimeout` nesting)
* **Status:** **Resolved**.
* **Findings:** The original code had over 15 nested levels of `setTimeout` inside `startAutoplayDemo`. This callback hell was completely eliminated by converting `startAutoplayDemo` into an `async` function and utilizing a Promise-based `sleep(ms)` utility wrapper:
  ```javascript
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  ```
  The flow is now sequential, making it readable and highly maintainable.
* **Remaining `setTimeout` Calls:** Only shallow animation intervals (e.g. dismissing a toast alert after a 3.5s transition delay, or delaying navigation slightly to let views render) remain, with a maximum nesting depth of 2.

### B. Magic Numbers & Hardcoded Constants
* **Status:** **Resolved**.
* **Findings:** All hardcoded emission factors and conversion metrics have been converted to named constants inside `src/state.js` under `EMISSION_FACTORS` and global variables:
  * `WEEKS_PER_YEAR` (52)
  * `MONTHS_PER_YEAR` (12)
  * `DAYS_PER_YEAR` (365)
  * `KG_TO_TON_FACTOR` (1000)
  * `BENCHMARK_CO2_AVERAGE` (6.5)
  * `MAX_HISTORY_ENTRIES` (7)
  * `EMISSION_BASE_MAX` (12.0)
  * `EMISSION_BASE_MIN` (1.0)
  * `POINTS_PER_LEVEL` (100)
  This ensures that any adjustments to underlying IPCC/EPA coefficients can be made centrally.

### C. Duplicated Logic
* **Status:** **Resolved**.
* **Findings:** Redundant calculation code blocks were refactored into distinct, single-responsibility helpers in `src/calculator.js` (e.g., `calculateTransportEmissions`, `calculateEnergyEmissions`, `calculateFoodEmissions`, `calculateShoppingEmissions`). Chart coordinate transformations and gridline renders are now delegated to reusable local methods in `src/charts.js` instead of being duplicated.

### D. Inline Styles
* **Status:** **Resolved**.
* **Findings:** Static layout styles are completely defined within the CSS stylesheet `styles.css`. Dynamic styles (such as adjusting SVG progress bar widths or showing modal panels) are managed cleanly via JS style properties, which is necessary for reactive visual updates.

### E. DOM Manipulation and XSS Risks
* **Status:** **Resolved**.
* **Findings:** 
  1. An `escapeHTML` utility was implemented in `src/utils.js` to strip HTML tags and escape special characters.
  2. All user and system chatbot message feeds are processed through `escapeHTML` before formatting and embedding.
  3. Dynamic text assignments throughout the application now use `textContent` instead of `innerHTML` to eliminate DOM-based Cross-Site Scripting (XSS) risks.

### F. Switch Statements with Repeated Patterns
* **Status:** **Resolved**.
* **Findings:** No switch statements with repeated patterns remain. Tab switching and dashboard rendering now use direct lookup maps or loop configurations, avoiding long code branching.

### G. Repeated `querySelector` Logic
* **Status:** **Resolved**.
* **Findings:** A helper function `safeQuerySelector` was added to safely query child elements and prevent runtime crashes if elements are not found during DOM manipulations.

---

## 3. Verification Summary

* **ESLint Linting:** `npx eslint@8 .` passes with **0 errors and 0 warnings**.
* **Unit Tests:** `npm test` runs and passes **14/14 unit tests** successfully.
* **Compatibility:** Fully compatible with VM/sandbox-based execution (`test.js`) and Nginx deployment pipelines.
