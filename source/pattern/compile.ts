import { parseArgsStringToArgv } from "string-argv";

import { createPatternParseError } from "../errors";
import { CompiledPatternT, PatternTokenKind, PatternTokenT } from "../types";

const captureTokenExpression = /^<([a-zA-Z][a-zA-Z0-9_]*)>$/;
const variadicTokenExpression = /^\[\.\.\.([a-zA-Z][a-zA-Z0-9_]*)\]$/;

const getCaptureName = (token: string): string | null => {
  const captureMatch = captureTokenExpression.exec(token);
  const hasCaptureMatch = captureMatch !== null;
  if (!hasCaptureMatch) return null;

  const captureName = captureMatch[1];
  const hasCaptureName =
    typeof captureName === "string" && captureName.length > 0;
  if (!hasCaptureName) return null;

  return captureName;
};

const getVariadicName = (token: string): string | null => {
  const variadicMatch = variadicTokenExpression.exec(token);
  const hasVariadicMatch = variadicMatch !== null;
  if (!hasVariadicMatch) return null;

  const variadicName = variadicMatch[1];
  const hasVariadicName =
    typeof variadicName === "string" && variadicName.length > 0;
  if (!hasVariadicName) return null;

  return variadicName;
};

const isCaptureLikeToken = (token: string): boolean => {
  const startsLikeCapture = token.startsWith("<");
  const endsLikeCapture = token.endsWith(">");
  const isCaptureLike = startsLikeCapture && endsLikeCapture;
  return isCaptureLike;
};

const isVariadicLikeToken = (token: string): boolean => {
  const startsLikeVariadic = token.startsWith("[...");
  const endsLikeVariadic = token.endsWith("]");
  const isVariadicLike = startsLikeVariadic && endsLikeVariadic;
  return isVariadicLike;
};

const getSpecificityWeight = (patternToken: PatternTokenT): number => {
  const isLiteralToken = patternToken.kind === PatternTokenKind.literal;
  if (isLiteralToken) return 3;

  const isCaptureToken = patternToken.kind === PatternTokenKind.capture;
  if (isCaptureToken) return 2;

  return 1;
};

export const compilePattern = (sourcePattern: string): CompiledPatternT => {
  const patternTokens = parseArgsStringToArgv(sourcePattern);
  const hasAnyPatternTokens = patternTokens.length > 0;

  if (!hasAnyPatternTokens) {
    throw createPatternParseError("Pattern must contain at least one token", {
      sourcePattern,
    });
  }

  const compiledTokens: PatternTokenT[] = [];
  let tokenIndex = 0;

  while (tokenIndex < patternTokens.length) {
    const currentToken = patternTokens[tokenIndex];
    const hasCurrentToken = typeof currentToken === "string";

    if (!hasCurrentToken) {
      throw createPatternParseError("Pattern token must be a string value", {
        sourcePattern,
        tokenIndex,
      });
    }

    const captureName = getCaptureName(currentToken);
    const hasCaptureName = captureName !== null;
    if (hasCaptureName) {
      const capturePatternToken: PatternTokenT = {
        kind: PatternTokenKind.capture,
        name: captureName,
        position: tokenIndex,
      };

      compiledTokens.push(capturePatternToken);
      tokenIndex += 1;
      continue;
    }

    const variadicName = getVariadicName(currentToken);
    const hasVariadicName = variadicName !== null;
    if (hasVariadicName) {
      const isLastToken = tokenIndex === patternTokens.length - 1;
      if (!isLastToken) {
        throw createPatternParseError(
          "Variadic capture must be the last token in a pattern",
          {
            sourcePattern,
            tokenIndex,
            token: currentToken,
          },
        );
      }

      const variadicPatternToken: PatternTokenT = {
        kind: PatternTokenKind.variadic,
        name: variadicName,
        position: tokenIndex,
      };

      compiledTokens.push(variadicPatternToken);
      tokenIndex += 1;
      continue;
    }

    const looksLikeCapture = isCaptureLikeToken(currentToken);
    if (looksLikeCapture) {
      throw createPatternParseError(
        "Invalid capture token syntax. Expected <name>.",
        {
          sourcePattern,
          tokenIndex,
          token: currentToken,
        },
      );
    }

    const looksLikeVariadic = isVariadicLikeToken(currentToken);
    if (looksLikeVariadic) {
      throw createPatternParseError(
        "Invalid variadic token syntax. Expected [...name].",
        {
          sourcePattern,
          tokenIndex,
          token: currentToken,
        },
      );
    }

    const literalPatternToken: PatternTokenT = {
      kind: PatternTokenKind.literal,
      value: currentToken,
      position: tokenIndex,
    };

    compiledTokens.push(literalPatternToken);
    tokenIndex += 1;
  }

  const specificityVector: number[] = [];
  let specificityIndex = 0;

  while (specificityIndex < compiledTokens.length) {
    const currentPatternToken = compiledTokens[specificityIndex];
    const specificityWeight = getSpecificityWeight(currentPatternToken);
    specificityVector.push(specificityWeight);
    specificityIndex += 1;
  }

  const hasVariadic = compiledTokens.some(
    (patternToken) => patternToken.kind === PatternTokenKind.variadic,
  );

  const compiledPattern: CompiledPatternT = {
    sourcePattern,
    tokens: compiledTokens,
    specificityVector,
    tokenCount: compiledTokens.length,
    hasVariadic,
  };

  return compiledPattern;
};
