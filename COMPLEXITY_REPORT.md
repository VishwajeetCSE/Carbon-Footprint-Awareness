# CarbonTrack AI - Cyclomatic Complexity Report

This report presents a forensic evaluation of cyclomatic complexity across the primary execution paths of the application.

---

## 1. Complexity Hotspots Analysis & Refactoring

Prior to refactoring, several functions contained heavy branching and nested loops, resulting in high cyclomatic complexity. The refactored state drastically reduces these control paths.

### A. Chatbot Coach Recommendations (`getCoachResponse`)
* **Before Refactoring:** 
  * *Complexity Profile:* High. The method evaluated keyword match combinations using consecutive, nested `if-else` blocks and custom text format concatenations.
  * *Refactored Architecture:* We introduced a declarative rules registry array `COACH_RULES` matching keyword sets to either response strings or actions. Profile queries and roadmaps are extracted into pure helper functions (`getCoachProfileResponse`, `getCoachRoadmapResponse`).
  * *Complexity Score:* **Low**. The main function now loops over the rules registry array linearly:
    ```javascript
    for (const rule of rules) {
        if (rule.keys.some(k => normalized.includes(k))) {
            return rule.action ? rule.action() : rule.response;
        }
    }
    ```
    This reduces branching from 9 separate conditional blocks to a single lookup loop.

### B. Configuration Schema Checker (`validateStateSchema`)
* **Before Refactoring:**
  * *Complexity Profile:* Moderate-High. Checked types, properties, array structures, and boundary bounds for every key inside the global state in a single, monolithic block.
  * *Refactored Architecture:* Decomposed the validation code into 5 single-responsibility sub-validators:
    * `validateEmissions()` (validates transport, energy, food, shopping numbers)
    * `validateChallenges()` (maps challenge ids, texts, points, states)
    * `validateScenarioSim()` (checks Ev, diet, solar, waste parameters)
    * `validateHistory()` (checks dates and footprints history arrays)
    * `validateChatHistory()` (validates chatbot message sender and text attributes)
  * *Complexity Score:* **Low**. Each sub-validator handles a single object structure, and the main `validateStateSchema` function serves as a clean aggregator.

### C. SVG Chart Painters (`renderTrendLineChart` & `drawPieSegments`)
* **Before Refactoring:**
  * *Complexity Profile:* Moderate. `renderTrendLineChart` handled math scaling, SVG definitions, grid paints, path formatting, point plots, mouse interactions, and legend updates in a single block. `drawPieSegments` handled polar-to-cartesian coordinate trigonometry calculations and DOM bindings inline.
  * *Refactored Architecture:*
    * Trig math moved to `buildPieSegmentPath()`.
    * Trend chart split into: `setChartAccessibilityTags()`, `renderEmptyTrendPlaceholder()`, `calculateTrendScale()`, `drawTrendGlowFilters()`, `drawChartGridLines()`, `drawChartTrendLine()`, and `drawChartPlotPoints()`.
  * *Complexity Score:* **Low**. Calculations and DOM updates are isolated, preventing nested rendering loops.

---

## 2. Cyclomatic Complexity Metrics Summary

| Function Name | Lines of Code | Conditional Branches | Complexity Classification |
| :--- | :--- | :--- | :--- |
| `getCoachResponse` | 19 lines | 2 branches | **Low** |
| `validateStateSchema` | 25 lines | 1 branch | **Low** |
| `calculateCarbonFootprint` | 30 lines | 0 branches | **Low** |
| `startAutoplayDemo` | 35 lines | 0 branches (flat sequence) | **Low** |
| `renderTrendLineChart` | 32 lines | 1 branch | **Low** |
| `drawPieSegments` | 39 lines | 1 branch | **Low** |
| `renderChallenges` | 32 lines | 2 branches | **Low** |
