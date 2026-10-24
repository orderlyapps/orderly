import { useEffect, useState } from "react";

import { getCustomersStore, type CustomersStore } from "./db.ts";
import type { CreateCustomerInput, CustomerDocument, CustomerPatch } from "./schema.ts";

export interface UseCustomersResult {
  customers: CustomerDocument[];
  isLoading: boolean;
  error: Error | null;
  createCustomer: (input: CreateCustomerInput) => Promise<CustomerDocument>;
  updateCustomer: (id: string, patch: CustomerPatch) => Promise<CustomerDocument>;
  deleteCustomer: (id: string) => Promise<void>;
  store: CustomersStore | null;
}

export function useCustomers(customStore?: CustomersStore): UseCustomersResult {
  const [store, setStore] = useState<CustomersStore | null>(customStore ?? null);
  const [customers, setCustomers] = useState<CustomerDocument[]>(() =>
    customStore ? customStore.listCustomers() : [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    setIsLoading(true);
    setError(null);

    const init = async () => {
      const resolvedStore = customStore ?? (await getCustomersStore());
      if (!active) {
        return;
      }
      setStore(resolvedStore);

      const subscription = resolvedStore.customersCollection.subscribeChanges(() => {
        if (!active) {
          return;
        }
        setCustomers(resolvedStore.listCustomers());
      });
      unsubscribe = () => subscription.unsubscribe();

      if (!active) {
        return;
      }
      setCustomers(resolvedStore.listCustomers());
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
      unsubscribe?.();
    };
  }, [customStore]);

  const resolveStore = async (): Promise<CustomersStore> =>
    customStore ?? store ?? (await getCustomersStore());

  return {
    customers,
    isLoading,
    error,
    createCustomer: async (input) => (await resolveStore()).createCustomer(input),
    updateCustomer: async (id, patch) => (await resolveStore()).updateCustomer(id, patch),
    deleteCustomer: async (id) => (await resolveStore()).deleteCustomer(id),
    store,
  };
}
