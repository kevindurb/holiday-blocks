// Inventory editor: 16 block cards, one <select> per face, summary stats,
// export/import, duplicate detection.

import {
  FACE_COUNT,
  SYMBOLS,
  SYMBOL_GLYPHS,
  SYMBOL_NAMES,
  countFilled,
  createEmptyInventory,
  findDuplicateBlocks,
  letterFrequency,
} from "../model.js";
import { parseImport, serializeInventory, exportFilename } from "../transfer.js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function initInventoryView(ctx) {
  const form = document.getElementById("inventory-form");
  const summary = document.getElementById("inventory-summary");
  const importInput = document.getElementById("import-input");
  const importError = document.getElementById("import-error");
  const exportButton = document.getElementById("export-button");
  const clearButton = document.getElementById("clear-button");

  function faceOptions(selected) {
    const options = ['<option value="">—</option>'];
    options.push('<optgroup label="Letters">');
    for (const ch of LETTERS) {
      const sel = selected?.kind === "letter" && selected.ch === ch ? " selected" : "";
      options.push(`<option value="L:${ch}"${sel}>${ch}</option>`);
    }
    options.push('</optgroup><optgroup label="Symbols">');
    for (const symbol of SYMBOLS) {
      const sel = selected?.kind === "symbol" && selected.symbol === symbol ? " selected" : "";
      options.push(
        `<option value="S:${symbol}"${sel}>${SYMBOL_GLYPHS[symbol]} ${SYMBOL_NAMES[symbol]}</option>`,
      );
    }
    options.push("</optgroup>");
    return options.join("");
  }

  function faceFromValue(value) {
    if (!value) return null;
    const [kind, rest] = [value[0], value.slice(2)];
    if (kind === "L") return { kind: "letter", ch: rest };
    return { kind: "symbol", symbol: rest };
  }

  function renderSummary(inventory) {
    const filled = countFilled(inventory);
    const duplicates = findDuplicateBlocks(inventory);
    const freq = [...letterFrequency(inventory).entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    const freqText = freq.length ? freq.map(([ch, n]) => `${ch}×${n}`).join(" ") : "none yet";
    summary.innerHTML = `
      <span><strong>${filled}/${FACE_COUNT}</strong> faces recorded</span>
      ${filled < FACE_COUNT ? '<span class="warn">partial inventory</span>' : "<span>complete ✓</span>"}
      ${duplicates.length ? `<span class="warn">duplicate blocks: ${duplicates.map((g) => g.join(" & ")).join("; ")}</span>` : ""}
      <span class="freq">letters: ${freqText}</span>
    `;
    for (const card of form.querySelectorAll(".block-card")) {
      const n = Number(card.dataset.block);
      card.classList.toggle(
        "duplicate",
        duplicates.some((group) => group.includes(n)),
      );
    }
  }

  function render(inventory) {
    form.innerHTML = `<div class="blocks-grid">${inventory.blocks
      .map(
        (block) => `
        <fieldset class="block-card" data-block="${block.n}">
          <h3>Block ${block.n}</h3>
          <div class="faces">
            ${block.faces
              .map(
                (face, i) => `<select class="face-select${face ? "" : " empty"}"
                  data-block="${block.n}" data-face="${i}"
                  aria-label="Block ${block.n} face ${i + 1}">${faceOptions(face)}</select>`,
              )
              .join("")}
          </div>
        </fieldset>`,
      )
      .join("")}</div>`;
    renderSummary(inventory);
  }

  form.addEventListener("change", (event) => {
    const select = event.target.closest("select[data-block]");
    if (!select) return;
    const inventory = ctx.getInventory();
    const block = inventory.blocks.find((b) => b.n === Number(select.dataset.block));
    block.faces[Number(select.dataset.face)] = faceFromValue(select.value);
    ctx.setInventory(inventory);
  });

  exportButton.addEventListener("click", () => {
    const blob = new Blob([serializeInventory(ctx.getInventory())], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename();
    a.click();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener("change", async () => {
    importError.hidden = true;
    const file = importInput.files?.[0];
    if (!file) return;
    const result = parseImport(await file.text());
    if (!result.ok) {
      importError.textContent = `Import failed: ${result.errors.join("; ")}`;
      importError.hidden = false;
      importInput.value = "";
      return;
    }
    if (!window.confirm("Replace the current inventory with the imported one?")) {
      importInput.value = "";
      return;
    }
    ctx.setInventory(result.inventory);
    render(result.inventory);
    importInput.value = "";
  });

  clearButton.addEventListener("click", () => {
    if (!window.confirm("Clear every recorded face? This cannot be undone.")) return;
    const empty = createEmptyInventory();
    ctx.setInventory(empty);
    render(empty);
  });

  // Summary-only refresh on any inventory change; full rebuilds happen on
  // import/clear, where the grid itself must be replaced.
  ctx.onChange(() => renderSummary(ctx.getInventory()));

  render(ctx.getInventory());
}
