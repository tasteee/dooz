export const PatternTokenKind = {
  literal: "literal",
  capture: "capture",
  variadic: "variadic",
} as const;

export type PatternTokenKindT =
  (typeof PatternTokenKind)[keyof typeof PatternTokenKind];

export type LiteralPatternTokenT = {
  kind: typeof PatternTokenKind.literal;
  value: string;
  position: number;
};

export type CapturePatternTokenT = {
  kind: typeof PatternTokenKind.capture;
  name: string;
  position: number;
};

export type VariadicPatternTokenT = {
  kind: typeof PatternTokenKind.variadic;
  name: string;
  position: number;
};

export type PatternTokenT =
  | LiteralPatternTokenT
  | CapturePatternTokenT
  | VariadicPatternTokenT;

export type CompiledPatternT = {
  sourcePattern: string;
  tokens: PatternTokenT[];
  specificityVector: number[];
  tokenCount: number;
  hasVariadic: boolean;
};

export type MatchArgumentsT = Record<string, string | string[]>;

export type MatchResultT = {
  argumentsByName: MatchArgumentsT;
};

export type PatternMatchCandidateT = {
  compiledPattern: CompiledPatternT;
  matchResult: MatchResultT;
};

export type CommandDefinitionT = {
  input: string;
  output: string;
  uses?: string[];
  validates?: string[];
  description?: string;
};

export type MaybePromiseT<ValueT> = ValueT | Promise<ValueT>;

export type ResolverContextT = {
  args: Record<string, string | string[]>;
  vars: Record<string, unknown>;
  cwd: string;
};

export type ResolverT = {
  name: string;
  description?: string;
  requires?: string[];
  provides: string[];
  resolve: (
    context: ResolverContextT,
  ) => MaybePromiseT<Record<string, unknown>>;
};

export type ValidatorContextT = {
  args: Record<string, string | string[]>;
  vars: Record<string, unknown>;
  cwd: string;
};

export type ValidatorT = {
  name: string;
  description?: string;
  requires?: string[];
  validate: (context: ValidatorContextT) => MaybePromiseT<boolean>;
};

export type FilterT = {
  name: string;
  apply: (value: unknown, ...argumentsList: string[]) => unknown;
};

export type DoozExtensionsT = {
  resolvers?: ResolverT[];
  validators?: ValidatorT[];
  filters?: FilterT[];
};

export const TemplateSegmentKind = {
  literal: "literal",
  interpolation: "interpolation",
} as const;

export type TemplateSegmentKindT =
  (typeof TemplateSegmentKind)[keyof typeof TemplateSegmentKind];

export type FilterInvocationT = {
  filterName: string;
  filterArguments: string[];
};

export type LiteralTemplateSegmentT = {
  kind: typeof TemplateSegmentKind.literal;
  literalValue: string;
};

export type InterpolationTemplateSegmentT = {
  kind: typeof TemplateSegmentKind.interpolation;
  variableName: string;
  filterInvocations: FilterInvocationT[];
};

export type TemplateSegmentT =
  | LiteralTemplateSegmentT
  | InterpolationTemplateSegmentT;
