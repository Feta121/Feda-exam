// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const themeScript = html.match(/<script>([\s\S]*?ame:theme[\s\S]*?)<\/script>/)![1];

function runThemeScript(systemPrefersDark: boolean) {
  document.documentElement.className = '';
  (window as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: systemPrefersDark });
  new Function(themeScript)();
  return document.documentElement.classList.contains('dark');
}

describe('default theme', () => {
  beforeEach(() => localStorage.clear());
  it('is light even when the device is set to dark', () => {
    expect(runThemeScript(true)).toBe(false);
    expect(runThemeScript(false)).toBe(false);
  });
  it('does not look at the system theme at all', () => {
    expect(themeScript).not.toContain('matchMedia');
  });
  it('is dark only after the student chose dark, and stays light if they chose light', () => {
    localStorage.setItem('ame:theme', 'dark');
    expect(runThemeScript(false)).toBe(true);
    localStorage.setItem('ame:theme', 'light');
    expect(runThemeScript(true)).toBe(false);
  });
});

describe('loading splash in index.html', () => {
  it('shows the full logo picture before the app has loaded', () => {
    expect(html).toContain('id="boot-splash"');
    expect(html).toMatch(/<img src="brand\.png" alt="Anesthesia Mock Exam by Abdulfetah"/);
  });
});
