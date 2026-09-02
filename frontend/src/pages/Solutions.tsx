// frontend/src/pages/Solutions.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AvatarElement from '../components/AvatarElement/AvatarElement';
import { URGENCY_COLORS, type Urgency } from '../components/CarHologram/urgencyColors';
import StarfieldBackground from '../components/StarfieldBackground';
import { useVoice } from '../components/Voice/VoiceProvider';
import { getStoredCarProfile } from '../carProfileStorage';
import {
  type DiagnosticReport,
  type UrgencyLevel,
  getStoredDiagnosticReport,
  setStoredDiagnosticReport,
} from '../diagnosisStorage';
import { MECHANICS, type Mechanic } from '../data/mechanics';

const MAX_RATING_PHOTOS = 2;

function urgencyLevelToHologram(level: UrgencyLevel): Urgency {
  if (level === 'critical') return 'critical';
  if (level === 'high' || level === 'medium') return 'warning';
  return 'healthy';
}

function mapsDeepLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function rankedMechanics(report: DiagnosticReport): Mechanic[] {
  const matching = MECHANICS.filter((m) => m.specialties.includes(report.category));
  const pool = matching.length > 0 ? matching : MECHANICS;
  return [...pool].sort((a, b) => b.avgRating - a.avgRating).slice(0, 3);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Solutions() {
  const { speak } = useVoice();
  const [report, setReport] = useState<DiagnosticReport | null>(() => getStoredDiagnosticReport());
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const spokenRef = useRef(false);

  const mechanics = useMemo(() => (report ? rankedMechanics(report) : []), [report]);
  const carProfile = getStoredCarProfile();

  useEffect(() => {
    if (!report || spokenRef.current) return;
    spokenRef.current = true;
    const top = mechanics[0];
    speak(
      top
        ? `Here's your report for ${report.issue}. The top recommended shop is ${top.name}, rated ${top.avgRating} stars.`
        : `Here's your report for ${report.issue}.`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  function handleBook() {
    if (!report) return;
    const next = { ...report, bookedAt: new Date().toISOString() };
    setReport(next);
    setStoredDiagnosticReport(next);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_RATING_PHOTOS);
    const dataUrls = await Promise.all(files.map(fileToDataUrl));
    setPhotos(dataUrls);
  }

  function handleSubmitRating() {
    if (!report || stars === 0) return;
    const next: DiagnosticReport = {
      ...report,
      resolvedAt: new Date().toISOString(),
      rating: { stars, comment: comment.trim() || undefined, photoDataUrls: photos.length ? photos : undefined },
    };
    setReport(next);
    setStoredDiagnosticReport(next);
  }

  if (!report) {
    return (
      <div className="relative flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#050914] px-6 text-center">
        <StarfieldBackground theme="dark" />
        <p className="text-sm text-[#93a6c6]">No diagnosis report yet.</p>
        <Link
          to="/diagnosis"
          className="rounded-lg bg-[#3b82f6] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#2f6fd6]"
        >
          Run a Diagnosis
        </Link>
      </div>
    );
  }

  const urgencyColor = URGENCY_COLORS[urgencyLevelToHologram(report.urgencyLevel)];
  const vehicleLine = carProfile ? `${carProfile.year} ${carProfile.make} ${carProfile.model}` : 'Your vehicle';

  return (
    <div className="relative flex h-screen w-screen flex-col bg-[#050914] px-6 py-8">
      <StarfieldBackground theme="dark" />

      <div className="mb-6 flex w-full max-w-2xl items-center self-center">
        <Link to="/diagnosis" aria-label="Back to diagnosis" className="text-[#e8eefb]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="mx-auto text-lg font-bold text-[#e8eefb]">Solutions</h1>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 overflow-y-auto pb-24">
        {/* Report header */}
        <section className="rounded-lg border border-[#1c2b47] bg-[#0c1424] p-5">
          <p className="text-xs font-semibold tracking-wide text-[#60a5fa] uppercase">Phronesis Diagnostic Report</p>
          <h2 className="mt-1 text-lg font-bold text-[#e8eefb]">{vehicleLine}</h2>
          <p className="mt-2 text-sm text-[#e8eefb]">{report.issue}</p>
          {report.detectedCodes.length > 0 && (
            <p className="mt-1 text-xs text-[#93a6c6]">Detected: {report.detectedCodes.join(', ')}</p>
          )}
          <p className="mt-1 text-xs text-[#93a6c6]">Confidence: {report.confidence}%</p>
        </section>

        {/* Diagnosis */}
        <section className="rounded-lg border border-[#1c2b47] bg-[#0c1424] p-5">
          <p className="text-xs font-semibold tracking-wide text-[#60a5fa] uppercase">Diagnosis</p>
          <p className="mt-2 text-sm text-[#e8eefb]">Root Cause: {report.rootCause}</p>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase"
              style={{ color: '#050914', backgroundColor: urgencyColor }}
            >
              {report.urgencyLevel}
            </span>
            <span className="text-xs text-[#93a6c6]">{report.timeline}</span>
          </div>
        </section>

        {/* Repair solutions */}
        <section className="rounded-lg border border-[#1c2b47] bg-[#0c1424] p-5">
          <p className="mb-3 text-xs font-semibold tracking-wide text-[#60a5fa] uppercase">Repair Solutions</p>
          <div className="flex flex-col gap-2">
            {report.solutions.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-[#1c2b47] px-3 py-2">
                <span className="text-sm text-[#e8eefb]">
                  Option {i + 1}: {s.option}
                </span>
                <span className="text-sm text-[#93a6c6]">
                  ${s.costLow}-${s.costHigh}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended mechanics */}
        <section className="rounded-lg border border-[#1c2b47] bg-[#0c1424] p-5">
          <p className="mb-3 text-xs font-semibold tracking-wide text-[#60a5fa] uppercase">Recommended Mechanics</p>
          <div className="flex flex-col gap-3">
            {mechanics.map((m) => (
              <div key={m.id} className="rounded-lg border border-[#1c2b47] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#e8eefb]">
                    {m.name} ({m.avgRating}★, {m.numReviews})
                  </span>
                  <span className="text-xs text-[#93a6c6]">
                    est. ${report.costEstimateLow}-${report.costEstimateHigh}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#93a6c6]">
                  {m.address} · {m.hours}
                </p>
                <div className="mt-2 flex gap-2">
                  <a
                    href={mapsDeepLink(m.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[#3b82f6]/40 px-3 py-1.5 text-xs font-semibold text-[#e8eefb] transition-colors hover:bg-[#3b82f6]/15"
                  >
                    Get Directions
                  </a>
                  <a
                    href={`tel:${m.phone}`}
                    className="rounded-lg border border-[#3b82f6]/40 px-3 py-1.5 text-xs font-semibold text-[#e8eefb] transition-colors hover:bg-[#3b82f6]/15"
                  >
                    Contact
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleBook}
              disabled={Boolean(report.bookedAt)}
              className="rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2f6fd6] disabled:opacity-60"
            >
              {report.bookedAt ? 'Booked' : 'Book Service'}
            </button>
          </div>
        </section>

        {/* Post-service rating */}
        {report.bookedAt && !report.rating && (
          <section className="rounded-lg border border-[#1c2b47] bg-[#0c1424] p-5">
            <p className="mb-3 text-xs font-semibold tracking-wide text-[#60a5fa] uppercase">
              Mark Resolved &amp; Rate
            </p>
            <div className="mb-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  aria-label={`${n} stars`}
                  className={`text-2xl ${n <= stars ? 'text-[#f0b45f]' : 'text-[#1c2b47]'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="How did it go? (optional)"
              className="mb-3 w-full rounded-lg border border-[#3b82f6]/45 bg-transparent px-4 py-3 text-sm text-[#e8eefb] placeholder:text-[#93a6c6]/70 outline-none focus:border-[#3b82f6]"
            />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="mb-3 text-xs text-[#93a6c6]"
            />
            <button
              type="button"
              onClick={handleSubmitRating}
              disabled={stars === 0}
              className="rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2f6fd6] disabled:opacity-60"
            >
              Submit Rating
            </button>
          </section>
        )}

        {report.rating && (
          <section className="rounded-lg border border-[#1c2b47] bg-[#0c1424] p-5">
            <p className="text-xs font-semibold tracking-wide text-[#60a5fa] uppercase">Resolved</p>
            <p className="mt-2 text-sm text-[#e8eefb]">Rated {report.rating.stars}★</p>
            {report.rating.comment && <p className="mt-1 text-xs text-[#93a6c6]">{report.rating.comment}</p>}
          </section>
        )}
      </div>

      <div className="absolute right-6 bottom-6">
        <AvatarElement state="idle" theme="dark" size={64} interactive={false} captureMic={false} pointCount={2400} />
      </div>
    </div>
  );
}

export default Solutions;
