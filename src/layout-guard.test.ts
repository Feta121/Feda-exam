import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const files = [
  ...readdirSync('src/pages').map((f) => `src/pages/${f}`),
  ...readdirSync('src/components').map((f) => `src/components/${f}`),
  'src/App.tsx',
].filter((f) => f.endsWith('.tsx'));

describe('layout safety (a long title must never stretch the page sideways on a phone)', () => {
  it('every grid declares its base column with minmax(0, 1fr) (or is one of the centred loading screens)', () => {
    const bad: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const tokens = (m[1] ?? m[2]).split(/\s+/);
        if (!tokens.includes('grid') || tokens.includes('place-items-center')) continue;
        if (!tokens.some((t) => t.startsWith('grid-cols-'))) bad.push(`${f}: ${tokens.join(' ')}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('cards may shrink below the width of their content', () => {
    expect(readFileSync('src/index.css', 'utf8')).toMatch(/\.card\s*\{\s*@apply[^}]*\bmin-w-0\b/);
  });
});
