/* ==========================================================================
   CarbonTrack AI Core Application Logic
   ========================================================================== */

// ==========================================================================
// ===== CONSTANTS & CONFIG =====
// ==========================================================================

// --- Code Quality Guidelines / Calculation Constants ---
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;
const DAYS_PER_YEAR = 365;
const KG_TO_TON_FACTOR = 1000;
const BENCHMARK_CO2_AVERAGE = 6.5;
const MAX_HISTORY_ENTRIES = 7;
const EMISSION_BASE_MAX = 12.0;
const EMISSION_BASE_MIN = 1.0;
const POINTS_PER_LEVEL = 100;

// --- Constants & Configs (EPA / IPCC Emission Factors) ---
const EMISSION_FACTORS = {
    // Transport constants: kg CO2 per km
    transport: {
        car_petrol: 0.170,
        car_diesel: 0.171,
        car_hybrid: 0.101,
        car_electric: 0.047,
        public_transit: 0.035,
        flight: 180.0 // kg CO2 per flight (average short-medium haul)
    },
    // Home Energy constants
    energy: {
        electricity_kwh: 0.85, // kg CO2 per kWh grid average
        water_liter: 0.0003,   // kg CO2 per Liter
        solar_multipliers: {
            no: 1.0,
            partial: 0.5,
            yes: 0.0
        }
    },
    // Diet baselines (Annual Tons CO2e)
    diet: {
        'meat-heavy': 2.8,
        'mixed': 1.7,
        'vegetarian': 1.1,
        'vegan': 0.6,
        local_discount: {
            no: 1.0,
            sometimes: 0.9,
            mostly: 0.75
        },
        waste_multiplier: {
            low: 0.95,
            average: 1.0,
            high: 1.15
        }
    },
    // Consumption & Shopping baselines (Annual Tons CO2e)
    shopping: {
        high: 1.9,
        average: 0.8,
        eco: 0.3,
        recycle_modifier: {
            all: 0.85,
            some: 0.95,
            none: 1.05
        }
    }
};

// Badges Library
const BADGES = [
    { id: 'eco-beginner', name: 'Eco Beginner', desc: 'Calculated footprint for the first time.', icon: 'sprout', color: 'green' },
    { id: 'green-explorer', name: 'Green Explorer', desc: 'Completed 2 daily eco challenges.', icon: 'compass', color: 'green' },
    { id: 'energy-saver', name: 'Energy Saver', desc: 'Reduced simulated home energy footprint by 50% in Scenario Explorer.', icon: 'zap', color: 'gold' },
    { id: 'commute-pro', name: 'Commute Pro', desc: 'Completed the public transit daily challenge.', icon: 'bike', color: 'green' },
    { id: 'climate-champion', name: 'Climate Champion', desc: 'Earned a Green Score of 75+ or completed all challenges.', icon: 'award', color: 'gold' }
];

// EcoBuddy Conversational Rules
const COACH_AI_RULES = {
    greetings: [
        "Hello! I am EcoBuddy, your virtual Carbon Coach. How can I help you improve your sustainability setup today?",
        "Hi! Ready to cut emissions and boost your green score? Ask me anything about conservation, renewable tech, or diet optimization."
    ],
    transport: [
        "Transportation usually accounts for the largest chunk of an individual's carbon footprint. Shifting to public transit (bus or electric train) reduces emissions by 80% per kilometer compared to a traditional petrol car. For your personal car, hybrid and electric drivetrains reduce fuel emissions by 40-70% respectively."
    ],
    energy: [
        "Household energy is heavily driven by heating, air conditioning, and lighting. You can reduce electricity bills and emissions by switching to ENERGY STAR certified LED bulbs (which use 75% less energy than incandescent ones), insulating windows, and setting thermostats 2 degrees lower. Installing home solar panels reduces your grid reliance emissions to zero."
    ],
    diet: [
        "Farming livestock (especially cattle) releases high quantities of methane, which is a potent greenhouse gas. Replacing two meat-based meals a week with plant-based alternatives reduces your food footprint by roughly 25%. Sourcing ingredients from local farmers reduces shipping fuel emissions (food miles) significantly."
    ],
    offset: [
        "Carbon offsetting involves investing in environmental projects (like tree planting, forest protection, or wind farm construction) to balance out your own footprint. Organizations like Gold Standard verify high-impact offset programs. Remember: reducing emissions first is always better than offsetting them later."
    ],
    calculations: [
        "CarbonTrack AI calculates footprint values based on standard EPA and IPCC guidelines. We multiply your inputs (car mileage, flight count, electricity kWh) by specific carbon coefficients: e.g. 0.17 kg CO2 per km for petrol cars, 0.85 kg CO2 per kWh of grid electricity, and baseline annual factors for shopping and diets. Your Green Score represents how close you are to the optimal 1-ton-per-year lifestyle."
    ]
};

// ==========================================================================
// ===== GLOBAL STATE =====
// ==========================================================================

// Active element tracking for accessibility focus restoration
let lastActiveElement = null;

// Global App State
let appState = {
    hasCalculated: false,
    calculatedEmissions: {
        transport: 0,
        energy: 0,
        food: 0,
        shopping: 0,
        total: 0
    },
    greenScore: 0,
    dailyStreak: 0,
    lastLoginDate: null,
    greenPoints: 0,
    challenges: [
        { id: 'water-bottle', text: 'Carry a reusable water bottle today', points: 15, completed: false },
        { id: 'no-plastic', text: 'Avoid all single-use plastic packaging', points: 20, completed: false },
        { id: 'public-transit', text: 'Use public transport, bike, or walk', points: 30, completed: false },
        { id: 'unplug-devices', text: 'Unplug idle electronics and turn off lights', points: 20, completed: false },
        { id: 'vegan-meal', text: 'Eat a plant-based (vegan) meal today', points: 25, completed: false }
    ],
    unlockedBadges: [],
    scenarioSim: {
        evShare: 0,
        dietShift: 0,
        cleanEnergy: 0,
        wasteReduction: 0
    },
    chatHistory: [],
    history: []
};

// ==========================================================================
// ===== BOOTSTRAP & DOM EVENT LISTENERS =====
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Check if URL has ?demo=true to auto-populate mock data for screenshots and testing
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("demo") === "true") {
        appState = {
            hasCalculated: true,
            calculatedEmissions: { transport: 1.6, energy: 2.6, food: 2.7, shopping: 0.3, total: 7.2 },
            greenScore: 45,
            dailyStreak: 3,
            lastLoginDate: new Date().toDateString(),
            greenPoints: 120,
            challenges: [
                { id: 'water-bottle', text: 'Carry a reusable water bottle today', points: 15, completed: true },
                { id: 'no-plastic', text: 'Avoid all single-use plastic packaging', points: 20, completed: false },
                { id: 'public-transit', text: 'Use public transport, bike, or walk', points: 30, completed: false },
                { id: 'unplug-devices', text: 'Unplug idle electronics and turn off lights', points: 20, completed: true },
                { id: 'vegan-meal', text: 'Eat a plant-based (vegan) meal today', points: 25, completed: false }
            ],
            unlockedBadges: ['eco-beginner', 'energy-saver'],
            scenarioSim: { evShare: 40, dietShift: 50, cleanEnergy: 100, wasteReduction: 20 },
            chatHistory: [
                { sender: 'user', text: 'How do I improve my score?' },
                { sender: 'system', text: 'Your current Carbon Footprint is **7.2 tons CO₂e** per year, giving you a Green Score of **45/100**.\n\nYour highest source of emissions is **Diet & Food Habits**, contributing **2.7 tons** (approx. **38%** of your total emissions). To make the fastest impact, I suggest you try incorporating more plant-based meals, reducing weekly red meat intake, and sourcing ingredients from local food hubs.' }
            ]
        };
        // Add calculation history for the trend line chart
        appState.calculationHistory = [
            { date: '06/05/2026', footprint: 9.8 },
            { date: '06/06/2026', footprint: 8.9 },
            { date: '06/07/2026', footprint: 8.0 },
            { date: '06/08/2026', footprint: 7.2 }
        ];
        localStorage.setItem("carbontrack_ai_state", JSON.stringify(appState));
    }

    loadStateFromLocalStorage();
    initializeUIElements();
    updateEcoStreak();
    renderAllViews();
    lucide.createIcons();

    // Check if tab parameter is specified to auto-navigate
    const tabParam = urlParams.get("tab");
    if (tabParam) {
        setTimeout(() => {
            switchTab(tabParam);
        }, 100);
    }

    // Check if autoplay parameter is specified
    if (urlParams.get("demo") === "autoplay") {
        setTimeout(() => {
            startAutoplayDemo();
        }, 1000);
    }
});

// ==========================================================================
// ===== UTILITIES & HELPERS =====
// ==========================================================================

/**
 * Safely executes querySelector on a parent element if it exists and is a function.
 * @param {Element|null} parent - The parent element.
 * @param {string} selector - The CSS selector query.
 * @returns {Element|null} The resolved child element or null.
 */
function safeQuerySelector(parent, selector) {
    if (parent && typeof parent.querySelector === "function") {
        return parent.querySelector(selector);
    }
    return null;
}

/**
 * Escapes special HTML characters in a string to mitigate XSS injection risks.
 * @param {string} str - The raw input string.
 * @returns {string} The HTML escaped string.
 */
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/**
 * Retrieves the textual category name corresponding to a Green Score.
 * @param {number} score - The numerical green score (0-100).
 * @returns {string} The text label of the score class.
 */
function getScoreCategoryName(score) {
    if (score >= 80) return "Eco Champion";
    if (score >= 60) return "Green Explorer";
    if (score >= 40) return "Improving";
    return "High Climate Impact";
}

/**
 * Injects a message into the screen reader announcer DOM node for dynamic content updates.
 * @param {string} message - The text content to announce.
 * @returns {void}
 */
function announceToScreenReader(message) {
    const announcer = document.getElementById("sr-announcer");
    if (announcer) {
        announcer.textContent = "";
        setTimeout(() => {
            announcer.textContent = message;
        }, 50);
    }
}

/**
 * Promisified delay helper to sleep for a specified duration.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================================================
// ===== TAB ROUTING & INPUT SYNCHRONIZATION =====
// ==========================================================================

/**
 * Initializes DOM elements, slider ranges, tab listeners, and state hooks.
 * @returns {void}
 */
function initializeUIElements() {
    // Tab switching
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    // Form inputs real-time value label synchronization
    setupRangeSync("input-car-km", "val-car-km", " km");
    setupRangeSync("input-public-km", "val-public-km", " km");
    setupRangeSync("input-flights", "val-flights", (val) => val === "1" ? "1 Flight" : `${val} Flights`);
    setupRangeSync("input-electricity", "val-electricity", " kWh");
    setupRangeSync("input-water", "val-water", " Liters");

    // Scenario Sliders sync and simulation event binding
    const scenarioInputs = [
        { sliderId: "slider-scenario-ev", labelId: "scenario-val-ev", suffix: "% EV", stateProp: "evShare" },
        { sliderId: "slider-scenario-diet", labelId: "scenario-val-diet", suffix: "% Shift", stateProp: "dietShift" },
        { sliderId: "slider-scenario-clean-energy", labelId: "scenario-val-clean-energy", customFormat: (v) => v === "0" ? "Current Grid" : v === "50" ? "50% Solar" : "100% Solar", stateProp: "cleanEnergy" },
        { sliderId: "slider-scenario-waste", labelId: "scenario-val-waste", suffix: "% Reduction", stateProp: "wasteReduction" }
    ];

    scenarioInputs.forEach(item => {
        const slider = document.getElementById(item.sliderId);
        if (slider) {
            // Set slider value from state
            const stateValue = appState.scenarioSim[item.stateProp];
            if (typeof stateValue === "number") {
                slider.value = stateValue;
            }
            
            const label = document.getElementById(item.labelId);
            if (label) {
                if (item.customFormat) {
                    label.textContent = item.customFormat(slider.value);
                } else {
                    label.textContent = slider.value + item.suffix;
                }
            }

            slider.addEventListener("input", () => {
                const label = document.getElementById(item.labelId);
                if (label) {
                    if (item.customFormat) {
                        label.textContent = item.customFormat(slider.value);
                    } else {
                        label.textContent = slider.value + item.suffix;
                    }
                }
                runScenarioSimulation();
            });
        }
    });
}

/**
 * Helper to bind sync logic between a range slider input and a numeric indicator tag.
 * @param {string} inputId - ID of range slider element.
 * @param {string} labelId - ID of text value indicator label.
 * @param {string|Function} formatter - Constant suffix string or custom formatting routine.
 * @returns {void}
 */
function setupRangeSync(inputId, labelId, formatter) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if (input && label) {
        // Initial setup
        updateLabelValue(input.value);
        // Event listener
        input.addEventListener("input", () => updateLabelValue(input.value));
    }

    function updateLabelValue(val) {
        if (typeof formatter === "function") {
            label.textContent = formatter(val);
        } else {
            label.textContent = val + formatter;
        }
    }
}

/**
 * Main application router handler to switch visual workspace tabs.
 * @param {string} tabId - The selected destination workspace identifier.
 * @returns {void}
 */
function switchTab(tabId) {
    // Hide all panels
    const panels = document.querySelectorAll(".tab-panel");
    panels.forEach(p => p.classList.add("hidden"));

    // Show selected panel
    const targetPanel = document.getElementById(`tab-${tabId}`);
    if (targetPanel) {
        targetPanel.classList.remove("hidden");
    }

    // Toggle active classes on nav
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        if (item.getAttribute("data-tab") === tabId) {
            item.classList.add("active");
            item.setAttribute("aria-selected", "true");
        } else {
            item.classList.remove("active");
            item.setAttribute("aria-selected", "false");
        }
    });

    // Handle initial entry/visual updates when loading specific tabs
    if (tabId === "dashboard") {
        renderDashboard();
    } else if (tabId === "scenario") {
        runScenarioSimulation();
    } else if (tabId === "challenges") {
        renderChallenges();
    }
    lucide.createIcons();
}

/**
 * Transitions the calculator wizard page stepper forward or backward.
 * @param {number} stepNum - The destination step index (1-4).
 * @returns {void}
 */
function goToStep(stepNum) {
    // Hide all step panels
    const stepPanels = document.querySelectorAll(".step-panel");
    stepPanels.forEach(panel => panel.classList.add("hidden"));
    
    // Show selected step panel
    document.getElementById(`step-panel-${stepNum}`).classList.remove("hidden");

    // Update step stepper indicators
    const steps = document.querySelectorAll(".step-indicator");
    steps.forEach((indicator, index) => {
        if (index + 1 === stepNum) {
            indicator.className = "step-indicator active";
        } else if (index + 1 < stepNum) {
            indicator.className = "step-indicator completed";
        } else {
            indicator.className = "step-indicator";
        }
    });
    lucide.createIcons();
}

// ==========================================================================
// ===== STORAGE & PERSISTENCE =====
// ==========================================================================

/**
 * Increments or resets user's daily streaks based on calendar dates comparison.
 * @returns {void}
 */
function updateEcoStreak() {
    const today = new Date().toDateString();
    
    if (!appState.lastLoginDate) {
        appState.dailyStreak = 1;
    } else {
        const lastLogin = new Date(appState.lastLoginDate);
        const diffTime = Math.abs(new Date(today) - lastLogin);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            appState.dailyStreak += 1;
        } else if (diffDays > 1) {
            appState.dailyStreak = 1; // reset streak if missed a day
        }
    }
    appState.lastLoginDate = today;
    saveStateToLocalStorage();
}

/**
 * Commits the current global appState to browser LocalStorage.
 * @returns {void}
 */
function saveStateToLocalStorage() {
    localStorage.setItem("carbontrack_ai_state", JSON.stringify(appState));
}

/**
 * Validates the loaded state object schema to prevent type mismatches or prototype pollution.
 * Apply safe defaults if verification fails.
 * @param {Object} data - The parsed localStorage object.
 * @returns {Object|null} The validated state object or null if invalid.
 */
function validateStateSchema(data) {
    if (!data || typeof data !== "object") return null;

    const validated = {};

    // Validate hasCalculated (boolean)
    validated.hasCalculated = typeof data.hasCalculated === "boolean" ? data.hasCalculated : false;

    // Validate calculatedEmissions (object of positive numbers)
    validated.calculatedEmissions = {
        transport: typeof data.calculatedEmissions?.transport === "number" && isFinite(data.calculatedEmissions.transport) ? Math.max(0, data.calculatedEmissions.transport) : 0,
        energy: typeof data.calculatedEmissions?.energy === "number" && isFinite(data.calculatedEmissions.energy) ? Math.max(0, data.calculatedEmissions.energy) : 0,
        food: typeof data.calculatedEmissions?.food === "number" && isFinite(data.calculatedEmissions.food) ? Math.max(0, data.calculatedEmissions.food) : 0,
        shopping: typeof data.calculatedEmissions?.shopping === "number" && isFinite(data.calculatedEmissions.shopping) ? Math.max(0, data.calculatedEmissions.shopping) : 0,
        total: typeof data.calculatedEmissions?.total === "number" && isFinite(data.calculatedEmissions.total) ? Math.max(0, data.calculatedEmissions.total) : 0
    };

    // Validate greenScore (integer 0-100)
    validated.greenScore = typeof data.greenScore === "number" && isFinite(data.greenScore) ? Math.max(0, Math.min(100, Math.round(data.greenScore))) : 0;

    // Validate dailyStreak (integer >= 0)
    validated.dailyStreak = typeof data.dailyStreak === "number" && isFinite(data.dailyStreak) ? Math.max(0, Math.round(data.dailyStreak)) : 0;

    // Validate lastLoginDate (string or null)
    validated.lastLoginDate = typeof data.lastLoginDate === "string" ? escapeHTML(data.lastLoginDate) : null;

    // Validate greenPoints (integer >= 0)
    validated.greenPoints = typeof data.greenPoints === "number" && isFinite(data.greenPoints) ? Math.max(0, Math.round(data.greenPoints)) : 0;

    // Validate challenges (array of objects)
    validated.challenges = Array.isArray(data.challenges) ? data.challenges.map(c => {
        const defaultChallenge = appState.challenges.find(dc => dc.id === c.id) || {};
        return {
            id: typeof c.id === "string" ? escapeHTML(c.id) : (defaultChallenge.id || ""),
            text: typeof c.text === "string" ? escapeHTML(c.text) : (defaultChallenge.text || ""),
            points: typeof c.points === "number" && isFinite(c.points) ? Math.max(0, c.points) : (defaultChallenge.points || 0),
            completed: typeof c.completed === "boolean" ? c.completed : false
        };
    }).filter(c => c.id !== "") : JSON.parse(JSON.stringify(appState.challenges));

    // Validate unlockedBadges (array of strings)
    const validBadgeIds = BADGES.map(b => b.id);
    validated.unlockedBadges = Array.isArray(data.unlockedBadges) ? data.unlockedBadges.filter(b => typeof b === "string" && validBadgeIds.includes(b)) : [];

    // Validate scenarioSim (object of numbers 0-100)
    validated.scenarioSim = {
        evShare: typeof data.scenarioSim?.evShare === "number" && isFinite(data.scenarioSim.evShare) ? Math.max(0, Math.min(100, data.scenarioSim.evShare)) : 0,
        dietShift: typeof data.scenarioSim?.dietShift === "number" && isFinite(data.scenarioSim.dietShift) ? Math.max(0, Math.min(100, data.scenarioSim.dietShift)) : 0,
        cleanEnergy: typeof data.scenarioSim?.cleanEnergy === "number" && isFinite(data.scenarioSim.cleanEnergy) ? Math.max(0, Math.min(100, data.scenarioSim.cleanEnergy)) : 0,
        wasteReduction: typeof data.scenarioSim?.wasteReduction === "number" && isFinite(data.scenarioSim.wasteReduction) ? Math.max(0, Math.min(100, data.scenarioSim.wasteReduction)) : (typeof data.scenarioSim?.wasteRed === "number" && isFinite(data.scenarioSim.wasteRed) ? Math.max(0, Math.min(100, data.scenarioSim.wasteRed)) : 0)
    };

    // Validate history (array of objects { date: string, footprint: number })
    validated.history = Array.isArray(data.history) ? data.history.map(h => ({
        date: typeof h.date === "string" ? escapeHTML(h.date) : "",
        footprint: typeof h.footprint === "number" && isFinite(h.footprint) ? Math.max(0, h.footprint) : 0
    })).filter(h => h.date !== "") : [];

    // Validate calculationHistory (compatibility fallback)
    if (Array.isArray(data.calculationHistory)) {
        validated.calculationHistory = data.calculationHistory.map(h => ({
            date: typeof h.date === "string" ? escapeHTML(h.date) : "",
            footprint: typeof h.footprint === "number" && isFinite(h.footprint) ? Math.max(0, h.footprint) : 0
        })).filter(h => h.date !== "");
        if (validated.history.length === 0) {
            validated.history = validated.calculationHistory;
        }
    } else if (validated.history.length > 0) {
        validated.calculationHistory = validated.history;
    } else {
        validated.calculationHistory = [];
    }

    // Validate chatHistory
    validated.chatHistory = Array.isArray(data.chatHistory) ? data.chatHistory.map(ch => ({
        sender: ch.sender === "user" ? "user" : "system",
        text: typeof ch.text === "string" ? escapeHTML(ch.text) : ""
    })).filter(ch => ch.text !== "") : [];

    return validated;
}

/**
 * Loads and validates configuration state dataset from browser LocalStorage.
 * @returns {void}
 */
function loadStateFromLocalStorage() {
    const raw = localStorage.getItem("carbontrack_ai_state");
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            const validated = validateStateSchema(parsed);
            if (validated) {
                appState = validated;
            }
        } catch (e) {
            console.error("Error loading localStorage state:", e);
        }
    }
}

/**
 * Prompts double check confirmations and clears user local carbon footprints databases.
 * @returns {void}
 */
function resetUserData() {
    if (confirm("Are you sure you want to clear your carbon calculations, challenges, and achievements badge data?")) {
        localStorage.removeItem("carbontrack_ai_state");
        appState = {
            hasCalculated: false,
            calculatedEmissions: { transport: 0, energy: 0, food: 0, shopping: 0, total: 0 },
            greenScore: 0,
            dailyStreak: 1,
            lastLoginDate: new Date().toDateString(),
            greenPoints: 0,
            challenges: [
                { id: 'water-bottle', text: 'Carry a reusable water bottle today', points: 15, completed: false },
                { id: 'no-plastic', text: 'Avoid all single-use plastic packaging', points: 20, completed: false },
                { id: 'public-transit', text: 'Use public transport, bike, or walk', points: 30, completed: false },
                { id: 'unplug-devices', text: 'Unplug idle electronics and turn off lights', points: 20, completed: false },
                { id: 'vegan-meal', text: 'Eat a plant-based (vegan) meal today', points: 25, completed: false }
            ],
            unlockedBadges: [],
            scenarioSim: { evShare: 0, dietShift: 0, cleanEnergy: 0, wasteReduction: 0 },
            chatHistory: []
        };
        saveStateToLocalStorage();
        renderAllViews();
        switchTab("dashboard");
        showSystemNotification("State Reset", "All local carbon log datasets have been cleared.");
    }
}

// ==========================================================================
// ===== CALCULATIONS =====
// ==========================================================================

/**
 * Calculates the user's annual carbon footprint in metric tons of CO2 equivalent (CO2e).
 * Extracts input values, applies EPA/IPCC emission coefficients, maps outputs,
 * updates the global application state, checks badge unlocking rules,
 * saves progress to LocalStorage, and transitions to the Dashboard view.
 * @returns {void}
 */
function calculateCarbonFootprint() {
    // 1. Fetch values
    const carKm = parseFloat(document.getElementById("input-car-km").value);
    const carType = document.getElementById("input-car-type").value;
    const publicKm = parseFloat(document.getElementById("input-public-km").value);
    const flights = parseFloat(document.getElementById("input-flights").value);
    
    const electricityKwh = parseFloat(document.getElementById("input-electricity").value);
    const solarType = document.getElementById("input-solar").value;
    const waterLiters = parseFloat(document.getElementById("input-water").value);
    
    const dietType = document.getElementById("input-diet").value;
    const localFood = document.getElementById("input-local-food").value;
    const foodWaste = document.getElementById("input-food-waste").value;
    
    const shoppingType = document.getElementById("input-shopping").value;
    const recycleLevel = document.getElementById("input-recycling").value;

    // 2. Calculations (Convert all to Annual Metric Tons CO2e)
    
    // TRANSPORT
    const annualCarKm = carKm * WEEKS_PER_YEAR;
    const carFactor = EMISSION_FACTORS.transport[`car_${carType}`];
    const carEmissions = (annualCarKm * carFactor) / KG_TO_TON_FACTOR; // tons
    
    const annualPublicKm = publicKm * WEEKS_PER_YEAR;
    const publicFactor = EMISSION_FACTORS.transport.public_transit;
    const publicEmissions = (annualPublicKm * publicFactor) / KG_TO_TON_FACTOR; // tons
    
    const flightEmissions = (flights * EMISSION_FACTORS.transport.flight) / KG_TO_TON_FACTOR; // tons
    const totalTransport = carEmissions + publicEmissions + flightEmissions;

    // UTILITIES & ENERGY
    const annualElectricity = electricityKwh * MONTHS_PER_YEAR;
    const solarFactor = EMISSION_FACTORS.energy.solar_multipliers[solarType];
    const electricityEmissions = (annualElectricity * EMISSION_FACTORS.energy.electricity_kwh * solarFactor) / KG_TO_TON_FACTOR; // tons
    
    const annualWater = waterLiters * DAYS_PER_YEAR;
    const waterEmissions = (annualWater * EMISSION_FACTORS.energy.water_liter) / KG_TO_TON_FACTOR; // tons
    const totalEnergy = electricityEmissions + waterEmissions;

    // DIET & FOOD
    const dietBaseline = EMISSION_FACTORS.diet[dietType];
    const localDiscount = EMISSION_FACTORS.diet.local_discount[localFood];
    const wasteMultiplier = EMISSION_FACTORS.diet.waste_multiplier[foodWaste];
    const totalFood = dietBaseline * localDiscount * wasteMultiplier;

    // SHOPPING & CONSUMPTION
    const shoppingBaseline = EMISSION_FACTORS.shopping[shoppingType];
    const recycleModifier = EMISSION_FACTORS.shopping.recycle_modifier[recycleLevel];
    const totalShopping = shoppingBaseline * recycleModifier;

    // TOTALS
    const totalFootprint = totalTransport + totalEnergy + totalFood + totalShopping;

    // Update State
    appState.calculatedEmissions = {
        transport: Number(totalTransport.toFixed(2)),
        energy: Number(totalEnergy.toFixed(2)),
        food: Number(totalFood.toFixed(2)),
        shopping: Number(totalShopping.toFixed(2)),
        total: Number(totalFootprint.toFixed(2))
    };
    appState.hasCalculated = true;

    // Calculate Green Score (0-100 scale: 12 tons carbon is 0 score, 1 ton carbon is 100 score)
    const baselineMax = EMISSION_BASE_MAX;
    const baselineMin = EMISSION_BASE_MIN;
    let score = 100 - ((totalFootprint - baselineMin) / (baselineMax - baselineMin)) * 100;
    score = Math.round(score);
    appState.greenScore = Math.max(0, Math.min(100, score));

    // Award Badge for calculation
    unlockBadge('eco-beginner');

    // If score is high, award climate champion
    if (appState.greenScore >= 75) {
        unlockBadge('climate-champion');
    }

    // Update calculation history
    if (!appState.history) {
        appState.history = [];
    }
    
    // Check if this is the first calculation to pre-populate simulated trend
    if (appState.history.length === 0) {
        const dateNow = new Date();
        const date2Wk = new Date(dateNow.getTime() - 14 * 24 * 60 * 60 * 1000);
        const date4Wk = new Date(dateNow.getTime() - 28 * 24 * 60 * 60 * 1000);
        
        const formatOptions = { month: 'short', day: 'numeric' };
        
        appState.history = [
            { date: date4Wk.toLocaleDateString(undefined, formatOptions), footprint: Number((totalFootprint * 1.35).toFixed(2)) },
            { date: date2Wk.toLocaleDateString(undefined, formatOptions), footprint: Number((totalFootprint * 1.18).toFixed(2)) },
            { date: dateNow.toLocaleDateString(undefined, formatOptions), footprint: Number(totalFootprint.toFixed(2)) }
        ];
    } else {
        // Add new point
        appState.history.push({
            date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            footprint: Number(totalFootprint.toFixed(2))
        });
        if (appState.history.length > MAX_HISTORY_ENTRIES) {
            appState.history.shift();
        }
    }

    saveStateToLocalStorage();
    renderAllViews();
    switchTab("dashboard");

    // Pop visual success prompt
    showSystemNotification("Calculation Success!", "Your personal carbon footprint has been calculated.");
}

/**
 * Runs the scenario explorer simulator to project target offsets.
 * Adjusts UI meter projections and awards Energy Saver badge milestones.
 * @returns {void}
 */
function runScenarioSimulation() {
    if (!appState.hasCalculated) {
        document.getElementById("scenario-current-val").textContent = "0.0 Tons";
        document.getElementById("scenario-forecast-val").textContent = "0.0 Tons";
        document.getElementById("scenario-savings-val").textContent = "0.0 Tons CO₂e / Year";
        document.getElementById("scenario-savings-percent").textContent = "Calculate your footprint first.";
        document.getElementById("scenario-explanation").textContent = "Please complete the Footprint Calculator questionnaire first to calibrate simulation baselines.";
        return;
    }

    const evShare = parseFloat(document.getElementById("slider-scenario-ev").value);
    const dietShift = parseFloat(document.getElementById("slider-scenario-diet").value);
    const cleanEnergy = parseFloat(document.getElementById("slider-scenario-clean-energy").value);
    const wasteRed = parseFloat(document.getElementById("slider-scenario-waste").value);

    // Persist values in application state
    appState.scenarioSim.evShare = evShare;
    appState.scenarioSim.dietShift = dietShift;
    appState.scenarioSim.cleanEnergy = cleanEnergy;
    appState.scenarioSim.wasteReduction = wasteRed;
    saveStateToLocalStorage();

    // Calculate current values
    const currentTotal = appState.calculatedEmissions.total;

    // Simulate adjustments
    const transportSavings = appState.calculatedEmissions.transport * (evShare / 100) * 0.6; 
    const foodSavings = appState.calculatedEmissions.food * (dietShift / 100) * 0.45;
    const energySavings = appState.calculatedEmissions.energy * (cleanEnergy / 100);
    const shoppingSavings = appState.calculatedEmissions.shopping * (wasteRed / 100);

    const totalSavings = transportSavings + foodSavings + energySavings + shoppingSavings;
    const simulatedTotal = Math.max(0.5, currentTotal - totalSavings);

    // Sync elements
    document.getElementById("scenario-current-val").textContent = `${currentTotal.toFixed(1)} Tons`;
    document.getElementById("scenario-forecast-val").textContent = `${simulatedTotal.toFixed(1)} Tons`;
    document.getElementById("scenario-savings-val").textContent = `${totalSavings.toFixed(1)} Tons CO₂e / Year`;
    
    const reductionPercent = currentTotal > 0 ? Math.round((totalSavings / currentTotal) * 100) : 0;
    document.getElementById("scenario-savings-percent").textContent = `Equivalent to a ${reductionPercent}% reduction overall.`;

    // Adjust simulated bar width
    const simulatedPercentOfMax = (simulatedTotal / currentTotal) * 100;
    document.getElementById("scenario-bar-simulated").style.width = `${simulatedPercentOfMax}%`;

    // Award Energy Saver badge if they simulate 50% energy savings
    if (cleanEnergy >= 50 && appState.hasCalculated) {
        unlockBadge('energy-saver');
    }

    // Dynamic simulation insights text box
    let explanationText = "";
    if (totalSavings === 0) {
        explanationText = "Move any slider above to simulate how personal changes reduce your yearly carbon emission projections.";
    } else {
        explanationText = `By adopting these simulated shifts: `;
        let steps = [];
        if (evShare > 0) steps.push(`switching ${evShare}% of car travel to Electric Vehicles saves ${transportSavings.toFixed(2)} tons`);
        if (dietShift > 0) steps.push(`cutting meat meals by ${dietShift}% saves ${foodSavings.toFixed(2)} tons`);
        if (cleanEnergy > 0) steps.push(`using ${cleanEnergy}% solar panels saves ${energySavings.toFixed(2)} tons`);
        if (wasteRed > 0) steps.push(`lowering shopping waste by ${wasteRed}% saves ${shoppingSavings.toFixed(2)} tons`);
        explanationText += steps.join(", ") + ". Combined, you offset global greenhouse emissions significantly.";
    }
    document.getElementById("scenario-explanation").textContent = explanationText;
}

// ==========================================================================
// ===== DASHBOARD & VIEW RENDERING =====
// ==========================================================================

/**
 * Renders the dashboard metrics, scores, comparison indicators, environmental equivalents,
 * and calls downstream rendering routines for pie and trend charts.
 * @returns {void}
 */
function renderDashboard() {
    const scoreVal = document.getElementById("dashboard-score-val");
    const co2Val = document.getElementById("dashboard-co2-val");
    const scoreTitle = document.getElementById("score-category-title");
    const scoreDesc = document.getElementById("score-category-desc");
    const streakVal = document.getElementById("streak-count-value");
    const levelBadge = document.getElementById("user-level-badge");

    // Sync streak and level badge
    if (streakVal) streakVal.textContent = appState.dailyStreak;
    
    // Level calculation based on green points
    const userLevel = Math.floor(appState.greenPoints / POINTS_PER_LEVEL) + 1;
    if (levelBadge) levelBadge.textContent = `Level ${userLevel}`;

    if (!appState.hasCalculated) {
        scoreVal.textContent = "-";
        co2Val.textContent = "-.-";
        return;
    }

    // Set text values
    scoreVal.textContent = appState.greenScore;
    co2Val.textContent = appState.calculatedEmissions.total;

    // Set category headers
    let catTitle = "";
    let catDesc = "";
    let catColorClass = "";
    
    if (appState.greenScore >= 80) {
        catTitle = "Eco Champion";
        catDesc = "Excellent! You are leading a highly sustainable life. Keep offsetting any remaining footprint.";
        catColorClass = "text-emerald";
    } else if (appState.greenScore >= 60) {
        catTitle = "Green Explorer";
        catDesc = "Good job. Your footprint is below average. Try adopting public transit or shifting diet to get to Champion level.";
        catColorClass = "text-emerald";
    } else if (appState.greenScore >= 40) {
        catTitle = "Improving User";
        catDesc = "Moderate emissions. Switching appliances, reducing shopping waste, and choosing local foods will help.";
        catColorClass = "text-yellow";
    } else {
        catTitle = "High Climate Impact";
        catDesc = "Your emissions are above regional benchmarks. Start with simple daily challenges to reduce your footprint.";
        catColorClass = "text-coral";
    }

    scoreTitle.textContent = catTitle;
    scoreTitle.className = catColorClass;
    scoreDesc.textContent = catDesc;

    // Sync SVG Gauge
    const dasharray = 251; // A80,80 semi-circle arc length approximation
    const offset = dasharray - (dasharray * (appState.greenScore / 100));
    document.getElementById("gauge-fill-path").setAttribute("stroke-dashoffset", offset);

    // Sync comparison subtitle
    const diffFromAvg = Math.abs(BENCHMARK_CO2_AVERAGE - appState.calculatedEmissions.total).toFixed(1);
    const compText = document.getElementById("dashboard-carbon-comparison");
    if (appState.calculatedEmissions.total > BENCHMARK_CO2_AVERAGE) {
        compText.innerHTML = `<span class="text-coral font-medium">${diffFromAvg} tons higher</span> than national averages (${BENCHMARK_CO2_AVERAGE} tons/yr).`;
    } else {
        compText.innerHTML = `<span class="text-emerald font-medium">${diffFromAvg} tons lower</span> than national averages (${BENCHMARK_CO2_AVERAGE} tons/yr).`;
    }

    // Sync Reduction Target Progress Bar
    const targetProgressPercentage = Math.min(100, Math.max(0, Math.round(((BENCHMARK_CO2_AVERAGE - appState.calculatedEmissions.total) / BENCHMARK_CO2_AVERAGE) * 100)));
    document.getElementById("target-progress-percentage").textContent = appState.calculatedEmissions.total < BENCHMARK_CO2_AVERAGE ? `${targetProgressPercentage}% Below Average` : `Above Avg Footprint`;
    document.getElementById("target-progress-fill").style.width = appState.calculatedEmissions.total < BENCHMARK_CO2_AVERAGE ? `${targetProgressPercentage}%` : `0%`;

    // Render Environmental Equivalents
    document.getElementById("eq-trees").textContent = Math.round(appState.calculatedEmissions.total * 16.5);
    document.getElementById("eq-car-km").textContent = `${Math.round(appState.calculatedEmissions.total * 5880).toLocaleString()} km`;
    document.getElementById("eq-smartphones").textContent = Math.round(appState.calculatedEmissions.total * 121000).toLocaleString();
    document.getElementById("eq-bulbs").textContent = Math.round(appState.calculatedEmissions.total * 35);

    // Draw Pie Chart
    renderPieChart();

    // Draw Trend Chart
    renderTrendLineChart();

    // Render Daily checklist list on Dashboard
    renderMiniChecklist();

    // Render 30-day Roadmap
    renderRoadmap();
}

/**
 * Populates the compact daily challenges checklist on the main Eco Dashboard.
 * @returns {void}
 */
function renderMiniChecklist() {
    const listEl = document.getElementById("dashboard-mini-checklist");
    if (!listEl) return;

    listEl.innerHTML = "";

    // Show first 3 challenges on dashboard
    appState.challenges.slice(0, 3).forEach(challenge => {
        const item = document.createElement("div");
        item.className = `mini-check-item ${challenge.completed ? 'completed' : ''}`;
        item.setAttribute("tabindex", "0");
        item.setAttribute("role", "checkbox");
        item.setAttribute("aria-checked", challenge.completed ? "true" : "false");
        item.setAttribute("aria-label", challenge.text);
        item.innerHTML = `
            <div class="mini-check-box">
                <i data-lucide="check"></i>
            </div>
            <span class="mini-check-text"></span>
        `;
        const textSpan = safeQuerySelector(item, ".mini-check-text");
        if (textSpan) textSpan.textContent = challenge.text;
        item.addEventListener("click", () => toggleChallenge(challenge.id));
        item.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleChallenge(challenge.id);
            }
        });
        listEl.appendChild(item);
    });
}

/**
 * Builds the prioritized 30-day sustainability milestones list on Dashboard.
 * @returns {void}
 */
function renderRoadmap() {
    const roadmapContainer = document.getElementById("dashboard-roadmap-container");
    if (!roadmapContainer) return;

    if (!appState.hasCalculated) {
        roadmapContainer.innerHTML = `<div class="roadmap-placeholder">Your personalized 30-day roadmap will appear here once you run the footprint calculator.</div>`;
        return;
    }

    // Sort categories to find the highest emission sources
    const items = [
        { name: "Transport", val: appState.calculatedEmissions.transport, action: "Switch 2 commutes/wk to train/bus or walk", detail: "Reduces weekly transport emissions by up to 30%." },
        { name: "Home Energy", val: appState.calculatedEmissions.energy, action: "Switch bulbs to LED & power down idle devices", detail: "Cuts electrical vampire drain by 10% instantly." },
        { name: "Food & Diet", val: appState.calculatedEmissions.food, action: "Introduce 2 meatless (vegan) days weekly", detail: "Mitigates red-meat farming emissions substantially." },
        { name: "Consumption", val: appState.calculatedEmissions.shopping, action: "Avoid high tech/fast fashion shopping sprees", detail: "Curtails upstream industrial manufacture outputs." }
    ];

    // Sort descending by emission val
    items.sort((a, b) => b.val - a.val);

    roadmapContainer.innerHTML = "";
    items.forEach((item, index) => {
        const stage = document.createElement("div");
        stage.className = "roadmap-step";
        stage.innerHTML = `
            <div class="roadmap-num">${index + 1}</div>
            <div class="roadmap-content">
                <h4>Week ${index + 1}: Target ${item.name}</h4>
                <p class="text-emerald" style="font-weight: 500">${item.action}</p>
                <p class="text-xs text-muted">${item.detail}</p>
            </div>
        `;
        roadmapContainer.appendChild(stage);
    });
}

/**
 * Master Render trigger for all active views.
 * @returns {void}
 */
function renderAllViews() {
    renderDashboard();
    renderSidebarCoachInsights();
    renderChallenges();
    renderChatGreeting();
    if (window.lucide) {
        lucide.createIcons();
    }
}

// ==========================================================================
// ===== CHARTS =====
// ==========================================================================

/**
 * Generates and renders the dynamic SVG breakdown donut chart in the Dashboard tab.
 * @returns {void}
 */
function renderPieChart() {
    const pieSvg = document.getElementById("breakdown-pie-chart");
    const legend = document.getElementById("pie-chart-legend");
    if (!pieSvg || !legend) return;

    // Clear contents
    pieSvg.innerHTML = "";
    legend.innerHTML = "";

    // Set accessibility description
    const pieTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
    pieTitle.id = "pie-chart-title";
    pieTitle.textContent = "Carbon Footprint Breakdown";
    pieSvg.appendChild(pieTitle);

    const pieDesc = document.createElementNS("http://www.w3.org/2000/svg", "desc");
    pieDesc.id = "pie-chart-desc";
    if (appState.hasCalculated) {
        pieDesc.textContent = `Donut breakdown chart: Transport ${appState.calculatedEmissions.transport} Tons, Energy ${appState.calculatedEmissions.energy} Tons, Diet ${appState.calculatedEmissions.food} Tons, Shopping ${appState.calculatedEmissions.shopping} Tons.`;
    } else {
        pieDesc.textContent = "A donut chart showing the percentage contribution of transportation, energy, diet, and shopping to your annual carbon footprint.";
    }
    pieSvg.appendChild(pieDesc);

    const categories = [
        { name: "Transport", val: appState.calculatedEmissions.transport, color: "hsl(152, 76%, 54%)" }, // mint
        { name: "Energy & Utilities", val: appState.calculatedEmissions.energy, color: "hsl(200, 85%, 50%)" }, // blue
        { name: "Diet & Food", val: appState.calculatedEmissions.food, color: "hsl(45, 95%, 52%)" }, // gold
        { name: "Shopping", val: appState.calculatedEmissions.shopping, color: "hsl(355, 84%, 63%)" } // coral
    ];

    const total = categories.reduce((sum, cat) => sum + cat.val, 0);

    if (total === 0) {
        pieSvg.innerHTML = `<circle cx="100" cy="100" r="75" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="20" />`;
        legend.innerHTML = `<div class="legend-placeholder">No calculation data available. Fill in the calculator.</div>`;
        return;
    }

    let cumulativePercentage = 0;
    const cx = 100;
    const cy = 100;
    const r = 70;

    categories.forEach(cat => {
        const percent = cat.val / total;
        if (percent === 0) return;

        // Draw pie path segment (using dasharray method for simplicity or exact SVG coordinates)
        const angleStart = cumulativePercentage * 360;
        const angleEnd = (cumulativePercentage + percent) * 360;

        // Convert polar coordinates to Cartesian coordinates
        const radStart = (angleStart - 90) * Math.PI / 180;
        const radEnd = (angleEnd - 90) * Math.PI / 180;

        const x1 = cx + r * Math.cos(radStart);
        const y1 = cy + r * Math.sin(radStart);
        const x2 = cx + r * Math.cos(radEnd);
        const y2 = cy + r * Math.sin(radEnd);

        const largeArc = percent > 0.5 ? 1 : 0;

        const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

        // Inject path element
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", pathData);
        pathEl.setAttribute("fill", cat.color);
        pathEl.setAttribute("stroke", "hsl(var(--bg-surface))");
        pathEl.setAttribute("stroke-width", "3");
        pathEl.style.transition = "transform 0.2s ease";
        pathEl.style.cursor = "pointer";
        
        pathEl.addEventListener("mouseenter", () => {
            pathEl.style.transform = "scale(1.05)";
            pathEl.style.transformOrigin = "center";
            document.getElementById("pie-center-text").innerHTML = `${Math.round(percent * 100)}%<br><span style="font-size:0.6rem;color:hsla(255,255,255,0.6)">${cat.name}</span>`;
        });

        pathEl.addEventListener("mouseleave", () => {
            pathEl.style.transform = "scale(1)";
            document.getElementById("pie-center-text").textContent = "CO₂";
        });

        pieSvg.appendChild(pathEl);

        cumulativePercentage += percent;

        // Add to Legend
        const legItem = document.createElement("div");
        legItem.className = "legend-item";
        legItem.innerHTML = `
            <span class="legend-color" style="background-color: ${cat.color}"></span>
            <span class="legend-label">${cat.name}</span>
            <span class="legend-value">${cat.val.toFixed(1)} T</span>
        `;
        legend.appendChild(legItem);
    });

    // Add center inner circle for donut mask look
    const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    innerCircle.setAttribute("cx", cx);
    innerCircle.setAttribute("cy", cy);
    innerCircle.setAttribute("r", "45");
    innerCircle.setAttribute("fill", "hsl(var(--bg-surface))");
    pieSvg.appendChild(innerCircle);
}

/**
 * Generates and renders the dynamic SVG historical trend line chart on the Dashboard tab.
 * Calculates plot scales, draws gridlines, plots linear coordinates, sets glow filters,
 * binds hover inspectors, and injects chart accessibility tags.
 * @returns {void}
 */
function renderTrendLineChart() {
    const trendSvg = document.getElementById("trend-line-chart");
    const legend = document.getElementById("trend-chart-legend");
    if (!trendSvg || !legend) return;

    // Clear contents
    trendSvg.innerHTML = "";
    legend.innerHTML = "";

    // Set accessibility description
    const trendTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
    trendTitle.id = "trend-chart-title";
    trendTitle.textContent = "Emissions Trend Chart";
    trendSvg.appendChild(trendTitle);

    const trendDesc = document.createElementNS("http://www.w3.org/2000/svg", "desc");
    trendDesc.id = "trend-chart-desc";
    const history = appState.history || [];
    if (history.length > 0) {
        const historyStr = history.map(h => `${h.date}: ${h.footprint} Tons`).join(", ");
        trendDesc.textContent = `A line graph showing your footprint history: ${historyStr}.`;
    } else {
        trendDesc.textContent = "A line graph plotting your carbon footprint history across your recent calculations.";
    }
    trendSvg.appendChild(trendDesc);

    if (history.length === 0) {
        trendSvg.innerHTML = `
            <line x1="30" y1="15" x2="285" y2="15" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
            <line x1="30" y1="65" x2="285" y2="65" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
            <line x1="30" y1="115" x2="285" y2="115" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
            <text x="157" y="70" fill="hsla(var(--text-primary), 0.15)" font-size="8" text-anchor="middle">Awaiting calculations...</text>
        `;
        legend.innerHTML = `<div class="legend-placeholder">No history data available. Complete calculations to log points.</div>`;
        return;
    }

    const w = 300;
    const h = 140;
    const padL = 30;
    const padR = 15;
    const padT = 15;
    const padB = 25;
    
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const footprints = history.map(pt => pt.footprint);
    let maxVal = Math.max(...footprints);
    let minVal = Math.min(...footprints);
    
    // Safety margin to prevent scaling collapse
    if (maxVal === minVal) {
        maxVal += 2.0;
        minVal = Math.max(0, minVal - 2.0);
    } else {
        const margin = (maxVal - minVal) * 0.2;
        maxVal += margin;
        minVal = Math.max(0, minVal - margin);
    }

    // Set SVG definitions (Gradients and Glow filters)
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
        <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="hsl(var(--primary-mint))" stop-opacity="0.3" />
            <stop offset="100%" stop-color="hsl(var(--primary-mint))" stop-opacity="0.0" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
    `;
    trendSvg.appendChild(defs);

    // Draw horizontal grid lines and labels
    drawChartGridLines(trendSvg, maxVal, minVal, padL, padR, padT, plotH, w);

    // Generate point coordinates
    const coords = [];
    const n = history.length;
    
    history.forEach((pt, idx) => {
        const x = n > 1 ? padL + (idx / (n - 1)) * plotW : padL + plotW / 2;
        const y = padT + (1 - (pt.footprint - minVal) / (maxVal - minVal)) * plotH;
        coords.push({ x, y, date: pt.date, footprint: pt.footprint });
    });

    // Draw area path and line path
    drawChartTrendLine(trendSvg, coords, padT, plotH);

    // Draw interactive points, labels, and handle legends
    drawChartPlotPoints(trendSvg, legend, coords, h);
}

/**
 * Draws the horizontal grid lines and Y-axis labels on the trend chart SVG.
 * @param {SVGElement} trendSvg - The trend SVG element.
 * @param {number} maxVal - Maximum Y-value.
 * @param {number} minVal - Minimum Y-value.
 * @param {number} padL - Left padding.
 * @param {number} padR - Right padding.
 * @param {number} padT - Top padding.
 * @param {number} plotH - Plot area height.
 * @param {number} w - Chart width.
 * @returns {void}
 */
function drawChartGridLines(trendSvg, maxVal, minVal, padL, padR, padT, plotH, w) {
    const gridLinesCount = 3;
    for (let i = 0; i < gridLinesCount; i++) {
        const ratio = i / (gridLinesCount - 1);
        const yVal = maxVal - ratio * (maxVal - minVal);
        const yPos = padT + ratio * plotH;

        // Draw dashed grid lines
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", padL);
        line.setAttribute("y1", yPos);
        line.setAttribute("x2", w - padR);
        line.setAttribute("y2", yPos);
        line.setAttribute("stroke", "rgba(255, 255, 255, 0.05)");
        line.setAttribute("stroke-dasharray", "3,3");
        trendSvg.appendChild(line);

        // Draw Y labels
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", padL - 8);
        text.setAttribute("y", yPos + 3);
        text.setAttribute("fill", "hsla(var(--text-primary), 0.4)");
        text.setAttribute("font-size", "7");
        text.setAttribute("text-anchor", "end");
        text.textContent = `${yVal.toFixed(1)}T`;
        trendSvg.appendChild(text);
    }
}

/**
 * Plots and draws the linear path and area gradient on the trend chart SVG.
 * @param {SVGElement} trendSvg - The trend SVG element.
 * @param {Array<Object>} coords - The point coordinates array.
 * @param {number} padT - Top padding.
 * @param {number} plotH - Plot area height.
 * @returns {void}
 */
function drawChartTrendLine(trendSvg, coords, padT, plotH) {
    if (coords.length === 0) return;

    // Draw area path under the trend line
    let areaD = `M ${coords[0].x} ${padT + plotH}`;
    coords.forEach(coord => {
        areaD += ` L ${coord.x} ${coord.y}`;
    });
    areaD += ` L ${coords[coords.length - 1].x} ${padT + plotH} Z`;

    const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    areaPath.setAttribute("d", areaD);
    areaPath.setAttribute("fill", "url(#trend-grad)");
    trendSvg.appendChild(areaPath);

    // Draw main line path
    if (coords.length > 1) {
        let lineD = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 1; i < coords.length; i++) {
            lineD += ` L ${coords[i].x} ${coords[i].y}`;
        }

        const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        linePath.setAttribute("d", lineD);
        linePath.setAttribute("fill", "none");
        linePath.setAttribute("stroke", "hsl(var(--primary-mint))");
        linePath.setAttribute("stroke-width", "2.5");
        linePath.setAttribute("stroke-linecap", "round");
        linePath.setAttribute("filter", "url(#glow)");
        trendSvg.appendChild(linePath);
    }
}

/**
 * Draws the interactive plot points, date labels, and hooks hover inspect tooltips.
 * @param {SVGElement} trendSvg - The trend SVG element.
 * @param {HTMLElement} legend - The legend output container.
 * @param {Array<Object>} coords - The point coordinates array.
 * @param {number} h - Chart height.
 * @returns {void}
 */
function drawChartPlotPoints(trendSvg, legend, coords, h) {
    // Draw X labels (Dates)
    coords.forEach(coord => {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", coord.x);
        text.setAttribute("y", h - 8);
        text.setAttribute("fill", "hsla(var(--text-primary), 0.4)");
        text.setAttribute("font-size", "7");
        text.setAttribute("text-anchor", "middle");
        text.textContent = coord.date;
        trendSvg.appendChild(text);
    });

    // Default legend message
    legend.innerHTML = `<p class="text-muted text-xs text-center">Current Footprint: <span class="text-emerald font-bold">${appState.calculatedEmissions.total} Tons</span>. Hover over plot points to inspect history.</p>`;

    // Draw interactive circles at points
    coords.forEach((coord, idx) => {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", coord.x);
        dot.setAttribute("cy", coord.y);
        dot.setAttribute("r", "4");
        dot.setAttribute("fill", "#ffffff");
        dot.setAttribute("stroke", "hsl(var(--primary-mint))");
        dot.setAttribute("stroke-width", "2");
        dot.style.cursor = "pointer";
        dot.style.transition = "transform 0.1s ease";

        dot.addEventListener("mouseenter", () => {
            dot.setAttribute("r", "6");
            dot.setAttribute("fill", "hsl(var(--primary-mint))");
            dot.setAttribute("stroke", "#ffffff");
            
            const diffText = idx > 0 ? getDiffExplanation(coord.footprint, coords[idx - 1].footprint) : "Initial logged calculation.";
            legend.innerHTML = `<p class="text-center text-xs"><strong class="text-emerald">${coord.date}</strong>: <strong>${coord.footprint.toFixed(2)} Tons CO₂e</strong>. <span class="text-muted">${diffText}</span></p>`;
        });

        dot.addEventListener("mouseleave", () => {
            dot.setAttribute("r", "4");
            dot.setAttribute("fill", "#ffffff");
            dot.setAttribute("stroke", "hsl(var(--primary-mint))");
            legend.innerHTML = `<p class="text-muted text-xs text-center">Current Footprint: <span class="text-emerald font-bold">${appState.calculatedEmissions.total} Tons</span>. Hover over plot points to inspect history.</p>`;
        });

        trendSvg.appendChild(dot);
    });
}

/**
 * Computes difference description sentences between two values.
 * @param {number} curr - Current emissions value.
 * @param {number} prev - Previous emissions value.
 * @returns {string} Explanatory difference string.
 */
function getDiffExplanation(curr, prev) {
    const diff = curr - prev;
    if (diff < 0) {
        return `Reduced footprint by ${Math.abs(diff).toFixed(2)} tons! 🎉`;
    } else if (diff > 0) {
        return `Increased footprint by ${diff.toFixed(2)} tons. ⚠️`;
    } else {
        return `No change since previous calculation.`;
    }
}

// ==========================================================================
// ===== ECOBUDDY CHATBOT =====
// ==========================================================================

/**
 * Handles submission of EcoBuddy chatbot messages.
 * @param {Event} e - Form submission event.
 * @returns {void}
 */
function handleChatSubmit(e) {
    e.preventDefault();
    const inputEl = document.getElementById("chat-user-input");
    const query = inputEl.value.trim();
    if (!query) return;

    // Clear input
    inputEl.value = "";

    // Append User message
    appendChatMessage("user", query);

    // Show chatbot typing indicator
    const typingMsg = showTypingIndicator();

    setTimeout(() => {
        // Remove typing indicator
        typingMsg.remove();
        
        // Generate and append system response
        const answer = getCoachResponse(query);
        appendChatMessage("system", answer);
    }, 800);
}

/**
 * Submits a quick question from predefined suggestion bubbles.
 * @param {string} text - Predefined question text query.
 * @returns {void}
 */
function sendQuickQuestion(text) {
    appendChatMessage("user", text);
    const typingMsg = showTypingIndicator();
    setTimeout(() => {
        typingMsg.remove();
        const answer = getCoachResponse(text);
        appendChatMessage("system", answer);
    }, 600);
}

/**
 * Appends a bubble element into the chatbot feed screen.
 * @param {string} sender - Identifier representing "user" or "system".
 * @param {string} text - Message body content.
 * @returns {void}
 */
function appendChatMessage(sender, text) {
    const screen = document.getElementById("chat-screen-area");
    if (!screen) return;

    const msg = document.createElement("div");
    msg.className = `chat-msg ${sender === 'user' ? 'user-msg' : 'system-msg'}`;
    
    // Sanitize ALL inputs (both user and system messages) to prevent XSS
    const escapedText = escapeHTML(text);
    
    // Parse markdown-like bold syntax (**text**) for styling safely
    let formattedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Parse line breaks safely
    formattedText = formattedText.replace(/\n/g, '<br>');

    msg.innerHTML = `
        <div class="msg-bubble">
            ${formattedText}
        </div>
    `;
    screen.appendChild(msg);
    screen.scrollTop = screen.scrollHeight;

    // Announce system responses to screen readers
    if (sender === "system") {
        const plainText = text.replace(/\*\*/g, "");
        announceToScreenReader(`EcoBuddy says: ${plainText}`);
    }
}

/**
 * Appends and displays a typing dots bubble inside chatbot feed screen.
 * @returns {Element} Typing dots bubble DOM node.
 */
function showTypingIndicator() {
    const screen = document.getElementById("chat-screen-area");
    const msg = document.createElement("div");
    msg.className = "chat-msg system-msg typing-msg";
    msg.innerHTML = `
        <div class="msg-bubble" style="display: flex; gap: 4px; padding: 0.6rem 1rem;">
            <span class="typing-dot" style="animation: dotBounce 1.4s infinite; font-size:1.5rem; line-height: 0.5;">.</span>
            <span class="typing-dot" style="animation: dotBounce 1.4s infinite 0.2s; font-size:1.5rem; line-height: 0.5;">.</span>
            <span class="typing-dot" style="animation: dotBounce 1.4s infinite 0.4s; font-size:1.5rem; line-height: 0.5;">.</span>
        </div>
    `;
    screen.appendChild(msg);
    screen.scrollTop = screen.scrollHeight;
    return msg;
}

/**
 * Evaluates queries against keyword sets locally to generate chatbot coach guidelines.
 * Maps high emissions segments and suggests custom roadmap configurations.
 * @param {string} query - The query entered by the user.
 * @returns {string} The customized coach recommendation.
 */
function getCoachResponse(query) {
    const normalized = query.toLowerCase();

    // Check Contextual Profile queries
    if (normalized.includes("my score") || normalized.includes("my footprint") || normalized.includes("improve score") || normalized.includes("highest")) {
        if (!appState.hasCalculated) {
            return "You haven't run the carbon footprint calculator yet! Please navigate to the **Calculator** tab first to set up your baseline score.";
        }
        
        // Find highest emission category
        const em = appState.calculatedEmissions;
        const categories = [
            { name: "Transport", val: em.transport, advice: "consider switching some commutes to public transit or carpooling, or planning a transition to a hybrid or electric vehicle." },
            { name: "Home Energy", val: em.energy, advice: "look into upgrading to LED bulbs, unplugging idle appliances, and perhaps installing solar panels to capture clean energy." },
            { name: "Diet & Food Habits", val: em.food, advice: "try incorporating more plant-based meals, reducing weekly red meat intake, and sourcing ingredients from local food hubs." },
            { name: "Shopping & Waste", val: em.shopping, advice: "repair electronics and clothing before purchasing new ones, reuse plastic materials, and step up your home recycling game." }
        ];
        categories.sort((a, b) => b.val - a.val);
        const worst = categories[0];
        const pct = Math.round((worst.val / em.total) * 100);

        return `Your current Carbon Footprint is **${em.total} tons CO₂e** per year, giving you a Green Score of **${appState.greenScore}/100**.\n\nYour highest source of emissions is **${worst.name}**, contributing **${worst.val} tons** (approx. **${pct}%** of your total emissions). To make the fastest impact, I suggest you ${worst.advice}`;
    }

    // Check custom roadmap / plan query
    if (normalized.includes("roadmap") || normalized.includes("plan") || normalized.includes("sustainability roadmap") || normalized.includes("reduction plan")) {
        if (!appState.hasCalculated) {
            return "You haven't run the carbon footprint calculator yet! Once you calculate your footprint, I will generate a customized 30-day weekly reduction roadmap for you.";
        }
        const em = appState.calculatedEmissions;
        const roadmapItems = [
            { name: "Transport", val: em.transport, action: "Switch 2 commutes/wk to train/bus or walk", detail: "Reduces weekly transport emissions by up to 30%." },
            { name: "Home Energy", val: em.energy, action: "Switch bulbs to LED & power down idle devices", detail: "Cuts electrical vampire drain by 10% instantly." },
            { name: "Food & Diet", val: em.food, action: "Introduce 2 meatless (vegan) days weekly", detail: "Mitigates red-meat farming emissions substantially." },
            { name: "Consumption", val: em.shopping, action: "Avoid high tech/fast fashion shopping sprees", detail: "Curtails upstream industrial manufacture outputs." }
        ];
        roadmapItems.sort((a, b) => b.val - a.val);
        
        let response = `Based on your highest carbon outputs, here is your personalized **30-Day Carbon Reduction Roadmap**:\n\n`;
        roadmapItems.forEach((item, index) => {
            response += `**Week ${index + 1}: Target ${item.name}** (Current emissions: ${item.val} Tons)\n`;
            response += `* *Action:* ${item.action}\n`;
            response += `* *Expected Benefit:* ${item.detail}\n\n`;
        });
        response += `You can track this roadmap in real-time under the **Roadmap** section of your **Eco Dashboard**!`;
        return response;
    }

    // Standard Keywords checks
    if (normalized.includes("transport") || normalized.includes("car") || normalized.includes("flight") || normalized.includes("travel")) {
        return COACH_AI_RULES.transport[0];
    }
    if (normalized.includes("energy") || normalized.includes("electricity") || normalized.includes("solar") || normalized.includes("water") || normalized.includes("bulb")) {
        return COACH_AI_RULES.energy[0];
    }
    if (normalized.includes("diet") || normalized.includes("food") || normalized.includes("meat") || normalized.includes("vegan") || normalized.includes("vegetarian")) {
        return COACH_AI_RULES.diet[0];
    }
    if (normalized.includes("offset") || normalized.includes("tree") || normalized.includes("planting")) {
        return COACH_AI_RULES.offset[0];
    }
    if (normalized.includes("calculation") || normalized.includes("math") || normalized.includes("factors") || normalized.includes("how work")) {
        return COACH_AI_RULES.calculations[0];
    }
    if (normalized.includes("hello") || normalized.includes("hi ") || normalized.includes("hey")) {
        return COACH_AI_RULES.greetings[Math.floor(Math.random() * COACH_AI_RULES.greetings.length)];
    }

    // Default Fallback sustainability advice
    return "That's an interesting question! Broadly, the best way to tackle climate change is to target the **big three**: reducing high-mileage vehicle transit, lowering home heating and air conditioning power draw, and switching to a diet containing fewer animal products. Ask me specifically about **transport**, **diet**, **home energy**, or **offsets** for detailed advice.";
}

/**
 * Renders the AI coach insights in the sidebar of the Assistant tab.
 * Dynamically computes conservation suggestions based on calculated emission categories.
 * @returns {void}
 */
function renderSidebarCoachInsights() {
    const sidebar = document.getElementById("ai-contextual-tips");
    if (!sidebar) return;

    if (!appState.hasCalculated) {
        sidebar.innerHTML = `<div class="sidebar-placeholder">Calculate your carbon footprint to generate smart coach suggestions!</div>`;
        return;
    }

    sidebar.innerHTML = "";

    // Generate dynamic tips based on user levels
    const em = appState.calculatedEmissions;
    let tips = [];

    if (em.transport > 2.0) {
        tips.push({
            title: "Commute Alternative",
            desc: "Your travel emissions are high. Using public transit once a week could save up to 250 kg of CO₂ per year.",
            icon: "car"
        });
    }
    if (em.energy > 1.5) {
        tips.push({
            title: "Vampire Power Draw",
            desc: "Unplugging chargers and electronics when not in use can lower your energy bill and save 80 kg CO₂ annually.",
            icon: "zap"
        });
    }
    if (em.food > 1.2) {
        tips.push({
            title: "Plant-Based Monday",
            desc: "Replacing beef/pork meals once a week cuts agricultural greenhouse gases. Plant crops require 10x less land.",
            icon: "apple"
        });
    }
    if (em.shopping > 1.0) {
        tips.push({
            title: "Circular Economy",
            desc: "Your consumption score can be improved by buying second-hand apparel and actively recycling plastics/paper.",
            icon: "shopping-bag"
        });
    }

    if (tips.length === 0) {
        tips.push({
            title: "Maintain Success",
            desc: "Your emissions are already super low! Consider supporting active carbon sequestration programs to reach net zero.",
            icon: "award"
        });
    }

    tips.forEach(tip => {
        const div = document.createElement("div");
        div.className = "insight-tip-item";
        div.innerHTML = `
            <i data-lucide="${tip.icon}" class="tip-icon"></i>
            <div class="tip-text">
                <h4>${tip.title}</h4>
                <p>${tip.desc}</p>
            </div>
        `;
        sidebar.appendChild(div);
    });
}

/**
 * Appends EcoBuddy coach welcome greetings depending on baseline calculator states.
 * @returns {void}
 */
function renderChatGreeting() {
    const screen = document.getElementById("chat-screen-area");
    if (!screen) return;
    
    // Clear initial greeting if it's there
    screen.innerHTML = "";
    
    if (appState.hasCalculated) {
        const em = appState.calculatedEmissions;
        const score = appState.greenScore;
        const categories = [
            { name: "Transport", val: em.transport },
            { name: "Home Energy", val: em.energy },
            { name: "Diet & Food Habits", val: em.food },
            { name: "Shopping & Waste", val: em.shopping }
        ];
        categories.sort((a, b) => b.val - a.val);
        const worst = categories[0];
        
        appendChatMessage("system", `Hi there! I am **EcoBuddy**, your AI Sustainability Coach. I've analyzed your footprint data:
        
Your total annual emissions are **${em.total} Tons CO₂e**, and your Green Score is **${score}/100** (${getScoreCategoryName(score)}).
Your highest emission category is **${worst.name}** at **${worst.val} Tons**.
        
Ask me below for a custom reduction plan or advice on how to lower your footprint!`);
    } else {
        appendChatMessage("system", `Hi there! I am **EcoBuddy**, your AI Sustainability Coach.
        
I am ready to help you analyze and reduce your carbon footprint! Once you complete the **Calculator** tab, I will give you context-specific advice. In the meantime, feel free to ask me general sustainability questions!`);
    }
}

// ==========================================================================
// ===== CHALLENGES & BADGES =====
// ==========================================================================

/**
 * Populates active eco-challenges checklist and unlocked badge cards grid.
 * @returns {void}
 */
function renderChallenges() {
    const listEl = document.getElementById("challenges-checkbox-list");
    const gridEl = document.getElementById("achievements-badges-grid");
    if (!listEl || !gridEl) return;

    // Render active challenges
    listEl.innerHTML = "";
    appState.challenges.forEach(challenge => {
        const row = document.createElement("div");
        row.className = `challenge-row ${challenge.completed ? 'completed' : ''}`;
        row.setAttribute("tabindex", "0");
        row.setAttribute("role", "checkbox");
        row.setAttribute("aria-checked", challenge.completed ? "true" : "false");
        row.setAttribute("aria-label", `${challenge.text}, reward ${challenge.points} points`);
        row.innerHTML = `
            <div class="challenge-checkbox">
                <i data-lucide="check"></i>
            </div>
            <div class="challenge-details">
                <h4 class="challenge-title"></h4>
                <p>Gain points for reducing daily climate impact.</p>
            </div>
            <div class="challenge-reward">+${challenge.points} PTS</div>
        `;
        const titleH4 = safeQuerySelector(row, ".challenge-title");
        if (titleH4) titleH4.textContent = challenge.text;
        row.addEventListener("click", () => toggleChallenge(challenge.id));
        row.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleChallenge(challenge.id);
            }
        });
        listEl.appendChild(row);
    });

    // Render achievements badges
    gridEl.innerHTML = "";
    BADGES.forEach(badge => {
        const isUnlocked = appState.unlockedBadges.includes(badge.id);
        const card = document.createElement("div");
        card.className = `badge-card ${isUnlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
            <div class="badge-icon-box ${badge.color === 'gold' ? 'gold' : ''}">
                <i data-lucide="${badge.icon}"></i>
            </div>
            <h4>${badge.name}</h4>
            <p>${badge.desc}</p>
        `;
        gridEl.appendChild(card);
    });
}

/**
 * Completes or un-completes a specific gamified daily eco-challenge.
 * @param {string} id - The challenge ID to toggle.
 * @returns {void}
 */
function toggleChallenge(id) {
    const challenge = appState.challenges.find(c => c.id === id);
    if (!challenge) return;

    challenge.completed = !challenge.completed;
    
    if (challenge.completed) {
        appState.greenPoints += challenge.points;
        showSystemNotification("Challenge Completed!", `You gained +${challenge.points} Green Points.`);
        
        // Commuter pro badge trigger
        if (id === 'public-transit') {
            unlockBadge('commute-pro');
        }
    } else {
        appState.greenPoints = Math.max(0, appState.greenPoints - challenge.points);
    }

    // Check challenge counts for Green Explorer badge
    const completedCount = appState.challenges.filter(c => c.completed).length;
    if (completedCount >= 2) {
        unlockBadge('green-explorer');
    }
    if (completedCount === appState.challenges.length) {
        unlockBadge('climate-champion');
    }

    saveStateToLocalStorage();
    renderAllViews();
}

/**
 * Unlocks a badge in the user achievements, triggering a modal notification.
 * @param {string} badgeId - The badge ID to unlock.
 * @returns {void}
 */
function unlockBadge(badgeId) {
    if (appState.unlockedBadges.includes(badgeId)) return;

    // Track active element to recover keyboard focus upon closing
    lastActiveElement = document.activeElement;

    appState.unlockedBadges.push(badgeId);
    saveStateToLocalStorage();

    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return;

    announceToScreenReader(`New Achievement Badge Unlocked: ${badge.name}. ${badge.desc}`);

    // Trigger alert popup modal
    const modal = document.getElementById("badge-alert-modal");
    const title = document.getElementById("alert-title");
    const message = document.getElementById("alert-message");
    const slot = document.getElementById("alert-badge-slot");

    if (modal) {
        title.textContent = "Badge Unlocked!";
        message.textContent = `Excellent work! You earned the "${badge.name}" achievement.`;
        slot.innerHTML = `
            <div class="badge-card unlocked" style="border:none; background:none; box-shadow:none; opacity:1; filter:none;">
                <div class="badge-icon-box ${badge.color === 'gold' ? 'gold' : ''}" style="width:80px; height:80px;">
                    <i data-lucide="${badge.icon}" style="width:40px; height:40px;"></i>
                </div>
                <h4 style="font-size:1.1rem; margin-top:0.5rem;">${badge.name}</h4>
                <p style="font-size:0.8rem;">${badge.desc}</p>
            </div>
        `;
        modal.classList.remove("hidden");
        lucide.createIcons();
    }
}

/**
 * Closes the unlocked badge modal alert popup and restores keyboard focus.
 * @returns {void}
 */
function closeBadgeAlert() {
    const modal = document.getElementById("badge-alert-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
    // Restore focus to the element that triggered the modal for accessibility
    if (lastActiveElement && typeof lastActiveElement.focus === "function") {
        lastActiveElement.focus();
    }
}

// ==========================================================================
// ===== SYSTEM NOTIFICATIONS =====
// ==========================================================================

/**
 * Renders and displays a floating Toast system notification.
 * Safe DOM rendering values are assigned using textContent to mitigate XSS risks.
 * @param {string} title - The notification header text.
 * @param {string} message - The detail description message text.
 * @returns {void}
 */
function showSystemNotification(title, message) {
    announceToScreenReader(`Notification: ${title}. ${message}`);

    // Check if notification box already exists
    let toast = document.querySelector(".toast-notification");
    if (toast) toast.remove();

    toast = document.createElement("div");
    toast.className = "toast-notification glass-card";
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 1rem 1.5rem;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        border-color: rgba(52, 211, 153, 0.3);
        background-color: hsla(var(--bg-surface), 0.9);
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        animation: toastIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    `;

    toast.innerHTML = `
        <i data-lucide="bell" style="color:hsl(var(--primary-mint)); flex-shrink:0;"></i>
        <div>
            <h4 id="toast-title" style="font-size:0.9rem; font-weight:600; color:#fff;"></h4>
            <p id="toast-message" style="font-size:0.75rem; color:hsl(var(--text-muted));"></p>
        </div>
    `;

    // Assign values safely using textContent to prevent DOM XSS
    const tEl = safeQuerySelector(toast, "#toast-title");
    const mEl = safeQuerySelector(toast, "#toast-message");
    if (tEl) tEl.textContent = title;
    if (mEl) mEl.textContent = message;

    document.body.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.animation = "toastOut 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==========================================================================
// ===== DEMO AUTOPLAY =====
// ==========================================================================

/**
 * Triggers and executes the self-guided walkthrough tour of the application.
 * Mocks user slider inputs, submits calculations, runs scenario simulations,
 * posts queries to EcoBuddy, completes a challenge, and triggers progress reloads.
 * @returns {Promise<void>}
 */
async function startAutoplayDemo() {
    // Show a floating visual indicator on the screen that autoplay is running
    const demoOverlay = document.createElement("div");
    demoOverlay.style.position = "fixed";
    demoOverlay.style.bottom = "20px";
    demoOverlay.style.right = "20px";
    demoOverlay.style.backgroundColor = "hsl(var(--primary-emerald))";
    demoOverlay.style.color = "#ffffff";
    demoOverlay.style.padding = "10px 20px";
    demoOverlay.style.borderRadius = "30px";
    demoOverlay.style.boxShadow = "var(--shadow-glow)";
    demoOverlay.style.zIndex = "3000";
    demoOverlay.style.fontWeight = "bold";
    demoOverlay.style.fontFamily = "var(--font-sans)";
    demoOverlay.style.display = "flex";
    demoOverlay.style.alignItems = "center";
    demoOverlay.style.gap = "8px";
    demoOverlay.innerHTML = `<span class="typing-dot" style="animation: dotBounce 1.4s infinite; font-size: 1.5rem; line-height: 0.5;">.</span> Autoplay Demo Running...`;
    document.body.appendChild(demoOverlay);

    const updateStatus = (text) => {
        demoOverlay.innerHTML = `<span class="typing-dot" style="animation: dotBounce 1.4s infinite; font-size: 1.5rem; line-height: 0.5;">.</span> ${text}`;
    };

    // Step 1: Open app, show empty dashboard state (reset local storage first to clear any old states)
    localStorage.removeItem("carbontrack_ai_state");
    appState = {
        hasCalculated: false,
        calculatedEmissions: { transport: 0, energy: 0, food: 0, shopping: 0, total: 0 },
        greenScore: 0,
        dailyStreak: 1,
        lastLoginDate: new Date().toDateString(),
        greenPoints: 0,
        challenges: [
            { id: "water-bottle", text: "Carry a reusable water bottle today", points: 15, completed: false },
            { id: "no-plastic", text: "Avoid all single-use plastic packaging", points: 20, completed: false },
            { id: "public-transit", text: "Use public transport, bike, or walk", points: 30, completed: false },
            { id: "unplug-devices", text: "Unplug idle electronics and turn off lights", points: 20, completed: false },
            { id: "vegan-meal", text: "Eat a plant-based (vegan) meal today", points: 25, completed: false }
        ],
        unlockedBadges: [],
        scenarioSim: { evShare: 0, dietShift: 0, cleanEnergy: 0, wasteReduction: 0 },
        chatHistory: []
    };
    saveStateToLocalStorage();
    renderAllViews();
    switchTab("dashboard");

    await sleep(1500);

    // Step 2: Go to Calculator
    updateStatus("Navigating to Calculator...");
    switchTab("calculator");
    goToStep(1);

    await sleep(1500);

    // Step 3: Populate Transportation inputs
    updateStatus("Setting transportation inputs...");
    document.getElementById("input-car-km").value = 250;
    document.getElementById("input-car-km").dispatchEvent(new Event("input"));
    document.getElementById("input-car-type").value = "diesel";
    document.getElementById("input-public-km").value = 80;
    document.getElementById("input-public-km").dispatchEvent(new Event("input"));
    document.getElementById("input-flights").value = 1;
    document.getElementById("input-flights").dispatchEvent(new Event("input"));

    await sleep(1500);

    // Next to step 2
    goToStep(2);

    await sleep(1500);

    // Populate energy/utilities inputs
    updateStatus("Setting energy and utility inputs...");
    document.getElementById("input-electricity").value = 350;
    document.getElementById("input-electricity").dispatchEvent(new Event("input"));
    document.getElementById("input-solar").value = "partial";
    document.getElementById("input-water").value = 150;
    document.getElementById("input-water").dispatchEvent(new Event("input"));

    await sleep(1500);

    // Next to step 3
    goToStep(3);

    await sleep(1500);

    // Populate Food/diet inputs
    updateStatus("Setting dietary choices...");
    document.getElementById("input-diet").value = "mixed";
    document.getElementById("input-local-food").value = "sometimes";
    document.getElementById("input-food-waste").value = "minimal";

    await sleep(1500);

    // Next to step 4
    goToStep(4);

    await sleep(1500);

    // Populate Shopping inputs
    updateStatus("Setting shopping & consumption habits...");
    document.getElementById("input-shopping").value = "average";
    document.getElementById("input-recycling").value = "regularly";
    const trashInput = document.getElementById("input-trash");
    if (trashInput) trashInput.value = "average";

    await sleep(1500);

    // Click submit
    updateStatus("Calculating Carbon Footprint...");
    calculateCarbonFootprint();

    await sleep(2000);

    // Step 4: View Dashboard stats
    updateStatus("Dashboard updated with Green Score & SVG charts!");

    await sleep(2000);

    // Step 5: Switch to Scenario Explorer
    updateStatus("Navigating to Scenario Explorer...");
    switchTab("scenario");

    await sleep(1500);

    // Slowly slide Clean Energy to 100%
    updateStatus("Simulating shift to 100% solar energy...");
    const cleanEnergySlider = document.getElementById("slider-scenario-clean-energy");
    if (cleanEnergySlider) {
        for (let val = 10; val <= 100; val += 10) {
            await sleep(150);
            cleanEnergySlider.value = val;
            const label = document.getElementById("scenario-val-clean-energy");
            if (label) {
                label.textContent = val === 50 ? "50% Solar" : val === 100 ? "100% Solar" : `${val}% Solar`;
            }
            runScenarioSimulation();
        }
    }

    await sleep(2000);

    // Step 6: Go to AI Assistant
    updateStatus("Navigating to AI Assistant Coach...");
    switchTab("assistant");

    await sleep(1500);

    // Type query: "How to improve my score?"
    updateStatus("Consulting EcoBuddy Coach...");
    const userInput = document.getElementById("chat-user-input");
    const text = "How to improve my score?";
    if (userInput) {
        userInput.value = "";
        for (let i = 0; i < text.length; i++) {
            await sleep(100);
            userInput.value += text[i];
        }
    }

    await sleep(1000);

    // Click send
    if (userInput) {
        userInput.value = "";
    }
    sendQuickQuestion(text);

    await sleep(3000);

    // Step 7: Go to Eco Challenges
    updateStatus("Navigating to Eco Challenges...");
    switchTab("challenges");

    await sleep(2000);

    // Check off first challenge
    updateStatus("Completing carry-a-water-bottle challenge!");
    toggleChallenge("water-bottle");

    await sleep(2500);

    // Complete autoplay!
    updateStatus("Autoplay finished! Reloading page in 3s...");
    demoOverlay.style.backgroundColor = "hsl(var(--primary-mint))";
    demoOverlay.style.color = "hsl(var(--text-dark))";
    demoOverlay.innerHTML = "🏆 Demo Complete! Reloading...";

    await sleep(3000);
    window.location.href = window.location.pathname;
}
