import { useEffect, useState } from "react";

import { getInvoicesStore, type InvoicesStore } from "./db.ts";
import type { CreateInvoiceInput, InvoiceDocument, InvoicePatch, InvoiceStatus } from "./schema.ts";

export interface UseInvoicesResult {
  invoices: InvoiceDocument[];
  isLoading: boolean;
  error: Error | null;
  createInvoice: (input: CreateInvoiceInput) => Promise<InvoiceDocument>;
  updateInvoice: (id: string, patch: InvoicePatch) => Promise<InvoiceDocument>;
  setInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<InvoiceDocument>;
  deleteInvoice: (id: string) => Promise<void>;
  store: InvoicesStore | null;
}

export function useInvoices(customStore?: InvoicesStore): UseInvoicesResult {
  const [store, setStore] = useState<InvoicesStore | null>(customStore ?? null);
  const [invoices, setInvoices] = useState<InvoiceDocument[]>(() =>
    customStore ? customStore.listInvoices() : [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribeCollection: (() => void) | undefined;
    setIsLoading(true);
    setError(null);

    const init = async () => {
      const resolvedStore = customStore ?? (await getInvoicesStore());
      if (!active) {
        return;
      }
      setStore(resolvedStore);

      const subscription = resolvedStore.collection.subscribeChanges(
        () => {
          if (!active) {
            return;
          }
          setInvoices(resolvedStore.listInvoices());
        },
        { includeInitialState: true },
      );
      unsubscribeCollection = () => subscription.unsubscribe();

      if (!active) {
        return;
      }
      setInvoices(resolvedStore.listInvoices());
      setIsLoading(false);
    };

    init().catch((err: unknown) => {
      if (!active) {
        return;
      }
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    });

    return () => {
      active = false;
      unsubscribeCollection?.();
    };
  }, [customStore]);

  const resolveStore = async (): Promise<InvoicesStore> =>
    customStore ?? store ?? (await getInvoicesStore());

  const handleCreateInvoice = async (input: CreateInvoiceInput): Promise<InvoiceDocument> => {
    const resolvedStore = await resolveStore();
    return resolvedStore.createInvoice(input);
  };

  const handleUpdateInvoice = async (id: string, patch: InvoicePatch): Promise<InvoiceDocument> => {
    const resolvedStore = await resolveStore();
    return resolvedStore.updateInvoice(id, patch);
  };

  const handleSetInvoiceStatus = async (
    id: string,
    status: InvoiceStatus,
  ): Promise<InvoiceDocument> => {
    const resolvedStore = await resolveStore();
    return resolvedStore.setInvoiceStatus(id, status);
  };

  const handleDeleteInvoice = async (id: string): Promise<void> => {
    const resolvedStore = await resolveStore();
    return resolvedStore.deleteInvoice(id);
  };

  return {
    invoices,
    isLoading,
    error,
    createInvoice: handleCreateInvoice,
    updateInvoice: handleUpdateInvoice,
    setInvoiceStatus: handleSetInvoiceStatus,
    deleteInvoice: handleDeleteInvoice,
    store,
  };
}
