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
import { bankTransactionTypeColor, bankTransactionTypeLabel } from "../../types.ts";
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
  line: BankStatementLineDocument | null;
  account?: BankAccountDocument | null;
  categories: BankCategoryDocument[];
  isOpen: boolean;
  onDismiss: () => void;
  onSelectCategory: (
    line: BankStatementLineDocument,
    categoryId: string,
    options?: AllocateLineToCategoryOptions,
  ) => Promise<unknown>;
  onClearCategory?: (line: BankStatementLineDocument) => Promise<unknown>;
  onSetPrivate?: (line: BankStatementLineDocument, isPrivate: boolean) => Promise<unknown>;
}

export const StatementLineCategoryModal = ({
  line,
  account,
  categories,
  isOpen,
  onDismiss,
  onSelectCategory,
  onClearCategory,
  onSetPrivate,
}: StatementLineCategoryModalProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [gstType, setGstType] = useState<BankGstType>("gst");
  const [gstFreeAmount, setGstFreeAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const currency = account?.currency ?? DEFAULT_INVOICE_CURRENCY;
  const matchingCategories = line
    ? categories.filter((category) => category.type === line.type)
    : [];

  const allocationsKey = line ? JSON.stringify(line.allocations) : "";

  useEffect(() => {
    if (!isOpen || !line) {
      return;
    }
    const primaryAllocation = line.allocations.length === 1 ? line.allocations[0] : undefined;
    const initialGstType =
      primaryAllocation?.gstType &&
      (line.type === "payment" || primaryAllocation.gstType !== "part-gst")
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
    setIsSaving(false);
  }, [isOpen, line?.id, allocationsKey]);

  const availableGstTypes: readonly BankGstType[] =
    line?.type === "receipt" ? (["gst", "gst-free"] as const) : BANK_GST_TYPES;

  const trimmedGstFree = gstFreeAmount.trim();
  const parsedGstFreeCents =
    trimmedGstFree.length > 0 ? Math.round(Number(trimmedGstFree) * 100) : Number.NaN;

  const isGstFreeValid =
    line === null ||
    line.type !== "payment" ||
    gstType !== "part-gst" ||
    (Number.isInteger(parsedGstFreeCents) &&
      parsedGstFreeCents >= 0 &&
      parsedGstFreeCents <= line.amountCents);

  const effectiveGstFreeCents = line
    ? gstType === "gst-free"
      ? line.amountCents
      : line.type === "payment" &&
          gstType === "part-gst" &&
          Number.isInteger(parsedGstFreeCents) &&
          parsedGstFreeCents >= 0
        ? Math.min(line.amountCents, parsedGstFreeCents)
        : 0
    : 0;

  const gstPreviewAllocation = line
    ? {
        amountCents: line.amountCents,
        gstType,
        gstFreeAmountCents: effectiveGstFreeCents,
      }
    : null;

  const gstAmountCents = gstPreviewAllocation ? allocationGstAmountCents(gstPreviewAllocation) : 0;
  const taxableAmountCents = gstPreviewAllocation
    ? allocationTaxableAmountCents(gstPreviewAllocation)
    : 0;
  const netAmountCents = gstPreviewAllocation ? allocationNetAmountCents(gstPreviewAllocation) : 0;

  const canSave =
    line !== null &&
    selectedCategoryId.trim().length > 0 &&
    matchingCategories.some((category) => category.id === selectedCategoryId) &&
    isGstFreeValid &&
    !isSaving;

  const handleSave = async () => {
    if (!line || !canSave) {
      return;
    }
    setIsSaving(true);
    try {
      const trimmedNotes = notes.trim();
      const options: AllocateLineToCategoryOptions = {
        gstType,
        ...(line.type === "payment" && gstType === "part-gst"
          ? { gstFreeAmountCents: parsedGstFreeCents }
          : {}),
        ...(trimmedNotes.length > 0 ? { notes: trimmedNotes } : {}),
      };
      await onSelectCategory(line, selectedCategoryId, options);
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!line || !onClearCategory || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onClearCategory(line);
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPrivate = async (isPrivate: boolean) => {
    if (!line || !onSetPrivate || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onSetPrivate(line, isPrivate);
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>Categorise Line</IonTitle>
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
        {line ? (
          <>
            <IonList inset>
              <IonItem>
                <IonLabel>
                  <h2>{line.description}</h2>
                  <p>
                    {line.date}
                    {account ? ` · ${account.name}` : ""}
                  </p>
                </IonLabel>
                <IonBadge slot="end" color={bankTransactionTypeColor(line.type)}>
                  {bankTransactionTypeLabel(line.type)}
                </IonBadge>
              </IonItem>
              <IonItem>
                <IonLabel>Amount</IonLabel>
                <IonNote slot="end">
                  <strong>
                    {line.type === "payment" ? "-" : "+"}
                    {formatCurrency(line.amountCents, currency)}
                  </strong>
                </IonNote>
              </IonItem>
            </IonList>

            {line.isPrivate ? (
              <IonList inset>
                <IonItem lines="none">
                  <IonLabel>
                    <IonNote color="medium">
                      Marked as Private — excluded from business totals and categorisation
                    </IonNote>
                  </IonLabel>
                </IonItem>
                {onSetPrivate ? (
                  <IonItem
                    button
                    detail={false}
                    disabled={isSaving}
                    onClick={() => {
                      void handleSetPrivate(false);
                    }}
                  >
                    <IonLabel color="primary">Mark as Business</IonLabel>
                  </IonItem>
                ) : null}
              </IonList>
            ) : (
              <>
                <IonList inset>
                  <IonListHeader>
                    Select {bankTransactionTypeLabel(line.type)} Category
                  </IonListHeader>
                  {matchingCategories.length === 0 ? (
                    <IonItem lines="none">
                      <IonNote color="medium">
                        No {line.type} categories available — add one in the Categories section
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
                    lines={line.type === "payment" && gstType === "part-gst" ? "full" : "none"}
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

                  {line.type === "payment" && gstType === "part-gst" ? (
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
                        {!isGstFreeValid
                          ? `Enter a GST free amount between ${formatCurrency(0, currency)} and ${formatCurrency(line.amountCents, currency)}`
                          : gstType === "gst"
                            ? `GST (10%): ${formatCurrency(gstAmountCents, currency)} · Net (ex-GST): ${formatCurrency(netAmountCents, currency)}`
                            : gstType === "gst-free"
                              ? `GST Free: ${formatCurrency(line.amountCents, currency)} · GST: ${formatCurrency(0, currency)}`
                              : `GST Free: ${formatCurrency(effectiveGstFreeCents, currency)} · Taxable: ${formatCurrency(taxableAmountCents, currency)} · GST (10%): ${formatCurrency(gstAmountCents, currency)}`}
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

                {line.allocations.length > 0 && onClearCategory ? (
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

                {onSetPrivate ? (
                  <IonList inset>
                    <IonItem
                      button
                      detail={false}
                      disabled={isSaving}
                      onClick={() => {
                        void handleSetPrivate(true);
                      }}
                    >
                      <IonLabel>Mark as Private (non-business)</IonLabel>
                      {line.allocations.length > 0 ? (
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
