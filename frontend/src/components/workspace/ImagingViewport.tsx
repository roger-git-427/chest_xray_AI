import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { StudyMetadata } from '../../api/client';
import {
  buildViewportFilter,
  type WindowPreset,
} from '../../lib/viewportWindowLevel';
import { es } from '../../i18n/es';

type Props = {
  imageUrl: string | null;
  studyId?: string;
  loading?: boolean;
  sourceKind?: string;
  screenedAt?: string | null;
  metadata?: StudyMetadata | null;
  priorImageUrl?: string | null;
  priorLabel?: string;
  priorCount?: number;
  isDicom?: boolean;
  onPrevStudy?: () => void;
  onNextStudy?: () => void;
  canPrevStudy?: boolean;
  canNextStudy?: boolean;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

const WINDOW_PRESETS: { id: WindowPreset; label: string }[] = [
  { id: 'default', label: es.windowDefault },
  { id: 'lung', label: es.windowLung },
  { id: 'bone', label: es.windowBone },
  { id: 'mediastinum', label: es.windowMediastinum },
];

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

function formatScreenedAt(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

function ToolBtn({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md border text-slate-300 transition disabled:opacity-30 ${
        active
          ? 'border-teal-500/50 bg-teal-500/20 text-teal-300'
          : 'border-white/10 bg-black/50 hover:border-white/20 hover:bg-black/70'
      }`}
    >
      {children}
    </button>
  );
}

export function ImagingViewport({
  imageUrl,
  studyId,
  loading,
  sourceKind,
  screenedAt,
  metadata,
  priorImageUrl,
  priorLabel,
  priorCount = 0,
  isDicom = false,
  onPrevStudy,
  onNextStudy,
  canPrevStudy,
  canNextStudy,
}: Props) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [inverted, setInverted] = useState(false);
  const [windowPreset, setWindowPreset] = useState<WindowPreset>('default');
  const [comparePrior, setComparePrior] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setInverted(false);
    setWindowPreset('default');
  }, []);

  useEffect(() => {
    resetView();
    setComparePrior(false);
  }, [imageUrl, resetView]);

  const zoomBy = (delta: number) => {
    setScale((s) => clampScale(s + delta));
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !imageUrl) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setScale((prev) => clampScale(prev + delta));
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [imageUrl]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!imageUrl || scale <= 1) return;
    setDragging(true);
    dragOrigin.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPan({
      x: dragOrigin.current.panX + (e.clientX - dragOrigin.current.x),
      y: dragOrigin.current.panY + (e.clientY - dragOrigin.current.y),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const showNav = Boolean(onPrevStudy && onNextStudy);
  const imageFilter = buildViewportFilter(windowPreset, inverted);
  const screenedLabel = formatScreenedAt(screenedAt);

  return (
    <div className="viewport viewport-focus animate-in-delay-1">
      <div className="viewport-corner viewport-corner-tl" />
      <div className="viewport-corner viewport-corner-tr" />
      <div className="viewport-corner viewport-corner-bl" />
      <div className="viewport-corner viewport-corner-br" />
      {imageUrl && <div className="viewport-scanline" aria-hidden />}
      {imageUrl && (
        <>
          <span className="viewport-orient viewport-orient-l" title={es.viewportOrientNote}>
            {es.viewportOrientLeft}
          </span>
          <span className="viewport-orient viewport-orient-r" title={es.viewportOrientNote}>
            {es.viewportOrientRight}
          </span>
        </>
      )}

      <div className="absolute left-0 right-0 top-0 z-30 border-b border-white/5 bg-gradient-to-b from-black/85 to-black/60">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-400/80">
              {es.viewportLabel}
            </p>
            <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
              {studyId ?? '—'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {showNav && (
              <>
                <ToolBtn
                  label={es.viewerPrevStudy}
                  onClick={() => onPrevStudy?.()}
                  disabled={!canPrevStudy}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </ToolBtn>
                <ToolBtn
                  label={es.viewerNextStudy}
                  onClick={() => onNextStudy?.()}
                  disabled={!canNextStudy}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </ToolBtn>
                <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
              </>
            )}
            {imageUrl && (
              <>
                <ToolBtn label={es.viewerZoomOut} onClick={() => zoomBy(-0.25)} disabled={loading}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 12h-15" />
                  </svg>
                </ToolBtn>
                <ToolBtn label={es.viewerZoomIn} onClick={() => zoomBy(0.25)} disabled={loading}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </ToolBtn>
                <ToolBtn label={es.viewerZoomFit} onClick={resetView} disabled={loading}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5M3.75 20.25v-4.5m0 4.5h4.5M20.25 3.75h-4.5m4.5 0v4.5M20.25 20.25h-4.5m0 4.5v-4.5" />
                  </svg>
                </ToolBtn>
                <ToolBtn
                  label={es.viewerZoom100}
                  onClick={() => {
                    setScale(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  disabled={loading}
                >
                  <span className="text-[10px] font-bold pro-tabular">1:1</span>
                </ToolBtn>
                <ToolBtn
                  label={es.viewerInvert}
                  onClick={() => setInverted((v) => !v)}
                  disabled={loading}
                  active={inverted}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L12 21l-7.016-3.675a2.25 2.25 0 01-1.244-2.013v-2.927a2.25 2.25 0 00-.659-1.591L2.659 7.409A2.25 2.25 0 012 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                  </svg>
                </ToolBtn>
                <ToolBtn label={es.viewerReset} onClick={resetView} disabled={loading}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                </ToolBtn>
              </>
            )}
          </div>
        </div>
        {imageUrl && priorImageUrl && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-4 py-2">
            <button
              type="button"
              onClick={() => setComparePrior((v) => !v)}
              className={`viewport-window-btn ${comparePrior ? 'viewport-window-btn-active' : ''}`}
            >
              {comparePrior ? es.priorCompareOff : es.priorCompare}
            </button>
            <span className="text-[10px] text-slate-500">
              {es.priorCount.replace('{n}', String(priorCount))}
            </span>
          </div>
        )}
        {imageUrl && (
          <div className="viewport-window-bar flex flex-wrap items-center gap-2 border-t border-white/5 px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {es.windowLevelLabel}
            </span>
            <div className="viewport-window-seg">
              {WINDOW_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setWindowPreset(p.id)}
                  className={`viewport-window-btn ${windowPreset === p.id ? 'viewport-window-btn-active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        ref={viewportRef}
        className={`flex min-h-[min(50vh,520px)] items-center justify-center overflow-hidden p-4 pb-12 pt-[7.25rem] lg:min-h-[min(40vh,380px)] lg:pt-[7.25rem] xl:min-h-[min(68vh,600px)] xl:pt-[7.5rem] ${
          scale > 1 && imageUrl ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-400" />
            <p className="text-sm text-slate-400">{es.running}</p>
          </div>
        ) : imageUrl ? (
          <div
            className={`flex h-full w-full items-center justify-center gap-2 ${
              comparePrior && priorImageUrl ? 'flex-row' : ''
            }`}
          >
            <div className={comparePrior && priorImageUrl ? 'flex-1 text-center' : 'w-full'}>
              {comparePrior && priorImageUrl && (
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {es.source}
                </p>
              )}
              <img
                src={imageUrl}
                alt="Radiografía de tórax"
                draggable={false}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  filter: imageFilter,
                  transition: dragging ? 'none' : 'filter 0.15s ease',
                }}
                className="mx-auto max-h-[min(65vh,580px)] w-full select-none object-contain drop-shadow-[0_0_40px_rgba(0,0,0,0.8)]"
              />
            </div>
            {comparePrior && priorImageUrl && (
              <div className="flex-1 border-l border-white/10 pl-2 text-center">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {es.priorStudyLabel}
                  {priorLabel ? ` · ${priorLabel}` : ''}
                </p>
                <img
                  src={priorImageUrl}
                  alt="Estudio previo"
                  draggable={false}
                  style={{ filter: imageFilter }}
                  className="mx-auto max-h-[min(65vh,580px)] w-full select-none object-contain opacity-90"
                />
              </div>
            )}
          </div>
        ) : isDicom ? (
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-teal-500/25 bg-teal-500/10">
              <span className="font-mono text-sm font-bold text-teal-400">DICOM</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">{es.dicomPreviewPending}</p>
          </div>
        ) : (
          <div className="flex max-w-xs flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]">
              <svg
                className="h-10 w-10 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                />
              </svg>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">{es.previewEmpty}</p>
          </div>
        )}
      </div>

      {imageUrl && (sourceKind || screenedLabel || metadata) && (
        <div className="viewport-meta-bar absolute bottom-0 left-0 right-0 z-20 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/5 bg-black/75 px-4 py-2 text-[10px] text-slate-500 backdrop-blur-sm">
          {metadata?.patient_id && (
            <span>
              {es.studyMetaPatient}: <span className="text-slate-400">{metadata.patient_id}</span>
            </span>
          )}
          {metadata?.age && (
            <span>
              {es.studyMetaAge}: <span className="text-slate-400">{metadata.age}</span>
            </span>
          )}
          {metadata?.gender && (
            <span>
              {es.studyMetaGender}: <span className="text-slate-400">{metadata.gender}</span>
            </span>
          )}
          {metadata?.view_position && (
            <span>
              {es.studyMetaView}: <span className="text-slate-400">{metadata.view_position}</span>
            </span>
          )}
          {metadata?.follow_up != null && (
            <span>
              {es.studyMetaFollowUp}: <span className="pro-tabular text-slate-400">{metadata.follow_up}</span>
            </span>
          )}
          {sourceKind && (
            <span>
              {es.studyMetaSource}: <span className="text-slate-400">{sourceKind}</span>
            </span>
          )}
          {screenedLabel && (
            <span>
              {es.pdfScreenedAt}: <span className="pro-tabular text-slate-400">{screenedLabel}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
