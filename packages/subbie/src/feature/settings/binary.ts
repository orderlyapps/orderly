import { getSettingsStore, type SettingsStore } from "./db.ts";
import {
  DEFAULT_SETTINGS_ID,
  isSettingsDocument,
  isThemeMode,
  type SettingsDocument,
} from "./schema.ts";

const BINARY_MAGIC = new Uint8Array([0x53, 0x55, 0x42, 0x42, 0x49, 0x45, 0x01]);

const SETTINGS_BINARY_BASENAME = "settings";
export const SETTINGS_BINARY_EXTENSION = ".sub";
export const SETTINGS_BINARY_FILENAME = `${SETTINGS_BINARY_BASENAME}${SETTINGS_BINARY_EXTENSION}`;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function createSettingsBinaryFilename(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hours = pad2(date.getUTCHours());
  const minutes = pad2(date.getUTCMinutes());
  const seconds = pad2(date.getUTCSeconds());
  return `${SETTINGS_BINARY_BASENAME}-${year}-${month}-${day}_${hours}-${minutes}-${seconds}${SETTINGS_BINARY_EXTENSION}`;
}

export function encodeSettingsBinary(settings: SettingsDocument): Uint8Array<ArrayBuffer> {
  if (!isSettingsDocument(settings)) {
    throw new Error("Invalid settings document");
  }
  const payload = JSON.stringify({
    id: settings.id,
    theme: settings.theme,
  });
  const payloadBytes = new TextEncoder().encode(payload);
  const output = new Uint8Array(BINARY_MAGIC.length + payloadBytes.length);
  output.set(BINARY_MAGIC, 0);
  output.set(payloadBytes, BINARY_MAGIC.length);
  return output;
}

export function decodeSettingsBinary(input: Uint8Array | ArrayBuffer): SettingsDocument {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength <= BINARY_MAGIC.length) {
    throw new Error("Invalid settings binary: file is too short");
  }
  for (let i = 0; i < BINARY_MAGIC.length; i++) {
    if (bytes[i] !== BINARY_MAGIC[i]) {
      throw new Error("Invalid settings binary: unrecognized header");
    }
  }
  const payloadBytes = bytes.subarray(BINARY_MAGIC.length);
  let parsed: unknown;
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(payloadBytes);
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid settings binary: corrupted payload");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid settings binary: expected an object");
  }

  const record = parsed as Record<string, unknown>;
  if (!isThemeMode(record.theme)) {
    throw new Error("Invalid settings binary: invalid theme value");
  }

  return {
    id: typeof record.id === "string" && record.id.length > 0 ? record.id : DEFAULT_SETTINGS_ID,
    theme: record.theme,
  };
}

export async function exportSettingsBinary(
  store?: SettingsStore,
): Promise<Uint8Array<ArrayBuffer>> {
  const resolvedStore = store ?? (await getSettingsStore());
  const settings = await resolvedStore.getSettings();
  return encodeSettingsBinary(settings);
}

export async function importSettingsBinary(
  input: Uint8Array | ArrayBuffer,
  store?: SettingsStore,
): Promise<SettingsDocument> {
  const decoded = decodeSettingsBinary(input);
  const resolvedStore = store ?? (await getSettingsStore());
  return resolvedStore.updateSettings({ theme: decoded.theme });
}

export async function downloadSettingsBinary(
  store?: SettingsStore,
  filename = createSettingsBinaryFilename(),
): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = await exportSettingsBinary(store);
  const baseFilename = filename.trim() || SETTINGS_BINARY_FILENAME;
  const resolvedFilename = baseFilename.toLowerCase().endsWith(SETTINGS_BINARY_EXTENSION)
    ? baseFilename
    : `${baseFilename}${SETTINGS_BINARY_EXTENSION}`;
  if (typeof document !== "undefined" && typeof URL !== "undefined") {
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = resolvedFilename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }
  return bytes;
}

export async function importSettingsBinaryFile(
  file: Blob,
  store?: SettingsStore,
): Promise<SettingsDocument> {
  const buffer = await file.arrayBuffer();
  return importSettingsBinary(new Uint8Array(buffer), store);
}
