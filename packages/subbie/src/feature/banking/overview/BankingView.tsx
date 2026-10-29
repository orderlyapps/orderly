import type { InvoicesStore } from "../../invoices/index.ts";
import type { SettingsStore } from "../../settings/index.ts";
import { BankAccountsView } from "../accounts/BankAccountsView.tsx";
import { BankCategoriesView } from "../categories/BankCategoriesView.tsx";
import type { BankingStore } from "../db.ts";
import { BankCategoriseView } from "../lines/BankCategoriseView.tsx";
import type { BankingLineCategorisationFilter, BankingLineTypeFilter } from "../lines/schema.ts";
import { BankStatementsView } from "../statements/BankStatementsView.tsx";
import { BankingOverviewView } from "./BankingOverviewView.tsx";

export type BankingSection = "overview" | "statements" | "categorise" | "accounts" | "categories";

export interface BankingViewProps {
  store?: BankingStore;
  invoicesStore?: InvoicesStore;
  settingsStore?: SettingsStore;
  referenceDate?: Date | string;
  initialSection?: BankingSection;
  initialAccountId?: string;
  initialCategorisationFilter?: BankingLineCategorisationFilter;
  initialTypeFilter?: BankingLineTypeFilter;
  initialCategoryId?: string;
  initialSearchQuery?: string;
  statementsRouterLink?: string;
  categoriseRouterLink?: string;
  accountsRouterLink?: string;
  categoriesRouterLink?: string;
}

export const BankingView = ({
  store,
  invoicesStore,
  settingsStore,
  referenceDate,
  initialSection = "overview",
  initialAccountId,
  initialCategorisationFilter,
  initialTypeFilter,
  initialCategoryId,
  initialSearchQuery,
  statementsRouterLink,
  categoriseRouterLink,
  accountsRouterLink,
  categoriesRouterLink,
}: BankingViewProps) => {
  switch (initialSection) {
    case "statements":
      return <BankStatementsView store={store} initialAccountId={initialAccountId} />;
    case "categorise":
      return (
        <BankCategoriseView
          store={store}
          invoicesStore={invoicesStore}
          settingsStore={settingsStore}
          initialAccountId={initialAccountId}
          initialCategorisationFilter={initialCategorisationFilter}
          initialTypeFilter={initialTypeFilter}
          initialCategoryId={initialCategoryId}
          initialSearchQuery={initialSearchQuery}
        />
      );
    case "accounts":
      return <BankAccountsView store={store} />;
    case "categories":
      return <BankCategoriesView store={store} />;
    case "overview":
    default:
      return (
        <BankingOverviewView
          store={store}
          settingsStore={settingsStore}
          referenceDate={referenceDate}
          statementsRouterLink={statementsRouterLink}
          categoriseRouterLink={categoriseRouterLink}
          accountsRouterLink={accountsRouterLink}
          categoriesRouterLink={categoriesRouterLink}
        />
      );
  }
};
