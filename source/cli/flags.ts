import { createConfigParseError } from "../errors.js";

export type ParsedCliArgumentsT = {
  dryRunEnabled: boolean;
  explainEnabled: boolean;
  overrideFilePath?: string;
  inputTokens: string[];
};

export const parseCliArguments = (
  rawArguments: string[],
): ParsedCliArgumentsT => {
  const doozControlToken = "--dooz";
  const doozControlTokenIndex = rawArguments.indexOf(doozControlToken);
  const hasDoozControlToken = doozControlTokenIndex >= 0;

  const inputTokens = hasDoozControlToken
    ? rawArguments.slice(0, doozControlTokenIndex)
    : rawArguments.slice();

  const parsedCliArguments: ParsedCliArgumentsT = {
    dryRunEnabled: false,
    explainEnabled: false,
    inputTokens,
  };

  if (!hasDoozControlToken) return parsedCliArguments;

  const controlTokens = rawArguments.slice(doozControlTokenIndex + 1);
  let tokenIndex = 0;

  while (tokenIndex < controlTokens.length) {
    const currentToken = controlTokens[tokenIndex];
    const hasCurrentToken = typeof currentToken === "string";
    if (!hasCurrentToken) {
      throw createConfigParseError("--dooz control token must be a string");
    }

    const isDryRunToken = currentToken === "dry";
    if (isDryRunToken) {
      parsedCliArguments.dryRunEnabled = true;
      tokenIndex += 1;
      continue;
    }

    const isExplainToken = currentToken === "explain";
    if (isExplainToken) {
      parsedCliArguments.explainEnabled = true;
      tokenIndex += 1;
      continue;
    }

    const hasOverrideFilePath =
      typeof parsedCliArguments.overrideFilePath === "string";
    if (hasOverrideFilePath) {
      throw createConfigParseError(
        "--dooz accepts at most one path token after control options",
      );
    }

    parsedCliArguments.overrideFilePath = currentToken;
    tokenIndex += 1;
  }

  return parsedCliArguments;
};
