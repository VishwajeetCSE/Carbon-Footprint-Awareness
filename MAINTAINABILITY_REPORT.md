# CarbonTrack AI - Maintainability Report

This report evaluates the modular architecture of CarbonTrack AI against software engineering design principles, focusing on Single Responsibility and Cohesion.

---

## 1. Single Responsibility Principle (SRP) Verification

The modular refactoring strictly enforces the Single Responsibility Principle. Every function is designed to handle exactly one task:

*   **Trigonometric Math Delegation:** Math coordinates for SVG wedges are computed in `buildPieSegmentPath()`, while segment painting and event attachment are handled in `drawPieSegments()`.
*   **Emissions Calculations Separation:** The carbon footprint engine delegates specialized calculations to `calculateTransportEmissions()`, `calculateEnergyEmissions()`, `calculateFoodEmissions()`, and `calculateShoppingEmissions()`, keeping the main calculation orchestrator (`calculateCarbonFootprint`) focused only on state sync, persistence, and navigation.
*   **Validation Extraction:** Monolithic schema checking is split into focused validators (such as `validateEmissions` or `validateChallenges`) that handle type checks and boundaries clamping.
*   **Autoplay Step Isolation:** The automated walkthrough loop is decomposed into step-by-step sequential helpers (`autoplayResetState`, `autoplayInputsStep1And2`, `autoplayInputsStep3And4`, etc.), eliminating monolithic code bloat.

---

## 2. Module Cohesion and Decoupling

The codebase is organized into highly cohesive modules based on domain concerns:

```
src/
├── state.js       --> Core configuration constants (IPCC/EPA factors, chatbot rules)
├── utils.js       --> Low-level utilities (escaping, announcer, DOM queries, sleep)
├── storage.js     --> State loading, schema verification, local storage persistence
├── calculator.js  --> IPCC calculation routines & scenario simulation
├── charts.js      --> High-performance responsive SVG graph rendering
├── chatbot.js     --> EcoBuddy keyword evaluation & conversation layout
├── dashboard.js   --> Dashboard visuals, equivalents, mini checklist, roadmap
└── app.js         --> Stepper, slider triggers, and autoplay walkthrough orchestration
```

*   **Minimal mixed concerns:** Domain boundaries are clean. SVG layout is kept in `charts.js`, chat routing in `chatbot.js`, and LocalStorage operations in `storage.js`.
*   **Globals integration:** Cross-module variables and functions are cleanly declared as read-only or writable globals in `.eslintrc.json`, ensuring full static analysis support without errors.

---

## 3. Build & Compilation Pipeline

We use a simple, dependency-free concatenation step (`build.js`) to combine modules in correct dependency order:
1. `state.js` -> 2. `utils.js` -> 3. `storage.js` -> 4. `calculator.js` -> 5. `charts.js` -> 6. `chatbot.js` -> 7. `dashboard.js` -> 8. `app.js`.

*   **Compilation Verification:** Added built compilation statistics to `build.js` verifying the number of files compiled.
*   **Seamless Testing Integration:** `npm test` automatically runs the compiler (`node build.js`) prior to launching `test.js` under the Node VM, guaranteeing that tests are always validated on the fresh production bundle.
