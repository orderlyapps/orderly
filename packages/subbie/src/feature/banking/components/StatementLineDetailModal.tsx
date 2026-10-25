import { useEffect, useState } from "react";

import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";
import { trashOutline } from "ionicons/icons";

import {
  DEFAULT_INVOICE_CURRENCY,
  formatCurrency,
  generateDocumentId,
  invoiceStatusColor,
  invoiceStatusLabel,
  invoiceTotalCents,
  type InvoiceDocument,
} from "../../invoices/schema.ts";
import {
  allocationGstAmountCents,
  BANK_GST_TYPES,
  bankGstTypeLabel,
  bankTransactionTypeColor,
  bankTransactionTypeLabel,
  isBankGstType,
  type BankAccountDocument,
  type BankCategoryDocument,
  type BankGstType,
  type BankLineAllocationInput,
  type BankStatementLineDocument,
} from "../schema.ts";

interface DraftAllocation {
  id: string;
  categoryId: string;
  amount: string;
  gstType: BankGstType;
  gstFreeAmount: string;
  notes: string;
}

export interface StatementLineDetailModalProps {
  line: BankStatementLineDocument | null;
  account?: BankAccountDocument | null;
  categories: BankCategoryDocument[];
  invoices: InvoiceDocument[];
  isOpen: boolean;
  onDismiss: () => void;
  onLinkInvoices: (line: BankStatementLineDocument, invoiceIds: string[]) => Promise<unknown>;
  onSaveAllocations: (
    line: BankStatementLineDocument,
    allocations: BankLineAllocationInput[],
  ) => Promise<unknown>;
  onDelete: (line: BankStatementLineDocument) => Promise<unknown>;
}

export const StatementLineDetailModal = ({
  line,
  account,
  categories,
  invoices,
  isOpen,
  onDismiss,
  onLinkInvoices,
  onSaveAllocations,
  onDelete,
}: StatementLineDetailModalProps) => {
  const [presentAlert] = useIonAlert();
  const [draftAllocations, setDraftAllocations] = useState<DraftAllocation[]>([]);
  const [isSavingAllocations, setIsSavingAllocations] = useState(false);

  const currency = account?.currency ?? DEFAULT_INVOICE_CURRENCY;
  const matchingCategories = line
    ? categories.filter((category) => category.type === line.type)
    : [];

  const allocationsKey = line ? JSON.stringify(line.allocations) : "";

  useEffect(() => {
    if (!isOpen || !line) {
      return;
    }
    setDraftAllocations(
      line.allocations.map((entry) => ({
        id: entry.id,
        categoryId: entry.categoryId,
        amount: (entry.amountCents / 100).toString(),
        gstType: entry.gstType ?? "gst",
        gstFreeAmount:
          entry.gstType === "part-gst" && entry.gstFreeAmountCents !== undefined
            ? (entry.gstFreeAmountCents / 100).toString()
            : "0",
        notes: entry.notes ?? "",
      })),
    );
    setIsSavingAllocations(false);
  }, [isOpen, line?.id, allocationsKey]);

  const availableGstTypes: readonly BankGstType[] =
    line?.type === "receipt" ? (["gst", "gst-free"] as const) : BANK_GST_TYPES;

  const parsedAllocations: BankLineAllocationInput[] = draftAllocations.map((entry) => {
    const trimmedAmount = entry.amount.trim();
    const numericAmount = trimmedAmount.length > 0 ? Number(trimmedAmount) : Number.NaN;
    const amountCents = Math.round(numericAmount * 100);
    const trimmedGstFree = entry.gstFreeAmount.trim();
    const numericGstFree = trimmedGstFree.length > 0 ? Number(trimmedGstFree) : Number.NaN;
    const gstFreeAmountCents = Math.round(numericGstFree * 100);
    const effectiveGstType: BankGstType =
      line?.type === "receipt" && entry.gstType === "part-gst" ? "gst" : entry.gstType;
    return {
      id: entry.id,
      categoryId: entry.categoryId,
      amountCents,
      gstType: effectiveGstType,
      ...(line?.type === "payment" && effectiveGstType === "part-gst"
        ? { gstFreeAmountCents }
        : {}),
      ...(entry.notes.trim().length > 0 ? { notes: entry.notes.trim() } : {}),
    };
  });

  const allocatedTotalCents = parsedAllocations.reduce(
    (sum, entry) =>
      sum + (Number.isFinite(entry.amountCents) && entry.amountCents > 0 ? entry.amountCents : 0),
    0,
  );
  const totalGstCents = parsedAllocations.reduce(
    (sum, entry) =>
      sum +
      (Number.isFinite(entry.amountCents) && entry.amountCents >= 0
        ? allocationGstAmountCents(entry)
        : 0),
    0,
  );
  const overAllocatedCents = line ? Math.max(0, allocatedTotalCents - line.amountCents) : 0;
  const remainingCents = line ? Math.max(0, line.amountCents - allocatedTotalCents) : 0;

  const persistedQuickCategoryId =
    line && line.allocations.length === 1 && line.allocations[0].amountCents === line.amountCents
      ? line.allocations[0].categoryId
      : "";

  const quickCategoryId =
    line &&
    persistedQuickCategoryId.length > 0 &&
    parsedAllocations.length === 1 &&
    parsedAllocations[0].categoryId === persistedQuickCategoryId &&
    parsedAllocations[0].amountCents === line.amountCents
      ? persistedQuickCategoryId
      : "";

  const allocationsValid =
    line !== null &&
    draftAllocations.every(
      (entry) =>
        entry.amount.trim().length > 0 &&
        (line.type !== "payment" ||
          entry.gstType !== "part-gst" ||
          entry.gstFreeAmount.trim().length > 0),
    ) &&
    parsedAllocations.every(
      (entry) =>
        entry.categoryId.trim().length > 0 &&
        Number.isInteger(entry.amountCents) &&
        entry.amountCents >= 0 &&
        (entry.gstFreeAmountCents === undefined ||
          (Number.isInteger(entry.gstFreeAmountCents) &&
            entry.gstFreeAmountCents >= 0 &&
            entry.gstFreeAmountCents <= entry.amountCents)),
    ) &&
    allocatedTotalCents <= line.amountCents;

  const handleQuickCategorySelect = async (categoryId: string) => {
    if (!line || !categoryId || isSavingAllocations) {
      return;
    }
    const nextAllocations: BankLineAllocationInput[] = [
      {
        id: generateDocumentId(),
        categoryId,
        amountCents: line.amountCents,
        gstType: "gst",
      },
    ];
    setDraftAllocations([
      {
        id: nextAllocations[0].id ?? generateDocumentId(),
        categoryId,
        amount: (line.amountCents / 100).toString(),
        gstType: "gst",
        gstFreeAmount: "0",
        notes: "",
      },
    ]);
    setIsSavingAllocations(true);
    try {
      await onSaveAllocations(line, nextAllocations);
    } finally {
      setIsSavingAllocations(false);
    }
  };

  const addSplitAllocation = () => {
    if (!line) {
      return;
    }
    const defaultCategory = matchingCategories[0];
    setDraftAllocations((current) => [
      ...current,
      {
        id: generateDocumentId(),
        categoryId: defaultCategory?.id ?? "",
        amount: (remainingCents / 100).toString(),
        gstType: "gst",
        gstFreeAmount: "0",
        notes: "",
      },
    ]);
  };

  const updateDraftAllocation = (id: string, patch: Partial<DraftAllocation>) => {
    setDraftAllocations((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const removeDraftAllocation = (id: string) => {
    setDraftAllocations((current) => current.filter((entry) => entry.id !== id));
  };

  const handleSaveAllocationsClick = async () => {
    if (!line || !allocationsValid || isSavingAllocations) {
      return;
    }
    setIsSavingAllocations(true);
    try {
      await onSaveAllocations(line, parsedAllocations);
    } finally {
      setIsSavingAllocations(false);
    }
  };

  const confirmDelete = () => {
    if (!line) {
      return;
    }
    void presentAlert({
      header: "Delete Statement Line",
      message: `Delete "${line.description}"? This cannot be undone.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Delete",
          role: "destructive",
          handler: () => {
            void onDelete(line)
              .then(() => onDismiss())
              .catch(() => {});
          },
        },
      ],
    });
  };

  const linkedInvoiceEntries = line
    ? line.invoiceIds.map((id) => ({
        id,
        invoice: invoices.find((inv) => inv.id === id),
      }))
    : [];

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Close</IonButton>
          </IonButtons>
          <IonTitle>Statement Line</IonTitle>
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
              {line.balanceCents !== undefined ? (
                <IonItem>
                  <IonLabel>Running Balance</IonLabel>
                  <IonNote slot="end">{formatCurrency(line.balanceCents, currency)}</IonNote>
                </IonItem>
              ) : null}
            </IonList>

            <IonList inset>
              <IonListHeader>Linked Invoices</IonListHeader>
              {linkedInvoiceEntries.map(({ id: invoiceId, invoice }) => (
                <IonItem key={invoiceId}>
                  {invoice ? (
                    <>
                      <IonLabel>
                        <h3>
                          {invoice.number} — {invoice.clientName}
                        </h3>
                        <IonNote>
                          {formatCurrency(invoiceTotalCents(invoice), invoice.currency)} ·{" "}
                          {invoice.issueDate}
                        </IonNote>
                      </IonLabel>
                      <IonBadge slot="end" color={invoiceStatusColor(invoice.status)}>
                        {invoiceStatusLabel(invoice.status)}
                      </IonBadge>
                    </>
                  ) : (
                    <IonLabel>
                      <h3>Deleted invoice</h3>
                      <IonNote>{invoiceId}</IonNote>
                    </IonLabel>
                  )}
                  <IonButton
                    slot="end"
                    fill="clear"
                    color="danger"
                    aria-label={`Unlink ${invoice?.number ?? invoiceId}`}
                    onClick={() => {
                      const nextIds = line.invoiceIds.filter((id) => id !== invoiceId);
                      void onLinkInvoices(line, nextIds);
                    }}
                  >
                    <IonIcon slot="icon-only" icon={trashOutline} />
                  </IonButton>
                </IonItem>
              ))}
              {invoices.length > 0 ? (
                <IonItem>
                  <IonSelect
                    label="Link Invoices (marks linked as Paid)"
                    labelPlacement="stacked"
                    multiple
                    value={line.invoiceIds}
                    placeholder="Select invoices to link"
                    onIonChange={(event) => {
                      const value = event.detail.value;
                      if (Array.isArray(value)) {
                        void onLinkInvoices(
                          line,
                          value.filter((entry): entry is string => typeof entry === "string"),
                        );
                      }
                    }}
                  >
                    {invoices.map((invoice) => (
                      <IonSelectOption key={invoice.id} value={invoice.id}>
                        {invoice.number} · {invoice.clientName} (
                        {formatCurrency(invoiceTotalCents(invoice), invoice.currency)})
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              ) : (
                <IonItem lines="none">
                  <IonNote color="medium">No invoices available to link</IonNote>
                </IonItem>
              )}
            </IonList>

            <IonList inset>
              <IonListHeader>
                Allocate {bankTransactionTypeLabel(line.type)} to Categories
              </IonListHeader>
              {matchingCategories.length > 0 ? (
                <IonItem>
                  <IonSelect
                    label="Quick Allocate (100%)"
                    labelPlacement="stacked"
                    interface="action-sheet"
                    placeholder={`Choose ${line.type} category`}
                    disabled={isSavingAllocations}
                    value={quickCategoryId}
                    onIonChange={(event) => {
                      const value = event.detail.value;
                      if (typeof value === "string" && value.length > 0) {
                        void handleQuickCategorySelect(value);
                      }
                    }}
                  >
                    {matchingCategories.map((category) => (
                      <IonSelectOption key={category.id} value={category.id}>
                        {category.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              ) : (
                <IonItem lines="none">
                  <IonNote color="medium">
                    No {line.type} categories available — add one in the Categories section
                  </IonNote>
                </IonItem>
              )}

              {draftAllocations.map((allocation) => (
                <IonItem key={allocation.id} lines="full">
                  <IonGrid className="ion-no-padding">
                    <IonRow>
                      <IonCol size="12">
                        <IonSelect
                          label="Category"
                          labelPlacement="stacked"
                          interface="action-sheet"
                          value={allocation.categoryId}
                          onIonChange={(event) => {
                            const value = event.detail.value;
                            if (typeof value === "string") {
                              updateDraftAllocation(allocation.id, { categoryId: value });
                            }
                          }}
                        >
                          {matchingCategories.map((category) => (
                            <IonSelectOption key={category.id} value={category.id}>
                              {category.name}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonCol>
                    </IonRow>
                    <IonRow>
                      <IonCol size="9">
                        <IonInput
                          label="Amount"
                          labelPlacement="stacked"
                          type="number"
                          inputmode="decimal"
                          min="0"
                          step="0.01"
                          value={allocation.amount}
                          onIonInput={(event) =>
                            updateDraftAllocation(allocation.id, {
                              amount: event.detail.value ?? "",
                            })
                          }
                        />
                      </IonCol>
                      <IonCol size="3" className="ion-align-self-end ion-text-end">
                        <IonButton
                          fill="clear"
                          color="danger"
                          aria-label="Remove allocation"
                          onClick={() => removeDraftAllocation(allocation.id)}
                        >
                          <IonIcon slot="icon-only" icon={trashOutline} />
                        </IonButton>
                      </IonCol>
                    </IonRow>
                    <IonRow>
                      <IonCol size="12">
                        <IonSelect
                          label="GST (10%)"
                          labelPlacement="stacked"
                          interface="action-sheet"
                          value={
                            line.type === "receipt" && allocation.gstType === "part-gst"
                              ? "gst"
                              : allocation.gstType
                          }
                          onIonChange={(event) => {
                            const value = event.detail.value;
                            if (isBankGstType(value) && availableGstTypes.includes(value)) {
                              updateDraftAllocation(allocation.id, { gstType: value });
                            }
                          }}
                        >
                          {availableGstTypes.map((gstOption) => (
                            <IonSelectOption key={gstOption} value={gstOption}>
                              {bankGstTypeLabel(gstOption)}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonCol>
                    </IonRow>
                    {line.type === "payment" && allocation.gstType === "part-gst" ? (
                      <IonRow>
                        <IonCol size="12">
                          <IonInput
                            label="GST Free Amount"
                            labelPlacement="stacked"
                            type="number"
                            inputmode="decimal"
                            min="0"
                            step="0.01"
                            value={allocation.gstFreeAmount}
                            onIonInput={(event) =>
                              updateDraftAllocation(allocation.id, {
                                gstFreeAmount: event.detail.value ?? "",
                              })
                            }
                          />
                        </IonCol>
                      </IonRow>
                    ) : null}
                    <IonRow>
                      <IonCol size="12">
                        <IonInput
                          label="Notes (optional)"
                          labelPlacement="stacked"
                          placeholder="Allocation note..."
                          value={allocation.notes}
                          onIonInput={(event) =>
                            updateDraftAllocation(allocation.id, {
                              notes: event.detail.value ?? "",
                            })
                          }
                        />
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </IonItem>
              ))}

              <IonItem lines="none">
                <IonLabel>
                  <IonNote color={overAllocatedCents > 0 ? "danger" : undefined}>
                    Allocated: {formatCurrency(allocatedTotalCents, currency)} ·{" "}
                    {overAllocatedCents > 0
                      ? `Over-allocated by ${formatCurrency(overAllocatedCents, currency)}`
                      : `Remaining: ${formatCurrency(remainingCents, currency)}`}
                    {allocatedTotalCents > 0
                      ? ` · GST: ${formatCurrency(totalGstCents, currency)}`
                      : ""}
                  </IonNote>
                </IonLabel>
              </IonItem>

              {matchingCategories.length > 0 ? (
                <IonItem button detail={false} onClick={addSplitAllocation}>
                  <IonLabel color="primary">Add Split Allocation</IonLabel>
                </IonItem>
              ) : null}

              <IonItem
                button
                detail={false}
                disabled={!allocationsValid || isSavingAllocations}
                onClick={() => {
                  void handleSaveAllocationsClick();
                }}
              >
                <IonLabel color="primary">Save Allocations</IonLabel>
              </IonItem>
            </IonList>

            <IonList inset>
              <IonItem button detail={false} onClick={confirmDelete}>
                <IonLabel color="danger">Delete Statement Line</IonLabel>
              </IonItem>
            </IonList>
          </>
        ) : null}
      </IonContent>
    </IonModal>
  );
};
