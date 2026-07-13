import React from 'react';
import { WARRIOR_TEXT_COLORS } from '../config';
import { getWarriorByColor, WarriorId } from '../game/content';

type Props = { colorIdx: number; warriorId?: WarriorId; tier?: number; className?: string };

function TierDetails({ tier }: { tier: number }) {
  return (
    <g stroke="rgba(0,0,0,.65)" strokeLinejoin="round">
      {tier >= 2 && <path d="M39 18 50 3 61 18 50 25Z" fill="#fbbf24" strokeWidth="3" />}
      {tier >= 3 && <><path d="M30 22 34 7 43 20Z" fill="#fde68a" strokeWidth="3"/><path d="M70 22 66 7 57 20Z" fill="#fde68a" strokeWidth="3"/></>}
      {tier >= 4 && <ellipse cx="50" cy="13" rx="27" ry="8" fill="none" stroke="#fde047" strokeWidth="4" />}
    </g>
  );
}

function Cleaver({ tier }: { tier: number }) {
  return <>
    <path d="M26 48 39 32h23l14 17 10 55H15Z" fill="currentColor" />
    <circle cx="50" cy="28" r="17" fill="#fed7aa" />
    <path d="M34 25 44 10l20 12-4 16-25-2Z" fill="#7f1d1d" />
    <path d="m70 45 18-19 8 7-15 21Z" fill="#d1d5db" />
    <path d="m78 32 11-18 9 21-16 5Z" fill="#e5e7eb" />
    {tier >= 2 && <path d="M18 54 5 44 14 72 28 66Z" fill="#991b1b" />}
    {tier >= 3 && <path d="M26 76h48v12H26Z" fill="#f59e0b" opacity=".75" />}
    {tier >= 4 && <path d="M18 96 6 111h29l15-10 15 10h29L82 96Z" fill="#fbbf24" opacity=".65" />}
  </>;
}

function Hunter({ tier }: { tier: number }) {
  return <>
    <path d="M32 46 42 34h17l11 13 7 59H22Z" fill="currentColor" />
    <path d="M32 35Q50 6 68 35L62 50H38Z" fill="#1e3a8a" />
    <circle cx="50" cy="33" r="12" fill="#dbeafe" />
    <path d="M75 24Q98 58 75 94" fill="none" stroke="#bfdbfe" strokeWidth="6" />
    <path d="M75 24 75 94" stroke="#fff" strokeWidth="2" />
    <path d="m48 69 30-20" stroke="#e0f2fe" strokeWidth="4" />
    {tier >= 2 && <path d="M26 59 12 70 27 78" fill="#60a5fa" />}
    {tier >= 3 && <path d="M36 84h28l8 20H28Z" fill="#93c5fd" opacity=".45" />}
    {tier >= 4 && <path d="m75 54 11 5-11 5" fill="#fff" stroke="#38bdf8" strokeWidth="3" />}
  </>;
}

function Rogue({ tier }: { tier: number }) {
  return <>
    <path d="M36 43 44 32h13l9 11 5 63H29Z" fill="currentColor" />
    <path d="M34 34Q50 8 66 34L59 48H41Z" fill="#14532d" />
    <path d="M42 32h16l-4 7h-9Z" fill="#bbf7d0" />
    <path d="m34 53-23 38 12 4 20-34Z" fill="#d1fae5" />
    <path d="m66 53 23 38-12 4-20-34Z" fill="#d1fae5" />
    {tier >= 2 && <path d="M22 64 8 55l10 22Z" fill="#22c55e" />}
    {tier >= 3 && <><circle cx="20" cy="95" r="8" fill="#4ade80" opacity=".55"/><circle cx="80" cy="95" r="8" fill="#4ade80" opacity=".55"/></>}
    {tier >= 4 && <path d="M28 103 50 88l22 15" fill="none" stroke="#bef264" strokeWidth="6" />}
  </>;
}

function Mage({ tier }: { tier: number }) {
  return <>
    <path d="M30 49 41 34h18l12 15 13 57H16Z" fill="currentColor" />
    <path d="M31 34 50 4l20 31-15 10H40Z" fill="#713f12" />
    <circle cx="50" cy="35" r="11" fill="#fef3c7" />
    <path d="M76 28v68" stroke="#fde68a" strokeWidth="7" />
    <path d="m76 28-11-9 11-14 11 14Z" fill="#facc15" />
    <path d="m70 58-14 13 13 4-8 14 22-20-13-3Z" fill="#fff" stroke="#facc15" strokeWidth="2" />
    {tier >= 2 && <circle cx="76" cy="17" r="16" fill="none" stroke="#fde047" strokeWidth="3" opacity=".7" />}
    {tier >= 3 && <path d="M24 77Q50 58 76 77" fill="none" stroke="#fef08a" strokeWidth="5" />}
    {tier >= 4 && <><circle cx="19" cy="52" r="5" fill="#fff"/><circle cx="84" cy="51" r="5" fill="#fff"/></>}
  </>;
}

function Warden({ tier }: { tier: number }) {
  return <>
    <path d="M29 47 40 31h21l12 17 7 58H20Z" fill="currentColor" />
    <circle cx="50" cy="28" r="17" fill="#e9d5ff" />
    <path d="M31 27 38 10h24l8 18-12 12H42Z" fill="#4c1d95" />
    <path d="M9 49h28v51L23 111 9 100Z" fill="#581c87" stroke="#e9d5ff" strokeWidth="5" />
    <path d="M23 60v37M13 79h20" stroke="#c4b5fd" strokeWidth="4" />
    <path d="M72 44v56" stroke="#e5e7eb" strokeWidth="6" />
    {tier >= 2 && <path d="M5 44 23 34l18 10" fill="none" stroke="#a78bfa" strokeWidth="5" />}
    {tier >= 3 && <path d="M78 52 94 66 80 78" fill="#8b5cf6" />}
    {tier >= 4 && <circle cx="23" cy="78" r="24" fill="none" stroke="#ddd6fe" strokeWidth="4" opacity=".75" />}
  </>;
}

export function WarriorVisual({ colorIdx, warriorId, tier = 1, className = '' }: Props) {
  const resolved = warriorId ?? getWarriorByColor(colorIdx).id;
  const textColor = WARRIOR_TEXT_COLORS[colorIdx] || 'text-gray-500';
  const aura = tier === 4 ? 'opacity-80 scale-125' : tier === 3 ? 'opacity-55 scale-115' : tier === 2 ? 'opacity-35 scale-105' : 'opacity-10';
  return (
    <div className={`relative flex items-center justify-center ${textColor} ${className}`}>
      <div className={`absolute inset-2 rounded-full bg-current blur-lg transition-all ${aura}`} />
      <svg viewBox="0 0 100 120" className="relative w-full h-full overflow-visible drop-shadow-[0_4px_5px_rgba(0,0,0,.75)]">
        <g stroke="rgba(0,0,0,.65)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
          {resolved === 'red-cleaver' && <Cleaver tier={tier} />}
          {resolved === 'blue-hunter' && <Hunter tier={tier} />}
          {resolved === 'green-rogue' && <Rogue tier={tier} />}
          {resolved === 'yellow-mage' && <Mage tier={tier} />}
          {resolved === 'purple-warden' && <Warden tier={tier} />}
        </g>
        <TierDetails tier={tier} />
      </svg>
    </div>
  );
}
