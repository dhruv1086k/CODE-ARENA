import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_PAD = 12;
const GAP = 8;
const PLACEMENT_ORDER = ['top', 'bottom', 'right', 'left'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getViewportBoundary() {
  return {
    top: VIEWPORT_PAD,
    left: VIEWPORT_PAD,
    right: window.innerWidth - VIEWPORT_PAD,
    bottom: window.innerHeight - VIEWPORT_PAD,
  };
}

/** Pick placement with least overflow, then clamp into the viewport. */
export function computeTooltipPosition(anchor, tooltip, boundary = getViewportBoundary()) {
  const candidates = PLACEMENT_ORDER.map((placement) => {
    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = anchor.top - tooltip.height - GAP;
        left = anchor.left + anchor.width / 2 - tooltip.width / 2;
        break;
      case 'bottom':
        top = anchor.bottom + GAP;
        left = anchor.left + anchor.width / 2 - tooltip.width / 2;
        break;
      case 'left':
        top = anchor.top + anchor.height / 2 - tooltip.height / 2;
        left = anchor.left - tooltip.width - GAP;
        break;
      case 'right':
        top = anchor.top + anchor.height / 2 - tooltip.height / 2;
        left = anchor.right + GAP;
        break;
      default:
        break;
    }

    const overflow =
      Math.max(0, boundary.top - top)
      + Math.max(0, top + tooltip.height - boundary.bottom)
      + Math.max(0, boundary.left - left)
      + Math.max(0, left + tooltip.width - boundary.right);

    return { placement, top, left, overflow };
  });

  candidates.sort((a, b) => {
    if (a.overflow !== b.overflow) return a.overflow - b.overflow;
    return PLACEMENT_ORDER.indexOf(a.placement) - PLACEMENT_ORDER.indexOf(b.placement);
  });

  const best = candidates[0];
  const top = clamp(
    best.top,
    boundary.top,
    boundary.bottom - tooltip.height,
  );
  const left = clamp(
    best.left,
    boundary.left,
    boundary.right - tooltip.width,
  );

  return { top, left, placement: best.placement };
}

function TooltipArrow({ placement, anchor, tipRect }) {
  const size = 6;
  const base = 'absolute w-2 h-2 bg-[#1f2937] border-[#374151] rotate-45';

  if (placement === 'top' || placement === 'bottom') {
    const anchorCenter = anchor.left + anchor.width / 2;
    const arrowLeft = clamp(anchorCenter - tipRect.left - size, 10, tipRect.width - 10);
    return (
      <div
        className={base}
        style={{
          left: arrowLeft,
          ...(placement === 'top'
            ? { bottom: -size + 1, borderRightWidth: 1, borderBottomWidth: 1 }
            : { top: -size + 1, borderLeftWidth: 1, borderTopWidth: 1 }),
        }}
      />
    );
  }

  const anchorCenter = anchor.top + anchor.height / 2;
  const arrowTop = clamp(anchorCenter - tipRect.top - size, 10, tipRect.height - 10);
  return (
    <div
      className={base}
      style={{
        top: arrowTop,
        ...(placement === 'left'
          ? { right: -size + 1, borderRightWidth: 1, borderTopWidth: 1 }
          : { left: -size + 1, borderLeftWidth: 1, borderBottomWidth: 1 }),
      }}
    />
  );
}

export function HeatmapTooltip({ anchorEl, cell, formatDur }) {
  const tooltipRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!anchorEl || !cell) {
      setPos(null);
      return;
    }

    const update = () => {
      const tip = tooltipRef.current;
      if (!tip) return;
      const anchor = anchorEl.getBoundingClientRect();
      const rect = tip.getBoundingClientRect();
      const next = computeTooltipPosition(anchor, rect);
      setPos({ ...next, anchor, tipRect: rect });
    };

    update();
    const ro = new ResizeObserver(update);
    if (tooltipRef.current) ro.observe(tooltipRef.current);

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorEl, cell]);

  if (!anchorEl || !cell) return null;

  const slideClass =
    pos?.placement === 'top' ? 'translate-y-0.5' :
    pos?.placement === 'bottom' ? '-translate-y-0.5' :
    pos?.placement === 'left' ? 'translate-x-0.5' : '-translate-x-0.5';

  return createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      className={`fixed z-[10000] pointer-events-none transition-[opacity,transform] duration-200 ease-out ${
        pos ? `opacity-100 ${slideClass}` : 'opacity-0 translate-y-1'
      }`}
      style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999, visibility: 'hidden' }}
    >
      <div className="relative bg-[#1f2937] border border-[#374151] text-xs text-white rounded-lg px-3 py-2 shadow-2xl shadow-black/40 min-w-[10rem]">
        {pos && (
          <TooltipArrow placement={pos.placement} anchor={pos.anchor} tipRect={pos.tipRect} />
        )}
        <p className="font-medium text-white">
          {cell.date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        {cell.isFuture ? (
          <p className="text-gray-500 mt-1">Upcoming</p>
        ) : (
          <>
            <p className="text-gray-400 mt-1">
              {cell.count} session{cell.count !== 1 ? 's' : ''}
            </p>
            <p className="text-[#22c55e] mt-0.5 font-medium">{formatDur(cell.totalStudyTime)} studied</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
