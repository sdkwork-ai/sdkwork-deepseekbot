import { describe, expect, it } from 'vitest';

import { BOT_GLYPH_SVG, botBackdropUri, botIconMarkup } from '../src/client/bot-icon.js';

describe('bot icon markup', () => {
  it('serves the mascot as palette-matched artwork', () => {
    const light = botIconMarkup('mascot', 'light');
    const dark = botIconMarkup('mascot', 'dark');
    expect(light).toContain('<img');
    expect(light).toContain('data:image/png;base64,');
    expect(dark).toContain('data:image/png;base64,');
    expect(dark).not.toBe(light);
  });

  it('serves the simple variant as its own palette-matched artwork', () => {
    const light = botIconMarkup('simple', 'light');
    const dark = botIconMarkup('simple', 'dark');
    expect(light).toContain('<img');
    expect(light).toContain('data:image/png;base64,');
    expect(dark).not.toBe(light);
    expect(light).not.toBe(botIconMarkup('mascot', 'light'));
  });

  it('keeps a backdrop per variant and falls back to the mascot', () => {
    expect(botBackdropUri('simple')).not.toBe(botBackdropUri('mascot'));
    expect(botBackdropUri('blob')).toBe(botBackdropUri('mascot'));
    expect(botBackdropUri('bot')).toBe(botBackdropUri('mascot'));
  });

  it('generates one deterministic blob', () => {
    const first = botIconMarkup('blob', 'light');
    expect(first).toContain('<svg');
    expect(botIconMarkup('blob', 'dark')).toBe(first);
  });

  it('falls back to the vendored glyph for the generic bot mark', () => {
    expect(botIconMarkup('bot', 'light')).toBe(BOT_GLYPH_SVG);
    expect(BOT_GLYPH_SVG).toContain('stroke="currentColor"');
  });
});
