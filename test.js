const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- ROBUST DOM MOCKS ---
let domContentLoadedListener = null;
const eventListeners = {};

// Helper to create a mock DOM element
function createMockElement(tagName = 'div', id = '') {
    const el = {
        tagName: tagName.toUpperCase(),
        id: id,
        classList: {
            classes: new Set(),
            add: function(...args) { args.forEach(c => this.classes.add(c)); },
            remove: function(...args) { args.forEach(c => this.classes.delete(c)); },
            toggle: function(c) {
                if (this.classes.has(c)) { this.classes.delete(c); return false; }
                else { this.classes.add(c); return true; }
            },
            contains: function(c) { return this.classes.has(c); }
        },
        style: {},
        children: [],
        appendChild: function(child) {
            this.children.push(child);
            return child;
        },
        setAttribute: function(name, value) {
            this[name] = value;
        },
        getAttribute: function(name) {
            return this[name] || '';
        },
        addEventListener: function(event, callback) {
            if (!eventListeners[event]) eventListeners[event] = [];
            eventListeners[event].push(callback);
        },
        remove: function() {
            // No-op or detach
        },
        cloneNode: function() {
            return createMockElement(tagName, id);
        },
        focus: function() {},
        click: function() {
            if (eventListeners['click']) {
                eventListeners['click'].forEach(cb => cb({ preventDefault: () => {} }));
            }
        },
        value: '50',
        textContent: '',
        innerHTML: '',
        className: ''
    };

    return new Proxy(el, {
        get(target, prop) {
            if (prop in target) return target[prop];
            // Safe fallbacks for common properties
            if (prop === 'parentNode') return createMockElement('div');
            if (prop === 'firstChild') return target.children[0] || null;
            if (prop === 'lastChild') return target.children[target.children.length - 1] || null;
            if (prop === 'nextSibling') return null;
            if (prop === 'cssText') return '';
            // If it's a function, return dummy function
            if (typeof prop === 'string' && prop.startsWith('on')) return null;
            return undefined;
        }
    });
}

// Document Mock
const mockDocument = {
    addEventListener: (event, callback) => {
        if (event === "DOMContentLoaded") {
            domContentLoadedListener = callback;
        }
    },
    getElementById: (id) => {
        const inputVals = {
            "input-car-km": "200",
            "input-car-type": "hybrid",
            "input-public-km": "50",
            "input-flights": "2",
            "input-electricity": "300",
            "input-solar": "partial",
            "input-water": "100",
            "input-diet": "vegetarian",
            "input-local-food": "sometimes",
            "input-food-waste": "average",
            "input-shopping": "average",
            "input-recycling": "some"
        };
        const el = createMockElement('div', id);
        if (id in inputVals) {
            el.value = inputVals[id];
        }
        return el;
    },
    querySelector: (selector) => {
        if (selector === ".toast-notification") return null;
        return createMockElement('div');
    },
    querySelectorAll: (selector) => {
        if (selector === ".nav-item") {
            const el1 = createMockElement('a');
            el1.setAttribute('data-tab', 'calculator');
            const el2 = createMockElement('a');
            el2.setAttribute('data-tab', 'dashboard');
            return [el1, el2];
        }
        if (selector === ".tab-panel" || selector === ".step-panel" || selector === ".step-indicator") {
            return [createMockElement('div')];
        }
        return [];
    },
    createElement: (tag) => createMockElement(tag),
    createElementNS: (ns, tag) => createMockElement(tag),
    head: {
        appendChild: () => {}
    },
    body: createMockElement('body')
};

// Window Mock
const mockWindow = {
    location: {
        search: "?demo=true",
        href: "",
        pathname: ""
    },
    URLSearchParams: function(search) {
        return {
            get: (param) => {
                if (param === "demo") return "true";
                return null;
            }
        };
    },
    addEventListener: () => {},
    lucide: {
        createIcons: () => {}
    }
};

// LocalStorage Mock
const storageStore = {};
const mockLocalStorage = {
    getItem: (key) => storageStore[key] || null,
    setItem: (key, value) => { storageStore[key] = String(value); },
    removeItem: (key) => { delete storageStore[key]; },
    clear: () => { for (const k in storageStore) delete storageStore[k]; }
};

const mockLucide = {
    createIcons: () => {}
};

// Create a vm Context
const context = vm.createContext({
    console: console,
    document: mockDocument,
    window: mockWindow,
    localStorage: mockLocalStorage,
    lucide: mockLucide,
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    Date: Date,
    URLSearchParams: mockWindow.URLSearchParams,
    Math: Math,
    Number: Number,
    parseFloat: parseFloat,
    parseInt: parseInt,
    Event: function() {}
});

// Load app.js code
const appJsPath = path.join(__dirname, 'app.js');
let appJsCode = fs.readFileSync(appJsPath, 'utf8');
appJsCode += "\n\nglobalThis.getAppState = () => appState; globalThis.EMISSION_FACTORS = EMISSION_FACTORS;";
vm.runInContext(appJsCode, context);

// Trigger DOMContentLoaded initialization
if (domContentLoadedListener) {
    domContentLoadedListener();
}

// Access functions inside the context
const calculateCarbonFootprint = context.calculateCarbonFootprint;
const getCoachResponse = context.getCoachResponse;
const switchTab = context.switchTab;
const unlockBadge = context.unlockBadge;
const saveStateToLocalStorage = context.saveStateToLocalStorage;
const loadStateFromLocalStorage = context.loadStateFromLocalStorage;

// Assertion helper
let testCount = 0;
let passCount = 0;

function assert(condition, message) {
    testCount++;
    if (condition) {
        passCount++;
        console.log(`✅ PASS: ${message}`);
    } else {
        console.error(`❌ FAIL: ${message}`);
    }
}

console.log("=== Starting CarbonTrack AI Unit Tests ===");

// 1. Carbon Calculator
assert(typeof calculateCarbonFootprint === 'function', "calculateCarbonFootprint should be a function");
calculateCarbonFootprint();
const appState = context.getAppState();
assert(appState.calculatedEmissions.total > 0, "Calculated emissions should be positive");
assert(appState.greenScore >= 0 && appState.greenScore <= 100, "Green Score should be within bounds");

// 2. Dashboard
assert(appState.hasCalculated === true, "Dashboard should be unlocked after calculation");
assert(appState.greenPoints >= 0, "Green points should be tracking");

// 3. Trend Graph
assert(Array.isArray(appState.calculationHistory), "Calculation history should be an array");
assert(appState.calculationHistory.length > 0, "Calculation history should contain demo entries");

// 4. Scenario Explorer
assert(appState.scenarioSim !== undefined, "Scenario simulation parameters should be defined");
assert(appState.scenarioSim.cleanEnergy === 100, "Clean energy default in simulation should be 100%");

// 5. EcoBuddy chatbot
const botReply = getCoachResponse("How can I reduce food emissions?");
assert(botReply.toLowerCase().includes("food") || botReply.toLowerCase().includes("meat") || botReply.toLowerCase().includes("plant-based"), "EcoBuddy should respond contextually about diet");

// 6. LocalStorage persistence
appState.greenPoints = 999;
saveStateToLocalStorage();
assert(mockLocalStorage.getItem("carbontrack_ai_state") !== null, "Localstorage should store application state");
appState.greenPoints = 0;
loadStateFromLocalStorage();
assert(context.getAppState().greenPoints === 999, "State should be restored correctly from localstorage");

// 7. Badge system
unlockBadge('climate-champion');
assert(context.getAppState().unlockedBadges.includes('climate-champion'), "climate-champion badge should be unlocked");

// 8. Accessibility navigation
assert(typeof switchTab === 'function', "switchTab should exist");
switchTab("calculator");

console.log(`\n=== Test Summary: ${passCount}/${testCount} passed ===`);
if (passCount !== testCount) {
    process.exit(1);
} else {
    process.exit(0);
}
