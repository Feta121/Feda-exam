import type { SVGProps } from 'react';
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const I = (d: string) => (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p} aria-hidden="true"><path d={d} /></svg>
);
export const IconHome = I('M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10');
export const IconExam = I('M9 4h6l1 2h3v14H5V6h3l1-2zM9 12l2 2 4-4');
export const IconPractice = I('M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zM8 8h6M8 12h6');
export const IconGrid = I('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z');
export const IconChart = I('M4 20V10M10 20V4M16 20v-8M22 20H2');
export const IconBookmark = I('M6 3h12v18l-6-4-6 4V3z');
export const IconHistory = I('M3 12a9 9 0 109-9 9 9 0 00-7 3.5L3 9M3 4v5h5M12 8v4l3 2');
export const IconShield = I('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z');
export const IconSun = I('M12 4V2M12 22v-2M4.9 4.9L3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M12 8a4 4 0 100 8 4 4 0 000-8z');
export const IconMoon = I('M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z');
export const IconFlag = I('M5 21V4M5 4h11l-2 4 2 4H5');
export const IconCheck = I('M5 12l5 5 9-10');
export const IconX = I('M6 6l12 12M18 6L6 18');
export const IconMore = I('M5 12h.01M12 12h.01M19 12h.01');
export const IconClock = I('M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z');
export const IconArrowLeft = I('M15 6l-6 6 6 6');
export const IconArrowRight = I('M9 6l6 6-6 6');
export function Logo({ className = '' }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}brand-mark.png`} alt="" aria-hidden="true" className={`object-contain ${className}`} />;
}
