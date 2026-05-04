import * as vitest from "vitest";

import { ResolverT } from "../types";
import { runResolvers } from "./resolverEngine";

vitest.describe("runResolvers", () => {
  vitest.it("reorders resolvers by dependency requirements", async () => {
    const packageKindResolver: ResolverT = {
      name: "packageKind",
      provides: ["kind"],
      resolve: async (): Promise<Record<string, unknown>> => {
        return { kind: "run" };
      },
    };

    const testScopeResolver: ResolverT = {
      name: "testScope",
      requires: ["kind"],
      provides: ["scope"],
      resolve: async (): Promise<Record<string, unknown>> => {
        return { scope: "integration" };
      },
    };

    const args: Record<string, string | string[]> = {
      name: "ui",
    };
    const baseVariables: Record<string, unknown> = {
      name: "ui",
    };

    const resolverExecutionResult = await runResolvers(
      ["testScope", "packageKind"],
      [packageKindResolver, testScopeResolver],
      args,
      baseVariables,
      process.cwd(),
    );

    vitest.expect(resolverExecutionResult.variables.kind).toBe("run");
    vitest.expect(resolverExecutionResult.variables.scope).toBe("integration");
    vitest
      .expect(resolverExecutionResult.resolverTrace[0]?.resolverName)
      .toBe("packageKind");
    vitest
      .expect(resolverExecutionResult.resolverTrace[1]?.resolverName)
      .toBe("testScope");
  });

  vitest.it("throws when requested resolver does not exist", async () => {
    const args: Record<string, string | string[]> = {};
    const baseVariables: Record<string, unknown> = {};

    const runAttempt = runResolvers(
      ["missingResolver"],
      [],
      args,
      baseVariables,
      process.cwd(),
    );

    await vitest.expect(runAttempt).rejects.toThrowError();
  });

  vitest.it("throws on output key collisions", async () => {
    const packageKindResolver: ResolverT = {
      name: "packageKind",
      provides: ["name"],
      resolve: async (): Promise<Record<string, unknown>> => {
        return { name: "collision" };
      },
    };

    const args: Record<string, string | string[]> = {
      name: "ui",
    };
    const baseVariables: Record<string, unknown> = {
      name: "ui",
    };

    const runAttempt = runResolvers(
      ["packageKind"],
      [packageKindResolver],
      args,
      baseVariables,
      process.cwd(),
    );

    await vitest.expect(runAttempt).rejects.toThrowError();
  });
});
