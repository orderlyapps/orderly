import {
  IonIcon,
  IonItem,
  IonItemDivider,
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

import { formatCurrency } from "../../invoices/schema.ts";
import { useSettings, type SettingsStore } from "../../settings/index.ts";
import type { BankingStore } from "../db.ts";
import { useBanking } from "../hooks.ts";
import { bankTransactionTypeColor, bankTransactionTypeLabel } from "../types.ts";
import { summarizeBankingFinancialYears, type FinancialYearSummary } from "./schema.ts";

export interface BankingOverviewViewProps {
  store?: BankingStore;
  settingsStore?: SettingsStore;
  referenceDate?: Date | string;
  statementsRouterLink?: string;
  categoriseRouterLink?: string;
  accountsRouterLink?: string;
  categoriesRouterLink?: string;
}

function signedCurrency(amountCents: number, currency: string): string {
  const prefix = amountCents > 0 ? "+" : amountCents < 0 ? "-" : "";
  return `${prefix}${formatCurrency(Math.abs(amountCents), currency)}`;
}

function differenceColor(amountCents: number): "success" | "danger" | "medium" {
  if (amountCents > 0) {
    return "success";
  }
  if (amountCents < 0) {
    return "danger";
  }
  return "medium";
}

interface FinancialYearSummarySectionProps {
  title: string;
  summary: FinancialYearSummary;
  showGst: boolean;
}

function hasCategorisedValues(summary: FinancialYearSummary): boolean {
  return (
    summary.totalCollectedIncGstCents > 0 ||
    summary.totalPaidIncGstCents > 0 ||
    summary.categorySummaries.length > 0
  );
}

const FinancialYearSummarySection = ({
  title,
  summary,
  showGst,
}: FinancialYearSummarySectionProps) => {
  if (!hasCategorisedValues(summary)) {
    return null;
  }

  const { financialYear, currency, categorySummaries } = summary;

  return (
    <IonList inset>
      <IonListHeader>
        <IonLabel>
          {title} ({financialYear.label})
          <p>
            <IonNote>
              1 Jul {financialYear.startYear} – 30 Jun {financialYear.endYear}
            </IonNote>
          </p>
        </IonLabel>
      </IonListHeader>

      {categorySummaries.length > 0 ? (
        <>
          <IonItemDivider>
            <IonLabel>{showGst ? "Categories (Excl. GST)" : "Categories"}</IonLabel>
          </IonItemDivider>
          {categorySummaries.map((item) => (
            <IonItem key={item.category.id}>
              <IonLabel>
                <h3>{item.category.name}</h3>
                <IonNote>{bankTransactionTypeLabel(item.category.type)}</IonNote>
              </IonLabel>
              <IonNote slot="end" color={bankTransactionTypeColor(item.category.type)}>
                <strong>
                  {formatCurrency(
                    showGst ? item.amountExGstCents : item.amountIncGstCents,
                    currency,
                  )}
                </strong>
              </IonNote>
            </IonItem>
          ))}
        </>
      ) : null}

      {showGst ? (
        <>
          <IonItemDivider>
            <IonLabel>GST</IonLabel>
          </IonItemDivider>
          <IonItem>
            <IonLabel>
              <h3>Total GST Collected</h3>
            </IonLabel>
            <IonNote slot="end" color={summary.gstCollectedCents > 0 ? "success" : "medium"}>
              <strong>{formatCurrency(summary.gstCollectedCents, currency)}</strong>
            </IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>
              <h3>Total GST Paid</h3>
            </IonLabel>
            <IonNote slot="end" color={summary.gstPaidCents > 0 ? "danger" : "medium"}>
              <strong>{formatCurrency(summary.gstPaidCents, currency)}</strong>
            </IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>
              <h3>GST Difference</h3>
            </IonLabel>
            <IonNote slot="end" color={differenceColor(summary.gstDifferenceCents)}>
              <strong>{signedCurrency(summary.gstDifferenceCents, currency)}</strong>
            </IonNote>
          </IonItem>
        </>
      ) : null}

      <IonItemDivider>
        <IonLabel>{showGst ? "Totals (Incl. GST)" : "Totals"}</IonLabel>
      </IonItemDivider>
      <IonItem>
        <IonLabel>
          <h3>Total Collected{showGst ? " (Incl. GST)" : ""}</h3>
        </IonLabel>
        <IonNote slot="end" color={summary.totalCollectedIncGstCents > 0 ? "success" : "medium"}>
          <strong>{formatCurrency(summary.totalCollectedIncGstCents, currency)}</strong>
        </IonNote>
      </IonItem>
      <IonItem>
        <IonLabel>
          <h3>Total Paid{showGst ? " (Incl. GST)" : ""}</h3>
        </IonLabel>
        <IonNote slot="end" color={summary.totalPaidIncGstCents > 0 ? "danger" : "medium"}>
          <strong>{formatCurrency(summary.totalPaidIncGstCents, currency)}</strong>
        </IonNote>
      </IonItem>

      {showGst ? (
        <>
          <IonItemDivider>
            <IonLabel>Totals (Excl. GST)</IonLabel>
          </IonItemDivider>
          <IonItem>
            <IonLabel>
              <h3>Total Collected (Excl. GST)</h3>
            </IonLabel>
            <IonNote slot="end" color={summary.totalCollectedExGstCents > 0 ? "success" : "medium"}>
              <strong>{formatCurrency(summary.totalCollectedExGstCents, currency)}</strong>
            </IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>
              <h3>Total Paid (Excl. GST)</h3>
            </IonLabel>
            <IonNote slot="end" color={summary.totalPaidExGstCents > 0 ? "danger" : "medium"}>
              <strong>{formatCurrency(summary.totalPaidExGstCents, currency)}</strong>
            </IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>
              <h3>Difference (Excl. GST)</h3>
            </IonLabel>
            <IonNote slot="end" color={differenceColor(summary.totalDifferenceExGstCents)}>
              <strong>{signedCurrency(summary.totalDifferenceExGstCents, currency)}</strong>
            </IonNote>
          </IonItem>
        </>
      ) : (
        <IonItem>
          <IonLabel>
            <h3>Difference</h3>
          </IonLabel>
          <IonNote slot="end" color={differenceColor(summary.totalDifferenceIncGstCents)}>
            <strong>{signedCurrency(summary.totalDifferenceIncGstCents, currency)}</strong>
          </IonNote>
        </IonItem>
      )}
    </IonList>
  );
};

export const BankingOverviewView = ({
  store: customStore,
  settingsStore,
  referenceDate,
  statementsRouterLink = "/banking/statements",
  categoriseRouterLink = "/banking/categorise",
  accountsRouterLink = "/banking/accounts",
  categoriesRouterLink = "/banking/categories",
}: BankingOverviewViewProps) => {
  const { accounts, categories, statementLines, isLoading, error } = useBanking(customStore);
  const { settings } = useSettings(settingsStore);

  const summaries = summarizeBankingFinancialYears({
    accounts,
    categories,
    statementLines,
    referenceDate,
    gstRate: settings.gstRate,
  });

  return (
    <>
      <IonList inset>
        <IonItem button detail routerLink={statementsRouterLink}>
          <IonIcon aria-hidden="true" icon={documentTextOutline} slot="start" />
          <IonLabel>
            <h2>Statements</h2>
          </IonLabel>
        </IonItem>

        <IonItem button detail routerLink={categoriseRouterLink}>
          <IonIcon aria-hidden="true" icon={checkmarkDoneOutline} slot="start" />
          <IonLabel>
            <h2>Categorise Lines</h2>
          </IonLabel>
        </IonItem>

        <IonItem button detail routerLink={accountsRouterLink}>
          <IonIcon aria-hidden="true" icon={walletOutline} slot="start" />
          <IonLabel>
            <h2>Accounts</h2>
          </IonLabel>
        </IonItem>

        <IonItem button detail routerLink={categoriesRouterLink}>
          <IonIcon aria-hidden="true" icon={pricetagsOutline} slot="start" />
          <IonLabel>
            <h2>Categories</h2>
          </IonLabel>
        </IonItem>
      </IonList>

      {isLoading ? (
        <IonItem lines="none">
          <IonSpinner slot="start" />
          <IonNote>Loading banking…</IonNote>
        </IonItem>
      ) : error ? (
        <IonItem lines="none">
          <IonNote color="danger">{error.message}</IonNote>
        </IonItem>
      ) : (
        <>
          <FinancialYearSummarySection
            title="Current Financial Year"
            summary={summaries.currentFinancialYear}
            showGst={settings.gstRegistered}
          />
          <FinancialYearSummarySection
            title="Previous Financial Year"
            summary={summaries.previousFinancialYear}
            showGst={settings.gstRegistered}
          />
        </>
      )}
    </>
  );
};
