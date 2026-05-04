import * as vitest from "vitest";

import { ValidatorT } from "../types";
import { runValidators } from "./validatorEngine";

vitest.describe("runValidators", () => {
  vitest.it("runs validators and returns execution trace", async () => {
    const packageExistsValidator: ValidatorT = {
      name: "packageExists",
      validate: async (): Promise<boolean> => {
        return true;
      },
    };

    const args: Record<string, string | string[]> = {
      name: "ui",
    };
    const variables: Record<string, unknown> = {
      name: "ui",
    };

    const validatorTrace = await runValidators(
      ["packageExists"],
      [packageExistsValidator],
      args,
      variables,
      process.cwd(),
    );

    vitest.expect(validatorTrace).toEqual(["packageExists"]);
  });

  vitest.it("throws when validator returns false", async () => {
    const packageExistsValidator: ValidatorT = {
      name: "packageExists",
      description: "Package does not exist",
      validate: async (): Promise<boolean> => {
        return false;
      },
    };

    const runAttempt = runValidators(
      ["packageExists"],
      [packageExistsValidator],
      {},
      {},
      process.cwd(),
    );

    await vitest.expect(runAttempt).rejects.toThrowError();
  });

  vitest.it("throws when requested validator does not exist", async () => {
    const runAttempt = runValidators(
      ["missingValidator"],
      [],
      {},
      {},
      process.cwd(),
    );

    await vitest.expect(runAttempt).rejects.toThrowError();
  });
});
