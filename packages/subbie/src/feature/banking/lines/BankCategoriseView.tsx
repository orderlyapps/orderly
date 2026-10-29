import { useEffect, useState } from "react";

import {
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToast,
} from "@ionic/react";

import { useInvoices, type InvoicesStore } from "../../invoices/index.ts";
import { useSettings, type SettingsStore } from "../../settings/index.ts";
import type { BankingStore } from "../db.ts";
import { useBanking } from "../hooks.ts";
import { pluralize } from "../types.ts";
import { StatementLineCategoryModal } from "./components/StatementLineCategoryModal.tsx";
import { StatementLineList } from "./components/StatementLineList.tsx";
import type { AllocateLineToCategoryOptions } from "./db.ts";
import {
  filterStatementLines,
  isBankingLineCategorisationFilter,
  isBankingLineTypeFilter,
  type BankingLineCategorisationFilter,
  type BankingLineTypeFilter,
  type BankStatementLineDocument,
} from "./schema.ts";

export interface BankCategoriseViewProps {
  store?: BankingStore;
  invoicesStore?: InvoicesStore;
  settingsStore?: SettingsStore;
  initialAccountId?: string;
  initialCategorisationFilter?: BankingLineCategorisationFilter;
  initialTypeFilter?: BankingLineTypeFilter;
  initialCategoryId?: string;
  initialSearchQuery?: string;
}

export const BankCategoriseView = ({
  store: customStore,
  invoicesStore,
  settingsStore,
  initialAccountId = "",
  initialCategorisationFilter = "all",
  initialTypeFilter = "all",
  initialCategoryId = "",
  initialSearchQuery = "",
}: BankCategoriseViewProps) => {
  const {
    accounts,
    categories,
    statementLines,
    isLoading,
    error,
    allocateLineToCategory,
    allocateLinesToCategory,
    clearLineAllocations,
    clearLinesAllocations,
    setLinePrivate,
    setLinesPrivate,
  } = useBanking(customStore);
  const { invoices } = useInvoices(invoicesStore);
  const { settings } = useSettings(settingsStore);

  const [accountFilterId, setAccountFilterId] = useState<string>(initialAccountId);
  const [categorisationFilter, setCategorisationFilter] = useState<BankingLineCategorisationFilter>(
    initialCategorisationFilter,
  );
  const [typeFilter, setTypeFilter] = useState<BankingLineTypeFilter>(initialTypeFilter);
  const [categoryFilterId, setCategoryFilterId] = useState<string>(initialCategoryId);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [selectedLine, setSelectedLine] = useState<BankStatementLineDocument | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [lineCategoryOpen, setLineCategoryOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  const filteredLines = filterStatementLines(statementLines, {
    accountId: accountFilterId,
    categorisation: categorisationFilter,
    type: typeFilter,
    categoryId: categoryFilterId,
    searchQuery,
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

  const filteredLineIdSet = new Set(filteredLines.map((line) => line.id));
  const visibleSelectedLineIds = selectedLineIds.filter((id) => filteredLineIdSet.has(id));
  const selectedLines = filteredLines.filter((line) => visibleSelectedLineIds.includes(line.id));
  const lockedTransactionType = selectedLines[0]?.type ?? null;
  const modalLines = selectionMode ? selectedLines : activeLine ? [activeLine] : [];

  const finishBulkAction = () => {
    if (selectionMode) {
      setSelectedLineIds([]);
      setSelectionMode(false);
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

  const handleSelectCategoryForLines = async (
    linesToUpdate: BankStatementLineDocument[],
    categoryId: string,
    options?: AllocateLineToCategoryOptions,
  ) => {
    if (linesToUpdate.length === 1 && !selectionMode) {
      await handleSelectCategory(linesToUpdate[0]!, categoryId, options);
      return;
    }
    const privateIds = linesToUpdate.filter((line) => line.isPrivate).map((line) => line.id);
    try {
      if (privateIds.length > 0) {
        await setLinesPrivate(privateIds, false);
      }
      const updated = await allocateLinesToCategory(
        linesToUpdate.map((line) => line.id),
        categoryId,
        options,
      );
      if (updated.length === 1) {
        setSelectedLine(updated[0] ?? null);
      }
      finishBulkAction();
      const matchedCategory = categories.find((cat) => cat.id === categoryId);
      if (linesToUpdate.length === 1) {
        setStatusMessage(
          matchedCategory ? `Categorised as ${matchedCategory.name}` : "Categorised statement line",
        );
      } else {
        setStatusMessage(
          matchedCategory
            ? `Categorised ${pluralize(linesToUpdate.length, "line")} as ${matchedCategory.name}`
            : `Categorised ${pluralize(linesToUpdate.length, "statement line")}`,
        );
      }
    } catch (err) {
      if (privateIds.length > 0) {
        await setLinesPrivate(privateIds, true).catch(() => undefined);
      }
      setStatusMessage(err instanceof Error ? err.message : "Failed to categorise statement lines");
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

  const handleClearCategoryForLines = async (linesToUpdate: BankStatementLineDocument[]) => {
    if (linesToUpdate.length === 1 && !selectionMode) {
      await handleClearCategory(linesToUpdate[0]!);
      return;
    }
    try {
      const updated = await clearLinesAllocations(linesToUpdate.map((line) => line.id));
      if (updated.length === 1) {
        setSelectedLine(updated[0] ?? null);
      }
      finishBulkAction();
      setStatusMessage(
        linesToUpdate.length === 1
          ? "Cleared category allocation"
          : `Cleared category allocation for ${pluralize(linesToUpdate.length, "line")}`,
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to clear category allocation");
      throw err;
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
      throw err;
    }
  };

  const handleSetPrivateForLines = async (
    linesToUpdate: BankStatementLineDocument[],
    isPrivate: boolean,
  ) => {
    if (linesToUpdate.length === 1 && !selectionMode) {
      await handleSetPrivate(linesToUpdate[0]!, isPrivate);
      return;
    }
    try {
      const updated = await setLinesPrivate(
        linesToUpdate.map((line) => line.id),
        isPrivate,
      );
      if (updated.length === 1) {
        setSelectedLine(updated[0] ?? null);
      }
      finishBulkAction();
      if (linesToUpdate.length === 1) {
        setStatusMessage(
          isPrivate ? "Marked as private — excluded from totals" : "Marked as business",
        );
      } else {
        setStatusMessage(
          isPrivate
            ? `Marked ${pluralize(linesToUpdate.length, "line")} as private — excluded from totals`
            : `Marked ${pluralize(linesToUpdate.length, "line")} as business`,
        );
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update private status");
      throw err;
    }
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedLineIds([]);
      }
      return !prev;
    });
  };

  const handleToggleSelectLine = (line: BankStatementLineDocument) => {
    setSelectedLineIds((prev) => {
      const activePrev = prev.filter((id) => filteredLineIdSet.has(id));
      if (activePrev.includes(line.id)) {
        return activePrev.filter((id) => id !== line.id);
      }
      const firstSelected = filteredLines.find((item) => activePrev.includes(item.id));
      if (firstSelected && firstSelected.type !== line.type) {
        return activePrev;
      }
      return [...activePrev, line.id];
    });
  };

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
      ) : (
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
                <IonSelectOption value="private">Private</IonSelectOption>
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
            selectionMode={selectionMode}
            selectedLineIds={visibleSelectedLineIds}
            lockedTransactionType={lockedTransactionType}
            onToggleSelectionMode={handleToggleSelectionMode}
            onToggleSelectLine={handleToggleSelectLine}
            onSelectAll={(linesToSelect) =>
              setSelectedLineIds(linesToSelect.map((line) => line.id))
            }
            onClearSelection={() => setSelectedLineIds([])}
            gstRate={settings.gstRate}
            gstRegistered={settings.gstRegistered}
            onCategoriseSelected={() => {
              if (selectedLines.length > 0) {
                setSelectedLine(null);
                setLineCategoryOpen(true);
              }
            }}
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
      )}

      <StatementLineCategoryModal
        line={activeLine}
        lines={modalLines}
        account={activeLineAccount}
        accounts={accounts}
        categories={categories}
        isOpen={lineCategoryOpen}
        gstRate={settings.gstRate}
        gstRegistered={settings.gstRegistered}
        defaultGstType={settings.defaultGstType}
        onDismiss={() => setLineCategoryOpen(false)}
        onSelectCategory={handleSelectCategory}
        onSelectCategoryForLines={handleSelectCategoryForLines}
        onClearCategory={handleClearCategory}
        onClearCategoryForLines={handleClearCategoryForLines}
        onSetPrivate={handleSetPrivate}
        onSetPrivateForLines={handleSetPrivateForLines}
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
