// Loads the bundled wordlist asset. One "word tier" pair per line.
import { parseWordlist } from "./enumerate.js";

export async function loadWords(url = "assets/words.txt") {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`failed to load word list: ${response.status}`);
  }
  return parseWordlist(await response.text());
}
