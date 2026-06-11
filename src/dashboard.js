/**
 * Updates DOM elements for dashboard metrics, scores, comparison indicators, and gauge fill.
 * @param {HTMLElement} scoreVal - Score display element.
 * @param {HTMLElement} co2Val - CO2 display element.
 * @param {HTMLElement} scoreTitle - Score title label.
 * @param {HTMLElement} scoreDesc - Score description paragraph.
 * @returns {void}
 */
function updateDashboardMetricsDOM(scoreVal, co2Val, scoreTitle, scoreDesc) {
    scoreVal.textContent = appState.greenScore;
    co2Val.textContent = appState.calculatedEmissions.total;

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
}

/**
 * Updates DOM elements for environmental equivalents on dashboard.
 * @param {number} total - Annual carbon footprint total in metric tons.
 * @returns {void}
 */
function updateDashboardEquivalentsDOM(total) {
    document.getElementById("eq-trees").textContent = Math.round(total * 16.5);
    document.getElementById("eq-car-km").textContent = `${Math.round(total * 5880).toLocaleString()} km`;
    document.getElementById("eq-smartphones").textContent = Math.round(total * 121000).toLocaleString();
    document.getElementById("eq-bulbs").textContent = Math.round(total * 35);
}

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

    // Update DOM metrics and comparison values
    updateDashboardMetricsDOM(scoreVal, co2Val, scoreTitle, scoreDesc);

    // Render Environmental Equivalents
    updateDashboardEquivalentsDOM(appState.calculatedEmissions.total);

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
