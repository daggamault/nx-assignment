#!/usr/bin/env node
import { promises } from 'fs';
import { gitlogPromise } from 'gitlog';
import { join } from 'path';

const { readFile, writeFile, access } = promises;

interface Group {
  name: string;
  folders: string[];
}

export async function validateArgs(args: string[]) {
  const repoPath = args?.[0]?.trim() || '';
  const contributorsPath = args?.[1] || 'packages';
  const maxEntries = args?.[2] || 200;
  const groupsJsonFile = args?.[3] || './src/groups.json';
  const file = await readFile(groupsJsonFile, 'utf-8');
  const groups: Group[] = file ? JSON.parse(file) : [];
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
  return { repoPath, contributorsPath, maxEntries, groups };
}

export async function countProjectContributors(
  repoPath: string,
  contributorsPath: string,
  maxEntries: number,
  groups: Group[]
) {
  const contributors = new Map<string, Set<string>>();
  console.warn(maxEntries, groups);
  const logs = await gitlogPromise({
    repo: join(repoPath),
    fields: ['authorName'],
    number: maxEntries, // max number of logs
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
      .forEach((file) => {
        const folder = file.split('/')?.[1];
        const group = groups.find((x) => x.folders.includes(folder));
        folders.add(group?.name);
      });
    contributors.set(authorName, folders);
    console.warn(contributors);
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
    const { repoPath, contributorsPath, maxEntries, groups } =
      await validateArgs(args);
    const contributors = await countProjectContributors(
      repoPath,
      contributorsPath,
      +maxEntries,
      groups
    );
    await updateReadMe(repoPath, contributors);
    console.debug('SUCCESS! :)');
  } catch (e) {
    console.warn(e);
    console.error('ERROR! :(', e.message);
  }
}

main();
