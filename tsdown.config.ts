import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["source/index.ts"],
  outDir: "build",
  format: "esm",
  outExtensions: () => ({ js: ".js" }),
  banner: {
    js: "#!/usr/bin/env node",
  },
});
