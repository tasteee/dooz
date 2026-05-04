import { to } from "await-to-js";

import { createResolverFailureError } from "../errors";
import { ResolverT } from "../types";

export type ResolverExecutionResultT = {
  variables: Record<string, unknown>;
  resolverTrace: {
    resolverName: string;
    output: Record<string, unknown>;
  }[];
};

const hasKey = (recordValue: Record<string, unknown>, key: string): boolean => {
  const hasProperty = Object.prototype.hasOwnProperty.call(recordValue, key);
  return hasProperty;
};

const createResolverLookup = (
  resolvers: ResolverT[],
): Record<string, ResolverT> => {
  const lookup: Record<string, ResolverT> = {};
  let resolverIndex = 0;

  while (resolverIndex < resolvers.length) {
    const resolverValue = resolvers[resolverIndex];
    lookup[resolverValue.name] = resolverValue;
    resolverIndex += 1;
  }

  return lookup;
};

const getUniqueResolverNames = (resolverNames: string[]): string[] => {
  const uniqueResolverNames: string[] = [];
  const resolverNameLookup: Record<string, true> = {};
  let resolverIndex = 0;

  while (resolverIndex < resolverNames.length) {
    const resolverName = resolverNames[resolverIndex];
    const alreadyIncluded = hasKey(resolverNameLookup, resolverName);

    if (!alreadyIncluded) {
      uniqueResolverNames.push(resolverName);
      resolverNameLookup[resolverName] = true;
    }

    resolverIndex += 1;
  }

  return uniqueResolverNames;
};

const createProvidesLookup = (
  resolverNames: string[],
  resolverLookup: Record<string, ResolverT>,
): Record<string, string> => {
  const providesLookup: Record<string, string> = {};
  let resolverIndex = 0;

  while (resolverIndex < resolverNames.length) {
    const resolverName = resolverNames[resolverIndex];
    const resolverValue = resolverLookup[resolverName];
    const hasResolverValue = typeof resolverValue !== "undefined";

    if (!hasResolverValue) {
      throw createResolverFailureError("Referenced resolver was not found", {
        resolverName,
      });
    }

    let providesIndex = 0;

    while (providesIndex < resolverValue.provides.length) {
      const providedKey = resolverValue.provides[providesIndex];
      const existingProviderName = providesLookup[providedKey];
      const hasExistingProviderName = typeof existingProviderName === "string";

      if (hasExistingProviderName) {
        throw createResolverFailureError(
          "Multiple resolvers provide same key",
          {
            key: providedKey,
            firstResolverName: existingProviderName,
            secondResolverName: resolverName,
          },
        );
      }

      providesLookup[providedKey] = resolverName;
      providesIndex += 1;
    }

    resolverIndex += 1;
  }

  return providesLookup;
};

const buildResolverDependencies = (
  resolverNames: string[],
  resolverLookup: Record<string, ResolverT>,
  providesLookup: Record<string, string>,
  baseVariables: Record<string, unknown>,
): Record<string, string[]> => {
  const dependenciesByResolver: Record<string, string[]> = {};
  let resolverIndex = 0;

  while (resolverIndex < resolverNames.length) {
    const resolverName = resolverNames[resolverIndex];
    const resolverValue = resolverLookup[resolverName];
    const requiresValue = resolverValue.requires;
    const requiresList = Array.isArray(requiresValue) ? requiresValue : [];
    const dependencies: string[] = [];

    let requirementIndex = 0;

    while (requirementIndex < requiresList.length) {
      const requirementKey = requiresList[requirementIndex];
      const isAlreadyAvailable = hasKey(baseVariables, requirementKey);

      if (isAlreadyAvailable) {
        requirementIndex += 1;
        continue;
      }

      const providerResolverName = providesLookup[requirementKey];
      const hasProviderResolverName = typeof providerResolverName === "string";

      if (!hasProviderResolverName) {
        throw createResolverFailureError(
          "Resolver requirement could not be satisfied",
          {
            resolverName,
            requirementKey,
          },
        );
      }

      const dependsOnSelf = providerResolverName === resolverName;
      if (dependsOnSelf) {
        throw createResolverFailureError(
          "Resolver cannot require key it provides",
          {
            resolverName,
            requirementKey,
          },
        );
      }

      const hasDependencyAlready = dependencies.includes(providerResolverName);
      if (!hasDependencyAlready) dependencies.push(providerResolverName);

      requirementIndex += 1;
    }

    dependenciesByResolver[resolverName] = dependencies;
    resolverIndex += 1;
  }

  return dependenciesByResolver;
};

const createResolverOrderIndex = (
  resolverNames: string[],
): Record<string, number> => {
  const orderIndex: Record<string, number> = {};
  let resolverIndex = 0;

  while (resolverIndex < resolverNames.length) {
    const resolverName = resolverNames[resolverIndex];
    orderIndex[resolverName] = resolverIndex;
    resolverIndex += 1;
  }

  return orderIndex;
};

const resolveExecutionOrder = (
  resolverNames: string[],
  dependenciesByResolver: Record<string, string[]>,
): string[] => {
  const incomingCountByResolver: Record<string, number> = {};
  const dependentsByResolver: Record<string, string[]> = {};
  const resolverOrderIndex = createResolverOrderIndex(resolverNames);

  let resolverIndex = 0;

  while (resolverIndex < resolverNames.length) {
    const resolverName = resolverNames[resolverIndex];
    incomingCountByResolver[resolverName] = 0;
    dependentsByResolver[resolverName] = [];
    resolverIndex += 1;
  }

  resolverIndex = 0;

  while (resolverIndex < resolverNames.length) {
    const resolverName = resolverNames[resolverIndex];
    const dependencies = dependenciesByResolver[resolverName] ?? [];
    incomingCountByResolver[resolverName] = dependencies.length;

    let dependencyIndex = 0;
    while (dependencyIndex < dependencies.length) {
      const dependencyName = dependencies[dependencyIndex];
      const dependencyDependents = dependentsByResolver[dependencyName];
      dependencyDependents.push(resolverName);
      dependencyIndex += 1;
    }

    resolverIndex += 1;
  }

  const readyResolvers: string[] = [];
  resolverIndex = 0;

  while (resolverIndex < resolverNames.length) {
    const resolverName = resolverNames[resolverIndex];
    const incomingCount = incomingCountByResolver[resolverName];
    const isReadyResolver = incomingCount === 0;
    if (isReadyResolver) readyResolvers.push(resolverName);
    resolverIndex += 1;
  }

  const orderedResolvers: string[] = [];

  while (readyResolvers.length > 0) {
    readyResolvers.sort((firstName, secondName) => {
      const firstIndex = resolverOrderIndex[firstName];
      const secondIndex = resolverOrderIndex[secondName];
      const indexDifference = firstIndex - secondIndex;
      return indexDifference;
    });

    const nextResolverName = readyResolvers.shift();
    const hasNextResolverName = typeof nextResolverName === "string";
    if (!hasNextResolverName) continue;

    orderedResolvers.push(nextResolverName);
    const dependentResolvers = dependentsByResolver[nextResolverName];
    let dependentIndex = 0;

    while (dependentIndex < dependentResolvers.length) {
      const dependentName = dependentResolvers[dependentIndex];
      const previousCount = incomingCountByResolver[dependentName];
      const nextCount = previousCount - 1;
      incomingCountByResolver[dependentName] = nextCount;

      const becameReady = nextCount === 0;
      if (becameReady) readyResolvers.push(dependentName);

      dependentIndex += 1;
    }
  }

  const orderedAllResolvers = orderedResolvers.length === resolverNames.length;
  if (!orderedAllResolvers) {
    throw createResolverFailureError(
      "Resolver dependency graph contains a cycle",
      {
        resolverNames,
        dependenciesByResolver,
      },
    );
  }

  return orderedResolvers;
};

const validateProvidesShape = (
  resolverName: string,
  outputValue: Record<string, unknown>,
  provides: string[],
): void => {
  const outputKeys = Object.keys(outputValue);

  let providesIndex = 0;
  while (providesIndex < provides.length) {
    const providedKey = provides[providesIndex];
    const hasProvidedKey = hasKey(outputValue, providedKey);
    if (!hasProvidedKey) {
      throw createResolverFailureError("Resolver output missing declared key", {
        resolverName,
        providedKey,
      });
    }

    providesIndex += 1;
  }

  let outputKeyIndex = 0;
  while (outputKeyIndex < outputKeys.length) {
    const outputKey = outputKeys[outputKeyIndex];
    const isDeclaredKey = provides.includes(outputKey);
    if (!isDeclaredKey) {
      throw createResolverFailureError(
        "Resolver output returned undeclared key",
        {
          resolverName,
          outputKey,
        },
      );
    }

    outputKeyIndex += 1;
  }
};

const validateRequirementsBeforeExecution = (
  resolverValue: ResolverT,
  variables: Record<string, unknown>,
): void => {
  const requiresValue = resolverValue.requires;
  const requiresList = Array.isArray(requiresValue) ? requiresValue : [];
  let requirementIndex = 0;

  while (requirementIndex < requiresList.length) {
    const requirementKey = requiresList[requirementIndex];
    const hasRequirementKey = hasKey(variables, requirementKey);
    if (!hasRequirementKey) {
      throw createResolverFailureError(
        "Resolver requirement missing before execution",
        {
          resolverName: resolverValue.name,
          requirementKey,
        },
      );
    }

    requirementIndex += 1;
  }
};

export const runResolvers = async (
  requestedResolverNames: string[],
  resolvers: ResolverT[],
  args: Record<string, string | string[]>,
  baseVariables: Record<string, unknown>,
  currentWorkingDirectory: string,
): Promise<ResolverExecutionResultT> => {
  const resolverNames = getUniqueResolverNames(requestedResolverNames);
  const hasResolvers = resolverNames.length > 0;

  if (!hasResolvers) {
    return {
      variables: baseVariables,
      resolverTrace: [],
    };
  }

  const resolverLookup = createResolverLookup(resolvers);
  const providesLookup = createProvidesLookup(resolverNames, resolverLookup);
  const initialVariables: Record<string, unknown> = { ...baseVariables };
  const dependenciesByResolver = buildResolverDependencies(
    resolverNames,
    resolverLookup,
    providesLookup,
    initialVariables,
  );
  const resolverExecutionOrder = resolveExecutionOrder(
    resolverNames,
    dependenciesByResolver,
  );

  const variables: Record<string, unknown> = { ...initialVariables };
  const resolverTrace: {
    resolverName: string;
    output: Record<string, unknown>;
  }[] = [];

  let resolverIndex = 0;

  while (resolverIndex < resolverExecutionOrder.length) {
    const resolverName = resolverExecutionOrder[resolverIndex];
    const resolverValue = resolverLookup[resolverName];
    validateRequirementsBeforeExecution(resolverValue, variables);

    const resolverContext = {
      args,
      vars: variables,
      cwd: currentWorkingDirectory,
    };
    const resolveResult = await to(
      Promise.resolve(resolverValue.resolve(resolverContext)),
    );
    const resolveError = resolveResult[0];
    const resolveValue = resolveResult[1];
    const hasResolveError = resolveError !== null;

    if (hasResolveError) {
      throw createResolverFailureError("Resolver execution failed", {
        resolverName,
        cause: resolveError.message,
      });
    }

    const isRecordOutput =
      typeof resolveValue === "object" &&
      resolveValue !== null &&
      !Array.isArray(resolveValue);
    if (!isRecordOutput) {
      throw createResolverFailureError("Resolver output must be an object", {
        resolverName,
      });
    }

    const normalizedOutput = resolveValue as Record<string, unknown>;
    validateProvidesShape(
      resolverName,
      normalizedOutput,
      resolverValue.provides,
    );

    const outputKeys = Object.keys(normalizedOutput);
    let outputKeyIndex = 0;

    while (outputKeyIndex < outputKeys.length) {
      const outputKey = outputKeys[outputKeyIndex];
      const keyAlreadyExists = hasKey(variables, outputKey);

      if (keyAlreadyExists) {
        throw createResolverFailureError(
          "Resolver output key collides with existing variable",
          {
            resolverName,
            outputKey,
          },
        );
      }

      const outputValue = normalizedOutput[outputKey];
      variables[outputKey] = outputValue;
      outputKeyIndex += 1;
    }

    resolverTrace.push({
      resolverName,
      output: normalizedOutput,
    });

    resolverIndex += 1;
  }

  return {
    variables,
    resolverTrace,
  };
};
