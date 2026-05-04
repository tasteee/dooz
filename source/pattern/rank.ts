import { createAmbiguousMatchError, createNoMatchError } from "../errors";
import { CompiledPatternT, PatternMatchCandidateT } from "../types";
import { matchCompiledPattern } from "./match";

const compareSpecificityVectors = (
  firstSpecificityVector: number[],
  secondSpecificityVector: number[],
): number => {
  const sharedLength = Math.min(
    firstSpecificityVector.length,
    secondSpecificityVector.length,
  );

  let vectorIndex = 0;

  while (vectorIndex < sharedLength) {
    const firstValue = firstSpecificityVector[vectorIndex];
    const secondValue = secondSpecificityVector[vectorIndex];
    const valuesAreEqual = firstValue === secondValue;

    if (!valuesAreEqual) {
      const firstIsGreater = firstValue > secondValue;
      if (firstIsGreater) return 1;
      return -1;
    }

    vectorIndex += 1;
  }

  const firstLengthIsGreater =
    firstSpecificityVector.length > secondSpecificityVector.length;
  if (firstLengthIsGreater) return 1;

  const secondLengthIsGreater =
    secondSpecificityVector.length > firstSpecificityVector.length;
  if (secondLengthIsGreater) return -1;

  return 0;
};

export const selectBestPatternMatch = (
  compiledPatterns: CompiledPatternT[],
  inputTokens: string[],
): PatternMatchCandidateT => {
  let bestPatternMatchCandidate: PatternMatchCandidateT | null = null;

  let patternIndex = 0;

  while (patternIndex < compiledPatterns.length) {
    const compiledPattern = compiledPatterns[patternIndex];
    const matchResult = matchCompiledPattern(compiledPattern, inputTokens);
    const hasMatchResult = matchResult !== null;

    if (!hasMatchResult) {
      patternIndex += 1;
      continue;
    }

    if (bestPatternMatchCandidate === null) {
      bestPatternMatchCandidate = {
        compiledPattern,
        matchResult,
      };
      patternIndex += 1;
      continue;
    }

    const currentBestPatternMatchCandidate = bestPatternMatchCandidate;

    const specificityComparison = compareSpecificityVectors(
      compiledPattern.specificityVector,
      currentBestPatternMatchCandidate.compiledPattern.specificityVector,
    );

    const isMoreSpecific = specificityComparison > 0;
    if (isMoreSpecific) {
      bestPatternMatchCandidate = {
        compiledPattern,
        matchResult,
      };
      patternIndex += 1;
      continue;
    }

    const isAmbiguousSpecificity = specificityComparison === 0;
    if (isAmbiguousSpecificity) {
      const ambiguousPatterns = [
        currentBestPatternMatchCandidate.compiledPattern.sourcePattern,
        compiledPattern.sourcePattern,
      ];

      throw createAmbiguousMatchError(
        "Multiple patterns matched with identical specificity",
        {
          inputTokens,
          ambiguousPatterns,
        },
      );
    }

    patternIndex += 1;
  }

  if (bestPatternMatchCandidate === null) {
    throw createNoMatchError("No command pattern matched the input tokens", {
      inputTokens,
    });
  }

  return bestPatternMatchCandidate;
};
