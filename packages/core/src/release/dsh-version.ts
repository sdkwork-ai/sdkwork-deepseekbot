import { readFileSync } from 'node:fs';

export function installedDshVersion(
  resolve: (specifier: string) => string = (specifier) => import.meta.resolve(specifier),
): string | undefined {
  try {
    const manifest: unknown = JSON.parse(
      readFileSync(new URL('../package.json', resolve('@deepseek-ai/dsh-tools')), 'utf8'),
    );
    const version =
      typeof manifest === 'object' && manifest !== null
        ? (manifest as Record<string, unknown>)['version']
        : undefined;
    return typeof version === 'string' ? version : undefined;
  } catch {
    return undefined;
  }
}
