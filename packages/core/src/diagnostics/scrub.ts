import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const MAX_TEXT = 300;
const USER_DIRECTORY = /(?:\/(?:Users|home)\/|[A-Za-z]:\\+Users\\+)[^/\\:)\s]+/gu;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

export function scrubHomePaths(text: string, home: string = homedir()): string {
  let result = text;
  const trimmed = home.replace(/[\\/]+$/u, '');
  if (trimmed.length > 1) {
    const variants = new Set([
      trimmed,
      trimmed.replace(/\\/gu, '/'),
      pathToFileURL(trimmed).pathname,
      encodeURI(trimmed.replace(/\\/gu, '/')),
    ]);
    for (const variant of [...variants].sort((left, right) => right.length - left.length)) {
      result = result.replace(new RegExp(escapeRegExp(variant), 'gu'), '~');
    }
  }
  return result.replace(USER_DIRECTORY, '~').slice(0, MAX_TEXT);
}
