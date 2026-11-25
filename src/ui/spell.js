// "Spell it" view: enter a phrase (letters, punctuation, symbol glyphs) and
// get every way to lay it out with the recorded blocks.

import { SYMBOLS, SYMBOL_GLYPHS, countFilled, FACE_COUNT, glyphFor } from "../model.js";
import { solve, tokenize, unmatchedTokens, MAX_TOKENS } from "../solver.js";

const MAX_SOLUTIONS_SHOWN = 30;

export function initSpellView(ctx) {
  const input = document.getElementById("spell-input");
  const goButton = document.getElementById("spell-go");
  const errorBox = document.getElementById("spell-error");
  const results = document.getElementById("spell-results");
  const picker = document.getElementById("symbol-picker");
  const partialWarning = document.getElementById("spell-partial-warning");

  for (const symbol of SYMBOLS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = SYMBOL_GLYPHS[symbol];
    button.title = `Insert ${symbol}`;
    button.setAttribute("aria-label", `Insert ${symbol}`);
    button.addEventListener("click", () => {
      input.value += SYMBOL_GLYPHS[symbol];
      input.focus();
    });
    picker.appendChild(button);
  }

  ctx.onChange((inventory) => {
    partialWarning.hidden = countFilled(inventory) >= FACE_COUNT;
  });

  function renderSolutions(solutions) {
    const shown = solutions.slice(0, MAX_SOLUTIONS_SHOWN);
    const suffix =
      solutions.length > shown.length
        ? `<p class="hint">Showing first ${shown.length} of ${solutions.length} arrangements.</p>`
        : "";
    results.innerHTML = `
      <p class="hint"><strong>${solutions.length}</strong> arrangement${solutions.length === 1 ? "" : "s"} found.</p>
      ${shown
        .map(
          (solution, index) => `
        <div class="solution">
          <span class="solution-index">Arrangement ${index + 1}</span>
          <div class="chips">
            ${solution
              .map(
                (placement) => `
              <span class="chip" title="Block ${placement.block}, face ${placement.faceIndex + 1}">
                <span class="glyph">${glyphFor(placement.face)}</span>
                <span class="block-no">#${placement.block}</span>
              </span>`,
              )
              .join("")}
          </div>
        </div>`,
        )
        .join("")}
      ${suffix}`;
  }

  function solveNow() {
    errorBox.hidden = true;
    results.innerHTML = "";
    const inventory = ctx.getInventory();
    const { tokens, tooLong } = tokenize(input.value);
    if (tokens.length === 0) {
      errorBox.textContent = "Type a phrase first — letters, words, or symbols.";
      errorBox.hidden = false;
      return;
    }
    if (tooLong) {
      errorBox.textContent = `That phrase needs more than ${MAX_TOKENS} blocks — shorten it.`;
      errorBox.hidden = false;
      return;
    }
    const started = performance.now();
    const { solutions, truncated } = solve(inventory, tokens);
    const elapsed = Math.round(performance.now() - started);
    if (solutions.length === 0) {
      const missing = unmatchedTokens(tokens, inventory);
      const missingText = missing.length
        ? ` Missing: ${missing.map((t) => (t.type === "word" ? t.value : `symbol ${t.value}`)).join(", ")}.`
        : "";
      errorBox.textContent = `The blocks can't spell this.${missingText}`;
      errorBox.hidden = false;
      return;
    }
    renderSolutions(solutions);
    if (truncated) {
      results.insertAdjacentHTML(
        "beforeend",
        `<p class="hint">Stopped at ${solutions.length} arrangements — there are more.</p>`,
      );
    }
    results.insertAdjacentHTML(
      "beforeend",
      `<p class="hint">Solved in ${elapsed} ms. Same block positions may be interchangeable between identical faces.</p>`,
    );
  }

  goButton.addEventListener("click", solveNow);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") solveNow();
  });
}
