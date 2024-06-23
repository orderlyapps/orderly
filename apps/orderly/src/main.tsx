import React from "react";
import { createRoot } from "react-dom/client";
import { Orderly } from "shell";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <Orderly></Orderly>
  </React.StrictMode>
);
