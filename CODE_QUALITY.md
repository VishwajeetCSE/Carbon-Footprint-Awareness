# CarbonTrack AI Code Quality Guidelines

This document outlines the coding standards, naming conventions, complexity thresholds, and architectural principles established to maintain high software quality, readability, and performance.

---

## 1. Coding Standards

* **Semicolons:** Explicit semicolons must be used for every statement to prevent Automatic Semicolon Insertion (ASI) issues.
* **Variable Declarations:** Use `const` by default for all variable declarations. Use `let` only when variables must be reassigned. Avoid the legacy `var` keyword.
* **Strings:** While single and double quotes are both accepted, consistency should be maintained within individual files. Avoid unnecessary escape sequences.
* **Equality Checks:** Use strict equality (`===` and `!==`) instead of loose equality (`==` and `!=`) to avoid automatic type coercion bugs.
* **Formatting:** Standard indentation of 4 spaces is applied to JavaScript files.

---

## 2. Naming Conventions

* **Variables & Functions:** Use `camelCase` for all variable and function names.
  * *Example:* `calculateCarbonFootprint`, `appState`, `lastActiveElement`
* **Constructors & Classes:** Use `PascalCase` for all object constructors or class definitions.
  * *Example:* `URLSearchParams`, `Event`
* **Constants & Configs:** Use `UPPER_CASE` with underscores for all global configuration objects and physical/mathematical constants.
  * *Example:* `EMISSION_FACTORS`, `BADGES`, `WEEKS_PER_YEAR`, `DAYS_PER_YEAR`
* **DOM Identifiers:** IDs in HTML and CSS should use `kebab-case` for consistency.
  * *Example:* `input-car-km`, `dashboard-score-val`

---

## 3. Complexity Guidelines

To keep the codebase maintainable and readable, functions should remain small and focused on a single responsibility:
* **Function Length:** Individual functions should ideally not exceed 50 lines. Functions exceeding 100 lines should be audited and split into sub-helpers.
* **Nesting Depth:** Maximum nesting level should not exceed 3 levels of indentation.
  * *Refactoring Callback Hell:* Avoid deeply nested `setTimeout` callbacks. Use Promise-based delays with `async/await` control flows.
* **Branching & Cyclomatic Complexity:** Minimize multiple nested `if/else` statements. Use guard clauses to exit functions early.

---

## 4. Refactoring Strategy

When modifying existing features, apply the following strategies:
1. **Helper Extraction:** Identify repetitive blocks of code (such as SVG rendering math or DOM value retrieval) and pull them into dedicated utility functions.
2. **Behavior Preservation:** Ensure all unit tests pass before and after refactoring.
3. **No Dynamic CSS Injection:** Keep styles and keyframe definitions inside the stylesheet (`styles.css`) instead of creating `<style>` tags dynamically via JavaScript.
4. **XSS Protection:** Use `textContent` or custom sanitization/escaping helpers (`escapeHTML`) whenever displaying user-provided or system-generated text in HTML bubbles.

---

## 5. Maintainability Principles

* **Single Responsibility Principle (SRP):** Each function or component should do one thing and do it well.
* **JSDoc Coverage:** Every major function must have a JSDoc block detailing its purpose, parameters, and return types.
* **No Magic Numbers:** Replace raw numbers inside formulas with named constants at the top of the file to make calculation assumptions transparent.
* **State Uniqueness:** Maintain a single source of truth for global state (`appState`) and persist it safely to `localStorage` with structural schema validation.
