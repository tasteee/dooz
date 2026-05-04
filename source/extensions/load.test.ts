import { promises as fileSystem } from "node:fs";
import os from "node:os";
import path from "node:path";

import * as vitest from "vitest";

import { loadExtensions } from "./load";

const createTemporaryDirectory = async (
  namePrefix: string,
): Promise<string> => {
  const temporaryBasePath = path.join(os.tmpdir(), namePrefix);
  const temporaryDirectory = await fileSystem.mkdtemp(temporaryBasePath);
  return temporaryDirectory;
};

vitest.describe("loadExtensions", () => {
  vitest.it(
    "returns empty extension collections when path is null",
    async () => {
      const loadedExtensions = await loadExtensions(null);

      vitest.expect(loadedExtensions.resolvers).toEqual([]);
      vitest.expect(loadedExtensions.validators).toEqual([]);
      vitest.expect(loadedExtensions.filters).toEqual([]);
    },
  );

  vitest.it("loads extension module and validates members", async () => {
    const temporaryDirectory =
      await createTemporaryDirectory("dooz-extension-");
    const extensionPath = path.join(temporaryDirectory, "dooz.js");
    const extensionSource = [
      "const filterValue = {",
      "  name: 'echoFilter',",
      "  apply: (value) => {",
      "    return value",
      "  },",
      "}",
      "const resolverValue = {",
      "  name: 'resolverValue',",
      "  provides: ['kind'],",
      "  resolve: async () => {",
      "    return { kind: 'run' }",
      "  },",
      "}",
      "const validatorValue = {",
      "  name: 'validatorValue',",
      "  validate: async () => {",
      "    return true",
      "  },",
      "}",
      "export default {",
      "  filters: [filterValue],",
      "  resolvers: [resolverValue],",
      "  validators: [validatorValue],",
      "}",
      "",
    ].join("\n");

    await fileSystem.writeFile(extensionPath, extensionSource);
    const loadedExtensions = await loadExtensions(extensionPath);

    vitest.expect(loadedExtensions.filters).toHaveLength(1);
    vitest.expect(loadedExtensions.resolvers).toHaveLength(1);
    vitest.expect(loadedExtensions.validators).toHaveLength(1);

    await fileSystem.rm(temporaryDirectory, { recursive: true, force: true });
  });
});
