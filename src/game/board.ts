import { BOARD_CONFIG, GENERATOR_CONFIG, WARRIOR_COLORS } from '../config';
import {
  BoardActivationResult,
  BoardCellPosition,
  CellData,
  DragState,
  PlacementPreview,
  PointerPosition,
  ShapeDef,
} from './types';

export function generateCell(): CellData {
  const isCoin = Math.random() < GENERATOR_CONFIG.coinChance;

  if (isCoin) {
    return { type: 'coin', state: 'ready' };
  }

  return {
    type: 'warrior',
    colorIdx: Math.floor(Math.random() * WARRIOR_COLORS.length),
    state: 'ready',
  };
}

export function createInitialBoard(): CellData[][] {
  return Array.from({ length: BOARD_CONFIG.rows }, () =>
    Array.from({ length: BOARD_CONFIG.cols }, generateCell),
  );
}

export function evaluatePlacementPreview(params: {
  dragState: DragState;
  shape: ShapeDef | null;
  boardRect: DOMRect | null;
  cellSize: number;
  pointerPos: PointerPosition;
}): PlacementPreview {
  const { dragState, shape, boardRect, cellSize, pointerPos } = params;
  const emptyPreview: PlacementPreview = {
    isOverBoard: false,
    isValidPlacement: false,
    snappedC: 0,
    snappedR: 0,
    coveredCells: [],
  };

  if (dragState !== 'dragging' || !shape || !boardRect || !cellSize) {
    return emptyPreview;
  }

  const pieceCenterX = pointerPos.x;
  const pieceCenterY = pointerPos.y + GENERATOR_CONFIG.dragOffsetPx;
  const expand = cellSize * BOARD_CONFIG.dragPreviewExpandFactor;
  const isOverBoard =
    pieceCenterX >= boardRect.left - expand &&
    pieceCenterX <= boardRect.right + expand &&
    pieceCenterY >= boardRect.top - expand &&
    pieceCenterY <= boardRect.bottom + expand;

  if (!isOverBoard) {
    return emptyPreview;
  }

  const colFloat = (pieceCenterX - boardRect.left) / cellSize;
  const rowFloat = (pieceCenterY - boardRect.top) / cellSize;
  const snappedC = Math.round(colFloat - shape.cx);
  const snappedR = Math.round(rowFloat - shape.cy);
  const coveredCells: BoardCellPosition[] = [];

  let isValidPlacement = true;
  for (const block of shape.blocks) {
    const c = snappedC + block.x;
    const r = snappedR + block.y;
    coveredCells.push({ r, c });

    if (c < 0 || c >= BOARD_CONFIG.cols || r < 0 || r >= BOARD_CONFIG.rows) {
      isValidPlacement = false;
    }
  }

  return {
    isOverBoard: true,
    isValidPlacement,
    snappedC,
    snappedR,
    coveredCells,
  };
}

export function applyShapeToBoard(board: CellData[][], coveredCells: BoardCellPosition[]): BoardActivationResult {
  const nextBoard = board.map((row) => [...row]);
  const activatedCells: BoardCellPosition[] = [];
  const spawnedWarriors: BoardActivationResult['spawnedWarriors'] = [];
  let earnedCoins = 0;

  for (const { r, c } of coveredCells) {
    const cell = nextBoard[r]?.[c];
    if (!cell || cell.state !== 'ready') {
      continue;
    }

    activatedCells.push({ r, c });

    if (cell.type === 'coin') {
      earnedCoins += 1;
    } else {
      spawnedWarriors.push({
        col: c,
        colorIdx: cell.colorIdx ?? 0,
      });
    }

    nextBoard[r][c] = { ...cell, state: 'cooldown' };
  }

  return {
    nextBoard,
    activatedCells,
    earnedCoins,
    spawnedWarriors,
    cooldownCells: activatedCells,
  };
}

export function refreshBoardCell(board: CellData[][], cell: BoardCellPosition) {
  const nextBoard = board.map((row) => [...row]);
  const current = nextBoard[cell.r]?.[cell.c];

  if (current?.state === 'cooldown') {
    nextBoard[cell.r][cell.c] = generateCell();
  }

  return nextBoard;
}
