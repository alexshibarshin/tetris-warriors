import { generateShapeSequence } from './generator';
import { applyShapeToBoard, createInitialBoard, generateCell } from './board';
import { createBattleState, spawnPlayerWarriors, stepBattleState } from './battle';

export const DEFAULT_GAME_DESIGN = {
  board: {
    createInitialBoard,
    generateCell,
    applyShapeToBoard,
  },
  generator: {
    generateShapeSequence,
  },
  battle: {
    createBattleState,
    spawnPlayerWarriors,
    stepBattleState,
  },
} as const;
