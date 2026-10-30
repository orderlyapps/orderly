// Escape a string for interpolation into Ionic overlay messages (alerts,
// toasts, loading), which parse HTML when `innerHTMLTemplatesEnabled` is on.
export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
