export const BATTLE_CONFIG = {
  wallMaxHealth: 1000,
  enemySpawnRateMs: 2500,
  initialWaveDelaySec: 4,
  
  aggroRangeX: 160, // Dynamic lanes: max horizontal distance to target
  aggroRangeY: 200, // Max vertical distance to notice a target
  
  meleeRange: 35,
  rangedRange: 160,
  
  meleeDamage: 15,
  rangedDamage: 10,
  enemyDamage: 10,
  wallDamage: 20, // Damage enemies deal to wall per hit
  
  warriorHp: 36,
  enemyHp: 42,
  
  moveSpeed: 45, // pixels per second
  projectileSpeed: 200, // pixels per second
  
  attackCooldownMs: 1150,
  
  shapeGeneratorCooldown: 3000,
  shapeGrowthN: 2500,
  shapeGrowthM: 2200,
  shapeGrowthK: 2000,

  separationRadius: 25,
  separationForce: 60,
  
  warriorWrongColorDamageMultiplier: 0.2, // Warriors deal 20% damage if color mismatch
  enemyWrongColorDamageMultiplier: 1.4, // Enemies deal a modest damage bonus to mismatched warrior colors
};

export const WAVES = [
  { totalEnemies: 4, spawnRateMs: 4500, hpMultiplier: 0.65, damageMultiplier: 0.65 },
  { totalEnemies: 7, spawnRateMs: 4200, hpMultiplier: 0.75, damageMultiplier: 0.75 },
  { totalEnemies: 11, spawnRateMs: 3200, hpMultiplier: 0.9, damageMultiplier: 0.9 },
  { totalEnemies: 20, spawnRateMs: 2000, hpMultiplier: 1.2, damageMultiplier: 1.2 },
  { totalEnemies: 30, spawnRateMs: 1500, hpMultiplier: 1.5, damageMultiplier: 1.5 },
];

export const WARRIOR_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-purple-500'
];

export const WARRIOR_TEXT_COLORS = [
  'text-red-500',
  'text-blue-500',
  'text-green-500',
  'text-amber-500',
  'text-purple-500'
];

export const WARRIOR_HEX_COLORS = [
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#a855f7'  // purple-500
];
