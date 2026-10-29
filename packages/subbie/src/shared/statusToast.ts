import { useState } from "react";

export interface StatusToast {
  message: string;
  color?: "success" | "warning" | "danger";
}

export const useStatusToast = () => {
  const [toast, setToast] = useState<StatusToast | null>(null);
  const showSuccess = (message: string) => setToast({ message, color: "success" });
  const showError = (message: string) => setToast({ message, color: "danger" });
  const dismissToast = () => setToast(null);
  return { toast, showSuccess, showError, dismissToast };
};
