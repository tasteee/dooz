import { promises as fileSystem } from "node:fs";
import os from "node:os";
import path from "node:path";

import * as vitest from "vitest";

import { loadConfigFromPath } from "./load";

const createTemporaryDirectory = async (
  namePrefix: string,
): Promise<string> => {
  const temporaryBasePath = path.join(os.tmpdir(), namePrefix);
  const temporaryDirectory = await fileSystem.mkdtemp(temporaryBasePath);
  return temporaryDirectory;
};

vitest.describe("loadConfigFromPath", () => {
  vitest.it("loads valid command definitions", async () => {
    const temporaryDirectory = await createTemporaryDirectory("dooz-load-");
    const configPath = path.join(temporaryDirectory, "dooz.yaml");

    const configText = [
      "commands:",
      "  - input: test <name> [...rest]",
      "    output: pnpm --filter {{name}} run test {{rest}}",
      "    uses: [packageKind]",
      "    validates: [packageExists]",
    ].join("\n");

    await fileSystem.writeFile(configPath, configText);
    const loadedConfig = await loadConfigFromPath(configPath);

    vitest.expect(loadedConfig.commands).toHaveLength(1);
    vitest
      .expect(loadedConfig.commands[0]?.input)
      .toBe("test <name> [...rest]");
    vitest.expect(loadedConfig.commands[0]?.uses).toEqual(["packageKind"]);
    vitest
      .expect(loadedConfig.commands[0]?.validates)
      .toEqual(["packageExists"]);

    await fileSystem.rm(temporaryDirectory, { recursive: true, force: true });
  });

  vitest.it("rejects when commands root is missing", async () => {
    const temporaryDirectory = await createTemporaryDirectory("dooz-load-");
    const configPath = path.join(temporaryDirectory, "dooz.yaml");

    await fileSystem.writeFile(configPath, "hello: world\n");

    const loadAttempt = loadConfigFromPath(configPath);
    await vitest.expect(loadAttempt).rejects.toMatchObject({
      kind: "config-schema-error",
    });

    await fileSystem.rm(temporaryDirectory, { recursive: true, force: true });
  });

  vitest.it("rejects malformed yaml", async () => {
    const temporaryDirectory = await createTemporaryDirectory("dooz-load-");
    const configPath = path.join(temporaryDirectory, "dooz.yaml");

    await fileSystem.writeFile(configPath, "commands: [\n");

    const loadAttempt = loadConfigFromPath(configPath);
    await vitest.expect(loadAttempt).rejects.toMatchObject({
      kind: "config-parse-error",
    });

    await fileSystem.rm(temporaryDirectory, { recursive: true, force: true });
  });
});
