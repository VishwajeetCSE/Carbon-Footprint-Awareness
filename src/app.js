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

// ==========================================================================
// ===== CHALLENGES & BADGES =====
// ==========================================================================

/**
 * Renders the daily eco-challenges list and achievements badges grid on the Challenges tab.
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
// ===== TOAST NOTIFICATIONS =====
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

// Initialize application on DOMContentLoaded
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
                { id: "water-bottle", text: "Carry a reusable water bottle today", points: 15, completed: true },
                { id: "no-plastic", text: "Avoid all single-use plastic packaging", points: 20, completed: false },
                { id: "public-transit", text: "Use public transport, bike, or walk", points: 30, completed: false },
                { id: "unplug-devices", text: "Unplug idle electronics and turn off lights", points: 20, completed: true },
                { id: "vegan-meal", text: "Eat a plant-based (vegan) meal today", points: 25, completed: false }
            ],
            unlockedBadges: ["eco-beginner", "energy-saver"],
            scenarioSim: { evShare: 40, dietShift: 50, cleanEnergy: 100, wasteReduction: 20 },
            chatHistory: [
                { sender: "user", text: "How do I improve my score?" },
                { sender: "system", text: "Your current Carbon Footprint is **7.2 tons CO₂e** per year, giving you a Green Score of **45/100**.\n\nYour highest source of emissions is **Diet & Food Habits**, contributing **2.7 tons** (approx. **38%** of your total emissions). To make the fastest impact, I suggest you try incorporating more plant-based meals, reducing weekly red meat intake, and sourcing ingredients from local food hubs." }
            ]
        };
        // Add calculation history for the trend line chart
        appState.calculationHistory = [
            { date: "06/05/2026", footprint: 9.8 },
            { date: "06/06/2026", footprint: 8.9 },
            { date: "06/07/2026", footprint: 8.0 },
            { date: "06/08/2026", footprint: 7.2 }
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
            startAutoplayDemo().catch(console.error);
        }, 1000);
    }
});

