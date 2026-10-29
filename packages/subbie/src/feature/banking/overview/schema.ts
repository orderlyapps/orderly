import type { BankCategoryDocument } from "../categories/schema.ts";
import { allocationGstAmountCents, allocationNetAmountCents, BANK_GST_RATE } from "../lines/gst.ts";
import type { BankStatementLineDocument } from "../lines/schema.ts";

export interface AustralianFinancialYear {
  startYear: number;
  endYear: number;
  startDate: string;
  endDate: string;
  label: string;
}

export interface FinancialYearCategorySummary {
  category: BankCategoryDocument;
  lineCount: number;
  allocationCount: number;
  amountIncGstCents: number;
  gstAmountCents: number;
  amountExGstCents: number;
}

export interface FinancialYearSummary {
  financialYear: AustralianFinancialYear;
  categorySummaries: FinancialYearCategorySummary[];
  gstCollectedCents: number;
  gstPaidCents: number;
  gstDifferenceCents: number;
  totalCollectedIncGstCents: number;
  totalPaidIncGstCents: number;
  totalDifferenceIncGstCents: number;
  totalCollectedExGstCents: number;
  totalPaidExGstCents: number;
  totalDifferenceExGstCents: number;
}

export interface SummarizeFinancialYearInput {
  financialYear: AustralianFinancialYear;
  statementLines: readonly BankStatementLineDocument[];
  categories: readonly BankCategoryDocument[];
  gstRate?: number;
}

export interface SummarizeBankingFinancialYearsInput {
  statementLines: readonly BankStatementLineDocument[];
  categories: readonly BankCategoryDocument[];
  gstRate?: number;
  referenceDate?: Date | string;
}

export interface BankingFinancialYearsSummary {
  currentFinancialYear: FinancialYearSummary;
  previousFinancialYear: FinancialYearSummary;
}

function parseReferenceYearMonth(referenceDate?: Date | string): { year: number; month: number } {
  if (typeof referenceDate === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(referenceDate.trim());
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (Number.isInteger(year) && month >= 1 && month <= 12) {
        return { year, month };
      }
    }
  }
  const date =
    referenceDate instanceof Date
      ? referenceDate
      : typeof referenceDate === "string" && referenceDate.trim().length > 0
        ? new Date(referenceDate)
        : new Date();
  const resolved = Number.isNaN(date.getTime()) ? new Date() : date;
  return {
    year: resolved.getFullYear(),
    month: resolved.getMonth() + 1,
  };
}

export function getAustralianFinancialYear(
  referenceDate?: Date | string,
  yearOffset = 0,
): AustralianFinancialYear {
  const { year, month } = parseReferenceYearMonth(referenceDate);
  const baseStartYear = month >= 7 ? year : year - 1;
  const startYear = baseStartYear + yearOffset;
  const endYear = startYear + 1;
  const startYearStr = String(startYear).padStart(4, "0");
  const endYearStr = String(endYear).padStart(4, "0");
  return {
    startYear,
    endYear,
    startDate: `${startYearStr}-07-01`,
    endDate: `${endYearStr}-06-30`,
    label: `FY ${startYearStr}–${endYearStr.slice(-2)}`,
  };
}

export function isDateInFinancialYear(
  date: string,
  financialYear: Pick<AustralianFinancialYear, "startDate" | "endDate">,
): boolean {
  return date >= financialYear.startDate && date <= financialYear.endDate;
}

function compareCategories(a: BankCategoryDocument, b: BankCategoryDocument): number {
  if (a.type !== b.type) {
    return a.type === "receipt" ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

export function summarizeFinancialYear(input: SummarizeFinancialYearInput): FinancialYearSummary {
  const { financialYear, statementLines, categories } = input;
  const gstRate = input.gstRate ?? BANK_GST_RATE;

  const linesInYear = statementLines.filter(
    (line) => !line.isPrivate && isDateInFinancialYear(line.date, financialYear),
  );

  const sortedCategories = [...categories].sort(compareCategories);
  const categorySummariesById = new Map<string, FinancialYearCategorySummary>(
    sortedCategories.map((category) => [
      category.id,
      {
        category,
        lineCount: 0,
        allocationCount: 0,
        amountIncGstCents: 0,
        gstAmountCents: 0,
        amountExGstCents: 0,
      },
    ]),
  );

  let gstCollectedCents = 0;
  let gstPaidCents = 0;
  let totalCollectedIncGstCents = 0;
  let totalPaidIncGstCents = 0;
  let totalCollectedExGstCents = 0;
  let totalPaidExGstCents = 0;

  for (const line of linesInYear) {
    const seenCategoriesOnLine = new Set<string>();
    for (const allocation of line.allocations) {
      const categorySummary = categorySummariesById.get(allocation.categoryId);
      if (!categorySummary) {
        continue;
      }
      const amountIncGst = allocation.amountCents;
      const gstAmount = allocationGstAmountCents(allocation, gstRate);
      const amountExGst = allocationNetAmountCents(allocation, gstRate);

      if (!seenCategoriesOnLine.has(allocation.categoryId)) {
        seenCategoriesOnLine.add(allocation.categoryId);
        categorySummary.lineCount += 1;
      }
      categorySummary.allocationCount += 1;
      categorySummary.amountIncGstCents += amountIncGst;
      categorySummary.gstAmountCents += gstAmount;
      categorySummary.amountExGstCents += amountExGst;

      if (line.type === "receipt") {
        totalCollectedIncGstCents += amountIncGst;
        gstCollectedCents += gstAmount;
        totalCollectedExGstCents += amountExGst;
      } else {
        totalPaidIncGstCents += amountIncGst;
        gstPaidCents += gstAmount;
        totalPaidExGstCents += amountExGst;
      }
    }
  }

  const gstDifferenceCents = gstCollectedCents - gstPaidCents;
  const totalDifferenceIncGstCents = totalCollectedIncGstCents - totalPaidIncGstCents;
  const totalDifferenceExGstCents = totalCollectedExGstCents - totalPaidExGstCents;

  const categorySummaries = [...categorySummariesById.values()].filter(
    (item) => item.amountIncGstCents > 0,
  );

  return {
    financialYear,
    categorySummaries,
    gstCollectedCents,
    gstPaidCents,
    gstDifferenceCents,
    totalCollectedIncGstCents,
    totalPaidIncGstCents,
    totalDifferenceIncGstCents,
    totalCollectedExGstCents,
    totalPaidExGstCents,
    totalDifferenceExGstCents,
  };
}

export function summarizeBankingFinancialYears(
  input: SummarizeBankingFinancialYearsInput,
): BankingFinancialYearsSummary {
  const currentFy = getAustralianFinancialYear(input.referenceDate, 0);
  const previousFy = getAustralianFinancialYear(input.referenceDate, -1);

  return {
    currentFinancialYear: summarizeFinancialYear({
      financialYear: currentFy,
      statementLines: input.statementLines,
      categories: input.categories,
      gstRate: input.gstRate,
    }),
    previousFinancialYear: summarizeFinancialYear({
      financialYear: previousFy,
      statementLines: input.statementLines,
      categories: input.categories,
      gstRate: input.gstRate,
    }),
  };
}
