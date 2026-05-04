import { promises as fileSystem } from "node:fs";
import path from "node:path";

import { to } from "await-to-js";

import { createConfigParseError } from "../errors";

const configCandidateNames = [
  "dooz.yaml",
  "dooz.yml",
  path.join(".dooz", "dooz.yaml"),
  path.join(".dooz", "dooz.yml"),
];

const fileExists = async (targetPath: string): Promise<boolean> => {
  const accessResult = await to(fileSystem.access(targetPath));
  const accessError = accessResult[0];
  const hasAccessError = accessError !== null;
  if (hasAccessError) return false;
  return true;
};

const findGitRootDirectory = async (
  startDirectory: string,
): Promise<string | null> => {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    const gitPath = path.join(currentDirectory, ".git");
    const hasGitPath = await fileExists(gitPath);
    if (hasGitPath) return currentDirectory;

    const parentDirectory = path.dirname(currentDirectory);
    const reachedFileSystemRoot = parentDirectory === currentDirectory;
    if (reachedFileSystemRoot) return null;

    currentDirectory = parentDirectory;
  }
};

const resolveOverridePath = (
  currentWorkingDirectory: string,
  overrideConfigPath: string,
): string => {
  const isAbsolutePath = path.isAbsolute(overrideConfigPath);
  if (isAbsolutePath) return overrideConfigPath;

  const resolvedPath = path.resolve(
    currentWorkingDirectory,
    overrideConfigPath,
  );
  return resolvedPath;
};

export const discoverConfigPath = async (
  currentWorkingDirectory: string,
  overrideConfigPath?: string,
): Promise<string> => {
  const hasOverrideConfigPath = typeof overrideConfigPath === "string";
  if (hasOverrideConfigPath) {
    const resolvedOverridePath = resolveOverridePath(
      currentWorkingDirectory,
      overrideConfigPath,
    );
    const overridePathExists = await fileExists(resolvedOverridePath);

    if (!overridePathExists) {
      throw createConfigParseError("Config path from --config was not found", {
        overrideConfigPath,
        resolvedOverridePath,
      });
    }

    return resolvedOverridePath;
  }

  const gitRootDirectory = await findGitRootDirectory(currentWorkingDirectory);
  let currentDirectory = path.resolve(currentWorkingDirectory);

  while (true) {
    let candidateIndex = 0;

    while (candidateIndex < configCandidateNames.length) {
      const candidateName = configCandidateNames[candidateIndex];
      const candidatePath = path.join(currentDirectory, candidateName);
      const candidateExists = await fileExists(candidatePath);

      if (candidateExists) return candidatePath;

      candidateIndex += 1;
    }

    const reachedGitRoot =
      gitRootDirectory !== null && currentDirectory === gitRootDirectory;
    if (reachedGitRoot) {
      break;
    }

    const parentDirectory = path.dirname(currentDirectory);
    const reachedFileSystemRoot = parentDirectory === currentDirectory;
    if (reachedFileSystemRoot) break;

    currentDirectory = parentDirectory;
  }

  throw createConfigParseError(
    "No dooz config file found in discovery search",
    {
      currentWorkingDirectory,
    },
  );
};
