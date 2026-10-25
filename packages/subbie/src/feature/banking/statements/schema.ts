import { z } from "zod";

import { generateDocumentId } from "../../invoices/schema.ts";
import {
  bankIdSchema,
  fieldOrDefault,
  nonBlankString,
  optionalDateStringSchema,
} from "../types.ts";

export const BANK_CSV_COLUMN_ROLES = [
  "ignore",
  "date",
  "description",
  "amount",
  "debit",
  "credit",
  "balance",
] as const;

export type BankCsvColumnRole = (typeof BANK_CSV_COLUMN_ROLES)[number];

const BANK_CSV_COLUMN_ROLE_LABELS: Record<BankCsvColumnRole, string> = {
  ignore: "Ignore",
  date: "Date",
  description: "Description",
  amount: "Amount (Signed)",
  debit: "Debit (Payment)",
  credit: "Credit (Receipt)",
  balance: "Balance",
};

export function bankCsvColumnRoleLabel(role: BankCsvColumnRole): string {
  return BANK_CSV_COLUMN_ROLE_LABELS[role];
}

export function isBankCsvColumnRole(value: unknown): value is BankCsvColumnRole {
  return typeof value === "string" && (BANK_CSV_COLUMN_ROLES as readonly string[]).includes(value);
}

export interface BankCsvPreset {
  hasHeader: boolean;
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  debitColumn: string;
  creditColumn: string;
  balanceColumn: string;
}

export const DEFAULT_BANK_CSV_PRESET: BankCsvPreset = Object.freeze({
  hasHeader: true,
  dateColumn: "Date",
  descriptionColumn: "Description",
  amountColumn: "Amount",
  debitColumn: "Debit",
  creditColumn: "Credit",
  balanceColumn: "Balance",
});

export const DEFAULT_HEADERLESS_BANK_CSV_PRESET: BankCsvPreset = Object.freeze({
  hasHeader: false,
  dateColumn: "0",
  descriptionColumn: "1",
  amountColumn: "2",
  debitColumn: "",
  creditColumn: "",
  balanceColumn: "3",
});

export const bankCsvPresetSchema = z.object({
  hasHeader: z.boolean(),
  dateColumn: nonBlankString,
  descriptionColumn: nonBlankString,
  amountColumn: z.string(),
  debitColumn: z.string(),
  creditColumn: z.string(),
  balanceColumn: z.string(),
});

export function isBankCsvPreset(value: unknown): value is BankCsvPreset {
  return bankCsvPresetSchema.safeParse(value).success;
}

function normalizeHeaderlessColumnIndex(raw: string | undefined, fallback: string): string {
  if (typeof raw !== "string") {
    return fallback;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "";
  }
  return /^\d+$/.test(trimmed) ? trimmed : fallback;
}

export function normalizeBankCsvPreset(value?: Partial<BankCsvPreset> | null): BankCsvPreset {
  const hasHeader =
    typeof value?.hasHeader === "boolean" ? value.hasHeader : DEFAULT_BANK_CSV_PRESET.hasHeader;

  if (!hasHeader) {
    const debitColumn = normalizeHeaderlessColumnIndex(
      value?.debitColumn,
      DEFAULT_HEADERLESS_BANK_CSV_PRESET.debitColumn,
    );
    const creditColumn = normalizeHeaderlessColumnIndex(
      value?.creditColumn,
      DEFAULT_HEADERLESS_BANK_CSV_PRESET.creditColumn,
    );
    const hasSplitColumns = debitColumn.length > 0 || creditColumn.length > 0;
    const rawAmount = normalizeHeaderlessColumnIndex(
      value?.amountColumn,
      hasSplitColumns ? "" : DEFAULT_HEADERLESS_BANK_CSV_PRESET.amountColumn,
    );
    const allValueColumnsEmpty =
      rawAmount.length === 0 && debitColumn.length === 0 && creditColumn.length === 0;

    return {
      hasHeader: false,
      dateColumn:
        normalizeHeaderlessColumnIndex(
          value?.dateColumn,
          DEFAULT_HEADERLESS_BANK_CSV_PRESET.dateColumn,
        ) || DEFAULT_HEADERLESS_BANK_CSV_PRESET.dateColumn,
      descriptionColumn:
        normalizeHeaderlessColumnIndex(
          value?.descriptionColumn,
          DEFAULT_HEADERLESS_BANK_CSV_PRESET.descriptionColumn,
        ) || DEFAULT_HEADERLESS_BANK_CSV_PRESET.descriptionColumn,
      amountColumn: allValueColumnsEmpty
        ? DEFAULT_HEADERLESS_BANK_CSV_PRESET.amountColumn
        : rawAmount,
      debitColumn,
      creditColumn,
      balanceColumn: normalizeHeaderlessColumnIndex(
        value?.balanceColumn,
        DEFAULT_HEADERLESS_BANK_CSV_PRESET.balanceColumn,
      ),
    };
  }

  const dateColumn =
    typeof value?.dateColumn === "string" &&
    value.dateColumn.trim().length > 0 &&
    !/^\d+$/.test(value.dateColumn.trim())
      ? value.dateColumn.trim()
      : DEFAULT_BANK_CSV_PRESET.dateColumn;
  const descriptionColumn =
    typeof value?.descriptionColumn === "string" &&
    value.descriptionColumn.trim().length > 0 &&
    !/^\d+$/.test(value.descriptionColumn.trim())
      ? value.descriptionColumn.trim()
      : DEFAULT_BANK_CSV_PRESET.descriptionColumn;
  const hasExplicitSplitColumns =
    value?.amountColumn === undefined &&
    ((typeof value?.debitColumn === "string" &&
      value.debitColumn.trim().length > 0 &&
      !/^\d+$/.test(value.debitColumn.trim())) ||
      (typeof value?.creditColumn === "string" &&
        value.creditColumn.trim().length > 0 &&
        !/^\d+$/.test(value.creditColumn.trim())));
  const rawAmountColumn =
    typeof value?.amountColumn === "string" && !/^\d+$/.test(value.amountColumn.trim())
      ? value.amountColumn.trim()
      : hasExplicitSplitColumns
        ? ""
        : DEFAULT_BANK_CSV_PRESET.amountColumn;
  const rawDebitColumn =
    typeof value?.debitColumn === "string" && !/^\d+$/.test(value.debitColumn.trim())
      ? value.debitColumn.trim()
      : DEFAULT_BANK_CSV_PRESET.debitColumn;
  const rawCreditColumn =
    typeof value?.creditColumn === "string" && !/^\d+$/.test(value.creditColumn.trim())
      ? value.creditColumn.trim()
      : DEFAULT_BANK_CSV_PRESET.creditColumn;
  const balanceColumn =
    typeof value?.balanceColumn === "string" && !/^\d+$/.test(value.balanceColumn.trim())
      ? value.balanceColumn.trim()
      : DEFAULT_BANK_CSV_PRESET.balanceColumn;

  const allValueColumnsEmpty =
    rawAmountColumn.length === 0 && rawDebitColumn.length === 0 && rawCreditColumn.length === 0;

  return {
    hasHeader: true,
    dateColumn,
    descriptionColumn,
    amountColumn: allValueColumnsEmpty ? DEFAULT_BANK_CSV_PRESET.amountColumn : rawAmountColumn,
    debitColumn: allValueColumnsEmpty ? DEFAULT_BANK_CSV_PRESET.debitColumn : rawDebitColumn,
    creditColumn: allValueColumnsEmpty ? DEFAULT_BANK_CSV_PRESET.creditColumn : rawCreditColumn,
    balanceColumn,
  };
}

export function mergeBankCsvPreset(
  base: BankCsvPreset,
  patch?: Partial<BankCsvPreset> | null,
): BankCsvPreset {
  if (!patch) {
    return normalizeBankCsvPreset(base);
  }
  if (typeof patch.hasHeader === "boolean" && patch.hasHeader !== base.hasHeader) {
    return normalizeBankCsvPreset(patch);
  }
  const hasPatchSplitColumns =
    (typeof patch.debitColumn === "string" && patch.debitColumn.trim().length > 0) ||
    (typeof patch.creditColumn === "string" && patch.creditColumn.trim().length > 0);
  const hasPatchAmountColumn =
    typeof patch.amountColumn === "string" && patch.amountColumn.trim().length > 0;

  const merged: Partial<BankCsvPreset> = {
    ...base,
    ...patch,
  };
  if (patch.amountColumn === undefined && hasPatchSplitColumns) {
    merged.amountColumn = "";
  } else if (
    patch.debitColumn === undefined &&
    patch.creditColumn === undefined &&
    hasPatchAmountColumn &&
    (!base.hasHeader || base.amountColumn === "")
  ) {
    merged.debitColumn = "";
    merged.creditColumn = "";
  }
  return normalizeBankCsvPreset(merged);
}

export function columnRolesFromPreset(
  preset: Partial<BankCsvPreset>,
  minColumns = 4,
): BankCsvColumnRole[] {
  const roleByIndex = new Map<number, BankCsvColumnRole>();
  let maxIndex = Math.max(0, minColumns - 1);

  const assignIndex = (raw: string | undefined, role: BankCsvColumnRole) => {
    if (typeof raw !== "string") {
      return;
    }
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) {
      const idx = Number(trimmed);
      roleByIndex.set(idx, role);
      if (idx > maxIndex) {
        maxIndex = idx;
      }
    }
  };

  assignIndex(preset.dateColumn, "date");
  assignIndex(preset.descriptionColumn, "description");
  assignIndex(preset.amountColumn, "amount");
  assignIndex(preset.debitColumn, "debit");
  assignIndex(preset.creditColumn, "credit");
  assignIndex(preset.balanceColumn, "balance");

  if (roleByIndex.size === 0 && preset.dateColumn !== "" && preset.descriptionColumn !== "") {
    const normalized = normalizeBankCsvPreset({ ...preset, hasHeader: false });
    return columnRolesFromPreset(normalized, minColumns);
  }

  return Array.from({ length: maxIndex + 1 }, (_, idx) => roleByIndex.get(idx) ?? "ignore");
}

export function presetFromColumnRoles(roles: readonly BankCsvColumnRole[]): BankCsvPreset {
  const findColumn = (target: BankCsvColumnRole): string => {
    const index = roles.indexOf(target);
    return index === -1 ? "" : String(index);
  };

  return {
    hasHeader: false,
    dateColumn: findColumn("date"),
    descriptionColumn: findColumn("description"),
    amountColumn: findColumn("amount"),
    debitColumn: findColumn("debit"),
    creditColumn: findColumn("credit"),
    balanceColumn: findColumn("balance"),
  };
}

export function assignColumnRole(
  roles: readonly BankCsvColumnRole[],
  columnIndex: number,
  nextRole: BankCsvColumnRole,
): BankCsvColumnRole[] {
  const length = Math.max(roles.length, columnIndex + 1);
  return Array.from({ length }, (_, idx) => {
    const existing = roles[idx] ?? "ignore";
    if (idx === columnIndex) {
      return nextRole;
    }
    if (nextRole !== "ignore" && existing === nextRole) {
      return "ignore";
    }
    return existing;
  });
}

const bankStatementFields = {
  id: bankIdSchema,
  accountId: bankIdSchema,
  filename: nonBlankString,
  importedAt: nonBlankString,
  lineCount: z.number().int().nonnegative(),
  startDate: optionalDateStringSchema,
  endDate: optionalDateStringSchema,
  createdAt: nonBlankString,
  updatedAt: nonBlankString,
};

export const bankStatementDocumentSchema = z.object(bankStatementFields);

export type BankStatementDocument = z.infer<typeof bankStatementDocumentSchema>;

export interface CreateBankStatementInput {
  accountId: string;
  filename: string;
  importedAt?: string;
  lineCount?: number;
  startDate?: string;
  endDate?: string;
}

export function isBankStatementDocument(value: unknown): value is BankStatementDocument {
  return bankStatementDocumentSchema.safeParse(value).success;
}

export function normalizeBankStatementDocument(
  value?: Partial<BankStatementDocument> | null,
): BankStatementDocument {
  const now = new Date().toISOString();
  return {
    id: fieldOrDefault(bankStatementFields.id, value?.id, generateDocumentId()),
    accountId: fieldOrDefault(bankStatementFields.accountId, value?.accountId, "").trim(),
    filename: fieldOrDefault(bankStatementFields.filename, value?.filename, "statement.csv").trim(),
    importedAt: fieldOrDefault(bankStatementFields.importedAt, value?.importedAt, now),
    lineCount: fieldOrDefault(bankStatementFields.lineCount, value?.lineCount, 0),
    startDate: fieldOrDefault(bankStatementFields.startDate, value?.startDate, ""),
    endDate: fieldOrDefault(bankStatementFields.endDate, value?.endDate, ""),
    createdAt: fieldOrDefault(bankStatementFields.createdAt, value?.createdAt, now),
    updatedAt: fieldOrDefault(bankStatementFields.updatedAt, value?.updatedAt, now),
  };
}
