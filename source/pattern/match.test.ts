import * as vitest from "vitest";

import { compilePattern } from "./compile";
import { matchCompiledPattern } from "./match";

vitest.describe("matchCompiledPattern", () => {
  vitest.it("captures named and variadic arguments", () => {
    const compiledPattern = compilePattern("test <name> [...rest]");
    const inputTokens = ["test", "ui", "--watch", "--coverage"];
    const matchResult = matchCompiledPattern(compiledPattern, inputTokens);

    vitest.expect(matchResult).not.toBeNull();

    const hasMatchResult = matchResult !== null;
    if (!hasMatchResult) return;

    vitest.expect(matchResult.argumentsByName.name).toBe("ui");
    vitest
      .expect(matchResult.argumentsByName.rest)
      .toEqual(["--watch", "--coverage"]);
  });

  vitest.it("returns null for literal mismatch", () => {
    const compiledPattern = compilePattern("test <name>");
    const inputTokens = ["build", "ui"];
    const matchResult = matchCompiledPattern(compiledPattern, inputTokens);

    vitest.expect(matchResult).toBeNull();
  });

  vitest.it("returns null for extra tokens without variadic", () => {
    const compiledPattern = compilePattern("test <name>");
    const inputTokens = ["test", "ui", "--watch"];
    const matchResult = matchCompiledPattern(compiledPattern, inputTokens);

    vitest.expect(matchResult).toBeNull();
  });
});
