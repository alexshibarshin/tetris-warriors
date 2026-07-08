import React from 'react';
import { WARRIOR_TEXT_COLORS } from '../config';

export function EnemyVisual({ colorIdx, className = '' }: { colorIdx: number, className?: string }) {
  const textColor = WARRIOR_TEXT_COLORS[colorIdx] || 'text-gray-500';
  return (
    <div className={`flex items-center justify-center ${textColor} ${className}`}>
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_4px_5px_rgba(0,0,0,0.7)] overflow-visible">
        <g stroke="rgba(0,0,0,0.6)" strokeWidth="4" strokeLinejoin="miter">
          {/* Spiky Body */}
          <path d="M 50,30 L 90,60 L 75,105 L 25,105 L 10,60 Z" fill="currentColor" />
          
          {/* Darker inner detail to make it look armored/monstrous */}
          <path d="M 50,45 L 75,65 L 65,95 L 35,95 L 25,65 Z" fill="rgba(0,0,0,0.3)" stroke="none" />
          
          {/* Head */}
          <polygon points="50,5 75,25 65,50 35,50 25,25" fill="#333" />
          
          {/* Eyes (glowing red) */}
          <circle cx="40" cy="30" r="4" fill="#ef4444" stroke="none" />
          <circle cx="60" cy="30" r="4" fill="#ef4444" stroke="none" />
          
          {/* Horns */}
          <path d="M 30,18 L 15,5 L 25,25" fill="none" stroke="#222" strokeWidth="4" strokeLinecap="round" />
          <path d="M 70,18 L 85,5 L 75,25" fill="none" stroke="#222" strokeWidth="4" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
