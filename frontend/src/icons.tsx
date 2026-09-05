/**
 * The nav icon set. Deliberately a single stroke weight and a single 24×24
 * grid — an icon that disagrees with its neighbours about weight reads as a
 * different app.
 */

function Svg({ size = 17, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconHome({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </Svg>
  )
}

export function IconDiagnose({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </Svg>
  )
}

export function IconFix({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M14 6l3 3-8 8H6v-3z" />
      <path d="M4 21h16" />
    </Svg>
  )
}

export function IconMap({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </Svg>
  )
}

export function IconAccount({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-3.4 3.8-5.1 7-5.1s5.8 1.7 7 5.1" />
    </Svg>
  )
}

export function IconSearch({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  )
}

export function IconCompare({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M4 18V9" />
      <path d="M10 18V5" />
      <path d="M16 18v-6" />
      <path d="M2 21h20" />
    </Svg>
  )
}
