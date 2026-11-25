// Web Worker: runs the enumerator off the main thread.
// Messages in:  { type: "start", inventory, wordsText, maxPhrases? }
//               { type: "cancel" }
// Messages out: { type: "progress", nodes, found }
//               { type: "done", results, nodes, truncated }
//               { type: "error", message }

import { buildWordTable, enumerate, parseWordlist, withAssignmentCounts } from "./enumerate.js";

self.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === "cancel") {
    self.__cancelled = true;
    return;
  }
  if (msg.type !== "start") return;
  self.__cancelled = false;
  try {
    const words = parseWordlist(msg.wordsText);
    const wordTable = buildWordTable(words);
    const { results, nodes, truncated } = enumerate({
      inventory: msg.inventory,
      wordTable,
      maxPhrases: msg.maxPhrases ?? 200,
      shouldCancel: () => Boolean(self.__cancelled),
      onProgress: (progress) => self.postMessage({ type: "progress", ...progress }),
    });
    const withCounts = withAssignmentCounts(msg.inventory, results);
    self.postMessage({ type: "done", results: withCounts, nodes, truncated });
  } catch (error) {
    self.postMessage({ type: "error", message: String(error?.message ?? error) });
  }
};
