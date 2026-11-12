import { describe, it, expect } from 'vitest';
import {
  defaultFooterPreferences,
  moveFooterItem,
  parseFooterPreferences,
  toggleFooterItem,
} from '../src/client/composer-footer-preferences.js';

describe('composer footer preferences', () => {
  it('keeps speed opt-in and rejects damaged or incomplete settings', () => {
    for (const raw of [
      null,
      '{}',
      '{',
      JSON.stringify({ left: ['workspace', 'workspace'], right: ['usage'], hidden: ['avg-perf'] }),
    ])
      expect(parseFooterPreferences(raw)).toEqual({
        left: ['workspace', 'usage'],
        right: [],
        hidden: ['avg-perf'],
      });
  });
  it('moves between sides at an explicit insertion point without duplicating items', () => {
    let p = toggleFooterItem(defaultFooterPreferences(), 'avg-perf');
    p = moveFooterItem(p, 'avg-perf', 'right', 'usage');
    expect(p).toEqual({ left: ['workspace', 'usage'], right: ['avg-perf'], hidden: [] });
    p = moveFooterItem(p, 'usage', 'right', 'avg-perf');
    expect(p).toEqual({ left: ['workspace'], right: ['usage', 'avg-perf'], hidden: [] });
    expect(parseFooterPreferences(JSON.stringify(p))).toEqual(p);
    expect(moveFooterItem(p, 'workspace', 'left', 'workspace')).toBe(p);
  });
  it('lets all items be hidden and restores a hidden item exactly once', () => {
    let p = defaultFooterPreferences();
    for (const id of ['workspace', 'usage'] as const) p = toggleFooterItem(p, id);
    expect(p.left).toEqual([]);
    expect(p.right).toEqual([]);
    p = toggleFooterItem(p, 'usage');
    expect(p.left).toEqual(['usage']);
    expect(p.hidden).not.toContain('usage');
  });
});
