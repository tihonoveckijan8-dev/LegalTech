export type IconName =
  | "overview"
  | "contracts"
  | "approvals"
  | "tasks"
  | "counterparties"
  | "team"
  | "settings"
  | "search"
  | "bell"
  | "plus"
  | "file"
  | "calendar"
  | "clock"
  | "shield"
  | "info";

const paths: Record<IconName, string> = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  contracts: "M7 3h7l4 4v14H7z M14 3v5h5 M10 13h5 M10 17h5",
  approvals: "M5 12l4 4L19 6 M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0",
  tasks: "M8 6h12 M8 12h12 M8 18h12 M3 6h.01 M3 12h.01 M3 18h.01",
  counterparties: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M17 11h6",
  team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M16 3.2a4 4 0 0 1 0 7.6 M20 15a4 4 0 0 1 2 3.5V21",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.76.67l-.05.07h-3.4l-.04-.08a1.7 1.7 0 0 0-1.58-1.02h-.1l-.05.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 9.4 15l-.1-.03v-3.4l.1-.03a1.7 1.7 0 0 0-.34-1.88L9 9.6l1.7-2.94.08.02a1.7 1.7 0 0 0 1.76-.67l.05-.07h3.4l.04.08a1.7 1.7 0 0 0 1.58 1.02h.1l.05-.02 1.7 2.94-.06.06A1.7 1.7 0 0 0 19.3 12l.1.03v2.94z",
  search: "m20 20-4.5-4.5 M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  plus: "M12 5v14 M5 12h14",
  file: "M7 3h7l4 4v14H7z M14 3v5h5 M10 13h5 M10 17h5",
  calendar: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z M9 12l2 2 4-4",
  info: "M12 16v-4 M12 8h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z"
};

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
};

export function Icon({ name, size = 18, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
