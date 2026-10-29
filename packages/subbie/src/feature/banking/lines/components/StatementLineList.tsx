import {
  IonButton,
  IonCheckbox,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonText,
} from "@ionic/react";

import { formatAmount, type InvoiceDocument } from "../../../invoices/schema.ts";
import type { BankAccountDocument } from "../../accounts/schema.ts";
import type { BankCategoryDocument } from "../../categories/schema.ts";
import {
  bankTransactionTypeColor,
  bankTransactionTypeLabel,
  pluralize,
  type BankTransactionType,
} from "../../types.ts";
import {
  allocatedAmountCents,
  allocationGstAmountCents,
  BANK_GST_RATE,
  bankGstTypeLabel,
  isLineFullyAllocated,
} from "../gst.ts";
import type { BankStatementLineDocument } from "../schema.ts";

export interface StatementLineListProps {
  lines: BankStatementLineDocument[];
  accounts?: BankAccountDocument[];
  categories?: BankCategoryDocument[];
  invoices?: InvoiceDocument[];
  onSelect?: (line: BankStatementLineDocument) => void;
  onDelete?: (line: BankStatementLineDocument) => void;
  emptyMessage?: string;
  selectionMode?: boolean;
  selectedLineIds?: readonly string[];
  lockedTransactionType?: BankTransactionType | null;
  onToggleSelectionMode?: () => void;
  onToggleSelectLine?: (line: BankStatementLineDocument) => void;
  onSelectAll?: (lines: BankStatementLineDocument[]) => void;
  onClearSelection?: () => void;
  onCategoriseSelected?: () => void;
  gstRate?: number;
  gstRegistered?: boolean;
}

export const StatementLineList = ({
  lines,
  accounts = [],
  categories = [],
  invoices,
  onSelect,
  onDelete,
  emptyMessage = "No statement lines yet",
  selectionMode = false,
  selectedLineIds = [],
  lockedTransactionType,
  onToggleSelectionMode,
  onToggleSelectLine,
  onSelectAll,
  onClearSelection,
  onCategoriseSelected,
  gstRate = BANK_GST_RATE,
  gstRegistered = true,
}: StatementLineListProps) => {
  const accountById = new Map(accounts.map((acc) => [acc.id, acc]));
  const categoryById = new Map(categories.map((cat) => [cat.id, cat]));
  const invoiceById = new Map((invoices ?? []).map((inv) => [inv.id, inv]));
  const selectedSet = new Set(selectedLineIds);
  const selectedLines = lines.filter((line) => selectedSet.has(line.id));
  const selectedCount = selectedLines.length;

  const hasPayments = lines.some((line) => line.type === "payment");
  const hasReceipts = lines.some((line) => line.type === "receipt");
  const singleListType: BankTransactionType | null =
    hasPayments && !hasReceipts ? "payment" : hasReceipts && !hasPayments ? "receipt" : null;

  const effectiveLockedType: BankTransactionType | null =
    lockedTransactionType ?? selectedLines[0]?.type ?? singleListType;

  const selectableLines = effectiveLockedType
    ? lines.filter((line) => line.type === effectiveLockedType)
    : [];
  const allSelectableSelected =
    selectableLines.length > 0 && selectableLines.every((line) => selectedSet.has(line.id));

  return (
    <IonList inset>
      {lines.length > 0 && (onToggleSelectionMode || selectionMode) ? (
        <IonListHeader>
          <IonLabel>
            {selectionMode
              ? selectedCount > 0
                ? `${pluralize(selectedCount, "line")} selected`
                : "Select Lines"
              : "Statement Lines"}
          </IonLabel>
          {onToggleSelectionMode ? (
            <IonButton onClick={onToggleSelectionMode}>
              {selectionMode ? "Done" : "Select"}
            </IonButton>
          ) : null}
        </IonListHeader>
      ) : null}

      {lines.length > 0 && selectionMode ? (
        <IonItem lines="full">
          {selectableLines.length > 0 && (onSelectAll || onClearSelection) ? (
            <IonButton
              slot="start"
              fill="clear"
              size="small"
              onClick={() => {
                if (allSelectableSelected) {
                  onClearSelection?.();
                } else {
                  onSelectAll?.(selectableLines);
                }
              }}
            >
              {allSelectableSelected
                ? "Deselect All"
                : singleListType
                  ? "Select All"
                  : `Select All ${bankTransactionTypeLabel(effectiveLockedType!)}s`}
            </IonButton>
          ) : (
            <IonLabel>
              <IonNote>Select a payment or receipt to choose matching lines</IonNote>
            </IonLabel>
          )}
          {onCategoriseSelected ? (
            <IonButton
              slot="end"
              size="small"
              disabled={selectedCount === 0}
              onClick={onCategoriseSelected}
            >
              Categorise{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </IonButton>
          ) : null}
        </IonItem>
      ) : null}

      {lines.length === 0 ? (
        <IonItem lines="none">
          <IonLabel>
            <IonNote>{emptyMessage}</IonNote>
          </IonLabel>
        </IonItem>
      ) : (
        lines.map((line) => {
          const account = accountById.get(line.accountId);
          const linkedInvoiceLabels = line.invoiceIds
            .map((id) => invoiceById.get(id)?.number ?? (invoices === undefined ? id : null))
            .filter((label): label is string => Boolean(label));
          const allocationNames = line.allocations
            .map((entry) => {
              const name = categoryById.get(entry.categoryId)?.name ?? "Category";
              if (entry.gstType && gstRegistered) {
                if (entry.gstType === "gst-free") {
                  return `${name} (${bankGstTypeLabel("gst-free")})`;
                }
                const gstCents = allocationGstAmountCents(entry, gstRate);
                return `${name} (${bankGstTypeLabel(entry.gstType)} ${formatAmount(gstCents)})`;
              }
              return name;
            })
            .filter(Boolean);
          const allocated = allocatedAmountCents(line);
          const fullyAllocated = isLineFullyAllocated(line);
          const isSelected = selectedSet.has(line.id);
          const isTypeDisabled =
            selectionMode && effectiveLockedType !== null && line.type !== effectiveLockedType;

          return (
            <IonItemSliding key={line.id}>
              <IonItem
                button
                detail={!selectionMode}
                disabled={isTypeDisabled}
                onClick={() => {
                  if (selectionMode) {
                    if (!isTypeDisabled) {
                      onToggleSelectLine?.(line);
                    }
                  } else {
                    onSelect?.(line);
                  }
                }}
              >
                {selectionMode ? (
                  <IonCheckbox
                    slot="start"
                    checked={isSelected}
                    disabled={isTypeDisabled}
                    aria-label={`Select ${line.description}`}
                    style={{ pointerEvents: "none" }}
                  />
                ) : null}
                <IonLabel>
                  <h2>{line.description}</h2>
                  <IonNote>
                    {line.date}
                    {account ? ` · ${account.name}` : ""}
                  </IonNote>
                  <p>
                    {linkedInvoiceLabels.length > 0
                      ? `Invoices: ${linkedInvoiceLabels.join(", ")}`
                      : "No linked invoices"}
                    {" · "}
                    {line.isPrivate
                      ? "Private — excluded from totals"
                      : allocationNames.length > 0
                        ? `${allocationNames.join(", ")}${
                            fullyAllocated
                              ? ""
                              : ` (${formatAmount(allocated)}/${formatAmount(line.amountCents)})`
                          }`
                        : "Unallocated"}
                  </p>
                </IonLabel>
                <div slot="end" className="ion-text-end">
                  <IonText color={line.isPrivate ? "medium" : bankTransactionTypeColor(line.type)}>
                    <strong>
                      {line.type === "payment" ? "-" : "+"}
                      {formatAmount(line.amountCents)}
                    </strong>
                  </IonText>
                </div>
              </IonItem>
              {onDelete ? (
                <IonItemOptions side="end">
                  <IonItemOption color="danger" onClick={() => onDelete(line)}>
                    Delete
                  </IonItemOption>
                </IonItemOptions>
              ) : null}
            </IonItemSliding>
          );
        })
      )}
    </IonList>
  );
};
