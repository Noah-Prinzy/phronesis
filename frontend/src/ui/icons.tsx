/**
 * The icon set.
 *
 * One stroke weight, one 24×24 grid, one place. An icon that disagrees with
 * its neighbours about weight reads as a different app — and icons defined
 * ad hoc at the bottom of a page file are exactly how that drift starts.
 */

function Svg({ size = 17, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

interface IconProps {
  size?: number
}

/* ------------------------------------------------------------ navigation */

export function IconHome({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </Svg>
  )
}

export function IconDiagnose({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </Svg>
  )
}

export function IconFix({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M14 6l3 3-8 8H6v-3z" />
      <path d="M4 21h16" />
    </Svg>
  )
}

export function IconMap({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </Svg>
  )
}

export function IconAccount({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-3.4 3.8-5.1 7-5.1s5.8 1.7 7 5.1" />
    </Svg>
  )
}

export function IconSearch({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  )
}

export function IconCompare({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 18V9" />
      <path d="M10 18V5" />
      <path d="M16 18v-6" />
      <path d="M2 21h20" />
    </Svg>
  )
}

/* --------------------------------------------------------------- actions */

/** The car itself. Used for the vehicle glyph at the foot of the rail. */
export function IconCar({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M5 16.5h14" />
      <path d="M6.5 16.5V19" />
      <path d="M17.5 16.5V19" />
      <path d="M4 16.5l1.6-5A2 2 0 0 1 7.5 10h9a2 2 0 0 1 1.9 1.5l1.6 5" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </Svg>
  )
}

export function IconSend({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  )
}

export function IconMic({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
      <path d="M5 10.5v1a7 7 0 0 0 14 0v-1" />
      <path d="M12 18.5V21" />
    </Svg>
  )
}

export function IconBack({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  )
}

export function IconRefresh({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M20 11a8 8 0 1 0-.6 4" />
      <path d="M20 4v7h-7" />
    </Svg>
  )
}

export function IconPhone({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M6.5 3h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6 4z" />
    </Svg>
  )
}

export function IconMessage({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 5h16v11H9l-5 4z" />
    </Svg>
  )
}

export function IconNavigate({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M3.5 11 21 4l-7 17.5-2.4-7z" />
    </Svg>
  )
}

/* --------------------------------------------------------------- status */

export function IconAlert({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3.5 21.5 20h-19z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
    </Svg>
  )
}

export function IconCheck({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </Svg>
  )
}

export function IconSpark({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3.5c.9 4.4 2.2 5.7 6.6 6.6-4.4.9-5.7 2.2-6.6 6.6-.9-4.4-2.2-5.7-6.6-6.6 4.4-.9 5.7-2.2 6.6-6.6z" />
      <path d="M18.5 16.5c.4 1.9 1 2.5 2.9 2.9-1.9.4-2.5 1-2.9 2.9-.4-1.9-1-2.5-2.9-2.9 1.9-.4 2.5-1 2.9-2.9z" />
    </Svg>
  )
}

export function IconPlug({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M9 3v5" />
      <path d="M15 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6z" />
      <path d="M12 17v4" />
    </Svg>
  )
}
