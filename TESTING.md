# TESTING.md — CarbonTrack AI Test Plan & Verification Documentation

This document describes the testing strategy, verification methods, test matrices, and QA checklists for **CarbonTrack AI**.

---

## 1. Testing Strategy & Scope

CarbonTrack AI uses a dual-layer testing approach:
1.  **Automated Unit Testing:** Runs in a simulated Node.js DOM sandboxed environment using the standard Node.js `vm` module to run `app.js` and verify core logic (calculations, streaks, chatbot matching, badge unlocks, LocalStorage).
2.  **Manual Verification & QA Matrix:** Validates interactive rendering, layout responsiveness, accessibility focus states, and the autoplay demo.

---

## 2. Test Execution

### 2.1 Automated Test Suite
To run the automated tests, execute:
```bash
npm test
```
This runs the unit test suite defined in `test.js` against the production `app.js` file.

### 2.2 Test Discoverability Wrapper
To run tests via the discoverable subdirectory wrapper:
```bash
node tests/run_tests.js
```

---

## 3. Test Cases & Verification Matrices

### 3.1 Carbon Calculator Test Matrix

| Test ID | Scenario | Input | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- | :--- |
| **CALC-001** | Standard Hybrid Commute | Car = `120 km`, Type = `hybrid`, Public = `50 km`, Flights = `2`, Electricity = `250 kWh`, Solar = `no`, Water = `150 L`, Diet = `vegetarian`, Local = `sometimes`, Food Waste = `average`, Shopping = `average`, Recycle = `some` | Total Annual footprint: `5.01 Tons CO₂e` (+/- 0.05). Green Score: `64/100` | ✅ PASS |
| **CALC-002** | Zero Transport & Full Solar | Car = `0 km`, Public = `0 km`, Flights = `0`, Electricity = `300 kWh`, Solar = `yes`, Water = `100 L`, Diet = `vegan`, Local = `mostly`, Food Waste = `low`, Shopping = `eco`, Recycle = `all` | Total Annual footprint: `0.70 Tons CO₂e`. Green Score: `100/100` (caps at 100) | ✅ PASS |
| **CALC-003** | High-Emission Lifestyle | Car = `800 km`, Type = `diesel`, Public = `500 km`, Flights = `20`, Electricity = `1000 kWh`, Solar = `no`, Water = `400 L`, Diet = `meat-heavy`, Local = `no`, Food Waste = `high`, Shopping = `high`, Recycle = `none` | Total Annual footprint: `17.43 Tons CO₂e`. Green Score: `0/100` (clamps at 0) | ✅ PASS |

### 3.2 Dashboard Test Matrix

| Test ID | Scenario | Input | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- | :--- |
| **DASH-001** | Empty State / Pre-Calc | App State: `hasCalculated = false` | Scores read `-`, footprint reads `-.-`. Pie chart and Trend show placeholders. | ✅ PASS |
| **DASH-002** | Calculated Footprint View | App State: `hasCalculated = true`, total = `7.2` | Annual Carbon Footprint reads `7.2 Tons CO₂e`. Progress bar indicates `Above Avg`. | ✅ PASS |
| **DASH-003** | Environmental Equivalents | Footprint = `2.0 Tons` | Trees: `33`, Driving Avoided: `11,760 km`, Phones Charged: `242,000`, Bulbs: `70` | ✅ PASS |

### 3.3 Trend Graph Test Matrix

| Test ID | Scenario | Input | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- | :--- |
| **TRND-001** | First Calculation | History Array = `[]` | Automatically pre-populates 3 simulated historical points with decrements. | ✅ PASS |
| **TRND-002** | Subsequent Calculation | Add 4th run data | History list appends new run. Line graph plots 4 coordinates correctly. | ✅ PASS |
| **TRND-003** | History Size Clamping | Trigger 8th calculation | Graph shifts oldest data out. Length restricted to `7` points. | ✅ PASS |

### 3.4 Scenario Explorer Test Matrix

| Test ID | Scenario | Input | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- | :--- |
| **SCEN-001** | Sim Adjustments Clean Energy | Clean Energy slider = `50%` | Simulated forecast reduces, savings update. "Energy Saver" badge unlocked. | ✅ PASS |
| **SCEN-002** | Sim Adjustments Maximum | Clean Energy = `100%`, EV = `100%`, Diet = `100%`, Waste = `50%` | Simulated forecast approaches minimum threshold of `0.5 Tons`. | ✅ PASS |
| **SCEN-003** | Sim Adjustments Empty | State: `hasCalculated = false` | Sliders disabled or prompt displayed to calculate footprint first. | ✅ PASS |

### 3.5 EcoBuddy Test Matrix

| Test ID | Scenario | Input | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- | :--- |
| **CHAT-001** | Profile Query | User prompt: `"How can I improve my score?"` | Analyzes worst category (e.g. food) and suggests local diets. | ✅ PASS |
| **CHAT-002** | Keyword Routing | User prompt: `"electric vehicle"` | Responds with standard transport coaching details. | ✅ PASS |
| **CHAT-003** | Default Fallback | User prompt: `"asdfghjkl"` | Returns general eco tips targeting the "big three" emissions sources. | ✅ PASS |

### 3.6 Badge System Test Matrix

| Test ID | Scenario | Input | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- | :--- |
| **BDGE-001** | Eco Beginner Unlock | Run calculator first time | `eco-beginner` badge is unlocked and modal popup displays. | ✅ PASS |
| **BDGE-002** | Green Explorer Unlock | Complete 2 challenges | `green-explorer` badge is unlocked. Modal displays. | ✅ PASS |
| **BDGE-003** | Duplicate Badge Trigger | Call `unlockBadge('eco-beginner')` | Returns early; no duplicate badge added, no popup modal triggers. | ✅ PASS |

### 3.7 LocalStorage Persistence Test Matrix

| Test ID | Scenario | Input | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- | :--- |
| **STOR-001** | State Save & Load | Set points = `999`, save, reload | State retrieved; appState.greenPoints holds `999`. | ✅ PASS |
| **STOR-002** | Malformed State Load | Corrupted LocalStorage string | Catch block executes, loads safe default variables without crashing. | ✅ PASS |
| **STOR-003** | Progress Reset | Click "Reset Progress" and confirm | State cleared from LocalStorage. App resets to empty default state. | ✅ PASS |

---

## 4. Edge Cases Testing

The following boundary conditions are explicitly handled and verified:
*   **Empty / Null / Undefined Values:** Inputs parsed via `parseFloat` default to standard numbers or are bounded by browser elements.
*   **Negative Values:** Sliders are configured with minimum limits (`min="0"`), preventing negative distances or energy values.
*   **Very Large Values:** Inputs are bounded by upper range parameters (e.g. `800 km` for travel, `1000 kWh` for electricity).
*   **Corrupted LocalStorage:** Structured schema checks reject invalid entries and apply default state structures.
*   **Refresh Scenarios:** Application automatically runs `loadStateFromLocalStorage()` during `DOMContentLoaded`, ensuring persistent streaks and metrics remain intact on browser reload.

---

## 5. Environment Testing Matrices

### 5.1 Browser Compatibility Matrix

| Browser | OS Platform | Layout Verification | Interactivity | WCAG Focus Indicators | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chrome** | Windows / macOS / Linux | Glassmorphism renders | Dynamic SVGs scale | Focus rings visible | **Fully Supported** |
| **Edge** | Windows / macOS | Font scaling Outfit ok | Sliders drag smoothly | Focus rings visible | **Fully Supported** |
| **Firefox** | Windows / macOS / Linux | Scrollbars custom styling | CSS variables compile | Focus rings visible | **Fully Supported** |
| **Safari** | macOS / iOS | Glass backdrop-filter ok | Animations run | Default focus rings | **Fully Supported** |

### 5.2 Responsive Sizing Matrix

| Device Profile | Breakpoint | Sidebar Behavior | Grid Spacing | Interactive Layout | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mobile** | `< 480px` | Collapses to top nav bar | 1 column layout | Buttons resize to full-width | **Verified** |
| **Tablet** | `481px - 768px` | Slim navbar layout | 2 column layout | Stepper labels centered | **Verified** |
| **Laptop** | `769px - 1024px` | Fixed Sidebar menu | Grid structure spans | SVG charts adapt scale | **Verified** |
| **Desktop** | `> 1024px` | Expanded Left Sidebar | Spans 12 columns | Grid adapts to max-width | **Verified** |

---

## 6. Accessibility Verification

Accessibility standards (WCAG 2.1 AA compliance) are verified as follows:
*   **Keyboard Navigation:** Use `Tab` to navigate through tabs, calculator forms, chat suggester chips, checklist toggles, and modals. Check that the focus ring (`:focus-visible`) highlights the active element.
*   **ARIA Support:** Check that `aria-selected` toggles from `true` to `false` when switching tabs, and checklist checkboxes correctly update `aria-checked` states.
*   **Focus Handling:** Verify that skip-links focus directly on the main anchor, and closing the badge modal returns focus to the action trigger.
*   **Color Contrast:** Ensure text has a contrast ratio of > 4.5:1 (Dark Forest HSL tokens exceed 7:1 for all readable items).
*   **Screen Reader Behavior:** announcements in the `#sr-announcer` Polite Live Region are successfully triggered upon badge unlocks, completed tasks, and chatbot system replies.
