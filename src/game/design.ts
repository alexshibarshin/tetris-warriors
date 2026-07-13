import { generateShapeSequence } from './generator';
import { applyShapeToBoard, createInitialBoard, fillCell, fillRandomEmptyCell, fillRandomEmptyCellsWithBoosters, fillRandomEmptyCellsWithColor, generateCell, getPlacementMatchBonus, pickRandomEmptyCell } from './board';
import { createBattleState, healPlayerBase, spawnPlayerWarriors, stepBattleState } from './battle';

export const DEFAULT_GAME_DESIGN = {
  board: {
    createInitialBoard,
    fillCell,
    generateCell,
    fillRandomEmptyCell,
    fillRandomEmptyCellsWithColor,
    fillRandomEmptyCellsWithBoosters,
    pickRandomEmptyCell,
    applyShapeToBoard,
    getPlacementMatchBonus,
  },
  generator: {
    generateShapeSequence,
  },
  battle: {
    createBattleState,
    healPlayerBase,
    spawnPlayerWarriors,
    stepBattleState,
  },
} as const;
