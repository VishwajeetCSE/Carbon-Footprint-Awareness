# SECURITY.md — CarbonTrack AI Security Policies & Guidelines

This document outlines the security architecture, threat model, and security policies for **CarbonTrack AI**.

---

## 1. Security Overview & Architecture

CarbonTrack AI is designed as a **local-first, zero-backend, single-page application (SPA)**. By running all processing client-side, the platform significantly reduces its security surface:
*   **No Backend Database:** User records, calculations, history, and achievements are not stored on any remote server.
*   **No Authentication / Session Management:** There are no user credentials, session cookies, or tokens to be intercepted.
*   **No Third-Party Cookies:** Zero tracking scripts, ads, or analytic cookies are loaded.
*   **Transport Security:** The static assets are served over HTTPS with TLS 1.3, mitigating Man-in-the-Middle (MITM) attacks.

---

## 2. Threat Model

Despite being a static client-side app, CarbonTrack AI identifies and mitigates the following client-side threats:

| Threat / Vulnerability | Description | Potential Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **DOM-based Cross-Site Scripting (XSS)** | Malicious scripts injected into inputs (like the chat input field) and rendered unsafely via `innerHTML`. | Execution of arbitrary JavaScript in the victim's session, redirection, or defacement. | Strictly sanitize and escape all user inputs. Use browser-native text-assignment APIs (`textContent`, `innerText`) for text nodes. Escape all chatbot outputs. |
| **LocalStorage State Corruption** | Manipulation of the stringified JSON payload inside browser `LocalStorage` (by manual input or external browser extensions). | Application crash, unexpected side-effects, prototype pollution. | Implement a strict JSON schema validation layer when reading from `LocalStorage`. If validation fails, apply safe defaults. |
| **Insecure Third-Party Resources** | Interception or modification of external CDN scripts (Google Fonts, Lucide Icons). | Malicious script execution. | Use subresource integrity (SRI) where applicable or limit CDN scopes to trusted domains (Unpkg, Google Fonts). |

---

## 3. Security Implementation

### 3.1 Chat Input Sanitization & Escaping
Any data entered by the user in the AI Assistant chatbot input must be fully escaped before rendering.
*   **HTML Escaping:** Special characters `&`, `<`, `>`, `'`, and `"` are converted to their corresponding safe HTML entities (`&amp;`, `&lt;`, `&gt;`, `&#39;`, `&quot;`).
*   **Safe Formatting:** The markdown-like parser replaces `**text**` with `<strong>text</strong>` only *after* the initial HTML-escaping passes.

### 3.2 LocalStorage Schema Validation
To prevent state corruption or prototype pollution, loaded data is validated before merging with the application state.
*   **Type Constraints:** Values (like scores, emissions, points) are verified to be finite numbers within acceptable bounds.
*   **Key Whitelisting:** Only properties predefined in the default `appState` template are imported. Unknown or system-level keys (such as `__proto__` or `constructor`) are ignored.
*   **Sanitization:** Any text properties loaded from LocalStorage (like challenge titles) are sanitized before being inserted into the DOM.

### 3.3 Safe DOM Update Guidelines
For DOM manipulation, the codebase strictly observes:
1.  **Prefer textContent / innerText:** Use `textContent` for rendering pure text (e.g. calculation summaries, badges descriptions, points, and level indicators).
2.  **Strict innerHTML Control:** Use `innerHTML` only for structural layouts containing hardcoded or pre-sanitized strings (such as rendering SVGs or static list templates).
3.  **No direct eval:** Never use `eval()`, `new Function()`, or `setTimeout` with string arguments.

---

## 4. Security Audit Checklist

Developers and code reviewers must run the following checks on any codebase modification:

*   [ ] Verify that no text data is passed directly into an `innerHTML` call without escaping.
*   [ ] Verify that `escapeHTML()` is applied to any variable representing user-controlled input.
*   [ ] Verify that new state properties added to `appState` are registered in the `LocalStorage` validation schema.
*   [ ] Ensure no secrets, credentials, or API keys are ever committed to the repository.
*   [ ] Ensure HTTPS protocols are enforced for all external links and CDN links.
