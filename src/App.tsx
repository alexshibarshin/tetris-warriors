import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ThumbsUp } from 'lucide-react';
import {
  BATTLE_CONFIG,
  BOARD_CONFIG,
  GENERATOR_CONFIG,
  PROGRESSION_CONFIG,
  WARRIOR_COLOR_NAMES,
  WARRIOR_COLORS,
} from './config';
import { BattleArea, BattleAreaRef } from './components/BattleArea';
import { WarriorVisual } from './components/WarriorVisual';
import { BoosterActivationEffect, BoosterVisual } from './components/BoosterVisual';
import { DEFAULT_GAME_DESIGN } from './game/design';
import { evaluatePlacementPreview } from './game/board';
import {
  UpgradeCard,
  applyTierUpgradeToBoard,
  applyUpgradeCard,
  createInitialPlayerBuild,
  generateUpgradeChoices,
} from './game/progression';
import { createStageTheme, getPerkRecommendationReasons } from './game/stageTheme';
import type { StageTheme } from './game/stageTheme';
import { PERK_BY_ID, PerkId, WarriorId, WARRIOR_BY_ID } from './game/content';
import { BattleSnapshot } from './types';
import {
  BoardCellPosition,
  BoosterType,
  CellData,
  DragState,
  PlacementMatchBonus,
  ShapeDef,
} from './game/types';

const BOOSTER_INFO: Record<BoosterType, { title: string; description: string }> = {
  cross: { title: 'Крестовой бустер', description: 'Активирует все объекты в своей строке и столбце.' },
  bomb: { title: 'Бомба', description: 'Активирует все объекты в радиусе 2 клеток.' },
  chroma: { title: 'Цветовой бустер', description: 'Активирует всех воинов цветов, которых коснулась фигура.' },
};

function getBoardObjectName(cell: CellData) {
  if (cell.type === 'coin') return 'Монета';
  if (cell.type === 'warrior' && cell.warriorId) return WARRIOR_BY_ID[cell.warriorId].name;
  if (cell.type === 'booster' && cell.boosterType) return BOOSTER_INFO[cell.boosterType].title;
  return 'Объект';
}

function MatchBonusFeedback({ bonus }: { bonus: PlacementMatchBonus; key?: number }) {
  const isPerfect = bonus.kind === 'perfect';

  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-center justify-center overflow-hidden pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {isPerfect && (
        <>
          <motion.div
            className="absolute h-52 w-52 rounded-full border-2 border-amber-300/70"
            initial={{ scale: 0.15, opacity: 1 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
          {Array.from({ length: 10 }, (_, index) => {
            const angle = (Math.PI * 2 * index) / 10;
            return (
              <motion.span
                key={index}
                className="absolute h-2 w-2 rotate-45 bg-amber-200 shadow-[0_0_8px_rgba(253,230,138,1)]"
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: Math.cos(angle) * (80 + (index % 2) * 22),
                  y: Math.sin(angle) * (48 + (index % 2) * 16),
                  scale: [0, 1.2, 0],
                  opacity: [0, 1, 0],
                  rotate: 135,
                }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
            );
          })}
        </>
      )}

      <motion.div
        className={`relative flex flex-col items-center rounded-xl border px-5 py-2 text-center backdrop-blur-[2px] ${
          isPerfect
            ? 'border-amber-200/80 bg-amber-950/80 shadow-[0_0_30px_rgba(251,191,36,0.7)]'
            : 'border-emerald-200/70 bg-emerald-950/80 shadow-[0_0_22px_rgba(52,211,153,0.55)]'
        }`}
        initial={{ scale: 0.4, y: 18, rotate: isPerfect ? -4 : 0 }}
        animate={{ scale: [0.4, 1.16, 1], y: 0, rotate: 0 }}
        exit={{ scale: 1.08, y: -28, opacity: 0 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
      >
        <span className={`font-black italic leading-none tracking-tight ${isPerfect ? 'text-2xl text-amber-100' : 'text-xl text-emerald-100'}`}>
          {bonus.label}
        </span>
        <span className={`mt-1 text-[10px] font-black tracking-[0.22em] ${isPerfect ? 'text-amber-300' : 'text-emerald-300'}`}>
          +{bonus.generatedCells} {bonus.generatedCells === 1 ? 'CELL' : 'CELLS'}
        </span>
      </motion.div>
    </motion.div>
  );
}

function TimerProgress({
  stage,
  isDragging,
  paused,
  onAdvanceStage,
}: {
  stage: number;
  isDragging: boolean;
  paused: boolean;
  onAdvanceStage: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const lastTimeRef = useRef(performance.now());
  const elapsedRef = useRef(0);

  const targetDuration =
    stage < GENERATOR_CONFIG.stageDurationsMs.length
      ? GENERATOR_CONFIG.stageDurationsMs[stage]
      : Infinity;

  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    lastTimeRef.current = performance.now();
  }, [stage]);

  useEffect(() => {
    let frameId: number;
    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick);
      if (stage === GENERATOR_CONFIG.stageCount) {
        return;
      }

      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (!isDragging && !paused) {
        elapsedRef.current += dt;

        if (elapsedRef.current >= targetDuration) {
          onAdvanceStage();
          elapsedRef.current = 0;
          setProgress(0);
        } else {
          setProgress(elapsedRef.current / targetDuration);
        }
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isDragging, onAdvanceStage, paused, stage, targetDuration]);

  if (stage === GENERATOR_CONFIG.stageCount) {
    return (
      <div className="w-12 h-12 flex items-center justify-center rounded-full border border-yellow-500/25 bg-yellow-400/10 text-yellow-400 font-black text-[11px] leading-none">
        MAX
      </div>
    );
  }

  return (
    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
      <path
        className="text-neutral-700"
        strokeWidth="4"
        stroke="currentColor"
        fill="transparent"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      />
      <path
        className={stage === 0 ? 'text-neutral-500' : 'text-yellow-400'}
        strokeWidth="4"
        strokeDasharray={`${progress * 100}, 100`}
        stroke="currentColor"
        fill="transparent"
        strokeLinecap="round"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      />
    </svg>
  );
}

const CARD_RARITY_STYLES: Record<UpgradeCard['rarity'], string> = {
  rare: 'border-sky-400/60 bg-gradient-to-br from-sky-500/18 via-cyan-300/8 to-neutral-900 shadow-[0_0_18px_rgba(56,189,248,0.2)]',
  epic: 'border-fuchsia-400/65 bg-gradient-to-br from-fuchsia-500/20 via-violet-300/10 to-neutral-900 shadow-[0_0_22px_rgba(192,38,211,0.24)]',
  legendary: 'border-amber-300/80 bg-gradient-to-br from-amber-300/22 via-orange-300/12 to-neutral-900 shadow-[0_0_28px_rgba(251,191,36,0.28)]',
};

type GameStatus = 'playing' | 'victory' | 'defeat';

function getUpgradeCopy(card: UpgradeCard, playerBuild: ReturnType<typeof createInitialPlayerBuild>) {
  if (card.type === 'tier') {
    const warrior = WARRIOR_BY_ID[card.warriorId];
    return {
      eyebrow: 'ТИР +1',
      subject: warrior.name,
      title: card.title,
      description: card.description,
      footer: '+25% КО ВСЕМ СТАТАМ',
    };
  }
  if (card.type === 'summonWarriors') {
    return {
      eyebrow: 'НА ДОСКУ',
      subject: WARRIOR_BY_ID[card.warriorId].name,
      title: `+${card.summonCount} ВОИНА`,
      description: 'Сразу добавить на доску.',
      footer: null,
    };
  }
  if (card.type === 'wallHeal') {
    return {
      eyebrow: 'ВОРОТА',
      subject: null,
      title: 'РЕМОНТ',
      description: '+25% здоровья ворот.',
      footer: null,
    };
  }
  return {
    eyebrow: 'НА ДОСКУ',
    subject: null,
    title: 'БУСТЕР',
    description: `+${card.boosterCount} случайный бустер.`,
    footer: null,
  };
}

function ColorDots({ colors }: { colors: number[] }) {
  return <div className="flex items-center gap-1.5">{colors.map((color) => (
    <span key={color} className={`h-4 w-4 rounded-full border border-white/70 ${WARRIOR_COLORS[color]}`} />
  ))}</div>;
}

function StagePreview({ theme, onFight, onReroll, onDeck, randomizedBoard, onRandomizedBoardChange }: {
  theme: StageTheme; onFight: () => void; onReroll: () => void; onDeck: () => void;
  randomizedBoard: boolean; onRandomizedBoardChange: (enabled: boolean) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[200] overflow-y-auto bg-[radial-gradient(circle_at_top,#34120f_0%,#09090b_48%,#000_100%)] p-4 text-white touch-pan-y">
      <div className="mx-auto flex min-h-full max-w-sm flex-col gap-3 py-3">
        <div className="text-center">
          <div className="text-[10px] font-black tracking-[.35em] text-orange-200/60">РАЗВЕДКА БОЯ</div>
          <div className="mt-1 text-3xl font-black">{theme.portalEffect.name}</div>
          <div className="mt-2 flex justify-center"><ColorDots colors={theme.dominantColorIndices} /></div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-orange-300/25 bg-orange-950/25 p-4">
          <div className="absolute -right-5 -top-5 text-[110px] leading-none text-orange-200/10">{theme.portalEffect.icon}</div>
          <div className="text-[10px] font-black tracking-[.25em] text-orange-200/60">ПОРТАЛ</div>
          <div className="mt-1 text-5xl text-orange-200">{theme.portalEffect.icon}</div>
          <div className="mt-2 text-xl font-black">{theme.portalEffect.shortText}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[24px] border border-white/10 bg-white/[.06] p-3">
            <div className="text-[10px] font-black tracking-[.2em] text-white/45">ВРАГИ</div>
            <div className="mt-2 text-3xl">{theme.enemyTheme.icon}</div>
            <div className="mt-1 font-black">{theme.enemyTheme.name}</div>
            <div className="mt-1 text-sm leading-tight text-white/65">{theme.enemyTheme.shortText}</div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[.06] p-3">
            <div className="text-[10px] font-black tracking-[.2em] text-white/45">ВОЛНЫ</div>
            <div className="mt-3 text-xl tracking-wider text-amber-200">{theme.spawnPattern.icon}</div>
            <div className="mt-2 font-black">{theme.spawnPattern.name}</div>
            <div className="mt-1 text-sm leading-tight text-white/65">{theme.spawnPattern.shortText}</div>
          </div>
        </div>

        <div className="rounded-[22px] border border-sky-300/20 bg-sky-950/30 px-4 py-3">
          <div className="text-[10px] font-black tracking-[.2em] text-sky-200/55">СОВЕТ</div>
          <div className="mt-1 text-sm font-bold leading-snug text-sky-50">{theme.recommendation}</div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-white/[.06] px-4 py-3">
          <div>
            <div className="text-sm font-black">РАНДОМИЗИРОВАННАЯ ДОСКА</div>
            <div className="mt-1 text-xs leading-snug text-white/55">Экспериментальные формы для большего разнообразия.</div>
          </div>
          <input type="checkbox" checked={randomizedBoard} onChange={(event) => onRandomizedBoardChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-amber-400" />
        </label>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <button onClick={onReroll} className="rounded-2xl border border-white/15 bg-white/8 py-3 text-sm font-black active:scale-95">↻ ПЕРЕБРОС</button>
          <button onClick={onDeck} className="rounded-2xl border border-violet-300/20 bg-violet-500/15 py-3 text-sm font-black active:scale-95">СМЕНИТЬ КОЛОДУ</button>
          <button onClick={onFight} className="col-span-2 rounded-2xl bg-white py-4 text-lg font-black text-black active:scale-95">В БОЙ</button>
        </div>
      </div>
    </motion.div>
  );
}

function PauseMenu({ theme, onResume }: { theme: StageTheme; onResume: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[190] overflow-y-auto bg-black/88 p-4 text-white backdrop-blur-md touch-pan-y">
      <div className="mx-auto flex min-h-full max-w-sm flex-col gap-3 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[.3em] text-white/45">БОЙ ОСТАНОВЛЕН</div>
            <div className="mt-1 text-3xl font-black">ПАУЗА</div>
          </div>
          <button onClick={onResume} className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-black active:scale-95">ПРОДОЛЖИТЬ</button>
        </div>

        <div className="rounded-[26px] border border-orange-300/25 bg-orange-950/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-black tracking-[.22em] text-orange-200/55">ПОРТАЛ</div>
              <div className="mt-1 text-xl font-black">{theme.portalEffect.name}</div>
            </div>
            <div className="text-4xl text-orange-200">{theme.portalEffect.icon}</div>
          </div>
          <div className="mt-3 text-sm font-bold leading-snug text-orange-50/85">{theme.portalEffect.shortText}</div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[9px] font-black tracking-[.16em] text-white/40">ЦВЕТА ВРАГОВ</span>
            <ColorDots colors={theme.dominantColorIndices} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[22px] border border-white/10 bg-white/[.06] p-3">
            <div className="text-[9px] font-black tracking-[.2em] text-white/40">ВРАГИ</div>
            <div className="mt-2 text-2xl">{theme.enemyTheme.icon}</div>
            <div className="mt-1 font-black leading-tight">{theme.enemyTheme.name}</div>
            <div className="mt-1 text-xs leading-snug text-white/60">{theme.enemyTheme.shortText}</div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[.06] p-3">
            <div className="text-[9px] font-black tracking-[.2em] text-white/40">ВОЛНЫ</div>
            <div className="mt-2 text-lg tracking-wider text-amber-200">{theme.spawnPattern.icon}</div>
            <div className="mt-2 font-black leading-tight">{theme.spawnPattern.name}</div>
            <div className="mt-1 text-xs leading-snug text-white/60">{theme.spawnPattern.shortText}</div>
          </div>
        </div>

        <div className="rounded-[20px] border border-sky-300/20 bg-sky-950/30 px-4 py-3">
          <div className="text-[9px] font-black tracking-[.2em] text-sky-200/50">СОВЕТ</div>
          <div className="mt-1 text-sm font-bold leading-snug text-sky-50">{theme.recommendation}</div>
        </div>

        <button onClick={onResume} className="mt-auto rounded-2xl bg-white py-4 text-base font-black text-black active:scale-95">ПРОДОЛЖИТЬ БОЙ</button>
      </div>
    </motion.div>
  );
}

function BoardObjectTooltip({ cell, build, onClose }: {
  cell: CellData;
  build: ReturnType<typeof createInitialPlayerBuild>;
  onClose: () => void;
}) {
  const warrior = cell.type === 'warrior' && cell.warriorId ? WARRIOR_BY_ID[cell.warriorId] : null;
  const deckEntry = warrior ? build.deck.find((entry) => entry.warriorId === warrior.id) : null;
  const boosterCopy = cell.boosterType ? BOOSTER_INFO[cell.boosterType] : BOOSTER_INFO.chroma;
  const title = warrior?.name ?? (cell.type === 'coin' ? 'Монета' : boosterCopy.title);
  const label = warrior ? `ТИР ${cell.tier ?? 1} · ${warrior.role}` : cell.type === 'coin' ? 'НАГРАДА' : 'БУСТЕР';
  const description = warrior
    ? `Накройте фигурой — воин выйдет в бой. ${warrior.passiveTitle}: ${warrior.passiveText}`
    : cell.type === 'coin'
      ? 'Накройте фигурой: получите 1 монету и выбор из 3 усилений.'
      : `Накройте фигурой. ${boosterCopy.description}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 z-[170] flex items-end bg-black/45 p-3 backdrop-blur-[2px]">
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-sm rounded-[26px] border border-white/15 bg-neutral-900 p-4 text-white shadow-2xl">
        <div className="flex gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-black/30 p-1.5">
            {warrior ? (
              <WarriorVisual warriorId={warrior.id} colorIdx={warrior.colorIdx} tier={cell.tier ?? 1} className="h-full w-full" />
            ) : cell.type === 'coin' ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-yellow-600 bg-yellow-400 text-2xl font-black text-yellow-800">¢</div>
            ) : cell.boosterType ? (
              <BoosterVisual type={cell.boosterType} />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black tracking-[.16em] text-white/40">{label}</div>
            <div className="mt-1 text-xl font-black leading-tight">{title}</div>
            <div className="mt-2 text-sm font-semibold leading-snug text-white/70">{description}</div>
          </div>
        </div>
        {deckEntry && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="text-[9px] font-black tracking-[.16em] text-white/35">ВЫБРАННЫЕ ПЕРКИ</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {deckEntry.selectedPerks.length > 0 ? deckEntry.selectedPerks.map((perkId) => (
                <span key={perkId} className="rounded-full border border-violet-300/15 bg-violet-400/10 px-2 py-1 text-[10px] font-bold text-violet-100">{PERK_BY_ID[perkId].title}</span>
              )) : <span className="text-xs text-white/45">Пока нет.</span>}
            </div>
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full rounded-xl border border-white/10 bg-white/8 py-2.5 text-xs font-black active:scale-95">ПОНЯТНО</button>
      </motion.div>
    </motion.div>
  );
}

function DeckScreen({ build, onBack }: { build: ReturnType<typeof createInitialPlayerBuild>; onBack: () => void }) {
  const [selectedId, setSelectedId] = useState<WarriorId | null>(null);
  const [selectedPerkId, setSelectedPerkId] = useState<PerkId | null>(null);
  const selectedEntry = selectedId ? build.deck.find((entry) => entry.warriorId === selectedId) : null;
  const selected = selectedId ? WARRIOR_BY_ID[selectedId] : null;
  const selectedPerk = selectedPerkId ? PERK_BY_ID[selectedPerkId] : null;
  const closeWarrior = () => {
    setSelectedPerkId(null);
    setSelectedId(null);
  };
  return (
    <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute inset-0 z-[220] overflow-y-auto bg-neutral-950 p-4 text-white touch-pan-y">
      <div className="mx-auto max-w-sm py-2">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="rounded-full border border-white/10 px-3 py-2 text-sm font-bold">← НАЗАД</button>
          <div className="text-xl font-black">КОЛОДА 5/5</div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {build.deck.map((entry) => {
            const warrior = WARRIOR_BY_ID[entry.warriorId];
            return (
              <button key={entry.warriorId} onClick={() => setSelectedId(entry.warriorId)} className="rounded-[24px] border border-white/10 bg-white/[.05] p-3 text-left active:scale-95">
                <div className="mx-auto h-28 w-24"><WarriorVisual warriorId={entry.warriorId} colorIdx={entry.colorIdx} tier={entry.tier} className="h-full w-full" /></div>
                <div className="mt-2 font-black leading-tight">{warrior.name}</div>
                <div className="mt-1 text-xs text-white/50">{warrior.role}</div>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && selectedEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[240] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={closeWarrior}>
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(event) => event.stopPropagation()} className="max-h-[88dvh] w-full max-w-sm overflow-y-auto rounded-[30px] border border-white/15 bg-neutral-900 p-4 touch-pan-y">
              <div className="flex gap-3">
                <div className="h-32 w-24 shrink-0"><WarriorVisual warriorId={selected.id} colorIdx={selected.colorIdx} tier={selectedEntry.tier} className="h-full w-full" /></div>
                <div className="min-w-0 pt-2">
                  <div className="text-xl font-black">{selected.name}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">{selected.role}</div>
                  <div className="mt-3 flex gap-2 text-xs font-black">
                    <span className="rounded-full bg-red-500/15 px-2 py-1 text-red-200">HP {selected.baseHp}</span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-200">ATK {selected.baseDamage}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-white/[.06] p-3">
                <div className="font-black">{selected.passiveTitle}</div>
                <div className="mt-1 text-sm text-white/65">{selected.passiveText}</div>
              </div>
              <div className="mt-4 text-[10px] font-black tracking-[.25em] text-white/40">ПЕРКИ</div>
              <div className="mt-2 space-y-2">
                {[2, 3, 4].map((tier) => (
                  <div key={tier} className="rounded-2xl border border-white/8 bg-black/20 p-3">
                    <div className="mb-2 text-xs font-black text-amber-200">ТИР {tier}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {selected.perks.filter((perk) => perk.tier === tier).map((perk) => (
                        <button key={perk.id} onClick={() => setSelectedPerkId(perk.id)} className="rounded-xl border border-white/5 bg-white/[.05] p-2 text-left active:scale-[.98]">
                          <div className="text-sm font-black leading-tight">{perk.title}</div>
                          <div className="mt-1 text-xs leading-snug text-white/65">{perk.description}</div>
                          <div className="mt-2 text-[8px] font-black tracking-[.14em] text-violet-200/55">ПОДРОБНЕЕ ›</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={closeWarrior} className="mt-4 w-full rounded-2xl bg-white py-3 font-black text-black">ГОТОВО</button>
            </motion.div>
          </motion.div>
        )}
        {selectedPerk && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPerkId(null)} className="fixed inset-0 z-[260] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm">
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-[26px] border border-violet-300/20 bg-neutral-900 p-4 text-white shadow-2xl">
              <div className="text-[9px] font-black tracking-[.2em] text-amber-200/60">ПЕРК · ТИР {selectedPerk.tier}</div>
              <div className="mt-1 text-2xl font-black">{selectedPerk.title}</div>
              <div className="mt-4 rounded-2xl bg-white/[.06] p-3">
                <div className="text-[9px] font-black tracking-[.16em] text-white/35">ЧТО ДАЁТ</div>
                <div className="mt-1 text-sm font-semibold leading-snug text-white/85">{selectedPerk.description}</div>
              </div>
              <div className="mt-2 rounded-2xl border border-violet-300/10 bg-violet-500/[.08] p-3">
                <div className="text-[9px] font-black tracking-[.16em] text-violet-200/45">ТОЧНЫЕ ДЕТАЛИ</div>
                <div className="mt-1 text-sm leading-snug text-violet-50/75">{selectedPerk.details}</div>
              </div>
              <button onClick={() => setSelectedPerkId(null)} className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-black text-black active:scale-95">ПОНЯТНО</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function App() {
  const debugUpgradePreview = window.location.hostname === 'localhost' && new URLSearchParams(window.location.search).has('upgrade-preview');
  const [playerBuild, setPlayerBuild] = useState(() => createInitialPlayerBuild());
  const [stageTheme, setStageTheme] = useState(() => createStageTheme());
  const [generatorSequence, setGeneratorSequence] = useState<ShapeDef[]>(
    DEFAULT_GAME_DESIGN.generator.generateShapeSequence,
  );
  const [generatorStage, setGeneratorStage] = useState(1);
  const [board, setBoard] = useState<CellData[][]>(() => DEFAULT_GAME_DESIGN.board.createInitialBoard(createInitialPlayerBuild()));
  const [randomizedBoard, setRandomizedBoard] = useState(false);
  const boardRows = board.length;
  const boardCols = board[0]?.length ?? BOARD_CONFIG.cols;
  const [dragState, setDragState] = useState<DragState>('idle');
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [activatedCells, setActivatedCells] = useState<BoardCellPosition[]>([]);
  const [activatedBoosters, setActivatedBoosters] = useState<ReturnType<typeof DEFAULT_GAME_DESIGN.board.applyShapeToBoard>['activatedBoosters']>([]);
  const [coins, setCoins] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [showStagePreview, setShowStagePreview] = useState(!debugUpgradePreview);
  const [showDeckScreen, setShowDeckScreen] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [inspectedCell, setInspectedCell] = useState<CellData | null>(null);
  const [battleSnapshot, setBattleSnapshot] = useState<BattleSnapshot>({
    playerBaseHp: BATTLE_CONFIG.playerBaseMaxHealth,
    playerBaseMaxHp: BATTLE_CONFIG.playerBaseMaxHealth,
    enemyStructureHp: BATTLE_CONFIG.enemyStructureMaxHealth,
    enemyStructureMaxHp: BATTLE_CONFIG.enemyStructureMaxHealth,
    phase: 0,
  });
  const [upgradeChoices, setUpgradeChoices] = useState<UpgradeCard[] | null>(null);
  const [upgradeRerollAvailable, setUpgradeRerollAvailable] = useState(false);
  const [pendingUpgradeDrafts, setPendingUpgradeDrafts] = useState(debugUpgradePreview ? 1 : 0);
  const [boardRect, setBoardRect] = useState<DOMRect | null>(null);
  const [generatorRect, setGeneratorRect] = useState<DOMRect | null>(null);
  const [nextSpawnCell, setNextSpawnCell] = useState<BoardCellPosition | null>(null);
  const [nextSpawnProgress, setNextSpawnProgress] = useState(0);
  const [nextSpawnStartedAt, setNextSpawnStartedAt] = useState<number | null>(null);
  const [matchFeedback, setMatchFeedback] = useState<(PlacementMatchBonus & { id: number }) | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const generatorRef = useRef<HTMLDivElement>(null);
  const battleAreaRef = useRef<BattleAreaRef>(null);
  const pauseStartedAtRef = useRef<number | null>(null);
  const matchFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchFeedbackIdRef = useRef(0);

  const isUpgradeOpen = upgradeChoices !== null;
  const isBattlePaused = gameStatus === 'playing' && (isUpgradeOpen || showStagePreview || showDeckScreen || showPauseMenu || inspectedCell !== null);

  const handleAdvanceStage = useRef(() => {
    setGeneratorStage((stage) => Math.min(stage + 1, GENERATOR_CONFIG.stageCount));
  }).current;

  useLayoutEffect(() => {
    const measure = () => {
      if (boardRef.current) {
        setBoardRect(boardRef.current.getBoundingClientRect());
      }
      if (generatorRef.current) {
        setGeneratorRect(generatorRef.current.getBoundingClientRect());
      }
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [boardCols, boardRows]);

  useEffect(() => () => {
    if (matchFeedbackTimerRef.current) clearTimeout(matchFeedbackTimerRef.current);
  }, []);

  useEffect(() => {
    if (isBattlePaused) {
      pauseStartedAtRef.current = performance.now();
      return;
    }

    if (pauseStartedAtRef.current !== null && nextSpawnStartedAt !== null) {
      const pausedFor = performance.now() - pauseStartedAtRef.current;
      setNextSpawnStartedAt((current) => (current === null ? null : current + pausedFor));
    }

    pauseStartedAtRef.current = null;
  }, [isBattlePaused, nextSpawnStartedAt]);

  useEffect(() => {
    if (gameStatus !== 'playing' || isBattlePaused) {
      if (gameStatus !== 'playing') {
        setNextSpawnCell(null);
        setNextSpawnProgress(0);
        setNextSpawnStartedAt(null);
      }
      return;
    }

    if (nextSpawnCell) {
      return;
    }

    const targetCell = DEFAULT_GAME_DESIGN.board.pickRandomEmptyCell(board);

    if (!targetCell) {
      setNextSpawnProgress(0);
      setNextSpawnStartedAt(null);
      return;
    }

    setNextSpawnCell(targetCell);
    setNextSpawnProgress(0);
    setNextSpawnStartedAt(performance.now());
  }, [board, gameStatus, isBattlePaused, nextSpawnCell]);

  useEffect(() => {
    if (gameStatus !== 'playing' || isBattlePaused || !nextSpawnCell || nextSpawnStartedAt === null) {
      return;
    }

    let frameId = 0;
    const respawnIntervalMs = DEFAULT_GAME_DESIGN.board.getBoardRespawnIntervalMs(board);

    const tick = (now: number) => {
      const progress = Math.min((now - nextSpawnStartedAt) / respawnIntervalMs, 1);
      setNextSpawnProgress(progress);

      if (progress >= 1) {
        setBoard((currentBoard) => DEFAULT_GAME_DESIGN.board.fillCell(currentBoard, nextSpawnCell, playerBuild));
        setNextSpawnCell(null);
        setNextSpawnStartedAt(null);
        setNextSpawnProgress(0);
        return;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [board, gameStatus, isBattlePaused, nextSpawnCell, nextSpawnStartedAt, playerBuild]);

  const handleRestart = () => {
    const nextBuild = createInitialPlayerBuild();
    const nextTheme = createStageTheme();
    setPlayerBuild(nextBuild);
    setStageTheme(nextTheme);
    setRandomizedBoard(false);
    setCoins(0);
    setBoard(DEFAULT_GAME_DESIGN.board.createInitialBoard(nextBuild));
    setGeneratorSequence(DEFAULT_GAME_DESIGN.generator.generateShapeSequence());
    setGeneratorStage(1);
    setGameStatus('playing');
    setShowStagePreview(true);
    setShowDeckScreen(false);
    setShowPauseMenu(false);
    setInspectedCell(null);
    setDragState('idle');
    setUpgradeChoices(null);
    setUpgradeRerollAvailable(false);
    setPendingUpgradeDrafts(0);
    setActivatedCells([]);
    setActivatedBoosters([]);
    setNextSpawnCell(null);
    setNextSpawnProgress(0);
    setNextSpawnStartedAt(null);
    setMatchFeedback(null);
    if (matchFeedbackTimerRef.current) clearTimeout(matchFeedbackTimerRef.current);
    battleAreaRef.current?.reset(nextTheme);
  };

  const cellSize = boardRect ? boardRect.width / boardCols : 0;
  const shape = generatorStage > 0 ? generatorSequence[generatorStage - 1] : null;
  const placement = evaluatePlacementPreview({
    board,
    dragState,
    shape,
    boardRect,
    cellSize,
    pointerPos,
  });

  const handleDrop = () => {
    if (isBattlePaused) {
      setDragState('idle');
      return;
    }

    if (placement.isOverBoard && placement.isValidPlacement) {
      const matchBonus = DEFAULT_GAME_DESIGN.board.getPlacementMatchBonus(board, placement.coveredCells);
      const activationResult = DEFAULT_GAME_DESIGN.board.applyShapeToBoard(board, placement.coveredCells);
      setBoard(activationResult.nextBoard);

      if (activationResult.activatedCells.length > 0) {
        setActivatedCells(activationResult.activatedCells);
        setActivatedBoosters(activationResult.activatedBoosters);
        setCoins((currentCoins) => currentCoins + activationResult.earnedCoins);
        setPendingUpgradeDrafts((currentDrafts) => currentDrafts + activationResult.earnedCoins);

        if (activationResult.spawnedWarriors.length > 0) {
          battleAreaRef.current?.spawnWarriors(activationResult.spawnedWarriors, boardCols, playerBuild);
        }
      }

      setGeneratorSequence(DEFAULT_GAME_DESIGN.generator.generateShapeSequence());
      setGeneratorStage(Math.min(1 + (matchBonus?.generatedCells ?? 0), GENERATOR_CONFIG.stageCount));
      setDragState('idle');

      if (matchBonus) {
        matchFeedbackIdRef.current += 1;
        setMatchFeedback({ ...matchBonus, id: matchFeedbackIdRef.current });
        if (matchFeedbackTimerRef.current) clearTimeout(matchFeedbackTimerRef.current);
        matchFeedbackTimerRef.current = setTimeout(() => {
          setMatchFeedback(null);
          matchFeedbackTimerRef.current = null;
        }, matchBonus.kind === 'perfect' ? 1500 : 1200);
      }

      setTimeout(() => {
        setActivatedCells([]);
      }, BOARD_CONFIG.activationFlashMs);

      setTimeout(() => {
        setActivatedBoosters([]);
      }, 800);
      return;
    }

    setDragState('idle');
  };

  const rerollStage = () => {
    const nextTheme = createStageTheme();
    setStageTheme(nextTheme);
    setBoard(DEFAULT_GAME_DESIGN.board.createInitialBoard(playerBuild, { randomizedTopology: randomizedBoard }));
    setGeneratorSequence(DEFAULT_GAME_DESIGN.generator.generateShapeSequence());
    setGeneratorStage(1);
    battleAreaRef.current?.reset(nextTheme);
  };

  const startBattle = () => {
    battleAreaRef.current?.reset(stageTheme);
    setShowStagePreview(false);
    setShowDeckScreen(false);
    setShowPauseMenu(false);
  };

  const openPauseMenu = () => {
    setDragState('idle');
    setInspectedCell(null);
    setShowPauseMenu(true);
  };

  const inspectBoardCell = (cell: CellData) => {
    if (cell.state !== 'ready' || dragState !== 'idle' || isBattlePaused) return;
    setInspectedCell({ ...cell });
  };

  useEffect(() => {
    if (pendingUpgradeDrafts === 0 || gameStatus !== 'playing' || isUpgradeOpen) {
      return;
    }

    const choices = generateUpgradeChoices(playerBuild, {
      playerBaseHp: battleSnapshot.playerBaseHp,
      playerBaseMaxHp: battleSnapshot.playerBaseMaxHp,
    });

    if (choices.length < 3) {
      return;
    }

    setUpgradeChoices(choices);
    setUpgradeRerollAvailable(true);
    setDragState('idle');
  }, [battleSnapshot, gameStatus, isUpgradeOpen, pendingUpgradeDrafts, playerBuild]);

  const rerollUpgradeDraft = () => {
    if (!upgradeRerollAvailable || gameStatus !== 'playing' || !isUpgradeOpen) {
      return;
    }

    const choices = generateUpgradeChoices(playerBuild, {
      playerBaseHp: battleSnapshot.playerBaseHp,
      playerBaseMaxHp: battleSnapshot.playerBaseMaxHp,
    });

    if (choices.length < 3) {
      return;
    }

    setUpgradeChoices(choices);
    setUpgradeRerollAvailable(false);
  };

  const applyUpgrade = (card: UpgradeCard) => {
    if (card.type === 'wallHeal') {
      battleAreaRef.current?.healPlayerBase(card.healFraction);
      setBattleSnapshot((current) => ({
        ...current,
        playerBaseHp: Math.min(current.playerBaseMaxHp, current.playerBaseHp + current.playerBaseMaxHp * card.healFraction),
      }));
      closeUpgradeDraft();
      return;
    }

    if (card.type === 'summonWarriors') {
      setBoard((currentBoard) =>
        DEFAULT_GAME_DESIGN.board.fillRandomEmptyCellsWithColor(
          currentBoard,
          playerBuild,
          card.colorIdx,
          card.summonCount,
        ),
      );
      closeUpgradeDraft();
      return;
    }

    if (card.type === 'spawnBooster') {
      setBoard((currentBoard) =>
        DEFAULT_GAME_DESIGN.board.fillRandomEmptyCellsWithBoosters(currentBoard, card.boosterCount),
      );
      closeUpgradeDraft();
      return;
    }

    const nextBuild = applyUpgradeCard(playerBuild, card);
    setPlayerBuild(nextBuild);

    if (card.type === 'tier') {
      setBoard((currentBoard) => applyTierUpgradeToBoard(currentBoard, nextBuild, card.warriorId));
    }

    closeUpgradeDraft();
  };

  const closeUpgradeDraft = () => {
    setUpgradeChoices(null);
    setUpgradeRerollAvailable(false);
    setPendingUpgradeDrafts((currentDrafts) => Math.max(0, currentDrafts - 1));
  };

  const isCellHighlighted = (r: number, c: number) =>
    dragState === 'dragging' &&
    placement.isOverBoard &&
    placement.isValidPlacement &&
    placement.coveredCells.some((cell) => cell.r === r && cell.c === c);

  const isCellActivated = (r: number, c: number) =>
    activatedCells.some((cell) => cell.r === r && cell.c === c);

  const isNextSpawnCell = (r: number, c: number) =>
    nextSpawnCell?.r === r && nextSpawnCell?.c === c;

  const getActivatedBooster = (r: number, c: number) =>
    activatedBoosters.find((booster) => booster.position.r === r && booster.position.c === c);

  const renderPiece = () => {
    if (generatorStage === 0 || !shape || !cellSize || !generatorRect) {
      return null;
    }

    const pieceWidth = shape.width * cellSize;
    const pieceHeight = shape.height * cellSize;
    let targetX = 0;
    let targetY = 0;
    let targetScale = 1;

    if (dragState === 'idle') {
      targetX = generatorRect.left + generatorRect.width / 2 - shape.cx * cellSize;
      targetY = generatorRect.top + generatorRect.height / 2 - shape.cy * cellSize;
      targetScale = GENERATOR_CONFIG.idleScale;
    } else if (placement.isOverBoard && boardRect) {
      targetX = boardRect.left + placement.snappedC * cellSize;
      targetY = boardRect.top + placement.snappedR * cellSize;
    } else {
      targetX = pointerPos.x - shape.cx * cellSize;
      targetY = pointerPos.y + GENERATOR_CONFIG.dragOffsetPx - shape.cy * cellSize;
    }

    const isInvalid = dragState === 'dragging' && placement.isOverBoard && !placement.isValidPlacement;

    return (
      <motion.div
        key="shape-container"
        initial={{ x: targetX, y: targetY, scale: 0, opacity: 0 }}
        animate={{ x: targetX, y: targetY, scale: targetScale, opacity: 1 }}
        transition={{
          type: dragState === 'dragging' ? 'tween' : 'spring',
          duration: dragState === 'dragging' ? 0 : 0.35,
          bounce: 0.2,
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: pieceWidth,
          height: pieceHeight,
          originX: shape.cx / shape.width,
          originY: shape.cy / shape.height,
          zIndex: 50,
          touchAction: 'none',
          pointerEvents: isBattlePaused ? 'none' : 'auto',
        }}
        onPointerDown={(event) => {
          if (dragState === 'idle' && !isBattlePaused) {
            (event.target as HTMLElement).setPointerCapture(event.pointerId);
            setDragState('dragging');
            setPointerPos({ x: event.clientX, y: event.clientY });
          }
        }}
        onPointerMove={(event) => {
          if (dragState === 'dragging') {
            setPointerPos({ x: event.clientX, y: event.clientY });
          }
        }}
        onPointerUp={(event) => {
          if (dragState === 'dragging') {
            try {
              (event.target as HTMLElement).releasePointerCapture(event.pointerId);
            } catch {}
            handleDrop();
          }
        }}
        onPointerCancel={(event) => {
          if (dragState === 'dragging') {
            try {
              (event.target as HTMLElement).releasePointerCapture(event.pointerId);
            } catch {}
            setDragState('idle');
          }
        }}
      >
        <div className="absolute cursor-grab" style={{ inset: -GENERATOR_CONFIG.previewGrabInsetPx }} />

        {shape.blocks.map((block) => (
          <motion.div
            key={block.id}
            initial={{ scale: 0, opacity: 0, left: block.x * cellSize, top: block.y * cellSize }}
            animate={{ scale: 1, opacity: 1, left: block.x * cellSize, top: block.y * cellSize }}
            transition={{ type: 'spring', bounce: 0.3 }}
            style={{
              width: cellSize,
              height: cellSize,
              position: 'absolute',
            }}
            className="p-0.5 pointer-events-none"
          >
            <div
              className={`w-full h-full rounded-sm shadow-md transition-colors ${
                isInvalid
                  ? 'bg-red-500/25 border-2 border-red-500/80'
                  : 'bg-white/25 border-2 border-white/80'
              }`}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <div className="w-full h-[100dvh] bg-black flex justify-center items-center font-sans overflow-hidden">
      <div className="w-full h-full max-w-md mx-auto relative bg-neutral-900 flex flex-col select-none touch-none overflow-hidden overscroll-none shadow-2xl">
        {!showStagePreview && !showDeckScreen && !showPauseMenu && !isUpgradeOpen && !inspectedCell && gameStatus === 'playing' && (
          <button onClick={openPauseMenu} aria-label="Пауза" className="absolute left-3 top-12 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/65 text-sm font-black text-white shadow-lg active:scale-95">Ⅱ</button>
        )}
        <div className="absolute top-2 right-4 z-20 flex items-center gap-2 text-yellow-400 font-mono text-xl font-bold bg-black/50 px-4 py-1.5 rounded-full border border-yellow-600/30 shadow-lg">
          <span className="leading-none mt-0.5">💰</span>
          <span>{coins}</span>
        </div>

        <BattleArea
          ref={battleAreaRef}
          paused={isBattlePaused}
          build={playerBuild}
          stageTheme={stageTheme}
          onBattleStateChange={setBattleSnapshot}
          onGameEnd={(result) => setGameStatus(result)}
        />

        <div className="p-4 flex flex-col gap-4 bg-neutral-900 flex-none pb-8 items-center w-full">
          <div
            ref={boardRef}
            className="relative flex flex-wrap w-full rounded-md shadow-inner box-content"
            style={{ maxWidth: BOARD_CONFIG.maxWidthPx }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isHighlighted = isCellHighlighted(r, c);
                const isActivated = isCellActivated(r, c);
                const activatedBooster = getActivatedBooster(r, c);
                const checker = (r + c) % 2 === 0 ? 'bg-neutral-800' : 'bg-neutral-700';
                const isBlocked = cell.state === 'blocked';

                return (
                  <div
                    key={`${r}-${c}`}
                    role={cell.state === 'ready' ? 'button' : undefined}
                    aria-label={cell.state === 'ready' ? `${getBoardObjectName(cell)} — показать описание` : undefined}
                    onClick={() => inspectBoardCell(cell)}
                    style={{
                      width: `${100 / boardCols}%`,
                      height: cellSize || 'auto',
                      aspectRatio: '1/1',
                    }}
                    className={`relative ${isBlocked ? 'bg-transparent' : `border border-neutral-950 ${checker}`} ${cell.state === 'ready' ? 'cursor-pointer active:brightness-125' : ''}`}
                  >
                    {cell.state === 'ready' && cell.type === 'warrior' && (
                      <div className="absolute inset-0 flex items-end justify-center z-10 pointer-events-none pb-0.5">
                        <WarriorVisual warriorId={cell.warriorId} colorIdx={cell.colorIdx ?? 0} tier={cell.tier ?? 1} className="w-[100%] h-[120%] -mb-1" />
                      </div>
                    )}

                    {cell.state === 'ready' && cell.type === 'coin' && (
                      <div className="absolute inset-1.5 rounded-full bg-yellow-400 border-[3px] border-yellow-600 flex items-center justify-center shadow-[0_0_8px_rgba(250,204,21,0.3)]">
                        <span className="text-yellow-800 font-bold text-lg leading-none -mt-0.5">¢</span>
                      </div>
                    )}

                    {cell.state === 'ready' && cell.type === 'booster' && cell.boosterType && (
                      <div className="absolute inset-1 z-10 pointer-events-none">
                        <BoosterVisual type={cell.boosterType} />
                      </div>
                    )}

                    {cell.state === 'empty' && isNextSpawnCell(r, c) && (
                      <div className="absolute inset-1 rounded-sm bg-neutral-950/40 flex items-center justify-center">
                        <svg className="absolute w-3/4 h-3/4 -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-neutral-800"
                            strokeWidth="4"
                            stroke="currentColor"
                            fill="transparent"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-white/50"
                            strokeWidth="4"
                            strokeDasharray={`${nextSpawnProgress * 100}, 100`}
                            stroke="currentColor"
                            fill="transparent"
                            strokeLinecap="round"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                      </div>
                    )}

                    {isHighlighted && <div className="absolute inset-0 bg-white/40 ring-2 ring-inset ring-white z-10" />}
                    {isActivated && <div className="absolute inset-0 bg-white animate-pulse z-20 pointer-events-none" />}
                    {activatedBooster && (
                      <BoosterActivationEffect
                        type={activatedBooster.type}
                        chromaColorIndices={activatedBooster.chromaColorIndices}
                      />
                    )}
                  </div>
                );
              }),
            )}
            <AnimatePresence mode="wait">
              {matchFeedback && <MatchBonusFeedback key={matchFeedback.id} bonus={matchFeedback} />}
            </AnimatePresence>
          </div>

          <div className="w-full max-w-[360px] mt-2 h-[96px] relative">
            <div
              className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-end pr-8"
            >
              <TimerProgress
                stage={generatorStage}
                isDragging={dragState === 'dragging'}
                paused={isBattlePaused}
                onAdvanceStage={handleAdvanceStage}
              />
            </div>

            <div className="absolute inset-y-0 left-1/2 w-1/2 flex items-center justify-start pl-8">
              <div
                ref={generatorRef}
                className="shrink-0 bg-neutral-800 rounded-xl border-2 border-neutral-700 shadow-inner flex items-center justify-center relative"
                style={{ width: GENERATOR_CONFIG.slotWidthPx, height: GENERATOR_CONFIG.slotHeightPx }}
              >
                <span className="text-neutral-600 font-bold opacity-30 text-xs tracking-[0.24em] pointer-events-none">
                  GENERATOR
                </span>
              </div>
            </div>
          </div>
        </div>

        {renderPiece()}

        <AnimatePresence>
          {isUpgradeOpen && upgradeChoices && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[120] bg-black/42 backdrop-blur-[2px] flex flex-col pointer-events-auto"
            >
              <motion.div
                initial={{ scale: 0.96, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 20 }}
                className="w-full px-3 pt-3 pb-3 bg-[linear-gradient(180deg,rgba(3,7,18,0.96)_0%,rgba(3,7,18,0.94)_78%,rgba(3,7,18,0.4)_100%)] border-b border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
              >
                <div className="mx-auto w-full max-w-[460px] flex flex-col gap-3">
                  <div className="text-center">
                    <div className="text-white text-[30px] leading-none font-black tracking-[0.24em]">ASCEND</div>
                    <div className="text-neutral-400 text-xs mt-1 tracking-[0.16em] uppercase">Choose one boost</div>
                  </div>

                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-950/35 px-3 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
                      <div className="text-[10px] font-black tracking-[0.22em] text-red-100/70">ENEMY PORTAL</div>
                      <div className="h-3.5 w-px bg-white/10" />
                      <div className="flex items-center gap-1.5">
                        {stageTheme.dominantColorIndices.map((colorIdx) => (
                          <span
                            key={colorIdx}
                            className={`h-3.5 w-3.5 rounded-full border border-white/60 shadow-[0_0_10px_rgba(255,255,255,0.14)] ${WARRIOR_COLORS[colorIdx]}`}
                            title={WARRIOR_COLOR_NAMES[colorIdx]}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {upgradeChoices.map((card) => (
                      (() => {
                        const copy = getUpgradeCopy(card, playerBuild);
                        const recommendationReasons = card.type === 'tier' && stageTheme.dominantColorIndices.includes(card.colorIdx)
                          ? getPerkRecommendationReasons(card.perkId, stageTheme)
                          : [];
                        const isRecommendedPerk = recommendationReasons.length > 0;

                        return (
                          <button
                            key={card.id}
                            onClick={() => applyUpgrade(card)}
                            className={`relative min-w-0 min-h-[190px] overflow-hidden rounded-[26px] border px-2.5 py-2.5 text-left transition active:scale-[0.99] ${CARD_RARITY_STYLES[card.rarity]}`}
                          >
                            <div className="absolute inset-0 opacity-75 pointer-events-none">
                              {(card.type === 'tier' || card.type === 'summonWarriors') && (
                                <div className={`absolute -right-6 top-5 h-24 w-24 rounded-full blur-2xl ${WARRIOR_COLORS[card.colorIdx]}`} />
                              )}
                              {card.rarity === 'legendary' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_55%)]" />}
                            </div>
                            <div className="relative flex h-full flex-col">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="inline-flex rounded-full border border-white/15 bg-black/25 px-2 py-1 text-[8px] font-black leading-none tracking-[0.14em] text-white/70">
                                    {copy.eyebrow}
                                  </div>
                                  {copy.subject && <div className="mt-2 text-[9px] font-bold leading-[1.08] text-white/55">{copy.subject}</div>}
                                </div>
                                <div className="shrink-0">
                                  {card.type === 'wallHeal' ? (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-[15px] border border-amber-200/30 bg-amber-300/20 text-lg text-amber-200 shadow-[0_8px_20px_rgba(0,0,0,0.24)]">
                                      ⛨
                                    </div>
                                  ) : card.type === 'spawnBooster' ? (
                                    <div className="h-10 w-10">
                                      <BoosterVisual type="chroma" />
                                    </div>
                                  ) : (
                                    <div className="relative h-10 w-10">
                                      <WarriorVisual
                                        warriorId={card.warriorId}
                                        colorIdx={card.colorIdx}
                                        tier={
                                          card.type === 'tier'
                                            ? card.targetTier
                                            : (playerBuild.deck.find((entry) => entry.colorIdx === card.colorIdx)?.tier ?? 1)
                                        }
                                        className="w-full h-full"
                                      />
                                      {isRecommendedPerk && (
                                        <div
                                          aria-label="Рекомендованный перк"
                                          title={`Рекомендуется: ${recommendationReasons.join(', ')}`}
                                          className="absolute -right-1 -top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-100/80 bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,.8)]"
                                        >
                                          <ThumbsUp className="h-3 w-3" strokeWidth={3} />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {card.type === 'tier' && <div className="mt-3 text-[8px] font-black tracking-[0.16em] text-white/45">ПЕРК</div>}
                              <div className={`${card.type === 'tier' ? 'mt-1' : 'mt-3'} text-[14px] font-black leading-[1.05] text-white text-balance`}>
                                {copy.title}
                              </div>
                              <div className="mt-2 text-[11px] font-semibold leading-[1.18] text-white/78">
                                {copy.description}
                              </div>
                              {copy.footer && (
                                <div className="mt-auto pt-3">
                                  <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2 py-1.5 text-center text-[8px] font-black leading-tight tracking-[0.08em] text-emerald-100">
                                    {copy.footer}
                                  </div>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })()
                    ))}
                  </div>

                  <div className="flex justify-center pt-1">
                    <button
                      onClick={rerollUpgradeDraft}
                      disabled={!upgradeRerollAvailable}
                      className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/88 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Reroll
                    </button>
                  </div>
                </div>
              </motion.div>
              <div className="flex-1" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPauseMenu && gameStatus === 'playing' && (
            <PauseMenu theme={stageTheme} onResume={() => setShowPauseMenu(false)} />
          )}
          {inspectedCell && gameStatus === 'playing' && (
            <BoardObjectTooltip cell={inspectedCell} build={playerBuild} onClose={() => setInspectedCell(null)} />
          )}
          {showStagePreview && !showDeckScreen && gameStatus === 'playing' && (
            <StagePreview
              theme={stageTheme}
              onFight={startBattle}
              onReroll={rerollStage}
              onDeck={() => setShowDeckScreen(true)}
              randomizedBoard={randomizedBoard}
              onRandomizedBoardChange={(enabled) => {
                setRandomizedBoard(enabled);
                setBoard(DEFAULT_GAME_DESIGN.board.createInitialBoard(playerBuild, { randomizedTopology: enabled }));
                setGeneratorSequence(DEFAULT_GAME_DESIGN.generator.generateShapeSequence());
                setGeneratorStage(1);
              }}
            />
          )}
          {showDeckScreen && gameStatus === 'playing' && (
            <DeckScreen build={playerBuild} onBack={() => setShowDeckScreen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameStatus !== 'playing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-neutral-900 border-2 border-neutral-700 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 w-full max-w-[320px]"
              >
                <div className={`text-5xl font-black tracking-widest ${gameStatus === 'victory' ? 'text-yellow-400' : 'text-red-500'}`}>
                  {gameStatus === 'victory' ? 'VICTORY' : 'DEFEAT'}
                </div>
                <div className="text-neutral-400 text-center text-sm font-medium">
                  {gameStatus === 'victory'
                    ? 'The enemy portal collapsed. Your warband broke the siege.'
                    : 'Your gate fell before the portal could be destroyed.'}
                </div>
                <div className="flex items-center justify-center gap-2 text-xl font-bold bg-black/30 px-6 py-3 rounded-xl border border-neutral-800 w-full">
                  <span>💰</span>
                  <span className="text-yellow-400">{coins}</span>
                </div>
                <button
                  onClick={handleRestart}
                  className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-neutral-200 active:scale-95 transition-all text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  PLAY AGAIN
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
