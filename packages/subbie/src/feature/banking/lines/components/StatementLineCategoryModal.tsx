import { useEffect, useState } from "react";

import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { checkmark } from "ionicons/icons";

import { DEFAULT_INVOICE_CURRENCY, formatCurrency } from "../../../invoices/schema.ts";
import type { BankAccountDocument } from "../../accounts/schema.ts";
import type { BankCategoryDocument } from "../../categories/schema.ts";
import { bankTransactionTypeColor, bankTransactionTypeLabel, pluralize } from "../../types.ts";
import type { AllocateLineToCategoryOptions } from "../db.ts";
import {
  allocationGstAmountCents,
  allocationNetAmountCents,
  allocationTaxableAmountCents,
  BANK_GST_TYPES,
  bankGstTypeLabel,
  isBankGstType,
  type BankGstType,
} from "../gst.ts";
import type { BankStatementLineDocument } from "../schema.ts";

export interface StatementLineCategoryModalProps {
  line?: BankStatementLineDocument | null;
  lines?: readonly BankStatementLineDocument[];
  account?: BankAccountDocument | null;
  accounts?: readonly BankAccountDocument[];
  categories: BankCategoryDocument[];
  isOpen: boolean;
  onDismiss: () => void;
  onSelectCategory?: (
    line: BankStatementLineDocument,
    categoryId: string,
    options?: AllocateLineToCategoryOptions,
  ) => Promise<unknown>;
  onSelectCategoryForLines?: (
    lines: BankStatementLineDocument[],
    categoryId: string,
    options?: AllocateLineToCategoryOptions,
  ) => Promise<unknown>;
  onClearCategory?: (line: BankStatementLineDocument) => Promise<unknown>;
  onClearCategoryForLines?: (lines: BankStatementLineDocument[]) => Promise<unknown>;
  onSetPrivate?: (line: BankStatementLineDocument, isPrivate: boolean) => Promise<unknown>;
  onSetPrivateForLines?: (
    lines: BankStatementLineDocument[],
    isPrivate: boolean,
  ) => Promise<unknown>;
}

export const StatementLineCategoryModal = ({
  line,
  lines,
  account,
  accounts,
  categories,
  isOpen,
  onDismiss,
  onSelectCategory,
  onSelectCategoryForLines,
  onClearCategory,
  onClearCategoryForLines,
  onSetPrivate,
  onSetPrivateForLines,
}: StatementLineCategoryModalProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [gstType, setGstType] = useState<BankGstType>("gst");
  const [gstFreeAmount, setGstFreeAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const targetLines = lines && lines.length > 0 ? [...lines] : line ? [line] : [];
  const singleLine = targetLines.length === 1 ? targetLines[0] : null;
  const isMultiLine = targetLines.length > 1;
  const lineType = targetLines[0]?.type ?? null;
  const hasMixedTypes = lineType !== null && targetLines.some((item) => item.type !== lineType);

  const accountById = new Map((accounts ?? []).map((acc) => [acc.id, acc]));
  const uniqueAccountIds = Array.from(new Set(targetLines.map((item) => item.accountId)));
  const resolvedAccount =
    account ??
    (uniqueAccountIds.length === 1 ? (accountById.get(uniqueAccountIds[0]!) ?? null) : null);
  const currency =
    resolvedAccount?.currency ??
    (targetLines[0] ? accountById.get(targetLines[0].accountId)?.currency : undefined) ??
    DEFAULT_INVOICE_CURRENCY;

  const matchingCategories =
    lineType && !hasMixedTypes ? categories.filter((category) => category.type === lineType) : [];

  const targetKey = targetLines
    .map((item) => `${item.id}:${item.isPrivate}:${JSON.stringify(item.allocations)}`)
    .join("|");

  useEffect(() => {
    if (!isOpen || targetLines.length === 0) {
      return;
    }
    if (singleLine) {
      const primaryAllocation =
        singleLine.allocations.length === 1 ? singleLine.allocations[0] : undefined;
      const initialGstType =
        primaryAllocation?.gstType &&
        (singleLine.type === "payment" || primaryAllocation.gstType !== "part-gst")
          ? primaryAllocation.gstType
          : "gst";
      setSelectedCategoryId(primaryAllocation?.categoryId ?? "");
      setGstType(initialGstType);
      setGstFreeAmount(
        initialGstType === "part-gst" && primaryAllocation?.gstFreeAmountCents !== undefined
          ? (primaryAllocation.gstFreeAmountCents / 100).toString()
          : "0",
      );
      setNotes(primaryAllocation?.notes ?? "");
    } else {
      const firstAlloc = targetLines.every((item) => item.allocations.length === 1)
        ? targetLines[0]?.allocations[0]
        : undefined;
      const sharedCategoryId =
        firstAlloc &&
        targetLines.every((item) => item.allocations[0]?.categoryId === firstAlloc.categoryId)
          ? firstAlloc.categoryId
          : "";
      const sharedGstType: BankGstType =
        firstAlloc?.gstType &&
        firstAlloc.gstType !== "part-gst" &&
        targetLines.every((item) => (item.allocations[0]?.gstType ?? "gst") === firstAlloc.gstType)
          ? firstAlloc.gstType
          : "gst";
      const sharedNotes =
        firstAlloc &&
        targetLines.every((item) => (item.allocations[0]?.notes ?? "") === (firstAlloc.notes ?? ""))
          ? (firstAlloc.notes ?? "")
          : "";
      setSelectedCategoryId(sharedCategoryId);
      setGstType(sharedGstType);
      setGstFreeAmount("0");
      setNotes(sharedNotes);
    }
  }, [isOpen, targetKey]);

  const availableGstTypes: readonly BankGstType[] =
    isMultiLine || lineType === "receipt" ? (["gst", "gst-free"] as const) : BANK_GST_TYPES;

  const trimmedGstFree = gstFreeAmount.trim();
  const parsedGstFreeCents =
    trimmedGstFree.length > 0 ? Math.round(Number(trimmedGstFree) * 100) : Number.NaN;

  const isGstFreeValid =
    singleLine === null ||
    singleLine.type !== "payment" ||
    gstType !== "part-gst" ||
    (Number.isInteger(parsedGstFreeCents) &&
      parsedGstFreeCents >= 0 &&
      parsedGstFreeCents <= singleLine.amountCents);

  const effectiveGstFreeCents = singleLine
    ? gstType === "gst-free"
      ? singleLine.amountCents
      : singleLine.type === "payment" &&
          gstType === "part-gst" &&
          Number.isInteger(parsedGstFreeCents) &&
          parsedGstFreeCents >= 0
        ? Math.min(singleLine.amountCents, parsedGstFreeCents)
        : 0
    : 0;

  const totalsByCurrency = new Map<
    string,
    { total: number; gst: number; taxable: number; net: number }
  >();
  for (const item of targetLines) {
    const itemCurrency = accountById.get(item.accountId)?.currency ?? DEFAULT_INVOICE_CURRENCY;
    const preview = {
      amountCents: item.amountCents,
      gstType,
      gstFreeAmountCents: singleLine ? effectiveGstFreeCents : 0,
    };
    const entry = totalsByCurrency.get(itemCurrency) ?? { total: 0, gst: 0, taxable: 0, net: 0 };
    entry.total += item.amountCents;
    entry.gst += allocationGstAmountCents(preview);
    entry.taxable += allocationTaxableAmountCents(preview);
    entry.net += allocationNetAmountCents(preview);
    totalsByCurrency.set(itemCurrency, entry);
  }

  const formatTotals = (
    pick: (entry: { total: number; gst: number; taxable: number; net: number }) => number,
    sign = "",
  ) =>
    [...totalsByCurrency.entries()]
      .map(([entryCurrency, entry]) => `${sign}${formatCurrency(pick(entry), entryCurrency)}`)
      .join(" · ");

  const hasSelectHandler = Boolean(onSelectCategoryForLines || onSelectCategory);
  const hasClearHandler = Boolean(onClearCategoryForLines || onClearCategory);
  const hasPrivateHandler = Boolean(onSetPrivateForLines || onSetPrivate);

  const allPrivate = targetLines.length > 0 && targetLines.every((item) => item.isPrivate);
  const somePrivate = targetLines.some((item) => item.isPrivate);
  const hasAllocations = targetLines.some((item) => item.allocations.length > 0);

  const canSave =
    targetLines.length > 0 &&
    !hasMixedTypes &&
    hasSelectHandler &&
    selectedCategoryId.trim().length > 0 &&
    matchingCategories.some((category) => category.id === selectedCategoryId) &&
    isGstFreeValid &&
    !isSaving;

  const handleSave = async () => {
    if (targetLines.length === 0 || !canSave) {
      return;
    }
    setIsSaving(true);
    try {
      const trimmedNotes = notes.trim();
      const options: AllocateLineToCategoryOptions = {
        gstType,
        ...(singleLine && singleLine.type === "payment" && gstType === "part-gst"
          ? { gstFreeAmountCents: parsedGstFreeCents }
          : {}),
        ...(trimmedNotes.length > 0 ? { notes: trimmedNotes } : {}),
      };
      if (onSelectCategoryForLines) {
        await onSelectCategoryForLines(targetLines, selectedCategoryId, options);
      } else if (onSelectCategory) {
        for (const item of targetLines) {
          await onSelectCategory(item, selectedCategoryId, options);
        }
      }
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (targetLines.length === 0 || !hasClearHandler || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      if (onClearCategoryForLines) {
        await onClearCategoryForLines(targetLines);
      } else if (onClearCategory) {
        for (const item of targetLines) {
          await onClearCategory(item);
        }
      }
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPrivate = async (isPrivate: boolean) => {
    if (targetLines.length === 0 || !hasPrivateHandler || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      if (onSetPrivateForLines) {
        await onSetPrivateForLines(targetLines, isPrivate);
      } else if (onSetPrivate) {
        for (const item of targetLines) {
          await onSetPrivate(item, isPrivate);
        }
      }
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  const sortedDates = targetLines.map((item) => item.date).sort();
  const minDate = sortedDates[0] ?? "";
  const maxDate = sortedDates[sortedDates.length - 1] ?? "";
  const dateRangeLabel =
    minDate && maxDate ? (minDate === maxDate ? minDate : `${minDate} – ${maxDate}`) : "";
  const multiAccountLabel = resolvedAccount
    ? resolvedAccount.name
    : uniqueAccountIds.length > 1
      ? pluralize(uniqueAccountIds.length, "account")
      : "";
  const multiSubtitle = [dateRangeLabel, multiAccountLabel].filter(Boolean).join(" · ");

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>
            {isMultiLine ? `Categorise ${targetLines.length} Lines` : "Categorise Line"}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              strong
              disabled={!canSave}
              onClick={() => {
                void handleSave();
              }}
            >
              Save
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {targetLines.length > 0 && lineType ? (
          <>
            <IonList inset>
              <IonItem>
                <IonLabel>
                  <h2>
                    {singleLine
                      ? singleLine.description
                      : `${pluralize(targetLines.length, "statement line")} selected`}
                  </h2>
                  <p>
                    {singleLine
                      ? `${singleLine.date}${resolvedAccount ? ` · ${resolvedAccount.name}` : ""}`
                      : multiSubtitle}
                  </p>
                </IonLabel>
                <IonBadge slot="end" color={bankTransactionTypeColor(lineType)}>
                  {isMultiLine
                    ? `${bankTransactionTypeLabel(lineType)}s`
                    : bankTransactionTypeLabel(lineType)}
                </IonBadge>
              </IonItem>
              <IonItem>
                <IonLabel>{isMultiLine ? "Total Amount" : "Amount"}</IonLabel>
                <IonNote slot="end">
                  <strong>
                    {formatTotals((entry) => entry.total, lineType === "payment" ? "-" : "+")}
                  </strong>
                </IonNote>
              </IonItem>
            </IonList>

            {allPrivate ? (
              <IonList inset>
                <IonItem lines="none">
                  <IonLabel>
                    <IonNote color="medium">
                      Marked as Private — excluded from business totals and categorisation
                    </IonNote>
                  </IonLabel>
                </IonItem>
                {hasPrivateHandler ? (
                  <IonItem
                    button
                    detail={false}
                    disabled={isSaving}
                    onClick={() => {
                      void handleSetPrivate(false);
                    }}
                  >
                    <IonLabel color="primary">
                      {isMultiLine ? "Mark All as Business" : "Mark as Business"}
                    </IonLabel>
                  </IonItem>
                ) : null}
              </IonList>
            ) : (
              <>
                <IonList inset>
                  <IonListHeader>
                    Select {bankTransactionTypeLabel(lineType)} Category
                  </IonListHeader>
                  {matchingCategories.length === 0 ? (
                    <IonItem lines="none">
                      <IonNote color="medium">
                        No {lineType} categories available — add one in the Categories section
                      </IonNote>
                    </IonItem>
                  ) : (
                    matchingCategories.map((category) => {
                      const isSelected = selectedCategoryId === category.id;
                      return (
                        <IonItem
                          key={category.id}
                          button
                          detail={false}
                          disabled={isSaving}
                          onClick={() => setSelectedCategoryId(category.id)}
                        >
                          <IonLabel>
                            <h2>{category.name}</h2>
                            {category.description ? (
                              <IonNote>{category.description}</IonNote>
                            ) : null}
                          </IonLabel>
                          {isSelected ? (
                            <IonIcon
                              slot="end"
                              icon={checkmark}
                              color="primary"
                              aria-label="Selected"
                            />
                          ) : null}
                        </IonItem>
                      );
                    })
                  )}
                </IonList>

                <IonList inset>
                  <IonListHeader>GST (10%)</IonListHeader>
                  <IonItem
                    lines={
                      singleLine && singleLine.type === "payment" && gstType === "part-gst"
                        ? "full"
                        : "none"
                    }
                  >
                    <IonSegment
                      value={gstType}
                      onIonChange={(event) => {
                        const value = event.detail.value;
                        if (isBankGstType(value) && availableGstTypes.includes(value)) {
                          setGstType(value);
                        }
                      }}
                    >
                      {availableGstTypes.map((typeOption) => (
                        <IonSegmentButton key={typeOption} value={typeOption}>
                          <IonLabel>{bankGstTypeLabel(typeOption)}</IonLabel>
                        </IonSegmentButton>
                      ))}
                    </IonSegment>
                  </IonItem>

                  {singleLine && singleLine.type === "payment" && gstType === "part-gst" ? (
                    <IonItem>
                      <IonInput
                        label="GST Free Amount"
                        labelPlacement="stacked"
                        type="number"
                        inputmode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={gstFreeAmount}
                        onIonInput={(event) => setGstFreeAmount(event.detail.value ?? "")}
                      />
                    </IonItem>
                  ) : null}

                  <IonItem lines="none">
                    <IonLabel>
                      <IonNote color={!isGstFreeValid ? "danger" : undefined}>
                        {!isGstFreeValid && singleLine
                          ? `Enter a GST free amount between ${formatCurrency(0, currency)} and ${formatCurrency(singleLine.amountCents, currency)}`
                          : gstType === "gst"
                            ? `GST (10%): ${formatTotals((entry) => entry.gst)} · Net (ex-GST): ${formatTotals((entry) => entry.net)}`
                            : gstType === "gst-free"
                              ? `GST Free: ${formatTotals((entry) => entry.total)} · GST: ${formatTotals((entry) => entry.gst)}`
                              : `GST Free: ${formatCurrency(effectiveGstFreeCents, currency)} · Taxable: ${formatTotals((entry) => entry.taxable)} · GST (10%): ${formatTotals((entry) => entry.gst)}`}
                      </IonNote>
                    </IonLabel>
                  </IonItem>
                </IonList>

                <IonList inset>
                  <IonItem>
                    <IonInput
                      label="Notes (optional)"
                      labelPlacement="stacked"
                      placeholder="Add a categorisation note..."
                      value={notes}
                      onIonInput={(event) => setNotes(event.detail.value ?? "")}
                    />
                  </IonItem>
                </IonList>

                {hasAllocations && hasClearHandler ? (
                  <IonList inset>
                    <IonItem
                      button
                      detail={false}
                      disabled={isSaving}
                      onClick={() => {
                        void handleClear();
                      }}
                    >
                      <IonLabel color="danger">Clear Category</IonLabel>
                    </IonItem>
                  </IonList>
                ) : null}

                {hasPrivateHandler ? (
                  <IonList inset>
                    {somePrivate ? (
                      <IonItem
                        button
                        detail={false}
                        disabled={isSaving}
                        onClick={() => {
                          void handleSetPrivate(false);
                        }}
                      >
                        <IonLabel color="primary">Mark All as Business</IonLabel>
                      </IonItem>
                    ) : null}
                    <IonItem
                      button
                      detail={false}
                      disabled={isSaving}
                      onClick={() => {
                        void handleSetPrivate(true);
                      }}
                    >
                      <IonLabel>Mark as Private (non-business)</IonLabel>
                      {hasAllocations ? (
                        <IonNote slot="end">allocations will be removed</IonNote>
                      ) : null}
                    </IonItem>
                  </IonList>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </IonContent>
    </IonModal>
  );
};
