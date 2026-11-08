/**
 * The composer's model control, in the shape the conversation surface uses in
 * this shell: a chip that names the model (and its reasoning level) and opens a
 * two-level menu — "模型" and "推理等级" — whose rows apply the choice
 * immediately. The full model editor (presets, assignment model) stays on the
 * bot's profile entry and in the model command; the composer's chip is the
 * quick switch, so the assistant's conversation config reads and behaves like
 * the shell's own conversation configuration.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as stylex from '@stylexjs/stylex';

import { ChipButton } from './ds/chip-button.js';
import { ChannelSidebarIcon } from './channel-sidebar-icon.js';
import { botEffortChoices, botModelChoices } from './bot-model-route.js';
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

/** Open above the chip, the way the composer's model menu opens in the shell. */
function anchorOf(trigger: HTMLElement | null): Anchor | undefined {
  if (trigger === null) return undefined;
  const box = trigger.getBoundingClientRect();
  return { left: box.left, bottom: box.bottom };
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
  const [anchor, setAnchor] = useState<Anchor>();
  const trigger = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const modelChoices = botModelChoices(current, catalog, defaultEffortLabel, '');
  const effortChoices = botEffortChoices(current, catalog, defaultEffortLabel, '');
  const currentEffort =
    current?.reasoningEffort === undefined
      ? defaultEffortLabel
      : (effortChoices.find((choice) => choice.current)?.label ?? current.reasoningEffort);
  const showEffort = effortChoices.length > 1;
  const hide = (): void => {
    setOpen(false);
    setPane('root');
  };
  const show = (): void => {
    setAnchor(anchorOf(trigger.current));
    setPane('root');
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
  const choices = pane === 'model' ? modelChoices : effortChoices;
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
                  {choices.length === 0 ? (
                    <span {...stylex.props(styles.empty)}>{t('composerContext.unavailable')}</span>
                  ) : (
                    choices.map((choice) => (
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
    minWidth: 240,
    maxWidth: 340,
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
