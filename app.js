/* ==========================================================================
   CarbonTrack AI Core Application Logic
   ========================================================================== */

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
        wasteRed: 0
    },
    chatHistory: [],
    history: []
};

// Badges Library
const BADGES = [
    { id: 'eco-beginner', name: 'Eco Beginner', desc: 'Calculated footprint for the first time.', icon: 'sprout', color: 'green' },
    { id: 'green-explorer', name: 'Green Explorer', desc: 'Completed 2 daily eco challenges.', icon: 'compass', color: 'green' },
    { id: 'energy-saver', name: 'Energy Saver', desc: 'Reduced simulated home energy footprint by 50% in Scenario Explorer.', icon: 'zap', color: 'gold' },
    { id: 'commute-pro', name: 'Commute Pro', desc: 'Completed the public transit daily challenge.', icon: 'bike', color: 'green' },
    { id: 'climate-champion', name: 'Climate Champion', desc: 'Earned a Green Score of 75+ or completed all challenges.', icon: 'award', color: 'gold' }
];

// --- Initialization & Page Loading ---
document.addEventListener("DOMContentLoaded", () => {
    loadStateFromLocalStorage();
    initializeUIElements();
    updateEcoStreak();
    renderAllViews();
    lucide.createIcons();
});

// Setup UI Tab Navs, Event Listeners, and Range Value Syncs
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
        { sliderId: "slider-scenario-ev", labelId: "scenario-val-ev", suffix: "% EV" },
        { sliderId: "slider-scenario-diet", labelId: "scenario-val-diet", suffix: "% Shift" },
        { sliderId: "slider-scenario-clean-energy", labelId: "scenario-val-clean-energy", customFormat: (v) => v === "0" ? "Current Grid" : v === "50" ? "50% Solar" : "100% Solar" },
        { sliderId: "slider-scenario-waste", labelId: "scenario-val-waste", suffix: "% Reduction" }
    ];

    scenarioInputs.forEach(item => {
        const slider = document.getElementById(item.sliderId);
        if (slider) {
            slider.addEventListener("input", () => {
                const label = document.getElementById(item.labelId);
                if (item.customFormat) {
                    label.textContent = item.customFormat(slider.value);
                } else {
                    label.textContent = slider.value + item.suffix;
                }
                runScenarioSimulation();
            });
        }
    });
}

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

// Tab router
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
        } else {
            item.classList.remove("active");
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

// --- Eco Streak System ---
function updateEcoStreak() {
    const today = new Date().toDateString();
    
    if (!appState.lastLoginDate) {
        appState.dailyStreak = 1;
    } else {
        const lastLogin = new Date(appState.lastLoginDate);
        const diffTime = Math.abs(new Date(today) - lastLogin);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            appState.dailyStreak += 1;
        } else if (diffDays > 1) {
            appState.dailyStreak = 1; // reset streak if missed a day
        }
    }
    appState.lastLoginDate = today;
    saveStateToLocalStorage();
}

// --- Carbon Calculator Logic ---
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
    const annualCarKm = carKm * 52;
    const carFactor = EMISSION_FACTORS.transport[`car_${carType}`];
    const carEmissions = (annualCarKm * carFactor) / 1000; // tons
    
    const annualPublicKm = publicKm * 52;
    const publicFactor = EMISSION_FACTORS.transport.public_transit;
    const publicEmissions = (annualPublicKm * publicFactor) / 1000; // tons
    
    const flightEmissions = (flights * EMISSION_FACTORS.transport.flight) / 1000; // tons
    const totalTransport = carEmissions + publicEmissions + flightEmissions;

    // UTILITIES & ENERGY
    const annualElectricity = electricityKwh * 12;
    const solarFactor = EMISSION_FACTORS.energy.solar_multipliers[solarType];
    const electricityEmissions = (annualElectricity * EMISSION_FACTORS.energy.electricity_kwh * solarFactor) / 1000; // tons
    
    const annualWater = waterLiters * 365;
    const waterEmissions = (annualWater * EMISSION_FACTORS.energy.water_liter) / 1000; // tons
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
    const baselineMax = 12.0;
    const baselineMin = 1.0;
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
        if (appState.history.length > 7) {
            appState.history.shift();
        }
    }

    saveStateToLocalStorage();
    renderAllViews();
    switchTab("dashboard");

    // Pop visual success prompt
    showSystemNotification("Calculation Success!", "Your personal carbon footprint has been calculated.");
}

// --- Dashboard Render & Dynamic SVG Pie Chart ---
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
    const userLevel = Math.floor(appState.greenPoints / 100) + 1;
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
    const diffFromAvg = Math.abs(6.5 - appState.calculatedEmissions.total).toFixed(1);
    const compText = document.getElementById("dashboard-carbon-comparison");
    if (appState.calculatedEmissions.total > 6.5) {
        compText.innerHTML = `<span class="text-coral font-medium">${diffFromAvg} tons higher</span> than national averages (6.5 tons/yr).`;
    } else {
        compText.innerHTML = `<span class="text-emerald font-medium">${diffFromAvg} tons lower</span> than national averages (6.5 tons/yr).`;
    }

    // Sync Reduction Target Progress Bar
    const targetProgressPercentage = Math.min(100, Math.max(0, Math.round(((6.5 - appState.calculatedEmissions.total) / 6.5) * 100)));
    document.getElementById("target-progress-percentage").textContent = appState.calculatedEmissions.total < 6.5 ? `${targetProgressPercentage}% Below Average` : `Above Avg Footprint`;
    document.getElementById("target-progress-fill").style.width = appState.calculatedEmissions.total < 6.5 ? `${targetProgressPercentage}%` : `0%`;

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

function renderPieChart() {
    const pieSvg = document.getElementById("breakdown-pie-chart");
    const legend = document.getElementById("pie-chart-legend");
    if (!pieSvg || !legend) return;

    // Clear contents
    pieSvg.innerHTML = "";
    legend.innerHTML = "";

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

function renderTrendLineChart() {
    const trendSvg = document.getElementById("trend-line-chart");
    const legend = document.getElementById("trend-chart-legend");
    if (!trendSvg || !legend) return;

    // Clear contents
    trendSvg.innerHTML = "";
    legend.innerHTML = "";

    const history = appState.history || [];

    if (history.length === 0) {
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

    // Generate point coordinates
    const coords = [];
    const n = history.length;
    
    history.forEach((pt, idx) => {
        const x = n > 1 ? padL + (idx / (n - 1)) * plotW : padL + plotW / 2;
        const y = padT + (1 - (pt.footprint - minVal) / (maxVal - minVal)) * plotH;
        coords.push({ x, y, date: pt.date, footprint: pt.footprint });
    });

    // Draw area path under the trend line
    if (coords.length > 0) {
        let areaD = `M ${coords[0].x} ${padT + plotH}`;
        coords.forEach(coord => {
            areaD += ` L ${coord.x} ${coord.y}`;
        });
        areaD += ` L ${coords[coords.length - 1].x} ${padT + plotH} Z`;

        const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        areaPath.setAttribute("d", areaD);
        areaPath.setAttribute("fill", "url(#trend-grad)");
        trendSvg.appendChild(areaPath);
    }

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

function renderMiniChecklist() {
    const listEl = document.getElementById("dashboard-mini-checklist");
    if (!listEl) return;

    listEl.innerHTML = "";

    // Show first 3 challenges on dashboard
    appState.challenges.slice(0, 3).forEach(challenge => {
        const item = document.createElement("div");
        item.className = `mini-check-item ${challenge.completed ? 'completed' : ''}`;
        item.innerHTML = `
            <div class="mini-check-box">
                <i data-lucide="check"></i>
            </div>
            <span class="mini-check-text">${challenge.text}</span>
        `;
        item.addEventListener("click", () => toggleChallenge(challenge.id));
        listEl.appendChild(item);
    });
}

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

// --- Scenario Explorer Simulator Logic ---
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

    // Calculate current values
    const currentTotal = appState.calculatedEmissions.total;

    // Simulate adjustments
    // EV shift reduces transport emissions by up to 50% (assuming public transit/flight exists)
    const transportSavings = appState.calculatedEmissions.transport * (evShare / 100) * 0.6; 
    
    // Diet shift reduces food emissions by shifting diet towards vegetarian/vegan
    const foodSavings = appState.calculatedEmissions.food * (dietShift / 100) * 0.45;
    
    // Clean energy reduces utility emissions down to 0 at 100%
    const energySavings = appState.calculatedEmissions.energy * (cleanEnergy / 100);

    // Waste reduction reduces shopping emissions by up to 50%
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

// --- AI Sustainability Coach (Conversational Chat) ---
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

function sendQuickQuestion(text) {
    appendChatMessage("user", text);
    const typingMsg = showTypingIndicator();
    setTimeout(() => {
        typingMsg.remove();
        const answer = getCoachResponse(text);
        appendChatMessage("system", answer);
    }, 600);
}

function appendChatMessage(sender, text) {
    const screen = document.getElementById("chat-screen-area");
    if (!screen) return;

    const msg = document.createElement("div");
    msg.className = `chat-msg ${sender === 'user' ? 'user-msg' : 'system-msg'}`;
    
    // Parse markdown-like bold syntax (**text**) for styling
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Parse line breaks
    formattedText = formattedText.replace(/\n/g, '<br>');

    msg.innerHTML = `
        <div class="msg-bubble">
            ${formattedText}
        </div>
    `;
    screen.appendChild(msg);
    screen.scrollTop = screen.scrollHeight;
}

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

// Inline keyframe helper style for typing dot bounce animation if needed
const style = document.createElement('style');
style.textContent = `
@keyframes dotBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
}
`;
document.head.appendChild(style);

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

// Populate Meta Sidebar Coach suggestions on Assistant Tab
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

// --- Gamified Eco Challenges & Badges System ---
function renderChallenges() {
    const listEl = document.getElementById("challenges-checkbox-list");
    const gridEl = document.getElementById("achievements-badges-grid");
    if (!listEl || !gridEl) return;

    // Render active challenges
    listEl.innerHTML = "";
    appState.challenges.forEach(challenge => {
        const row = document.createElement("div");
        row.className = `challenge-row ${challenge.completed ? 'completed' : ''}`;
        row.innerHTML = `
            <div class="challenge-checkbox">
                <i data-lucide="check"></i>
            </div>
            <div class="challenge-details">
                <h4>${challenge.text}</h4>
                <p>Gain points for reducing daily climate impact.</p>
            </div>
            <div class="challenge-reward">+${challenge.points} PTS</div>
        `;
        row.addEventListener("click", () => toggleChallenge(challenge.id));
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

function unlockBadge(badgeId) {
    if (appState.unlockedBadges.includes(badgeId)) return;

    appState.unlockedBadges.push(badgeId);
    saveStateToLocalStorage();

    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return;

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

function closeBadgeAlert() {
    const modal = document.getElementById("badge-alert-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

// --- Notifications Helper ---
function showSystemNotification(title, message) {
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
            <h4 style="font-size:0.9rem; font-weight:600; color:#fff;">${title}</h4>
            <p style="font-size:0.75rem; color:hsl(var(--text-muted));">${message}</p>
        </div>
    `;

    document.body.appendChild(toast);
    lucide.createIcons();

    // Keyframe for toast entry
    const styleEl = document.createElement('style');
    styleEl.textContent = `
    @keyframes toastIn {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    `;
    document.head.appendChild(styleEl);

    setTimeout(() => {
        toast.style.animation = "toastOut 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Add simple toastOut keyframe if missing
const styleToastOut = document.createElement('style');
styleToastOut.textContent = `
@keyframes toastOut {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(50px); opacity: 0; }
}
`;
document.head.appendChild(styleToastOut);

// --- Local Storage Management ---
function saveStateToLocalStorage() {
    localStorage.setItem("carbontrack_ai_state", JSON.stringify(appState));
}

function loadStateFromLocalStorage() {
    const raw = localStorage.getItem("carbontrack_ai_state");
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            appState = { ...appState, ...parsed };
        } catch (e) {
            console.error("Error loading localStorage state:", e);
        }
    }
}

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
            scenarioSim: { evShare: 0, dietShift: 0, cleanEnergy: 0, wasteRed: 0 },
            chatHistory: []
        };
        saveStateToLocalStorage();
        renderAllViews();
        switchTab("dashboard");
        showSystemNotification("State Reset", "All local carbon log datasets have been cleared.");
    }
}

// Master Render trigger for all active views
function renderAllViews() {
    renderDashboard();
    renderSidebarCoachInsights();
    renderChallenges();
}
