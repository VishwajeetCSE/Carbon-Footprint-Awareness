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
