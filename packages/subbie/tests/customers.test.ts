import { expect, test } from "vite-plus/test";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import {
  createCustomersStore,
  isCustomerDocument,
  isValidCustomerId,
  normalizeCustomerDocument,
  validateCustomerInput,
} from "../src/feature/customers/index.ts";

let storeCounter = 0;
function nextStoreName() {
  storeCounter += 1;
  return `subbie_customers_test_${Date.now()}_${storeCounter}`;
}

test("validates customer documents", () => {
  const customer = normalizeCustomerDocument({
    name: "Acme Corp",
    email: "billing@acme.com",
    phone: "+1 555 123 4567",
  });
  expect(isCustomerDocument(customer)).toBe(true);
  expect(isValidCustomerId(customer.id)).toBe(true);
  expect(isValidCustomerId("")).toBe(false);
  expect(customer.name).toBe("Acme Corp");
  expect(customer.notes).toBe("");
});

test("validates create inputs", () => {
  expect(() => validateCustomerInput({ name: "Acme" })).not.toThrow();
  expect(() => validateCustomerInput({ name: " " })).toThrow("name is required");
  expect(() => validateCustomerInput({ name: "x", email: 5 as never })).toThrow(
    "email must be a string",
  );
});

test("creates, updates and deletes customers in the rxdb-backed store", async () => {
  const store = await createCustomersStore({
    name: nextStoreName(),
    storage: getRxStorageMemory(),
  });
  try {
    expect(store.listCustomers()).toEqual([]);

    const customer = await store.createCustomer({
      name: "Acme Corp",
      email: "billing@acme.com",
    });
    expect(isCustomerDocument(customer)).toBe(true);
    expect(customer.name).toBe("Acme Corp");

    expect(store.listCustomers()).toHaveLength(1);
    expect(store.getCustomer(customer.id)?.email).toBe("billing@acme.com");

    const updatedCustomer = await store.updateCustomer(customer.id, {
      name: "  Acme Corp  ",
      phone: "  +1 555 000  ",
    });
    expect(updatedCustomer.name).toBe("Acme Corp");
    expect(updatedCustomer.phone).toBe("+1 555 000");
    expect(updatedCustomer.email).toBe("billing@acme.com");

    await expect(store.updateCustomer(customer.id, { name: "" })).rejects.toThrow(
      "Invalid customer update",
    );
    await expect(store.updateCustomer(customer.id, { email: 123 as never })).rejects.toThrow(
      "Invalid customer update",
    );
    await expect(store.updateCustomer("missing", { name: "x" })).rejects.toThrow(
      "Customer not found",
    );

    await store.deleteCustomer(customer.id);
    expect(store.listCustomers()).toEqual([]);
    await expect(store.deleteCustomer(customer.id)).rejects.toThrow("Customer not found");
  } finally {
    await store.close();
  }
});

test("sorts customers by name", async () => {
  const store = await createCustomersStore({
    name: nextStoreName(),
    storage: getRxStorageMemory(),
  });
  try {
    await store.createCustomer({ name: "Zeta LLC" });
    await store.createCustomer({ name: "Acme Corp" });
    await store.createCustomer({ name: "Mega Inc" });
    expect(store.listCustomers().map((c) => c.name)).toEqual(["Acme Corp", "Mega Inc", "Zeta LLC"]);
  } finally {
    await store.close();
  }
});
