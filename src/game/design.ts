import { generateShapeSequence } from './generator';
import { applyShapeToBoard, createInitialBoard, fillCell, fillRandomEmptyCell, generateCell, pickRandomEmptyCell } from './board';
import { createBattleState, spawnPlayerWarriors, stepBattleState } from './battle';

export const DEFAULT_GAME_DESIGN = {
  board: {
    createInitialBoard,
    fillCell,
    generateCell,
    fillRandomEmptyCell,
    pickRandomEmptyCell,
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
