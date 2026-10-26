import { expect, test } from "vite-plus/test";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";

import {
  allocatedAmountCents,
  allocationGstAmountCents,
  allocationGstFreeAmountCents,
  allocationNetAmountCents,
  allocationTaxableAmountCents,
  assignColumnRole,
  bankCsvColumnRoleLabel,
  bankGstTypeLabel,
  bankTransactionTypeColor,
  bankTransactionTypeLabel,
  calculateGstFromInclusiveCents,
  columnRolesFromPreset,
  createBankingStore,
  DEFAULT_BANK_CATEGORIES,
  DEFAULT_BANK_CSV_PRESET,
  detectBankCsvPresetFromHeaders,
  filterStatementLines,
  getAustralianFinancialYear,
  isBankAccountDocument,
  isBankCategoryDocument,
  isBankCsvColumnRole,
  isBankCsvPreset,
  isBankGstType,
  isBankingLineCategorisationFilter,
  isBankingLineTypeFilter,
  isBankStatementDocument,
  isBankStatementLineDocument,
  isBankTransactionType,
  isDateInFinancialYear,
  isLineFullyAllocated,
  isValidBankId,
  lineGstAmountCents,
  lineGstFreeAmountCents,
  mergeBankCsvPreset,
  normalizeBankAccountDocument,
  normalizeBankCategoryDocument,
  normalizeBankCsvPreset,
  normalizeBankLineAllocation,
  normalizeBankStatementDocument,
  normalizeBankStatementLineDocument,
  parseBankStatementCsv,
  parseCsvDate,
  parseCsvMatrix,
  parseCurrencyToCents,
  presetFromColumnRoles,
  signedStatementLineAmountCents,
  summarizeBankingFinancialYears,
  summarizeFinancialYear,
  unallocatedAmountCents,
  validateBankAccountInput,
  validateBankCategoryInput,
  validateBankStatementLineInput,
} from "../src/feature/banking/index.ts";
import { createInvoicesStore } from "../src/feature/invoices/index.ts";

let storeCounter = 0;
function nextStoreName(prefix = "subbie_banking_test") {
  storeCounter += 1;
  return `${prefix}_${Date.now()}_${storeCounter}`;
}

test("validates banking schema helpers and normalizers", () => {
  expect(isBankTransactionType("payment")).toBe(true);
  expect(isBankTransactionType("receipt")).toBe(true);
  expect(isBankTransactionType("transfer")).toBe(false);
  expect(bankTransactionTypeLabel("payment")).toBe("Payment");
  expect(bankTransactionTypeLabel("receipt")).toBe("Receipt");
  expect(bankTransactionTypeColor("payment")).toBe("danger");
  expect(bankTransactionTypeColor("receipt")).toBe("success");

  const preset = normalizeBankCsvPreset({
    dateColumn: "  Posted Date  ",
    descriptionColumn: "  Narrative ",
  });
  expect(isBankCsvPreset(preset)).toBe(true);
  expect(preset.dateColumn).toBe("Posted Date");
  expect(preset.descriptionColumn).toBe("Narrative");
  expect(preset.amountColumn).toBe(DEFAULT_BANK_CSV_PRESET.amountColumn);

  const splitPreset = normalizeBankCsvPreset({
    debitColumn: "Withdrawal",
    creditColumn: "Deposit",
  });
  expect(splitPreset.amountColumn).toBe("");
  expect(splitPreset.debitColumn).toBe("Withdrawal");
  expect(splitPreset.creditColumn).toBe("Deposit");

  const mergedSplit = mergeBankCsvPreset(DEFAULT_BANK_CSV_PRESET, {
    debitColumn: "Withdrawal",
    creditColumn: "Deposit",
  });
  expect(mergedSplit.amountColumn).toBe("");
  expect(mergedSplit.debitColumn).toBe("Withdrawal");
  expect(mergedSplit.creditColumn).toBe("Deposit");

  const mergedSigned = mergeBankCsvPreset(mergedSplit, {
    amountColumn: "Net Amount",
  });
  expect(mergedSigned.amountColumn).toBe("Net Amount");
  expect(mergedSigned.debitColumn).toBe("");
  expect(mergedSigned.creditColumn).toBe("");

  const headerlessSplit = mergeBankCsvPreset(normalizeBankCsvPreset({ hasHeader: false }), {
    debitColumn: "2",
    creditColumn: "3",
    balanceColumn: "4",
  });
  expect(headerlessSplit.amountColumn).toBe("");
  expect(headerlessSplit.debitColumn).toBe("2");
  expect(headerlessSplit.creditColumn).toBe("3");

  const account = normalizeBankAccountDocument({
    name: "  Operating Account ",
    institution: "  CommBank ",
    accountNumber: " 1234-5678 ",
    currency: "AUD",
  });
  expect(isBankAccountDocument(account)).toBe(true);
  expect(isValidBankId(account.id)).toBe(true);
  expect(account.name).toBe("Operating Account");
  expect(account.institution).toBe("CommBank");
  expect(account.accountNumber).toBe("1234-5678");
  expect(account.currency).toBe("AUD");

  const category = normalizeBankCategoryDocument({
    name: "  Materials ",
    type: "payment",
    description: "  Site materials ",
  });
  expect(isBankCategoryDocument(category)).toBe(true);
  expect(category.name).toBe("Materials");
  expect(category.type).toBe("payment");
  expect(category.description).toBe("Site materials");

  const statement = normalizeBankStatementDocument({
    accountId: account.id,
    filename: "october.csv",
    lineCount: 3,
    startDate: "2026-10-01",
    endDate: "2026-10-31",
  });
  expect(isBankStatementDocument(statement)).toBe(true);

  const line = normalizeBankStatementLineDocument({
    accountId: account.id,
    statementId: statement.id,
    date: "2026-10-15",
    description: "  Bunnings Warehouse ",
    type: "payment",
    amountCents: 25_000,
    balanceCents: 150_000,
    invoiceIds: ["inv_1", "inv_1", "inv_2"],
    allocations: [
      { categoryId: category.id, amountCents: 10_000, notes: "  Timber " },
      { categoryId: category.id, amountCents: 15_000 },
    ],
  });
  expect(isBankStatementLineDocument(line)).toBe(true);
  expect(line.description).toBe("Bunnings Warehouse");
  expect(line.invoiceIds).toEqual(["inv_1", "inv_2"]);
  expect(line.allocations).toHaveLength(2);
  expect(line.allocations[0]?.notes).toBe("Timber");
  expect(signedStatementLineAmountCents(line)).toBe(-25_000);
  expect(allocatedAmountCents(line)).toBe(25_000);
  expect(unallocatedAmountCents(line)).toBe(0);
  expect(isLineFullyAllocated(line)).toBe(true);
  expect(line.isPrivate).toBe(false);

  const privateLine = normalizeBankStatementLineDocument({
    accountId: account.id,
    date: "2026-10-16",
    description: "Groceries",
    type: "payment",
    amountCents: 8_000,
    isPrivate: true,
    allocations: [{ categoryId: category.id, amountCents: 8_000 }],
  });
  expect(isBankStatementLineDocument(privateLine)).toBe(true);
  expect(privateLine.isPrivate).toBe(true);
  expect(privateLine.allocations).toEqual([]);
});

test("validates create inputs for accounts, categories, and statement lines", () => {
  expect(() => validateBankAccountInput({ name: "Business Checking" })).not.toThrow();
  expect(() => validateBankAccountInput({ name: "  " })).toThrow("account name is required");
  expect(() => validateBankAccountInput({ name: "Main", currency: "aud" })).toThrow(
    "currency must be a 3-letter code",
  );

  expect(() => validateBankCategoryInput({ name: "Fuel", type: "payment" })).not.toThrow();
  expect(() => validateBankCategoryInput({ name: "", type: "payment" })).toThrow(
    "category name is required",
  );
  expect(() => validateBankCategoryInput({ name: "Fuel", type: "invalid" as never })).toThrow(
    "category type must be payment or receipt",
  );

  expect(() =>
    validateBankStatementLineInput({
      accountId: "acc_1",
      date: "2026-10-20",
      description: "Client deposit",
      type: "receipt",
      amountCents: 50_000,
      allocations: [{ categoryId: "cat_1", amountCents: 50_000 }],
    }),
  ).not.toThrow();

  expect(() =>
    validateBankStatementLineInput({
      accountId: "acc_1",
      date: "2026-10-20",
      description: "Client deposit",
      type: "receipt",
      amountCents: 50_000,
      allocations: [{ categoryId: "cat_1", amountCents: 60_000 }],
    }),
  ).toThrow("allocated total exceeds line amount");
});

test("parses dates, currency amounts, and CSV matrices", () => {
  expect(parseCsvDate("2026-10-25")).toBe("2026-10-25");
  expect(parseCsvDate("2026-10-5")).toBe("2026-10-05");
  expect(parseCsvDate("2026/10/05")).toBe("2026-10-05");
  expect(parseCsvDate("25/10/2026")).toBe("2026-10-25");
  expect(parseCsvDate("5/10/26")).toBe("2026-10-05");
  expect(parseCsvDate("10/25/2026")).toBe("2026-10-25");
  expect(parseCsvDate("25 Oct 2026")).toBe("2026-10-25");
  expect(parseCsvDate("Oct 25, 2026")).toBe("2026-10-25");
  expect(() => parseCsvDate("")).toThrow("empty date");
  expect(() => parseCsvDate("not-a-date")).toThrow("Invalid CSV date");
  expect(() => parseCsvDate("25/10/202")).toThrow("Invalid CSV date");

  expect(parseCurrencyToCents("1250.50")).toBe(125_050);
  expect(parseCurrencyToCents("-$45.25")).toBe(-4_525);
  expect(parseCurrencyToCents("$-45.25")).toBe(-4_525);
  expect(parseCurrencyToCents("($1,200.00)")).toBe(-120_000);
  expect(parseCurrencyToCents("($-1,200.00)")).toBe(-120_000);
  expect(parseCurrencyToCents("350.00 DR")).toBe(-35_000);
  expect(parseCurrencyToCents("$-350.00 DR")).toBe(-35_000);
  expect(parseCurrencyToCents("900.00 CR")).toBe(90_000);
  expect(parseCurrencyToCents("145.50-")).toBe(-14_550);
  expect(parseCurrencyToCents("AUD 1,250.50")).toBe(125_050);
  expect(parseCurrencyToCents("1,250.50 AUD")).toBe(125_050);
  expect(parseCurrencyToCents("-0.00")).toBe(0);
  expect(() => parseCurrencyToCents("")).toThrow("empty amount");
  expect(() => parseCurrencyToCents("2026-10-01")).toThrow("Invalid CSV amount");
  expect(() => parseCurrencyToCents("25/10/2026")).toThrow("Invalid CSV amount");
  expect(() => parseCurrencyToCents("25 Oct 2026")).toThrow("Invalid CSV amount");
  expect(() => parseCurrencyToCents("TXN-999")).toThrow("Invalid CSV amount");
  expect(() => parseCurrencyToCents("12 34 56")).toThrow("Invalid CSV amount");

  const matrix = parseCsvMatrix(
    '\uFEFFDate,Description,Amount\r\n2026-10-01,"Acme, Inc. ""Invoice #1""",1250.00\r\n',
  );
  expect(matrix).toEqual([
    ["Date", "Description", "Amount"],
    ["2026-10-01", 'Acme, Inc. "Invoice #1"', "1250.00"],
  ]);
});

test("parses CSV bank statements with signed amounts, debit/credit columns, and custom presets", () => {
  const signedCsv = [
    "Date,Description,Amount,Balance",
    "2026-10-01,Acme Corp Deposit,3100.00,8100.00",
    "2026-10-02,Hardware Store,-145.50,7954.50",
  ].join("\n");

  const parsedSigned = parseBankStatementCsv(signedCsv);
  expect(parsedSigned.rows).toHaveLength(2);
  expect(parsedSigned.rows[0]).toEqual({
    date: "2026-10-01",
    description: "Acme Corp Deposit",
    type: "receipt",
    amountCents: 310_000,
    balanceCents: 810_000,
  });
  expect(parsedSigned.rows[1]).toEqual({
    date: "2026-10-02",
    description: "Hardware Store",
    type: "payment",
    amountCents: 14_550,
    balanceCents: 795_450,
  });

  const splitCsv = [
    "Transaction Date,Narrative,Money Out,Money In,Running Balance",
    "24/10/2026,Subcontractor Payment,800.00,,4200.00",
    "25/10/2026,Invoice INV-2026-001,,2500.00,6700.00",
    "26/10/2026,Zero Fee Adjustment,0.00,,6700.00",
  ].join("\n");

  const detected = detectBankCsvPresetFromHeaders([
    "Transaction Date",
    "Narrative",
    "Money Out",
    "Money In",
    "Running Balance",
  ]);
  expect(detected.dateColumn).toBe("Transaction Date");
  expect(detected.descriptionColumn).toBe("Narrative");
  expect(detected.amountColumn).toBe("");
  expect(detected.debitColumn).toBe("Money Out");
  expect(detected.creditColumn).toBe("Money In");
  expect(detected.balanceColumn).toBe("Running Balance");

  expect(
    detectBankCsvPresetFromHeaders(["Date", "Description", "Amount", "Balance"], {
      balanceColumn: "",
    }).balanceColumn,
  ).toBe("");

  expect(columnRolesFromPreset(detected, 4)).toEqual(["date", "description", "amount", "balance"]);

  const parsedSplit = parseBankStatementCsv(splitCsv);
  expect(parseBankStatementCsv(splitCsv, { amountColumn: "" }).rows).toEqual(parsedSplit.rows);
  expect(parsedSplit.rows).toEqual([
    {
      date: "2026-10-24",
      description: "Subcontractor Payment",
      type: "payment",
      amountCents: 80_000,
      balanceCents: 420_000,
    },
    {
      date: "2026-10-25",
      description: "Invoice INV-2026-001",
      type: "receipt",
      amountCents: 250_000,
      balanceCents: 670_000,
    },
    {
      date: "2026-10-26",
      description: "Zero Fee Adjustment",
      type: "payment",
      amountCents: 0,
      balanceCents: 670_000,
    },
  ]);

  const headerlessCsv = "2026-10-10,Fuel Station,-75.20,1000.00";
  const roles = columnRolesFromPreset({ hasHeader: false }, 4);
  expect(roles).toEqual(["date", "description", "amount", "balance"]);
  expect(isBankCsvColumnRole("date")).toBe(true);
  expect(isBankCsvColumnRole("unknown")).toBe(false);
  expect(bankCsvColumnRoleLabel("debit")).toBe("Debit (Payment)");

  const reorderedRoles = assignColumnRole(
    assignColumnRole(["ignore", "date", "amount", "description"], 0, "date"),
    2,
    "debit",
  );
  expect(reorderedRoles).toEqual(["date", "ignore", "debit", "description"]);

  const rolePreset = presetFromColumnRoles(["date", "description", "amount", "balance"]);
  const parsedHeaderless = parseBankStatementCsv(headerlessCsv, rolePreset);
  expect(parsedHeaderless.rows).toEqual([
    {
      date: "2026-10-10",
      description: "Fuel Station",
      type: "payment",
      amountCents: 7_520,
      balanceCents: 100_000,
    },
  ]);

  expect(() =>
    parseBankStatementCsv(
      headerlessCsv,
      presetFromColumnRoles(["ignore", "description", "amount"]),
    ),
  ).toThrow("date column is not assigned");

  expect(() =>
    parseBankStatementCsv(signedCsv, {
      hasHeader: true,
      dateColumn: "",
    }),
  ).toThrow("date column is not assigned");

  expect(() =>
    parseBankStatementCsv(signedCsv, {
      hasHeader: true,
      dateColumn: "Missing Date Column",
    }),
  ).toThrow('date column "Missing Date Column" not found');
});

test("manages multiple bank accounts, imports CSV statements, links invoices, and allocates categories", async () => {
  const invoicesStore = await createInvoicesStore({
    name: nextStoreName("subbie_inv_for_banking"),
    storage: getRxStorageMemory(),
  });
  const bankingStore = await createBankingStore({
    name: nextStoreName("subbie_banking_store"),
    storage: getRxStorageMemory(),
    invoicesStore,
  });

  try {
    // 1. Default categories are seeded
    const seededCategories = bankingStore.listCategories();
    expect(seededCategories.length).toBe(DEFAULT_BANK_CATEGORIES.length);
    expect(bankingStore.listCategories("receipt").length).toBeGreaterThan(0);
    expect(bankingStore.listCategories("payment").length).toBeGreaterThan(0);

    // 2. Create multiple bank accounts with different CSV presets
    const checking = await bankingStore.createAccount({
      name: "Business Checking",
      institution: "ANZ",
      accountNumber: "012-345 11112222",
      currency: "AUD",
    });
    const savings = await bankingStore.createAccount({
      name: "Tax Savings",
      institution: "NAB",
      accountNumber: "082-000 99998888",
      currency: "AUD",
      csvPreset: {
        hasHeader: true,
        dateColumn: "Posted Date",
        descriptionColumn: "Details",
        amountColumn: "",
        debitColumn: "Withdrawal",
        creditColumn: "Deposit",
        balanceColumn: "Balance",
      },
    });
    expect(bankingStore.listAccounts().map((a) => a.name)).toEqual([
      "Business Checking",
      "Tax Savings",
    ]);

    // 3. Import CSV into Business Checking and save detected preset
    const checkingCsv = [
      "Date,Description,Amount,Balance",
      "2026-10-20,Acme Corp INV-2026-001 & INV-2026-002,3500.00,13500.00",
      "2026-10-21,Bunnings Trade & Tools,-450.00,13050.00",
    ].join("\n");

    const checkingImport = await bankingStore.importStatementCsv({
      accountId: checking.id,
      csvText: checkingCsv,
      filename: "checking-oct.csv",
      savePresetToAccount: true,
    });
    expect(checkingImport.statement.lineCount).toBe(2);
    expect(checkingImport.statement.startDate).toBe("2026-10-20");
    expect(checkingImport.statement.endDate).toBe("2026-10-21");
    expect(checkingImport.lines).toHaveLength(2);

    // 4. Import CSV into Tax Savings using its per-account column preset (including same-day rows)
    const savingsCsv = [
      "Posted Date,Details,Withdrawal,Deposit,Balance",
      "2026-10-22,Transfer from Operating,,1000.00,5000.00",
      "2026-10-22,Bonus Interest,,25.00,5025.00",
      "2026-10-23,ATO BAS Payment,600.00,,4425.00",
    ].join("\n");

    const savingsImport = await bankingStore.importStatementCsv({
      accountId: savings.id,
      csvText: savingsCsv,
      filename: "savings-oct.csv",
    });
    expect(savingsImport.lines).toHaveLength(3);
    expect(
      bankingStore
        .listStatementLines({ accountId: savings.id })
        .filter((line) => line.date === "2026-10-22")
        .map((line) => line.description),
    ).toEqual(["Transfer from Operating", "Bonus Interest"]);
    expect(bankingStore.listStatementLines({ accountId: checking.id })).toHaveLength(2);
    expect(bankingStore.listStatementLines({ accountId: savings.id })).toHaveLength(3);
    expect(bankingStore.listStatementLines()).toHaveLength(5);

    const bonusInterestLine = savingsImport.lines.find(
      (line) => line.description === "Bonus Interest",
    )!;
    await bankingStore.deleteStatementLine(bonusInterestLine.id);
    expect(bankingStore.getStatement(savingsImport.statement.id)?.lineCount).toBe(2);
    expect(bankingStore.listStatementLines({ accountId: savings.id })).toHaveLength(2);

    // 5. Create invoices and link them to a statement line (auto-marking them as paid)
    const inv1 = await invoicesStore.createInvoice({
      clientName: "Acme Corp",
      currency: "AUD",
      items: [{ description: "Phase 1", quantity: 1, unitPriceCents: 200_000 }],
    });
    const inv2 = await invoicesStore.createInvoice({
      clientName: "Acme Corp",
      currency: "AUD",
      items: [{ description: "Phase 2", quantity: 1, unitPriceCents: 150_000 }],
    });
    expect(inv1.status).toBe("draft");
    expect(inv2.status).toBe("draft");

    const receiptLine = checkingImport.lines.find((line) => line.type === "receipt")!;
    const paymentLine = checkingImport.lines.find((line) => line.type === "payment")!;

    const linkedLine = await bankingStore.linkInvoicesToLine(receiptLine.id, [inv1.id, inv2.id]);
    expect(linkedLine.invoiceIds).toEqual([inv1.id, inv2.id]);
    expect(invoicesStore.getInvoice(inv1.id)?.status).toBe("paid");
    expect(invoicesStore.getInvoice(inv2.id)?.status).toBe("paid");

    await invoicesStore.setInvoiceStatus(inv1.id, "sent");
    const reducedLine = await bankingStore.linkInvoicesToLine(receiptLine.id, [inv1.id]);
    expect(reducedLine.invoiceIds).toEqual([inv1.id]);
    expect(invoicesStore.getInvoice(inv1.id)?.status).toBe("sent");

    await bankingStore.linkInvoiceToLine(receiptLine.id, inv2.id);
    const unlinkedLine = await bankingStore.unlinkInvoiceFromLine(receiptLine.id, inv2.id);
    expect(unlinkedLine.invoiceIds).toEqual([inv1.id]);

    // 6. Allocate receipt line to a receipt category (100% quick allocation)
    const customerReceiptsCategory = bankingStore
      .listCategories("receipt")
      .find((cat) => cat.name === "Customer Receipts")!;

    const allocatedReceipt = await bankingStore.allocateLineToCategory(
      receiptLine.id,
      customerReceiptsCategory.id,
      "Settled Acme invoices",
    );
    expect(isLineFullyAllocated(allocatedReceipt)).toBe(true);
    expect(allocatedReceipt.allocations).toEqual([
      {
        id: expect.any(String),
        categoryId: customerReceiptsCategory.id,
        amountCents: 350_000,
        gstType: "gst",
        notes: "Settled Acme invoices",
      },
    ]);

    // 7. Split-allocate payment line across multiple payment categories
    const materialsCategory = bankingStore
      .listCategories("payment")
      .find((cat) => cat.name === "Materials & Supplies")!;
    const toolsCategory = bankingStore
      .listCategories("payment")
      .find((cat) => cat.name === "Tools & Equipment")!;

    const allocatedPayment = await bankingStore.setLineAllocations(paymentLine.id, [
      { categoryId: materialsCategory.id, amountCents: 30_000, notes: "Timber" },
      { categoryId: toolsCategory.id, amountCents: 15_000, notes: "Saw blades" },
    ]);
    expect(allocatedAmountCents(allocatedPayment)).toBe(45_000);
    expect(unallocatedAmountCents(allocatedPayment)).toBe(0);
    expect(isLineFullyAllocated(allocatedPayment)).toBe(true);

    // 8. Reject allocating a payment line to a receipt category or exceeding total amount
    await expect(
      bankingStore.allocateLineToCategory(paymentLine.id, customerReceiptsCategory.id),
    ).rejects.toThrow("cannot be allocated to a payment line");

    await expect(
      bankingStore.setLineAllocations(paymentLine.id, [
        { categoryId: materialsCategory.id, amountCents: 50_000 },
      ]),
    ).rejects.toThrow("exceeds statement line amount");

    // 9. Create, update type, & delete custom category and verify cascading cleanup
    const customCategory = await bankingStore.createCategory({
      name: "Protective Gear",
      type: "payment",
      description: "PPE and safety gear",
    });
    await bankingStore.allocateLineToCategory(paymentLine.id, customCategory.id);
    expect(bankingStore.getStatementLine(paymentLine.id)?.allocations).toHaveLength(1);

    await bankingStore.updateCategory(customCategory.id, { type: "receipt" });
    expect(bankingStore.getStatementLine(paymentLine.id)?.allocations).toEqual([]);
    await expect(
      bankingStore.updateStatementLine(paymentLine.id, {
        notes: "Updated after category flip",
        balanceCents: undefined,
      }),
    ).resolves.toMatchObject({ notes: "Updated after category flip" });
    expect(bankingStore.getStatementLine(paymentLine.id)?.balanceCents).toBeUndefined();

    await expect(
      bankingStore.updateStatementLine(paymentLine.id, { accountId: "missing_account" }),
    ).rejects.toThrow("Bank account not found");

    await bankingStore.updateCategory(customCategory.id, { type: "payment" });
    await bankingStore.allocateLineToCategory(paymentLine.id, customCategory.id);
    expect(bankingStore.getStatementLine(paymentLine.id)?.allocations).toHaveLength(1);

    await bankingStore.deleteCategory(customCategory.id);
    expect(bankingStore.getStatementLine(paymentLine.id)?.allocations).toEqual([]);

    // 10. Delete account cascades to its statements and statement lines
    await bankingStore.deleteAccount(savings.id);
    expect(bankingStore.getAccount(savings.id)).toBeUndefined();
    expect(bankingStore.listStatements(savings.id)).toEqual([]);
    expect(bankingStore.listStatementLines({ accountId: savings.id })).toEqual([]);
    expect(bankingStore.listStatementLines({ accountId: checking.id })).toHaveLength(2);

    // 11. Deleting remaining lines of a statement updates metadata and removes empty statement
    await bankingStore.deleteStatementLine(paymentLine.id);
    expect(bankingStore.getStatement(checkingImport.statement.id)).toMatchObject({
      lineCount: 1,
      startDate: "2026-10-20",
      endDate: "2026-10-20",
    });
    await bankingStore.deleteStatementLine(receiptLine.id);
    expect(bankingStore.getStatement(checkingImport.statement.id)).toBeUndefined();
  } finally {
    await bankingStore.close();
    await invoicesStore.close();
  }
});

test("filters statement lines by account, categorisation status, type, category, and search query", () => {
  expect(isBankingLineCategorisationFilter("all")).toBe(true);
  expect(isBankingLineCategorisationFilter("categorised")).toBe(true);
  expect(isBankingLineCategorisationFilter("partially-categorised")).toBe(true);
  expect(isBankingLineCategorisationFilter("uncategorised")).toBe(true);
  expect(isBankingLineCategorisationFilter("other")).toBe(false);

  expect(isBankingLineTypeFilter("all")).toBe(true);
  expect(isBankingLineTypeFilter("payment")).toBe(true);
  expect(isBankingLineTypeFilter("receipt")).toBe(true);
  expect(isBankingLineTypeFilter("transfer")).toBe(false);

  const receiptsCat = normalizeBankCategoryDocument({
    id: "cat_receipts",
    name: "Customer Receipts",
    type: "receipt",
  });
  const materialsCat = normalizeBankCategoryDocument({
    id: "cat_materials",
    name: "Materials & Supplies",
    type: "payment",
  });
  const fuelCat = normalizeBankCategoryDocument({
    id: "cat_fuel",
    name: "Vehicle & Travel",
    type: "payment",
  });
  const categories = [receiptsCat, materialsCat, fuelCat];

  const lineCategorisedReceipt = normalizeBankStatementLineDocument({
    id: "line_1",
    accountId: "acc_operating",
    date: "2026-10-10",
    description: "Acme Corp Deposit",
    type: "receipt",
    amountCents: 200_000,
    allocations: [{ categoryId: receiptsCat.id, amountCents: 200_000, notes: "Progress claim 1" }],
  });

  const linePartialPayment = normalizeBankStatementLineDocument({
    id: "line_2",
    accountId: "acc_operating",
    date: "2026-10-12",
    description: "Bunnings Warehouse",
    type: "payment",
    amountCents: 50_000,
    notes: "Job site timber",
    allocations: [{ categoryId: materialsCat.id, amountCents: 30_000 }],
  });

  const lineUncategorisedPayment = normalizeBankStatementLineDocument({
    id: "line_3",
    accountId: "acc_card",
    date: "2026-10-15",
    description: "Ampol Service Station",
    type: "payment",
    amountCents: 10_000,
    allocations: [],
  });

  const lines = [lineCategorisedReceipt, linePartialPayment, lineUncategorisedPayment];

  expect(filterStatementLines(lines).map((l) => l.id)).toEqual(["line_1", "line_2", "line_3"]);

  expect(filterStatementLines(lines, { accountId: "acc_operating" }).map((l) => l.id)).toEqual([
    "line_1",
    "line_2",
  ]);
  expect(filterStatementLines(lines, { accountId: "acc_card" }).map((l) => l.id)).toEqual([
    "line_3",
  ]);

  expect(filterStatementLines(lines, { categorisation: "categorised" }).map((l) => l.id)).toEqual([
    "line_1",
  ]);
  expect(
    filterStatementLines(lines, { categorisation: "partially-categorised" }).map((l) => l.id),
  ).toEqual(["line_2"]);
  expect(filterStatementLines(lines, { categorisation: "uncategorised" }).map((l) => l.id)).toEqual(
    ["line_3"],
  );

  expect(filterStatementLines(lines, { type: "receipt" }).map((l) => l.id)).toEqual(["line_1"]);
  expect(filterStatementLines(lines, { type: "payment" }).map((l) => l.id)).toEqual([
    "line_2",
    "line_3",
  ]);

  expect(filterStatementLines(lines, { categoryId: materialsCat.id }).map((l) => l.id)).toEqual([
    "line_2",
  ]);
  expect(filterStatementLines(lines, { categoryId: fuelCat.id })).toEqual([]);

  expect(
    filterStatementLines(lines, { searchQuery: "bunnings", categories }).map((l) => l.id),
  ).toEqual(["line_2"]);
  expect(
    filterStatementLines(lines, { searchQuery: "timber", categories }).map((l) => l.id),
  ).toEqual(["line_2"]);
  expect(
    filterStatementLines(lines, { searchQuery: "progress claim", categories }).map((l) => l.id),
  ).toEqual(["line_1"]);
  expect(
    filterStatementLines(lines, { searchQuery: "materials", categories }).map((l) => l.id),
  ).toEqual(["line_2"]);
  expect(
    filterStatementLines(lines, { searchQuery: "2026-10-15", categories }).map((l) => l.id),
  ).toEqual(["line_3"]);

  expect(
    filterStatementLines(lines, {
      accountId: "acc_operating",
      type: "payment",
      categorisation: "partially-categorised",
      categoryId: materialsCat.id,
      searchQuery: "bunnings",
      categories,
    }).map((l) => l.id),
  ).toEqual(["line_2"]);
});

test("calculates and persists GST, GST Free, and Part GST payment allocations (10% GST-inclusive)", async () => {
  expect(isBankGstType("gst")).toBe(true);
  expect(isBankGstType("gst-free")).toBe(true);
  expect(isBankGstType("part-gst")).toBe(true);
  expect(isBankGstType("invalid")).toBe(false);
  expect(bankGstTypeLabel("gst")).toBe("GST");
  expect(bankGstTypeLabel("gst-free")).toBe("GST Free");
  expect(bankGstTypeLabel("part-gst")).toBe("Part GST");

  // 10% GST-inclusive (1/11th): $110.00 -> $10.00 GST, $100.00 net
  expect(calculateGstFromInclusiveCents(11_000)).toBe(1_000);
  expect(calculateGstFromInclusiveCents(0)).toBe(0);

  const gstAlloc = normalizeBankLineAllocation({
    categoryId: "cat_1",
    amountCents: 11_000,
    gstType: "gst",
  });
  expect(allocationGstFreeAmountCents(gstAlloc)).toBe(0);
  expect(allocationTaxableAmountCents(gstAlloc)).toBe(11_000);
  expect(allocationGstAmountCents(gstAlloc)).toBe(1_000);
  expect(allocationNetAmountCents(gstAlloc)).toBe(10_000);

  const gstFreeAlloc = normalizeBankLineAllocation({
    categoryId: "cat_1",
    amountCents: 11_000,
    gstType: "gst-free",
  });
  expect(allocationGstFreeAmountCents(gstFreeAlloc)).toBe(11_000);
  expect(allocationTaxableAmountCents(gstFreeAlloc)).toBe(0);
  expect(allocationGstAmountCents(gstFreeAlloc)).toBe(0);
  expect(allocationNetAmountCents(gstFreeAlloc)).toBe(11_000);

  // Part GST: $110.00 payment with $22.00 GST Free -> $88.00 taxable -> $8.00 GST, $102.00 net
  const partGstAlloc = normalizeBankLineAllocation({
    categoryId: "cat_1",
    amountCents: 11_000,
    gstType: "part-gst",
    gstFreeAmountCents: 2_200,
  });
  expect(allocationGstFreeAmountCents(partGstAlloc)).toBe(2_200);
  expect(allocationTaxableAmountCents(partGstAlloc)).toBe(8_800);
  expect(allocationGstAmountCents(partGstAlloc)).toBe(800);
  expect(allocationNetAmountCents(partGstAlloc)).toBe(10_200);

  const lineWithSplitGst = normalizeBankStatementLineDocument({
    accountId: "acc_1",
    date: "2026-10-20",
    description: "Mixed Supplies",
    type: "payment",
    amountCents: 22_000,
    allocations: [gstAlloc, partGstAlloc],
  });
  expect(lineGstAmountCents(lineWithSplitGst)).toBe(1_800);
  expect(lineGstFreeAmountCents(lineWithSplitGst)).toBe(2_200);

  expect(() =>
    validateBankStatementLineInput({
      accountId: "acc_1",
      date: "2026-10-20",
      description: "Invalid Part GST",
      type: "payment",
      amountCents: 10_000,
      allocations: [
        {
          categoryId: "cat_1",
          amountCents: 10_000,
          gstType: "part-gst",
          gstFreeAmountCents: 12_000,
        },
      ],
    }),
  ).toThrow("GST free amount cannot exceed allocation amount");

  const bankingStore = await createBankingStore({
    name: nextStoreName("subbie_banking_gst"),
    storage: getRxStorageMemory(),
  });

  try {
    const account = await bankingStore.createAccount({
      name: "Business Account",
      currency: "AUD",
    });
    const materialsCat = bankingStore
      .listCategories("payment")
      .find((cat) => cat.name === "Materials & Supplies")!;
    const receiptsCat = bankingStore
      .listCategories("receipt")
      .find((cat) => cat.name === "Customer Receipts")!;

    const receiptLine = await bankingStore.createStatementLine({
      accountId: account.id,
      date: "2026-10-24",
      description: "Customer Progress Payment",
      type: "receipt",
      amountCents: 22_000,
    });

    // Receipt defaults to GST (10% GST-inclusive -> $20.00 GST on $220.00)
    const receiptDefaultGst = await bankingStore.allocateLineToCategory(
      receiptLine.id,
      receiptsCat.id,
    );
    expect(receiptDefaultGst.allocations[0]?.gstType).toBe("gst");
    expect(lineGstAmountCents(receiptDefaultGst)).toBe(2_000);

    // Receipt can be allocated as GST Free
    const receiptGstFree = await bankingStore.allocateLineToCategory(
      receiptLine.id,
      receiptsCat.id,
      { gstType: "gst-free" },
    );
    expect(receiptGstFree.allocations[0]?.gstType).toBe("gst-free");
    expect(lineGstAmountCents(receiptGstFree)).toBe(0);
    expect(lineGstFreeAmountCents(receiptGstFree)).toBe(22_000);

    await expect(
      bankingStore.allocateLineToCategory(receiptLine.id, receiptsCat.id, {
        gstType: "part-gst",
        gstFreeAmountCents: 5_000,
      }),
    ).rejects.toThrow("receipt allocations must be gst or gst-free");

    const line = await bankingStore.createStatementLine({
      accountId: account.id,
      date: "2026-10-25",
      description: "Hardware & Water Supply",
      type: "payment",
      amountCents: 11_000,
    });

    // Allocate as GST
    const asGst = await bankingStore.allocateLineToCategory(line.id, materialsCat.id, {
      gstType: "gst",
      notes: "Standard GST purchase",
    });
    expect(asGst.allocations[0]).toMatchObject({
      categoryId: materialsCat.id,
      amountCents: 11_000,
      gstType: "gst",
      notes: "Standard GST purchase",
    });
    expect(lineGstAmountCents(asGst)).toBe(1_000);

    // Allocate as GST Free
    const asGstFree = await bankingStore.allocateLineToCategory(line.id, materialsCat.id, {
      gstType: "gst-free",
    });
    expect(asGstFree.allocations[0]?.gstType).toBe("gst-free");
    expect(lineGstAmountCents(asGstFree)).toBe(0);
    expect(lineGstFreeAmountCents(asGstFree)).toBe(11_000);

    // Allocate as Part GST with $22.00 GST Free
    const asPartGst = await bankingStore.allocateLineToCategory(line.id, materialsCat.id, {
      gstType: "part-gst",
      gstFreeAmountCents: 2_200,
    });
    expect(asPartGst.allocations[0]).toMatchObject({
      categoryId: materialsCat.id,
      amountCents: 11_000,
      gstType: "part-gst",
      gstFreeAmountCents: 2_200,
    });
    expect(lineGstFreeAmountCents(asPartGst)).toBe(2_200);
    expect(lineGstAmountCents(asPartGst)).toBe(800);

    // Reject GST free amount exceeding allocation amount
    await expect(
      bankingStore.allocateLineToCategory(line.id, materialsCat.id, {
        gstType: "part-gst",
        gstFreeAmountCents: 15_000,
      }),
    ).rejects.toThrow("GST free amount cannot exceed allocation amount");
  } finally {
    await bankingStore.close();
  }
});

test("marks statement lines as private and excludes them from business totals", async () => {
  const bankingStore = await createBankingStore({
    name: nextStoreName("subbie_banking_private"),
    storage: getRxStorageMemory(),
  });

  try {
    const account = await bankingStore.createAccount({
      name: "Mixed Account",
      currency: "AUD",
    });
    const materialsCat = bankingStore
      .listCategories("payment")
      .find((cat) => cat.name === "Materials & Supplies")!;

    // Private lines drop any supplied allocations at creation
    const privateLine = await bankingStore.createStatementLine({
      accountId: account.id,
      date: "2026-10-24",
      description: "Personal groceries",
      type: "payment",
      amountCents: 12_000,
      allocations: [{ categoryId: materialsCat.id, amountCents: 12_000 }],
      isPrivate: true,
    });
    expect(privateLine.isPrivate).toBe(true);
    expect(privateLine.allocations).toEqual([]);

    const businessLine = await bankingStore.createStatementLine({
      accountId: account.id,
      date: "2026-10-25",
      description: "Job materials",
      type: "payment",
      amountCents: 11_000,
    });
    const receiptLine = await bankingStore.createStatementLine({
      accountId: account.id,
      date: "2026-10-26",
      description: "Client deposit",
      type: "receipt",
      amountCents: 20_000,
    });

    // Marking private clears existing allocations
    await bankingStore.allocateLineToCategory(businessLine.id, materialsCat.id);
    const markedPrivate = await bankingStore.setLinePrivate(businessLine.id, true);
    expect(markedPrivate.isPrivate).toBe(true);
    expect(markedPrivate.allocations).toEqual([]);

    // Private lines cannot be allocated to categories
    await expect(
      bankingStore.allocateLineToCategory(businessLine.id, materialsCat.id),
    ).rejects.toThrow("mark it as business");
    await expect(
      bankingStore.setLineAllocations(businessLine.id, [
        { categoryId: materialsCat.id, amountCents: 1_000 },
      ]),
    ).rejects.toThrow("mark it as business");

    const backToBusiness = await bankingStore.setLinePrivate(businessLine.id, false);
    expect(backToBusiness.isPrivate).toBe(false);

    // updateStatementLine also enforces the invariant
    await bankingStore.allocateLineToCategory(businessLine.id, materialsCat.id);
    const rePrivated = await bankingStore.updateStatementLine(businessLine.id, {
      isPrivate: true,
    });
    expect(rePrivated.isPrivate).toBe(true);
    expect(rePrivated.allocations).toEqual([]);

    const lines = bankingStore.listStatementLines({ accountId: account.id });

    // Filtering: private lines only match "private" and "categorised" (resolved) filters
    expect(isBankingLineCategorisationFilter("private")).toBe(true);
    expect(
      filterStatementLines(lines, { categorisation: "private" })
        .map((line) => line.id)
        .sort(),
    ).toEqual([privateLine.id, businessLine.id].sort());
    expect(filterStatementLines(lines, { categorisation: "categorised" })).toHaveLength(2);
    expect(
      filterStatementLines(lines, { categorisation: "uncategorised" }).map((line) => line.id),
    ).toEqual([receiptLine.id]);
  } finally {
    await bankingStore.close();
  }
});
test("deleteStatement removes the statement and its lines and emits change events", async () => {
  const store = await createBankingStore({
    name: nextStoreName("subbie_banking_delete"),
    storage: getRxStorageMemory(),
  });

  try {
    const account = await store.createAccount({ name: "Checking" });
    const csv = [
      "Date,Description,Amount",
      "2026-10-20,Acme Corp,3500.00",
      "2026-10-21,Bunnings,-450.00",
    ].join("\n");
    const { statement, lines } = await store.importStatementCsv({
      accountId: account.id,
      csvText: csv,
      filename: "checking-oct.csv",
    });

    const statementEvents: string[] = [];
    const lineEvents: string[] = [];
    const statementSub = store.statementsCollection.subscribeChanges(
      (changes) => {
        for (const change of changes) {
          statementEvents.push(`${change.type}:${String(change.key)}`);
        }
      },
      { includeInitialState: true },
    );
    const lineSub = store.linesCollection.subscribeChanges(
      (changes) => {
        for (const change of changes) {
          lineEvents.push(`${change.type}:${String(change.key)}`);
        }
      },
      { includeInitialState: true },
    );

    expect(store.listStatements()).toHaveLength(1);
    await store.deleteStatement(statement.id);

    expect(store.listStatements()).toHaveLength(0);
    expect(store.listStatementLines({ accountId: account.id })).toHaveLength(0);
    expect(statementEvents).toContain(`delete:${statement.id}`);
    for (const line of lines) {
      expect(lineEvents).toContain(`delete:${line.id}`);
    }

    statementSub.unsubscribe();
    lineSub.unsubscribe();
  } finally {
    await store.close();
  }
});

test("bulk allocates, clears, and sets private status across multiple statement lines", async () => {
  const store = await createBankingStore({
    name: nextStoreName("subbie_banking_bulk"),
    storage: getRxStorageMemory(),
  });

  try {
    const account = await store.createAccount({
      name: "Business Account",
      currency: "AUD",
    });
    const materialsCat = store
      .listCategories("payment")
      .find((cat) => cat.name === "Materials & Supplies")!;

    const p1 = await store.createStatementLine({
      accountId: account.id,
      date: "2026-10-20",
      description: "Bunnings #1",
      type: "payment",
      amountCents: 11_000,
    });
    const p2 = await store.createStatementLine({
      accountId: account.id,
      date: "2026-10-21",
      description: "Bunnings #2",
      type: "payment",
      amountCents: 22_000,
    });
    const r1 = await store.createStatementLine({
      accountId: account.id,
      date: "2026-10-22",
      description: "Client Payment",
      type: "receipt",
      amountCents: 55_000,
    });

    // Empty selection is a no-op
    expect(await store.allocateLinesToCategory([], materialsCat.id)).toEqual([]);

    // Rejects mixed payment/receipt batch without mutating earlier lines
    await expect(store.allocateLinesToCategory([p1.id, r1.id], materialsCat.id)).rejects.toThrow(
      "cannot be allocated to a receipt line",
    );
    expect(store.getStatementLine(p1.id)?.allocations).toEqual([]);

    // Bulk allocate multiple payment lines together with GST options and notes
    const allocated = await store.allocateLinesToCategory([p1.id, p2.id], materialsCat.id, {
      gstType: "gst-free",
      notes: "Bulk trade supplies",
    });
    expect(allocated).toHaveLength(2);
    expect(store.getStatementLine(p1.id)?.allocations).toMatchObject([
      {
        categoryId: materialsCat.id,
        amountCents: 11_000,
        gstType: "gst-free",
        notes: "Bulk trade supplies",
      },
    ]);
    expect(store.getStatementLine(p2.id)?.allocations).toMatchObject([
      {
        categoryId: materialsCat.id,
        amountCents: 22_000,
        gstType: "gst-free",
        notes: "Bulk trade supplies",
      },
    ]);

    // Bulk clear category allocations
    const cleared = await store.clearLinesAllocations([p1.id, p2.id]);
    expect(cleared).toHaveLength(2);
    expect(store.getStatementLine(p1.id)?.allocations).toEqual([]);
    expect(store.getStatementLine(p2.id)?.allocations).toEqual([]);

    // Bulk mark private and back to business
    await store.allocateLinesToCategory([p1.id, p2.id], materialsCat.id);
    const privated = await store.setLinesPrivate([p1.id, p2.id], true);
    expect(privated.every((line) => line.isPrivate && line.allocations.length === 0)).toBe(true);

    await expect(store.allocateLinesToCategory([p1.id, p2.id], materialsCat.id)).rejects.toThrow(
      "mark it as business",
    );

    const business = await store.setLinesPrivate([p1.id, p2.id], false);
    expect(business.every((line) => !line.isPrivate)).toBe(true);
  } finally {
    await store.close();
  }
});

test("calculates current and previous Australian financial year summaries (July 1 - June 30)", () => {
  // Reference date in October 2026 -> Current FY is 2026-07-01 to 2027-06-30, Previous FY is 2025-07-01 to 2026-06-30
  const fyOct2026 = getAustralianFinancialYear("2026-10-25", 0);
  expect(fyOct2026).toEqual({
    startYear: 2026,
    endYear: 2027,
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    label: "FY 2026–27",
  });
  expect(getAustralianFinancialYear("2026-10-25", -1)).toEqual({
    startYear: 2025,
    endYear: 2026,
    startDate: "2025-07-01",
    endDate: "2026-06-30",
    label: "FY 2025–26",
  });

  // Reference date in June 2026 -> Current FY is 2025-07-01 to 2026-06-30, Previous FY is 2024-07-01 to 2025-06-30
  expect(getAustralianFinancialYear("2026-06-30", 0)).toEqual({
    startYear: 2025,
    endYear: 2026,
    startDate: "2025-07-01",
    endDate: "2026-06-30",
    label: "FY 2025–26",
  });
  expect(getAustralianFinancialYear("2026-07-01", 0)).toEqual({
    startYear: 2026,
    endYear: 2027,
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    label: "FY 2026–27",
  });

  expect(isDateInFinancialYear("2026-06-30", fyOct2026)).toBe(false);
  expect(isDateInFinancialYear("2026-07-01", fyOct2026)).toBe(true);
  expect(isDateInFinancialYear("2027-06-30", fyOct2026)).toBe(true);
  expect(isDateInFinancialYear("2027-07-01", fyOct2026)).toBe(false);

  const account = normalizeBankAccountDocument({
    id: "acc_aud",
    name: "Operating",
    currency: "AUD",
  });
  const customerReceiptsCat = normalizeBankCategoryDocument({
    id: "cat_receipts",
    name: "Customer Receipts",
    type: "receipt",
  });
  const otherIncomeCat = normalizeBankCategoryDocument({
    id: "cat_other_income",
    name: "Other Income",
    type: "receipt",
  });
  const materialsCat = normalizeBankCategoryDocument({
    id: "cat_materials",
    name: "Materials & Supplies",
    type: "payment",
  });
  const toolsCat = normalizeBankCategoryDocument({
    id: "cat_tools",
    name: "Tools & Equipment",
    type: "payment",
  });
  const categories = [materialsCat, customerReceiptsCat, toolsCat, otherIncomeCat];

  const statementLines = [
    // Current FY (2026-07-01 to 2027-06-30)
    // Receipt 1: $2,200.00 incl GST -> $200.00 GST, $2,000.00 ex GST
    normalizeBankStatementLineDocument({
      id: "curr_r1",
      accountId: account.id,
      date: "2026-07-15",
      description: "Invoice 101",
      type: "receipt",
      amountCents: 220_000,
      allocations: [{ categoryId: customerReceiptsCat.id, amountCents: 220_000, gstType: "gst" }],
    }),
    // Receipt 2: $500.00 GST Free -> $0.00 GST, $500.00 ex GST
    normalizeBankStatementLineDocument({
      id: "curr_r2",
      accountId: account.id,
      date: "2026-10-05",
      description: "Interest Refund",
      type: "receipt",
      amountCents: 50_000,
      allocations: [{ categoryId: otherIncomeCat.id, amountCents: 50_000, gstType: "gst-free" }],
    }),
    // Payment 1: $1,100.00 incl GST -> $100.00 GST, $1,000.00 ex GST (Materials)
    normalizeBankStatementLineDocument({
      id: "curr_p1",
      accountId: account.id,
      date: "2026-08-20",
      description: "Bunnings",
      type: "payment",
      amountCents: 110_000,
      allocations: [{ categoryId: materialsCat.id, amountCents: 110_000, gstType: "gst" }],
    }),
    // Payment 2: $110.00 Part GST ($22.00 GST Free -> $88.00 taxable -> $8.00 GST, $102.00 ex GST) (Tools)
    normalizeBankStatementLineDocument({
      id: "curr_p2",
      accountId: account.id,
      date: "2027-06-30",
      description: "Mixed Trade Purchase",
      type: "payment",
      amountCents: 11_000,
      allocations: [
        {
          categoryId: toolsCat.id,
          amountCents: 11_000,
          gstType: "part-gst",
          gstFreeAmountCents: 2_200,
        },
      ],
    }),
    // Private payment in Current FY -> excluded from all totals
    normalizeBankStatementLineDocument({
      id: "curr_private",
      accountId: account.id,
      date: "2026-09-10",
      description: "Personal Groceries",
      type: "payment",
      amountCents: 30_000,
      isPrivate: true,
    }),
    // Uncategorised receipt and payment in Current FY -> excluded from all totals
    normalizeBankStatementLineDocument({
      id: "curr_uncat_r",
      accountId: account.id,
      date: "2026-11-01",
      description: "Uncategorised Deposit",
      type: "receipt",
      amountCents: 80_000,
      allocations: [],
    }),
    normalizeBankStatementLineDocument({
      id: "curr_uncat_p",
      accountId: account.id,
      date: "2026-11-02",
      description: "Uncategorised Expense",
      type: "payment",
      amountCents: 45_000,
      allocations: [],
    }),

    // Previous FY (2025-07-01 to 2026-06-30)
    // Receipt: $1,100.00 incl GST -> $100.00 GST, $1,000.00 ex GST
    normalizeBankStatementLineDocument({
      id: "prev_r1",
      accountId: account.id,
      date: "2025-07-01",
      description: "Prior FY Invoice",
      type: "receipt",
      amountCents: 110_000,
      allocations: [{ categoryId: customerReceiptsCat.id, amountCents: 110_000, gstType: "gst" }],
    }),
    // Partially categorised payment: line is $500.00, only $330.00 categorised ($30.00 GST, $300.00 ex GST)
    normalizeBankStatementLineDocument({
      id: "prev_p1",
      accountId: account.id,
      date: "2026-06-30",
      description: "Prior FY Materials",
      type: "payment",
      amountCents: 50_000,
      allocations: [{ categoryId: materialsCat.id, amountCents: 33_000, gstType: "gst" }],
    }),

    // Older FY (2024-25) -> excluded from both current and previous
    normalizeBankStatementLineDocument({
      id: "older_r1",
      accountId: account.id,
      date: "2025-06-30",
      description: "Two FYs Ago",
      type: "receipt",
      amountCents: 999_000,
      allocations: [{ categoryId: customerReceiptsCat.id, amountCents: 999_000, gstType: "gst" }],
    }),
  ];

  const { currentFinancialYear, previousFinancialYear } = summarizeBankingFinancialYears({
    accounts: [account],
    categories,
    statementLines,
    referenceDate: "2026-10-25",
  });

  // Current FY assertions (2026–27)
  expect(currentFinancialYear.financialYear.label).toBe("FY 2026–27");
  expect(currentFinancialYear.currency).toBe("AUD");
  expect(currentFinancialYear.gstCollectedCents).toBe(20_000);
  expect(currentFinancialYear.gstPaidCents).toBe(10_800);
  expect(currentFinancialYear.gstDifferenceCents).toBe(9_200);
  expect(currentFinancialYear.totalCollectedIncGstCents).toBe(270_000);
  expect(currentFinancialYear.totalPaidIncGstCents).toBe(121_000);
  expect(currentFinancialYear.totalDifferenceIncGstCents).toBe(149_000);
  expect(currentFinancialYear.totalCollectedExGstCents).toBe(250_000);
  expect(currentFinancialYear.totalPaidExGstCents).toBe(110_200);
  expect(currentFinancialYear.totalDifferenceExGstCents).toBe(139_800);
  expect(
    currentFinancialYear.categorySummaries.map((item) => ({
      name: item.category.name,
      amountExGstCents: item.amountExGstCents,
      gstAmountCents: item.gstAmountCents,
      amountIncGstCents: item.amountIncGstCents,
    })),
  ).toEqual([
    {
      name: "Customer Receipts",
      amountExGstCents: 200_000,
      gstAmountCents: 20_000,
      amountIncGstCents: 220_000,
    },
    {
      name: "Other Income",
      amountExGstCents: 50_000,
      gstAmountCents: 0,
      amountIncGstCents: 50_000,
    },
    {
      name: "Materials & Supplies",
      amountExGstCents: 100_000,
      gstAmountCents: 10_000,
      amountIncGstCents: 110_000,
    },
    {
      name: "Tools & Equipment",
      amountExGstCents: 10_200,
      gstAmountCents: 800,
      amountIncGstCents: 11_000,
    },
  ]);

  // Previous FY assertions (2025–26)
  expect(previousFinancialYear.financialYear.label).toBe("FY 2025–26");
  expect(previousFinancialYear.currency).toBe("AUD");
  expect(previousFinancialYear.gstCollectedCents).toBe(10_000);
  expect(previousFinancialYear.gstPaidCents).toBe(3_000);
  expect(previousFinancialYear.gstDifferenceCents).toBe(7_000);
  expect(previousFinancialYear.totalCollectedIncGstCents).toBe(110_000);
  expect(previousFinancialYear.totalPaidIncGstCents).toBe(33_000);
  expect(previousFinancialYear.totalDifferenceIncGstCents).toBe(77_000);
  expect(previousFinancialYear.totalCollectedExGstCents).toBe(100_000);
  expect(previousFinancialYear.totalPaidExGstCents).toBe(30_000);
  expect(previousFinancialYear.totalDifferenceExGstCents).toBe(70_000);
  expect(
    previousFinancialYear.categorySummaries.map((item) => ({
      name: item.category.name,
      amountExGstCents: item.amountExGstCents,
    })),
  ).toEqual([
    { name: "Customer Receipts", amountExGstCents: 100_000 },
    { name: "Materials & Supplies", amountExGstCents: 30_000 },
  ]);

  // Direct summarizeFinancialYear call with explicit currency override
  const direct = summarizeFinancialYear({
    financialYear: fyOct2026,
    statementLines: [],
    categories: [],
    currency: "NZD",
  });
  expect(direct.currency).toBe("NZD");
  expect(direct.totalCollectedIncGstCents).toBe(0);

  // Resolves currency from accounts referenced by lines in the financial year and ignores unknown categories
  const unusedUsdAccount = normalizeBankAccountDocument({
    id: "acc_usd",
    name: "AAA USD Account",
    currency: "USD",
  });
  const subsetSummary = summarizeFinancialYear({
    financialYear: fyOct2026,
    accounts: [unusedUsdAccount, account],
    statementLines,
    categories: [customerReceiptsCat],
  });
  expect(subsetSummary.currency).toBe("AUD");
  expect(subsetSummary.totalCollectedIncGstCents).toBe(220_000);
  expect(subsetSummary.totalPaidIncGstCents).toBe(0);
  expect(subsetSummary.categorySummaries).toHaveLength(1);
});
