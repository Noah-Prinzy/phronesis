// Avatar_Element/preview/AvatarLab.tsx
//
// The tuning lab. This is the "prototyping tool" — instead of designing the
// avatar in a separate app and trying to port the result, you tune the real
// component, running the real shader, and copy the numbers straight back
// into src/avatarStates.ts.
//
// Nothing in here ships. The lab imports the element the same way your app
// will, so if it works here it works there.

import { useEffect, useMemo, useState } from 'react';
import { AvatarElement } from '../../frontend/src/components/AvatarElement/AvatarElement';
import {
  AVATAR_MOTION,
  AVATAR_STATE_LABEL,
  type AvatarMotion,
  type AvatarState,
} from '../../frontend/src/components/AvatarElement/avatarStates';
import type { AvatarTheme } from '../../frontend/src/components/AvatarElement/avatarShader';

const STATES: AvatarState[] = ['idle', 'listening', 'thinking', 'responding'];

/** Slider bounds per motion field. Ranges are generous on purpose — the
 *  interesting settings are usually just outside what looks safe. */
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
  expansion: 'Cloud radius. <1 contracts (concentration), >1 opens (attention).',
  turbulence: 'How far each point wanders from home.',
  churn: 'Speed of the noise field the points drift through.',
  spin: 'Whole-cloud rotation, rad/s.',
  pulse: 'Strength of the outward wave — the speaking ripple.',
  pulseSpeed: 'How fast that wave travels core to rim.',
  twinkle: 'Per-point brightness flicker.',
  pointSize: 'Base point size in px at 320px render height.',
  coreGlow: 'Intensity of the glow at the centre.',
  micResponse: 'How much live mic amplitude moves the cloud.',
};

export function AvatarLab() {
  const [state, setState] = useState<AvatarState>('idle');
  const [theme, setTheme] = useState<AvatarTheme>('dark');
  const [pointCount, setPointCount] = useState(5000);
  const [coreBias, setCoreBias] = useState(0.62);
  const [tuning, setTuning] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Slider values, seeded from whichever state is selected.
  const [draft, setDraft] = useState<AvatarMotion>({ ...AVATAR_MOTION.idle });
  useEffect(() => {
    setDraft({ ...AVATAR_MOTION[state] });
  }, [state]);

  const override = tuning ? draft : undefined;

  const snippet = useMemo(() => {
    const body = (Object.keys(draft) as (keyof AvatarMotion)[])
      .map((k) => `    ${k}: ${Number(draft[k].toFixed(3))},`)
      .join('\n');
    return `  ${state}: {\n${body}\n  },`;
  }, [draft, state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`lab ${isDark ? 'lab--dark' : 'lab--light'}`}>
      <header className="lab__bar">
        <div className="lab__brand">
          <strong>Avatar_Element</strong>
          <span>tuning lab · not connected to the app</span>
        </div>

        <div className="lab__group" role="group" aria-label="Avatar state">
          {STATES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setState(s)}
              aria-pressed={state === s}
              className={state === s ? 'is-on' : ''}
            >
              {AVATAR_STATE_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="lab__group">
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label="Toggle page theme"
          >
            {isDark ? 'On night' : 'On white'}
          </button>
        </div>
      </header>

      <main className="lab__stage">
        <div className="lab__hero">
          <AvatarElement
            state={state}
            size={360}
            theme={theme}
            micOn={micOn}
            onMicToggle={setMicOn}
            onMicError={setMicNote}
            pointCount={pointCount}
            coreBias={coreBias}
            motionOverride={override}
          />
          <p className="lab__caption">
            360&nbsp;px · <b>tap the avatar</b> to toggle the mic
            <br />
            mic is <b>{micOn ? 'on' : 'off'}</b>
            {micOn ? ' — speak and the cloud breathes with you' : ''}
          </p>
          {micNote && <p className="lab__warn">{micNote}</p>}
        </div>

        <div className="lab__sizes">
          <div>
            <AvatarElement
              state={state}
              size={96}
              theme={theme}
              micOn={micOn}
              captureMic={false}
              interactive={false}
              pointCount={Math.round(pointCount * 0.5)}
              coreBias={coreBias}
              motionOverride={override}
            />
            <span>96 px</span>
          </div>
          <div>
            <AvatarElement
              state={state}
              size={48}
              theme={theme}
              micOn={micOn}
              captureMic={false}
              interactive={false}
              pointCount={Math.round(pointCount * 0.35)}
              coreBias={coreBias}
              motionOverride={override}
            />
            <span>48 px · docked</span>
          </div>
        </div>
      </main>

      <aside className="lab__panel">
        <label className="lab__switch">
          <input
            type="checkbox"
            checked={tuning}
            onChange={(e) => setTuning(e.target.checked)}
          />
          <span>
            Live tuning
            <small>
              {tuning
                ? 'sliders override the state — transitions are frozen'
                : 'off: watch the real eased transitions between states'}
            </small>
          </span>
        </label>

        <div className="lab__field">
          <div className="lab__row">
            <label htmlFor="pointCount">points</label>
            <output>{pointCount}</output>
          </div>
          <input
            id="pointCount"
            type="range"
            min={500}
            max={14000}
            step={100}
            value={pointCount}
            onChange={(e) => setPointCount(Number(e.target.value))}
          />
          <small>Total points. Rebuilds the geometry, so it stutters as you drag.</small>
        </div>

        <div className="lab__field">
          <div className="lab__row">
            <label htmlFor="coreBias">coreBias</label>
            <output>{coreBias.toFixed(2)}</output>
          </div>
          <input
            id="coreBias"
            type="range"
            min={0.33}
            max={1.6}
            step={0.01}
            value={coreBias}
            onChange={(e) => setCoreBias(Number(e.target.value))}
          />
          <small>0.33 is an evenly filled ball. Higher crowds the core and thins the rim.</small>
        </div>

        <hr />

        <p className="lab__panelHead">
          Motion · <b>{AVATAR_STATE_LABEL[state]}</b>
        </p>

        {(Object.keys(RANGES) as (keyof AvatarMotion)[]).map((key) => {
          const [min, max, step] = RANGES[key];
          return (
            <div className="lab__field" key={key}>
              <div className="lab__row">
                <label htmlFor={key}>{key}</label>
                <output>{draft[key].toFixed(3)}</output>
              </div>
              <input
                id={key}
                type="range"
                min={min}
                max={max}
                step={step}
                value={draft[key]}
                disabled={!tuning}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))
                }
              />
              <small>{FIELD_HELP[key]}</small>
            </div>
          );
        })}

        <button type="button" className="lab__copy" onClick={copy}>
          {copied ? 'Copied' : `Copy ${state} block for avatarStates.ts`}
        </button>
        <pre className="lab__snippet">{snippet}</pre>
      </aside>
    </div>
  );
}

export default AvatarLab;
