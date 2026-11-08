import type { RosterBot, RosterView } from '../../host/client';
import { t } from '../strings';

export function botName(bot: Pick<RosterBot, 'displayName' | 'tobDefaultName'>): string {
  return bot.tobDefaultName === true ? t.stewardName : bot.displayName;
}

export function rosterBotName(roster: RosterView | undefined, slug: string | undefined): string | undefined {
  const bot = slug === undefined ? undefined : roster?.bots.find((entry) => entry.slug === slug);
  return bot === undefined ? undefined : botName(bot);
}
