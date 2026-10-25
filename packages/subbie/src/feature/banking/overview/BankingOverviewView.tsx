import {
  IonBadge,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSpinner,
} from "@ionic/react";
import {
  checkmarkDoneOutline,
  documentTextOutline,
  pricetagsOutline,
  walletOutline,
} from "ionicons/icons";

import { formatCurrency } from "../../invoices/index.ts";
import type { BankingStore } from "../db.ts";
import { useBanking } from "../hooks.ts";
import { bankTransactionTypeColor, bankTransactionTypeLabel, pluralize } from "../types.ts";
import { summarizeBankingOverview } from "./schema.ts";

export interface BankingOverviewViewProps {
  store?: BankingStore;
  statementsRouterLink?: string;
  categoriseRouterLink?: string;
  accountsRouterLink?: string;
  categoriesRouterLink?: string;
}

function signedCurrency(amountCents: number, currency: string): string {
  const prefix = amountCents > 0 ? "+" : amountCents < 0 ? "-" : "";
  return `${prefix}${formatCurrency(Math.abs(amountCents), currency)}`;
}

export const BankingOverviewView = ({
  store: customStore,
  statementsRouterLink = "/banking/statements",
  categoriseRouterLink = "/banking/categorise",
  accountsRouterLink = "/banking/accounts",
  categoriesRouterLink = "/banking/categories",
}: BankingOverviewViewProps) => {
  const { accounts, categories, statements, statementLines, isLoading, error } =
    useBanking(customStore);

  if (isLoading || error) {
    return (
      <IonItem lines="none">
        {isLoading ? <IonSpinner slot="start" /> : null}
        <IonNote color={error ? "danger" : undefined}>
          {error ? error.message : "Loading banking…"}
        </IonNote>
      </IonItem>
    );
  }

  const overview = summarizeBankingOverview({
    accounts,
    categories,
    statements,
    statementLines,
  });
  const { categorisation } = overview;
  const allocatedCategories = overview.categorySummaries.filter(
    (entry) => entry.allocatedCents > 0 || entry.allocationCount > 0,
  );
  const multiCurrency = overview.cashFlowByCurrency.length > 1;

  return (
    <>
      <IonList inset>
        <IonItem button detail routerLink={statementsRouterLink}>
          <IonIcon aria-hidden="true" icon={documentTextOutline} slot="start" />
          <IonLabel>
            <h2>Statements</h2>
            <IonNote>
              {pluralize(overview.totalStatements, "statement")} ·{" "}
              {pluralize(overview.totalLines, "line")}
            </IonNote>
          </IonLabel>
          <IonNote slot="end">{overview.totalStatements}</IonNote>
        </IonItem>

        <IonItem button detail routerLink={categoriseRouterLink}>
          <IonIcon aria-hidden="true" icon={checkmarkDoneOutline} slot="start" />
          <IonLabel>
            <h2>Categorise Lines</h2>
            <IonNote>
              {overview.totalLines === 0
                ? "Assign categories to statement lines"
                : `${categorisation.categorisedLines} of ${categorisation.totalLines} categorised`}
            </IonNote>
          </IonLabel>
          {categorisation.needsAttentionLines > 0 ? (
            <IonBadge slot="end" color="warning">
              {categorisation.needsAttentionLines} to review
            </IonBadge>
          ) : (
            <IonNote slot="end">{overview.totalLines}</IonNote>
          )}
        </IonItem>

        <IonItem button detail routerLink={accountsRouterLink}>
          <IonIcon aria-hidden="true" icon={walletOutline} slot="start" />
          <IonLabel>
            <h2>Accounts</h2>
            <IonNote>Bank accounts and CSV presets</IonNote>
          </IonLabel>
          <IonNote slot="end">{overview.totalAccounts}</IonNote>
        </IonItem>

        <IonItem button detail routerLink={categoriesRouterLink}>
          <IonIcon aria-hidden="true" icon={pricetagsOutline} slot="start" />
          <IonLabel>
            <h2>Categories</h2>
            <IonNote>
              {overview.receiptCategoryCount} receipt · {overview.paymentCategoryCount} payment
            </IonNote>
          </IonLabel>
          <IonNote slot="end">{overview.totalCategories}</IonNote>
        </IonItem>
      </IonList>

      <IonList inset>
        <IonListHeader>Cash Flow Summary</IonListHeader>
        {overview.cashFlowByCurrency.map((cf) => {
          const suffix = multiCurrency ? ` (${cf.currency})` : "";
          return (
            <div key={cf.currency}>
              <IonItem>
                <IonLabel>
                  <h2>Total Receipts{suffix}</h2>
                  <IonNote>{pluralize(cf.receiptCount, "receipt")}</IonNote>
                </IonLabel>
                <IonNote slot="end" color="success">
                  <strong>+{formatCurrency(cf.totalReceiptsCents, cf.currency)}</strong>
                </IonNote>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h2>Total Payments{suffix}</h2>
                  <IonNote>{pluralize(cf.paymentCount, "payment")}</IonNote>
                </IonLabel>
                <IonNote slot="end" color="danger">
                  <strong>-{formatCurrency(cf.totalPaymentsCents, cf.currency)}</strong>
                </IonNote>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h2>Net Cash Flow{suffix}</h2>
                  <IonNote>{pluralize(cf.receiptCount + cf.paymentCount, "transaction")}</IonNote>
                </IonLabel>
                <IonNote
                  slot="end"
                  color={
                    cf.netCashFlowCents > 0
                      ? "success"
                      : cf.netCashFlowCents < 0
                        ? "danger"
                        : "medium"
                  }
                >
                  <strong>{signedCurrency(cf.netCashFlowCents, cf.currency)}</strong>
                </IonNote>
              </IonItem>
            </div>
          );
        })}
      </IonList>

      <IonList inset>
        <IonListHeader>Categorisation Progress</IonListHeader>
        <IonItem button detail routerLink={categoriseRouterLink}>
          <IonLabel>
            <h2>
              {overview.totalLines === 0
                ? "No statement lines imported"
                : categorisation.needsAttentionLines === 0
                  ? "All lines categorised"
                  : `${pluralize(categorisation.needsAttentionLines, "line")} ${
                      categorisation.needsAttentionLines === 1 ? "needs" : "need"
                    } attention`}
            </h2>
            <IonNote>
              {overview.totalLines === 0
                ? "Import a statement CSV to track categorisation"
                : `${categorisation.categorisedLines} of ${categorisation.totalLines} categorised (${categorisation.completionPercent}%)`}
            </IonNote>
          </IonLabel>
          <IonBadge
            slot="end"
            color={
              overview.totalLines === 0
                ? "medium"
                : categorisation.needsAttentionLines === 0
                  ? "success"
                  : "warning"
            }
          >
            {categorisation.completionPercent}%
          </IonBadge>
        </IonItem>

        {(
          [
            ["uncategorised", "Uncategorised", categorisation.uncategorisedLines, "danger"],
            [
              "partially-categorised",
              "Partially Categorised",
              categorisation.partiallyCategorisedLines,
              "warning",
            ],
            ["categorised", "Categorised", categorisation.categorisedLines, "success"],
            ["private", "Private", categorisation.privateLines, "medium"],
          ] as const
        ).map(([filter, label, count, activeColor]) => (
          <IonItem
            key={filter}
            button
            detail
            routerLink={`${categoriseRouterLink}?categorisation=${filter}`}
          >
            <IonLabel>
              <h3>{label}</h3>
            </IonLabel>
            <IonBadge slot="end" color={count > 0 ? activeColor : "medium"}>
              {count}
            </IonBadge>
          </IonItem>
        ))}

        <IonItem>
          <IonLabel>
            <h3>Linked to Invoices</h3>
          </IonLabel>
          <IonNote slot="end">{pluralize(categorisation.linkedInvoiceLineCount, "line")}</IonNote>
        </IonItem>
      </IonList>

      <IonList inset>
        <IonListHeader>Account Summary</IonListHeader>
        {overview.accountSummaries.length === 0 ? (
          <IonItem button detail routerLink={accountsRouterLink}>
            <IonLabel>
              <h2>No bank accounts yet</h2>
              <IonNote>Tap to add a bank account</IonNote>
            </IonLabel>
          </IonItem>
        ) : (
          overview.accountSummaries.map((item) => {
            const subtitle =
              [item.account.institution, item.account.accountNumber]
                .filter((part) => part.trim().length > 0)
                .join(" · ") || item.account.currency;
            return (
              <IonItem
                key={item.account.id}
                button
                detail
                routerLink={`${statementsRouterLink}?accountId=${encodeURIComponent(item.account.id)}`}
              >
                <IonLabel>
                  <h2>{item.account.name}</h2>
                  <IonNote>{subtitle}</IonNote>
                  <p>
                    {pluralize(item.statementCount, "statement")} ·{" "}
                    {pluralize(item.lineCount, "line")}
                    {item.uncategorisedLineCount > 0
                      ? ` · ${item.uncategorisedLineCount} uncategorised`
                      : ""}
                  </p>
                </IonLabel>
                <div slot="end" className="ion-text-end">
                  <div>
                    <strong>
                      {item.latestBalanceCents !== undefined
                        ? formatCurrency(item.latestBalanceCents, item.account.currency)
                        : signedCurrency(item.netCashFlowCents, item.account.currency)}
                    </strong>
                  </div>
                  <IonNote>
                    {item.latestBalanceCents !== undefined
                      ? `Balance${item.latestTransactionDate ? ` · ${item.latestTransactionDate}` : ""}`
                      : `Net (${item.account.currency})`}
                  </IonNote>
                </div>
              </IonItem>
            );
          })
        )}
      </IonList>

      <IonList inset>
        <IonListHeader>Category Summary</IonListHeader>
        {allocatedCategories.length === 0 ? (
          <IonItem button detail routerLink={categoriesRouterLink}>
            <IonLabel>
              <h2>{pluralize(overview.totalCategories, "Category", "Categories")} Configured</h2>
              <IonNote>
                {overview.receiptCategoryCount} receipt · {overview.paymentCategoryCount} payment —
                allocate statement lines to see category totals
              </IonNote>
            </IonLabel>
          </IonItem>
        ) : (
          allocatedCategories.map((item) => (
            <IonItem
              key={item.category.id}
              button
              detail
              routerLink={`${categoriseRouterLink}?categoryId=${encodeURIComponent(item.category.id)}`}
            >
              <IonLabel>
                <h2>{item.category.name}</h2>
                <IonNote>{pluralize(item.lineCount, "line")} allocated</IonNote>
              </IonLabel>
              <div slot="end" className="ion-text-end">
                <div>
                  <strong>{formatCurrency(item.allocatedCents, item.currency)}</strong>
                </div>
                <IonBadge color={bankTransactionTypeColor(item.category.type)}>
                  {bankTransactionTypeLabel(item.category.type)}
                </IonBadge>
              </div>
            </IonItem>
          ))
        )}
      </IonList>
    </>
  );
};
