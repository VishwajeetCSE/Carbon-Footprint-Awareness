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
