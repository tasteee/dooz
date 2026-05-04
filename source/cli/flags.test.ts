import * as vitest from "vitest";

import { parseCliArguments } from "./flags.js";

vitest.describe("parseCliArguments", () => {
  vitest.it("keeps all input tokens when --dooz is absent", () => {
    const rawArguments = ["test", "ui", "--watch"];

    const parsedCliArguments = parseCliArguments(rawArguments);

    vitest.expect(parsedCliArguments.dryRunEnabled).toBe(false);
    vitest.expect(parsedCliArguments.explainEnabled).toBe(false);
    vitest.expect(parsedCliArguments.overrideFilePath).toBeUndefined();
    vitest
      .expect(parsedCliArguments.inputTokens)
      .toEqual(["test", "ui", "--watch"]);
  });

  vitest.it("parses dry and explain tokens after --dooz", () => {
    const rawArguments = ["test", "ui", "--dooz", "dry", "explain"];

    const parsedCliArguments = parseCliArguments(rawArguments);

    vitest.expect(parsedCliArguments.dryRunEnabled).toBe(true);
    vitest.expect(parsedCliArguments.explainEnabled).toBe(true);
    vitest.expect(parsedCliArguments.overrideFilePath).toBeUndefined();
    vitest.expect(parsedCliArguments.inputTokens).toEqual(["test", "ui"]);
  });

  vitest.it("accepts a single override path token after --dooz", () => {
    const rawArguments = [
      "whatever",
      "whateva",
      "--dooz",
      "dry",
      "explain",
      "./bar/baz/dooz.ts",
    ];

    const parsedCliArguments = parseCliArguments(rawArguments);

    vitest.expect(parsedCliArguments.dryRunEnabled).toBe(true);
    vitest.expect(parsedCliArguments.explainEnabled).toBe(true);
    vitest
      .expect(parsedCliArguments.overrideFilePath)
      .toBe("./bar/baz/dooz.ts");
    vitest
      .expect(parsedCliArguments.inputTokens)
      .toEqual(["whatever", "whateva"]);
  });

  vitest.it(
    "throws when more than one non-control token appears after --dooz",
    () => {
      const parseAttempt = (): void => {
        parseCliArguments([
          "whatever",
          "--dooz",
          "dry",
          "./one.yaml",
          "./two.ts",
        ]);
        return;
      };

      vitest.expect(parseAttempt).toThrowError();
    },
  );
});
