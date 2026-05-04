import { promises as fileSystem } from "node:fs";
import os from "node:os";
import path from "node:path";

import * as vitest from "vitest";

import { discoverConfigPath } from "./discover";

const createTemporaryDirectory = async (
  namePrefix: string,
): Promise<string> => {
  const temporaryBasePath = path.join(os.tmpdir(), namePrefix);
  const temporaryDirectory = await fileSystem.mkdtemp(temporaryBasePath);
  return temporaryDirectory;
};

vitest.describe("discoverConfigPath", () => {
  vitest.it("returns config from current directory when present", async () => {
    const temporaryDirectory = await createTemporaryDirectory("dooz-discover-");
    const configPath = path.join(temporaryDirectory, "dooz.yaml");
    await fileSystem.writeFile(
      configPath,
      "commands:\n  - input: test all\n    output: pnpm test\n",
    );

    const discoveredPath = await discoverConfigPath(temporaryDirectory);
    vitest.expect(discoveredPath).toBe(configPath);

    await fileSystem.rm(temporaryDirectory, { recursive: true, force: true });
  });

  vitest.it(
    "walks up to parent directories until config is found",
    async () => {
      const temporaryDirectory =
        await createTemporaryDirectory("dooz-discover-");
      const gitDirectoryPath = path.join(temporaryDirectory, ".git");
      await fileSystem.mkdir(gitDirectoryPath);

      const nestedDirectory = path.join(temporaryDirectory, "packages", "ui");
      await fileSystem.mkdir(nestedDirectory, { recursive: true });

      const configPath = path.join(temporaryDirectory, "dooz.yaml");
      await fileSystem.writeFile(
        configPath,
        "commands:\n  - input: test all\n    output: pnpm test\n",
      );

      const discoveredPath = await discoverConfigPath(nestedDirectory);
      vitest.expect(discoveredPath).toBe(configPath);

      await fileSystem.rm(temporaryDirectory, { recursive: true, force: true });
    },
  );

  vitest.it(
    "rejects when no config exists before reaching git root",
    async () => {
      const temporaryDirectory =
        await createTemporaryDirectory("dooz-discover-");
      const gitDirectoryPath = path.join(temporaryDirectory, ".git");
      await fileSystem.mkdir(gitDirectoryPath);

      const nestedDirectory = path.join(temporaryDirectory, "packages", "ui");
      await fileSystem.mkdir(nestedDirectory, { recursive: true });

      const discoveryAttempt = discoverConfigPath(nestedDirectory);
      await vitest.expect(discoveryAttempt).rejects.toMatchObject({
        kind: "config-parse-error",
      });

      await fileSystem.rm(temporaryDirectory, { recursive: true, force: true });
    },
  );
});
