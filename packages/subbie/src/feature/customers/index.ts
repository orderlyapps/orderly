export {
  CustomerFormModal,
  CustomerList,
  type CustomerFormModalProps,
  type CustomerFormValues,
  type CustomerListProps,
} from "./components/index.ts";
export {
  createCustomersStore,
  CUSTOMERS_COLLECTION_NAME,
  CUSTOMERS_DATABASE_NAME,
  customerJsonSchema,
  getCustomersStore,
  getDefaultCustomersStorage,
  resetDefaultCustomersStoreForTesting,
  type CreateCustomersStoreOptions,
  type CustomersCollection,
  type CustomersStore,
} from "./db.ts";
export { useCustomers, type UseCustomersResult } from "./hooks.ts";
export {
  createCustomerInputSchema,
  CUSTOMER_ID_MAX_LENGTH,
  customerDocumentSchema,
  isCustomerDocument,
  isValidCustomerId,
  normalizeCustomerDocument,
  validateCustomerInput,
  type CreateCustomerInput,
  type CustomerDocument,
  type CustomerPatch,
} from "./schema.ts";
export { CustomersView, type CustomersViewProps } from "./CustomersView.tsx";
