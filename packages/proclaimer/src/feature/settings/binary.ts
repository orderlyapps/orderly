import { getSettingsStore, type SettingsStore } from "./db.ts";
import {
  DEFAULT_SETTINGS_ID,
  isSettingsDocument,
  isSettingValue,
  isValidSettingsId,
  normalizeSettingsDocument,
  SETTINGS_KEYS,
  toSettingsPatch,
  type SettingsDocument,
  type SettingsPatch,
} from "./schema.ts";

const BINARY_MAGIC = new Uint8Array([
  0x50, 0x52, 0x4f, 0x43, 0x4c, 0x41, 0x49, 0x4d, 0x45, 0x52, 0x01,
]);

const SETTINGS_BINARY_BASENAME = "settings";
export const SETTINGS_BINARY_EXTENSION = ".pro";
export const SETTINGS_BINARY_FILENAME = `${SETTINGS_BINARY_BASENAME}${SETTINGS_BINARY_EXTENSION}`;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function createSettingsBinaryFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${SETTINGS_BINARY_BASENAME}-${year}-${month}-${day}_${hours}-${minutes}-${seconds}${SETTINGS_BINARY_EXTENSION}`;
}

export function encodeSettingsBinary(settings: SettingsDocument): Uint8Array<ArrayBuffer> {
  if (!isSettingsDocument(settings)) {
    throw new Error("Invalid settings document");
  }
  const payload = JSON.stringify(normalizeSettingsDocument(settings));
  const payloadBytes = new TextEncoder().encode(payload);
  const output = new Uint8Array(BINARY_MAGIC.length + payloadBytes.length);
  output.set(BINARY_MAGIC, 0);
  output.set(payloadBytes, BINARY_MAGIC.length);
  return output;
}

function parseSettingsBinaryRecord(input: Uint8Array | ArrayBuffer): {
  id: string;
  patch: SettingsPatch;
} {
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

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Invalid settings binary: expected an object");
  }

  const record = parsed as Record<string, unknown>;
  for (const key of SETTINGS_KEYS) {
    if (record[key] !== undefined && !isSettingValue(key, record[key])) {
      throw new Error(`Invalid settings binary: invalid ${key} value`);
    }
  }

  const patch = toSettingsPatch(record as Partial<SettingsDocument>);
  if (Object.keys(patch).length === 0) {
    throw new Error("Invalid settings binary: no valid settings found");
  }

  const id = isValidSettingsId(record.id) ? record.id : DEFAULT_SETTINGS_ID;
  return { id, patch };
}

export function decodeSettingsBinary(input: Uint8Array | ArrayBuffer): SettingsDocument {
  const { id, patch } = parseSettingsBinaryRecord(input);
  return normalizeSettingsDocument({ id, ...patch });
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
  const { patch } = parseSettingsBinaryRecord(input);
  const resolvedStore = store ?? (await getSettingsStore());
  return resolvedStore.updateSettings(patch);
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
