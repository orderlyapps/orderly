import { isInvoiceDateString } from "../invoices/schema.ts";
import {
  DEFAULT_BANK_CSV_PRESET,
  normalizeBankCsvPreset,
  type BankCsvPreset,
  type BankTransactionType,
} from "./schema.ts";

export interface ParsedBankStatementRow {
  date: string;
  description: string;
  type: BankTransactionType;
  amountCents: number;
  balanceCents?: number;
}

export interface ParseBankStatementCsvResult {
  headers: string[];
  rows: ParsedBankStatementRow[];
  detectedPreset: BankCsvPreset;
}

const MONTH_INDEX_BY_NAME: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function formatYmd(year: number, month: number, day: number): string {
  const candidate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
  if (!isInvoiceDateString(candidate as unknown)) {
    throw new Error(`Invalid date value: "${candidate}"`);
  }
  return candidate;
}

function normalizeTwoDigitYear(year: number): number {
  if (year >= 100) {
    return year;
  }
  return year >= 70 ? 1900 + year : 2000 + year;
}

export function parseCsvDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Invalid CSV date: empty date");
  }

  if (isInvoiceDateString(trimmed)) {
    return trimmed;
  }

  const ymdSlash = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/.exec(trimmed);
  if (ymdSlash) {
    return formatYmd(Number(ymdSlash[1]), Number(ymdSlash[2]), Number(ymdSlash[3]));
  }

  const dmyOrMdy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(trimmed);
  if (dmyOrMdy) {
    const first = Number(dmyOrMdy[1]);
    const second = Number(dmyOrMdy[2]);
    const year = normalizeTwoDigitYear(Number(dmyOrMdy[3]));
    if (first > 12 && second <= 12) {
      return formatYmd(year, second, first);
    }
    if (second > 12 && first <= 12) {
      return formatYmd(year, first, second);
    }
    return formatYmd(year, second, first);
  }

  const dMonY = /^(\d{1,2})[\s/-]+([A-Za-z]+)[\s,/-]+(\d{2}|\d{4})$/.exec(trimmed);
  if (dMonY) {
    const day = Number(dMonY[1]);
    const month = MONTH_INDEX_BY_NAME[dMonY[2].toLowerCase()];
    const year = normalizeTwoDigitYear(Number(dMonY[3]));
    if (month) {
      return formatYmd(year, month, day);
    }
  }

  const monDY = /^([A-Za-z]+)[\s/-]+(\d{1,2}),?[\s/-]+(\d{2}|\d{4})$/.exec(trimmed);
  if (monDY) {
    const month = MONTH_INDEX_BY_NAME[monDY[1].toLowerCase()];
    const day = Number(monDY[2]);
    const year = normalizeTwoDigitYear(Number(monDY[3]));
    if (month) {
      return formatYmd(year, month, day);
    }
  }

  throw new Error(`Invalid CSV date: "${raw}"`);
}

export function parseCurrencyToCents(raw: string): number {
  let trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Invalid CSV amount: empty amount");
  }

  let sign = 1;
  if (/^[+-]/.test(trimmed)) {
    if (trimmed[0] === "-") {
      sign = -1;
    }
    trimmed = trimmed.slice(1).trim();
  }

  if (/^\(.*\)$/.test(trimmed)) {
    sign = -1;
    trimmed = trimmed.slice(1, -1).trim();
  }

  const drCrMatch = /\b(CR|DR)\s*$/i.exec(trimmed);
  if (drCrMatch) {
    if (drCrMatch[1].toUpperCase() === "DR") {
      sign = -1;
    }
    trimmed = trimmed.slice(0, drCrMatch.index).trim();
  }

  if (/[+-]$/.test(trimmed)) {
    if (trimmed.endsWith("-")) {
      sign = -1;
    }
    trimmed = trimmed.slice(0, -1).trim();
  }

  if (/^[+-]/.test(trimmed)) {
    if (trimmed[0] === "-") {
      sign = -1;
    }
    trimmed = trimmed.slice(1).trim();
  }

  const currencyPrefixMatch = /^(?:[A-Z]{1,2}\$|\p{Sc}|[A-Z]{3}\s+)\s*/u.exec(trimmed);
  if (currencyPrefixMatch) {
    trimmed = trimmed.slice(currencyPrefixMatch[0].length).trim();
  }

  if (/^[+-]/.test(trimmed)) {
    if (trimmed[0] === "-") {
      sign = -1;
    }
    trimmed = trimmed.slice(1).trim();
  }

  const currencySuffixMatch = /\s+[A-Z]{3}$/.exec(trimmed);
  if (currencySuffixMatch) {
    trimmed = trimmed.slice(0, currencySuffixMatch.index).trim();
  }

  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid CSV amount: "${raw}"`);
  }

  const cleaned = trimmed.replace(/,/g, "");
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid CSV amount: "${raw}"`);
  }

  const cents = Math.round(numeric * 100);
  return cents === 0 ? 0 : cents * sign;
}

export function parseCsvMatrix(csvText: string): string[][] {
  const normalized = csvText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          currentCell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && normalized[i + 1] === "\n") {
        i += 1;
      }
      currentRow.push(currentCell.trim());
      currentCell = "";
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (inQuotes) {
    throw new Error("Invalid CSV: unterminated quoted field");
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

const DATE_ALIASES = ["date", "transaction date", "posted date", "value date", "txn date"];
const DESCRIPTION_ALIASES = [
  "description",
  "narrative",
  "details",
  "memo",
  "particulars",
  "reference",
  "payee",
  "transaction details",
];
const AMOUNT_ALIASES = ["amount", "value", "transaction amount", "net amount"];
const DEBIT_ALIASES = ["debit", "withdrawal", "money out", "payment", "debit amount", "outflow"];
const CREDIT_ALIASES = ["credit", "deposit", "money in", "receipt", "credit amount", "inflow"];
const BALANCE_ALIASES = ["balance", "running balance", "closing balance", "account balance"];

function isAliasOrEmpty(value: string, aliases: readonly string[]): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length === 0 || aliases.includes(trimmed);
}

function resolveColumnIndex(
  headers: readonly string[],
  configured: string,
  aliases: readonly string[],
  hasHeader: boolean,
  fallbackIndex?: number,
  allowAliasWhenEmpty = false,
): number {
  const trimmed = configured.trim();
  if (trimmed.length === 0 && !allowAliasWhenEmpty) {
    return -1;
  }

  if (!hasHeader) {
    if (/^\d+$/.test(trimmed)) {
      const idx = Number(trimmed);
      return idx >= 0 && idx < headers.length ? idx : -1;
    }
    return fallbackIndex !== undefined && fallbackIndex >= 0 && fallbackIndex < headers.length
      ? fallbackIndex
      : -1;
  }

  const lowerHeaders = headers.map((h) => h.trim().toLowerCase());
  const lowerConfigured = trimmed.toLowerCase();
  if (trimmed.length > 0) {
    const exactIndex = lowerHeaders.indexOf(lowerConfigured);
    if (exactIndex !== -1) {
      return exactIndex;
    }

    if (/^\d+$/.test(trimmed)) {
      const idx = Number(trimmed);
      if (idx >= 0 && idx < headers.length) {
        return idx;
      }
    }
  }

  const shouldFallbackToAliases =
    (trimmed.length === 0 && allowAliasWhenEmpty) || aliases.includes(lowerConfigured);
  if (shouldFallbackToAliases) {
    for (const alias of aliases) {
      const aliasIdx = lowerHeaders.indexOf(alias);
      if (aliasIdx !== -1) {
        return aliasIdx;
      }
    }
  }

  return -1;
}

export function detectBankCsvPresetFromHeaders(
  headers: readonly string[],
  basePreset?: Partial<BankCsvPreset>,
): BankCsvPreset {
  const preset = normalizeBankCsvPreset(basePreset);
  if (headers.length === 0) {
    return preset;
  }
  const dateIdx = resolveColumnIndex(
    headers,
    preset.dateColumn,
    DATE_ALIASES,
    true,
    undefined,
    true,
  );
  const descIdx = resolveColumnIndex(
    headers,
    preset.descriptionColumn,
    DESCRIPTION_ALIASES,
    true,
    undefined,
    true,
  );
  const amountIdxInitial = resolveColumnIndex(headers, preset.amountColumn, AMOUNT_ALIASES, true);
  const debitIdxInitial = resolveColumnIndex(headers, preset.debitColumn, DEBIT_ALIASES, true);
  const creditIdxInitial = resolveColumnIndex(headers, preset.creditColumn, CREDIT_ALIASES, true);
  const fallbackValueAliases =
    amountIdxInitial === -1 && debitIdxInitial === -1 && creditIdxInitial === -1;

  const amountIdx = fallbackValueAliases
    ? resolveColumnIndex(headers, preset.amountColumn, AMOUNT_ALIASES, true, undefined, true)
    : amountIdxInitial;
  const debitIdx = fallbackValueAliases
    ? resolveColumnIndex(headers, preset.debitColumn, DEBIT_ALIASES, true, undefined, true)
    : debitIdxInitial;
  const creditIdx = fallbackValueAliases
    ? resolveColumnIndex(headers, preset.creditColumn, CREDIT_ALIASES, true, undefined, true)
    : creditIdxInitial;
  const balanceIdx = resolveColumnIndex(headers, preset.balanceColumn, BALANCE_ALIASES, true);

  const hasSplitMatch = debitIdx !== -1 || creditIdx !== -1;
  const hasAmountMatch = amountIdx !== -1;

  return {
    hasHeader: true,
    dateColumn: dateIdx !== -1 ? headers[dateIdx] : preset.dateColumn,
    descriptionColumn: descIdx !== -1 ? headers[descIdx] : preset.descriptionColumn,
    amountColumn: hasAmountMatch ? headers[amountIdx] : hasSplitMatch ? "" : preset.amountColumn,
    debitColumn:
      debitIdx !== -1
        ? headers[debitIdx]
        : hasAmountMatch && !hasSplitMatch
          ? ""
          : preset.debitColumn,
    creditColumn:
      creditIdx !== -1
        ? headers[creditIdx]
        : hasAmountMatch && !hasSplitMatch
          ? ""
          : preset.creditColumn,
    balanceColumn: balanceIdx !== -1 ? headers[balanceIdx] : preset.balanceColumn,
  };
}

export function parseBankStatementCsv(
  csvText: string,
  customPreset?: Partial<BankCsvPreset>,
): ParseBankStatementCsvResult {
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length === 0) {
    throw new Error("Invalid CSV: file is empty");
  }

  if (customPreset !== undefined) {
    if (customPreset.dateColumn !== undefined && customPreset.dateColumn.trim() === "") {
      throw new Error("Invalid CSV: date column is not assigned");
    }
    if (
      customPreset.descriptionColumn !== undefined &&
      customPreset.descriptionColumn.trim() === ""
    ) {
      throw new Error("Invalid CSV: description column is not assigned");
    }
    const hasHeader = customPreset.hasHeader ?? DEFAULT_BANK_CSV_PRESET.hasHeader;
    const debitEmpty = hasHeader
      ? customPreset.debitColumn !== undefined && customPreset.debitColumn.trim() === ""
      : (customPreset.debitColumn ?? "").trim() === "";
    const creditEmpty = hasHeader
      ? customPreset.creditColumn !== undefined && customPreset.creditColumn.trim() === ""
      : (customPreset.creditColumn ?? "").trim() === "";
    if (
      customPreset.amountColumn !== undefined &&
      customPreset.amountColumn.trim() === "" &&
      debitEmpty &&
      creditEmpty
    ) {
      throw new Error("Invalid CSV: amount or debit/credit column not found");
    }
  }

  const preset = normalizeBankCsvPreset(customPreset ?? DEFAULT_BANK_CSV_PRESET);
  const headers = preset.hasHeader ? matrix[0] : matrix[0].map((_, index) => String(index));
  const dataRows = preset.hasHeader ? matrix.slice(1) : matrix;

  if (dataRows.length === 0) {
    throw new Error("Invalid CSV: no statement lines found");
  }

  const dateIdx = resolveColumnIndex(headers, preset.dateColumn, DATE_ALIASES, preset.hasHeader, 0);
  const descIdx = resolveColumnIndex(
    headers,
    preset.descriptionColumn,
    DESCRIPTION_ALIASES,
    preset.hasHeader,
    1,
  );
  let amountIdx = resolveColumnIndex(
    headers,
    preset.amountColumn,
    AMOUNT_ALIASES,
    preset.hasHeader,
    2,
  );
  let debitIdx = resolveColumnIndex(
    headers,
    preset.debitColumn,
    DEBIT_ALIASES,
    preset.hasHeader,
    -1,
  );
  let creditIdx = resolveColumnIndex(
    headers,
    preset.creditColumn,
    CREDIT_ALIASES,
    preset.hasHeader,
    -1,
  );
  const balanceIdx = resolveColumnIndex(
    headers,
    preset.balanceColumn,
    BALANCE_ALIASES,
    preset.hasHeader,
    3,
  );

  const canFallbackValueAliases =
    isAliasOrEmpty(preset.amountColumn, AMOUNT_ALIASES) &&
    isAliasOrEmpty(preset.debitColumn, DEBIT_ALIASES) &&
    isAliasOrEmpty(preset.creditColumn, CREDIT_ALIASES);

  if (
    preset.hasHeader &&
    canFallbackValueAliases &&
    amountIdx === -1 &&
    debitIdx === -1 &&
    creditIdx === -1
  ) {
    amountIdx = resolveColumnIndex(headers, preset.amountColumn, AMOUNT_ALIASES, true, 2, true);
    debitIdx = resolveColumnIndex(headers, preset.debitColumn, DEBIT_ALIASES, true, -1, true);
    creditIdx = resolveColumnIndex(headers, preset.creditColumn, CREDIT_ALIASES, true, -1, true);
  }

  if (dateIdx === -1) {
    throw new Error(`Invalid CSV: date column "${preset.dateColumn}" not found`);
  }
  if (descIdx === -1) {
    throw new Error(`Invalid CSV: description column "${preset.descriptionColumn}" not found`);
  }
  if (amountIdx === -1 && debitIdx === -1 && creditIdx === -1) {
    throw new Error("Invalid CSV: amount or debit/credit column not found");
  }

  const detectedPreset: BankCsvPreset = preset.hasHeader
    ? detectBankCsvPresetFromHeaders(headers, preset)
    : preset;

  const parsedRows: ParsedBankStatementRow[] = [];

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    const rawDate = row[dateIdx] ?? "";
    const rawDescription = row[descIdx] ?? "";

    if (!rawDate && !rawDescription) {
      continue;
    }

    const date = parseCsvDate(rawDate);
    const description = rawDescription.trim() || "Bank transaction";

    let type: BankTransactionType = "payment";
    let amountCents = 0;

    const rawAmount = amountIdx !== -1 ? (row[amountIdx] ?? "").trim() : "";
    const rawDebit = debitIdx !== -1 ? (row[debitIdx] ?? "").trim() : "";
    const rawCredit = creditIdx !== -1 ? (row[creditIdx] ?? "").trim() : "";

    if (rawAmount.length > 0) {
      const signedCents = parseCurrencyToCents(rawAmount);
      type = signedCents < 0 ? "payment" : "receipt";
      amountCents = Math.abs(signedCents);
    } else if (rawCredit.length > 0 || rawDebit.length > 0) {
      const creditCents = rawCredit.length > 0 ? Math.abs(parseCurrencyToCents(rawCredit)) : 0;
      const debitCents = rawDebit.length > 0 ? Math.abs(parseCurrencyToCents(rawDebit)) : 0;
      if (creditCents > 0 && debitCents === 0) {
        type = "receipt";
        amountCents = creditCents;
      } else if (debitCents > 0 && creditCents === 0) {
        type = "payment";
        amountCents = debitCents;
      } else if (rawDebit.length > 0 && rawCredit.length === 0) {
        type = "payment";
        amountCents = debitCents;
      } else if (rawCredit.length > 0 && rawDebit.length === 0) {
        type = "receipt";
        amountCents = creditCents;
      } else if (creditCents >= debitCents) {
        type = "receipt";
        amountCents = creditCents - debitCents;
      } else {
        type = "payment";
        amountCents = debitCents - creditCents;
      }
    } else {
      throw new Error(`Invalid CSV row ${rowIndex + 1}: missing amount`);
    }

    const parsedRow: ParsedBankStatementRow = {
      date,
      description,
      type,
      amountCents,
    };

    const rawBalance = balanceIdx !== -1 ? (row[balanceIdx] ?? "").trim() : "";
    if (rawBalance.length > 0) {
      parsedRow.balanceCents = parseCurrencyToCents(rawBalance);
    }

    parsedRows.push(parsedRow);
  }

  if (parsedRows.length === 0) {
    throw new Error("Invalid CSV: no valid statement lines found");
  }

  return {
    headers,
    rows: parsedRows,
    detectedPreset,
  };
}
