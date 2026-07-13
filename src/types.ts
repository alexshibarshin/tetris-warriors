import type { StageTheme } from './game/stageTheme';

export type Faction = 'player' | 'enemy';
export type UnitClass = 'melee' | 'ranged';

export type Entity = {
  id: string;
  faction: Faction;
  unitClass: UnitClass;
  colorIdx: number | null;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  damageMultiplier: number;
  targetId: string | null;
  attackTimer: number;
  attackVisualTimer: number;
  attackVisualDurationMs: number;
  attackVisualDx: number;
  attackVisualDy: number;
  idleTargetX?: number;
  idleTargetY?: number;
  idleTimer?: number;
};

export type Projectile = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetId: string | 'enemy-structure';
  targetKind: 'entity' | 'enemyStructure';
  damage: number;
  colorIdx: number | null;
  faction: Faction;
};

export type DamageText = {
  id: string;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
};

export type BattleState = {
  entities: Entity[];
  projectiles: Projectile[];
  damageTexts: DamageText[];
  playerBaseHp: number;
  enemyStructureHp: number;
  battleTimeSec: number;
  phase: number;
  startDelayTimer: number;
  enemyStructureAttackTimer: number;
  enemySpawnCooldownMs: number;
  status: 'playing' | 'victory' | 'defeat';
  stageTheme: StageTheme;
};

export type BattleSnapshot = {
  playerBaseHp: number;
  playerBaseMaxHp: number;
  enemyStructureHp: number;
  enemyStructureMaxHp: number;
  phase: number;
};
