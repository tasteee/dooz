import { FilterT } from "../types";

const joinFilter: FilterT = {
  name: "join",
  apply: (value: unknown, ...argumentsList: string[]): unknown => {
    const isArrayValue = Array.isArray(value);
    if (!isArrayValue) return value;

    const separatorCandidate = argumentsList[0];
    const hasSeparator = typeof separatorCandidate === "string";
    if (!hasSeparator) {
      return value.join(",");
    }

    return value.join(separatorCandidate);
  },
};

const lowerFilter: FilterT = {
  name: "lower",
  apply: (value: unknown): unknown => {
    const stringValue = String(value);
    const lowerValue = stringValue.toLowerCase();
    return lowerValue;
  },
};

const upperFilter: FilterT = {
  name: "upper",
  apply: (value: unknown): unknown => {
    const stringValue = String(value);
    const upperValue = stringValue.toUpperCase();
    return upperValue;
  },
};

const jsonFilter: FilterT = {
  name: "json",
  apply: (value: unknown): unknown => {
    const jsonValue = JSON.stringify(value);
    return jsonValue;
  },
};

export const builtinFilters: FilterT[] = [
  joinFilter,
  lowerFilter,
  upperFilter,
  jsonFilter,
];

export const createFilterLookup = (
  filters: FilterT[],
): Record<string, FilterT> => {
  const lookup: Record<string, FilterT> = {};
  let filterIndex = 0;

  while (filterIndex < filters.length) {
    const filterValue = filters[filterIndex];
    lookup[filterValue.name] = filterValue;
    filterIndex += 1;
  }

  return lookup;
};
