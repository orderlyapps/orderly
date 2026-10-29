import { useEffect, useState } from "react";

import {
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToast,
  useIonAlert,
} from "@ionic/react";
import { add } from "ionicons/icons";

import {
  BankAccountFormModal,
  type BankAccountFormValues,
} from "../accounts/components/BankAccountFormModal.tsx";
import type { BankingStore } from "../db.ts";
import { useBanking } from "../hooks.ts";
import { pluralize } from "../types.ts";
import { BankStatementList } from "./components/BankStatementList.tsx";
import {
  StatementImportModal,
  type StatementImportValues,
} from "./components/StatementImportModal.tsx";
import type { BankStatementDocument } from "./schema.ts";

export interface BankStatementsViewProps {
  store?: BankingStore;
  initialAccountId?: string;
}

export const BankStatementsView = ({
  store: customStore,
  initialAccountId = "",
}: BankStatementsViewProps) => {
  const {
    accounts,
    statements,
    isLoading,
    error,
    createAccount,
    deleteStatement,
    importStatementCsv,
  } = useBanking(customStore);

  const [accountFilterId, setAccountFilterId] = useState<string>(initialAccountId);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [presentAlert] = useIonAlert();

  useEffect(() => {
    setAccountFilterId(initialAccountId);
  }, [initialAccountId]);

  const filteredStatements = accountFilterId
    ? statements.filter((stmt) => stmt.accountId === accountFilterId)
    : statements;

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
              .then(() => setStatusMessage(`Deleted ${statement.filename}`))
              .catch(() => setStatusMessage("Failed to delete statement"));
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
                      {account.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </IonList>
          ) : null}

          <BankStatementList
            statements={filteredStatements}
            accounts={accounts}
            onDelete={confirmDeleteStatement}
            emptyMessage={
              accounts.length === 0
                ? "No bank accounts yet — tap + to add an account and import a CSV statement"
                : statements.length === 0
                  ? "No statements yet — tap + to import a CSV statement"
                  : "No statements match the selected account"
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

      <IonToast
        isOpen={statusMessage !== null}
        message={statusMessage ?? undefined}
        position="top"
        duration={2500}
        onDidDismiss={() => setStatusMessage(null)}
      />
    </>
  );
};
