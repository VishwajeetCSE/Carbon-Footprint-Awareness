# QA_CHECKLIST.md — Quality Assurance Verification Checklist

This checklist contains the quality assurance verification steps for **CarbonTrack AI**.

---

## 1. Functional Verification Checklist

- [ ] **Calculator Input Verification:**
    - [ ] Sliding range sliders updates the corresponding text values (e.g. `120 km`, `250 kWh`).
    - [ ] Form submit navigates to the Dashboard tab, unlocks the `eco-beginner` badge, and updates emissions values.
- [ ] **Dashboard Charts & Equivalents:**
    - [ ] SVG pie chart segments correspond to calculation weights. Hovering on segments shows percentage tooltips.
    - [ ] SVG line chart renders history points. Hovering on dots shows dates and logged tons.
    - [ ] Environmental equivalents (trees, driving km, phone charges) reflect the emissions total.
- [ ] **Scenario Simulation:**
    - [ ] Sliding scenario sliders updates simulated emissions and updates equivalents in real-time.
    - [ ] Clean Energy slider `>= 50%` unlocks the `energy-saver` achievement badge.
- [ ] **EcoBuddy Chatbot:**
    - [ ] Querying `"How to improve my score?"` triggers analysis of the highest emission category.
    - [ ] Clicking sugerested query chips types, sends, and receives coach feedback.
- [ ] **Gamification / Streak:**
    - [ ] Checking off challenges adds points and updates level indicators.
    - [ ] Login streak increments or resets based on daily calculations.

---

## 2. Accessibility Verification Checklist

- [ ] **Keyboard Interaction:**
    - [ ] Navigate the entire page via the `Tab` key.
    - [ ] Check that a visible focus outline highlights the selected element.
    - [ ] Skip-to-content link displays on focus and moves focus to the main container.
    - [ ] Badge alert modal closes on clicking button, and focus is restored to the triggering element.
- [ ] **ARIA Standards:**
    - [ ] Tabs contain correct `aria-selected` and `aria-controls` bindings.
    - [ ] Checklist items indicate correct `aria-checked` states.
    - [ ] Announcer live region announces badge triggers and chatbot system replies.
- [ ] **SVG Graphic labels:**
    - [ ] Verify `role="img"` and `aria-label` tags are present on pie chart and trend chart SVG containers.

---

## 3. Security Verification Checklist

- [ ] **Sanitization:**
    - [ ] Entering HTML strings in the chat text box renders them as escaped strings, not as executed code.
- [ ] **LocalStorage Integrity:**
    - [ ] Modifying LocalStorage values does not lead to prototype pollution or cause application crashes on page load.

---

## 4. Browser & Responsive Sizing Checklist

- [ ] **Responsive Sizing Layouts:**
    - [ ] Mobile view (< 480px) stacks sidebar menu as a top navigation bar.
    - [ ] Tablet view (481px - 768px) displays navigation items as icons and centers grid items.
    - [ ] Laptop/Desktop view (> 768px) shows left sidebar menu.
- [ ] **Cross-Browser Check:**
    - [ ] Check layout and interactivity on Chrome, Edge, Firefox, and Safari.
