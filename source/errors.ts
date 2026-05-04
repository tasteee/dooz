export const DoozErrorKind = {
  configParse: "config-parse-error",
  configSchema: "config-schema-error",
  noMatch: "no-match-error",
  ambiguousMatch: "ambiguous-match-error",
  missingVariable: "missing-variable-error",
  resolverFailure: "resolver-failure-error",
  validatorFailure: "validator-failure-error",
  filterFailure: "filter-failure-error",
  executionFailure: "execution-failure-error",
  patternParse: "pattern-parse-error",
} as const;

export type DoozErrorKindT = (typeof DoozErrorKind)[keyof typeof DoozErrorKind];

export type ErrorDetailsT = Record<string, unknown>;

export type DoozErrorT = Error & {
  kind: DoozErrorKindT;
  details?: ErrorDetailsT;
};

export const createDoozError = (
  kind: DoozErrorKindT,
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  const doozError = new Error(message) as DoozErrorT;
  doozError.name = "DoozError";
  doozError.kind = kind;

  const hasDetails = typeof details !== "undefined";
  if (hasDetails) doozError.details = details;

  return doozError;
};

export const createPatternParseError = (
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  return createDoozError(DoozErrorKind.patternParse, message, details);
};

export const createConfigParseError = (
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  return createDoozError(DoozErrorKind.configParse, message, details);
};

export const createConfigSchemaError = (
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  return createDoozError(DoozErrorKind.configSchema, message, details);
};

export const createNoMatchError = (
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  return createDoozError(DoozErrorKind.noMatch, message, details);
};

export const createAmbiguousMatchError = (
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  return createDoozError(DoozErrorKind.ambiguousMatch, message, details);
};

export const createMissingVariableError = (
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  return createDoozError(DoozErrorKind.missingVariable, message, details);
};

export const createFilterFailureError = (
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  return createDoozError(DoozErrorKind.filterFailure, message, details);
};

export const createExecutionFailureError = (
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  return createDoozError(DoozErrorKind.executionFailure, message, details);
};

export const createResolverFailureError = (
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  return createDoozError(DoozErrorKind.resolverFailure, message, details);
};

export const createValidatorFailureError = (
  message: string,
  details?: ErrorDetailsT,
): DoozErrorT => {
  return createDoozError(DoozErrorKind.validatorFailure, message, details);
};
