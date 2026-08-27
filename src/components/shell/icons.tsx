/**
 * Minimal inline icon set for the app shell — no icon-library dependency.
 * Outline style, inherits `currentColor`, sized via the `className` prop.
 */

export type IconName =
  | "home"
  | "users"
  | "truck"
  | "tag"
  | "folder"
  | "file-text"
  | "receipt"
  | "wallet"
  | "bar-chart"
  | "paperclip"
  | "id-card"
  | "plug"
  | "settings"
  | "shield"
  | "menu"
  | "close"
  | "chevron-down"
  | "logout"
  | "plus";

const PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16.5 6.2A3 3 0 0 1 19 11m2.5 8c0-2.4-1.3-4.3-3.4-5.2" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  tag: (
    <>
      <path d="M3 3h8l10 10-8 8L3 11z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  folder: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h7A1.5 1.5 0 0 1 21 9v8.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />,
  "file-text": (
    <>
      <path d="M6 3h8l4 4v14H6zM14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
  wallet: (
    <>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H18v12H4.5A1.5 1.5 0 0 1 3 16.5z" />
      <path d="M18 9h3v6h-3z" />
      <circle cx="18.5" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </>
  ),
  "bar-chart": <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  paperclip: <path d="M20 11.5 12 19a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5" />,
  "id-card": (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="9" cy="11" r="2" />
      <path d="M5.5 16c0-1.7 1.6-3 3.5-3s3.5 1.3 3.5 3M15 10h4M15 13h4" />
    </>
  ),
  plug: <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M22 12h-3M5 12H2M18.4 5.6l-2 2M7.6 16.4l-2 2M18.4 18.4l-2-2M7.6 7.6l-2-2" />
    </>
  ),
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  logout: <path d="M15 12H4M11 8l-4 4 4 4M14 4h5v16h-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
