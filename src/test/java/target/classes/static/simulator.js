const stackArea       = document.getElementById("stackArea");
const heapArea        = document.getElementById("heapArea");
const classLoaderArea = document.getElementById("classLoaderArea");
const staticPoolArea  = document.getElementById("staticPoolArea");
const poppedArea      = document.getElementById("poppedArea");
const arrowLayer      = document.getElementById("arrowLayer");

let steps     = [];
let heapMap   = {};
let stepIndex = 0;
let heapCount = 0;
let isRunning = false;
let autoRunTimer = null;

/* ================== MAIN ================== */

async function prepareExecution() {

    stackArea.innerHTML        = "";
    heapArea.innerHTML         = "";
    classLoaderArea.innerHTML  = "";
    staticPoolArea.innerHTML   = "";
    poppedArea.innerHTML       = '<div class="popped-empty">No frames popped yet</div>';
    arrowLayer.innerHTML       = `<defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#1565c0"/>
        </marker></defs>`;

    document.getElementById("consoleArea").innerHTML  = "";
    document.getElementById("runtimeError").innerText = "";
    document.getElementById("compileError").innerText = "";
    document.getElementById("codeDisplay").innerHTML  = "";
    document.getElementById("codeDisplay").classList.remove("visible");

    steps     = [];
    stepIndex = 0;
    heapCount = 0;
    heapMap   = {};

    const code      = document.getElementById("codeEditor").value;
    const codeLines = code.split("\n");

    // Render code display
    const display = document.getElementById("codeDisplay");
    display.classList.add("visible");
    codeLines.forEach((line, index) => {
        const div     = document.createElement("div");
        div.className = "code-line";
        div.id        = "line-" + index;
        div.innerText = (index + 1) + "  " + line;
        display.appendChild(div);
    });

    // Call backend with text/plain
    try {
        const response = await fetch("/run", {
            method:  "POST",
            headers: { "Content-Type": "text/plain" },
            body:    code
        });

        if (!response.ok) {
            document.getElementById("compileError").innerText =
                "Server error: " + response.status;
            return;
        }

        const backendSteps = await response.json();
        console.log("Backend returned", backendSteps.length, "steps:", backendSteps);

        buildSteps(backendSteps, codeLines);
        autoRun();

    } catch (err) {
        document.getElementById("compileError").innerText =
            "Could not reach server: " + err.message;
    }
}

/* ================== BUILD STEPS ================== */

// Add these new cases to your existing buildSteps function in simulator.js

function buildSteps(backendSteps, codeLines) {

    const lineMap = codeLines.map(l => l.trim());

    backendSteps.forEach((s) => {
        const type  = s.type;
        const value = s.value;
        const extra = s.extra;

        const li = findLineIndex(lineMap, type, value, extra);

        switch (type) {

            case "classload":
                steps.push(async () => {
                    highlightLine(li);
                    addClassLoader(value);
                    await delay(400);
                });
                break;

            // ── NEW: static_main (main method in static pool) ──────────
            case "static_main":
                steps.push(async () => {
                    highlightLine(li);
                    addStaticMain(value);
                    await delay(600);
                });
                break;

            // ── NEW: static_method (other static methods in static pool) ──────────
            case "static_method":
                steps.push(async () => {
                    highlightLine(li);
                    addStaticMethodEntry(value);
                    await delay(400);
                });
                break;

            // ── NEW: static_var (static variables in static pool) ──────────
            case "static_var":
                steps.push(async () => {
                    highlightLine(li);
                    addStaticVariableEntry(value);
                    await delay(400);
                });
                break;

            // ── NEW: static_method_call (static method being called) ──────────
            case "static_method_call":
                steps.push(async () => {
                    highlightLine(li);
                    showStaticCallLabel(value);
                    await delay(500);
                });
                break;

            case "stack_push":
                steps.push(async () => {
                    highlightLine(li);
                    if (value === "main()") {
                        showJvmCallLabel();
                        await delay(500);
                    }
                    addStack(value);
                    await delay(400);
                });
                break;

            case "stack_pop":
                steps.push(async () => {
                    highlightLine(li);
                    removeStack();
                    await delay(400);
                });
                break;

            case "primitive":
                steps.push(async () => {
                    highlightLine(li);
                    addStack(value);
                    await delay(400);
                });
                break;

            case "heap_alloc":
                steps.push(async () => {
                    highlightLine(li);
                    const obj = addHeap(extra || value, value);
                    await delay(80);
                    drawArrow(value, obj);
                    await delay(450);
                });
                break;

            case "heap_gc":
                steps.push(async () => {
                    highlightLine(li);
                    removeReference(value);
                    await delay(500);
                });
                break;

            case "static_var":
                steps.push(async () => {
                    highlightLine(li);
                    addStatic(value);
                    await delay(300);
                });
                break;

            case "console":
                steps.push(async () => {
                    highlightLine(li);
                    const div = document.createElement("div");
                    div.innerText = "> " + value;
                    document.getElementById("consoleArea").appendChild(div);
                    await delay(400);
                });
                break;
        }
    });
}

// NEW helper functions (add these to your existing simulator.js)

function addStaticMethodEntry(methodName) {
    const wrapper = document.createElement("div");
    wrapper.className = "staticItem static-main-item";
    wrapper.innerHTML = `
        <span class="static-badge">static method</span> 
        ${methodName}
    `;
    staticPoolArea.appendChild(wrapper);
}

function addStaticVariableEntry(varInfo) {
    const wrapper = document.createElement("div");
    wrapper.className = "staticItem";
    wrapper.innerHTML = `
        <span class="static-badge">static</span> 
        ${varInfo}
    `;
    staticPoolArea.appendChild(wrapper);
}

function showStaticCallLabel(methodName) {
    const label = document.createElement("div");
    label.className = "jvm-call-label";
    label.style.background = "rgba(251,191,36,.15)";
    label.style.borderColor = "#f59e0b";
    label.style.color = "#f59e0b";
    label.innerText = `📌 Static method call: ${methodName} → moving to stack`;
    document.querySelector(".step-display").insertAdjacentElement("afterend", label);
    setTimeout(() => label.remove(), 1500);
}

/* ================== LINE INDEX MATCHING ================== */

function findLineIndex(lineMap, type, value, extra) {

    for (let i = 0; i < lineMap.length; i++) {
        const line = lineMap[i];

        switch (type) {

            case "classload":
                if (line.startsWith("public class") || line.startsWith("class ")) return i;
                break;

            // static_main and stack_push("main()") both point to the main() line
            case "static_main":
            case "stack_push":
                if ((value === "main()" || type === "static_main") && line.includes("main(")) return i;
                if (value.endsWith("()") && value !== "main()") {
                    const mn = value.replace("()", "");
                    if (line.includes(mn + "(") && !line.includes("//")) return i;
                }
                if (!value.endsWith("()")) {
                    const vp1 = " " + value + " ";
                    const vp2 = " " + value + "=";
                    if ((line.includes(vp1) || line.includes(vp2))
                        && line.includes("new ") && !line.includes("//")) return i;
                }
                break;

            case "stack_pop":
                if (line === "}") return i;
                break;

            case "primitive": {
                const varName = value.split("=")[0].trim();
                if (line.includes(varName)
                    && line.match(/\b(int|double|float|long|short|byte|char|boolean)\b/)
                    && !line.includes("//")) return i;
                break;
            }

            case "heap_alloc": {
                const objType = extra || value;
                if (line.includes("new " + objType) && !line.includes("//")) return i;
                break;
            }

            case "heap_gc":
                if (line.includes(value) && line.includes("null") && !line.includes("//")) return i;
                break;

            case "static_var": {
                const sn = value.split("=")[0].trim();
                if (line.includes("static") && line.includes(sn) && !line.includes("//")) return i;
                break;
            }

            case "console":
                if ((line.includes("System.out.println") || line.includes("System.out.print"))
                    && !line.includes("//")) return i;
                break;
        }
    }
    return 0;
}

/* ================== EXECUTION CONTROL ================== */

async function autoRun() {
    if (isRunning) return;          // prevent double-start
    isRunning = true;

    async function runNextStep() {
        if (!isRunning || stepIndex >= steps.length) {
            isRunning = false;      // naturally finished or paused
            return;
        }

        await nextStep();           // execute the current step

        const speed = parseInt(document.getElementById("speedControl").value);

        // schedule NEXT step after speed delay
        // storing in autoRunTimer lets pauseRun() cancel it with clearTimeout
        autoRunTimer = setTimeout(runNextStep, speed);
    }

    runNextStep();   // kick off first step
}
function pauseRun() {
    isRunning = false;              // stops delay() from re-ticking

    if (autoRunTimer) {
        clearTimeout(autoRunTimer); // cancels the next scheduled step instantly
        autoRunTimer = null;
    }
}

async function nextStep() {
    if (stepIndex < steps.length) {
        await steps[stepIndex]();
        stepIndex++;
        document.getElementById("stepCounter").innerText = stepIndex;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* ================== UI FUNCTIONS ================== */

function addClassLoader(text) {
    const div     = document.createElement("div");
    div.className = "staticItem";
    div.innerText = text;
    classLoaderArea.appendChild(div);
}

// Regular static variable
function addStatic(text) {
    const div     = document.createElement("div");
    div.className = "staticItem";
    div.innerText = text;
    staticPoolArea.appendChild(div);
}

// main() is special — styled differently with a "static method" badge
function addStaticMain(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "staticItem static-main-item";
    wrapper.innerHTML =
        `<span class="static-badge">static</span> ${text}`;
    staticPoolArea.appendChild(wrapper);
}

// Temporary "JVM invokes →" label that fades out
function showJvmCallLabel() {
    const label = document.createElement("div");
    label.className  = "jvm-call-label";
    label.innerText  = "JVM invokes main() \u2192 Stack";
    document.querySelector(".step-display").insertAdjacentElement("afterend", label);
    setTimeout(() => label.remove(), 1800);
}

function addStack(text) {
    const div     = document.createElement("div");
    div.className = "stack-frame";
    div.innerText = text;
    div.id        = "sf_" + text.replace(/[^a-zA-Z0-9]/g, "_");
    stackArea.appendChild(div);
}

function removeStack() {
    const frames = stackArea.querySelectorAll(".stack-frame");
    if (frames.length === 0) return;

    const last      = frames[frames.length - 1];
    const frameName = last.innerText;

    logPoppedFrame(frameName);

    last.classList.add("pop-animation");
    setTimeout(() => last.remove(), 350);
}

function logPoppedFrame(name) {
    const empty = poppedArea.querySelector(".popped-empty");
    if (empty) empty.remove();

    const entry = document.createElement("div");
    entry.className = "popped-entry";

    const dot = document.createElement("div");
    dot.className = "dot";

    const label = document.createElement("div");
    label.innerHTML = `<span class="popped-label">popped</span><br>${name}`;

    entry.appendChild(dot);
    entry.appendChild(label);
    poppedArea.insertBefore(entry, poppedArea.firstChild);
}

function addHeap(displayName, varName) {
    const obj     = document.createElement("div");
    obj.className = "heap-object";
    obj.innerText = displayName;

    const col      = heapCount % 3;
    const row      = Math.floor(heapCount / 3);
    obj.style.left = (20 + col * 110) + "px";
    obj.style.top  = (10 + row * 110) + "px";
    obj.id         = "heap_" + varName.replace(/[^a-zA-Z0-9]/g, "_");

    heapArea.appendChild(obj);
    heapMap[varName] = obj;
    heapCount++;
    return obj;
}

function removeReference(varName) {
    const obj = heapMap[varName];
    if (obj) {
        obj.style.background = "#e53935";
        obj.style.boxShadow  = "0 3px 10px rgba(229,57,53,.4)";
        obj.innerText        = "GC";
        setTimeout(() => obj.remove(), 900);
        delete heapMap[varName];
    }
}

function drawArrow(varName, heapObj) {
    const stackId = "sf_" + varName.replace(/[^a-zA-Z0-9]/g, "_");
    const stackEl = document.getElementById(stackId);

    if (!stackEl || !heapObj) {
        console.warn("drawArrow: missing element for", varName);
        return;
    }

    const stackRect = stackEl.getBoundingClientRect();
    const heapRect  = heapObj.getBoundingClientRect();
    const svgRect   = arrowLayer.getBoundingClientRect();

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", stackRect.right  - svgRect.left);
    line.setAttribute("y1", stackRect.top    + stackRect.height / 2 - svgRect.top);
    line.setAttribute("x2", heapRect.left    - svgRect.left);
    line.setAttribute("y2", heapRect.top     + heapRect.height  / 2 - svgRect.top);
    line.setAttribute("stroke", "rgba(179,136,255,.7)");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-dasharray", "5 4");
    line.setAttribute("marker-end", "url(#arrow)");
    arrowLayer.appendChild(line);
}

function highlightLine(index) {
    document.querySelectorAll(".code-line").forEach(l => l.classList.remove("active-line"));
    const active = document.getElementById("line-" + index);
    if (active) {
        active.classList.add("active-line");
        active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
}

/* ================== BUTTON HANDLERS ================== */

function pauseRun() { isRunning = false; }

function resetAll() {
    isRunning = false;
    stepIndex = 0;
    steps     = [];
    heapMap   = {};
    heapCount = 0;

    stackArea.innerHTML        = "";
    heapArea.innerHTML         = "";
    classLoaderArea.innerHTML  = "";
    staticPoolArea.innerHTML   = "";
    poppedArea.innerHTML       = '<div class="popped-empty">No frames popped yet</div>';
    arrowLayer.innerHTML       = "";

    document.getElementById("codeDisplay").innerHTML  = "";
    document.getElementById("codeDisplay").classList.remove("visible");
    document.getElementById("consoleArea").innerHTML  = "";
    document.getElementById("stepCounter").innerText  = "0";
    document.getElementById("compileError").innerText = "";
    document.getElementById("runtimeError").innerText = "";

    // Remove any lingering JVM call label
    const lbl = document.querySelector(".jvm-call-label");
    if (lbl) lbl.remove();
}

function goToPage(page) { window.location.href = page; }