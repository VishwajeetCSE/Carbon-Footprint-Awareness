# CONTRIBUTING.md — Developer Guidelines

Thank you for contributing to **CarbonTrack AI**! This guide outlines the coding standards, naming conventions, testing processes, and pull request workflows required to maintain the codebase.

---

## 1. Coding & Design Standards

To keep the codebase lightweight (< 300 KB) and fast, contributions must follow these guidelines:
*   **Vanilla First:** Avoid introducing external npm dependencies, frameworks (React, Vue, etc.), or heavy bundling utilities.
*   **Accessibility-First:** Ensure all interactive elements have semantic HTML wrappers, keyboard event handlers (supporting `Enter` and `Space`), and explicit ARIA properties.
*   **Harmonious CSS:** Use the defined CSS design tokens (HSL colors, Outfit font variables). Avoid ad-hoc inline styles.
*   **Safer DOM Manipulations:** Use `textContent` or `innerText` for text insertions. Restrict `innerHTML` to static/templated elements.

---

## 2. Naming Conventions

Maintain consistent naming styles across files:
*   **JavaScript Variables & Functions:** Use `camelCase` (e.g. `calculateCarbonFootprint`, `appState`).
*   **CSS Classes & HTML IDs:** Use `kebab-case` (e.g. `input-car-km`, `glass-card`).
*   **Constants & Configuration Keys:** Use `UPPER_CASE` for global configurations, and `snake_case` for sub-keys (e.g. `EMISSION_FACTORS`, `car_petrol`).

---

## 3. Testing Requirements

All contributions must pass automated tests and undergo manual verification:
1.  **Run Automated Tests:** Run `npm test` before committing changes to ensure no regressions.
2.  **Run Discoverability Tests:** Run `node tests/run_tests.js` to verify testing paths are visible.
3.  **Manual Tour Verification:** Visit `index.html?demo=autoplay` in a browser and verify that the autoplay demo tour completes successfully.
4.  **No Regression Rule:** Do not remove or break existing unit tests.

---

## 4. Pull Request (PR) Workflow

1.  **Fork and Branch:** Create a feature branch off the main branch:
    ```bash
    git checkout -b feature/your-feature-name
    ```
2.  **Implement and Format:** Write clean code matching JSDoc standards.
3.  **Local Testing:** Run the test suite and verify accessibility/security controls.
4.  **Submit PR:** Describe your changes in detail, link the relevant issues, and include screenshots for visual adjustments.
