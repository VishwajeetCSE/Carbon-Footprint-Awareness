/**
 * Calculates annual transportation carbon emissions in metric tons of CO2e.
 * @param {number} carKm - Weekly car travel distance in km.
 * @param {string} carType - Type of car (petrol, diesel, hybrid, electric).
 * @param {number} publicKm - Weekly public transit distance in km.
 * @param {number} flights - Number of flights per year.
 * @returns {Object} Extracted transport emissions breakdown.
 */
function calculateTransportEmissions(carKm, carType, publicKm, flights) {
    const annualCarKm = carKm * WEEKS_PER_YEAR;
    const carFactor = EMISSION_FACTORS.transport[`car_${carType}`];
    const carEmissions = (annualCarKm * carFactor) / KG_TO_TON_FACTOR;

    const annualPublicKm = publicKm * WEEKS_PER_YEAR;
    const publicFactor = EMISSION_FACTORS.transport.public_transit;
    const publicEmissions = (annualPublicKm * publicFactor) / KG_TO_TON_FACTOR;

    const flightEmissions = (flights * EMISSION_FACTORS.transport.flight) / KG_TO_TON_FACTOR;
    return {
        car: carEmissions,
        public: publicEmissions,
        flights: flightEmissions,
        total: carEmissions + publicEmissions + flightEmissions
    };
}

/**
 * Calculates annual home energy carbon emissions in metric tons of CO2e.
 * @param {number} electricityKwh - Monthly grid electricity usage in kWh.
 * @param {string} solarType - Solar usage type (no, partial, yes).
 * @param {number} waterLiters - Daily water consumption in Liters.
 * @returns {number} Total home energy emissions in metric tons.
 */
function calculateEnergyEmissions(electricityKwh, solarType, waterLiters) {
    const annualElectricity = electricityKwh * MONTHS_PER_YEAR;
    const solarFactor = EMISSION_FACTORS.energy.solar_multipliers[solarType];
    const electricityEmissions = (annualElectricity * EMISSION_FACTORS.energy.electricity_kwh * solarFactor) / KG_TO_TON_FACTOR;

    const annualWater = waterLiters * DAYS_PER_YEAR;
    const waterEmissions = (annualWater * EMISSION_FACTORS.energy.water_liter) / KG_TO_TON_FACTOR;
    return electricityEmissions + waterEmissions;
}

/**
 * Calculates annual dietary carbon emissions in metric tons of CO2e.
 * @param {string} dietType - Baseline diet pattern (meat-heavy, mixed, vegetarian, vegan).
 * @param {string} localFood - Sourcing frequency of local food (no, sometimes, mostly).
 * @param {string} foodWaste - Level of household food waste (low, average, high).
 * @returns {number} Total food emissions in metric tons.
 */
function calculateFoodEmissions(dietType, localFood, foodWaste) {
    const dietBaseline = EMISSION_FACTORS.diet[dietType];
    const localDiscount = EMISSION_FACTORS.diet.local_discount[localFood];
    const wasteMultiplier = EMISSION_FACTORS.diet.waste_multiplier[foodWaste];
    return dietBaseline * localDiscount * wasteMultiplier;
}

/**
 * Calculates annual shopping and consumption carbon emissions in metric tons of CO2e.
 * @param {string} shoppingType - Overall shopping volume (high, average, eco).
 * @param {string} recycleLevel - Recycling level (all, some, none).
 * @returns {number} Total shopping emissions in metric tons.
 */
function calculateShoppingEmissions(shoppingType, recycleLevel) {
    const shoppingBaseline = EMISSION_FACTORS.shopping[shoppingType];
    const recycleModifier = EMISSION_FACTORS.shopping.recycle_modifier[recycleLevel];
    return shoppingBaseline * recycleModifier;
}

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

    // 2. Compute emissions via decomposed helpers
    const transportBreakdown = calculateTransportEmissions(carKm, carType, publicKm, flights);
    const totalTransport = transportBreakdown.total;
    const totalEnergy = calculateEnergyEmissions(electricityKwh, solarType, waterLiters);
    const totalFood = calculateFoodEmissions(dietType, localFood, foodWaste);
    const totalShopping = calculateShoppingEmissions(shoppingType, recycleLevel);

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
