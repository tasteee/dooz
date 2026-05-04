import path from "node:path";
import { pathToFileURL } from "node:url";

import { to } from "await-to-js";

import { createConfigSchemaError } from "../errors";
import { DoozExtensionsT, FilterT, ResolverT, ValidatorT } from "../types";

export type LoadedExtensionsT = {
  extensionPath: string | null;
  resolvers: ResolverT[];
  validators: ValidatorT[];
  filters: FilterT[];
};

const isRecordValue = (value: unknown): value is Record<string, unknown> => {
  const isObjectValue = typeof value === "object";
  if (!isObjectValue) return false;

  const isNullValue = value === null;
  if (isNullValue) return false;

  return true;
};

const validateNamedFunctionObject = (
  value: unknown,
  collectionName: string,
  index: number,
  functionKey: string,
): Record<string, unknown> => {
  const isObjectValue = isRecordValue(value);
  if (!isObjectValue) {
    throw createConfigSchemaError("Extension member must be an object", {
      collectionName,
      index,
    });
  }

  const nameValue = value.name;
  const hasNameValue =
    typeof nameValue === "string" && nameValue.trim().length > 0;
  if (!hasNameValue) {
    throw createConfigSchemaError(
      "Extension member must define non-empty name",
      {
        collectionName,
        index,
      },
    );
  }

  const functionValue = value[functionKey];
  const hasFunctionValue = typeof functionValue === "function";
  if (!hasFunctionValue) {
    throw createConfigSchemaError(
      "Extension member is missing callable field",
      {
        collectionName,
        index,
        functionKey,
      },
    );
  }

  return value;
};

const validateResolverArray = (value: unknown): ResolverT[] => {
  const hasValue = typeof value !== "undefined";
  if (!hasValue) return [];

  const isArrayValue = Array.isArray(value);
  if (!isArrayValue) {
    throw createConfigSchemaError("Extension resolvers must be an array");
  }

  const resolvers: ResolverT[] = [];
  let resolverIndex = 0;

  while (resolverIndex < value.length) {
    const resolverValue = value[resolverIndex];
    const resolverObject = validateNamedFunctionObject(
      resolverValue,
      "resolvers",
      resolverIndex,
      "resolve",
    );

    const providesValue = resolverObject.provides;
    const hasProvidesArray = Array.isArray(providesValue);
    if (!hasProvidesArray) {
      throw createConfigSchemaError("Resolver must define provides array", {
        resolverIndex,
      });
    }

    const resolverTypedValue = resolverObject as unknown as ResolverT;
    resolvers.push(resolverTypedValue);
    resolverIndex += 1;
  }

  return resolvers;
};

const validateValidatorArray = (value: unknown): ValidatorT[] => {
  const hasValue = typeof value !== "undefined";
  if (!hasValue) return [];

  const isArrayValue = Array.isArray(value);
  if (!isArrayValue) {
    throw createConfigSchemaError("Extension validators must be an array");
  }

  const validators: ValidatorT[] = [];
  let validatorIndex = 0;

  while (validatorIndex < value.length) {
    const validatorValue = value[validatorIndex];
    const validatorObject = validateNamedFunctionObject(
      validatorValue,
      "validators",
      validatorIndex,
      "validate",
    );

    const validatorTypedValue = validatorObject as unknown as ValidatorT;
    validators.push(validatorTypedValue);
    validatorIndex += 1;
  }

  return validators;
};

const validateFilterArray = (value: unknown): FilterT[] => {
  const hasValue = typeof value !== "undefined";
  if (!hasValue) return [];

  const isArrayValue = Array.isArray(value);
  if (!isArrayValue) {
    throw createConfigSchemaError("Extension filters must be an array");
  }

  const filters: FilterT[] = [];
  let filterIndex = 0;

  while (filterIndex < value.length) {
    const filterValue = value[filterIndex];
    const filterObject = validateNamedFunctionObject(
      filterValue,
      "filters",
      filterIndex,
      "apply",
    );

    const filterTypedValue = filterObject as unknown as FilterT;
    filters.push(filterTypedValue);
    filterIndex += 1;
  }

  return filters;
};

const normalizeExtensionExport = (value: unknown): DoozExtensionsT => {
  const isObjectValue = isRecordValue(value);
  if (!isObjectValue) {
    throw createConfigSchemaError("Extension default export must be an object");
  }

  const normalizedExtension: DoozExtensionsT = {
    resolvers: validateResolverArray(value.resolvers),
    validators: validateValidatorArray(value.validators),
    filters: validateFilterArray(value.filters),
  };

  return normalizedExtension;
};

export const loadExtensions = async (
  extensionPath: string | null,
): Promise<LoadedExtensionsT> => {
  const hasExtensionPath = typeof extensionPath === "string";
  if (!hasExtensionPath) {
    return {
      extensionPath: null,
      resolvers: [],
      validators: [],
      filters: [],
    };
  }

  const extensionUrl = pathToFileURL(extensionPath).href;
  const importResult = await to(import(extensionUrl));
  const importError = importResult[0];
  const importedModule = importResult[1];
  const hasImportError = importError !== null;

  if (hasImportError) {
    const extensionFileName = path.basename(extensionPath);
    throw createConfigSchemaError("Failed to load extension module", {
      extensionPath,
      extensionFileName,
      cause: importError.message,
    });
  }

  const normalizedExtension = normalizeExtensionExport(importedModule.default);
  const loadedExtensions: LoadedExtensionsT = {
    extensionPath,
    resolvers: normalizedExtension.resolvers ?? [],
    validators: normalizedExtension.validators ?? [],
    filters: normalizedExtension.filters ?? [],
  };

  return loadedExtensions;
};
