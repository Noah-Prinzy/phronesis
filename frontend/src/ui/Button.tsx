import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'
import { Spinner } from './Status'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ControlSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant
  size?: ControlSize
  /** Fill the container. Used for the one primary action at the foot of a page. */
  wide?: boolean
  /** Swaps the label for a spinner and blocks pointer events. */
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  /** Explicit, because a button inside a form defaults to `submit`. */
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  variant = 'primary',
  size = 'md',
  wide = false,
  loading = false,
  iconLeft,
  iconRight,
  type = 'button',
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      data-wide={wide || undefined}
      data-loading={loading || undefined}
      className={cx('ph-btn', className)}
    >
      {iconLeft}
      {children}
      {iconRight}
      {loading && (
        <span className="ph-btn__spin">
          <Spinner size={size === 'lg' ? 16 : 13} />
        </span>
      )}
    </button>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon alone is not a name. */
  label: string
  size?: ControlSize
  variant?: 'plain' | 'filled'
  children: ReactNode
}

export function IconButton({
  label,
  size = 'md',
  variant = 'plain',
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      /* Before the spread, not after.
         A default, so an icon button in a form is inert unless it asks to be
         otherwise — but overridable, which is the part that was broken: set
         AFTER `...rest` it clobbered every `type` a caller passed, and Home's
         send button has been `type="submit"` inside a form since the first
         commit while rendering as an inert `type="button"`. Clicking it did
         nothing; only pressing Enter ever sent a message. */
      type="button"
      {...rest}
      aria-label={label}
      title={label}
      data-size={size}
      data-variant={variant}
      className={cx('ph-icb', className)}
    >
      {children}
    </button>
  )
}
