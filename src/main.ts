#!/usr/bin/env node
import { promises } from 'fs';
import { gitlogPromise } from 'gitlog';
import { join } from 'path';

const { readFile, writeFile, access } = promises;

export async function validateArgs(args: string[]) {
  const repoPath = args?.[0]?.trim() || '';
  const contributorsPath = args?.[1] || 'packages';
  if (repoPath.length === 0) {
    throw new Error('No repo path provided');
  }
  try {
    await access(repoPath);
    await access(join(repoPath, contributorsPath));
  } catch (error) {
    throw new Error(
      `Path does not exist, or it was not provided as an absolute path: ${error.message}`
    );
  }
  return { repoPath, contributorsPath };
}

export async function countProjectContributors(
  repoPath: string,
  contributorsPath: string
) {
  const contributors = new Map<string, Set<string>>();
  const logs = await gitlogPromise({
    repo: join(repoPath),
    fields: ['authorName'],
    number: 200, // max number of logs
  });
  const filteredLogs = logs.filter((x) =>
    x.files.find((y) => y.includes(contributorsPath))
  );
  for (const log of filteredLogs) {
    const { authorName, files } = log;
    const folders = contributors.get(authorName) || new Set<string>();
    files
      .filter((x) => x.includes(contributorsPath))
      //assuming that the path is packages/<folder-name>/...
      .forEach((file) => folders.add(file.split('/')?.[1]));
    contributors.set(authorName, folders);
  }
  return contributors;
}

export async function updateReadMe(
  repoPath: string,
  contributors: Map<string, Set<string>>
) {
  const readmePath = join(repoPath, 'README.md');
  let readme: string;
  try {
    readme = await readFile(readmePath, 'utf-8');
  } catch (error) {
    readme = '';
  }
  const multiProjectContributors = Array.from(contributors.entries())
    .filter(([, folders]) => folders.size > 1)
    .map(([author, folders]) => [author, folders.size]);
  const content = `<!-- contributors:start -->\n${multiProjectContributors
    .map(([name, count]) => `- ${name} (${count} commits)`)
    .join('\n')}\nTotal Multi Contributors: ${
    multiProjectContributors.length
  }\nTotal Contributors: ${contributors.size}\n<!-- contributors:end -->`;
  if (!readme.includes('<!-- contributors:start -->')) {
    readme += `\n\n${content}`;
  } else {
    readme = readme.replace(
      /<!-- contributors:start -->([\s\S]*)<!-- contributors:end -->/,
      content
    );
  }
  await writeFile(readmePath, readme);
}

export async function main() {
  try {
    const args = process.argv.slice(2);
    const { repoPath, contributorsPath } = await validateArgs(args);
    const contributors = await countProjectContributors(
      repoPath,
      contributorsPath
    );
    await updateReadMe(repoPath, contributors);
    console.debug('SUCCESS! :)');
  } catch (e) {
    console.error('ERROR! :(');
  }
}

main();
