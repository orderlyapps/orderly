import { parseTabooDeck, serializeTabooDeck, type TabooDeck } from "./cards.ts";

export const TABOO_DECK_EXTENSION = ".json";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function createTabooDeckFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `taboo-deck-${year}-${month}-${day}_${hours}-${minutes}-${seconds}${TABOO_DECK_EXTENSION}`;
}

/** Serializes the deck and, in a browser, downloads it as a JSON file. Returns the JSON. */
export function downloadTabooDeck(deck: TabooDeck, filename = createTabooDeckFilename()): string {
  const json = serializeTabooDeck(deck);
  if (typeof document !== "undefined" && typeof URL !== "undefined") {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }
  return json;
}

/** Reads and validates a deck file picked via a file input. */
export async function readTabooDeckFile(file: Blob): Promise<TabooDeck> {
  const text = await file.text();
  return parseTabooDeck(text);
}
