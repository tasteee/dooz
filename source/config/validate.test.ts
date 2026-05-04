import * as vitest from "vitest";

import { FilterT, ResolverT, ValidatorT } from "../types";
import { validateLoadedConfig } from "./validate";

vitest.describe("validateLoadedConfig", () => {
  vitest.it("returns compiled commands for valid references", () => {
    const commands = [
      {
        input: "test <name> [...rest]",
        output: "pnpm --filter {{name}} {{kind}} test {{rest}}",
        uses: ["packageKind"],
        validates: ["packageExists"],
      },
    ];

    const resolvers: ResolverT[] = [
      {
        name: "packageKind",
        provides: ["kind"],
        resolve: async (): Promise<Record<string, unknown>> => {
          return { kind: "run" };
        },
      },
    ];

    const validators: ValidatorT[] = [
      {
        name: "packageExists",
        validate: async (): Promise<boolean> => {
          return true;
        },
      },
    ];

    const filters: FilterT[] = [
      {
        name: "lower",
        apply: (value: unknown): unknown => {
          const stringValue = String(value);
          return stringValue.toLowerCase();
        },
      },
    ];

    const validatedCommands = validateLoadedConfig(
      commands,
      resolvers,
      validators,
      filters,
    );

    vitest.expect(validatedCommands).toHaveLength(1);
    vitest
      .expect(validatedCommands[0]?.compiledPattern.sourcePattern)
      .toBe("test <name> [...rest]");
  });

  vitest.it("throws for unknown filter references", () => {
    const commands = [
      {
        input: "test <name>",
        output: "echo {{name | unknownFilter}}",
      },
    ];

    const validateAttempt = (): void => {
      validateLoadedConfig(commands, [], [], []);
      return;
    };

    vitest.expect(validateAttempt).toThrowError();
  });

  vitest.it("throws for guaranteed ambiguous command patterns", () => {
    const commands = [
      {
        input: "task <name>",
        output: "echo {{name}}",
      },
      {
        input: "task <target>",
        output: "echo {{target}}",
      },
    ];

    const validateAttempt = (): void => {
      validateLoadedConfig(commands, [], [], []);
      return;
    };

    vitest.expect(validateAttempt).toThrowError();
  });
});
