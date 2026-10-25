import { useEffect, useState } from "react";

import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { checkmark } from "ionicons/icons";

import { DEFAULT_INVOICE_CURRENCY, formatCurrency } from "../../invoices/schema.ts";
import {
  bankTransactionTypeColor,
  bankTransactionTypeLabel,
  type BankAccountDocument,
  type BankCategoryDocument,
  type BankStatementLineDocument,
} from "../schema.ts";

export interface StatementLineCategoryModalProps {
  line: BankStatementLineDocument | null;
  account?: BankAccountDocument | null;
  categories: BankCategoryDocument[];
  isOpen: boolean;
  onDismiss: () => void;
  onSelectCategory: (
    line: BankStatementLineDocument,
    categoryId: string,
    notes?: string,
  ) => Promise<unknown>;
  onClearCategory?: (line: BankStatementLineDocument) => Promise<unknown>;
}

export const StatementLineCategoryModal = ({
  line,
  account,
  categories,
  isOpen,
  onDismiss,
  onSelectCategory,
  onClearCategory,
}: StatementLineCategoryModalProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const currency = account?.currency ?? DEFAULT_INVOICE_CURRENCY;
  const matchingCategories = line
    ? categories.filter((category) => category.type === line.type)
    : [];

  const allocationsKey = line ? JSON.stringify(line.allocations) : "";

  useEffect(() => {
    if (!isOpen || !line) {
      return;
    }
    const primaryAllocation = line.allocations.length === 1 ? line.allocations[0] : undefined;
    setSelectedCategoryId(primaryAllocation?.categoryId ?? "");
    setNotes(primaryAllocation?.notes ?? "");
    setIsSaving(false);
  }, [isOpen, line?.id, allocationsKey]);

  const canSave =
    line !== null &&
    selectedCategoryId.trim().length > 0 &&
    matchingCategories.some((category) => category.id === selectedCategoryId) &&
    !isSaving;

  const handleSave = async () => {
    if (!line || !canSave) {
      return;
    }
    setIsSaving(true);
    try {
      const trimmedNotes = notes.trim();
      await onSelectCategory(
        line,
        selectedCategoryId,
        trimmedNotes.length > 0 ? trimmedNotes : undefined,
      );
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!line || !onClearCategory || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onClearCategory(line);
      onDismiss();
    } catch {
      // Parent handles reporting the error; keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>Categorise Line</IonTitle>
          <IonButtons slot="end">
            <IonButton
              strong
              disabled={!canSave}
              onClick={() => {
                void handleSave();
              }}
            >
              Save
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {line ? (
          <>
            <IonList inset>
              <IonItem>
                <IonLabel>
                  <h2>{line.description}</h2>
                  <p>
                    {line.date}
                    {account ? ` · ${account.name}` : ""}
                  </p>
                </IonLabel>
                <IonBadge slot="end" color={bankTransactionTypeColor(line.type)}>
                  {bankTransactionTypeLabel(line.type)}
                </IonBadge>
              </IonItem>
              <IonItem>
                <IonLabel>Amount</IonLabel>
                <IonNote slot="end">
                  <strong>
                    {line.type === "payment" ? "-" : "+"}
                    {formatCurrency(line.amountCents, currency)}
                  </strong>
                </IonNote>
              </IonItem>
            </IonList>

            <IonList inset>
              <IonListHeader>Select {bankTransactionTypeLabel(line.type)} Category</IonListHeader>
              {matchingCategories.length === 0 ? (
                <IonItem lines="none">
                  <IonNote color="medium">
                    No {line.type} categories available — add one in the Categories section
                  </IonNote>
                </IonItem>
              ) : (
                matchingCategories.map((category) => {
                  const isSelected = selectedCategoryId === category.id;
                  return (
                    <IonItem
                      key={category.id}
                      button
                      detail={false}
                      disabled={isSaving}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <IonLabel>
                        <h2>{category.name}</h2>
                        {category.description ? <IonNote>{category.description}</IonNote> : null}
                      </IonLabel>
                      {isSelected ? (
                        <IonIcon
                          slot="end"
                          icon={checkmark}
                          color="primary"
                          aria-label="Selected"
                        />
                      ) : null}
                    </IonItem>
                  );
                })
              )}
            </IonList>

            <IonList inset>
              <IonItem>
                <IonInput
                  label="Notes (optional)"
                  labelPlacement="stacked"
                  placeholder="Add a categorisation note..."
                  value={notes}
                  onIonInput={(event) => setNotes(event.detail.value ?? "")}
                />
              </IonItem>
            </IonList>

            {line.allocations.length > 0 && onClearCategory ? (
              <IonList inset>
                <IonItem
                  button
                  detail={false}
                  disabled={isSaving}
                  onClick={() => {
                    void handleClear();
                  }}
                >
                  <IonLabel color="danger">Clear Category</IonLabel>
                </IonItem>
              </IonList>
            ) : null}
          </>
        ) : null}
      </IonContent>
    </IonModal>
  );
};
