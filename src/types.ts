export type Faction = 'player' | 'enemy';
export type UnitClass = 'melee' | 'ranged';

export type Entity = {
  id: string;
  faction: Faction;
  unitClass: UnitClass;
  colorIdx: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
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
  targetId: string;
  damage: number;
  colorIdx: number;
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
  wallHp: number;
  wave: number;
  enemiesSpawnedInWave: number;
  waveDelayTimer: number;
  status: 'playing' | 'victory' | 'defeat';
};
