import * as vitest from "vitest";

import {
  createFilterLookup,
  builtinFilters,
} from "../extensions/builtinFilters";
import { renderTemplateToArgv } from "./renderArgv";

vitest.describe("renderTemplateToArgv", () => {
  vitest.it("renders string and variadic array values into argv slots", () => {
    const variables: Record<string, unknown> = {
      name: "ui",
      rest: ["--watch", "some flag"],
    };
    const filterLookup = createFilterLookup(builtinFilters);

    const renderedArgv = renderTemplateToArgv(
      "pnpm --filter {{name}} run test {{rest}}",
      variables,
      filterLookup,
    );

    vitest
      .expect(renderedArgv)
      .toEqual([
        "pnpm",
        "--filter",
        "ui",
        "run",
        "test",
        "--watch",
        "some flag",
      ]);
  });

  vitest.it("applies filter chain from left to right", () => {
    const variables: Record<string, unknown> = {
      rest: ["A", "B"],
    };
    const filterLookup = createFilterLookup(builtinFilters);

    const renderedArgv = renderTemplateToArgv(
      'echo {{rest | join(" ") | lower}}',
      variables,
      filterLookup,
    );

    vitest.expect(renderedArgv).toEqual(["echo", "a b"]);
  });

  vitest.it("throws when interpolation variable is missing", () => {
    const variables: Record<string, unknown> = {};
    const filterLookup = createFilterLookup(builtinFilters);

    const renderAttempt = (): void => {
      renderTemplateToArgv("echo {{missingValue}}", variables, filterLookup);
      return;
    };

    vitest.expect(renderAttempt).toThrowError();
  });
});
