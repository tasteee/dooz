import { promises as fileSystem } from "node:fs";

import { to } from "await-to-js";
import YAML from "yaml";

import { createConfigParseError, createConfigSchemaError } from "../errors";
import { CommandDefinitionT } from "../types";

export type LoadedConfigT = {
  configPath: string;
  commands: CommandDefinitionT[];
};

const isRecordValue = (value: unknown): value is Record<string, unknown> => {
  const isObjectValue = typeof value === "object";
  if (!isObjectValue) return false;

  const isNullValue = value === null;
  if (isNullValue) return false;

  return true;
};

const readConfigText = async (configPath: string): Promise<string> => {
  const readResult = await to(fileSystem.readFile(configPath, "utf8"));
  const readError = readResult[0];
  const readValue = readResult[1];

  const hasReadError = readError !== null;
  if (hasReadError) {
    throw createConfigParseError("Unable to read config file", {
      configPath,
      cause: readError.message,
    });
  }

  const hasReadValue = typeof readValue === "string";
  if (!hasReadValue) {
    throw createConfigParseError("Config read produced a non-string result", {
      configPath,
    });
  }

  return readValue;
};

const parseConfigValue = (configText: string, configPath: string): unknown => {
  const yamlDocument = YAML.parseDocument(configText);
  const hasYamlErrors = yamlDocument.errors.length > 0;

  if (hasYamlErrors) {
    const firstYamlError = yamlDocument.errors[0];
    const errorMessage =
      typeof firstYamlError?.message === "string"
        ? firstYamlError.message
        : "Unknown YAML parse failure";

    throw createConfigParseError("YAML parsing failed", {
      configPath,
      cause: errorMessage,
    });
  }

  const parsedValue = yamlDocument.toJS();
  return parsedValue;
};

const validateStringArray = (
  value: unknown,
  fieldName: string,
  commandIndex: number,
): string[] => {
  const isArrayValue = Array.isArray(value);
  if (!isArrayValue) {
    throw createConfigSchemaError("Command field must be an array of strings", {
      fieldName,
      commandIndex,
    });
  }

  const normalizedValue: string[] = [];
  let valueIndex = 0;

  while (valueIndex < value.length) {
    const currentValue = value[valueIndex];
    const isStringValue = typeof currentValue === "string";

    if (!isStringValue) {
      throw createConfigSchemaError("Array field contains a non-string value", {
        fieldName,
        commandIndex,
        valueIndex,
      });
    }

    const trimmedValue = currentValue.trim();
    const hasTrimmedValue = trimmedValue.length > 0;
    if (!hasTrimmedValue) {
      throw createConfigSchemaError(
        "Array field contains an empty string value",
        {
          fieldName,
          commandIndex,
          valueIndex,
        },
      );
    }

    normalizedValue.push(trimmedValue);
    valueIndex += 1;
  }

  return normalizedValue;
};

const validateCommandDefinition = (
  candidateValue: unknown,
  commandIndex: number,
): CommandDefinitionT => {
  const isObjectValue = isRecordValue(candidateValue);
  if (!isObjectValue) {
    throw createConfigSchemaError("Command definition must be an object", {
      commandIndex,
    });
  }

  const inputValue = candidateValue.input;
  const outputValue = candidateValue.output;

  const hasInputString = typeof inputValue === "string";
  if (!hasInputString) {
    throw createConfigSchemaError("Command input must be a string", {
      commandIndex,
    });
  }

  const hasOutputString = typeof outputValue === "string";
  if (!hasOutputString) {
    throw createConfigSchemaError("Command output must be a string", {
      commandIndex,
    });
  }

  const trimmedInputValue = inputValue.trim();
  const hasInputValue = trimmedInputValue.length > 0;
  if (!hasInputValue) {
    throw createConfigSchemaError("Command input cannot be empty", {
      commandIndex,
    });
  }

  const trimmedOutputValue = outputValue.trim();
  const hasOutputValue = trimmedOutputValue.length > 0;
  if (!hasOutputValue) {
    throw createConfigSchemaError("Command output cannot be empty", {
      commandIndex,
    });
  }

  const commandDefinition: CommandDefinitionT = {
    input: trimmedInputValue,
    output: trimmedOutputValue,
  };

  const usesValue = candidateValue.uses;
  const hasUsesValue = typeof usesValue !== "undefined";
  if (hasUsesValue) {
    const validatedUsesValue = validateStringArray(
      usesValue,
      "uses",
      commandIndex,
    );
    commandDefinition.uses = validatedUsesValue;
  }

  const validatesValue = candidateValue.validates;
  const hasValidatesValue = typeof validatesValue !== "undefined";
  if (hasValidatesValue) {
    const validatedValidatorsValue = validateStringArray(
      validatesValue,
      "validates",
      commandIndex,
    );
    commandDefinition.validates = validatedValidatorsValue;
  }

  const descriptionValue = candidateValue.description;
  const hasDescriptionValue = typeof descriptionValue !== "undefined";
  if (hasDescriptionValue) {
    const isDescriptionString = typeof descriptionValue === "string";
    if (!isDescriptionString) {
      throw createConfigSchemaError("Command description must be a string", {
        commandIndex,
      });
    }

    const trimmedDescriptionValue = descriptionValue.trim();
    const hasDescriptionText = trimmedDescriptionValue.length > 0;
    if (!hasDescriptionText) {
      throw createConfigSchemaError("Command description cannot be empty", {
        commandIndex,
      });
    }

    commandDefinition.description = trimmedDescriptionValue;
  }

  return commandDefinition;
};

const validateConfigShape = (
  parsedConfigValue: unknown,
  configPath: string,
): CommandDefinitionT[] => {
  const isObjectValue = isRecordValue(parsedConfigValue);
  if (!isObjectValue) {
    throw createConfigSchemaError("Config root must be an object", {
      configPath,
    });
  }

  const commandsValue = parsedConfigValue.commands;
  const isCommandsArray = Array.isArray(commandsValue);
  if (!isCommandsArray) {
    throw createConfigSchemaError("Config root must define commands array", {
      configPath,
    });
  }

  const hasCommands = commandsValue.length > 0;
  if (!hasCommands) {
    throw createConfigSchemaError("Config must define at least one command", {
      configPath,
    });
  }

  const normalizedCommands: CommandDefinitionT[] = [];
  let commandIndex = 0;

  while (commandIndex < commandsValue.length) {
    const currentCommandValue = commandsValue[commandIndex];
    const commandDefinition = validateCommandDefinition(
      currentCommandValue,
      commandIndex,
    );
    normalizedCommands.push(commandDefinition);
    commandIndex += 1;
  }

  return normalizedCommands;
};

export const loadConfigFromPath = async (
  configPath: string,
): Promise<LoadedConfigT> => {
  const configText = await readConfigText(configPath);
  const parsedConfigValue = parseConfigValue(configText, configPath);
  const commandDefinitions = validateConfigShape(parsedConfigValue, configPath);

  const loadedConfig: LoadedConfigT = {
    configPath,
    commands: commandDefinitions,
  };

  return loadedConfig;
};
