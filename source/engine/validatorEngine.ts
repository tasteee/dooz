import { to } from "await-to-js";

import { createValidatorFailureError } from "../errors";
import { ValidatorT } from "../types";

const hasKey = (recordValue: Record<string, unknown>, key: string): boolean => {
  const hasProperty = Object.prototype.hasOwnProperty.call(recordValue, key);
  return hasProperty;
};

const createValidatorLookup = (
  validators: ValidatorT[],
): Record<string, ValidatorT> => {
  const lookup: Record<string, ValidatorT> = {};
  let validatorIndex = 0;

  while (validatorIndex < validators.length) {
    const validatorValue = validators[validatorIndex];
    lookup[validatorValue.name] = validatorValue;
    validatorIndex += 1;
  }

  return lookup;
};

const validateRequirementsBeforeExecution = (
  validatorValue: ValidatorT,
  variables: Record<string, unknown>,
): void => {
  const requiresValue = validatorValue.requires;
  const requiresList = Array.isArray(requiresValue) ? requiresValue : [];
  let requirementIndex = 0;

  while (requirementIndex < requiresList.length) {
    const requirementKey = requiresList[requirementIndex];
    const hasRequirementKey = hasKey(variables, requirementKey);
    if (!hasRequirementKey) {
      throw createValidatorFailureError(
        "Validator requirement missing before execution",
        {
          validatorName: validatorValue.name,
          requirementKey,
        },
      );
    }

    requirementIndex += 1;
  }
};

export const runValidators = async (
  requestedValidatorNames: string[],
  validators: ValidatorT[],
  args: Record<string, string | string[]>,
  variables: Record<string, unknown>,
  currentWorkingDirectory: string,
): Promise<string[]> => {
  const validatorLookup = createValidatorLookup(validators);
  const validatorTrace: string[] = [];

  let validatorIndex = 0;

  while (validatorIndex < requestedValidatorNames.length) {
    const validatorName = requestedValidatorNames[validatorIndex];
    const validatorValue = validatorLookup[validatorName];
    const hasValidatorValue = typeof validatorValue !== "undefined";

    if (!hasValidatorValue) {
      throw createValidatorFailureError("Referenced validator was not found", {
        validatorName,
      });
    }

    validateRequirementsBeforeExecution(validatorValue, variables);

    const validatorContext = {
      args,
      vars: variables,
      cwd: currentWorkingDirectory,
    };
    const validationResult = await to(
      Promise.resolve(validatorValue.validate(validatorContext)),
    );
    const validationError = validationResult[0];
    const validationValue = validationResult[1];
    const hasValidationError = validationError !== null;

    if (hasValidationError) {
      throw createValidatorFailureError("Validator execution failed", {
        validatorName,
        cause: validationError.message,
      });
    }

    const passedValidation = validationValue === true;
    if (!passedValidation) {
      const failureMessageCandidate = validatorValue.description;
      const hasFailureMessage =
        typeof failureMessageCandidate === "string" &&
        failureMessageCandidate.length > 0;

      const failureMessage = hasFailureMessage
        ? failureMessageCandidate
        : "Validator returned false";

      throw createValidatorFailureError(failureMessage, {
        validatorName,
      });
    }

    validatorTrace.push(validatorName);
    validatorIndex += 1;
  }

  return validatorTrace;
};
