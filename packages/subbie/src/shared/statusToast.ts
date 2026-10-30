import { useState } from "react";

import { escapeHtml } from "./escapeHtml.ts";

export interface StatusToast {
  /** HTML-encoded text — pass it to `IonToast`, which parses HTML when `innerHTMLTemplatesEnabled` is on. */
  message: string;
  color?: "success" | "warning" | "danger";
}

export const useStatusToast = () => {
  const [toast, setToast] = useState<StatusToast | null>(null);
  const showSuccess = (message: string) =>
    setToast({ message: escapeHtml(message), color: "success" });
  const showError = (message: string) =>
    setToast({ message: escapeHtml(message), color: "danger" });
  const dismissToast = () => setToast(null);
  return { toast, showSuccess, showError, dismissToast };
};
