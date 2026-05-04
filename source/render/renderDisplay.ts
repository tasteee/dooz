const needsShellQuoting = (value: string): boolean => {
  const hasWhitespace = /\s/.test(value);
  if (hasWhitespace) return true;

  const hasQuote = value.includes('"');
  if (hasQuote) return true;

  const hasSingleQuote = value.includes("'");
  if (hasSingleQuote) return true;

  return false;
};

const quoteForDisplay = (value: string): string => {
  const shouldQuote = needsShellQuoting(value);
  if (!shouldQuote) return value;

  const escapedValue = value.replace(/"/g, '\\"');
  const quotedValue = `"${escapedValue}"`;
  return quotedValue;
};

export const renderDisplayCommand = (argv: string[]): string => {
  const renderedSegments: string[] = [];
  let argumentIndex = 0;

  while (argumentIndex < argv.length) {
    const argumentValue = argv[argumentIndex];
    const displayValue = quoteForDisplay(argumentValue);
    renderedSegments.push(displayValue);
    argumentIndex += 1;
  }

  const displayCommand = renderedSegments.join(" ");
  return displayCommand;
};
