// frontend/src/components/AvatarElement/index.ts
//
// Public surface of the element. Import from here, not from individual
// files — the internals are free to move around.

export { AvatarElement, default } from './AvatarElement';
export type { AvatarElementProps } from './AvatarElement';

export { AvatarField } from './AvatarField';
export type { AvatarFieldProps } from './AvatarField';

export { AvatarDock } from './AvatarDock';
export type { AvatarDockProps, DockMode } from './AvatarDock';

export { useMicrophone } from './useMicrophone';
export type { MicPermission, UseMicrophoneResult } from './useMicrophone';

export {
  AVATAR_MOTION,
  AVATAR_STATE_LABEL,
  STATE_EASE_PER_S,
  easeMotion,
  lerp,
} from './avatarStates';
export type { AvatarMotion, AvatarState } from './avatarStates';

export {
  AVATAR_THEME_COLORS,
  REFERENCE_HEIGHT_PX,
  createAvatarGeometry,
  createAvatarUniforms,
} from './avatarShader';
export type { AvatarTheme, AvatarUniforms } from './avatarShader';
