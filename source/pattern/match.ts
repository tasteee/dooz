import {
  CompiledPatternT,
  MatchArgumentsT,
  MatchResultT,
  PatternTokenKind,
} from "../types";

export const matchCompiledPattern = (
  compiledPattern: CompiledPatternT,
  inputTokens: string[],
): MatchResultT | null => {
  const argumentsByName: MatchArgumentsT = {};
  let inputTokenIndex = 0;
  let patternTokenIndex = 0;

  while (patternTokenIndex < compiledPattern.tokens.length) {
    const patternToken = compiledPattern.tokens[patternTokenIndex];
    const isLiteralPatternToken =
      patternToken.kind === PatternTokenKind.literal;

    if (isLiteralPatternToken) {
      const inputToken = inputTokens[inputTokenIndex];
      const hasInputToken = typeof inputToken === "string";
      if (!hasInputToken) return null;

      const isLiteralMatch = inputToken === patternToken.value;
      if (!isLiteralMatch) return null;

      inputTokenIndex += 1;
      patternTokenIndex += 1;
      continue;
    }

    const isCapturePatternToken =
      patternToken.kind === PatternTokenKind.capture;
    if (isCapturePatternToken) {
      const inputToken = inputTokens[inputTokenIndex];
      const hasInputToken = typeof inputToken === "string";
      if (!hasInputToken) return null;

      argumentsByName[patternToken.name] = inputToken;
      inputTokenIndex += 1;
      patternTokenIndex += 1;
      continue;
    }

    const isVariadicPatternToken =
      patternToken.kind === PatternTokenKind.variadic;
    if (isVariadicPatternToken) {
      const remainingInputTokens = inputTokens.slice(inputTokenIndex);
      argumentsByName[patternToken.name] = remainingInputTokens;
      inputTokenIndex = inputTokens.length;
      patternTokenIndex += 1;
      continue;
    }

    return null;
  }

  const consumedAllInputTokens = inputTokenIndex === inputTokens.length;
  if (!consumedAllInputTokens) return null;

  const matchResult: MatchResultT = {
    argumentsByName,
  };

  return matchResult;
};
