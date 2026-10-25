import { expect, test } from "vite-plus/test";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";

import {
  allocatedAmountCents,
  assignColumnRole,
  bankCsvColumnRoleLabel,
  bankTransactionTypeColor,
  bankTransactionTypeLabel,
  columnRolesFromPreset,
  createBankingStore,
  DEFAULT_BANK_CATEGORIES,
  DEFAULT_BANK_CSV_PRESET,
  detectBankCsvPresetFromHeaders,
  isBankAccountDocument,
  isBankCategoryDocument,
  isBankCsvColumnRole,
  isBankCsvPreset,
  isBankStatementDocument,
  isBankStatementLineDocument,
  isBankTransactionType,
  isLineFullyAllocated,
  isValidBankId,
  mergeBankCsvPreset,
  normalizeBankAccountDocument,
  normalizeBankCategoryDocument,
  normalizeBankCsvPreset,
  normalizeBankStatementDocument,
  normalizeBankStatementLineDocument,
  parseBankStatementCsv,
  parseCsvDate,
  parseCsvMatrix,
  parseCurrencyToCents,
  presetFromColumnRoles,
  signedStatementLineAmountCents,
  summarizeBankingOverview,
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

test("summarizes banking overview cash flow, categorisation progress, accounts, and categories", () => {
  const emptyOverview = summarizeBankingOverview({
    accounts: [],
    categories: [],
    statements: [],
    statementLines: [],
  });
  expect(emptyOverview.currency).toBe("USD");
  expect(emptyOverview.totalAccounts).toBe(0);
  expect(emptyOverview.totalCategories).toBe(0);
  expect(emptyOverview.totalStatements).toBe(0);
  expect(emptyOverview.totalLines).toBe(0);
  expect(emptyOverview.cashFlow).toEqual({
    currency: "USD",
    receiptCount: 0,
    paymentCount: 0,
    totalReceiptsCents: 0,
    totalPaymentsCents: 0,
    netCashFlowCents: 0,
  });
  expect(emptyOverview.categorisation).toEqual({
    totalLines: 0,
    categorisedLines: 0,
    partiallyCategorisedLines: 0,
    uncategorisedLines: 0,
    needsAttentionLines: 0,
    linkedInvoiceLineCount: 0,
    totalAllocatedCents: 0,
    totalUnallocatedCents: 0,
    completionPercent: 100,
  });

  const operatingAccount = normalizeBankAccountDocument({
    id: "acc_operating",
    name: "Operating Account",
    institution: "ANZ",
    accountNumber: "123-456",
    currency: "AUD",
  });
  const reserveAccount = normalizeBankAccountDocument({
    id: "acc_reserve",
    name: "Tax Reserve",
    institution: "NAB",
    currency: "AUD",
  });

  const customerReceiptsCat = normalizeBankCategoryDocument({
    id: "cat_receipts",
    name: "Customer Receipts",
    type: "receipt",
  });
  const materialsCat = normalizeBankCategoryDocument({
    id: "cat_materials",
    name: "Materials",
    type: "payment",
  });
  const toolsCat = normalizeBankCategoryDocument({
    id: "cat_tools",
    name: "Tools",
    type: "payment",
  });

  const statement1 = normalizeBankStatementDocument({
    id: "stmt_1",
    accountId: operatingAccount.id,
    filename: "oct.csv",
    lineCount: 3,
    startDate: "2026-10-10",
    endDate: "2026-10-15",
  });

  const lineCategorisedReceipt = normalizeBankStatementLineDocument({
    id: "line_1",
    statementId: statement1.id,
    accountId: operatingAccount.id,
    date: "2026-10-10",
    description: "Invoice payment",
    type: "receipt",
    amountCents: 200_000,
    balanceCents: 500_000,
    invoiceIds: ["inv_1"],
    allocations: [{ categoryId: customerReceiptsCat.id, amountCents: 200_000 }],
  });

  const linePartialPayment = normalizeBankStatementLineDocument({
    id: "line_2",
    statementId: statement1.id,
    accountId: operatingAccount.id,
    date: "2026-10-12",
    description: "Hardware supply run",
    type: "payment",
    amountCents: 50_000,
    balanceCents: 450_000,
    allocations: [{ categoryId: materialsCat.id, amountCents: 30_000 }],
  });

  const lineUncategorisedPayment = normalizeBankStatementLineDocument({
    id: "line_3",
    statementId: statement1.id,
    accountId: operatingAccount.id,
    date: "2026-10-15",
    description: "Fuel station",
    type: "payment",
    amountCents: 10_000,
    balanceCents: 440_000,
    allocations: [],
  });

  const overview = summarizeBankingOverview({
    accounts: [operatingAccount, reserveAccount],
    categories: [customerReceiptsCat, materialsCat, toolsCat],
    statements: [statement1],
    statementLines: [lineCategorisedReceipt, linePartialPayment, lineUncategorisedPayment],
  });

  expect(overview.currency).toBe("AUD");
  expect(overview.totalAccounts).toBe(2);
  expect(overview.totalCategories).toBe(3);
  expect(overview.receiptCategoryCount).toBe(1);
  expect(overview.paymentCategoryCount).toBe(2);
  expect(overview.totalStatements).toBe(1);
  expect(overview.totalLines).toBe(3);

  expect(overview.cashFlow).toEqual({
    currency: "AUD",
    receiptCount: 1,
    paymentCount: 2,
    totalReceiptsCents: 200_000,
    totalPaymentsCents: 60_000,
    netCashFlowCents: 140_000,
  });

  expect(overview.categorisation).toEqual({
    totalLines: 3,
    categorisedLines: 1,
    partiallyCategorisedLines: 1,
    uncategorisedLines: 1,
    needsAttentionLines: 2,
    linkedInvoiceLineCount: 1,
    totalAllocatedCents: 230_000,
    totalUnallocatedCents: 30_000,
    completionPercent: 33,
  });

  expect(overview.accountSummaries).toHaveLength(2);
  expect(overview.accountSummaries[0]).toMatchObject({
    account: operatingAccount,
    statementCount: 1,
    lineCount: 3,
    totalReceiptsCents: 200_000,
    totalPaymentsCents: 60_000,
    netCashFlowCents: 140_000,
    latestBalanceCents: 440_000,
    latestTransactionDate: "2026-10-15",
    uncategorisedLineCount: 2,
  });
  expect(overview.accountSummaries[1]).toMatchObject({
    account: reserveAccount,
    statementCount: 0,
    lineCount: 0,
    totalReceiptsCents: 0,
    totalPaymentsCents: 0,
    netCashFlowCents: 0,
    uncategorisedLineCount: 0,
  });
  expect(overview.accountSummaries[1]?.latestBalanceCents).toBeUndefined();

  expect(
    overview.categorySummaries.map((item) => ({
      name: item.category.name,
      lineCount: item.lineCount,
      allocatedCents: item.allocatedCents,
    })),
  ).toEqual([
    { name: "Customer Receipts", lineCount: 1, allocatedCents: 200_000 },
    { name: "Materials", lineCount: 1, allocatedCents: 30_000 },
    { name: "Tools", lineCount: 0, allocatedCents: 0 },
  ]);
});
