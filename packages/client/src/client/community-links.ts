export const COMMUNITY = {
  qqGroup: '1125565676',
  discord: 'https://discord.gg/aEB2Ayhu7B',
  github: 'https://github.com/BotHarness/DeepSeekBot',
} as const;

export function formatStars(count: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
      count,
    );
  } catch {
    return String(count);
  }
}
