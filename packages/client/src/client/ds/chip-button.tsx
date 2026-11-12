import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';

import { border, color, radius, size, space, text } from './tokens.stylex.js';

const styles = stylex.create({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.x2,
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: 0,
    maxWidth: '100%',
    minHeight: size.icon,
    overflow: 'hidden',
    paddingBlock: space.x1,
    paddingInline: space.x3,
    borderWidth: border.hairline,
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: {
      default: 'transparent',
      ':hover': color.hover,
      ':focus-visible': color.hover,
    },
    color: {
      default: color.muted,
      ':hover': color.fg,
      ':focus-visible': color.fg,
    },
    fontFamily: 'inherit',
    fontSize: text.metaSize,
    lineHeight: text.bodyLine,
    whiteSpace: 'nowrap',
    textAlign: 'start',
    cursor: 'pointer',
    outline: { default: 'none', ':focus-visible': `${border.focus} solid ${color.accent}` },
    outlineOffset: '-2px',
  },
  wrap: { whiteSpace: 'normal' },
  trailing: { flexShrink: 0 },
  icon: { display: 'inline-flex', flexShrink: 0 },
  label: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  collapsedLabel: {
    display: { default: 'block', '@container composer-footer (max-width: 480px)': 'none' },
  },
  seat: {
    minHeight: size.icon,
    paddingBlock: 0,
    paddingInlineStart: space.x3,
    paddingInlineEnd: space.x2,
    gap: space.x2,
    borderWidth: 0,
    borderRadius: radius.sm,
    fontSize: text.bodySize,
    lineHeight: text.bodyLine,
    fontWeight: text.strong,
    maxWidth: '220px',
  },
  reading: {
    minHeight: 0,
    paddingBlock: space.x1,
    paddingInline: space.x3,
    gap: space.x2,
    borderWidth: 0,
    fontSize: text.bodySize,
    lineHeight: text.bodyLine,
    fontVariantNumeric: 'tabular-nums',
    color: {
      default: color.subtle,
      ':hover': color.muted,
      ':focus-visible': color.muted,
    },
  },
  wrapLabel: {
    overflow: 'visible',
    overflowWrap: 'anywhere',
    textOverflow: 'clip',
  },
});

export interface ChipButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'style' | 'children'
> {
  readonly icon?: ReactNode;
  readonly label: ReactNode;
  readonly after?: ReactNode;
  readonly wrap?: boolean;
  readonly collapseLabel?: boolean;
  readonly trailing?: boolean;
  readonly variant?: 'chip' | 'seat' | 'reading';
  readonly [data: `data-${string}`]: string | boolean | undefined;
}

export const ChipButton = forwardRef<HTMLButtonElement, ChipButtonProps>(function ChipButton(
  {
    icon,
    label,
    after,
    wrap = false,
    collapseLabel = false,
    trailing = false,
    variant = 'chip',
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      {...rest}
      aria-label={
        rest['aria-label'] ?? (collapseLabel && typeof label === 'string' ? label : undefined)
      }
      title={rest.title ?? (collapseLabel && typeof label === 'string' ? label : undefined)}
      {...stylex.props(
        styles.chip,
        variant === 'seat' && styles.seat,
        variant === 'reading' && styles.reading,
        wrap && styles.wrap,
        trailing && styles.trailing,
      )}
    >
      {icon === undefined ? null : (
        <span aria-hidden="true" {...stylex.props(styles.icon)}>
          {icon}
        </span>
      )}
      <span
        {...stylex.props(
          styles.label,
          wrap && styles.wrapLabel,
          collapseLabel && icon !== undefined && styles.collapsedLabel,
        )}
      >
        {label}
      </span>
      {after === undefined ? null : (
        <span aria-hidden="true" {...stylex.props(styles.icon)}>
          {after}
        </span>
      )}
    </button>
  );
});
