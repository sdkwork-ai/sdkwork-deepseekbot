import type { ReactElement } from 'react';
import { shallowEqual } from '@deepseek-ai/dsh-client-store';

import { ActivityInboxHeader } from './activity-inbox-menu.js';
import type { BridgeActions } from './actions.js';
import { ActivityCenterView } from './activity-center-view.js';
import {
  ACTIVITY_CENTER_PANEL,
  type DockPanel,
  type DockPanelProps,
  type DockPanelRegistry,
} from './dock-panels.js';
import type { BotHarnessTranslate } from './locale.js';
import type { ClientState } from './store.js';
import { useClientStore } from './use-client-store.js';

export type ActivityCenterPanel = DockPanel & {
  readonly tabBadge: (props: DockPanelProps) => ReactElement | null;
};

const selectAttention = (state: ClientState) => ({
  unread: state.activityList.unreadCount,
  action: state.activityList.hasAction,
});

function ActivityTabBadge(): ReactElement | null {
  const attention = useClientStore(selectAttention, shallowEqual);
  if (attention.unread === 0 && !attention.action) return null;
  return <span className="bh-dock-tab-dot" data-dock-tab-dot="" aria-hidden="true" />;
}

export function createActivityCenterPanel(
  actions: BridgeActions,
  t: BotHarnessTranslate,
  registry?: DockPanelRegistry,
): ActivityCenterPanel {
  return {
    id: ACTIVITY_CENTER_PANEL,
    title: t('activityCenter.title'),
    icon: 'bell',
    scope: 'global',
    order: -100,
    defaultPosition: { zone: 'right' },
    headerAction: () => <ActivityInboxHeader actions={actions} t={t} />,
    tabBadge: ActivityTabBadge,
    component: () => (
      <ActivityCenterView actions={actions} t={t} placement="panel" registry={registry} />
    ),
  };
}
