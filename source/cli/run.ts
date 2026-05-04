import { to } from "await-to-js";
import { execa } from "execa";
import { promises as fileSystem } from "node:fs";
import path from "node:path";

import { discoverConfigPath } from "../config/discover.js";
import { loadConfigFromPath } from "../config/load.js";
import { validateLoadedConfig } from "../config/validate.js";
import type { ValidatedCommandT } from "../config/validate.js";
import { runResolvers } from "../engine/resolverEngine.js";
import { runValidators } from "../engine/validatorEngine.js";
import { createExecutionFailureError } from "../errors.js";
import { discoverExtensionPath } from "../extensions/discover.js";
import {
  createFilterLookup,
  builtinFilters,
} from "../extensions/builtinFilters.js";
import { loadExtensions } from "../extensions/load.js";
import { selectBestPatternMatch } from "../pattern/rank.js";
import { renderTemplateToArgv } from "../render/renderArgv.js";
import { renderDisplayCommand } from "../render/renderDisplay.js";
import type { CommandDefinitionT, CompiledPatternT } from "../types.js";
import { parseCliArguments } from "./flags.js";

type CompiledCommandT = {
  commandDefinition: CommandDefinitionT;
  compiledPattern: CompiledPatternT;
};

const usageText = [
  "Usage: dooz <command tokens> [--dooz [dry] [explain] [path]]",
  "",
  "Examples:",
  "  dooz test all",
  "  dooz test ui --watch --dooz dry",
  "  dooz test ui --watch --dooz explain ./dooz.ts",
].join("\n");

const filePathExists = async (targetPath: string): Promise<boolean> => {
  const accessResult = await to(fileSystem.access(targetPath));
  const accessError = accessResult[0];
  const hasAccessError = accessError !== null;
  if (hasAccessError) return false;
  return true;
};

type OverridePathSelectionT = {
  overrideConfigPath?: string;
  overrideExtensionPath?: string;
};

const resolveOverridePathSelection = async (
  currentWorkingDirectory: string,
  overrideFilePath?: string,
): Promise<OverridePathSelectionT> => {
  const hasOverrideFilePath = typeof overrideFilePath === "string";
  if (!hasOverrideFilePath) {
    return {};
  }

  const isAbsoluteOverridePath = path.isAbsolute(overrideFilePath);
  const resolvedOverridePath = isAbsoluteOverridePath
    ? overrideFilePath
    : path.resolve(currentWorkingDirectory, overrideFilePath);
  const overridePathExists = await filePathExists(resolvedOverridePath);

  if (!overridePathExists) {
    throw createExecutionFailureError("Path from --dooz was not found", {
      overrideFilePath,
      resolvedOverridePath,
    });
  }

  const lowerPath = resolvedOverridePath.toLowerCase();
  const isConfigFilePath =
    lowerPath.endsWith(".yaml") || lowerPath.endsWith(".yml");
  if (isConfigFilePath) {
    return {
      overrideConfigPath: resolvedOverridePath,
    };
  }

  const isExtensionFilePath =
    lowerPath.endsWith(".ts") || lowerPath.endsWith(".js");
  if (isExtensionFilePath) {
    return {
      overrideExtensionPath: resolvedOverridePath,
    };
  }

  return {
    overrideConfigPath: resolvedOverridePath,
  };
};

const normalizeValidatedCommands = (
  validatedCommands: ValidatedCommandT[],
): CompiledCommandT[] => {
  const compiledCommands: CompiledCommandT[] = [];
  let commandIndex = 0;

  while (commandIndex < validatedCommands.length) {
    const validatedCommand = validatedCommands[commandIndex];
    const hasValidatedCommand = typeof validatedCommand !== "undefined";
    if (!hasValidatedCommand) {
      throw createExecutionFailureError("Validated command lookup failed");
    }

    compiledCommands.push({
      commandDefinition: validatedCommand.commandDefinition,
      compiledPattern: validatedCommand.compiledPattern,
    });
    commandIndex += 1;
  }

  return compiledCommands;
};

const createCommandLookup = (
  compiledCommands: CompiledCommandT[],
): Record<string, CommandDefinitionT> => {
  const lookup: Record<string, CommandDefinitionT> = {};
  let commandIndex = 0;

  while (commandIndex < compiledCommands.length) {
    const compiledCommand = compiledCommands[commandIndex];
    const hasCompiledCommand = typeof compiledCommand !== "undefined";
    if (!hasCompiledCommand) {
      throw createExecutionFailureError("Compiled command lookup failed");
    }

    lookup[compiledCommand.compiledPattern.sourcePattern] =
      compiledCommand.commandDefinition;
    commandIndex += 1;
  }

  return lookup;
};

const copyArgumentsIntoVariables = (
  argumentsByName: Record<string, string | string[]>,
): Record<string, unknown> => {
  const variables: Record<string, unknown> = {};
  const argumentNames = Object.keys(argumentsByName);
  let argumentIndex = 0;

  while (argumentIndex < argumentNames.length) {
    const argumentName = argumentNames[argumentIndex];
    const hasArgumentName = typeof argumentName === "string";
    if (!hasArgumentName) {
      throw createExecutionFailureError("Argument name lookup failed");
    }

    const argumentValue = argumentsByName[argumentName];
    variables[argumentName] = argumentValue;
    argumentIndex += 1;
  }

  return variables;
};

const writeExplainOutput = (
  standardOutput: NodeJS.WriteStream,
  configPath: string,
  extensionPath: string | null,
  matchedPattern: string,
  argumentsByName: Record<string, string | string[]>,
  resolverTrace: {
    resolverName: string;
    output: Record<string, unknown>;
  }[],
  validatorTrace: string[],
  outputTemplate: string,
  renderedArgv: string[],
): void => {
  const explainLines: string[] = [];
  explainLines.push("Explain:");
  explainLines.push(`Config path: ${configPath}`);
  explainLines.push(`Extension path: ${extensionPath ?? "none"}`);
  explainLines.push(`Matched pattern: ${matchedPattern}`);
  explainLines.push(
    `Captured arguments: ${JSON.stringify(argumentsByName, null, 2)}`,
  );
  explainLines.push(
    `Resolver trace: ${JSON.stringify(resolverTrace, null, 2)}`,
  );
  explainLines.push(`Validator trace: ${JSON.stringify(validatorTrace)}`);
  explainLines.push(`Output template: ${outputTemplate}`);
  explainLines.push(`Rendered command: ${renderDisplayCommand(renderedArgv)}`);
  explainLines.push(`Final argv: ${JSON.stringify(renderedArgv)}`);

  const explainText = explainLines.join("\n");
  standardOutput.write(`${explainText}\n`);
};

const executeArgv = async (renderedArgv: string[]): Promise<number> => {
  const executableValue = renderedArgv[0];
  const hasExecutableValue = typeof executableValue === "string";

  if (!hasExecutableValue) {
    throw createExecutionFailureError(
      "Rendered command did not produce executable",
    );
  }

  const commandArguments = renderedArgv.slice(1);
  const executionResult = await to(
    execa(executableValue, commandArguments, {
      stdio: "inherit",
      reject: false,
    }),
  );

  const executionError = executionResult[0];
  const executionValue = executionResult[1];
  const hasExecutionError = executionError !== null;

  if (hasExecutionError) {
    throw createExecutionFailureError("Command execution failed", {
      cause: executionError.message,
    });
  }

  const hasExecutionValue = typeof executionValue !== "undefined";
  if (!hasExecutionValue) {
    throw createExecutionFailureError(
      "Command execution did not return result",
    );
  }

  const exitCodeValue = executionValue.exitCode;
  const hasExitCodeValue = typeof exitCodeValue === "number";
  if (!hasExitCodeValue) {
    throw createExecutionFailureError(
      "Command execution exit code was missing",
    );
  }

  return exitCodeValue;
};

export const runCli = async (
  rawArguments: string[],
  currentWorkingDirectory: string,
  standardOutput: NodeJS.WriteStream,
): Promise<number> => {
  const parsedCliArguments = parseCliArguments(rawArguments);
  const hasInputTokens = parsedCliArguments.inputTokens.length > 0;

  if (!hasInputTokens) {
    standardOutput.write(`${usageText}\n`);
    return 0;
  }

  const overridePathSelection = await resolveOverridePathSelection(
    currentWorkingDirectory,
    parsedCliArguments.overrideFilePath,
  );

  const configPath = await discoverConfigPath(
    currentWorkingDirectory,
    overridePathSelection.overrideConfigPath,
  );
  const loadedConfig = await loadConfigFromPath(configPath);
  const overrideExtensionPath = overridePathSelection.overrideExtensionPath;
  const hasOverrideExtensionPath = typeof overrideExtensionPath === "string";
  const configDirectory = path.dirname(configPath);
  let extensionPath: string | null = null;

  if (hasOverrideExtensionPath) {
    extensionPath = overrideExtensionPath;
  }

  if (!hasOverrideExtensionPath) {
    extensionPath = await discoverExtensionPath(configDirectory);
  }

  const loadedExtensions = await loadExtensions(extensionPath);
  const allFilters = builtinFilters.concat(loadedExtensions.filters);
  const validatedCommands = validateLoadedConfig(
    loadedConfig.commands,
    loadedExtensions.resolvers,
    loadedExtensions.validators,
    allFilters,
  );
  const compiledCommands = normalizeValidatedCommands(validatedCommands);

  const compiledPatterns: CompiledPatternT[] = [];
  let patternIndex = 0;

  while (patternIndex < compiledCommands.length) {
    const compiledCommand = compiledCommands[patternIndex];
    const hasCompiledCommand = typeof compiledCommand !== "undefined";
    if (!hasCompiledCommand) {
      throw createExecutionFailureError("Compiled pattern lookup failed");
    }

    compiledPatterns.push(compiledCommand.compiledPattern);
    patternIndex += 1;
  }

  const bestPatternMatchCandidate = selectBestPatternMatch(
    compiledPatterns,
    parsedCliArguments.inputTokens,
  );
  const commandLookup = createCommandLookup(compiledCommands);
  const matchedCommandDefinition =
    commandLookup[bestPatternMatchCandidate.compiledPattern.sourcePattern];

  const hasMatchedCommandDefinition =
    typeof matchedCommandDefinition !== "undefined";
  if (!hasMatchedCommandDefinition) {
    throw createExecutionFailureError("Matched pattern did not map to command");
  }

  const variables = copyArgumentsIntoVariables(
    bestPatternMatchCandidate.matchResult.argumentsByName,
  );
  const usesValue = matchedCommandDefinition.uses;
  const requestedResolverNames = Array.isArray(usesValue) ? usesValue : [];
  const resolverExecutionResult = await runResolvers(
    requestedResolverNames,
    loadedExtensions.resolvers,
    bestPatternMatchCandidate.matchResult.argumentsByName,
    variables,
    currentWorkingDirectory,
  );

  const validatesValue = matchedCommandDefinition.validates;
  const requestedValidatorNames = Array.isArray(validatesValue)
    ? validatesValue
    : [];
  const validatorTrace = await runValidators(
    requestedValidatorNames,
    loadedExtensions.validators,
    bestPatternMatchCandidate.matchResult.argumentsByName,
    resolverExecutionResult.variables,
    currentWorkingDirectory,
  );

  const filterLookup = createFilterLookup(allFilters);
  const renderedArgv = renderTemplateToArgv(
    matchedCommandDefinition.output,
    resolverExecutionResult.variables,
    filterLookup,
  );

  const explainEnabled = parsedCliArguments.explainEnabled;
  if (explainEnabled) {
    writeExplainOutput(
      standardOutput,
      configPath,
      loadedExtensions.extensionPath,
      bestPatternMatchCandidate.compiledPattern.sourcePattern,
      bestPatternMatchCandidate.matchResult.argumentsByName,
      resolverExecutionResult.resolverTrace,
      validatorTrace,
      matchedCommandDefinition.output,
      renderedArgv,
    );

    return 0;
  }

  const dryRunEnabled = parsedCliArguments.dryRunEnabled;
  if (dryRunEnabled) {
    const displayCommand = renderDisplayCommand(renderedArgv);
    standardOutput.write(`${displayCommand}\n`);
    return 0;
  }

  const exitCode = await executeArgv(renderedArgv);
  return exitCode;
};
