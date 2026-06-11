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
