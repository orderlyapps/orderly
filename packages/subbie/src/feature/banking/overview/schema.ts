import { DEFAULT_INVOICE_CURRENCY } from "../../invoices/schema.ts";
import type { BankAccountDocument } from "../accounts/schema.ts";
import type { BankCategoryDocument } from "../categories/schema.ts";
import {
  allocatedAmountCents,
  isLineFullyAllocated,
  unallocatedAmountCents,
} from "../lines/gst.ts";
import type { BankStatementLineDocument } from "../lines/schema.ts";
import type { BankStatementDocument } from "../statements/schema.ts";

export interface BankingCashFlowSummary {
  currency: string;
  receiptCount: number;
  paymentCount: number;
  totalReceiptsCents: number;
  totalPaymentsCents: number;
  netCashFlowCents: number;
}

export interface BankingCategorisationSummary {
  totalLines: number;
  categorisedLines: number;
  partiallyCategorisedLines: number;
  uncategorisedLines: number;
  privateLines: number;
  needsAttentionLines: number;
  linkedInvoiceLineCount: number;
  totalAllocatedCents: number;
  totalUnallocatedCents: number;
  completionPercent: number;
}

export interface BankAccountOverviewItem {
  account: BankAccountDocument;
  statementCount: number;
  lineCount: number;
  totalReceiptsCents: number;
  totalPaymentsCents: number;
  netCashFlowCents: number;
  latestBalanceCents?: number;
  latestTransactionDate?: string;
  uncategorisedLineCount: number;
}

export interface BankCategoryOverviewItem {
  category: BankCategoryDocument;
  allocationCount: number;
  lineCount: number;
  allocatedCents: number;
  currency: string;
}

export interface SummarizeBankingOverviewInput {
  accounts: readonly BankAccountDocument[];
  categories: readonly BankCategoryDocument[];
  statements: readonly BankStatementDocument[];
  statementLines: readonly BankStatementLineDocument[];
}

export interface BankingOverviewSummary {
  currency: string;
  cashFlow: BankingCashFlowSummary;
  cashFlowByCurrency: BankingCashFlowSummary[];
  categorisation: BankingCategorisationSummary;
  accountSummaries: BankAccountOverviewItem[];
  categorySummaries: BankCategoryOverviewItem[];
  totalAccounts: number;
  totalCategories: number;
  paymentCategoryCount: number;
  receiptCategoryCount: number;
  totalStatements: number;
  totalLines: number;
}

function compareStatementLinesNewestFirst(
  a: BankStatementLineDocument,
  b: BankStatementLineDocument,
): number {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? 1 : -1;
  }
  return a.id.localeCompare(b.id);
}

export function summarizeBankingOverview(
  input: SummarizeBankingOverviewInput,
): BankingOverviewSummary {
  const primaryCurrency = input.accounts[0]?.currency ?? DEFAULT_INVOICE_CURRENCY;
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const sortedLines = [...input.statementLines].sort(compareStatementLinesNewestFirst);

  let receiptCount = 0;
  let paymentCount = 0;
  let totalReceiptsCents = 0;
  let totalPaymentsCents = 0;

  const cashFlowByCurrencyMap = new Map<string, BankingCashFlowSummary>();
  const ensureCurrencyBucket = (currency: string): BankingCashFlowSummary => {
    const existing = cashFlowByCurrencyMap.get(currency);
    if (existing) {
      return existing;
    }
    const created: BankingCashFlowSummary = {
      currency,
      receiptCount: 0,
      paymentCount: 0,
      totalReceiptsCents: 0,
      totalPaymentsCents: 0,
      netCashFlowCents: 0,
    };
    cashFlowByCurrencyMap.set(currency, created);
    return created;
  };

  for (const account of input.accounts) {
    ensureCurrencyBucket(account.currency);
  }

  let categorisedLines = 0;
  let partiallyCategorisedLines = 0;
  let uncategorisedLines = 0;
  let privateLines = 0;
  let linkedInvoiceLineCount = 0;
  let totalAllocatedCents = 0;
  let totalUnallocatedCents = 0;

  for (const line of sortedLines) {
    if (line.isPrivate) {
      privateLines += 1;
      categorisedLines += 1;
      continue;
    }
    const lineCurrency = accountById.get(line.accountId)?.currency ?? primaryCurrency;
    const bucket = ensureCurrencyBucket(lineCurrency);

    if (line.type === "receipt") {
      receiptCount += 1;
      totalReceiptsCents += line.amountCents;
      bucket.receiptCount += 1;
      bucket.totalReceiptsCents += line.amountCents;
    } else {
      paymentCount += 1;
      totalPaymentsCents += line.amountCents;
      bucket.paymentCount += 1;
      bucket.totalPaymentsCents += line.amountCents;
    }
    bucket.netCashFlowCents = bucket.totalReceiptsCents - bucket.totalPaymentsCents;

    const allocated = allocatedAmountCents(line);
    const unallocated = unallocatedAmountCents(line);
    totalAllocatedCents += allocated;
    totalUnallocatedCents += unallocated;

    if (isLineFullyAllocated(line)) {
      categorisedLines += 1;
    } else if (line.allocations.length > 0) {
      partiallyCategorisedLines += 1;
    } else {
      uncategorisedLines += 1;
    }

    if (line.invoiceIds.length > 0) {
      linkedInvoiceLineCount += 1;
    }
  }

  const cashFlow: BankingCashFlowSummary = {
    currency: primaryCurrency,
    receiptCount,
    paymentCount,
    totalReceiptsCents,
    totalPaymentsCents,
    netCashFlowCents: totalReceiptsCents - totalPaymentsCents,
  };

  const cashFlowByCurrency =
    cashFlowByCurrencyMap.size > 0 ? [...cashFlowByCurrencyMap.values()] : [cashFlow];

  const totalLines = sortedLines.length;
  const needsAttentionLines = uncategorisedLines + partiallyCategorisedLines;
  const completionPercent =
    totalLines === 0 ? 100 : Math.round((categorisedLines / totalLines) * 100);

  const accountSummaries: BankAccountOverviewItem[] = input.accounts.map((account) => {
    const accountStatements = input.statements.filter((stmt) => stmt.accountId === account.id);
    const accountLines = sortedLines.filter((line) => line.accountId === account.id);
    let accReceipts = 0;
    let accPayments = 0;
    let uncategorisedLineCount = 0;

    for (const line of accountLines) {
      if (line.isPrivate) {
        continue;
      }
      if (line.type === "receipt") {
        accReceipts += line.amountCents;
      } else {
        accPayments += line.amountCents;
      }
      if (!isLineFullyAllocated(line)) {
        uncategorisedLineCount += 1;
      }
    }

    const latestLineWithBalance = accountLines.find(
      (line) => typeof line.balanceCents === "number",
    );
    const summary: BankAccountOverviewItem = {
      account,
      statementCount: accountStatements.length,
      lineCount: accountLines.length,
      totalReceiptsCents: accReceipts,
      totalPaymentsCents: accPayments,
      netCashFlowCents: accReceipts - accPayments,
      uncategorisedLineCount,
    };
    if (latestLineWithBalance?.balanceCents !== undefined) {
      summary.latestBalanceCents = latestLineWithBalance.balanceCents;
    }
    if (accountLines[0]?.date) {
      summary.latestTransactionDate = accountLines[0].date;
    }
    return summary;
  });

  const categorySummaries: BankCategoryOverviewItem[] = input.categories
    .map((category) => {
      let allocationCount = 0;
      let lineCount = 0;
      let allocatedCents = 0;
      let matchedCurrency: string | undefined;

      for (const line of sortedLines) {
        if (line.isPrivate) {
          continue;
        }
        const matching = line.allocations.filter((entry) => entry.categoryId === category.id);
        if (matching.length > 0) {
          lineCount += 1;
          allocationCount += matching.length;
          for (const entry of matching) {
            allocatedCents += entry.amountCents;
          }
          if (!matchedCurrency) {
            matchedCurrency = accountById.get(line.accountId)?.currency;
          }
        }
      }

      return {
        category,
        allocationCount,
        lineCount,
        allocatedCents,
        currency: matchedCurrency ?? primaryCurrency,
      };
    })
    .sort(
      (a, b) =>
        b.allocatedCents - a.allocatedCents ||
        b.lineCount - a.lineCount ||
        a.category.name.localeCompare(b.category.name),
    );

  const paymentCategoryCount = input.categories.filter((cat) => cat.type === "payment").length;
  const receiptCategoryCount = input.categories.filter((cat) => cat.type === "receipt").length;

  return {
    currency: primaryCurrency,
    cashFlow,
    cashFlowByCurrency,
    categorisation: {
      totalLines,
      categorisedLines,
      partiallyCategorisedLines,
      uncategorisedLines,
      privateLines,
      needsAttentionLines,
      linkedInvoiceLineCount,
      totalAllocatedCents,
      totalUnallocatedCents,
      completionPercent,
    },
    accountSummaries,
    categorySummaries,
    totalAccounts: input.accounts.length,
    totalCategories: input.categories.length,
    paymentCategoryCount,
    receiptCategoryCount,
    totalStatements: input.statements.length,
    totalLines,
  };
}
