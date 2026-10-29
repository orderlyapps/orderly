import { useState } from "react";

import {
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonNote,
  IonSpinner,
  IonToast,
  useIonAlert,
} from "@ionic/react";
import { add } from "ionicons/icons";

import { useStatusToast } from "../../../shared/index.ts";
import type { BankingStore } from "../db.ts";
import { useBanking } from "../hooks.ts";
import {
  BankAccountFormModal,
  type BankAccountFormValues,
} from "./components/BankAccountFormModal.tsx";
import { BankAccountList } from "./components/BankAccountList.tsx";
import type { BankAccountDocument } from "./schema.ts";

export interface BankAccountsViewProps {
  store?: BankingStore;
}

export const BankAccountsView = ({ store: customStore }: BankAccountsViewProps) => {
  const { accounts, isLoading, error, createAccount, updateAccount, deleteAccount } =
    useBanking(customStore);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountDocument | null>(null);
  const { toast, showSuccess, showError, dismissToast } = useStatusToast();
  const [presentAlert] = useIonAlert();

  const handleAccountSubmit = async (values: BankAccountFormValues) => {
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, values);
        showSuccess(`Updated ${values.name}`);
      } else {
        const created = await createAccount(values);
        showSuccess(`Added ${created.name}`);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save bank account");
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
              .then(() => showSuccess(`Deleted ${account.name}`))
              .catch(() => showError("Failed to delete bank account"));
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
        <BankAccountList
          accounts={accounts}
          onSelect={(account) => {
            setEditingAccount(account);
            setAccountFormOpen(true);
          }}
          onDelete={confirmDeleteAccount}
          emptyMessage="No bank accounts yet — tap + to add one"
        />
      )}

      <IonFab slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton
          onClick={() => {
            setEditingAccount(null);
            setAccountFormOpen(true);
          }}
          aria-label="Add bank account"
        >
          <IonIcon icon={add} />
        </IonFabButton>
      </IonFab>

      <BankAccountFormModal
        isOpen={accountFormOpen}
        initial={editingAccount}
        onDismiss={() => setAccountFormOpen(false)}
        onSubmit={handleAccountSubmit}
      />

      <IonToast
        isOpen={toast !== null}
        message={toast?.message}
        color={toast?.color}
        position="top"
        duration={2500}
        onDidDismiss={dismissToast}
      />
    </>
  );
};
