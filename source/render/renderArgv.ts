import {
  createFilterFailureError,
  createMissingVariableError,
} from "../errors";
import { FilterT, TemplateSegmentKind } from "../types";
import { parseTemplateSegments } from "./parseTemplate";

const appendLiteralTokens = (
  targetArgv: string[],
  literalValue: string,
): void => {
  const trimmedLiteralValue = literalValue.trim();
  const hasLiteralValue = trimmedLiteralValue.length > 0;
  if (!hasLiteralValue) return;

  const literalTokens = trimmedLiteralValue.split(/\s+/);
  let tokenIndex = 0;

  while (tokenIndex < literalTokens.length) {
    const literalToken = literalTokens[tokenIndex];
    const hasToken = literalToken.length > 0;

    if (hasToken) targetArgv.push(literalToken);
    tokenIndex += 1;
  }
};

const applyFilters = (
  initialValue: unknown,
  filterInvocations: {
    filterName: string;
    filterArguments: string[];
  }[],
  filterLookup: Record<string, FilterT>,
): unknown => {
  let currentValue = initialValue;
  let filterIndex = 0;

  while (filterIndex < filterInvocations.length) {
    const filterInvocation = filterInvocations[filterIndex];
    const filterValue = filterLookup[filterInvocation.filterName];
    const hasFilter = typeof filterValue !== "undefined";

    if (!hasFilter) {
      throw createFilterFailureError("Referenced filter was not found", {
        filterName: filterInvocation.filterName,
      });
    }

    currentValue = filterValue.apply(
      currentValue,
      ...filterInvocation.filterArguments,
    );
    filterIndex += 1;
  }

  return currentValue;
};

const appendInterpolationValue = (
  targetArgv: string[],
  interpolationValue: unknown,
  variableName: string,
): void => {
  const isStringValue = typeof interpolationValue === "string";
  if (isStringValue) {
    targetArgv.push(interpolationValue);
    return;
  }

  const isArrayValue = Array.isArray(interpolationValue);
  if (isArrayValue) {
    let arrayIndex = 0;

    while (arrayIndex < interpolationValue.length) {
      const arrayValue = interpolationValue[arrayIndex];
      const isStringArrayValue = typeof arrayValue === "string";

      if (!isStringArrayValue) {
        throw createFilterFailureError(
          "Array interpolation value must contain only strings",
          {
            variableName,
            arrayIndex,
          },
        );
      }

      targetArgv.push(arrayValue);
      arrayIndex += 1;
    }

    return;
  }

  const isUndefinedValue = typeof interpolationValue === "undefined";
  if (isUndefinedValue) {
    throw createMissingVariableError(
      "Template interpolation variable is missing",
      {
        variableName,
      },
    );
  }

  const normalizedValue = String(interpolationValue);
  targetArgv.push(normalizedValue);
};

export const renderTemplateToArgv = (
  templateText: string,
  variables: Record<string, unknown>,
  filterLookup: Record<string, FilterT>,
): string[] => {
  const templateSegments = parseTemplateSegments(templateText);
  const renderedArgv: string[] = [];
  let segmentIndex = 0;

  while (segmentIndex < templateSegments.length) {
    const templateSegment = templateSegments[segmentIndex];
    const isLiteralSegment =
      templateSegment.kind === TemplateSegmentKind.literal;

    if (isLiteralSegment) {
      appendLiteralTokens(renderedArgv, templateSegment.literalValue);
      segmentIndex += 1;
      continue;
    }

    const isInterpolationSegment =
      templateSegment.kind === TemplateSegmentKind.interpolation;
    if (isInterpolationSegment) {
      const variableValue = variables[templateSegment.variableName];
      const hasVariableValue = typeof variableValue !== "undefined";

      if (!hasVariableValue) {
        throw createMissingVariableError(
          "Interpolation referenced an undefined variable",
          {
            variableName: templateSegment.variableName,
          },
        );
      }

      const filteredValue = applyFilters(
        variableValue,
        templateSegment.filterInvocations,
        filterLookup,
      );
      appendInterpolationValue(
        renderedArgv,
        filteredValue,
        templateSegment.variableName,
      );

      segmentIndex += 1;
      continue;
    }

    segmentIndex += 1;
  }

  return renderedArgv;
};
