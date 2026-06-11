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
 * Formulates a customized response detailing the user's highest emissions category and advice.
 * @returns {string} Contextual profile sustainability suggestions.
 */
function getCoachProfileResponse() {
    if (!appState.hasCalculated) {
        return "You haven't run the carbon footprint calculator yet! Please navigate to the **Calculator** tab first to set up your baseline score.";
    }

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

/**
 * Builds a personalized 30-day weekly carbon footprint reduction plan.
 * @returns {string} Custom 30-day roadmap schedule.
 */
function getCoachRoadmapResponse() {
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

/**
 * Evaluates queries against keyword sets locally to generate chatbot coach guidelines.
 * Maps high emissions segments and suggests custom roadmap configurations.
 * @param {string} query - The query entered by the user.
 * @returns {string} The customized coach recommendation.
 */
function getCoachResponse(query) {
    const normalized = query.toLowerCase();

    // Declarative key-to-action rules registry
    const rules = [
        { keys: ["my score", "my footprint", "improve score", "highest"], action: getCoachProfileResponse },
        { keys: ["roadmap", "plan", "sustainability roadmap", "reduction plan"], action: getCoachRoadmapResponse },
        { keys: ["transport", "car", "flight", "travel"], response: COACH_AI_RULES.transport[0] },
        { keys: ["energy", "electricity", "solar", "water", "bulb"], response: COACH_AI_RULES.energy[0] },
        { keys: ["diet", "food", "meat", "vegan", "vegetarian"], response: COACH_AI_RULES.diet[0] },
        { keys: ["offset", "tree", "planting"], response: COACH_AI_RULES.offset[0] },
        { keys: ["calculation", "math", "factors", "how work"], response: COACH_AI_RULES.calculations[0] }
    ];

    for (const rule of rules) {
        if (rule.keys.some(k => normalized.includes(k))) {
            return rule.action ? rule.action() : rule.response;
        }
    }

    if (normalized.includes("hello") || normalized.includes("hi ") || normalized.includes("hey")) {
        const greetings = COACH_AI_RULES.greetings;
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    return "That's an interesting question! Broadly, the best way to tackle climate change is to target the **big three**: reducing high-mileage vehicle transit, lowering home heating and air conditioning power draw, and switching to a diet containing fewer animal products. Ask me specifically about **transport**, **diet**, **home energy**, or **offsets** for detailed advice.";
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
