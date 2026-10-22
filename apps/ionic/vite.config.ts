import { defineConfig } from "vite-plus";

import viteReact from "@vitejs/plugin-react";

const config = defineConfig({
  plugins: [viteReact()],
});

export default config;
