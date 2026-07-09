import { GENERATOR_CONFIG } from '../config';
import { BlockDef, ShapeDef } from './types';

const TETROMINOES = [
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
];

function normalizeShape(blocks: BlockDef[]): ShapeDef {
  const minX = Math.min(...blocks.map((block) => block.x));
  const minY = Math.min(...blocks.map((block) => block.y));
  const normalizedBlocks = blocks.map((block) => ({
    ...block,
    x: block.x - minX,
    y: block.y - minY,
  }));
  const maxX = Math.max(...normalizedBlocks.map((block) => block.x));
  const maxY = Math.max(...normalizedBlocks.map((block) => block.y));
  const width = maxX + 1;
  const height = maxY + 1;

  return {
    blocks: normalizedBlocks,
    width,
    height,
    cx: width / 2,
    cy: height / 2,
  };
}

function rotateShape(shape: { x: number; y: number }[]) {
  return shape.map((point) => ({ x: -point.y, y: point.x }));
}

function buildProgressiveSequence(rotatedShape: { x: number; y: number }[]) {
  const remaining = [...rotatedShape];
  const startIndex = Math.floor(Math.random() * remaining.length);
  const buildSequence = [remaining.splice(startIndex, 1)[0]];

  while (remaining.length > 0) {
    const adjacentIndexes = remaining
      .map((block, index) => {
        const isAdjacent = buildSequence.some(
          (selected) => Math.abs(selected.x - block.x) + Math.abs(selected.y - block.y) === 1,
        );
        return isAdjacent ? index : -1;
      })
      .filter((index) => index !== -1);

    const pickedIndex = adjacentIndexes[Math.floor(Math.random() * adjacentIndexes.length)];
    buildSequence.push(remaining.splice(pickedIndex, 1)[0]);
  }

  return buildSequence;
}

export function generateShapeSequence(): ShapeDef[] {
  const baseShape = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  const rotations = Math.floor(Math.random() * GENERATOR_CONFIG.tetrominoRotationCount);

  let rotated = baseShape;
  for (let rotationIndex = 0; rotationIndex < rotations; rotationIndex += 1) {
    rotated = rotateShape(rotated);
  }

  const buildSequence = buildProgressiveSequence(rotated);
  const currentBlocks: BlockDef[] = [];
  const sequence: ShapeDef[] = [];

  for (let blockIndex = 0; blockIndex < GENERATOR_CONFIG.tetrominoRotationCount; blockIndex += 1) {
    currentBlocks.push({
      id: `b${blockIndex + 1}`,
      x: buildSequence[blockIndex].x,
      y: buildSequence[blockIndex].y,
    });
    sequence.push(normalizeShape([...currentBlocks]));
  }

  return sequence;
}
