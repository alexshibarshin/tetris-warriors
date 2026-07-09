import React, { useId } from 'react';
import { WARRIOR_TEXT_COLORS } from '../config';

export function WarriorVisual({
  colorIdx,
  lifetimeProgress,
  className = '',
}: {
  colorIdx: number;
  lifetimeProgress?: number;
  className?: string;
}) {
  const textColor = WARRIOR_TEXT_COLORS[colorIdx] || 'text-gray-500';
  const torsoClipId = useId();
  const clampedLifetimeProgress =
    lifetimeProgress === undefined ? undefined : Math.max(0, Math.min(1, lifetimeProgress));
  const torsoRingRadius = 16;
  const torsoRingCircumference = 2 * Math.PI * torsoRingRadius;
  const torsoRingOffset =
    clampedLifetimeProgress === undefined
      ? torsoRingCircumference
      : torsoRingCircumference * (1 - clampedLifetimeProgress);

  return (
    <div className={`flex items-center justify-center ${textColor} ${className}`}>
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_4px_5px_rgba(0,0,0,0.7)] overflow-visible">
        <defs>
          <clipPath id={torsoClipId}>
            <path d="M 28,45 C 28,25 72,25 72,45 L 94,95 A 44 14 0 0 1 8 92 Z" />
          </clipPath>
        </defs>
        <g stroke="rgba(0,0,0,0.6)" strokeWidth="5" strokeLinejoin="round">
          {/* Body */}
          <path d="M 28,45 C 28,25 72,25 72,45 L 94,95 A 44 14 0 0 1 8 92 Z" fill="currentColor" />
          {/* Head */}
          <circle cx="50" cy="28" r="20" fill="#fde68a" />
        </g>
        {clampedLifetimeProgress !== undefined && (
          <g clipPath={`url(#${torsoClipId})`}>
            <circle cx="50" cy="66" r="20" fill="rgba(255,255,255,0.12)" />
            <circle
              cx="50"
              cy="66"
              r={torsoRingRadius}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="66"
              r={torsoRingRadius}
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={torsoRingCircumference}
              strokeDashoffset={torsoRingOffset}
              transform="rotate(-90 50 66)"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
