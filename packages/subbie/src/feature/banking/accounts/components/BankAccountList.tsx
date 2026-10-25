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
  bankCsvColumnRoleLabel,
  columnRolesFromPreset,
  type BankCsvPreset,
} from "../../statements/schema.ts";
import type { BankAccountDocument } from "../schema.ts";

export interface BankAccountListProps {
  accounts: BankAccountDocument[];
  onSelect?: (account: BankAccountDocument) => void;
  onDelete?: (account: BankAccountDocument) => void;
  emptyMessage?: string;
}

function formatPresetSummary(preset: BankCsvPreset): string {
  if (!preset.hasHeader) {
    const roles = columnRolesFromPreset(preset);
    const assigned = roles
      .map((role, index) =>
        role !== "ignore" ? `Col ${index + 1}: ${bankCsvColumnRoleLabel(role)}` : null,
      )
      .filter((entry): entry is string => entry !== null);
    return assigned.length > 0 ? `No header (${assigned.join(", ")})` : "No header";
  }
  return `CSV preset: ${preset.dateColumn}, ${preset.descriptionColumn}, ${
    preset.amountColumn || `${preset.debitColumn}/${preset.creditColumn}`
  }`;
}

export const BankAccountList = ({
  accounts,
  onSelect,
  onDelete,
  emptyMessage = "No bank accounts yet",
}: BankAccountListProps) => (
  <IonList inset>
    {accounts.length === 0 ? (
      <IonItem lines="none">
        <IonLabel>
          <IonNote>{emptyMessage}</IonNote>
        </IonLabel>
      </IonItem>
    ) : (
      accounts.map((account) => {
        const subtitleParts = [account.institution, account.accountNumber].filter(
          (part) => part.trim().length > 0,
        );
        return (
          <IonItemSliding key={account.id}>
            <IonItem button detail onClick={() => onSelect?.(account)}>
              <IonLabel>
                <h2>{account.name}</h2>
                <IonNote>
                  {subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Bank account"}
                </IonNote>
                <p>{formatPresetSummary(account.csvPreset)}</p>
              </IonLabel>
              <IonBadge slot="end" color="medium">
                {account.currency}
              </IonBadge>
            </IonItem>
            {onDelete ? (
              <IonItemOptions side="end">
                <IonItemOption color="danger" onClick={() => onDelete(account)}>
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
