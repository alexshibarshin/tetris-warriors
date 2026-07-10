import { BOARD_CONFIG, GENERATOR_CONFIG } from '../config';
import {
  BoardActivationResult,
  BoardCellPosition,
  CellData,
  DragState,
  PlacementPreview,
  PointerPosition,
  ShapeDef,
} from './types';
import { getDeckEntry, pickWeightedDeckColor, PlayerBuildState } from './progression';

export function generateCell(build: PlayerBuildState): CellData {
  const isCoin = Math.random() < GENERATOR_CONFIG.coinChance;

  if (isCoin) {
    return createCoinCell();
  }

  const colorIdx = pickWeightedDeckColor(build);
  const entry = getDeckEntry(build, colorIdx);

  return {
    type: 'warrior',
    colorIdx,
    tier: entry.tier,
    state: 'ready',
  };
}

export function createEmptyCell(): CellData {
  return { state: 'empty' };
}

function createCoinCell(): CellData {
  return { type: 'coin', state: 'ready' };
}

export function createInitialBoard(build: PlayerBuildState): CellData[][] {
  let board = Array.from({ length: BOARD_CONFIG.rows }, () =>
    Array.from({ length: BOARD_CONFIG.cols }, createEmptyCell),
  );

  const totalCells = BOARD_CONFIG.rows * BOARD_CONFIG.cols;
  const cellsToFill = Math.min(BOARD_CONFIG.initialFilledCells, totalCells);
  const initialCoins = Math.min(BOARD_CONFIG.initialCoins, cellsToFill);

  for (let i = 0; i < initialCoins; i += 1) {
    const targetCell = pickRandomEmptyCell(board);

    if (!targetCell) {
      return board;
    }

    board = fillCellWithData(board, targetCell, createCoinCell());
  }

  for (let i = initialCoins; i < cellsToFill; i += 1) {
    const targetCell = pickRandomEmptyCell(board);

    if (!targetCell) {
      return board;
    }

    board = fillCellWithData(board, targetCell, createRandomWarriorCell(build));
  }

  return board;
}

function createWarriorCell(build: PlayerBuildState, colorIdx: number): CellData {
  const entry = getDeckEntry(build, colorIdx);

  return {
    type: 'warrior',
    colorIdx,
    tier: entry.tier,
    state: 'ready',
  };
}

function createRandomWarriorCell(build: PlayerBuildState): CellData {
  const colorIdx = pickWeightedDeckColor(build);
  return createWarriorCell(build, colorIdx);
}

export function fillRandomEmptyCell(board: CellData[][], build: PlayerBuildState): CellData[][] {
  const targetCell = pickRandomEmptyCell(board);

  if (!targetCell) {
    return board;
  }

  return fillCell(board, targetCell, build);
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

export function fillCell(board: CellData[][], cell: BoardCellPosition, build: PlayerBuildState): CellData[][] {
  const nextBoard = board.map((row) => [...row]);
  const targetCell = nextBoard[cell.r]?.[cell.c];

  if (!targetCell || targetCell.state !== 'empty') {
    return board;
  }

  nextBoard[cell.r][cell.c] = generateCell(build);

  return nextBoard;
}

function fillCellWithData(board: CellData[][], cell: BoardCellPosition, data: CellData): CellData[][] {
  const nextBoard = board.map((row) => [...row]);
  const targetCell = nextBoard[cell.r]?.[cell.c];

  if (!targetCell || targetCell.state !== 'empty') {
    return board;
  }

  nextBoard[cell.r][cell.c] = data;

  return nextBoard;
}

export function fillRandomEmptyCellsWithColor(board: CellData[][], build: PlayerBuildState, colorIdx: number, count: number): CellData[][] {
  const nextBoard = board.map((row) => [...row]);
  const emptyCells: BoardCellPosition[] = [];

  nextBoard.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell.state === 'empty') {
        emptyCells.push({ r, c });
      }
    });
  });

  for (let index = emptyCells.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [emptyCells[index], emptyCells[swapIndex]] = [emptyCells[swapIndex], emptyCells[index]];
  }

  const cellsToFill = Math.min(count, emptyCells.length);
  for (let index = 0; index < cellsToFill; index += 1) {
    const cell = emptyCells[index];
    nextBoard[cell.r][cell.c] = createWarriorCell(build, colorIdx);
  }

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
        tier: cell.tier ?? 1,
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
