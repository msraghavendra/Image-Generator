/* ═══════════════════════════════════════════════════════════
   AI Image Generator — app.js
   Handles: prompt state, API calls, rendering, download
═══════════════════════════════════════════════════════════ */

const API_BASE = "http://localhost:8001";

// ── State ──────────────────────────────────────────────────────────────────
let lastPrompt   = "";
let lastSettings = { size: "square", style: "realistic", count: 1 };
let isLoading    = false;

// ── DOM helpers ────────────────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k.startsWith("data-")) node.setAttribute(k, v);
    else node[k] = v;
  });
  children.forEach(c => c && node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return node;
};

// ── Pill selector logic ────────────────────────────────────────────────────
document.querySelectorAll(".pill").forEach(pill => {
  pill.addEventListener("click", () => {
    const group = pill.dataset.group;
    document.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    lastSettings[group] = isNaN(pill.dataset.value) ? pill.dataset.value : Number(pill.dataset.value);
    updateShimmerRatio();
  });
});

// ── Char counter ───────────────────────────────────────────────────────────
const promptInput = $("prompt-input");
const charCount   = $("char-count");

promptInput.addEventListener("input", () => {
  charCount.textContent = promptInput.value.length;
});

// ── Shimmer aspect ratio sync ──────────────────────────────────────────────
function updateShimmerRatio() {
  const ratio = lastSettings.size || "square";
  document.querySelectorAll(".shimmer-block").forEach(b => {
    b.dataset.ratio = ratio;
    b.style.aspectRatio =
      ratio === "portrait"  ? "9 / 16" :
      ratio === "landscape" ? "16 / 9" : "1 / 1";
  });
}

// ── Generate ───────────────────────────────────────────────────────────────
async function generateImage() {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    showError("Please enter a prompt before generating.");
    promptInput.focus();
    return;
  }

  if (isLoading) return;

  lastPrompt   = prompt;
  lastSettings = getCurrentSettings();

  clearError();
  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt:    lastPrompt,
        size:      lastSettings.size,
        style:     lastSettings.style,
        count:     lastSettings.count,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error (${response.status})`);
    }

    const data = await response.json();

    if (!data.images || data.images.length === 0) {
      throw new Error("No images were returned. Try a different prompt.");
    }

    renderImages(data.images, data.mime_type || "image/png");

  } catch (err) {
    showError(err.message || "Failed to connect to the backend. Is it running?");
  } finally {
    setLoading(false);
  }
}

// ── Regenerate ─────────────────────────────────────────────────────────────
function regenerate() {
  if (!lastPrompt) {
    showError("No previous prompt to regenerate.");
    return;
  }
  promptInput.value    = lastPrompt;
  charCount.textContent = lastPrompt.length;
  applySettings(lastSettings);
  generateImage();
}

// ── Clear ──────────────────────────────────────────────────────────────────
function clearAll() {
  promptInput.value     = "";
  charCount.textContent = "0";
  lastPrompt            = "";
  clearError();
  hide("results-section");
  hide("loading-section");
  isLoading = false;
  $("btn-generate").disabled = false;
  $("image-grid").innerHTML   = "";
}

// ── Settings helpers ───────────────────────────────────────────────────────
function getCurrentSettings() {
  const active = (group) => document.querySelector(`.pill.active[data-group="${group}"]`);
  const sizeEl  = active("size");
  const styleEl = active("style");
  const countEl = active("count");
  return {
    size:  sizeEl  ? sizeEl.dataset.value  : "square",
    style: styleEl ? styleEl.dataset.value : "realistic",
    count: countEl ? Number(countEl.dataset.value) : 1,
  };
}

function applySettings(settings) {
  Object.entries(settings).forEach(([group, value]) => {
    document.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => {
      p.classList.toggle("active", p.dataset.value === String(value));
    });
  });
}

// ── Render images ──────────────────────────────────────────────────────────
function renderImages(base64Images, mimeType) {
  clearError();
  const grid = $("image-grid");
  grid.innerHTML = "";
  grid.classList.toggle("two-col", base64Images.length > 1);

  base64Images.forEach((b64, index) => {
    const src = `data:${mimeType};base64,${b64}`;

    // Image element
    const img = el("img", {
      src,
      alt:     `AI generated image ${index + 1}`,
      loading: "lazy",
    });

    // Download button
    const dlBtn = el("button", {
      class:   "btn-download",
      title:   "Download image",
      onclick: () => downloadImage(src, index + 1),
    });
    dlBtn.innerHTML = `<span aria-hidden="true">⬇</span> Download`;

    // Card footer
    const footer = el("div", { class: "image-card-footer" }, dlBtn);

    // Card
    const card = el("div", { class: "image-card" }, img, footer);
    card.style.animationDelay = `${index * 0.12}s`;

    grid.appendChild(card);
  });

  show("results-section");
}

// ── Download ───────────────────────────────────────────────────────────────
function downloadImage(src, index) {
  const link    = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  link.href     = src;
  link.download = `ai-image-${index}-${timestamp}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── Loading state ──────────────────────────────────────────────────────────
function setLoading(active) {
  isLoading = active;
  $("btn-generate").disabled = active;
  $("btn-generate").querySelector(".btn-label").textContent =
    active ? "Generating…" : "Generate Image";

  const count = getCurrentSettings().count;
  if (active) {
    updateShimmerRatio();
    // Show/hide second shimmer based on count
    const shimmer2 = $("shimmer-2");
    if (count >= 2) shimmer2.removeAttribute("hidden");
    else shimmer2.setAttribute("hidden", "");

    hide("results-section");
    show("loading-section");

    // Animate loading subtitle
    let dots = 0;
    const messages = [
      "Generating your image…",
      "Crafting pixels with AI…",
      "Applying your style…",
      "Almost there…",
    ];
    let msgIndex = 0;
    window._loadingInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      $("loading-sub").textContent = messages[msgIndex];
    }, 2800);
  } else {
    hide("loading-section");
    clearInterval(window._loadingInterval);
    $("loading-sub").textContent = "This usually takes 10–20 seconds";
  }
}

// ── Error helpers ──────────────────────────────────────────────────────────
function showError(message) {
  const banner = $("error-banner");
  $("error-text").textContent = message;
  banner.removeAttribute("hidden");
  banner.style.display = "flex";
}

function clearError() {
  const banner = $("error-banner");
  banner.setAttribute("hidden", "");
  banner.style.display = "none";
  $("error-text").textContent = "";
}

// ── Visibility helpers ─────────────────────────────────────────────────────
function show(id) { $(id).removeAttribute("hidden"); }
function hide(id) { $(id).setAttribute("hidden", ""); }

// ── Keyboard shortcut: Ctrl/Cmd + Enter to generate ───────────────────────
promptInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    generateImage();
  }
});

// ── Initialize ─────────────────────────────────────────────────────────────
lastSettings = getCurrentSettings();
updateShimmerRatio();
