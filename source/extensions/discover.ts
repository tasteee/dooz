import { promises as fileSystem } from "node:fs";
import path from "node:path";

import { to } from "await-to-js";

const extensionCandidateNames = [
  "dooz.ts",
  "dooz.js",
  path.join(".dooz", "dooz.ts"),
  path.join(".dooz", "dooz.js"),
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

export const discoverExtensionPath = async (
  currentWorkingDirectory: string,
): Promise<string | null> => {
  const gitRootDirectory = await findGitRootDirectory(currentWorkingDirectory);
  let currentDirectory = path.resolve(currentWorkingDirectory);

  while (true) {
    let candidateIndex = 0;

    while (candidateIndex < extensionCandidateNames.length) {
      const candidateName = extensionCandidateNames[candidateIndex];
      const candidatePath = path.join(currentDirectory, candidateName);
      const candidateExists = await fileExists(candidatePath);

      if (candidateExists) return candidatePath;

      candidateIndex += 1;
    }

    const reachedGitRoot =
      gitRootDirectory !== null && currentDirectory === gitRootDirectory;
    if (reachedGitRoot) break;

    const parentDirectory = path.dirname(currentDirectory);
    const reachedFileSystemRoot = parentDirectory === currentDirectory;
    if (reachedFileSystemRoot) break;

    currentDirectory = parentDirectory;
  }

  return null;
};
