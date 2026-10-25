import { useState } from "react";

import {
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
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToast,
  useIonAlert,
} from "@ionic/react";
import { add, trashOutline } from "ionicons/icons";

import { useInvoices, type InvoicesStore } from "../invoices/index.ts";
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
import { StatementLineDetailModal } from "./components/StatementLineDetailModal.tsx";
import { StatementLineList } from "./components/StatementLineList.tsx";
import type { BankingStore } from "./db.ts";
import { useBanking } from "./hooks.ts";
import {
  isLineFullyAllocated,
  type BankAccountDocument,
  type BankCategoryDocument,
  type BankLineAllocationInput,
  type BankStatementDocument,
  type BankStatementLineDocument,
} from "./schema.ts";

export type BankingSection = "statements" | "accounts" | "categories";

export type BankingLineCategorisationFilter =
  | "all"
  | "categorised"
  | "partially-categorised"
  | "uncategorised";

export interface BankingViewProps {
  store?: BankingStore;
  invoicesStore?: InvoicesStore;
  initialSection?: BankingSection;
}

export const BankingView = ({
  store: customStore,
  invoicesStore,
  initialSection = "statements",
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
    setLineAllocations,
    importStatementCsv,
  } = useBanking(customStore);
  const { invoices, store: resolvedInvoicesStore } = useInvoices(invoicesStore);

  const [section, setSection] = useState<BankingSection>(initialSection);
  const [accountFilterId, setAccountFilterId] = useState<string>("");
  const [categorisationFilter, setCategorisationFilter] =
    useState<BankingLineCategorisationFilter>("all");
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountDocument | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BankCategoryDocument | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<BankStatementLineDocument | null>(null);
  const [lineDetailOpen, setLineDetailOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [presentAlert] = useIonAlert();

  const filteredStatements = accountFilterId
    ? statements.filter((stmt) => stmt.accountId === accountFilterId)
    : statements;

  const filteredLines = statementLines.filter((line) => {
    if (accountFilterId && line.accountId !== accountFilterId) {
      return false;
    }
    switch (categorisationFilter) {
      case "categorised":
        return isLineFullyAllocated(line);
      case "partially-categorised":
        return line.allocations.length > 0 && !isLineFullyAllocated(line);
      case "uncategorised":
        return line.allocations.length === 0;
      default:
        return true;
    }
  });

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
        `Imported ${result.lines.length} ${result.lines.length === 1 ? "line" : "lines"} into ${result.account.name}`,
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
        setStatusMessage(`Linked ${addedCount} ${addedCount === 1 ? "invoice" : "invoices"}`);
      } else if (removedCount > 0 && addedCount === 0) {
        setStatusMessage(`Unlinked ${removedCount} ${removedCount === 1 ? "invoice" : "invoices"}`);
      } else {
        setStatusMessage(
          `Updated linked invoices (${updated.invoiceIds.length} ${updated.invoiceIds.length === 1 ? "invoice" : "invoices"})`,
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

  const handleDeleteLine = async (line: BankStatementLineDocument) => {
    try {
      await deleteStatementLine(line.id);
      if (selectedLine?.id === line.id) {
        setSelectedLine(null);
        setLineDetailOpen(false);
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
    if (section === "accounts") {
      setEditingAccount(null);
      setAccountFormOpen(true);
    } else if (section === "categories") {
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
    section === "accounts"
      ? "Add bank account"
      : section === "categories"
        ? "Add category"
        : "Import bank statement CSV";

  return (
    <>
      <IonSegment
        value={section}
        onIonChange={(event) => {
          const value = event.detail.value;
          if (value === "statements" || value === "accounts" || value === "categories") {
            setSection(value);
          }
        }}
      >
        <IonSegmentButton value="statements">
          <IonLabel>Statements</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="accounts">
          <IonLabel>Accounts</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="categories">
          <IonLabel>Categories</IonLabel>
        </IonSegmentButton>
      </IonSegment>

      {isLoading ? (
        <IonItem lines="none">
          <IonSpinner slot="start" />
          <IonNote>Loading banking…</IonNote>
        </IonItem>
      ) : error ? (
        <IonItem lines="none">
          <IonNote color="danger">{error.message}</IonNote>
        </IonItem>
      ) : section === "statements" ? (
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
                      value === "categorised" ||
                        value === "partially-categorised" ||
                        value === "uncategorised"
                        ? value
                        : "all",
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
                  `${statement.lineCount} ${statement.lineCount === 1 ? "line" : "lines"}`,
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
      ) : section === "accounts" ? (
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

      <IonFab slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton onClick={handleFabClick} aria-label={fabLabel}>
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>

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

      <IonToast
        isOpen={statusMessage !== null}
        message={statusMessage ?? undefined}
        duration={2500}
        onDidDismiss={() => setStatusMessage(null)}
      />
    </>
  );
};
