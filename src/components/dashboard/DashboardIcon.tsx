import type { SVGProps } from "react";

const paths = {
  arrow: <path d="M7 17 17 7M7 7h10v10" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="3" />
      <circle cx="15" cy="17" r="3" />
    </>
  ),
  message: (
    <path d="M21 11.5a8.5 8.5 0 0 1-12 7.7L3 21l1.8-6A8.5 8.5 0 1 1 21 11.5Z" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  pin: (
    <>
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4M17 3v4M3 11h18" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="10" cy="7" rx="6" ry="2.6" />
      <path d="M4 7v5c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V7" />
      <path d="M4 12v5c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-5" />
      <path d="M20 10.5c0-1.4-1.4-2.4-3.5-2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10.5h18M7 15h3" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
};

export function DashboardIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
