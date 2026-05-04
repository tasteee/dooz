import * as vitest from "vitest";

import { compilePattern } from "./compile";
import { selectBestPatternMatch } from "./rank";

vitest.describe("selectBestPatternMatch", () => {
  vitest.it("prefers literal over capture with same arity", () => {
    const compiledPatterns = [
      compilePattern("test <name> [...rest]"),
      compilePattern("test all [...rest]"),
    ];
    const inputTokens = ["test", "all", "--watch"];

    const bestPatternMatchCandidate = selectBestPatternMatch(
      compiledPatterns,
      inputTokens,
    );

    vitest
      .expect(bestPatternMatchCandidate.compiledPattern.sourcePattern)
      .toBe("test all [...rest]");
  });

  vitest.it("throws when no patterns match", () => {
    const compiledPatterns = [compilePattern("test all")];
    const inputTokens = ["build", "all"];

    const selectAttempt = (): void => {
      selectBestPatternMatch(compiledPatterns, inputTokens);
      return;
    };

    vitest.expect(selectAttempt).toThrowError();
  });

  vitest.it("throws ambiguous error on equal specificity matches", () => {
    const compiledPatterns = [
      compilePattern("task <name>"),
      compilePattern("task <target>"),
    ];
    const inputTokens = ["task", "ui"];

    const selectAttempt = (): void => {
      selectBestPatternMatch(compiledPatterns, inputTokens);
      return;
    };

    vitest.expect(selectAttempt).toThrowError();
  });
});
