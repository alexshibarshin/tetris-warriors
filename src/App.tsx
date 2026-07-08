import { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WARRIOR_COLORS, BATTLE_CONFIG } from './config';
import { BattleArea, BattleAreaRef } from './components/BattleArea';
import { WarriorVisual } from './components/WarriorVisual';

// --- Configuration ---
const BOARD_COLS = 6;
const BOARD_ROWS = 4;
const VERTICAL_OFFSET_PX = -80; // Upward offset when dragging so finger doesn't cover piece
const GENERATOR_SCALE = 0.6; // Scale of the piece when sitting idle in the slot
const COOLDOWN_MS = 20000;

type BlockDef = { id: string; x: number; y: number };
type ShapeDef = { blocks: BlockDef[]; width: number; height: number; cx: number; cy: number };

function normalizeShape(blocks: BlockDef[]): ShapeDef {
  const minX = Math.min(...blocks.map(b => b.x));
  const minY = Math.min(...blocks.map(b => b.y));
  const normalizedBlocks = blocks.map(b => ({ ...b, x: b.x - minX, y: b.y - minY }));
  const maxX = Math.max(...normalizedBlocks.map(b => b.x));
  const maxY = Math.max(...normalizedBlocks.map(b => b.y));
  const width = maxX + 1;
  const height = maxY + 1;
  const cx = width / 2;
  const cy = height / 2;
  return { blocks: normalizedBlocks, width, height, cx, cy };
}

const TETROMINOES = [
  [{x:0,y:0}, {x:1,y:0}, {x:2,y:0}, {x:3,y:0}], // I
  [{x:0,y:0}, {x:1,y:0}, {x:0,y:1}, {x:1,y:1}], // O
  [{x:1,y:0}, {x:0,y:1}, {x:1,y:1}, {x:2,y:1}], // T
  [{x:1,y:0}, {x:2,y:0}, {x:0,y:1}, {x:1,y:1}], // S
  [{x:0,y:0}, {x:1,y:0}, {x:1,y:1}, {x:2,y:1}], // Z
  [{x:0,y:0}, {x:0,y:1}, {x:1,y:1}, {x:2,y:1}], // J
  [{x:2,y:0}, {x:0,y:1}, {x:1,y:1}, {x:2,y:1}], // L
];

function generateShapeSequence(): ShapeDef[] {
  // 1. Pick random tetromino
  const baseShape = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  
  // 2. Pick random rotation (0 to 3)
  const rotations = Math.floor(Math.random() * 4);
  let rotated = baseShape;
  for (let i = 0; i < rotations; i++) {
    rotated = rotated.map(p => ({ x: -p.y, y: p.x }));
  }
  
  // 3. Find a build sequence
  const remaining = [...rotated];
  const startIdx = Math.floor(Math.random() * remaining.length);
  const buildSeq = [remaining.splice(startIdx, 1)[0]];
  
  while (remaining.length > 0) {
    const possibleIndices = remaining.map((b, i) => {
      const isAdj = buildSeq.some(s => Math.abs(s.x - b.x) + Math.abs(s.y - b.y) === 1);
      return isAdj ? i : -1;
    }).filter(i => i !== -1);
    const pickIdx = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];
    buildSeq.push(remaining.splice(pickIdx, 1)[0]);
  }
  
  // 4. Create sequence of shapes
  const sequence: ShapeDef[] = [];
  const currentBlocks: BlockDef[] = [];
  for (let i = 0; i < 4; i++) {
    currentBlocks.push({ id: `b${i+1}`, x: buildSeq[i].x, y: buildSeq[i].y });
    sequence.push(normalizeShape([...currentBlocks]));
  }
  
  return sequence;
}

function TimerProgress({ 
  stage, 
  isDragging, 
  onAdvanceStage 
}: { 
  stage: number; 
  isDragging: boolean; 
  onAdvanceStage: () => void; 
}) {
  const [progress, setProgress] = useState(0);
  const lastTimeRef = useRef(performance.now());
  const elapsedRef = useRef(0);

  const targetDuration = stage === 0 
      ? BATTLE_CONFIG.shapeGeneratorCooldown 
      : stage === 1 ? BATTLE_CONFIG.shapeGrowthN
      : stage === 2 ? BATTLE_CONFIG.shapeGrowthM
      : stage === 3 ? BATTLE_CONFIG.shapeGrowthK
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
      if (stage === 4) return;
      
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
  }, [stage, isDragging, targetDuration, onAdvanceStage]);

  if (stage === 4) {
    return (
      <div className="w-12 h-12 flex items-center justify-center text-yellow-500 font-bold text-xs tracking-tighter">MAX</div>
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
        className={stage === 0 ? "text-neutral-500" : "text-yellow-400"}
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

type CellType = 'warrior' | 'coin';
type CellData = {
  type: CellType;
  colorIdx?: number;
  state: 'ready' | 'cooldown';
};

type WarriorEntity = {
  col: number;
  colorIdx: number;
};

function generateCell(): CellData {
  const isCoin = Math.random() < 0.2; // 20% chance for a coin (ratio 4:1)
  if (isCoin) {
    return { type: 'coin', state: 'ready' };
  } else {
    return { type: 'warrior', colorIdx: Math.floor(Math.random() * WARRIOR_COLORS.length), state: 'ready' };
  }
}

function createInitialBoard(): CellData[][] {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, generateCell)
  );
}

type DragState = 'idle' | 'dragging';

export default function App() {
  const [generatorSequence, setGeneratorSequence] = useState(generateShapeSequence);
  const [generatorStage, setGeneratorStage] = useState(1);
  const [board, setBoard] = useState(createInitialBoard);
  
  // Transient state
  const [dragState, setDragState] = useState<DragState>('idle');

  const handleAdvanceStage = useRef(() => {
    setGeneratorStage(s => Math.min(s + 1, 4));
  }).current;
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [activatedCells, setActivatedCells] = useState<{r: number, c: number}[]>([]);
  
  // Game state
  const [coins, setCoins] = useState(0);
  const [gameStatus, setGameStatus] = useState<'playing' | 'victory' | 'defeat'>('playing');

  const handleRestart = () => {
    setCoins(0);
    setBoard(createInitialBoard());
    setGeneratorSequence(generateShapeSequence());
    setGeneratorStage(1);
    setGameStatus('playing');
    setDragState('idle');
    setActivatedCells([]);
    battleAreaRef.current?.reset();
  };

  // Layout measurements
  const [boardRect, setBoardRect] = useState<DOMRect | null>(null);
  const [generatorRect, setGeneratorRect] = useState<DOMRect | null>(null);
  
  const boardRef = useRef<HTMLDivElement>(null);
  const generatorRef = useRef<HTMLDivElement>(null);
  const battleAreaRef = useRef<BattleAreaRef>(null);

  useLayoutEffect(() => {
    const measure = () => {
      if (boardRef.current) setBoardRect(boardRef.current.getBoundingClientRect());
      if (generatorRef.current) setGeneratorRect(generatorRef.current.getBoundingClientRect());
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const cellSize = boardRect ? boardRect.width / BOARD_COLS : 0;
  const shape = generatorStage > 0 ? generatorSequence[generatorStage - 1] : null;

  // Evaluate drag snapping and placement validity
  let isOverBoard = false;
  let snappedC = 0;
  let snappedR = 0;
  let isValidPlacement = false;
  const coveredCells: {r: number, c: number}[] = [];

  if (dragState === 'dragging' && shape && boardRect && cellSize) {
    const pieceCenterX = pointerPos.x;
    const pieceCenterY = pointerPos.y + VERTICAL_OFFSET_PX;

    // Add a small forgiving expand margin for the board bounds check
    const expand = cellSize * 0.5;
    if (
      pieceCenterX >= boardRect.left - expand && pieceCenterX <= boardRect.right + expand &&
      pieceCenterY >= boardRect.top - expand && pieceCenterY <= boardRect.bottom + expand
    ) {
      isOverBoard = true;
      const colFloat = (pieceCenterX - boardRect.left) / cellSize;
      const rowFloat = (pieceCenterY - boardRect.top) / cellSize;

      snappedC = Math.round(colFloat - shape.cx);
      snappedR = Math.round(rowFloat - shape.cy);

      isValidPlacement = true;
      for (const block of shape.blocks) {
        const c = snappedC + block.x;
        const r = snappedR + block.y;
        coveredCells.push({ r, c });
        // Check bounds
        if (c < 0 || c >= BOARD_COLS || r < 0 || r >= BOARD_ROWS) {
          isValidPlacement = false;
        }
      }
    }
  }

  const handleDrop = () => {
    if (isOverBoard && isValidPlacement) {
      const newlyActivated: {r: number, c: number}[] = [];
      let earnedCoins = 0;
      const spawnedWarriors: WarriorEntity[] = [];

      const nextBoard = board.map(row => [...row]);
      for (const {r, c} of coveredCells) {
        const cell = nextBoard[r][c];
        if (cell.state === 'ready') {
          newlyActivated.push({r, c});
          if (cell.type === 'coin') {
            earnedCoins++;
          } else if (cell.type === 'warrior') {
            spawnedWarriors.push({
              col: c,
              colorIdx: cell.colorIdx!,
            });
          }
          nextBoard[r][c] = { ...cell, state: 'cooldown' };
        }
      }
      setBoard(nextBoard);

      if (newlyActivated.length > 0) {
        setActivatedCells(newlyActivated);
        setCoins(c => c + earnedCoins);
        
        if (spawnedWarriors.length > 0) {
          battleAreaRef.current?.spawnWarriors(spawnedWarriors, BOARD_COLS);
        }
        
        newlyActivated.forEach(({r, c}) => {
          setTimeout(() => {
            setBoard(prevBoard => {
              const nextBoard = prevBoard.map(row => [...row]);
              if (nextBoard[r][c].state === 'cooldown') {
                  nextBoard[r][c] = generateCell();
              }
              return nextBoard;
            });
          }, COOLDOWN_MS);
        });
      }

      setGeneratorSequence(generateShapeSequence());
      setGeneratorStage(0);
      setDragState('idle');

      setTimeout(() => {
        setActivatedCells([]);
      }, 250);
    } else {
      setDragState('idle');
    }
  };

  const isCellHighlighted = (r: number, c: number) => {
    return dragState === 'dragging' && isOverBoard && isValidPlacement && 
           coveredCells.some(cell => cell.r === r && cell.c === c);
  };

  const isCellActivated = (r: number, c: number) => {
    return activatedCells.some(cell => cell.r === r && cell.c === c);
  };

  const renderPiece = () => {
    if (generatorStage === 0 || !shape || !cellSize || !generatorRect) return null;

    const pieceWidth = shape.width * cellSize;
    const pieceHeight = shape.height * cellSize;

    let targetX = 0;
    let targetY = 0;
    let targetScale = 1;

    if (dragState === 'idle') {
      // Position piece perfectly centered in the generator slot
      targetX = generatorRect.left + generatorRect.width / 2 - shape.cx * cellSize;
      targetY = generatorRect.top + generatorRect.height / 2 - shape.cy * cellSize;
      targetScale = GENERATOR_SCALE;
    } else if (dragState === 'dragging') {
      targetScale = 1;
      if (isOverBoard) {
        // Snapped grid position
        targetX = boardRect!.left + snappedC * cellSize;
        targetY = boardRect!.top + snappedR * cellSize;
      } else {
        // Free pointer follow
        targetX = pointerPos.x - shape.cx * cellSize;
        targetY = pointerPos.y + VERTICAL_OFFSET_PX - shape.cy * cellSize;
      }
    }

    const isInvalid = dragState === 'dragging' && isOverBoard && !isValidPlacement;

    return (
      <motion.div
        key="shape-container"
        initial={{ x: targetX, y: targetY, scale: 0, opacity: 0 }}
        animate={{ x: targetX, y: targetY, scale: targetScale, opacity: 1 }}
        transition={{ 
          type: dragState === 'dragging' ? 'tween' : 'spring', 
          duration: dragState === 'dragging' ? 0 : 0.35,
          bounce: 0.2 
        }}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: pieceWidth,
          height: pieceHeight,
          originX: shape.cx / shape.width,
          originY: shape.cy / shape.height,
          zIndex: 50,
          touchAction: 'none'
        }}
        onPointerDown={(e) => {
          if (dragState === 'idle') {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            setDragState('dragging');
            setPointerPos({ x: e.clientX, y: e.clientY });
          }
        }}
        onPointerMove={(e) => {
          if (dragState === 'dragging') {
            setPointerPos({ x: e.clientX, y: e.clientY });
          }
        }}
        onPointerUp={(e) => {
          if (dragState === 'dragging') {
            try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
            handleDrop();
          }
        }}
        onPointerCancel={(e) => {
          if (dragState === 'dragging') {
            try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
            setDragState('idle');
          }
        }}
      >
        {/* Enlarged invisible hit zone for grabbing */}
        <div className="absolute -inset-10 cursor-grab" />
        
        {/* Render tetromino blocks */}
        {shape.blocks.map((b) => (
          <motion.div 
            key={b.id}
            initial={{ scale: 0, opacity: 0, left: b.x * cellSize, top: b.y * cellSize }}
            animate={{ scale: 1, opacity: 1, left: b.x * cellSize, top: b.y * cellSize }}
            transition={{ type: 'spring', bounce: 0.3 }}
            style={{ 
              width: cellSize, 
              height: cellSize,
              position: 'absolute'
            }}
            className="p-0.5 pointer-events-none"
          >
            <div className={`w-full h-full rounded-sm shadow-md transition-colors ${
              isInvalid ? 'bg-red-500/25 border-2 border-red-500/80' : 'bg-white/25 border-2 border-white/80'
            }`} />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <div className="w-full h-[100dvh] bg-black flex justify-center items-center font-sans overflow-hidden">
      {/* Main Portrait Game Container */}
      <div className="w-full h-full max-w-md mx-auto relative bg-neutral-900 flex flex-col select-none touch-none overflow-hidden overscroll-none shadow-2xl">
        
        {/* Resource HUD Overlay */}
        <div className="absolute top-2 right-4 z-10 flex items-center gap-2 text-yellow-400 font-mono text-xl font-bold bg-black/50 px-4 py-1.5 rounded-full border border-yellow-600/30 shadow-lg">
          <span className="leading-none mt-0.5">💰</span>
          <span>{coins}</span>
        </div>

        {/* Upper Battle Area */}
        <BattleArea ref={battleAreaRef} onGameEnd={(res) => setGameStatus(res)} />

        {/* Lower Board Area */}
        <div className="p-4 flex flex-col gap-4 bg-neutral-900 flex-none pb-8 items-center w-full">
          
          {/* 6x4 Grid Board */}
          <div ref={boardRef} className="flex flex-wrap w-full max-w-[320px] bg-neutral-800 border-t border-l border-neutral-950 rounded-md shadow-inner box-content">
            {board.map((row, r) => row.map((cell, c) => {
              const isHigh = isCellHighlighted(r, c);
              const isAct = isCellActivated(r, c);
              const checker = (r + c) % 2 === 0 ? 'bg-neutral-800' : 'bg-neutral-700';
              
              return (
                <div 
                  key={`${r}-${c}`} 
                  style={{ width: '16.6666%', height: cellSize ? cellSize : 'auto', aspectRatio: '1/1' }} 
                  className={`relative border-r border-b border-neutral-950 ${checker}`}
                >
                  {/* Render Cell Contents */}
                  {cell.state === 'ready' && cell.type === 'warrior' && (
                    <div className="absolute inset-0 flex items-end justify-center z-10 pointer-events-none pb-0.5">
                      <WarriorVisual colorIdx={cell.colorIdx!} className="w-[100%] h-[120%] -mb-1" />
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
                          transition={{ duration: COOLDOWN_MS / 1000, ease: "linear" }}
                        />
                      </motion.svg>
                    </div>
                  )}
                  
                  {/* Drag Highlight Preview */}
                  {isHigh && <div className="absolute inset-0 bg-white/40 ring-2 ring-inset ring-white z-10" />}
                  
                  {/* Activation Flash Feedback */}
                  {isAct && <div className="absolute inset-0 bg-white animate-pulse z-20" />}
                </div>
              );
            }))}
          </div>

          {/* Bottom Generator Slot */}
          <div className="w-full flex items-center justify-center gap-4 mt-2">
            <TimerProgress 
              stage={generatorStage} 
              isDragging={dragState === 'dragging'} 
              onAdvanceStage={handleAdvanceStage} 
            />
            <div 
              ref={generatorRef}
              className="w-40 h-20 bg-neutral-800 rounded-xl border-2 border-neutral-700 shadow-inner flex items-center justify-center relative"
            >
              <span className="text-neutral-600 font-bold opacity-30 text-xs tracking-widest pointer-events-none">GENERATOR</span>
            </div>
            <div className="w-12 h-12" /> {/* Spacer to balance layout */}
          </div>

        </div>

        {/* Global Render Portal for Dragged Tetromino */}
        {renderPiece()}
        
        {/* Game Over / Victory Popup */}
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
                    ? "You successfully defended the wall against all waves." 
                    : "The wall has fallen. The enemy broke through."}
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
