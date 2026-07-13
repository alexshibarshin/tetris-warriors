import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
import { createStageTheme } from './game/stageTheme';
import { BattleSnapshot } from './types';
import {
  BoardCellPosition,
  CellData,
  DragState,
  ShapeDef,
} from './game/types';

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
    const currentTier = playerBuild.deck.find((entry) => entry.colorIdx === card.colorIdx)?.tier ?? card.targetTier - 1;
    return {
      title: `${WARRIOR_COLOR_NAMES[card.colorIdx]} tier`,
      description: `${currentTier} -> ${card.targetTier}`,
    };
  }

  if (card.type === 'summonWarriors') {
    return {
      title: `${WARRIOR_COLOR_NAMES[card.colorIdx]} warriors`,
      description: `Spawn ${card.summonCount} now`,
    };
  }

  if (card.type === 'spawnBooster') {
    return {
      title: 'Arcane cache',
      description: `Spawn ${card.boosterCount} random booster`,
    };
  }

  return {
    title: 'Gate heal',
    description: `Restore ${Math.round(card.healFraction * 100)}% HP`,
  };
}

export default function App() {
  const [playerBuild, setPlayerBuild] = useState(() => createInitialPlayerBuild());
  const [stageTheme, setStageTheme] = useState(() => createStageTheme());
  const [generatorSequence, setGeneratorSequence] = useState<ShapeDef[]>(
    DEFAULT_GAME_DESIGN.generator.generateShapeSequence,
  );
  const [generatorStage, setGeneratorStage] = useState(1);
  const [board, setBoard] = useState<CellData[][]>(() => DEFAULT_GAME_DESIGN.board.createInitialBoard(createInitialPlayerBuild()));
  const [dragState, setDragState] = useState<DragState>('idle');
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [activatedCells, setActivatedCells] = useState<BoardCellPosition[]>([]);
  const [activatedBoosters, setActivatedBoosters] = useState<ReturnType<typeof DEFAULT_GAME_DESIGN.board.applyShapeToBoard>['activatedBoosters']>([]);
  const [coins, setCoins] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [battleSnapshot, setBattleSnapshot] = useState<BattleSnapshot>({
    playerBaseHp: BATTLE_CONFIG.playerBaseMaxHealth,
    playerBaseMaxHp: BATTLE_CONFIG.playerBaseMaxHealth,
    enemyStructureHp: BATTLE_CONFIG.enemyStructureMaxHealth,
    enemyStructureMaxHp: BATTLE_CONFIG.enemyStructureMaxHealth,
    phase: 0,
  });
  const [upgradeChoices, setUpgradeChoices] = useState<UpgradeCard[] | null>(null);
  const [upgradeRerollAvailable, setUpgradeRerollAvailable] = useState(false);
  const [boardRect, setBoardRect] = useState<DOMRect | null>(null);
  const [generatorRect, setGeneratorRect] = useState<DOMRect | null>(null);
  const [nextSpawnCell, setNextSpawnCell] = useState<BoardCellPosition | null>(null);
  const [nextSpawnProgress, setNextSpawnProgress] = useState(0);
  const [nextSpawnStartedAt, setNextSpawnStartedAt] = useState<number | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const generatorRef = useRef<HTMLDivElement>(null);
  const battleAreaRef = useRef<BattleAreaRef>(null);
  const pauseStartedAtRef = useRef<number | null>(null);

  const isUpgradeOpen = upgradeChoices !== null;
  const isBattlePaused = gameStatus === 'playing' && isUpgradeOpen;

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

    const tick = (now: number) => {
      const progress = Math.min((now - nextSpawnStartedAt) / BOARD_CONFIG.respawnIntervalMs, 1);
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
  }, [gameStatus, isBattlePaused, nextSpawnCell, nextSpawnStartedAt, playerBuild]);

  const handleRestart = () => {
    const nextBuild = createInitialPlayerBuild();
    const nextTheme = createStageTheme();
    setPlayerBuild(nextBuild);
    setStageTheme(nextTheme);
    setCoins(0);
    setBoard(DEFAULT_GAME_DESIGN.board.createInitialBoard(nextBuild));
    setGeneratorSequence(DEFAULT_GAME_DESIGN.generator.generateShapeSequence());
    setGeneratorStage(1);
    setGameStatus('playing');
    setDragState('idle');
    setUpgradeChoices(null);
    setUpgradeRerollAvailable(false);
    setActivatedCells([]);
    setActivatedBoosters([]);
    setNextSpawnCell(null);
    setNextSpawnProgress(0);
    setNextSpawnStartedAt(null);
    battleAreaRef.current?.reset(nextTheme);
  };

  const cellSize = boardRect ? boardRect.width / BOARD_CONFIG.cols : 0;
  const shape = generatorStage > 0 ? generatorSequence[generatorStage - 1] : null;
  const placement = evaluatePlacementPreview({
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
      const activationResult = DEFAULT_GAME_DESIGN.board.applyShapeToBoard(board, placement.coveredCells);
      setBoard(activationResult.nextBoard);

      if (activationResult.activatedCells.length > 0) {
        setActivatedCells(activationResult.activatedCells);
        setActivatedBoosters(activationResult.activatedBoosters);
        setCoins((currentCoins) => currentCoins + activationResult.earnedCoins);

        if (activationResult.spawnedWarriors.length > 0) {
          battleAreaRef.current?.spawnWarriors(activationResult.spawnedWarriors, BOARD_CONFIG.cols, playerBuild);
        }
      }

      setGeneratorSequence(DEFAULT_GAME_DESIGN.generator.generateShapeSequence());
      setGeneratorStage(0);
      setDragState('idle');

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

  const openUpgradeDraft = () => {
    if (coins < PROGRESSION_CONFIG.upgradeCostCoins || gameStatus !== 'playing' || isUpgradeOpen) {
      return;
    }

    const choices = generateUpgradeChoices(playerBuild, {
      playerBaseHp: battleSnapshot.playerBaseHp,
      playerBaseMaxHp: battleSnapshot.playerBaseMaxHp,
    });

    if (choices.length < 3) {
      return;
    }

    setCoins((currentCoins) => currentCoins - PROGRESSION_CONFIG.upgradeCostCoins);
    setUpgradeChoices(choices);
    setUpgradeRerollAvailable(true);
    setDragState('idle');
  };

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
      setUpgradeChoices(null);
      setUpgradeRerollAvailable(false);
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
      setUpgradeChoices(null);
      setUpgradeRerollAvailable(false);
      return;
    }

    if (card.type === 'spawnBooster') {
      setBoard((currentBoard) =>
        DEFAULT_GAME_DESIGN.board.fillRandomEmptyCellsWithBoosters(currentBoard, card.boosterCount),
      );
      setUpgradeChoices(null);
      setUpgradeRerollAvailable(false);
      return;
    }

    const nextBuild = applyUpgradeCard(playerBuild, card);
    setPlayerBuild(nextBuild);

    if (card.type === 'tier') {
      setBoard((currentBoard) => applyTierUpgradeToBoard(currentBoard, nextBuild, card.colorIdx));
    }

    setUpgradeChoices(null);
    setUpgradeRerollAvailable(false);
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
            className="flex flex-wrap w-full bg-neutral-800 border-t border-l border-neutral-950 rounded-md shadow-inner box-content"
            style={{ maxWidth: BOARD_CONFIG.maxWidthPx }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isHighlighted = isCellHighlighted(r, c);
                const isActivated = isCellActivated(r, c);
                const activatedBooster = getActivatedBooster(r, c);
                const checker = (r + c) % 2 === 0 ? 'bg-neutral-800' : 'bg-neutral-700';

                return (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      width: `${100 / BOARD_CONFIG.cols}%`,
                      height: cellSize || 'auto',
                      aspectRatio: '1/1',
                    }}
                    className={`relative border-r border-b border-neutral-950 ${checker}`}
                  >
                    {cell.state === 'ready' && cell.type === 'warrior' && (
                      <div className="absolute inset-0 flex items-end justify-center z-10 pointer-events-none pb-0.5">
                        <WarriorVisual colorIdx={cell.colorIdx ?? 0} tier={cell.tier ?? 1} className="w-[100%] h-[120%] -mb-1" />
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
          </div>

          <div className="w-full max-w-[360px] mt-2 h-[96px] relative">
            <div
              className="absolute inset-y-0 left-0 w-1/3 flex items-center justify-end pr-3"
            >
              <TimerProgress
                stage={generatorStage}
                isDragging={dragState === 'dragging'}
                paused={isBattlePaused}
                onAdvanceStage={handleAdvanceStage}
              />
            </div>

            <div className="absolute inset-y-0 left-1/3 w-1/3 flex items-center justify-center">
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

            <div className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-center">
              <button
                onClick={openUpgradeDraft}
                disabled={gameStatus !== 'playing' || isUpgradeOpen || coins < PROGRESSION_CONFIG.upgradeCostCoins}
                className="h-[92px] w-[92px] rounded-2xl border border-amber-300/40 bg-gradient-to-b from-amber-300 to-orange-500 px-2 py-2 text-center text-black shadow-[0_10px_30px_rgba(245,158,11,0.35)] transition disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
              >
                <div className="text-[9px] font-black tracking-[0.24em]">UPGRADE</div>
                <div className="mt-2 text-sm font-bold leading-tight">
                  <div>{PROGRESSION_CONFIG.upgradeCostCoins}</div>
                  <div>COINS</div>
                </div>
              </button>
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

                        return (
                          <button
                            key={card.id}
                            onClick={() => applyUpgrade(card)}
                            className={`relative min-w-0 min-h-[180px] overflow-hidden rounded-[26px] border px-3 py-3 text-left transition active:scale-[0.99] ${CARD_RARITY_STYLES[card.rarity]}`}
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
                                  <div className="mt-1 text-[16px] leading-[1.1] font-black text-white text-balance">
                                    {copy.title}
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  {card.type === 'wallHeal' ? (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-amber-200/30 bg-amber-300/20 text-xl text-amber-200 shadow-[0_8px_20px_rgba(0,0,0,0.24)]">
                                      ⛨
                                    </div>
                                  ) : card.type === 'spawnBooster' ? (
                                    <div className="h-12 w-12">
                                      <BoosterVisual type="chroma" />
                                    </div>
                                  ) : (
                                    <div className="relative h-12 w-12">
                                      <WarriorVisual
                                        colorIdx={card.colorIdx}
                                        tier={
                                          card.type === 'tier'
                                            ? card.targetTier
                                            : (playerBuild.deck.find((entry) => entry.colorIdx === card.colorIdx)?.tier ?? 1)
                                        }
                                        className="w-full h-full"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-auto pt-6 text-[18px] leading-[1.05] font-bold text-white/92">
                                {copy.description}
                              </div>
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
