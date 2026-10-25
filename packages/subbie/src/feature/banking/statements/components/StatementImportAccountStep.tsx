import { IonItem, IonList, IonListHeader, IonNote, IonSelect, IonSelectOption } from "@ionic/react";

import type { BankAccountDocument } from "../../accounts/schema.ts";

export interface StatementImportAccountStepProps {
  accounts: BankAccountDocument[];
  accountId: string;
  onAccountChange: (accountId: string) => void;
}

export const StatementImportAccountStep = ({
  accounts,
  accountId,
  onAccountChange,
}: StatementImportAccountStepProps) => (
  <IonList inset>
    <IonListHeader>Step 1 — Bank Account</IonListHeader>
    {accounts.length > 0 ? (
      <IonItem>
        <IonSelect
          label="Bank Account"
          labelPlacement="stacked"
          interface="action-sheet"
          value={accountId}
          onIonChange={(event) => {
            const value = event.detail.value;
            if (typeof value === "string") {
              onAccountChange(value);
            }
          }}
        >
          {accounts.map((account) => (
            <IonSelectOption key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>
    ) : (
      <IonItem lines="none">
        <IonNote color="medium">Add a bank account first to import statements</IonNote>
      </IonItem>
    )}
  </IonList>
);
