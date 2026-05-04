import { promises as fileSystem } from "node:fs";
import os from "node:os";
import path from "node:path";

import * as vitest from "vitest";

import { runCli } from "./run.js";

type RecordingOutputT = {
  stream: NodeJS.WriteStream;
  getOutputText: () => string;
};

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async (
  namePrefix: string,
): Promise<string> => {
  const temporaryBasePath = path.join(os.tmpdir(), namePrefix);
  const temporaryDirectory = await fileSystem.mkdtemp(temporaryBasePath);
  temporaryDirectories.push(temporaryDirectory);
  return temporaryDirectory;
};

const createRecordingOutput = (): RecordingOutputT => {
  let outputText = "";

  const streamLike = {
    write: (chunk: string | Uint8Array): boolean => {
      const isStringChunk = typeof chunk === "string";
      const chunkText = isStringChunk
        ? chunk
        : Buffer.from(chunk).toString("utf8");
      outputText = `${outputText}${chunkText}`;
      return true;
    },
  };

  const getOutputText = (): string => {
    return outputText;
  };

  const stream = streamLike as unknown as NodeJS.WriteStream;
  return {
    stream,
    getOutputText,
  };
};

vitest.afterEach(async () => {
  let directoryIndex = 0;

  while (directoryIndex < temporaryDirectories.length) {
    const temporaryDirectory = temporaryDirectories[directoryIndex];
    await fileSystem.rm(temporaryDirectory, { recursive: true, force: true });
    directoryIndex += 1;
  }

  temporaryDirectories.length = 0;
});

vitest.describe("runCli", () => {
  vitest.it("supports --dooz dry with config path override", async () => {
    const temporaryDirectory = await createTemporaryDirectory("dooz-run-");
    const configPath = path.join(temporaryDirectory, "dooz.yaml");
    const configText = [
      "commands:",
      "  - input: whatever [...rest]",
      "    output: echo {{rest}}",
      "",
    ].join("\n");
    await fileSystem.writeFile(configPath, configText);

    const recordingOutput = createRecordingOutput();
    const rawArguments = ["whatever", "whateva", "--dooz", "dry", configPath];
    const exitCode = await runCli(
      rawArguments,
      temporaryDirectory,
      recordingOutput.stream,
    );

    vitest.expect(exitCode).toBe(0);
    vitest.expect(recordingOutput.getOutputText().trim()).toBe("echo whateva");
  });

  vitest.it("supports --dooz explain with config path override", async () => {
    const temporaryDirectory = await createTemporaryDirectory("dooz-run-");
    const configPath = path.join(temporaryDirectory, "dooz.yaml");
    const configText = [
      "commands:",
      "  - input: whatever [...rest]",
      "    output: echo {{rest}}",
      "",
    ].join("\n");
    await fileSystem.writeFile(configPath, configText);

    const recordingOutput = createRecordingOutput();
    const rawArguments = [
      "whatever",
      "whateva",
      "--dooz",
      "explain",
      configPath,
    ];
    const exitCode = await runCli(
      rawArguments,
      temporaryDirectory,
      recordingOutput.stream,
    );

    const outputText = recordingOutput.getOutputText();
    vitest.expect(exitCode).toBe(0);
    vitest.expect(outputText.includes("Explain:")).toBe(true);
    vitest
      .expect(outputText.includes("Matched pattern: whatever [...rest]"))
      .toBe(true);
  });

  vitest.it(
    "prioritizes explain when dry and explain are both present",
    async () => {
      const temporaryDirectory = await createTemporaryDirectory("dooz-run-");
      const configPath = path.join(temporaryDirectory, "dooz.yaml");
      const configText = [
        "commands:",
        "  - input: whatever [...rest]",
        "    output: echo {{rest}}",
        "",
      ].join("\n");
      await fileSystem.writeFile(configPath, configText);

      const recordingOutput = createRecordingOutput();
      const rawArguments = [
        "whatever",
        "whateva",
        "--dooz",
        "dry",
        "explain",
        configPath,
      ];
      const exitCode = await runCli(
        rawArguments,
        temporaryDirectory,
        recordingOutput.stream,
      );

      const outputText = recordingOutput.getOutputText();
      vitest.expect(exitCode).toBe(0);
      vitest.expect(outputText.includes("Explain:")).toBe(true);
      vitest.expect(outputText.includes("Final argv:")).toBe(true);
    },
  );

  vitest.it("supports .ts extension path override after --dooz", async () => {
    const temporaryDirectory = await createTemporaryDirectory("dooz-run-");
    const configPath = path.join(temporaryDirectory, "dooz.yaml");
    const extensionDirectory = path.join(temporaryDirectory, "extensions");
    const extensionPath = path.join(extensionDirectory, "dooz.ts");
    const configText = [
      "commands:",
      "  - input: hi",
      "    output: echo {{kind}}",
      "    uses: [kindResolver]",
      "",
    ].join("\n");
    await fileSystem.writeFile(configPath, configText);
    await fileSystem.mkdir(extensionDirectory, { recursive: true });

    const extensionText = [
      "const kindResolver = {",
      "  name: 'kindResolver',",
      "  provides: ['kind'],",
      "  resolve: async () => {",
      "    return { kind: 'run' }",
      "  },",
      "}",
      "export default {",
      "  resolvers: [kindResolver],",
      "}",
      "",
    ].join("\n");
    await fileSystem.writeFile(extensionPath, extensionText);

    const recordingOutput = createRecordingOutput();
    const rawArguments = ["hi", "--dooz", "explain", extensionPath];
    const exitCode = await runCli(
      rawArguments,
      temporaryDirectory,
      recordingOutput.stream,
    );

    const outputText = recordingOutput.getOutputText();
    vitest.expect(exitCode).toBe(0);
    vitest
      .expect(outputText.includes(`Extension path: ${extensionPath}`))
      .toBe(true);
    vitest.expect(outputText.includes("Rendered command: echo run")).toBe(true);
  });
});
