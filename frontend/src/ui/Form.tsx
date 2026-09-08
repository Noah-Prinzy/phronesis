import { useId, useMemo, useRef, useState } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cx } from './cx'
import { IconButton } from './Button'

/* -------------------------------------------------------------------- field
   The wrapper that makes label/hint/error impossible to forget. Every input
   below accepts these props and routes them through here, which is why V2
   cannot repeat V1's unlabelled fields. */

export interface FieldShellProps {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  className?: string
}

interface FieldProps extends FieldShellProps {
  id: string
  children: ReactNode
}

function Field({ id, label, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cx('ph-field', className)}>
      {label && (
        <label className="ph-field__label" htmlFor={id}>
          {label}
          {required && (
            <span className="ph-field__req" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <span className="ph-field__error" id={`${id}-msg`} role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span className="ph-field__hint" id={`${id}-msg`}>
            {hint}
          </span>
        )
      )}
    </div>
  )
}

/** Shared wiring: one id, one aria-describedby, one invalid flag. */
function useFieldAria(idProp: string | undefined, error: ReactNode, hint: ReactNode) {
  const auto = useId()
  const id = idProp ?? auto
  return {
    id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error || hint ? `${id}-msg` : undefined,
  }
}

/* -------------------------------------------------------------------- input */

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>,
    FieldShellProps {}

export function TextInput({
  label,
  hint,
  error,
  required,
  className,
  id: idProp,
  ...rest
}: TextInputProps) {
  const aria = useFieldAria(idProp, error, hint)
  return (
    <Field
      id={aria.id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <input {...rest} {...aria} required={required} className="ph-input" />
    </Field>
  )
}

/* ----------------------------------------------------------------- password */

export function PasswordInput({
  label,
  hint,
  error,
  required,
  className,
  id: idProp,
  ...rest
}: TextInputProps) {
  const aria = useFieldAria(idProp, error, hint)
  const [shown, setShown] = useState(false)
  return (
    <Field
      id={aria.id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div style={{ position: 'relative' }}>
        <input
          {...rest}
          {...aria}
          required={required}
          type={shown ? 'text' : 'password'}
          className="ph-input"
          style={{ paddingRight: '2.6rem' }}
        />
        <IconButton
          label={shown ? 'Hide password' : 'Show password'}
          size="sm"
          onClick={() => setShown((s) => !s)}
          style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)' }}
        >
          {shown ? <EyeOff /> : <Eye />}
        </IconButton>
      </div>
    </Field>
  )
}

/* ----------------------------------------------------------------- textarea */

export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>,
    FieldShellProps {}

export function TextArea({
  label,
  hint,
  error,
  required,
  className,
  id: idProp,
  ...rest
}: TextAreaProps) {
  const aria = useFieldAria(idProp, error, hint)
  return (
    <Field
      id={aria.id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <textarea {...rest} {...aria} required={required} data-multiline="true" className="ph-input" />
    </Field>
  )
}

/* ------------------------------------------------------------------- select */

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'children'>,
    FieldShellProps {
  options: SelectOption[]
  placeholder?: string
}

/**
 * A native `<select>`. It gets the platform's own listbox — correct keyboard
 * behaviour, correct scrolling, and on a phone the OS wheel, which no custom
 * dropdown matches. Only the closed state is ours.
 */
export function Select({
  label,
  hint,
  error,
  required,
  className,
  options,
  placeholder,
  id: idProp,
  ...rest
}: SelectProps) {
  const aria = useFieldAria(idProp, error, hint)
  return (
    <Field
      id={aria.id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="ph-select-wrap">
        <select {...rest} {...aria} required={required} className="ph-input ph-select">
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="ph-select-wrap__caret" aria-hidden="true">
          <Caret />
        </span>
      </div>
    </Field>
  )
}

/* ------------------------------------------------------------- search field */

export interface SearchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  /**
   * Required. A search field carries no visible label, so without this it
   * reaches a screen reader as an unnamed edit box — which is exactly the
   * gap this component library exists to make impossible.
   */
  label: string
  className?: string
}

export function SearchField({ label, className, id: idProp, ...rest }: SearchFieldProps) {
  const auto = useId()
  return (
    <div className={cx('ph-search', className)}>
      <span className="ph-search__icon" aria-hidden="true">
        <Magnifier />
      </span>
      <input
        {...rest}
        id={idProp ?? auto}
        type="search"
        aria-label={label}
        className="ph-input"
      />
    </div>
  )
}

/* ------------------------------------------------------------------- switch */

export interface SwitchProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cx('ph-switch', className)}
    />
  )
}

/* --------------------------------------------------------- checkbox / radio */

export interface ChoiceProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
}

export function Checkbox({ label, className, ...rest }: ChoiceProps) {
  return (
    <label className={cx('ph-choice', className)}>
      <input {...rest} type="checkbox" />
      <span className="ph-choice__box" data-shape="check">
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
          <path className="ph-choice__tick" d="M2 6.4 L4.7 9 L10 3" />
        </svg>
      </span>
      <span>{label}</span>
    </label>
  )
}

export function Radio({ label, className, ...rest }: ChoiceProps) {
  return (
    <label className={cx('ph-choice', className)}>
      <input {...rest} type="radio" />
      <span className="ph-choice__box" data-shape="radio">
        <span className="ph-choice__dot" />
      </span>
      <span>{label}</span>
    </label>
  )
}

/* -------------------------------------------------------- segmented control */

export interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: ReactNode }>
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

/**
 * The thumb slides rather than jumps, because the two options are two views of
 * one thing. It is positioned from measured geometry rather than
 * `index / count`, so options of different widths still line up.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedProps<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  // Percent geometry avoids a measurement pass: options are equal-width
  // (`flex: 1`), so the thumb can be placed without reading the DOM at all —
  // which also means it is correct on the very first paint, in a hidden tab,
  // and before fonts load.
  const thumb = useMemo(() => {
    const w = 100 / options.length
    return { width: `calc(${w}% - 3px)`, transform: `translateX(calc(${index * 100}% + ${index * 3}px))` }
  }, [index, options.length])

  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={cx('ph-seg', className)}>
      <span className="ph-seg__thumb" style={thumb} aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="ph-seg__opt"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------- slider */

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  /** Rendered beside the label — "up to UGX 22M". */
  valueLabel?: ReactNode
  min?: number
  max?: number
  value: number
}

export function Slider({
  label,
  valueLabel,
  min = 0,
  max = 100,
  value,
  className,
  ...rest
}: SliderProps) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100
  return (
    <div className={className}>
      {(label || valueLabel) && (
        <div className="ph-slider__head">
          <span>{label}</span>
          {valueLabel && <span className="ph-slider__value">{valueLabel}</span>}
        </div>
      )}
      <input
        {...rest}
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        className="ph-slider"
        style={{ ['--fill' as string]: `${pct}%` }}
      />
    </div>
  )
}

/* -------------------------------------------------------------------- icons */

function Caret() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function Magnifier() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

function Eye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M2 12s3.6-6.5 10-6.5c1.7 0 3.2.35 4.5.9M22 12s-3.6 6.5-10 6.5c-1.7 0-3.2-.35-4.5-.9" />
      <path d="M4 3l16 18" />
    </svg>
  )
}
