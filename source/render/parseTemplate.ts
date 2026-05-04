import YAML from "yaml";

import { createFilterFailureError } from "../errors";
import {
  FilterInvocationT,
  TemplateSegmentKind,
  TemplateSegmentT,
} from "../types";

const parseFilterArguments = (filterArgumentsText: string): string[] => {
  const trimmedFilterArgumentsText = filterArgumentsText.trim();
  const hasFilterArgumentsText = trimmedFilterArgumentsText.length > 0;
  if (!hasFilterArgumentsText) return [];

  const wrappedArgumentsText = `[${trimmedFilterArgumentsText}]`;
  const argumentsDocument = YAML.parseDocument(wrappedArgumentsText);
  const hasYamlErrors = argumentsDocument.errors.length > 0;

  if (hasYamlErrors) {
    const firstYamlError = argumentsDocument.errors[0];
    const errorMessage =
      typeof firstYamlError?.message === "string"
        ? firstYamlError.message
        : "Unknown filter argument parse failure";

    throw createFilterFailureError("Failed to parse filter arguments", {
      filterArgumentsText,
      cause: errorMessage,
    });
  }

  const parsedValue = argumentsDocument.toJS();
  const isArrayValue = Array.isArray(parsedValue);

  if (!isArrayValue) {
    throw createFilterFailureError("Filter arguments must parse as an array", {
      filterArgumentsText,
    });
  }

  const normalizedFilterArguments: string[] = [];
  let argumentIndex = 0;

  while (argumentIndex < parsedValue.length) {
    const argumentValue = parsedValue[argumentIndex];
    const normalizedArgumentValue = String(argumentValue);
    normalizedFilterArguments.push(normalizedArgumentValue);
    argumentIndex += 1;
  }

  return normalizedFilterArguments;
};

const parseFilterInvocation = (filterText: string): FilterInvocationT => {
  const trimmedFilterText = filterText.trim();
  const hasFilterName = trimmedFilterText.length > 0;

  if (!hasFilterName) {
    throw createFilterFailureError("Filter name cannot be empty", {
      filterText,
    });
  }

  const openParenthesisIndex = trimmedFilterText.indexOf("(");
  const hasOpenParenthesis = openParenthesisIndex >= 0;

  if (!hasOpenParenthesis) {
    const filterInvocation: FilterInvocationT = {
      filterName: trimmedFilterText,
      filterArguments: [],
    };

    return filterInvocation;
  }

  const closeParenthesisIndex = trimmedFilterText.lastIndexOf(")");
  const hasCloseParenthesis = closeParenthesisIndex >= 0;
  if (!hasCloseParenthesis) {
    throw createFilterFailureError(
      "Filter invocation is missing closing parenthesis",
      {
        filterText,
      },
    );
  }

  const hasExpectedParenthesisOrder =
    closeParenthesisIndex > openParenthesisIndex;
  if (!hasExpectedParenthesisOrder) {
    throw createFilterFailureError(
      "Filter invocation has invalid parenthesis order",
      {
        filterText,
      },
    );
  }

  const filterName = trimmedFilterText.slice(0, openParenthesisIndex).trim();
  const hasFilterNameText = filterName.length > 0;
  if (!hasFilterNameText) {
    throw createFilterFailureError("Filter invocation is missing filter name", {
      filterText,
    });
  }

  const filterArgumentsText = trimmedFilterText
    .slice(openParenthesisIndex + 1, closeParenthesisIndex)
    .trim();
  const filterArguments = parseFilterArguments(filterArgumentsText);

  const filterInvocation: FilterInvocationT = {
    filterName,
    filterArguments,
  };

  return filterInvocation;
};

const parseInterpolation = (interpolationText: string): TemplateSegmentT => {
  const interpolationParts = interpolationText.split("|");
  const hasInterpolationParts = interpolationParts.length > 0;

  if (!hasInterpolationParts) {
    throw createFilterFailureError("Interpolation cannot be empty", {
      interpolationText,
    });
  }

  const variableNameCandidate = interpolationParts[0];
  const variableName = variableNameCandidate.trim();
  const hasVariableName = variableName.length > 0;

  if (!hasVariableName) {
    throw createFilterFailureError("Interpolation is missing variable name", {
      interpolationText,
    });
  }

  const filterInvocations: FilterInvocationT[] = [];
  let partIndex = 1;

  while (partIndex < interpolationParts.length) {
    const filterText = interpolationParts[partIndex];
    const filterInvocation = parseFilterInvocation(filterText);
    filterInvocations.push(filterInvocation);
    partIndex += 1;
  }

  const interpolationSegment: TemplateSegmentT = {
    kind: TemplateSegmentKind.interpolation,
    variableName,
    filterInvocations,
  };

  return interpolationSegment;
};

export const parseTemplateSegments = (
  templateText: string,
): TemplateSegmentT[] => {
  const segments: TemplateSegmentT[] = [];
  let cursorIndex = 0;

  while (cursorIndex < templateText.length) {
    const openTokenIndex = templateText.indexOf("{{", cursorIndex);
    const hasOpenToken = openTokenIndex >= 0;

    if (!hasOpenToken) {
      const trailingLiteralText = templateText.slice(cursorIndex);
      const hasTrailingLiteralText = trailingLiteralText.length > 0;

      if (hasTrailingLiteralText) {
        segments.push({
          kind: TemplateSegmentKind.literal,
          literalValue: trailingLiteralText,
        });
      }

      break;
    }

    const literalText = templateText.slice(cursorIndex, openTokenIndex);
    const hasLiteralText = literalText.length > 0;
    if (hasLiteralText) {
      segments.push({
        kind: TemplateSegmentKind.literal,
        literalValue: literalText,
      });
    }

    const interpolationSearchStartIndex = openTokenIndex + 2;
    const closeTokenIndex = templateText.indexOf(
      "}}",
      interpolationSearchStartIndex,
    );
    const hasCloseToken = closeTokenIndex >= 0;

    if (!hasCloseToken) {
      throw createFilterFailureError(
        "Interpolation token has no closing marker",
        {
          templateText,
        },
      );
    }

    const interpolationText = templateText
      .slice(interpolationSearchStartIndex, closeTokenIndex)
      .trim();
    const interpolationSegment = parseInterpolation(interpolationText);
    segments.push(interpolationSegment);

    cursorIndex = closeTokenIndex + 2;
  }

  return segments;
};
