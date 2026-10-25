import { useEffect, useState } from "react";

import {
  IonBadge,
  IonButton,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToast,
  useIonAlert,
} from "@ionic/react";
import {
  add,
  checkmarkDoneOutline,
  documentTextOutline,
  pricetagsOutline,
  trashOutline,
  walletOutline,
} from "ionicons/icons";

import { formatCurrency, useInvoices, type InvoicesStore } from "../invoices/index.ts";
import {
  BankAccountFormModal,
  type BankAccountFormValues,
} from "./components/BankAccountFormModal.tsx";
import { BankAccountList } from "./components/BankAccountList.tsx";
import {
  BankCategoryFormModal,
  type BankCategoryFormValues,
} from "./components/BankCategoryFormModal.tsx";
import { BankCategoryList } from "./components/BankCategoryList.tsx";
import {
  StatementImportModal,
  type StatementImportValues,
} from "./components/StatementImportModal.tsx";
import { StatementLineCategoryModal } from "./components/StatementLineCategoryModal.tsx";
import { StatementLineDetailModal } from "./components/StatementLineDetailModal.tsx";
import { StatementLineList } from "./components/StatementLineList.tsx";
import type { AllocateLineToCategoryOptions, BankingStore } from "./db.ts";
import { useBanking } from "./hooks.ts";
import {
  bankTransactionTypeColor,
  bankTransactionTypeLabel,
  filterStatementLines,
  isBankingLineCategorisationFilter,
  isBankingLineTypeFilter,
  summarizeBankingOverview,
  type BankAccountDocument,
  type BankCategoryDocument,
  type BankingLineCategorisationFilter,
  type BankingLineTypeFilter,
  type BankLineAllocationInput,
  type BankStatementDocument,
  type BankStatementLineDocument,
} from "./schema.ts";

export type { BankingLineCategorisationFilter, BankingLineTypeFilter } from "./schema.ts";

export type BankingSection = "overview" | "statements" | "categorise" | "accounts" | "categories";

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

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
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

export interface BankStatementsViewProps {
  store?: BankingStore;
  invoicesStore?: InvoicesStore;
  initialAccountId?: string;
  initialCategorisationFilter?: BankingLineCategorisationFilter;
}

export interface BankCategoriseViewProps {
  store?: BankingStore;
  invoicesStore?: InvoicesStore;
  initialAccountId?: string;
  initialCategorisationFilter?: BankingLineCategorisationFilter;
  initialTypeFilter?: BankingLineTypeFilter;
  initialCategoryId?: string;
  initialSearchQuery?: string;
}

export interface BankAccountsViewProps {
  store?: BankingStore;
}

export interface BankCategoriesViewProps {
  store?: BankingStore;
}

export interface BankingViewProps {
  store?: BankingStore;
  invoicesStore?: InvoicesStore;
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
  store: customStore,
  invoicesStore,
  initialSection = "overview",
  initialAccountId = "",
  initialCategorisationFilter = "all",
  initialTypeFilter = "all",
  initialCategoryId = "",
  initialSearchQuery = "",
  statementsRouterLink,
  categoriseRouterLink,
  accountsRouterLink,
  categoriesRouterLink,
}: BankingViewProps) => {
  const {
    accounts,
    categories,
    statements,
    statementLines,
    isLoading,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
    createCategory,
    updateCategory,
    deleteCategory,
    deleteStatement,
    deleteStatementLine,
    linkInvoicesToLine,
    allocateLineToCategory,
    setLineAllocations,
    clearLineAllocations,
    importStatementCsv,
  } = useBanking(customStore);
  const { invoices, store: resolvedInvoicesStore } = useInvoices(invoicesStore);

  const [accountFilterId, setAccountFilterId] = useState<string>(initialAccountId);
  const [categorisationFilter, setCategorisationFilter] = useState<BankingLineCategorisationFilter>(
    initialCategorisationFilter,
  );
  const [typeFilter, setTypeFilter] = useState<BankingLineTypeFilter>(initialTypeFilter);
  const [categoryFilterId, setCategoryFilterId] = useState<string>(initialCategoryId);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountDocument | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BankCategoryDocument | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<BankStatementLineDocument | null>(null);
  const [lineDetailOpen, setLineDetailOpen] = useState(false);
  const [lineCategoryOpen, setLineCategoryOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [presentAlert] = useIonAlert();

  useEffect(() => {
    setAccountFilterId(initialAccountId);
  }, [initialAccountId]);

  useEffect(() => {
    setCategorisationFilter(initialCategorisationFilter);
  }, [initialCategorisationFilter]);

  useEffect(() => {
    setTypeFilter(initialTypeFilter);
  }, [initialTypeFilter]);

  useEffect(() => {
    setCategoryFilterId(initialCategoryId);
  }, [initialCategoryId]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  if (initialSection === "overview") {
    return (
      <BankingOverviewView
        store={customStore}
        statementsRouterLink={statementsRouterLink}
        categoriseRouterLink={categoriseRouterLink}
        accountsRouterLink={accountsRouterLink}
        categoriesRouterLink={categoriesRouterLink}
      />
    );
  }

  const filteredStatements = accountFilterId
    ? statements.filter((stmt) => stmt.accountId === accountFilterId)
    : statements;

  const filteredLines = filterStatementLines(statementLines, {
    accountId: accountFilterId,
    categorisation: categorisationFilter,
    type: initialSection === "categorise" ? typeFilter : "all",
    categoryId: initialSection === "categorise" ? categoryFilterId : "",
    searchQuery: initialSection === "categorise" ? searchQuery : "",
    categories,
  });

  const filterableCategories =
    typeFilter === "all" ? categories : categories.filter((cat) => cat.type === typeFilter);

  const hasActiveCategoriseFilters =
    accountFilterId.length > 0 ||
    categorisationFilter !== "all" ||
    typeFilter !== "all" ||
    categoryFilterId.length > 0 ||
    searchQuery.trim().length > 0;

  const activeLine = selectedLine
    ? (statementLines.find((entry) => entry.id === selectedLine.id) ?? null)
    : null;

  const activeLineAccount = activeLine
    ? (accounts.find((entry) => entry.id === activeLine.accountId) ?? null)
    : null;

  const handleAccountSubmit = async (values: BankAccountFormValues) => {
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, values);
        setStatusMessage(`Updated ${values.name}`);
      } else {
        const created = await createAccount(values);
        setStatusMessage(`Added ${created.name}`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to save bank account");
      throw err;
    }
  };

  const confirmDeleteAccount = (account: BankAccountDocument) => {
    void presentAlert({
      header: "Delete Bank Account",
      message: `Delete ${account.name} and its imported statements? This cannot be undone.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Delete",
          role: "destructive",
          handler: () => {
            void deleteAccount(account.id)
              .then(() => {
                if (accountFilterId === account.id) {
                  setAccountFilterId("");
                }
                if (selectedLine?.accountId === account.id) {
                  setSelectedLine(null);
                  setLineDetailOpen(false);
                }
                setStatusMessage(`Deleted ${account.name}`);
              })
              .catch(() => setStatusMessage("Failed to delete bank account"));
          },
        },
      ],
    });
  };

  const handleCategorySubmit = async (values: BankCategoryFormValues) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values);
        setStatusMessage(`Updated ${values.name}`);
      } else {
        await createCategory(values);
        setStatusMessage(`Added ${values.name}`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to save category");
      throw err;
    }
  };

  const confirmDeleteCategory = (category: BankCategoryDocument) => {
    void presentAlert({
      header: "Delete Category",
      message: `Delete ${category.name}? This cannot be undone.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Delete",
          role: "destructive",
          handler: () => {
            void deleteCategory(category.id)
              .then(() => setStatusMessage(`Deleted ${category.name}`))
              .catch(() => setStatusMessage("Failed to delete category"));
          },
        },
      ],
    });
  };

  const handleImportSubmit = async (values: StatementImportValues) => {
    try {
      const result = await importStatementCsv(values);
      setStatusMessage(
        `Imported ${pluralize(result.lines.length, "line")} into ${result.account.name}`,
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to import statement CSV");
      throw err;
    }
  };

  const handleLinkInvoices = async (line: BankStatementLineDocument, invoiceIds: string[]) => {
    try {
      const deduplicated = Array.from(
        new Set(invoiceIds.map((id) => id.trim()).filter((id) => id.length > 0)),
      );
      if (
        deduplicated.length === line.invoiceIds.length &&
        deduplicated.every((id, index) => id === line.invoiceIds[index])
      ) {
        return;
      }
      const prevIds = new Set(line.invoiceIds);
      const updated = await linkInvoicesToLine(line.id, deduplicated, {
        invoicesStore: invoicesStore ?? resolvedInvoicesStore ?? undefined,
      });
      setSelectedLine(updated);
      const nextIds = new Set(updated.invoiceIds);
      const addedCount = updated.invoiceIds.filter((id) => !prevIds.has(id)).length;
      const removedCount = line.invoiceIds.filter((id) => !nextIds.has(id)).length;
      if (updated.invoiceIds.length === 0) {
        setStatusMessage("Cleared linked invoices");
      } else if (addedCount > 0 && removedCount === 0) {
        setStatusMessage(`Linked ${pluralize(addedCount, "invoice")}`);
      } else if (removedCount > 0 && addedCount === 0) {
        setStatusMessage(`Unlinked ${pluralize(removedCount, "invoice")}`);
      } else {
        setStatusMessage(
          `Updated linked invoices (${pluralize(updated.invoiceIds.length, "invoice")})`,
        );
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to link invoices");
    }
  };

  const confirmDeleteStatement = (statement: BankStatementDocument) => {
    void presentAlert({
      header: "Delete Imported Statement",
      message: `Delete "${statement.filename}" and its imported lines? This cannot be undone.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Delete",
          role: "destructive",
          handler: () => {
            void deleteStatement(statement.id)
              .then(() => {
                if (selectedLine?.statementId === statement.id) {
                  setSelectedLine(null);
                  setLineDetailOpen(false);
                }
                setStatusMessage(`Deleted ${statement.filename}`);
              })
              .catch(() => setStatusMessage("Failed to delete statement"));
          },
        },
      ],
    });
  };

  const handleSaveAllocations = async (
    line: BankStatementLineDocument,
    allocations: BankLineAllocationInput[],
  ) => {
    try {
      const updated = await setLineAllocations(line.id, allocations);
      setSelectedLine(updated);
      setStatusMessage("Updated category allocations");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update allocations");
    }
  };

  const handleSelectCategory = async (
    line: BankStatementLineDocument,
    categoryId: string,
    options?: AllocateLineToCategoryOptions,
  ) => {
    try {
      const updated = await allocateLineToCategory(line.id, categoryId, options);
      setSelectedLine(updated);
      const matchedCategory = categories.find((cat) => cat.id === categoryId);
      setStatusMessage(
        matchedCategory ? `Categorised as ${matchedCategory.name}` : "Categorised statement line",
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to categorise statement line");
      throw err;
    }
  };

  const handleClearCategory = async (line: BankStatementLineDocument) => {
    try {
      const updated = await clearLineAllocations(line.id);
      setSelectedLine(updated);
      setStatusMessage("Cleared category allocation");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to clear category allocation");
      throw err;
    }
  };

  const handleDeleteLine = async (line: BankStatementLineDocument) => {
    try {
      await deleteStatementLine(line.id);
      if (selectedLine?.id === line.id) {
        setSelectedLine(null);
        setLineDetailOpen(false);
        setLineCategoryOpen(false);
      }
      setStatusMessage("Deleted statement line");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to delete statement line");
      throw err;
    }
  };

  const confirmDeleteLine = (line: BankStatementLineDocument) => {
    void presentAlert({
      header: "Delete Statement Line",
      message: `Delete "${line.description}"? This cannot be undone.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Delete",
          role: "destructive",
          handler: () => {
            void handleDeleteLine(line).catch(() => {});
          },
        },
      ],
    });
  };

  const handleFabClick = () => {
    if (initialSection === "accounts") {
      setEditingAccount(null);
      setAccountFormOpen(true);
    } else if (initialSection === "categories") {
      setEditingCategory(null);
      setCategoryFormOpen(true);
    } else if (accounts.length === 0) {
      setEditingAccount(null);
      setAccountFormOpen(true);
    } else {
      setImportModalOpen(true);
    }
  };

  const fabLabel =
    initialSection === "accounts"
      ? "Add bank account"
      : initialSection === "categories"
        ? "Add category"
        : accounts.length === 0
          ? "Add bank account"
          : "Import bank statement CSV";

  const clearCategoriseFilters = () => {
    setAccountFilterId("");
    setCategorisationFilter("all");
    setTypeFilter("all");
    setCategoryFilterId("");
    setSearchQuery("");
  };

  return (
    <>
      {isLoading ? (
        <IonItem lines="none">
          <IonSpinner slot="start" />
          <IonNote>Loading banking…</IonNote>
        </IonItem>
      ) : error ? (
        <IonItem lines="none">
          <IonNote color="danger">{error.message}</IonNote>
        </IonItem>
      ) : initialSection === "categorise" ? (
        <>
          <IonSearchbar
            placeholder="Search statement lines"
            value={searchQuery}
            onIonInput={(event) => setSearchQuery(event.detail.value ?? "")}
          />

          <IonList inset>
            <IonListHeader>Filters</IonListHeader>
            {accounts.length > 0 ? (
              <IonItem>
                <IonSelect
                  label="Bank Account"
                  labelPlacement="stacked"
                  interface="action-sheet"
                  value={accountFilterId}
                  onIonChange={(event) => {
                    const value = event.detail.value;
                    setAccountFilterId(typeof value === "string" ? value : "");
                  }}
                >
                  <IonSelectOption value="">All Accounts</IonSelectOption>
                  {accounts.map((account) => (
                    <IonSelectOption key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            ) : null}

            <IonItem>
              <IonSelect
                label="Categorisation"
                labelPlacement="stacked"
                interface="action-sheet"
                value={categorisationFilter}
                onIonChange={(event) => {
                  const value = event.detail.value;
                  setCategorisationFilter(isBankingLineCategorisationFilter(value) ? value : "all");
                }}
              >
                <IonSelectOption value="all">All</IonSelectOption>
                <IonSelectOption value="uncategorised">Uncategorised</IonSelectOption>
                <IonSelectOption value="partially-categorised">
                  Partially categorised
                </IonSelectOption>
                <IonSelectOption value="categorised">Categorised</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonSelect
                label="Transaction Type"
                labelPlacement="stacked"
                interface="action-sheet"
                value={typeFilter}
                onIonChange={(event) => {
                  const value = event.detail.value;
                  const nextType: BankingLineTypeFilter = isBankingLineTypeFilter(value)
                    ? value
                    : "all";
                  setTypeFilter(nextType);
                  if (
                    nextType !== "all" &&
                    categoryFilterId.length > 0 &&
                    categories.find((cat) => cat.id === categoryFilterId)?.type !== nextType
                  ) {
                    setCategoryFilterId("");
                  }
                }}
              >
                <IonSelectOption value="all">All Types</IonSelectOption>
                <IonSelectOption value="payment">Payments</IonSelectOption>
                <IonSelectOption value="receipt">Receipts</IonSelectOption>
              </IonSelect>
            </IonItem>

            {filterableCategories.length > 0 ? (
              <IonItem>
                <IonSelect
                  label="Category"
                  labelPlacement="stacked"
                  interface="action-sheet"
                  value={categoryFilterId}
                  onIonChange={(event) => {
                    const value = event.detail.value;
                    setCategoryFilterId(typeof value === "string" ? value : "");
                  }}
                >
                  <IonSelectOption value="">All Categories</IonSelectOption>
                  {filterableCategories.map((category) => (
                    <IonSelectOption key={category.id} value={category.id}>
                      {category.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            ) : null}

            {hasActiveCategoriseFilters ? (
              <IonItem button detail={false} onClick={clearCategoriseFilters}>
                <IonLabel color="primary">Clear Filters</IonLabel>
                <IonNote slot="end">
                  {filteredLines.length} of {statementLines.length}
                </IonNote>
              </IonItem>
            ) : null}
          </IonList>

          <StatementLineList
            lines={filteredLines}
            accounts={accounts}
            categories={categories}
            invoices={invoices}
            onSelect={(line) => {
              setSelectedLine(line);
              setLineCategoryOpen(true);
            }}
            emptyMessage={
              statementLines.length === 0
                ? "No statement lines yet — import a CSV statement in Statements"
                : "No statement lines match the selected filters"
            }
          />
        </>
      ) : initialSection === "statements" ? (
        <>
          {accounts.length > 0 ? (
            <IonList inset>
              <IonItem>
                <IonSelect
                  label="Bank Account"
                  labelPlacement="stacked"
                  interface="action-sheet"
                  value={accountFilterId}
                  onIonChange={(event) => {
                    const value = event.detail.value;
                    setAccountFilterId(typeof value === "string" ? value : "");
                  }}
                >
                  <IonSelectOption value="">All Accounts</IonSelectOption>
                  {accounts.map((account) => (
                    <IonSelectOption key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonSelect
                  label="Categorisation"
                  labelPlacement="stacked"
                  interface="action-sheet"
                  value={categorisationFilter}
                  onIonChange={(event) => {
                    const value = event.detail.value;
                    setCategorisationFilter(
                      isBankingLineCategorisationFilter(value) ? value : "all",
                    );
                  }}
                >
                  <IonSelectOption value="all">All</IonSelectOption>
                  <IonSelectOption value="categorised">Categorised</IonSelectOption>
                  <IonSelectOption value="partially-categorised">
                    Partially categorised
                  </IonSelectOption>
                  <IonSelectOption value="uncategorised">Uncategorised</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem
                button
                detail={false}
                onClick={() => {
                  setImportModalOpen(true);
                }}
              >
                <IonLabel color="primary">Import Statement CSV</IonLabel>
              </IonItem>
            </IonList>
          ) : null}

          {filteredStatements.length > 0 ? (
            <IonList inset>
              <IonListHeader>Imported Statements</IonListHeader>
              {filteredStatements.map((statement) => {
                const statementAccount = accounts.find((acc) => acc.id === statement.accountId);
                const dateRange =
                  statement.startDate && statement.endDate
                    ? statement.startDate === statement.endDate
                      ? statement.startDate
                      : `${statement.startDate} – ${statement.endDate}`
                    : "";
                const details = [
                  statementAccount?.name,
                  pluralize(statement.lineCount, "line"),
                  dateRange,
                ]
                  .filter((part): part is string => Boolean(part))
                  .join(" · ");
                return (
                  <IonItemSliding key={statement.id}>
                    <IonItem>
                      <IonLabel>
                        <h3>{statement.filename}</h3>
                        <IonNote>{details}</IonNote>
                      </IonLabel>
                      <IonButton
                        slot="end"
                        fill="clear"
                        color="danger"
                        aria-label={`Delete statement ${statement.filename}`}
                        onClick={() => confirmDeleteStatement(statement)}
                      >
                        <IonIcon slot="icon-only" icon={trashOutline} />
                      </IonButton>
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption
                        color="danger"
                        onClick={() => confirmDeleteStatement(statement)}
                      >
                        Delete
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                );
              })}
            </IonList>
          ) : null}

          <StatementLineList
            lines={filteredLines}
            accounts={accounts}
            categories={categories}
            invoices={invoices}
            onSelect={(line) => {
              setSelectedLine(line);
              setLineDetailOpen(true);
            }}
            onDelete={confirmDeleteLine}
            emptyMessage={
              accounts.length === 0
                ? "No bank accounts yet — tap + to add an account and import a CSV statement"
                : statementLines.length === 0
                  ? "No statement lines yet — tap + to import a CSV statement"
                  : "No statement lines match the selected filters"
            }
          />
        </>
      ) : initialSection === "accounts" ? (
        <BankAccountList
          accounts={accounts}
          onSelect={(account) => {
            setEditingAccount(account);
            setAccountFormOpen(true);
          }}
          onDelete={confirmDeleteAccount}
          emptyMessage="No bank accounts yet — tap + to add one"
        />
      ) : (
        <BankCategoryList
          categories={categories}
          onSelect={(category) => {
            setEditingCategory(category);
            setCategoryFormOpen(true);
          }}
          onDelete={confirmDeleteCategory}
          emptyMessage="No categories yet — tap + to add one"
        />
      )}

      {initialSection !== "categorise" ? (
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton onClick={handleFabClick} aria-label={fabLabel}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      ) : null}

      <BankAccountFormModal
        isOpen={accountFormOpen}
        initial={editingAccount}
        onDismiss={() => setAccountFormOpen(false)}
        onSubmit={handleAccountSubmit}
      />

      <BankCategoryFormModal
        isOpen={categoryFormOpen}
        initial={editingCategory}
        onDismiss={() => setCategoryFormOpen(false)}
        onSubmit={handleCategorySubmit}
      />

      <StatementImportModal
        isOpen={importModalOpen}
        accounts={accounts}
        defaultAccountId={accountFilterId || undefined}
        onDismiss={() => setImportModalOpen(false)}
        onSubmit={handleImportSubmit}
      />

      <StatementLineDetailModal
        line={activeLine}
        account={activeLineAccount}
        categories={categories}
        invoices={invoices}
        isOpen={lineDetailOpen}
        onDismiss={() => setLineDetailOpen(false)}
        onLinkInvoices={handleLinkInvoices}
        onSaveAllocations={handleSaveAllocations}
        onDelete={handleDeleteLine}
      />

      <StatementLineCategoryModal
        line={activeLine}
        account={activeLineAccount}
        categories={categories}
        isOpen={lineCategoryOpen}
        onDismiss={() => setLineCategoryOpen(false)}
        onSelectCategory={handleSelectCategory}
        onClearCategory={handleClearCategory}
      />

      <IonToast
        isOpen={statusMessage !== null}
        message={statusMessage ?? undefined}
        duration={2500}
        onDidDismiss={() => setStatusMessage(null)}
      />
    </>
  );
};

export const BankStatementsView = (props: BankStatementsViewProps) => (
  <BankingView {...props} initialSection="statements" />
);

export const BankCategoriseView = (props: BankCategoriseViewProps) => (
  <BankingView {...props} initialSection="categorise" />
);

export const BankAccountsView = ({ store }: BankAccountsViewProps) => (
  <BankingView store={store} initialSection="accounts" />
);

export const BankCategoriesView = ({ store }: BankCategoriesViewProps) => (
  <BankingView store={store} initialSection="categories" />
);
