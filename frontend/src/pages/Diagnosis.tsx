// frontend/src/pages/Diagnosis.tsx

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AvatarElement from '../components/AvatarElement/AvatarElement';
import type { AvatarState } from '../components/AvatarElement/avatarStates';
import CarHologram from '../components/CarHologram/CarHologram';
import type { Urgency } from '../components/CarHologram/urgencyColors';
import StarfieldBackground from '../components/StarfieldBackground';
import { useVoice } from '../components/Voice/VoiceProvider';
import { useAuth } from '../context/AuthContext';
import { getStoredCarProfile } from '../carProfileStorage';
import { type DiagnosticReport, type UrgencyLevel, setStoredDiagnosticReport } from '../diagnosisStorage';
import { useMockObd } from '../hooks/useMockObd';
import { addStoredNotification } from '../notificationStorage';

const FALLBACK_ERROR = "Sorry, I couldn't run that diagnosis just now. Check the backend is reachable and try again.";

// Empty by default — see Home.tsx for the full explanation of this pattern.
const API_URL = import.meta.env.VITE_API_URL ?? '';

function urgencyLevelToHologram(level: UrgencyLevel): Urgency {
  if (level === 'critical') return 'critical';
  if (level === 'high' || level === 'medium') return 'warning';
  return 'healthy';
}

export function Diagnosis() {
  const navigate = useNavigate();
  const location = useLocation();
  const { speak, isSpeaking } = useVoice();
  const { getIdToken } = useAuth();
  const obd = useMockObd();

  const [symptomText, setSymptomText] = useState(
    () => (location.state as { symptomText?: string } | null)?.symptomText ?? '',
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DiagnosticReport | null>(null);

  useEffect(() => {
    if (report?.urgencyLevel === 'critical') {
      addStoredNotification({
        type: 'alert',
        title: 'Critical issue detected',
        message: report.issue,
        relatedData: { reportCreatedAt: report.createdAt },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = symptomText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const carProfile = getStoredCarProfile();
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_URL}/api/diagnosis`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          symptomText: trimmed,
          carProfile: carProfile ?? undefined,
          obdSnapshot: obd.snapshot,
        }),
      });
      if (!response.ok) throw new Error(`Backend responded with ${response.status}`);

      const data: { report: Omit<DiagnosticReport, 'createdAt'> } = await response.json();
      const fullReport: DiagnosticReport = { ...data.report, createdAt: new Date().toISOString() };
      setReport(fullReport);
      setStoredDiagnosticReport(fullReport);

      speak(
        `${fullReport.issue}. Likely cause: ${fullReport.rootCause}. This is a ${fullReport.urgencyLevel} priority issue — ${fullReport.timeline}.`,
      );
    } catch (err) {
      console.error('Diagnosis request failed:', err);
      setError(FALLBACK_ERROR);
    } finally {
      setIsSending(false);
    }
  }

  const hologramUrgency: Urgency = report ? urgencyLevelToHologram(report.urgencyLevel) : obd.urgency;
  const avatarState: AvatarState = isSending ? 'thinking' : isSpeaking ? 'responding' : 'idle';

  return (
    <div className="relative flex h-screen w-screen flex-col bg-[#050914] px-6 py-8">
      <StarfieldBackground theme="dark" />

      <div className="mb-6 flex w-full max-w-4xl items-center">
        <Link to="/home" aria-label="Back to chat" className="text-[#e8eefb]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="mx-auto text-lg font-bold text-[#e8eefb]">Diagnosis</h1>
      </div>

      <div className="mx-auto grid w-full max-w-4xl flex-1 grid-cols-1 gap-8 overflow-y-auto md:grid-cols-2">
        <div className="flex flex-col items-center gap-4">
          <CarHologram urgency={hologramUrgency} size="min(70vw, 320px)" />

          <div className="w-full max-w-xs rounded-lg border border-[#1c2b47] bg-[#0c1424] p-4 text-xs text-[#93a6c6]">
            <p className="mb-2 font-semibold tracking-wide text-[#60a5fa] uppercase">Simulated OBD Data</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <span>RPM</span>
              <span className="text-right text-[#e8eefb]">{obd.snapshot.rpm}</span>
              <span>Coolant</span>
              <span className="text-right text-[#e8eefb]">{obd.snapshot.temperature}°C</span>
              <span>Battery</span>
              <span className="text-right text-[#e8eefb]">{obd.snapshot.batteryVoltage}V</span>
              <span>DTC Codes</span>
              <span className="text-right text-[#e8eefb]">{obd.snapshot.dtcCodes.join(', ') || 'None'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-xs font-semibold tracking-wide text-[#60a5fa] uppercase" htmlFor="symptoms">
              Describe what you're noticing
            </label>
            <textarea
              id="symptoms"
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              rows={5}
              placeholder="e.g. Knocking sound from the engine when accelerating uphill"
              disabled={isSending}
              className="rounded-lg border border-[#3b82f6]/45 bg-transparent px-4 py-3 text-sm text-[#e8eefb] placeholder:text-[#93a6c6]/70 outline-none focus:border-[#3b82f6] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSending || !symptomText.trim()}
              className="rounded-lg bg-[#3b82f6] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#2f6fd6] disabled:opacity-60"
            >
              {isSending ? 'Running Diagnosis...' : 'Run Diagnosis'}
            </button>
            {error && <p className="text-xs text-[#f0b45f]">{error}</p>}
          </form>

          {report && (
            <div className="flex flex-col gap-3 rounded-lg border border-[#1c2b47] bg-[#0c1424] p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#e8eefb]">{report.issue}</h2>
                <span
                  className="rounded-full px-2 py-1 text-[10px] font-bold tracking-wide uppercase"
                  style={{ color: '#050914', backgroundColor: report.urgencyLevel === 'critical' ? '#ef4444' : '#f0b45f' }}
                >
                  {report.urgencyLevel}
                </span>
              </div>
              <p className="text-xs text-[#93a6c6]">{report.rootCause}</p>
              <p className="text-xs text-[#93a6c6]">
                Estimated cost: ${report.costEstimateLow}-${report.costEstimateHigh} · {report.timeline}
              </p>
              <button
                type="button"
                onClick={() => navigate('/solutions')}
                className="mt-1 self-start rounded-lg border border-[#3b82f6]/40 px-4 py-2 text-sm font-semibold text-[#e8eefb] transition-colors hover:bg-[#3b82f6]/15"
              >
                View Solutions
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="absolute right-6 bottom-6">
        <AvatarElement state={avatarState} theme="dark" size={64} interactive={false} captureMic={false} pointCount={2400} />
      </div>
    </div>
  );
}

export default Diagnosis;
