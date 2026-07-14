export const GAME_CONFIG = {
  board: {
    cols: 6,
    rows: 4,
    maxWidthPx: 320,
    dragPreviewExpandFactor: 0.5,
    initialFilledCells: 9,
    initialCoins: 2,
    respawnIntervalsMs: {
      critical: 1500,
      low: 3000,
      normal: 5000,
    },
    criticalOccupancyMax: 4,
    lowOccupancyMax: 10,
    activationFlashMs: 250,
    boosterChance: 0.08,
  },
  generator: {
    dragOffsetPx: -40,
    idleScale: 0.6,
    stageCount: 4,
    tetrominoRotationCount: 4,
    coinTargetShare: 0.18,
    coinMinShare: 0.15,
    coinMaxShare: 0.22,
    coinCorrectionStrength: 1.75,
    coinRecoveryChance: 0.5,
    coinSurplusChance: 0.05,
    previewGrabInsetPx: 10,
    slotWidthPx: 40,
    slotHeightPx: 20,
    spacerSizePx: 12,
    stageDurationsMs: [3000, 2500, 2200, 2000],
  },
  battle: {
    gameplayHeightPx: 450,
    playerBaseMaxHealth: 1000,
    // Early Perfect Matches create a large first volley. The portal needs a
    // meaningful reserve so that victory remains a late-game payoff.
    enemyStructureMaxHealth: 2000,
    initialWaveDelaySec: 4,

    aggroRangeX: 160,
    aggroRangeY: 400,

    meleeRange: 35,
    rangedRange: 160,
    structureAttackRange: 170,

    meleeDamage: 15,
    rangedDamage: 10,
    enemyDamage: 6,
    playerBaseDamage: 8,
    structureDamage: 18,
    structureDamageMultipliersByPhase: [1, 1.1, 1.2, 1.35, 1.5, 1.7, 2.0],

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

    warriorWrongColorDamageMultiplier: 0.65,
    enemyWrongColorDamageMultiplier: 1.0,

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
    emergencyDefenseCooldownMultiplier: 0.8,

    playerBasePulseHealthStep: 0.2,
    playerBasePulseCount: 4,
    playerBasePulseRangePx: 150,
    playerBasePulseKnockbackPx: 90,
    playerBasePulseStunSec: 2.5,
    playerBasePulseDamage: 1,
    enemyWaveSuppressionAttackerCount: 6,
    suddenDeathStartSec: 180,
    suddenDeathIntervalSec: 10,
    suddenDeathDamageBonusPerStep: 0.5,

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

    // Units are rendered at roughly 48 px wide.  This leaves a forgiving, but
    // still visible, collision margin around their bodies.
    projectileHitRadiusPx: 22,
    projectileMaxLeadTimeSec: 1.1,
    damageTextYOffsetPx: 10,
    damageTextRiseSpeedPxPerSec: 20,
    damageTextLifeSec: 1,
    entityCleanupAboveTopPx: 100,

    unitClassChance: 0.5,
    neutralEnemySharesByPhase: [0.54, 0.46, 0.38, 0.3, 0.24, 0.18, 0.14],
    challengePrimaryColorShare: 0.72,
  },
  progression: {
    maxTier: 4,
    tierStatBonusPerLevel: 0.25,
    tierUpgradeSpawnWeightMultiplier: 1.1,
    wallHealFraction: 0.25,
    wallHealOfferMinMissingFraction: 0.15,
    rarityOfferWeights: {
      rare: 7,
      epic: 6,
      legendary: 5,
    },
    summonWarriorsCardCount: 3,
    boosterCardSpawnCount: 1,
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
      spawnIntervalSec: 5.5,
      hpMultiplier: 0.65,
      damageMultiplier: 0.5,
      packSizeMin: 3,
      packSizeMax: 4,
    },
    {
      startAtSec: 20,
      spawnIntervalSec: 5,
      hpMultiplier: 0.7,
      damageMultiplier: 0.62,
      packSizeMin: 3,
      packSizeMax: 4,
    },
    {
      startAtSec: 40,
      spawnIntervalSec: 5.2,
      hpMultiplier: 0.7,
      damageMultiplier: 0.65,
      packSizeMin: 3,
      packSizeMax: 5,
    },
    {
      startAtSec: 60,
      spawnIntervalSec: 5.2,
      hpMultiplier: 0.85,
      damageMultiplier: 0.88,
      packSizeMin: 4,
      packSizeMax: 5,
    },
    {
      startAtSec: 90,
      // Phase 5 begins the late game, but is still a bridge to the climax.
      spawnIntervalSec: 5,
      hpMultiplier: 1,
      damageMultiplier: 1.02,
      packSizeMin: 4,
      packSizeMax: 5,
    },
    {
      // Act 6: builds should now have access to their defining perk synergies.
      startAtSec: 120,
      spawnIntervalSec: 4.7,
      hpMultiplier: 1.15,
      damageMultiplier: 1.18,
      packSizeMin: 4,
      packSizeMax: 6,
    },
    {
      // Act 7 is a compact climax, not another long plateau.
      startAtSec: 150,
      spawnIntervalSec: 4.5,
      hpMultiplier: 1.5,
      damageMultiplier: 1.38,
      packSizeMin: 4,
      packSizeMax: 6,
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
