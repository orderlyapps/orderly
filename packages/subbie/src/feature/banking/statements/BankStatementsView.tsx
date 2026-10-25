import { useEffect, useState } from "react";

import {
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToast,
  useIonAlert,
} from "@ionic/react";
import { add } from "ionicons/icons";

import { useInvoices, type InvoicesStore } from "../../invoices/index.ts";
import {
  BankAccountFormModal,
  type BankAccountFormValues,
} from "../accounts/components/BankAccountFormModal.tsx";
import type { BankingStore } from "../db.ts";
import { useBanking } from "../hooks.ts";
import { StatementLineDetailModal } from "../lines/components/StatementLineDetailModal.tsx";
import { StatementLineList } from "../lines/components/StatementLineList.tsx";
import type { BankLineAllocationInput } from "../lines/gst.ts";
import {
  filterStatementLines,
  isBankingLineCategorisationFilter,
  type BankingLineCategorisationFilter,
  type BankStatementLineDocument,
} from "../lines/schema.ts";
import { pluralize } from "../types.ts";
import { BankStatementList } from "./components/BankStatementList.tsx";
import {
  StatementImportModal,
  type StatementImportValues,
} from "./components/StatementImportModal.tsx";
import type { BankStatementDocument } from "./schema.ts";

export interface BankStatementsViewProps {
  store?: BankingStore;
  invoicesStore?: InvoicesStore;
  initialAccountId?: string;
  initialCategorisationFilter?: BankingLineCategorisationFilter;
}

export const BankStatementsView = ({
  store: customStore,
  invoicesStore,
  initialAccountId = "",
  initialCategorisationFilter = "all",
}: BankStatementsViewProps) => {
  const {
    accounts,
    categories,
    statements,
    statementLines,
    isLoading,
    error,
    createAccount,
    deleteStatement,
    deleteStatementLine,
    linkInvoicesToLine,
    setLineAllocations,
    setLinePrivate,
    importStatementCsv,
  } = useBanking(customStore);
  const { invoices, store: resolvedInvoicesStore } = useInvoices(invoicesStore);

  const [accountFilterId, setAccountFilterId] = useState<string>(initialAccountId);
  const [categorisationFilter, setCategorisationFilter] = useState<BankingLineCategorisationFilter>(
    initialCategorisationFilter,
  );
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<BankStatementLineDocument | null>(null);
  const [lineDetailOpen, setLineDetailOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [presentAlert] = useIonAlert();

  useEffect(() => {
    setAccountFilterId(initialAccountId);
  }, [initialAccountId]);

  useEffect(() => {
    setCategorisationFilter(initialCategorisationFilter);
  }, [initialCategorisationFilter]);

  const filteredStatements = accountFilterId
    ? statements.filter((stmt) => stmt.accountId === accountFilterId)
    : statements;

  const filteredLines = filterStatementLines(statementLines, {
    accountId: accountFilterId,
    categorisation: categorisationFilter,
    categories,
  });

  const activeLine = selectedLine
    ? (statementLines.find((entry) => entry.id === selectedLine.id) ?? null)
    : null;

  const activeLineAccount = activeLine
    ? (accounts.find((entry) => entry.id === activeLine.accountId) ?? null)
    : null;

  const handleAccountSubmit = async (values: BankAccountFormValues) => {
    try {
      const created = await createAccount(values);
      setStatusMessage(`Added ${created.name}`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to save bank account");
      throw err;
    }
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

  const handleSetPrivate = async (line: BankStatementLineDocument, isPrivate: boolean) => {
    try {
      const updated = await setLinePrivate(line.id, isPrivate);
      setSelectedLine(updated);
      setStatusMessage(
        isPrivate ? "Marked as private — excluded from totals" : "Marked as business",
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update private status");
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
      ) : (
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
                  <IonSelectOption value="private">Private</IonSelectOption>
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

          <BankStatementList
            statements={filteredStatements}
            accounts={accounts}
            onDelete={confirmDeleteStatement}
          />

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
      )}

      <IonFab slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton
          onClick={() => {
            if (accounts.length === 0) {
              setAccountFormOpen(true);
            } else {
              setImportModalOpen(true);
            }
          }}
          aria-label={accounts.length === 0 ? "Add bank account" : "Import bank statement CSV"}
        >
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>

      <BankAccountFormModal
        isOpen={accountFormOpen}
        initial={null}
        onDismiss={() => setAccountFormOpen(false)}
        onSubmit={handleAccountSubmit}
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
        onSetPrivate={handleSetPrivate}
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
