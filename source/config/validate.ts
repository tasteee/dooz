import { createConfigSchemaError } from "../errors";
import { compilePattern } from "../pattern/compile";
import { parseTemplateSegments } from "../render/parseTemplate";
import {
  CommandDefinitionT,
  CompiledPatternT,
  FilterT,
  ResolverT,
  TemplateSegmentKind,
  ValidatorT,
} from "../types";

export type ValidatedCommandT = {
  commandDefinition: CommandDefinitionT;
  compiledPattern: CompiledPatternT;
};

const createNameLookup = <ValueT extends { name: string }>(
  values: ValueT[],
): Record<string, ValueT> => {
  const lookup: Record<string, ValueT> = {};
  let valueIndex = 0;

  while (valueIndex < values.length) {
    const value = values[valueIndex];
    lookup[value.name] = value;
    valueIndex += 1;
  }

  return lookup;
};

const vectorsAreEqual = (
  firstVector: number[],
  secondVector: number[],
): boolean => {
  const hasSameLength = firstVector.length === secondVector.length;
  if (!hasSameLength) return false;

  let vectorIndex = 0;

  while (vectorIndex < firstVector.length) {
    const firstValue = firstVector[vectorIndex];
    const secondValue = secondVector[vectorIndex];
    const valuesAreEqual = firstValue === secondValue;
    if (!valuesAreEqual) return false;

    vectorIndex += 1;
  }

  return true;
};

const patternsHaveGuaranteedOverlap = (
  firstPattern: CompiledPatternT,
  secondPattern: CompiledPatternT,
): boolean => {
  const hasEqualSpecificity = vectorsAreEqual(
    firstPattern.specificityVector,
    secondPattern.specificityVector,
  );
  if (!hasEqualSpecificity) return false;

  const hasEqualTokenCount =
    firstPattern.tokens.length === secondPattern.tokens.length;
  if (!hasEqualTokenCount) return false;

  let tokenIndex = 0;

  while (tokenIndex < firstPattern.tokens.length) {
    const firstToken = firstPattern.tokens[tokenIndex];
    const secondToken = secondPattern.tokens[tokenIndex];
    const hasEqualTokenKind = firstToken.kind === secondToken.kind;
    if (!hasEqualTokenKind) return false;

    const isLiteralToken = firstToken.kind === "literal";
    if (isLiteralToken) {
      const isSecondLiteralToken = secondToken.kind === "literal";
      if (!isSecondLiteralToken) return false;

      const hasEqualLiteralValue = firstToken.value === secondToken.value;
      if (!hasEqualLiteralValue) return false;
    }

    tokenIndex += 1;
  }

  return true;
};

const validatePatternAmbiguity = (
  validatedCommands: ValidatedCommandT[],
): void => {
  let firstCommandIndex = 0;

  while (firstCommandIndex < validatedCommands.length) {
    const firstCommand = validatedCommands[firstCommandIndex];
    let secondCommandIndex = firstCommandIndex + 1;

    while (secondCommandIndex < validatedCommands.length) {
      const secondCommand = validatedCommands[secondCommandIndex];
      const hasAmbiguousOverlap = patternsHaveGuaranteedOverlap(
        firstCommand.compiledPattern,
        secondCommand.compiledPattern,
      );

      if (hasAmbiguousOverlap) {
        throw createConfigSchemaError(
          "Two command patterns are ambiguous with equal specificity",
          {
            firstPattern: firstCommand.commandDefinition.input,
            secondPattern: secondCommand.commandDefinition.input,
          },
        );
      }

      secondCommandIndex += 1;
    }

    firstCommandIndex += 1;
  }
};

const validateReferencedResolvers = (
  commandDefinition: CommandDefinitionT,
  resolverLookup: Record<string, ResolverT>,
): void => {
  const usesValue = commandDefinition.uses;
  const usesList = Array.isArray(usesValue) ? usesValue : [];
  let useIndex = 0;

  while (useIndex < usesList.length) {
    const resolverName = usesList[useIndex];
    const resolverValue = resolverLookup[resolverName];
    const hasResolverValue = typeof resolverValue !== "undefined";

    if (!hasResolverValue) {
      throw createConfigSchemaError("Command references unknown resolver", {
        input: commandDefinition.input,
        resolverName,
      });
    }

    useIndex += 1;
  }
};

const validateReferencedValidators = (
  commandDefinition: CommandDefinitionT,
  validatorLookup: Record<string, ValidatorT>,
): void => {
  const validatesValue = commandDefinition.validates;
  const validatesList = Array.isArray(validatesValue) ? validatesValue : [];
  let validateIndex = 0;

  while (validateIndex < validatesList.length) {
    const validatorName = validatesList[validateIndex];
    const validatorValue = validatorLookup[validatorName];
    const hasValidatorValue = typeof validatorValue !== "undefined";

    if (!hasValidatorValue) {
      throw createConfigSchemaError("Command references unknown validator", {
        input: commandDefinition.input,
        validatorName,
      });
    }

    validateIndex += 1;
  }
};

const validateReferencedFilters = (
  commandDefinition: CommandDefinitionT,
  filterLookup: Record<string, FilterT>,
): void => {
  const templateSegments = parseTemplateSegments(commandDefinition.output);
  let segmentIndex = 0;

  while (segmentIndex < templateSegments.length) {
    const templateSegment = templateSegments[segmentIndex];
    const isInterpolationSegment =
      templateSegment.kind === TemplateSegmentKind.interpolation;

    if (!isInterpolationSegment) {
      segmentIndex += 1;
      continue;
    }

    let filterIndex = 0;

    while (filterIndex < templateSegment.filterInvocations.length) {
      const filterInvocation = templateSegment.filterInvocations[filterIndex];
      const filterValue = filterLookup[filterInvocation.filterName];
      const hasFilterValue = typeof filterValue !== "undefined";

      if (!hasFilterValue) {
        throw createConfigSchemaError("Command references unknown filter", {
          input: commandDefinition.input,
          output: commandDefinition.output,
          filterName: filterInvocation.filterName,
        });
      }

      filterIndex += 1;
    }

    segmentIndex += 1;
  }
};

export const validateLoadedConfig = (
  commands: CommandDefinitionT[],
  resolvers: ResolverT[],
  validators: ValidatorT[],
  filters: FilterT[],
): ValidatedCommandT[] => {
  const resolverLookup = createNameLookup(resolvers);
  const validatorLookup = createNameLookup(validators);
  const filterLookup = createNameLookup(filters);
  const validatedCommands: ValidatedCommandT[] = [];

  let commandIndex = 0;

  while (commandIndex < commands.length) {
    const commandDefinition = commands[commandIndex];
    const compiledPattern = compilePattern(commandDefinition.input);

    validateReferencedResolvers(commandDefinition, resolverLookup);
    validateReferencedValidators(commandDefinition, validatorLookup);
    validateReferencedFilters(commandDefinition, filterLookup);

    validatedCommands.push({
      commandDefinition,
      compiledPattern,
    });

    commandIndex += 1;
  }

  validatePatternAmbiguity(validatedCommands);
  return validatedCommands;
};
