/**
 * The component library. One import site for the whole app:
 *
 *   import { Button, TextInput, SeverityBadge } from '@/ui'
 *
 * Everything the pages are allowed to use is exported here. If a page needs
 * something that is not on this list, the answer is a new atom — not a
 * one-off style at the call site. That is the drift V1 taught us to prevent
 * (see ../../README.md).
 */

export { cx } from './cx'
export { usePressLight } from './usePressLight'

export { Button, IconButton } from './Button'
export { Dialog } from './Dialog'
export type { DialogProps } from './Dialog'
export type { ButtonProps, ButtonVariant, ControlSize, IconButtonProps } from './Button'

export {
  Bubble,
  Card,
  CardButton,
  Chip,
  Divider,
  Group,
  Row,
  SectionHead,
  SeverityBadge,
  Sheet,
  Spec,
  SpecList,
  StarRating,
} from './Display'
export type {
  BubbleProps,
  CardButtonProps,
  CardProps,
  ChipProps,
  RowProps,
  Severity,
  StarRatingProps,
} from './Display'

export {
  Checkbox,
  PasswordInput,
  Radio,
  SearchField,
  Segmented,
  Select,
  Slider,
  Switch,
  TextArea,
  TextInput,
} from './Form'
export type {
  ChoiceProps,
  FieldShellProps,
  SegmentedProps,
  SearchFieldProps,
  SelectOption,
  SelectProps,
  SliderProps,
  SwitchProps,
  TextAreaProps,
  TextInputProps,
} from './Form'

export { AppBar, Rail, TabBar, Tabs } from './Nav'
export type { AppBarProps, NavItem, NavProps, TabsProps } from './Nav'

export { EmptyState, Meter, Skeleton, Spinner, SplitBar, Steps, Toast } from './Status'
export type { EmptyStateProps, MeterProps, SplitBarProps, ToastLevel, ToastProps } from './Status'
