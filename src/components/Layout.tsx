import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { IconBook, IconBookmark, IconChart, IconExam, IconGrid, IconHistory, IconHome, IconMoon, IconMore, IconPractice, IconShield, IconSun, Logo } from './icons';
import { useApp, adminConfigured } from '../state/AppContext';
import { KEYS, write } from '../lib/storage';

type Item = { to: string; label: string; icon: (p: { className?: string }) => ReactNode };
const MAIN: Item[] = [
  { to: '/', label: 'Dashboard', icon: IconHome },
  { to: '/exam', label: 'Mock Exam', icon: IconExam },
  { to: '/practice', label: 'Practice', icon: IconPractice },
  { to: '/subjects', label: 'Subjects', icon: IconGrid },
];
const MORE: Item[] = [
  { to: '/weak', label: 'Weak Areas', icon: IconChart },
  { to: '/saved', label: 'Saved & Wrong', icon: IconBookmark },
  { to: '/history', label: 'History', icon: IconHistory },
  { to: '/sources', label: 'Sources', icon: IconBook },
];

export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    write(KEYS.theme, next ? 'dark' : 'light');
    try {
      localStorage.setItem('ame:theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    setDark(next);
  };
  return { dark, toggle };
}

function ThemeButton({ className = '' }: { className?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} className={`rounded-lg p-2 ${className}`} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
      {dark ? <IconSun /> : <IconMoon />}
    </button>
  );
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-white/10 text-white' : 'text-navy-200 hover:bg-white/5 hover:text-white'}`;

export default function Layout() {
  const { admin } = useApp();
  const [more, setMore] = useState(false);
  const loc = useLocation();
  useEffect(() => setMore(false), [loc.pathname]);
  const desktopItems = [...MAIN, ...MORE, ...(adminConfigured ? [{ to: '/admin', label: 'Admin', icon: IconShield } as Item] : [])];
  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 p-4 lg:flex">
        <div className="mb-6 pt-1">
          <div className="overflow-hidden rounded-xl bg-[#f4f8f9]">
            <img src={`${import.meta.env.BASE_URL}brand.png`} alt="Anesthesia Mock Exam by Abdulfetah" width={720} height={264} className="block h-auto w-full" />
          </div>
        </div>
        <nav className="flex-1 space-y-1" aria-label="Main">
          {desktopItems.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'} className={linkCls}>
              <i.icon className="h-5 w-5" />
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-navy-200">
          <span className="text-xs">{admin ? 'Admin session' : 'Student'}</span>
          <ThemeButton className="hover:bg-white/10" />
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-navy-800 dark:bg-navy-950/90 lg:hidden">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="leading-tight">
            <span className="block font-bold text-navy-900 dark:text-white">Anesthesia Mock Exam</span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">by Abdulfetah</span>
          </span>
        </div>
        <ThemeButton className="text-slate-600 dark:text-slate-300" />
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 lg:px-8 lg:pb-12 lg:pt-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-navy-800 dark:bg-navy-900 lg:hidden" aria-label="Mobile">
        <div className="grid grid-cols-5">
          {MAIN.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive ? 'text-teal-600 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}`}>
              <i.icon className="h-5 w-5" />
              {i.label.replace('Mock ', '')}
            </NavLink>
          ))}
          <button onClick={() => setMore((m) => !m)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400" aria-expanded={more}>
            <IconMore className="h-5 w-5" />
            More
          </button>
        </div>
        {more && (
          <div className="absolute bottom-full right-2 mb-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-navy-700 dark:bg-navy-900">
            {[...MORE, ...(adminConfigured ? [{ to: '/admin', label: 'Admin', icon: IconShield } as Item] : [])].map((i) => (
              <NavLink key={i.to} to={i.to} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-navy-800">
                <i.icon className="h-5 w-5" />
                {i.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}
