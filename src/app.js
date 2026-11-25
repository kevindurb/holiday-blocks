import { createAppContext } from "./ui/context.js";
import { initInventoryView } from "./ui/inventory.js";
import { initSpellView } from "./ui/spell.js";
import { initExploreView } from "./ui/explore.js";

const ctx = createAppContext();
initInventoryView(ctx);
initSpellView(ctx);
initExploreView(ctx);

const tabs = [...document.querySelectorAll("[data-view]")];
for (const tab of tabs) {
  tab.addEventListener("click", () => {
    for (const other of tabs) {
      const selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      document.getElementById(other.dataset.view).hidden = !selected;
    }
  });
}
