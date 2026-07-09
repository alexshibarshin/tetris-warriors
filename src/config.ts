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
    wallMaxHealth: 1000,
    enemySpawnRateMs: 2500,
    initialWaveDelaySec: 4,
    interWaveDelaySec: 3,

    aggroRangeX: 160,
    aggroRangeY: 400,

    meleeRange: 35,
    rangedRange: 160,

    meleeDamage: 15,
    rangedDamage: 10,
    enemyDamage: 10,
    wallDamage: 20,

    warriorHp: 36,
    enemyHp: 42,

    moveSpeed: 45,
    projectileSpeed: 200,

    attackCooldownMs: 1150,
    attackVisualDurationMs: 220,
    attackVisualLungePx: 10,
    attackVisualLiftPx: 4,
    attackVisualTiltDeg: 8,
    attackVisualStretch: 0.1,

    separationRadius: 25,
    separationForce: 60,

    warriorWrongColorDamageMultiplier: 0.7,
    enemyWrongColorDamageMultiplier: 1.3,

    playerSpawnYOffsetPx: 10,
    enemySpawnYOffsetPx: 10,
    spawnJitterPx: 10,
    spawnJitterHalfRangePx: 5,

    enemySpawnBands: [
      { minRatio: 0.35, maxRatio: 0.65 },
      { minRatio: 0.2, maxRatio: 0.8 },
    ],
    enemySpawnPaddingPx: 20,

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
  waves: [
    { totalEnemies: 4, spawnRateMs: 3500, hpMultiplier: 0.65, damageMultiplier: 0.65 },
    { totalEnemies: 7, spawnRateMs: 3000, hpMultiplier: 0.8, damageMultiplier: 0.8 },
    { totalEnemies: 10, spawnRateMs: 1500, hpMultiplier: 0.8, damageMultiplier: 0.7 },
    { totalEnemies: 13, spawnRateMs: 1000, hpMultiplier: 0.7, damageMultiplier: 0.55 },
    { totalEnemies: 18, spawnRateMs: 700, hpMultiplier: 0.5, damageMultiplier: 0.35 },
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
export const WAVES = GAME_CONFIG.waves;
export const WARRIOR_COLORS = GAME_CONFIG.colors.warriorBg;
export const WARRIOR_TEXT_COLORS = GAME_CONFIG.colors.warriorText;
export const WARRIOR_HEX_COLORS = GAME_CONFIG.colors.warriorHex;
