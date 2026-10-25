import type { Collection } from "@tanstack/react-db";
import type { RxJsonSchema } from "rxdb/plugins/core";

import { generateDocumentId } from "../../invoices/schema.ts";
import type { BankStatementLineDocument } from "../lines/schema.ts";
import type { BankTransactionType } from "../types.ts";
import {
  DEFAULT_BANK_CATEGORIES,
  isBankCategoryDocument,
  normalizeBankCategoryDocument,
  validateBankCategoryInput,
  type BankCategoryDocument,
  type BankCategoryPatch,
  type CreateBankCategoryInput,
} from "./schema.ts";

export const BANK_CATEGORIES_COLLECTION_NAME = "bank_categories";

export const bankCategoryJsonSchema: RxJsonSchema<BankCategoryDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    name: { type: "string" },
    type: { type: "string", maxLength: 16 },
    description: { type: "string" },
    isDefault: { type: "boolean" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: ["id", "name", "type", "isDefault", "createdAt", "updatedAt"],
};

export type BankCategoriesCollection = Collection<BankCategoryDocument, string>;

export async function seedDefaultBankCategories(
  categoriesCollection: BankCategoriesCollection,
): Promise<void> {
  if (categoriesCollection.size > 0) {
    return;
  }
  const now = new Date().toISOString();
  for (const seed of DEFAULT_BANK_CATEGORIES) {
    const doc = normalizeBankCategoryDocument({
      id: seed.id,
      name: seed.name,
      type: seed.type,
      description: seed.description,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    });
    const tx = categoriesCollection.insert(doc);
    await tx.isPersisted.promise;
  }
}

export interface CreateBankCategoriesActionsDeps {
  categoriesCollection: BankCategoriesCollection;
  linesCollection: Collection<BankStatementLineDocument, string>;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export function createBankCategoriesActions({
  categoriesCollection,
  linesCollection,
}: CreateBankCategoriesActionsDeps) {
  function listCategories(type?: BankTransactionType): BankCategoryDocument[] {
    return [...categoriesCollection.values()]
      .map((doc) => normalizeBankCategoryDocument(doc))
      .filter((doc) => (type ? doc.type === type : true))
      .sort(byName);
  }

  function getCategory(id: string): BankCategoryDocument | undefined {
    const doc = categoriesCollection.get(id);
    return doc ? normalizeBankCategoryDocument(doc) : undefined;
  }

  async function createCategory(input: CreateBankCategoryInput): Promise<BankCategoryDocument> {
    const validated = validateBankCategoryInput(input);
    const now = new Date().toISOString();
    const doc = normalizeBankCategoryDocument({
      id: generateDocumentId(),
      name: validated.name.trim(),
      type: validated.type,
      description: validated.description?.trim() ?? "",
      isDefault: validated.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    });
    const tx = categoriesCollection.insert(doc);
    await tx.isPersisted.promise;
    return doc;
  }

  async function updateCategory(
    id: string,
    patch: BankCategoryPatch,
  ): Promise<BankCategoryDocument> {
    const current = getCategory(id);
    if (!current) {
      throw new Error(`Bank category not found: ${id}`);
    }
    const candidate = { ...current, ...patch, id };
    if (!isBankCategoryDocument(candidate)) {
      throw new Error("Invalid bank category update");
    }
    const next = normalizeBankCategoryDocument(candidate);
    if (next.type !== current.type) {
      const incompatibleLines = [...linesCollection.values()].filter(
        (line) =>
          line.type !== next.type &&
          line.allocations.some((allocation) => allocation.categoryId === id),
      );
      for (const line of incompatibleLines) {
        const remaining = line.allocations.filter((allocation) => allocation.categoryId !== id);
        const lineTx = linesCollection.update(line.id, (draft) => {
          draft.allocations = remaining;
          draft.updatedAt = new Date().toISOString();
        });
        await lineTx.isPersisted.promise;
      }
    }
    const tx = categoriesCollection.update(id, (draft) => {
      Object.assign(draft, next, { updatedAt: new Date().toISOString() });
    });
    await tx.isPersisted.promise;
    return getCategory(id) ?? next;
  }

  async function deleteCategory(id: string): Promise<void> {
    if (!categoriesCollection.has(id)) {
      throw new Error(`Bank category not found: ${id}`);
    }
    const affectedLines = [...linesCollection.values()].filter((line) =>
      line.allocations.some((allocation) => allocation.categoryId === id),
    );
    for (const line of affectedLines) {
      const remaining = line.allocations.filter((allocation) => allocation.categoryId !== id);
      const tx = linesCollection.update(line.id, (draft) => {
        draft.allocations = remaining;
        draft.updatedAt = new Date().toISOString();
      });
      await tx.isPersisted.promise;
    }
    const tx = categoriesCollection.delete(id);
    await tx.isPersisted.promise;
  }

  return {
    listCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
