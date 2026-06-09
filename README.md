# CarbonTrack AI 🌿🤖

CarbonTrack AI is an interactive sustainability platform designed to help individuals understand, track, visualize, and reduce their carbon footprint through personalized insights, real-time scenario simulations, and gamified environmental actions.

The platform combines carbon emission calculations, behavioral analysis, scenario forecasting, and an intelligent sustainability assistant into a single modern web experience.

Unlike traditional carbon calculators, CarbonTrack AI focuses on education, engagement, and actionable change by providing users with dynamic recommendations based on their lifestyle and environmental impact.

---

## Why CarbonTrack AI is Different

Unlike standard static carbon calculators, CarbonTrack AI is designed to act as an active behavior-change driver by utilizing several core features:

*   **Personalized AI Guidance:** It features **EcoBuddy**, a local-first conversational sustainability coach that reads and analyzes your specific footprint metrics (highest emissions categories, percentage contributions) and generates tailored, contextual recommendations.
*   **Real-time Scenario Simulation:** The **Scenario Explorer** lets you adjust lifestyle "What-If" sliders (clean energy shift, plant-based diet, electric transit transition) and instantly forecasts the potential emission reductions visually.
*   **Tangible Carbon Equivalents:** Rather than just outputting abstract "tons of CO₂", it translates your impact into understandable real-world equivalents: number of mature trees required to sequester the gas, kilometers driven, smartphone charges, and lightbulb operational hours.
*   **Accessibility-First Design:** Fully compliant with accessibility requirements, featuring custom keyboard navigation skip-links (`.skip-to-content`), `:focus-visible` outline indicators, comprehensive W3C WAI-ARIA tab/checkbox markup, and live screen-reader live-region updates (`aria-live`).
*   **Zero-Backend Lightweight Architecture:** Packaged in a compact, highly optimized Alpine Nginx server image, running entirely in the browser client with a repository size under 10 MB. No heavy frameworks or slow backend queries required.
*   **Local-First Privacy:** All user calculations, daily streaks, custom checklists, and unlocked achievements badges are stored and computed locally on your device via browser LocalStorage. No tracking cookies or database storage.

---

## Chosen Vertical
**Individual Sustainability & Climate Awareness**

### Target Audience:
* Students
* Working professionals
* Families
* Environment-conscious citizens
* Organizations promoting sustainable behavior

---

## Core Features

### 1. Carbon Footprint Calculator
Users provide information regarding:
* Transportation habits
* Electricity consumption
* Water usage
* Food preferences
* Shopping behavior

The application calculates estimated annual carbon emissions using predefined emission factors based on public environmental datasets.
* **Output includes**: Total annual footprint, category-wise breakdown, visual carbon distribution chart, and green sustainability score.

### 2. Interactive Dashboard
Provides a visual representation of user impact through:
* Carbon breakdown pie chart (dynamic donut)
* **Emissions Trend Chart** (dynamic SVG line graph mapping calculation runs history over time)
* Reduction target progress bar (calculated against average benchmarks)
* Environmental equivalents display (trees grown, car km avoided, smartphones charged, LED bulbs run)
* Sustainability score meter & Category rating (Eco Champion, Green Explorer, etc.)

Charts are generated using lightweight SVG rendering to maintain repository size (<10 MB) and performance requirements.

### 3. Scenario Explorer ("What-If" Simulator)
Users can explore future lifestyle modifications in real-time.
* **Simulated adjustments**: Switching to electric transit, shifting diets to plant-based, clean solar home energy, and shopping/waste reductions.
* The interface updates projected emissions instantly, giving immediate feedback on how behavior modifications impact global warming.

### 4. Smart Sustainability Assistant (AI Carbon Coach)
An intelligent chatbot named **EcoBuddy** provides personalized context-aware recommendations based on user calculator data.
* **Capabilities**: Reads user emission logs (calculating percentage contribution of highest categories), answers conservation FAQs, suggests sustainability roadmaps, and guides green habits.

### 5. Gamified Action Tracker & Eco Streaks
* **Daily Eco Challenges**: Checks off sustainable actions (e.g. carry a reusable water bottle, turn off idle devices, avoid single-use plastics) to earn Green Points.
* **Eco Streak System**: Tracks consecutive daily logins/interactions to encourage long-term habit changes.

### 6. Badge & Achievement System
Unlocks glowing badges based on user milestones:
* **Eco Beginner**: Earned after running the calculator once.
* **Green Explorer**: Earned for completing 2 challenges.
* **Energy Saver**: Earned for simulating 50%+ clean energy adjustments.
* **Commute Pro**: Earned for completing the public transit challenge.
* **Climate Champion**: Earned for getting a Green Score of 75+ or completing all challenges.

---

## Technical Architecture
* **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6)
* **Design System**: Glassmorphism containers (`backdrop-filter`), CSS custom HSL properties, glowing icons, CSS Keyframe animations.
* **Storage**: Browser LocalStorage for persistent user progress.
* **Dependencies**: Google Fonts (Outfit), Lucide Icons CDN.
* **Backend**: None (pure client-side execution), making the codebase incredibly lightweight, secure, and instant to load.

---

## Project Structure
```
carbontrack-ai/
├── index.html
├── styles.css
├── app.js
└── README.md
```

---

## Carbon Calculation Logic

Total Emissions = Transportation + Home Energy + Diet & Food + Consumption & Shopping

### Category Coefficients (EPA & IPCC Benchmarks):
1. **Transportation**:
   * Petrol Car: `0.170 kg CO₂ / km`
   * Diesel Car: `0.171 kg CO₂ / km`
   * Hybrid Car: `0.101 kg CO₂ / km`
   * Electric Car: `0.047 kg CO₂ / km`
   * Public Transit: `0.035 kg CO₂ / km`
   * Flights: `180.0 kg CO₂ / flight`
2. **Home Energy**:
   * Grid Electricity: `0.85 kg CO₂ / kWh` (Multiplied by solar panel discount: No = 1.0, Partial solar = 0.5, Full solar = 0.0)
   * Water Consumption: `0.0003 kg CO₂ / Liter`
3. **Diet & Food**:
   * Heavy Meat: `2.8 tons CO₂e / yr` baseline.
   * Mixed Diet: `1.7 tons CO₂e / yr` baseline.
   * Vegetarian: `1.1 tons CO₂e / yr` baseline.
   * Vegan: `0.6 tons CO₂e / yr` baseline.
   * local-sourcing discount (10% to 25% savings) and food-waste penalty (+15% emissions).
4. **Consumption & Shopping**:
   * High shopping consumer: `1.9 tons CO₂e / yr` baseline.
   * Average consumer: `0.8 tons CO₂e / yr` baseline.
   * Eco-conscious consumer: `0.3 tons CO₂e / yr` baseline.
   * recycling discount (up to 15% savings) and trash penalty (+5% emissions).

---

## Accessibility & Security
* **Accessibility**: Semantic HTML structures, keyboard navigation focus rings, contrast-compliant dark mode styling, and screen-reader labels.
* **Security**: Absolute user privacy. No tracking cookies, no server-side databases, and no login authentication required.

---

## Testing & Verification Strategy

### 1. Calculator Validation
* Enter high personal car mileage and verify that the transport segment in the Pie Chart expands, total tons rise, and the Green Score decreases.
* Enter zero car transit and full solar utilities, and verify that the Green Score approaches 95+.

### 2. Scenario Explorer
* Calibrate sliders and verify that the Simulated Forecast bar adapts dynamically.
* Check that simulated reductions show the correct equivalents (e.g. equivalent trees planted).

### 3. Smart Assistant Chatbot
* Type `"How to improve my score?"` and verify the coach analyzes your worst emission category.
* Type `"Explain calculations"` to see formulas.

---

## Running Locally

1. Clone or download the repository files.
2. Open `index.html` directly in any web browser (Chrome, Firefox, Edge, Safari), or run a local static server:
   ```bash
   npx serve .
   ```
3. No build steps or node dependencies are needed to run!
