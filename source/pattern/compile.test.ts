import * as vitest from "vitest";

import { PatternTokenKind } from "../types";
import { compilePattern } from "./compile";

vitest.describe("compilePattern", () => {
  vitest.it("compiles literal, capture, and variadic tokens", () => {
    const compiledPattern = compilePattern("test <name> [...rest]");

    vitest.expect(compiledPattern.tokens).toHaveLength(3);

    const firstToken = compiledPattern.tokens[0];
    const secondToken = compiledPattern.tokens[1];
    const thirdToken = compiledPattern.tokens[2];

    vitest.expect(firstToken.kind).toBe(PatternTokenKind.literal);
    vitest.expect(secondToken.kind).toBe(PatternTokenKind.capture);
    vitest.expect(thirdToken.kind).toBe(PatternTokenKind.variadic);
    vitest.expect(compiledPattern.specificityVector).toEqual([3, 2, 1]);
  });

  vitest.it("throws when variadic capture is not in final position", () => {
    const compileAttempt = (): void => {
      compilePattern("test [...rest] trailing");
      return;
    };

    vitest.expect(compileAttempt).toThrowError();
  });

  vitest.it("throws for invalid capture syntax", () => {
    const compileAttempt = (): void => {
      compilePattern("test <bad-name>");
      return;
    };

    vitest.expect(compileAttempt).toThrowError();
  });
});
