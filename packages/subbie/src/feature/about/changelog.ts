export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.2.0",
    date: "2026-10-29",
    changes: ["Invoices: reorder line items by dragging while creating or editing an invoice"],
  },
  {
    version: "0.1.0",
    date: "2026-10-29",
    changes: [
      "Invoices: create and manage invoices and send them as PDFs",
      "Banking: import statements from CSV, categorise transactions, and review financial year totals",
      "Directory: manage customers and items",
      "Settings: appearance, business details, invoicing and GST defaults, and data export/import",
      "About page showing the app version and changelog",
    ],
  },
];

export const APP_VERSION = CHANGELOG[0]?.version ?? "0.0.0";
