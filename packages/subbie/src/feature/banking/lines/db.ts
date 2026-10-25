import type { Collection } from "@tanstack/react-db";
import type { RxJsonSchema } from "rxdb/plugins/core";

import { getInvoicesStore, type InvoicesStore } from "../../invoices/db.ts";
import { generateDocumentId } from "../../invoices/schema.ts";
import type { BankAccountDocument } from "../accounts/schema.ts";
import type { BankCategoryDocument } from "../categories/schema.ts";
import type { BankTransactionType } from "../types.ts";
import {
  isBankGstType,
  normalizeBankLineAllocation,
  type BankGstType,
  type BankLineAllocationInput,
} from "./gst.ts";
import {
  isBankStatementLineDocument,
  normalizeBankStatementLineDocument,
  validateBankStatementLineInput,
  type BankStatementLineDocument,
  type BankStatementLinePatch,
  type CreateBankStatementLineInput,
} from "./schema.ts";

export const BANK_STATEMENT_LINES_COLLECTION_NAME = "bank_statement_lines";

export const bankStatementLineJsonSchema: RxJsonSchema<BankStatementLineDocument> = {
  version: 2,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    statementId: { type: "string", maxLength: 128 },
    accountId: { type: "string", maxLength: 128 },
    date: { type: "string", maxLength: 10 },
    description: { type: "string" },
    type: { type: "string", maxLength: 16 },
    amountCents: { type: "number" },
    balanceCents: { type: "number" },
    invoiceIds: {
      type: "array",
      items: { type: "string", maxLength: 128 },
    },
    allocations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", maxLength: 128 },
          categoryId: { type: "string", maxLength: 128 },
          amountCents: { type: "number" },
          gstType: { type: "string", maxLength: 16 },
          gstFreeAmountCents: { type: "number" },
          notes: { type: "string" },
        },
        required: ["id", "categoryId", "amountCents"],
      },
    },
    isPrivate: { type: "boolean" },
    notes: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: [
    "id",
    "statementId",
    "accountId",
    "date",
    "description",
    "type",
    "amountCents",
    "invoiceIds",
    "allocations",
    "isPrivate",
    "createdAt",
    "updatedAt",
  ],
};

export type BankStatementLinesCollection = Collection<BankStatementLineDocument, string>;

export interface ListStatementLinesFilter {
  accountId?: string;
  statementId?: string;
  type?: BankTransactionType;
}

export interface LinkInvoicesOptions {
  invoicesStore?: InvoicesStore;
}

export interface AllocateLineToCategoryOptions {
  notes?: string;
  gstType?: BankGstType;
  gstFreeAmountCents?: number;
}

export interface CreateBankStatementLinesActionsDeps {
  accountsCollection: Collection<BankAccountDocument, string>;
  linesCollection: BankStatementLinesCollection;
  getCategory: (id: string) => BankCategoryDocument | undefined;
  syncStatementMetadata: (statementId: string) => Promise<void>;
  allocateLineTimestampMs: (count?: number) => number;
  defaultInvoicesStore?: InvoicesStore;
}

export function createBankStatementLinesActions({
  accountsCollection,
  linesCollection,
  getCategory,
  syncStatementMetadata,
  allocateLineTimestampMs,
  defaultInvoicesStore,
}: CreateBankStatementLinesActionsDeps) {
  function listStatementLines(filter?: ListStatementLinesFilter): BankStatementLineDocument[] {
    return [...linesCollection.values()]
      .map((doc) => normalizeBankStatementLineDocument(doc))
      .filter((doc) => {
        if (filter?.accountId && doc.accountId !== filter.accountId) {
          return false;
        }
        if (filter?.statementId && doc.statementId !== filter.statementId) {
          return false;
        }
        if (filter?.type && doc.type !== filter.type) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return a.date < b.date ? 1 : -1;
        }
        if (a.createdAt !== b.createdAt) {
          return a.createdAt < b.createdAt ? 1 : -1;
        }
        return a.id.localeCompare(b.id);
      });
  }

  function getStatementLine(id: string): BankStatementLineDocument | undefined {
    const doc = linesCollection.get(id);
    return doc ? normalizeBankStatementLineDocument(doc) : undefined;
  }

  function validateAllocationsAgainstCategories(
    lineType: BankTransactionType,
    lineAmountCents: number,
    allocations: readonly BankLineAllocationInput[],
  ) {
    let total = 0;
    for (const entry of allocations) {
      if (!Number.isInteger(entry.amountCents) || entry.amountCents < 0) {
        throw new Error("Invalid allocation: amount must be a non-negative integer");
      }
      if (entry.gstType !== undefined && !isBankGstType(entry.gstType)) {
        throw new Error("Invalid allocation: gstType must be gst, gst-free, or part-gst");
      }
      if (lineType === "receipt" && entry.gstType === "part-gst") {
        throw new Error("Invalid allocation: receipt allocations must be gst or gst-free");
      }
      if (entry.gstFreeAmountCents !== undefined) {
        if (!Number.isInteger(entry.gstFreeAmountCents) || entry.gstFreeAmountCents < 0) {
          throw new Error("Invalid allocation: GST free amount must be a non-negative integer");
        }
        if (entry.gstFreeAmountCents > entry.amountCents) {
          throw new Error("Invalid allocation: GST free amount cannot exceed allocation amount");
        }
      }
      const category = getCategory(entry.categoryId);
      if (!category) {
        throw new Error(`Bank category not found: ${entry.categoryId}`);
      }
      if (category.type !== lineType) {
        throw new Error(
          `Category "${category.name}" is for ${category.type}s and cannot be allocated to a ${lineType} line`,
        );
      }
      total += entry.amountCents;
    }
    if (total > lineAmountCents) {
      throw new Error("Invalid allocation: allocated total exceeds statement line amount");
    }
  }

  async function createStatementLine(
    input: CreateBankStatementLineInput,
  ): Promise<BankStatementLineDocument> {
    const validated = validateBankStatementLineInput(input);
    if (!accountsCollection.has(validated.accountId)) {
      throw new Error(`Bank account not found: ${validated.accountId}`);
    }
    const isPrivate = validated.isPrivate ?? false;
    const allocations = isPrivate ? [] : (validated.allocations ?? []);
    if (allocations.length > 0) {
      validateAllocationsAgainstCategories(validated.type, validated.amountCents, allocations);
    }
    const now = new Date(allocateLineTimestampMs(1)).toISOString();
    const doc = normalizeBankStatementLineDocument({
      id: generateDocumentId(),
      statementId: validated.statementId ?? "",
      accountId: validated.accountId,
      date: validated.date,
      description: validated.description.trim(),
      type: validated.type,
      amountCents: validated.amountCents,
      balanceCents: validated.balanceCents,
      invoiceIds: validated.invoiceIds ?? [],
      allocations: allocations.map((entry) => normalizeBankLineAllocation(entry)),
      isPrivate,
      notes: validated.notes ?? "",
      createdAt: now,
      updatedAt: now,
    });
    const tx = linesCollection.insert(doc);
    await tx.isPersisted.promise;
    if (doc.statementId) {
      await syncStatementMetadata(doc.statementId);
    }
    return doc;
  }

  async function updateStatementLine(
    id: string,
    patch: BankStatementLinePatch,
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(id);
    if (!current) {
      throw new Error(`Bank statement line not found: ${id}`);
    }
    if (patch.accountId !== undefined && !accountsCollection.has(patch.accountId)) {
      throw new Error(`Bank account not found: ${patch.accountId}`);
    }
    const nextType = patch.type ?? current.type;
    const nextAmountCents = patch.amountCents ?? current.amountCents;
    const nextIsPrivate = patch.isPrivate ?? current.isPrivate;
    const nextAllocationsInput = nextIsPrivate ? [] : (patch.allocations ?? current.allocations);

    validateAllocationsAgainstCategories(nextType, nextAmountCents, nextAllocationsInput);

    const normalizedAllocations = nextAllocationsInput.map((entry) =>
      normalizeBankLineAllocation(entry),
    );
    const candidate: BankStatementLineDocument = {
      ...current,
      ...patch,
      id,
      allocations: normalizedAllocations,
      isPrivate: nextIsPrivate,
    };
    if (!isBankStatementLineDocument(candidate)) {
      throw new Error("Invalid bank statement line update");
    }
    const next = normalizeBankStatementLineDocument(candidate);
    const tx = linesCollection.update(id, (draft) => {
      Object.assign(draft, next, { updatedAt: new Date().toISOString() });
      if (next.balanceCents === undefined) {
        delete draft.balanceCents;
      }
    });
    await tx.isPersisted.promise;
    if (patch.date !== undefined || patch.statementId !== undefined) {
      if (current.statementId) {
        await syncStatementMetadata(current.statementId);
      }
      if (next.statementId && next.statementId !== current.statementId) {
        await syncStatementMetadata(next.statementId);
      }
    }
    return getStatementLine(id) ?? next;
  }

  async function deleteStatementLine(id: string): Promise<void> {
    const existing = getStatementLine(id);
    if (!existing) {
      throw new Error(`Bank statement line not found: ${id}`);
    }
    const tx = linesCollection.delete(id);
    await tx.isPersisted.promise;
    if (existing.statementId) {
      await syncStatementMetadata(existing.statementId);
    }
  }

  async function markInvoicesAsPaid(
    invoiceIds: readonly string[],
    linkOptions?: LinkInvoicesOptions,
  ): Promise<void> {
    if (invoiceIds.length === 0) {
      return;
    }
    const resolvedInvoicesStore =
      linkOptions?.invoicesStore ?? defaultInvoicesStore ?? (await getInvoicesStore());
    for (const invoiceId of invoiceIds) {
      const invoice = resolvedInvoicesStore.getInvoice(invoiceId);
      if (invoice && invoice.status !== "paid") {
        await resolvedInvoicesStore.setInvoiceStatus(invoiceId, "paid");
      }
    }
  }

  async function linkInvoicesToLine(
    lineId: string,
    invoiceIds: readonly string[],
    linkOptions?: LinkInvoicesOptions,
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(lineId);
    if (!current) {
      throw new Error(`Bank statement line not found: ${lineId}`);
    }
    const deduplicated = Array.from(
      new Set(invoiceIds.map((id) => id.trim()).filter((id) => id.length > 0)),
    );
    const newlyLinkedIds = deduplicated.filter((id) => !current.invoiceIds.includes(id));
    const updated = await updateStatementLine(lineId, { invoiceIds: deduplicated });
    await markInvoicesAsPaid(newlyLinkedIds, linkOptions);
    return updated;
  }

  async function linkInvoiceToLine(
    lineId: string,
    invoiceId: string,
    linkOptions?: LinkInvoicesOptions,
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(lineId);
    if (!current) {
      throw new Error(`Bank statement line not found: ${lineId}`);
    }
    const nextIds = Array.from(new Set([...current.invoiceIds, invoiceId.trim()]));
    return linkInvoicesToLine(lineId, nextIds, linkOptions);
  }

  async function unlinkInvoiceFromLine(
    lineId: string,
    invoiceId: string,
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(lineId);
    if (!current) {
      throw new Error(`Bank statement line not found: ${lineId}`);
    }
    const nextIds = current.invoiceIds.filter((id) => id !== invoiceId);
    return updateStatementLine(lineId, { invoiceIds: nextIds });
  }

  async function allocateLineToCategory(
    lineId: string,
    categoryId: string,
    notesOrOptions?: string | AllocateLineToCategoryOptions,
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(lineId);
    if (!current) {
      throw new Error(`Bank statement line not found: ${lineId}`);
    }
    if (current.isPrivate) {
      throw new Error("Statement line is private — mark it as business before allocating");
    }
    const resolvedOptions: AllocateLineToCategoryOptions =
      typeof notesOrOptions === "string" ? { notes: notesOrOptions } : (notesOrOptions ?? {});
    const gstType: BankGstType = resolvedOptions.gstType ?? "gst";
    const notes = resolvedOptions.notes?.trim();
    return updateStatementLine(lineId, {
      allocations: [
        {
          categoryId,
          amountCents: current.amountCents,
          gstType,
          ...(gstType === "part-gst" && resolvedOptions.gstFreeAmountCents !== undefined
            ? { gstFreeAmountCents: resolvedOptions.gstFreeAmountCents }
            : {}),
          ...(notes && notes.length > 0 ? { notes } : {}),
        },
      ],
    });
  }

  async function setLineAllocations(
    lineId: string,
    allocations: readonly BankLineAllocationInput[],
  ): Promise<BankStatementLineDocument> {
    const current = getStatementLine(lineId);
    if (current?.isPrivate) {
      throw new Error("Statement line is private — mark it as business before allocating");
    }
    return updateStatementLine(lineId, {
      allocations: [...allocations],
    });
  }

  async function clearLineAllocations(lineId: string): Promise<BankStatementLineDocument> {
    return updateStatementLine(lineId, { allocations: [] });
  }

  async function setLinePrivate(
    lineId: string,
    isPrivate: boolean,
  ): Promise<BankStatementLineDocument> {
    return updateStatementLine(lineId, { isPrivate });
  }

  async function allocateLinesToCategory(
    lineIds: readonly string[],
    categoryId: string,
    notesOrOptions?: string | AllocateLineToCategoryOptions,
  ): Promise<BankStatementLineDocument[]> {
    const uniqueIds = Array.from(
      new Set(lineIds.map((id) => id.trim()).filter((id) => id.length > 0)),
    );
    if (uniqueIds.length === 0) {
      return [];
    }
    const resolvedOptions: AllocateLineToCategoryOptions =
      typeof notesOrOptions === "string" ? { notes: notesOrOptions } : (notesOrOptions ?? {});
    const gstType: BankGstType = resolvedOptions.gstType ?? "gst";
    const notes = resolvedOptions.notes?.trim();

    const targetLines = uniqueIds.map((lineId) => {
      const current = getStatementLine(lineId);
      if (!current) {
        throw new Error(`Bank statement line not found: ${lineId}`);
      }
      if (current.isPrivate) {
        throw new Error("Statement line is private — mark it as business before allocating");
      }
      validateAllocationsAgainstCategories(current.type, current.amountCents, [
        {
          categoryId,
          amountCents: current.amountCents,
          gstType,
          ...(gstType === "part-gst" && resolvedOptions.gstFreeAmountCents !== undefined
            ? { gstFreeAmountCents: resolvedOptions.gstFreeAmountCents }
            : {}),
          ...(notes && notes.length > 0 ? { notes } : {}),
        },
      ]);
      return current;
    });

    const results: BankStatementLineDocument[] = [];
    for (const line of targetLines) {
      results.push(await allocateLineToCategory(line.id, categoryId, resolvedOptions));
    }
    return results;
  }

  async function clearLinesAllocations(
    lineIds: readonly string[],
  ): Promise<BankStatementLineDocument[]> {
    const uniqueIds = Array.from(
      new Set(lineIds.map((id) => id.trim()).filter((id) => id.length > 0)),
    );
    for (const lineId of uniqueIds) {
      if (!getStatementLine(lineId)) {
        throw new Error(`Bank statement line not found: ${lineId}`);
      }
    }
    const results: BankStatementLineDocument[] = [];
    for (const lineId of uniqueIds) {
      results.push(await clearLineAllocations(lineId));
    }
    return results;
  }

  async function setLinesPrivate(
    lineIds: readonly string[],
    isPrivate: boolean,
  ): Promise<BankStatementLineDocument[]> {
    const uniqueIds = Array.from(
      new Set(lineIds.map((id) => id.trim()).filter((id) => id.length > 0)),
    );
    for (const lineId of uniqueIds) {
      if (!getStatementLine(lineId)) {
        throw new Error(`Bank statement line not found: ${lineId}`);
      }
    }
    const results: BankStatementLineDocument[] = [];
    for (const lineId of uniqueIds) {
      results.push(await setLinePrivate(lineId, isPrivate));
    }
    return results;
  }

  return {
    listStatementLines,
    getStatementLine,
    createStatementLine,
    updateStatementLine,
    deleteStatementLine,
    linkInvoicesToLine,
    linkInvoiceToLine,
    unlinkInvoiceFromLine,
    allocateLineToCategory,
    allocateLinesToCategory,
    setLineAllocations,
    clearLineAllocations,
    clearLinesAllocations,
    setLinePrivate,
    setLinesPrivate,
  };
}
