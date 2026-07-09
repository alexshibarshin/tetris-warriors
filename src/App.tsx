import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BOARD_CONFIG, GENERATOR_CONFIG } from './config';
import { BattleArea, BattleAreaRef } from './components/BattleArea';
import { WarriorVisual } from './components/WarriorVisual';
import { DEFAULT_GAME_DESIGN } from './game/design';
import {
  evaluatePlacementPreview,
  refreshBoardCell,
} from './game/board';
import {
  BoardCellPosition,
  CellData,
  DragState,
  ShapeDef,
} from './game/types';

function TimerProgress({
  stage,
  isDragging,
  onAdvanceStage,
}: {
  stage: number;
  isDragging: boolean;
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

      if (!isDragging) {
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
  }, [isDragging, onAdvanceStage, stage, targetDuration]);

  if (stage === GENERATOR_CONFIG.stageCount) {
    return (
      <div className="w-12 h-12 flex items-center justify-center text-yellow-500 font-bold text-xs tracking-tighter">
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

type GameStatus = 'playing' | 'victory' | 'defeat';

export default function App() {
  const [generatorSequence, setGeneratorSequence] = useState<ShapeDef[]>(
    DEFAULT_GAME_DESIGN.generator.generateShapeSequence,
  );
  const [generatorStage, setGeneratorStage] = useState(1);
  const [board, setBoard] = useState<CellData[][]>(DEFAULT_GAME_DESIGN.board.createInitialBoard);
  const [dragState, setDragState] = useState<DragState>('idle');
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [activatedCells, setActivatedCells] = useState<BoardCellPosition[]>([]);
  const [coins, setCoins] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [boardRect, setBoardRect] = useState<DOMRect | null>(null);
  const [generatorRect, setGeneratorRect] = useState<DOMRect | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const generatorRef = useRef<HTMLDivElement>(null);
  const battleAreaRef = useRef<BattleAreaRef>(null);

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

  const handleRestart = () => {
    setCoins(0);
    setBoard(DEFAULT_GAME_DESIGN.board.createInitialBoard());
    setGeneratorSequence(DEFAULT_GAME_DESIGN.generator.generateShapeSequence());
    setGeneratorStage(1);
    setGameStatus('playing');
    setDragState('idle');
    setActivatedCells([]);
    battleAreaRef.current?.reset();
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
    if (placement.isOverBoard && placement.isValidPlacement) {
      const activationResult = DEFAULT_GAME_DESIGN.board.applyShapeToBoard(board, placement.coveredCells);
      setBoard(activationResult.nextBoard);

      if (activationResult.activatedCells.length > 0) {
        setActivatedCells(activationResult.activatedCells);
        setCoins((currentCoins) => currentCoins + activationResult.earnedCoins);

        if (activationResult.spawnedWarriors.length > 0) {
          battleAreaRef.current?.spawnWarriors(activationResult.spawnedWarriors, BOARD_CONFIG.cols);
        }

        activationResult.cooldownCells.forEach((cell) => {
          setTimeout(() => {
            setBoard((prevBoard) => refreshBoardCell(prevBoard, cell));
          }, BOARD_CONFIG.cellCooldownMs);
        });
      }

      setGeneratorSequence(DEFAULT_GAME_DESIGN.generator.generateShapeSequence());
      setGeneratorStage(0);
      setDragState('idle');

      setTimeout(() => {
        setActivatedCells([]);
      }, BOARD_CONFIG.activationFlashMs);
      return;
    }

    setDragState('idle');
  };

  const isCellHighlighted = (r: number, c: number) =>
    dragState === 'dragging' &&
    placement.isOverBoard &&
    placement.isValidPlacement &&
    placement.coveredCells.some((cell) => cell.r === r && cell.c === c);

  const isCellActivated = (r: number, c: number) =>
    activatedCells.some((cell) => cell.r === r && cell.c === c);

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
        }}
        onPointerDown={(event) => {
          if (dragState === 'idle') {
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
        <div className="absolute top-2 right-4 z-10 flex items-center gap-2 text-yellow-400 font-mono text-xl font-bold bg-black/50 px-4 py-1.5 rounded-full border border-yellow-600/30 shadow-lg">
          <span className="leading-none mt-0.5">💰</span>
          <span>{coins}</span>
        </div>

        <BattleArea ref={battleAreaRef} onGameEnd={(result) => setGameStatus(result)} />

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
                        <WarriorVisual colorIdx={cell.colorIdx ?? 0} className="w-[100%] h-[120%] -mb-1" />
                      </div>
                    )}

                    {cell.state === 'ready' && cell.type === 'coin' && (
                      <div className="absolute inset-1.5 rounded-full bg-yellow-400 border-[3px] border-yellow-600 flex items-center justify-center shadow-[0_0_8px_rgba(250,204,21,0.3)]">
                        <span className="text-yellow-800 font-bold text-lg leading-none -mt-0.5">¢</span>
                      </div>
                    )}

                    {cell.state === 'cooldown' && (
                      <div className="absolute inset-1 rounded-sm bg-neutral-950/40 flex items-center justify-center">
                        <motion.svg className="absolute w-3/4 h-3/4 -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-neutral-800"
                            strokeWidth="4"
                            stroke="currentColor"
                            fill="transparent"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <motion.path
                            className="text-white/50"
                            strokeWidth="4"
                            strokeDasharray="100, 100"
                            stroke="currentColor"
                            fill="transparent"
                            strokeLinecap="round"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            initial={{ strokeDashoffset: 100 }}
                            animate={{ strokeDashoffset: 0 }}
                            transition={{ duration: BOARD_CONFIG.cellCooldownMs / 1000, ease: 'linear' }}
                          />
                        </motion.svg>
                      </div>
                    )}

                    {isHighlighted && <div className="absolute inset-0 bg-white/40 ring-2 ring-inset ring-white z-10" />}
                    {isActivated && <div className="absolute inset-0 bg-white animate-pulse z-20" />}
                  </div>
                );
              }),
            )}
          </div>

          <div className="w-full flex items-center justify-center gap-4 mt-2">
            <TimerProgress
              stage={generatorStage}
              isDragging={dragState === 'dragging'}
              onAdvanceStage={handleAdvanceStage}
            />
            <div
              ref={generatorRef}
              className="bg-neutral-800 rounded-xl border-2 border-neutral-700 shadow-inner flex items-center justify-center relative"
              style={{ width: GENERATOR_CONFIG.slotWidthPx, height: GENERATOR_CONFIG.slotHeightPx }}
            >
              <span className="text-neutral-600 font-bold opacity-30 text-xs tracking-widest pointer-events-none">
                GENERATOR
              </span>
            </div>
            <div style={{ width: GENERATOR_CONFIG.spacerSizePx, height: GENERATOR_CONFIG.spacerSizePx }} />
          </div>
        </div>

        {renderPiece()}

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
                    ? 'You successfully defended the wall against all waves.'
                    : 'The wall has fallen. The enemy broke through.'}
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
