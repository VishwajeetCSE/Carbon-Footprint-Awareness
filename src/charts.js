/**
 * Resolves emission values into category definitions with color tokens.
 * @param {Object} emissions - Calculated emissions from appState.
 * @returns {Array<Object>} Category array with HSL color and footprint values.
 */
function getPieChartCategories(emissions) {
    return [
        { name: "Transport", val: emissions.transport, color: "hsl(152, 76%, 54%)" }, // mint
        { name: "Energy & Utilities", val: emissions.energy, color: "hsl(200, 85%, 50%)" }, // blue
        { name: "Diet & Food", val: emissions.food, color: "hsl(45, 95%, 52%)" }, // gold
        { name: "Shopping", val: emissions.shopping, color: "hsl(355, 84%, 63%)" } // coral
    ];
}

/**
 * Iterates through categories, appends SVG paths, and renders legends.
 * @param {SVGElement} pieSvg - Target Pie SVG node.
 * @param {HTMLElement} legend - Legend container element.
 * @param {Array<Object>} categories - Category array list.
 * @param {number} total - Sum of all categories footprint.
 * @returns {void}
 */
/**
 * Computes polar-to-cartesian trigonometry and formats the SVG path data for a donut wedge.
 * @param {number} cx - Center X coordinate.
 * @param {number} cy - Center Y coordinate.
 * @param {number} r - Segment radius.
 * @param {number} cumulativePercentage - Accrued angle offset fraction.
 * @param {number} percent - Current segment percentage value.
 * @returns {string} SVG path string.
 */
function buildPieSegmentPath(cx, cy, r, cumulativePercentage, percent) {
    const angleStart = cumulativePercentage * 360;
    const angleEnd = (cumulativePercentage + percent) * 360;

    const radStart = (angleStart - 90) * Math.PI / 180;
    const radEnd = (angleEnd - 90) * Math.PI / 180;

    const x1 = cx + r * Math.cos(radStart);
    const y1 = cy + r * Math.sin(radStart);
    const x2 = cx + r * Math.cos(radEnd);
    const y2 = cy + r * Math.sin(radEnd);

    const largeArc = percent > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/**
 * Iterates through categories, appends SVG paths, and renders legends.
 * @param {SVGElement} pieSvg - Target Pie SVG node.
 * @param {HTMLElement} legend - Legend container element.
 * @param {Array<Object>} categories - Category array list.
 * @param {number} total - Sum of all categories footprint.
 * @returns {void}
 */
function drawPieSegments(pieSvg, legend, categories, total) {
    let cumulativePercentage = 0;
    const cx = 100;
    const cy = 100;
    const r = 70;

    categories.forEach(cat => {
        const percent = cat.val / total;
        if (percent === 0) return;

        const pathData = buildPieSegmentPath(cx, cy, r, cumulativePercentage, percent);

        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", pathData);
        pathEl.setAttribute("fill", cat.color);
        pathEl.setAttribute("stroke", "hsl(var(--bg-surface))");
        pathEl.setAttribute("stroke-width", "3");
        pathEl.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
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
}

/**
 * Generates and renders the dynamic SVG breakdown donut chart in the Dashboard tab.
 * @returns {void}
 */
function renderPieChart() {
    const pieSvg = document.getElementById("breakdown-pie-chart");
    const legend = document.getElementById("pie-chart-legend");
    if (!pieSvg || !legend) return;

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

    const categories = getPieChartCategories(appState.calculatedEmissions);
    const total = categories.reduce((sum, cat) => sum + cat.val, 0);

    if (total === 0) {
        pieSvg.innerHTML = `<circle cx="100" cy="100" r="75" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="20" />`;
        legend.innerHTML = `<div class="legend-placeholder">No calculation data available. Fill in the calculator.</div>`;
        return;
    }

    drawPieSegments(pieSvg, legend, categories, total);

    // Add center inner circle for donut mask look
    const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    innerCircle.setAttribute("cx", "100");
    innerCircle.setAttribute("cy", "100");
    innerCircle.setAttribute("r", "45");
    innerCircle.setAttribute("fill", "hsl(var(--bg-surface))");
    pieSvg.appendChild(innerCircle);
}

/**
 * Injects screen-reader titles and summaries for dynamic chart updates.
 * @param {SVGElement} trendSvg - Target trend SVG canvas.
 * @param {HTMLElement} legend - Legend DOM container.
 * @param {Array<Object>} history - Carbon records history array.
 * @returns {void}
 */
function setChartAccessibilityTags(trendSvg, legend, history) {
    const trendTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
    trendTitle.id = "trend-chart-title";
    trendTitle.textContent = "Emissions Trend Chart";
    trendSvg.appendChild(trendTitle);

    const trendDesc = document.createElementNS("http://www.w3.org/2000/svg", "desc");
    trendDesc.id = "trend-chart-desc";
    if (history.length > 0) {
        const historyStr = history.map(h => `${h.date}: ${h.footprint} Tons`).join(", ");
        trendDesc.textContent = `A line graph showing your footprint history: ${historyStr}.`;
    } else {
        trendDesc.textContent = "A line graph plotting your carbon footprint history across your recent calculations.";
    }
    trendSvg.appendChild(trendDesc);
}

/**
 * Draws coordinate grids and placeholders when history log is empty.
 * @param {SVGElement} trendSvg - Target trend SVG canvas.
 * @param {HTMLElement} legend - Legend DOM container.
 * @returns {void}
 */
function renderEmptyTrendPlaceholder(trendSvg, legend) {
    trendSvg.innerHTML = `
        <line x1="30" y1="15" x2="285" y2="15" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
        <line x1="30" y1="65" x2="285" y2="65" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
        <line x1="30" y1="115" x2="285" y2="115" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
        <text x="157" y="70" fill="hsla(var(--text-primary), 0.15)" font-size="8" text-anchor="middle">Awaiting calculations...</text>
    `;
    legend.innerHTML = `<div class="legend-placeholder">No history data available. Complete calculations to log points.</div>`;
}

/**
 * Calculates Y-axis minimum and maximum boundaries based on footprint history.
 * @param {Array<number>} footprints - Footprints dataset array.
 * @returns {Object} Boundaries object containing minVal and maxVal.
 */
function calculateTrendScale(footprints) {
    let maxVal = Math.max(...footprints);
    let minVal = Math.min(...footprints);

    if (maxVal === minVal) {
        maxVal += 2.0;
        minVal = Math.max(0, minVal - 2.0);
    } else {
        const margin = (maxVal - minVal) * 0.2;
        maxVal += margin;
        minVal = Math.max(0, minVal - margin);
    }
    return { maxVal, minVal };
}

/**
 * Injects linear gradients and filters into SVG defs for chart glow styles.
 * @param {SVGElement} trendSvg - Target trend SVG canvas.
 * @returns {void}
 */
function drawTrendGlowFilters(trendSvg) {
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

    trendSvg.innerHTML = "";
    legend.innerHTML = "";

    const history = appState.history || [];
    setChartAccessibilityTags(trendSvg, legend, history);

    if (history.length === 0) {
        renderEmptyTrendPlaceholder(trendSvg, legend);
        return;
    }

    const w = 300, h = 140, padL = 30, padR = 15, padT = 15, padB = 25;
    const plotW = w - padL - padR, plotH = h - padT - padB;

    const { maxVal, minVal } = calculateTrendScale(history.map(pt => pt.footprint));

    drawTrendGlowFilters(trendSvg);
    drawChartGridLines(trendSvg, maxVal, minVal, padL, padR, padT, plotH, w);

    const coords = [];
    const n = history.length;
    history.forEach((pt, idx) => {
        const x = n > 1 ? padL + (idx / (n - 1)) * plotW : padL + plotW / 2;
        const y = padT + (1 - (pt.footprint - minVal) / (maxVal - minVal)) * plotH;
        coords.push({ x, y, date: pt.date, footprint: pt.footprint });
    });

    drawChartTrendLine(trendSvg, coords, padT, plotH);
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
