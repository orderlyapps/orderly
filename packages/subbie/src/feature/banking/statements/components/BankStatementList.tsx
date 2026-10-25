import {
  IonButton,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
} from "@ionic/react";
import { trashOutline } from "ionicons/icons";

import type { BankAccountDocument } from "../../accounts/schema.ts";
import { pluralize } from "../../types.ts";
import type { BankStatementDocument } from "../schema.ts";

export interface BankStatementListProps {
  statements: BankStatementDocument[];
  accounts?: BankAccountDocument[];
  onDelete?: (statement: BankStatementDocument) => void;
  emptyMessage?: string;
}

export const BankStatementList = ({
  statements,
  accounts = [],
  onDelete,
  emptyMessage = "No statements yet",
}: BankStatementListProps) => {
  if (statements.length === 0) {
    return (
      <IonList inset>
        <IonItem lines="none">
          <IonLabel>
            <IonNote>{emptyMessage}</IonNote>
          </IonLabel>
        </IonItem>
      </IonList>
    );
  }

  const accountById = new Map(accounts.map((acc) => [acc.id, acc]));

  return (
    <IonList inset>
      <IonListHeader>Imported Statements</IonListHeader>
      {statements.map((statement) => {
        const statementAccount = accountById.get(statement.accountId);
        const dateRange =
          statement.startDate && statement.endDate
            ? statement.startDate === statement.endDate
              ? statement.startDate
              : `${statement.startDate} – ${statement.endDate}`
            : "";
        const details = [statementAccount?.name, pluralize(statement.lineCount, "line"), dateRange]
          .filter((part): part is string => Boolean(part))
          .join(" · ");
        return (
          <IonItemSliding key={statement.id}>
            <IonItem>
              <IonLabel>
                <h3>{statement.filename}</h3>
                <IonNote>{details}</IonNote>
              </IonLabel>
              {onDelete ? (
                <IonButton
                  slot="end"
                  fill="clear"
                  color="danger"
                  aria-label={`Delete statement ${statement.filename}`}
                  onClick={() => onDelete(statement)}
                >
                  <IonIcon slot="icon-only" icon={trashOutline} />
                </IonButton>
              ) : null}
            </IonItem>
            {onDelete ? (
              <IonItemOptions side="end">
                <IonItemOption color="danger" onClick={() => onDelete(statement)}>
                  Delete
                </IonItemOption>
              </IonItemOptions>
            ) : null}
          </IonItemSliding>
        );
      })}
    </IonList>
  );
};
