import type { BotModePrefsSnapshot } from './bot-mode-prefs.js';

interface SessionListRow {
  origin?: string;
  blank?: boolean;
  retainedBy?: Readonly<Record<string, number | undefined>>;
}

export interface SessionListSnapshot {
  ids: readonly string[];
  byId: Readonly<Record<string, SessionListRow | undefined>>;
}

export interface WorkspaceListSnapshot {
  items: readonly {
    workspaceId: string;
    sessionIds: readonly string[];
    /** Host directory the Workspace points at; absent on older catalog snapshots. */
    path?: string;
  }[];
  archivedSessionIds?: readonly string[];
}

export const APPROVAL_REVIEW_SESSION_PREFIX = 'approval-review-';

/**
 * Folders DeepSeekBot owns inside DSH's home: the scratch Workspace registered
 * for an Assistant, the Approval Review working copy, and each Bot's memory
 * repository. Registering them as Workspaces is how folder access is granted,
 * but they are implementation detail rather than one of the Human's projects,
 * so the native Workspace list must never list them or their Sessions.
 */
const BOT_WORKSPACE_PATH =
  /(?:^|[\\/])botharness[\\/](?:tob-workspaces|approval-reviews|bots[\\/][^\\/]+[\\/]memory)(?:[\\/]|$)/iu;

export function isBotWorkspacePath(path: string): boolean {
  return BOT_WORKSPACE_PATH.test(path);
}

interface Observable<T> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): T;
}

export interface BotSessionVisibilityOptions {
  sessions: Observable<SessionListSnapshot>;
  workspaces: Observable<WorkspaceListSnapshot | undefined>;
  prefs: Observable<Pick<BotModePrefsSnapshot, 'showBotSessions' | 'showApprovalReviewSessions'>>;
  loadBotSessionIds: () => Promise<readonly string[]>;
  warn?: (message: string, error: unknown) => void;
}

export interface BotSessionVisibility {
  hidden(): { sessionIds: string[]; groupKeys: string[] };
  refresh(): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

const REFRESH_DELAY_MS = 150;
export function createBotSessionVisibility(
  options: BotSessionVisibilityOptions,
): BotSessionVisibility {
  const { sessions, workspaces, prefs } = options;
  const listeners = new Set<() => void>();
  let botIds = new Set<string>();
  const classified = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let loading = false;
  let reloadAfter = false;
  let disposed = false;

  const emit = (): void => {
    for (const listener of [...listeners]) listener();
  };
  const load = async (): Promise<void> => {
    if (loading) {
      reloadAfter = true;
      return;
    }
    loading = true;
    const seen = sessions.getSnapshot().ids;
    try {
      const ids = await options.loadBotSessionIds();
      if (disposed) return;
      botIds = new Set(ids);
      for (const id of seen) classified.add(id);
      emit();
    } catch (error) {
      options.warn?.('botharness: failed to load Bot Session ids', error);
    } finally {
      loading = false;
      if (reloadAfter && !disposed) {
        reloadAfter = false;
        void load();
      }
    }
  };
  const onSessions = (): void => {
    if (timer !== undefined || disposed) return;
    if (sessions.getSnapshot().ids.every((id) => classified.has(id))) return;
    timer = setTimeout(() => {
      timer = undefined;
      void load();
    }, REFRESH_DELAY_MS);
  };
  const unsubscribers = [
    sessions.subscribe(() => {
      onSessions();
      emit();
    }),
    workspaces.subscribe(emit),
    prefs.subscribe(emit),
  ];
  void load();

  return {
    refresh() {
      if (!disposed) void load();
    },
    hidden() {
      const { showBotSessions, showApprovalReviewSessions } = prefs.getSnapshot();
      const list = sessions.getSnapshot();
      const workspace = workspaces.getSnapshot();
      const botWorkspaces = (workspace?.items ?? []).filter(
        (item) => item.path !== undefined && isBotWorkspacePath(item.path),
      );
      const hiddenIds = new Set<string>();
      if (!showBotSessions || !showApprovalReviewSessions) {
        for (const id of list.ids) {
          if (
            ((!showBotSessions && botIds.has(id)) ||
              (!showApprovalReviewSessions && id.startsWith(APPROVAL_REVIEW_SESSION_PREFIX))) &&
            (list.byId[id]?.retainedBy?.['mainView'] ?? 0) === 0
          ) {
            hiddenIds.add(id);
          }
        }
      }
      for (const item of botWorkspaces) for (const id of item.sessionIds) hiddenIds.add(id);
      if (hiddenIds.size === 0 && botWorkspaces.length === 0)
        return { sessionIds: [], groupKeys: [] };
      const archived = new Set(workspace?.archivedSessionIds ?? []);
      const listed = (id: string): boolean => {
        const row = list.byId[id];
        return row !== undefined && row.origin !== 'subagent' && row.blank !== true;
      };
      const groups = new Map<string, string[]>();
      const grouped = new Set<string>();
      for (const item of workspace?.items ?? []) {
        for (const id of item.sessionIds) grouped.add(id);
        groups.set(item.workspaceId, item.sessionIds.filter(listed));
      }
      groups.set(
        '',
        list.ids.filter((id) => !grouped.has(id) && listed(id)),
      );
      const groupKeys = [...groups]
        .filter(([, members]) => {
          const shown = members.filter((id) => !archived.has(id));
          return shown.length > 0 && shown.every((id) => hiddenIds.has(id));
        })
        .map(([key]) => key);
      for (const item of botWorkspaces) {
        if (!groupKeys.includes(item.workspaceId)) groupKeys.push(item.workspaceId);
      }
      return { sessionIds: [...hiddenIds], groupKeys };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      for (const unsubscribe of unsubscribers) unsubscribe();
      listeners.clear();
    },
  };
}

function attributeValue(value: string): string {
  return JSON.stringify(value);
}
export function botSessionVisibilityCss(hidden: {
  sessionIds: readonly string[];
  groupKeys: readonly string[];
}): string {
  const selectors = [
    ...hidden.sessionIds.map((id) => `[data-row-key=${attributeValue(`session:${id}`)}]`),
    ...hidden.groupKeys.flatMap((key) => [
      `[data-row-key=${attributeValue(`workspace:${key}`)}]`,
      `[data-row-key=${attributeValue(`overflow:${key}`)}]`,
    ]),
  ];
  return selectors.length === 0
    ? ''
    : `${selectors.join(',\n')} {\n  display: none !important;\n}\n`;
}
export function mountBotSessionVisibility(
  visibility: BotSessionVisibility,
  doc: Document | undefined = typeof document === 'undefined' ? undefined : document,
): () => void {
  if (doc === undefined) return () => {};
  const style = doc.createElement('style');
  style.dataset['botharnessBotSessions'] = '';
  doc.head.appendChild(style);
  const apply = (): void => {
    const css = botSessionVisibilityCss(visibility.hidden());
    if (style.textContent !== css) style.textContent = css;
  };
  const unsubscribe = visibility.subscribe(apply);
  apply();
  return () => {
    unsubscribe();
    style.remove();
  };
}
