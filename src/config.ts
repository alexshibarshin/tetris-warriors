export const GAME_CONFIG = {
  board: {
    cols: 6,
    rows: 4,
    maxWidthPx: 320,
    dragPreviewExpandFactor: 0.5,
    initialFilledCells: 8,
    respawnIntervalMs: 3000,
    activationFlashMs: 250,
  },
  generator: {
    dragOffsetPx: -80,
    idleScale: 0.6,
    stageCount: 4,
    tetrominoRotationCount: 4,
    coinChance: 0.2,
    previewGrabInsetPx: 10,
    slotWidthPx: 40,
    slotHeightPx: 20,
    spacerSizePx: 12,
    stageDurationsMs: [3000, 2500, 2200, 2000],
  },
  battle: {
    playerBaseMaxHealth: 1000,
    enemyStructureMaxHealth: 1000,
    initialWaveDelaySec: 4,

    aggroRangeX: 160,
    aggroRangeY: 400,

    meleeRange: 35,
    rangedRange: 160,
    structureAttackRange: 180,

    meleeDamage: 15,
    rangedDamage: 10,
    enemyDamage: 6,
    playerBaseDamage: 8,
    structureDamage: 15,

    warriorHp: 36,
    enemyHp: 32,

    moveSpeed: 45,
    projectileSpeed: 200,

    attackCooldownMs: 1150,
    structureAttackCooldownMs: 1500,
    attackVisualDurationMs: 220,
    attackVisualLungePx: 10,
    attackVisualLiftPx: 4,
    attackVisualTiltDeg: 8,
    attackVisualStretch: 0.1,

    separationRadius: 25,
    separationForce: 60,

    warriorWrongColorDamageMultiplier: 0.75,
    enemyWrongColorDamageMultiplier: 1.2,

    playerSpawnYOffsetPx: 10,
    enemySpawnYOffsetPx: 128,
    spawnJitterPx: 10,
    spawnJitterHalfRangePx: 5,
    enemySpawnPaddingPx: 20,
    enemyStructureXRatio: 0.5,
    enemyStructureYPx: 82,
    enemySpawnSpreadPx: 72,
    emergencySpawnRangePx: 170,
    enemyPressureRadiusPx: 210,
    playerPressureRadiusPx: 240,
    playerSpawnRealizationRate: 0.72,
    spawnCooldownVariance: 0.12,

    idleMoveSpeedMultiplier: 0.4,
    idleRetargetMinSec: 1,
    idleRetargetRangeSec: 2,
    idleWanderXRangePx: 120,
    idleWanderYRangePx: 100,
    idleLowerBoundFromBottomPx: 150,
    idleLowerBoundBonusDyPx: 40,
    idleUpperBoundFromBottomPx: 40,
    idleUpperBoundBonusDyPx: 20,
    idleTargetPaddingPx: 20,
    idleStopDistancePx: 5,

    projectileHitRadiusPx: 15,
    damageTextYOffsetPx: 10,
    damageTextRiseSpeedPxPerSec: 20,
    damageTextLifeSec: 1,
    entityCleanupAboveTopPx: 100,

    unitClassChance: 0.5,
  },
  spawnPhases: [
    {
      startAtSec: 0,
      pressureBudget: 0.4,
      hpMultiplier: 0.46,
      damageMultiplier: 0.36,
      packSizeMin: 1,
      packSizeMax: 2,
      burstChance: 0.0,
      burstCountMin: 2,
      burstCountMax: 2,
      burstIntervalMinMs: 320,
      burstIntervalMaxMs: 460,
    },
    {
      startAtSec: 20,
      pressureBudget: 0.42,
      hpMultiplier: 0.52,
      damageMultiplier: 0.42,
      packSizeMin: 1,
      packSizeMax: 3,
      burstChance: 0.0,
      burstCountMin: 2,
      burstCountMax: 3,
      burstIntervalMinMs: 300,
      burstIntervalMaxMs: 430,
    },
    {
      startAtSec: 40,
      pressureBudget: 0.45,
      hpMultiplier: 0.6,
      damageMultiplier: 0.48,
      packSizeMin: 1,
      packSizeMax: 3,
      burstChance: 0.0,
      burstCountMin: 2,
      burstCountMax: 3,
      burstIntervalMinMs: 280,
      burstIntervalMaxMs: 390,
    },
    {
      startAtSec: 60,
      pressureBudget: 0.48,
      hpMultiplier: 0.75,
      damageMultiplier: 0.54,
      packSizeMin: 2,
      packSizeMax: 3,
      burstChance: 0.0,
      burstCountMin: 2,
      burstCountMax: 4,
      burstIntervalMinMs: 250,
      burstIntervalMaxMs: 360,
    },
    {
      startAtSec: 90,
      pressureBudget: 0.5,
      hpMultiplier: 0.9,
      damageMultiplier: 0.6,
      packSizeMin: 2,
      packSizeMax: 4,
      burstChance: 0.0,
      burstCountMin: 3,
      burstCountMax: 4,
      burstIntervalMinMs: 230,
      burstIntervalMaxMs: 340,
    },
  ],
  colors: {
    warriorBg: [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-amber-500',
      'bg-purple-500'
    ],
    warriorText: [
      'text-red-500',
      'text-blue-500',
      'text-green-500',
      'text-amber-500',
      'text-purple-500'
    ],
    warriorHex: [
      '#ef4444',
      '#3b82f6',
      '#22c55e',
      '#f59e0b',
      '#a855f7'
    ],
  },
} as const;

export const BOARD_CONFIG = GAME_CONFIG.board;
export const GENERATOR_CONFIG = GAME_CONFIG.generator;
export const BATTLE_CONFIG = GAME_CONFIG.battle;
export const SPAWN_PHASES = GAME_CONFIG.spawnPhases;
export const WARRIOR_COLORS = GAME_CONFIG.colors.warriorBg;
export const WARRIOR_TEXT_COLORS = GAME_CONFIG.colors.warriorText;
export const WARRIOR_HEX_COLORS = GAME_CONFIG.colors.warriorHex;
