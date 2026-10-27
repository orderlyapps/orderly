import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { BackendProviders } from "proclaimer-core";

import App from "./App";
import { supabaseConfig } from "./config";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <StrictMode>
    <BackendProviders supabase={supabaseConfig}>
      <App />
    </BackendProviders>
  </StrictMode>,
);
