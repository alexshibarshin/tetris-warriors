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

export function createEmptyCell(): CellData {
  return { state: 'empty' };
}

export function createInitialBoard(): CellData[][] {
  let board = Array.from({ length: BOARD_CONFIG.rows }, () =>
    Array.from({ length: BOARD_CONFIG.cols }, createEmptyCell),
  );

  const totalCells = BOARD_CONFIG.rows * BOARD_CONFIG.cols;
  const cellsToFill = Math.min(BOARD_CONFIG.initialFilledCells, totalCells);

  for (let i = 0; i < cellsToFill; i += 1) {
    board = fillRandomEmptyCell(board);
  }

  return board;
}

export function fillRandomEmptyCell(board: CellData[][]): CellData[][] {
  const targetCell = pickRandomEmptyCell(board);

  if (!targetCell) {
    return board;
  }

  return fillCell(board, targetCell);
}

export function pickRandomEmptyCell(board: CellData[][]): BoardCellPosition | null {
  const emptyCells: BoardCellPosition[] = [];

  board.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell.state === 'empty') {
        emptyCells.push({ r, c });
      }
    });
  });

  if (emptyCells.length === 0) {
    return null;
  }

  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

export function fillCell(board: CellData[][], cell: BoardCellPosition): CellData[][] {
  const nextBoard = board.map((row) => [...row]);
  const targetCell = nextBoard[cell.r]?.[cell.c];

  if (!targetCell || targetCell.state !== 'empty') {
    return board;
  }

  nextBoard[cell.r][cell.c] = generateCell();

  return nextBoard;
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

    nextBoard[r][c] = createEmptyCell();
  }

  return {
    nextBoard,
    activatedCells,
    earnedCoins,
    spawnedWarriors,
  };
}
