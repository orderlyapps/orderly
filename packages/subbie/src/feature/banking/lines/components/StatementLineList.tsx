import {
  IonBadge,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
} from "@ionic/react";

import {
  DEFAULT_INVOICE_CURRENCY,
  formatCurrency,
  type InvoiceDocument,
} from "../../../invoices/schema.ts";
import type { BankAccountDocument } from "../../accounts/schema.ts";
import type { BankCategoryDocument } from "../../categories/schema.ts";
import { bankTransactionTypeColor, bankTransactionTypeLabel } from "../../types.ts";
import {
  allocatedAmountCents,
  allocationGstAmountCents,
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
}

export const StatementLineList = ({
  lines,
  accounts = [],
  categories = [],
  invoices,
  onSelect,
  onDelete,
  emptyMessage = "No statement lines yet",
}: StatementLineListProps) => {
  const accountById = new Map(accounts.map((acc) => [acc.id, acc]));
  const categoryById = new Map(categories.map((cat) => [cat.id, cat]));
  const invoiceById = new Map((invoices ?? []).map((inv) => [inv.id, inv]));

  return (
    <IonList inset>
      {lines.length === 0 ? (
        <IonItem lines="none">
          <IonLabel>
            <IonNote>{emptyMessage}</IonNote>
          </IonLabel>
        </IonItem>
      ) : (
        lines.map((line) => {
          const account = accountById.get(line.accountId);
          const currency = account?.currency ?? DEFAULT_INVOICE_CURRENCY;
          const linkedInvoiceLabels = line.invoiceIds
            .map((id) => invoiceById.get(id)?.number ?? (invoices === undefined ? id : null))
            .filter((label): label is string => Boolean(label));
          const allocationNames = line.allocations
            .map((entry) => {
              const name = categoryById.get(entry.categoryId)?.name ?? "Category";
              if (entry.gstType) {
                if (entry.gstType === "gst-free") {
                  return `${name} (${bankGstTypeLabel("gst-free")})`;
                }
                const gstCents = allocationGstAmountCents(entry);
                return `${name} (${bankGstTypeLabel(entry.gstType)} ${formatCurrency(gstCents, currency)})`;
              }
              return name;
            })
            .filter(Boolean);
          const allocated = allocatedAmountCents(line);
          const fullyAllocated = isLineFullyAllocated(line);

          return (
            <IonItemSliding key={line.id}>
              <IonItem button detail onClick={() => onSelect?.(line)}>
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
                              : ` (${formatCurrency(allocated, currency)}/${formatCurrency(line.amountCents, currency)})`
                          }`
                        : "Unallocated"}
                  </p>
                </IonLabel>
                <div slot="end" className="ion-text-end">
                  <div>
                    <strong>
                      {line.type === "payment" ? "-" : "+"}
                      {formatCurrency(line.amountCents, currency)}
                    </strong>
                  </div>
                  <IonBadge color={bankTransactionTypeColor(line.type)}>
                    {bankTransactionTypeLabel(line.type)}
                  </IonBadge>
                  {line.isPrivate ? <IonBadge color="medium">Private</IonBadge> : null}
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
