export type BoosterType = 'cross' | 'bomb' | 'chroma';
export type CellType = 'warrior' | 'coin' | 'booster';
export type CellState = 'empty' | 'ready';

export type CellData = {
  type?: CellType;
  colorIdx?: number;
  warriorId?: import('./content').WarriorId;
  tier?: number;
  boosterType?: BoosterType;
  state: CellState;
};

export type BoardCellPosition = {
  r: number;
  c: number;
};

export type WarriorSpawnRequest = {
  col: number;
  colorIdx: number;
  warriorId?: import('./content').WarriorId;
  tier: number;
};

export type BlockDef = {
  id: string;
  x: number;
  y: number;
};

export type ShapeDef = {
  blocks: BlockDef[];
  width: number;
  height: number;
  cx: number;
  cy: number;
};

export type PointerPosition = {
  x: number;
  y: number;
};

export type DragState = 'idle' | 'dragging';

export type PlacementPreview = {
  isOverBoard: boolean;
  isValidPlacement: boolean;
  snappedC: number;
  snappedR: number;
  coveredCells: BoardCellPosition[];
};

export type PlacementMatchBonus = {
  kind: 'good' | 'perfect';
  label: 'GOOD MATCH!' | 'PERFECT MATCH!';
  generatedCells: 1 | 2;
};

export type BoardActivationResult = {
  nextBoard: CellData[][];
  activatedCells: BoardCellPosition[];
  earnedCoins: number;
  spawnedWarriors: WarriorSpawnRequest[];
  activatedBoosters: Array<{
    position: BoardCellPosition;
    type: BoosterType;
    chromaColorIndices: number[];
  }>;
};
