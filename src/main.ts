#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync, writeFile } from 'fs';
import { join } from 'path';
import simpleGit from 'simple-git';

export function validateArgs(args: string[]) {
  const repoPath = args?.[0]?.trim() || '';
  const contributorsPath = args?.[1] || 'packages';
  if (repoPath.length === 0) {
    throw new Error('No repo path provided');
  }
  if (!existsSync(repoPath)) {
    throw new Error(
      'Repo path does not exist, or it was not provided as an absolute path'
    );
  }
  if (!existsSync(join(repoPath, contributorsPath))) {
    throw new Error(
      'Contributors path does not exist, or it was not provided as an absolute path'
    );
  }
  return { repoPath, contributorsPath };
}

export async function countMultiProjectContributors(
  repoPath: string,
  contributorsPath: string
) {
  //assuming recursion is not needed here
  const subFolders = readdirSync(join(repoPath, contributorsPath)).filter((x) =>
    statSync(join(repoPath, contributorsPath, x)).isDirectory()
  );
  const contributors = new Map<string, number>();
  for (const subFolder of subFolders) {
    const logs = await simpleGit(
      join(repoPath, contributorsPath, subFolder)
    ).log();
    for (const log of logs.all) {
      contributors.set(
        log.author_name,
        (contributors.get(log.author_name) || 0) + 1
      );
    }
  }
  return Array.from(contributors.entries()).filter(([, count]) => count > 1);
}

export async function updateReadMe(
  repoPath: string,
  contributors: [string, number][]
) {
  const readmePath = join(repoPath, 'README.md');
  let readme = readFileSync(readmePath, 'utf-8');
  const content = `<!-- contributors:start -->\n${contributors
    .map(([name, count]) => `- ${name} (${count})`)
    .join('\n')}\nTotal: ${contributors.length}\n<!-- contributors:end -->`;
  if (!readme.includes('<!-- contributors:start -->')) {
    readme += `\n\n${content}`;
  } else {
    readme = readme.replace(
      /<!-- contributors:start -->([\s\S]*)<!-- contributors:end -->/,
      content
    );
  }
  writeFile(readmePath, readme, 'utf-8', (err) => {
    if (err) {
      console.error(err);
    }
  });
}

export async function main() {
  try {
    const args = process.argv.slice(2);
    const { repoPath, contributorsPath } = validateArgs(args);
    const contributors = await countMultiProjectContributors(
      repoPath,
      contributorsPath
    );
    await updateReadMe(repoPath, contributors);
    console.debug('SUCCESS! :)');
  } catch (e) {
    console.error(e);
  }
}

main();
