// frontend/src/pages/AvatarStudio.tsx

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AvatarDock from '../components/AvatarElement/AvatarDock';
import AvatarElement from '../components/AvatarElement/AvatarElement';
import type { AvatarTheme } from '../components/AvatarElement/avatarShader';
import {
  AVATAR_MOTION,
  AVATAR_STATE_LABEL,
  type AvatarMotion,
  type AvatarState,
} from '../components/AvatarElement/avatarStates';

/**
 * In-app avatar studio (/avatar-studio).
 *
 * The place to work on the avatar without walking the whole onboarding flow
 * to see it. Every motion value is a live slider; when it looks right, "Copy
 * block" gives you the TypeScript to paste over that state in
 * avatarStates.ts. Tuning the shipping component beats tuning a mock of it.
 *
 * Not linked from anywhere in the product — reachable by URL only.
 */

const STATES: AvatarState[] = ['idle', 'listening', 'thinking', 'responding'];

/** [min, max, step] per motion field. Ranges run past what looks safe on
 *  purpose — the good settings are often just outside it. */
const RANGES: Record<keyof AvatarMotion, [number, number, number]> = {
  expansion: [0.4, 1.8, 0.01],
  turbulence: [0, 0.3, 0.005],
  churn: [0, 2, 0.01],
  spin: [0, 1.5, 0.01],
  pulse: [0, 1.5, 0.01],
  pulseSpeed: [0, 8, 0.05],
  twinkle: [0, 0.8, 0.01],
  pointSize: [0.5, 8, 0.05],
  coreGlow: [0, 2, 0.01],
  micResponse: [0, 2, 0.01],
};

const FIELD_HELP: Record<keyof AvatarMotion, string> = {
  expansion: 'Cloud radius. Below 1 contracts, above 1 opens out.',
  turbulence: 'How far each point wanders from home.',
  churn: 'Speed of the noise field the points drift through.',
  spin: 'Whole-cloud rotation, rad/s.',
  pulse: 'Strength of the outward wave — the speaking ripple.',
  pulseSpeed: 'How fast that wave travels core to rim.',
  twinkle: 'Per-point brightness flicker.',
  pointSize: 'Base point size in px at a 320px render height.',
  coreGlow: 'Intensity of the glow at the centre.',
  micResponse: 'How much live mic amplitude moves the cloud.',
};

const TAB_BASE =
  'px-3 py-2 text-xs font-semibold tracking-wide uppercase border transition-colors';
const TAB_ON = 'border-[#3b82f6] bg-[#3b82f6] text-white';
const TAB_OFF = 'border-[#1c2b47] text-[#93a6c6] hover:text-[#e8eefb]';

export function AvatarStudio() {
  const [state, setState] = useState<AvatarState>('idle');
  const [theme, setTheme] = useState<AvatarTheme>('dark');
  const [docked, setDocked] = useState(false);
  const [tuning, setTuning] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [pointCount, setPointCount] = useState(5000);
  const [coreBias, setCoreBias] = useState(0.62);
  const [copied, setCopied] = useState(false);

  const [draft, setDraft] = useState<AvatarMotion>({ ...AVATAR_MOTION.idle });
  useEffect(() => {
    setDraft({ ...AVATAR_MOTION[state] });
  }, [state]);

  const snippet = useMemo(() => {
    const body = (Object.keys(draft) as (keyof AvatarMotion)[])
      .map((k) => `    ${k}: ${Number(draft[k].toFixed(3))},`)
      .join('\n');
    return `  ${state}: {\n${body}\n  },`;
  }, [draft, state]);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const stageBg = theme === 'dark' ? 'bg-[#04070d]' : 'bg-white';

  return (
    <div className="flex h-screen w-screen flex-col bg-[#050914] text-[#e8eefb]">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[#1c2b47] px-5 py-3">
        <div className="leading-tight">
          <p className="text-sm font-semibold">Avatar studio</p>
          <p className="text-[0.7rem] text-[#93a6c6]">Tune the real component, then paste the numbers back</p>
        </div>

        <div className="flex" role="group" aria-label="Avatar state">
          {STATES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setState(s)}
              aria-pressed={state === s}
              className={`${TAB_BASE} ${state === s ? TAB_ON : TAB_OFF}`}
            >
              {AVATAR_STATE_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setDocked((d) => !d)}
            aria-pressed={docked}
            className={`${TAB_BASE} ${docked ? TAB_ON : TAB_OFF}`}
          >
            {docked ? 'Docked' : 'Centred'}
          </button>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`${TAB_BASE} ${TAB_OFF}`}
          >
            {theme === 'dark' ? 'On night' : 'On white'}
          </button>
          <Link to="/home" className={`${TAB_BASE} ${TAB_OFF} inline-flex items-center`}>
            Back
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Stage: the dock, so the centre↔corner move can be checked here too. */}
        <div className={`relative min-h-[320px] flex-1 transition-colors ${stageBg}`}>
          <AvatarDock
            mode={docked ? 'corner' : 'center'}
            state={state}
            theme={theme}
            micOn={micOn}
            onMicToggle={setMicOn}
            onMicError={setMicNote}
            pointCount={pointCount}
            coreBias={coreBias}
            motionOverride={tuning ? draft : undefined}
          >
            <div className="px-6 text-center">
              <p className={`text-sm ${theme === 'dark' ? 'text-[#93a6c6]' : 'text-slate-500'}`}>
                Tap the avatar to toggle the mic — it is <b>{micOn ? 'on' : 'off'}</b>
                {micOn ? '. Speak and the cloud breathes with you.' : '.'}
              </p>
              {micNote && <p className="mt-2 text-xs text-[#f0b45f]">{micNote}</p>}
            </div>
          </AvatarDock>

          {/* Actual-size references, so a value tuned big is checked small. */}
          <div className="pointer-events-none absolute bottom-4 left-4 flex items-end gap-5">
            {[96, 48].map((px) => (
              <div key={px} className="flex flex-col items-center gap-1.5">
                <AvatarElement
                  state={state}
                  theme={theme}
                  size={px}
                  micOn={micOn}
                  captureMic={false}
                  interactive={false}
                  pointCount={Math.round(pointCount * (px === 96 ? 0.5 : 0.35))}
                  coreBias={coreBias}
                />
                <span className={`text-[0.65rem] ${theme === 'dark' ? 'text-[#93a6c6]' : 'text-slate-400'}`}>
                  {px} px
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-[#1c2b47] bg-[#0c1424] p-4 lg:w-[340px] lg:border-t-0 lg:border-l">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={tuning}
              onChange={(e) => setTuning(e.target.checked)}
              className="mt-1 accent-[#3b82f6]"
            />
            <span>
              Live tuning
              <small className="block text-[0.7rem] leading-relaxed text-[#93a6c6]">
                {tuning
                  ? 'Sliders override the state — transitions are frozen.'
                  : 'Off: watch the real eased transitions between states.'}
              </small>
            </span>
          </label>

          <Slider
            id="pointCount"
            label="points"
            value={pointCount}
            min={500}
            max={14000}
            step={100}
            format={(v) => String(v)}
            onChange={setPointCount}
            help="Total points. Rebuilds the geometry, so it stutters as you drag."
          />
          <Slider
            id="coreBias"
            label="coreBias"
            value={coreBias}
            min={0.33}
            max={1.6}
            step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={setCoreBias}
            help="0.33 is an evenly filled ball. Higher crowds the core, thins the rim."
          />

          <hr className="border-[#1c2b47]" />
          <p className="text-[0.7rem] font-semibold tracking-[0.12em] text-[#93a6c6] uppercase">
            Motion · <span className="text-[#e8eefb]">{AVATAR_STATE_LABEL[state]}</span>
          </p>

          {(Object.keys(RANGES) as (keyof AvatarMotion)[]).map((key) => {
            const [min, max, step] = RANGES[key];
            return (
              <Slider
                key={key}
                id={key}
                label={key}
                value={draft[key]}
                min={min}
                max={max}
                step={step}
                disabled={!tuning}
                format={(v) => v.toFixed(3)}
                onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                help={FIELD_HELP[key]}
              />
            );
          })}

          <button
            type="button"
            onClick={copySnippet}
            className="rounded border border-[#3b82f6] px-3 py-2.5 text-xs font-semibold text-[#3b82f6] transition-colors hover:bg-[#3b82f6] hover:text-white"
          >
            {copied ? 'Copied' : `Copy ${state} block for avatarStates.ts`}
          </button>
          <pre className="overflow-x-auto rounded border border-[#1c2b47] bg-[#050914] p-2.5 font-mono text-[0.65rem] leading-relaxed text-[#93a6c6]">
            {snippet}
          </pre>
        </aside>
      </div>
    </div>
  );
}

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  format: (value: number) => string;
  onChange: (value: number) => void;
  help: string;
}

function Slider({ id, label, value, min, max, step, disabled, format, onChange, help }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="font-mono text-xs">
          {label}
        </label>
        <output className="font-mono text-[0.7rem] tabular-nums text-[#3b82f6]">{format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#3b82f6] disabled:opacity-35"
      />
      <small className="text-[0.65rem] leading-snug text-[#93a6c6]">{help}</small>
    </div>
  );
}

export default AvatarStudio;
