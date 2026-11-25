// "Explore" view: enumerate every spellable word and phrase in a Web Worker
// and present them ranked, filterable, with per-phrase block assignments.

import { countFilled, FACE_COUNT, glyphFor } from "../model.js";
import { solve } from "../solver.js";

const WORDLIST_URL = "assets/words.txt";
let wordsTextPromise = null;

function loadWordlist() {
  if (!wordsTextPromise) {
    wordsTextPromise = fetch(WORDLIST_URL).then((res) => {
      if (!res.ok) throw new Error(`word list failed to load (${res.status})`);
      return res.text();
    });
  }
  return wordsTextPromise;
}

function solutionChips(solution) {
  return solution
    .map(
      (placement) => `
      <span class="chip" title="Block ${placement.block}, face ${placement.faceIndex + 1}">
        <span class="glyph">${glyphFor(placement.face)}</span>
        <span class="block-no">#${placement.block}</span>
      </span>`,
    )
    .join("");
}

export function initExploreView(ctx) {
  const runButton = document.getElementById("explore-run");
  const cancelButton = document.getElementById("explore-cancel");
  const status = document.getElementById("explore-status");
  const resultsEl = document.getElementById("explore-results");
  const filtersEl = document.getElementById("explore-filters");
  const partialWarning = document.getElementById("explore-partial-warning");

  let worker = null;
  let entries = [];
  let filter = "all";

  ctx.onChange((inventory) => {
    partialWarning.hidden = countFilled(inventory) >= FACE_COUNT;
  });

  function setBusy(busy) {
    runButton.disabled = busy;
    cancelButton.disabled = !busy;
  }

  function matchesFilter(entry) {
    if (filter === "phrases") return entry.tokens.length >= 2;
    if (filter === "words") return entry.tokens.length === 1;
    return true;
  }

  function render() {
    const shown = entries.filter(matchesFilter);
    if (shown.length === 0) {
      resultsEl.innerHTML = entries.length
        ? '<p class="hint">Nothing matches this filter.</p>'
        : "";
      return;
    }
    resultsEl.innerHTML = shown
      .map((entry, index) => {
        const count = entry.assignments >= 1000 ? "999+" : String(entry.assignments);
        return `
        <div class="result-row" role="button" tabindex="0" aria-expanded="false" data-index="${index}">
          <span class="result-phrase">${entry.text}</span>
          <span class="result-meta">${count} arrangement${entry.assignments === 1 ? "" : "s"}</span>
        </div>
        <div class="result-detail" hidden></div>`;
      })
      .join("");

    for (const row of resultsEl.querySelectorAll(".result-row")) {
      const detail = row.nextElementSibling;
      const toggle = () => {
        const entry = entries.filter(matchesFilter)[Number(row.dataset.index)];
        const expanded = row.getAttribute("aria-expanded") === "true";
        if (expanded) {
          detail.hidden = true;
          row.setAttribute("aria-expanded", "false");
          return;
        }
        if (!detail.dataset.rendered) {
          const { solutions } = solve(ctx.getInventory(), entry.tokens, { limit: 20 });
          detail.innerHTML =
            solutions
              .map((solution) => `<div class="chips">${solutionChips(solution)}</div>`)
              .join("") +
            (entry.assignments > solutions.length
              ? `<p class="hint">and ${entry.assignments - solutions.length} more…</p>`
              : "");
          detail.dataset.rendered = "true";
        }
        detail.hidden = false;
        row.setAttribute("aria-expanded", "true");
      };
      row.addEventListener("click", toggle);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });
    }
  }

  for (const chip of filtersEl.querySelectorAll("[data-filter]")) {
    chip.addEventListener("click", () => {
      filter = chip.dataset.filter;
      for (const other of filtersEl.querySelectorAll("[data-filter]")) {
        other.classList.toggle("chip-active", other === chip);
      }
      render();
    });
  }

  runButton.addEventListener("click", async () => {
    setBusy(true);
    entries = [];
    resultsEl.innerHTML = "";
    filtersEl.hidden = true;
    status.textContent = "Loading word list…";
    let wordsText;
    try {
      wordsText = await loadWordlist();
    } catch (error) {
      status.textContent = String(error.message ?? error);
      setBusy(false);
      return;
    }
    status.textContent = "Searching…";
    worker?.terminate();
    worker = new Worker("src/worker.js", { type: "module" });
    worker.onmessage = (event) => {
      const message = event.data;
      if (message.type === "progress") {
        status.textContent = `Searching… ${message.nodes.toLocaleString()} states explored`;
      } else if (message.type === "done") {
        entries = message.results;
        if (message.truncated) {
          status.textContent = `Done — showing the best ${entries.length} (search hit its limit or was cancelled).`;
        } else {
          status.textContent = `Done — ${entries.length} results.`;
        }
        filtersEl.hidden = entries.length === 0;
        render();
        setBusy(false);
        worker.terminate();
        worker = null;
      } else if (message.type === "error") {
        status.textContent = `Search failed: ${message.message}`;
        setBusy(false);
        worker?.terminate();
        worker = null;
      }
    };
    worker.onerror = (event) => {
      status.textContent = `Search failed: ${event.message}`;
      setBusy(false);
      worker?.terminate();
      worker = null;
    };
    worker.postMessage({
      type: "start",
      inventory: ctx.getInventory(),
      wordsText,
      maxPhrases: 150,
    });
  });

  cancelButton.addEventListener("click", () => {
    if (worker) worker.postMessage({ type: "cancel" });
    cancelButton.disabled = true;
    status.textContent = "Stopping…";
  });
}
