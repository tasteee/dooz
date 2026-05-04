import { to } from "await-to-js";

import { runCli } from "./cli/run";

const runProgram = async (): Promise<void> => {
  const rawArguments = process.argv.slice(2);
  const currentWorkingDirectory = process.cwd();

  const runResult = await to(
    runCli(rawArguments, currentWorkingDirectory, process.stdout),
  );
  const runError = runResult[0];
  const runValue = runResult[1];
  const hasRunError = runError !== null;

  if (hasRunError) {
    const errorMessage = runError.message;
    process.stderr.write(`${errorMessage}\n`);
    process.exitCode = 1;
    return;
  }

  const hasRunValue = typeof runValue === "number";
  if (!hasRunValue) {
    process.exitCode = 1;
    return;
  }

  process.exitCode = runValue;
};

void runProgram();
