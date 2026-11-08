/**
 * The composer's model control, in the shape the conversation surface uses in
 * this shell: a chip that names the model (and its reasoning level) and opens a
 * two-level menu — "模型" and "推理等级" — whose rows apply the choice
 * immediately. The model list carries the same capabilities as the shell's
 * conversation model menu: a search box, one section per provider, the current
 * model's check mark and the "sign in required" badge the provider catalog
 * advertises for models whose credential is missing. The full model editor
 * (presets, assignment model) stays on the bot's profile entry and in the model
 * command; the composer's chip is the quick switch.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as stylex from '@stylexjs/stylex';

import { ChipButton } from './ds/chip-button.js';
import { ChannelSidebarIcon } from './channel-sidebar-icon.js';
import { botEffortChoices, botModelMenuGroups, type BotModelGroup } from './bot-model-route.js';
import type { BotHarnessTranslate } from './locale.js';
import type { ModelCatalogView, ModelRouteView } from './bridge.js';
import { border, color, radius, size, space, text } from './ds/tokens.stylex.js';

export interface ComposerModelMenuProps {
  /** Chip text: the model's display name, plus the reasoning level when set. */
  label: string;
  /** Accessible name for the chip, matching the shell's model seat wording. */
  ariaLabel: string;
  /** The route in use, for the menu's current rows and the effort list. */
  current: ModelRouteView | undefined;
  /** The models this bot may use. */
  catalog: ModelCatalogView | undefined;
  /** Label of the provider-default reasoning level. */
  defaultEffortLabel: string;
  /** The chip and its rows stop accepting input while a switch is in flight. */
  disabled: boolean;
  /** Apply a picked route now (the caller owns the busy/error state). */
  onPick(route: ModelRouteView): void;
  /** Dictionary lookup for the row labels. */
  t: BotHarnessTranslate;
}

type Pane = 'root' | 'model' | 'effort';

interface Anchor {
  left: number;
  bottom: number;
}

interface ProviderSection {
  provider: string;
  name: string;
  rows: BotModelGroup[];
}

/** Open above the chip, the way the composer's model menu opens in the shell. */
function anchorOf(trigger: HTMLElement | null): Anchor | undefined {
  if (trigger === null) return undefined;
  const box = trigger.getBoundingClientRect();
  return { left: box.left, bottom: box.bottom };
}

/** Group the catalog's models by provider, preserving the catalog's order. */
function providerSections(groups: readonly BotModelGroup[], query: string): ProviderSection[] {
  const filter = query.trim().toLowerCase();
  const sections: ProviderSection[] = [];
  for (const group of groups) {
    if (
      filter.length > 0
      && !`${group.label} ${group.model} ${group.providerName}`.toLowerCase().includes(filter)
    )
      continue;
    const last = sections.at(-1);
    if (last !== undefined && last.provider === group.provider) last.rows.push(group);
    else sections.push({ provider: group.provider, name: group.providerName, rows: [group] });
  }
  return sections;
}

/** The route a model row applies: the effort in use when that model offers it. */
function routeOf(group: BotModelGroup, effort: string | undefined): ModelRouteView {
  return (
    group.efforts.find((choice) => (choice.route.reasoningEffort ?? '') === (effort ?? ''))?.route
    ?? group.efforts[0]!.route
  );
}

export function ComposerModelMenu({
  label,
  ariaLabel,
  current,
  catalog,
  defaultEffortLabel,
  disabled,
  onPick,
  t,
}: ComposerModelMenuProps) {
  const [open, setOpen] = useState(false);
  const [pane, setPane] = useState<Pane>('root');
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<Anchor>();
  const trigger = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const modelGroups = botModelMenuGroups(current, catalog, defaultEffortLabel);
  const effortChoices = botEffortChoices(current, catalog, defaultEffortLabel, '');
  const sections = providerSections(modelGroups, query);
  const currentEffort =
    current?.reasoningEffort === undefined
      ? defaultEffortLabel
      : (effortChoices.find((choice) => choice.current)?.label ?? current.reasoningEffort);
  const showEffort = effortChoices.length > 1;
  const hide = (): void => {
    setOpen(false);
    setPane('root');
    setQuery('');
  };
  const show = (): void => {
    setAnchor(anchorOf(trigger.current));
    setPane('root');
    setQuery('');
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (trigger.current?.contains(target) === true || card.current?.contains(target) === true) return;
      setOpen(false);
      setPane('root');
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setPane('root');
    };
    document.addEventListener('mousedown', onPointer, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const pick = (route: ModelRouteView): void => {
    if (disabled) return;
    hide();
    onPick(route);
  };
  return (
    <>
      <ChipButton
        ref={trigger}
        collapseLabel
        icon={<ChannelSidebarIcon name="cpu" size={14} />}
        label={label}
        title={label}
        onClick={() => {
          if (disabled) return;
          if (open) hide();
          else show();
        }}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
      />
      {open && anchor !== undefined
        ? createPortal(
            <div
              ref={card}
              role="menu"
              aria-label={t('composerContext.modelMenu')}
              data-composer-model-menu=""
              {...stylex.props(styles.card)}
              style={{
                left: anchor.left,
                bottom: Math.max(8, innerHeight - anchor.bottom + 6),
              }}
            >
              {pane === 'root' ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    {...stylex.props(styles.row)}
                    onClick={() => setPane('model')}
                  >
                    <span {...stylex.props(styles.rowLabel)}>{t('entry.model')}</span>
                    <span {...stylex.props(styles.rowValue)}>{label}</span>
                    <span aria-hidden="true" {...stylex.props(styles.chevron)}>›</span>
                  </button>
                  {showEffort ? (
                    <button
                      type="button"
                      role="menuitem"
                      {...stylex.props(styles.row)}
                      onClick={() => setPane('effort')}
                    >
                      <span {...stylex.props(styles.rowLabel)}>{t('composerContext.effort')}</span>
                      <span {...stylex.props(styles.rowValue)}>{currentEffort}</span>
                      <span aria-hidden="true" {...stylex.props(styles.chevron)}>›</span>
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    {...stylex.props(styles.row, styles.back)}
                    onClick={() => setPane('root')}
                  >
                    <span aria-hidden="true" {...stylex.props(styles.chevron)}>‹</span>
                    <span {...stylex.props(styles.rowLabel)}>
                      {pane === 'model' ? t('entry.model') : t('composerContext.effort')}
                    </span>
                  </button>
                  {pane === 'model' ? (
                    <>
                      <input
                        type="search"
                        value={query}
                        placeholder={t('composerContext.searchModels')}
                        aria-label={t('composerContext.searchModels')}
                        onChange={(event) => setQuery(event.currentTarget.value)}
                        {...stylex.props(styles.search)}
                      />
                      {sections.length === 0 ? (
                        <span {...stylex.props(styles.empty)}>{t('composerContext.noModel')}</span>
                      ) : (
                        sections.map((section) => (
                          <div key={section.provider} {...stylex.props(styles.section)}>
                            <span {...stylex.props(styles.provider)}>{section.name}</span>
                            {section.rows.map((group) => {
                              const signIn = group.credential !== undefined;
                              const selected = group.current;
                              return (
                                <button
                                  key={group.key}
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={selected}
                                  aria-disabled={signIn || undefined}
                                  disabled={signIn}
                                  {...stylex.props(styles.row, selected && styles.rowSelected)}
                                  onClick={() => pick(routeOf(group, current?.reasoningEffort))}
                                >
                                  <span {...stylex.props(styles.rowLabel)}>{group.label}</span>
                                  {signIn ? (
                                    <span {...stylex.props(styles.badge)}>
                                      {t('composerContext.signInRequired')}
                                    </span>
                                  ) : null}
                                  {selected ? (
                                    <span aria-hidden="true" {...stylex.props(styles.check)}>✓</span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </>
                  ) : (
                    <>
                      {effortChoices.length === 0 ? (
                        <span {...stylex.props(styles.empty)}>
                          {t('composerContext.unavailable')}
                        </span>
                      ) : (
                        effortChoices.map((choice) => (
                          <button
                            key={`${choice.route.provider}:${choice.route.model}:${choice.route.reasoningEffort ?? ''}`}
                            type="button"
                            role="menuitemradio"
                            aria-checked={choice.current}
                            {...stylex.props(styles.row, choice.current && styles.rowSelected)}
                            onClick={() => pick(choice.route)}
                          >
                            <span {...stylex.props(styles.rowLabel)}>{choice.label}</span>
                            {choice.current ? (
                              <span aria-hidden="true" {...stylex.props(styles.check)}>✓</span>
                            ) : null}
                          </button>
                        ))
                      )}
                    </>
                  )}
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

const styles = stylex.create({
  card: {
    position: 'fixed',
    zIndex: 1100,
    display: 'flex',
    flexDirection: 'column',
    gap: space.x1,
    minWidth: 280,
    maxWidth: 360,
    maxHeight: 480,
    overflowY: 'auto',
    padding: space.x2,
    borderWidth: border.hairline,
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.modal,
    boxShadow: '0 12px 32px color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent)',
    fontFamily: 'inherit',
    fontSize: text.bodySize,
    lineHeight: text.bodyLine,
    color: color.fg,
  },
  search: {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: size.row,
    paddingInline: space.x3,
    borderWidth: border.hairline,
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.well,
    color: color.fg,
    fontFamily: 'inherit',
    fontSize: text.bodySize,
    lineHeight: text.bodyLine,
    outline: 'none',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.x1,
    paddingTop: space.x1,
  },
  provider: {
    paddingInline: space.x3,
    paddingBlock: space.x1,
    color: color.muted,
    fontSize: text.metaSize,
    lineHeight: text.metaLine,
    fontWeight: text.strong,
  },
  badge: {
    flexShrink: 0,
    paddingInline: space.x2,
    paddingBlock: space.x1,
    borderRadius: radius.xs,
    backgroundColor: color.selected,
    color: color.muted,
    fontSize: text.metaSize,
    lineHeight: text.metaLine,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: space.x3,
    width: '100%',
    minHeight: size.row,
    paddingBlock: space.x1,
    paddingInline: space.x3,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': color.hover },
    color: 'inherit',
    fontFamily: 'inherit',
    textAlign: 'start',
    cursor: 'pointer',
  },
  rowSelected: { backgroundColor: color.selected },
  back: { color: color.muted },
  rowLabel: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' },
  rowValue: {
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: color.muted,
  },
  chevron: { flexShrink: 0, color: color.subtle },
  check: { flexShrink: 0, color: color.accent },
  empty: { paddingInline: space.x3, paddingBlock: space.x2, color: color.muted },
});
