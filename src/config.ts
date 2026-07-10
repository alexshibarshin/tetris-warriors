export const GAME_CONFIG = {
  board: {
    cols: 6,
    rows: 4,
    maxWidthPx: 320,
    dragPreviewExpandFactor: 0.5,
    initialFilledCells: 9,
    initialCoins: 2,
    respawnIntervalMs: 5000,
    activationFlashMs: 250,
  },
  generator: {
    dragOffsetPx: -80,
    idleScale: 0.6,
    stageCount: 4,
    tetrominoRotationCount: 4,
    coinChance: 0.25,
    previewGrabInsetPx: 10,
    slotWidthPx: 40,
    slotHeightPx: 20,
    spacerSizePx: 12,
    stageDurationsMs: [3000, 2500, 2200, 2000],
  },
  battle: {
    gameplayHeightPx: 420,
    playerBaseMaxHealth: 1000,
    enemyStructureMaxHealth: 1000,
    initialWaveDelaySec: 5,

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

    warriorWrongColorDamageMultiplier: 0.7,
    enemyWrongColorDamageMultiplier: 1.3,

    playerSpawnYOffsetPx: 28,
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
    playerSpawnRealizationRate: 0.62,
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
    challengeStageDualColorChance: 0.42,
    neutralEnemySharesByPhase: [0.54, 0.46, 0.38, 0.3, 0.2],
    challengePrimaryColorShare: 0.72,
  },
  progression: {
    upgradeCostCoins: 1,
    maxTier: 4,
    tierStatBonusPerLevel: 0.5,
    tierUpgradeSpawnWeightMultiplier: 1.1,
    wallHealFraction: 0.25,
    wallHealOfferMinMissingFraction: 0.15,
    rarityOfferWeights: {
      rare: 7,
      epic: 6,
      legendary: 5,
    },
    summonWarriorsCardCount: 3,
    playerDeck: [
      { colorIdx: 0, name: 'Red', unitClass: 'melee' },
      { colorIdx: 1, name: 'Blue', unitClass: 'ranged' },
      { colorIdx: 2, name: 'Green', unitClass: 'melee' },
      { colorIdx: 3, name: 'Yellow', unitClass: 'ranged' },
      { colorIdx: 4, name: 'Purple', unitClass: 'melee' },
    ],
  },
  spawnPhases: [
    {
      startAtSec: 0,
      pressureBudget: 0.4,
      hpMultiplier: 0.54,
      damageMultiplier: 0.4,
      packSizeMin: 1,
      packSizeMax: 2,
      burstChance: 0.0,
      burstCountMin: 2,
      burstCountMax: 2,
      burstIntervalMinMs: 320,
      burstIntervalMaxMs: 460,
    },
    {
      startAtSec: 25,
      pressureBudget: 0.46,
      hpMultiplier: 0.6,
      damageMultiplier: 0.44,
      packSizeMin: 1,
      packSizeMax: 2,
      burstChance: 0.0,
      burstCountMin: 1,
      burstCountMax: 3,
      burstIntervalMinMs: 300,
      burstIntervalMaxMs: 430,
    },
    {
      startAtSec: 50,
      pressureBudget: 0.6,
      hpMultiplier: 0.72,
      damageMultiplier: 0.52,
      packSizeMin: 1,
      packSizeMax: 3,
      burstChance: 0.0,
      burstCountMin: 1,
      burstCountMax: 3,
      burstIntervalMinMs: 280,
      burstIntervalMaxMs: 390,
    },
    {
      startAtSec: 75,
      pressureBudget: 0.75,
      hpMultiplier: 0.85,
      damageMultiplier: 0.6,
      packSizeMin: 2,
      packSizeMax: 4,
      burstChance: 0.0,
      burstCountMin: 1,
      burstCountMax: 4,
      burstIntervalMinMs: 250,
      burstIntervalMaxMs: 360,
    },
    {
      startAtSec: 110,
      pressureBudget: 0.85,
      hpMultiplier: 1.0,
      damageMultiplier: 0.7,
      packSizeMin: 2,
      packSizeMax: 5,
      burstChance: 0.0,
      burstCountMin: 1,
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
    warriorNames: ['Red', 'Blue', 'Green', 'Yellow', 'Purple'],
    neutralHex: '#9ca3af',
  },
} as const;

export const BOARD_CONFIG = GAME_CONFIG.board;
export const GENERATOR_CONFIG = GAME_CONFIG.generator;
export const BATTLE_CONFIG = GAME_CONFIG.battle;
export const PROGRESSION_CONFIG = GAME_CONFIG.progression;
export const SPAWN_PHASES = GAME_CONFIG.spawnPhases;
export const WARRIOR_COLORS = GAME_CONFIG.colors.warriorBg;
export const WARRIOR_TEXT_COLORS = GAME_CONFIG.colors.warriorText;
export const WARRIOR_HEX_COLORS = GAME_CONFIG.colors.warriorHex;
export const WARRIOR_COLOR_NAMES = GAME_CONFIG.colors.warriorNames;
export const NEUTRAL_HEX_COLOR = GAME_CONFIG.colors.neutralHex;
