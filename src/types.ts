import type { StageTheme } from './game/stageTheme';
import type { CombatClass, PerkId, WarriorId } from './game/content';

export type Faction = 'player' | 'enemy';
export type UnitClass = 'melee' | 'ranged';

export type Entity = {
  id: string;
  faction: Faction;
  unitClass: UnitClass;
  combatClass?: CombatClass;
  warriorId?: WarriorId;
  perks?: PerkId[];
  enemyKind?: 'basic' | 'signature';
  colorIdx: number | null;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldTimer: number;
  warded: boolean;
  armor: number;
  regenPerSec: number;
  moveSpeedMultiplier: number;
  frozenTimer: number;
  stunnedTimer: number;
  poisonStacks: number;
  poisonTimer: number;
  poisonDps: number;
  poisonSourceId: string | null;
  poisonSpreadAtMax: boolean;
  frozenById: string | null;
  tauntSourceId: string | null;
  tauntTimer: number;
  damageTakenMultiplier: number;
  signatureTimer: number;
  perkTimer: number;
  attackCount: number;
  comboTargetId: string | null;
  comboHits: number;
  empoweredHitMultiplier: number;
  deathProcessed: boolean;
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
  attackerId?: string;
  warriorId?: WarriorId;
  frostHit?: boolean;
};

export type BattleEffect = {
  id: string;
  kind: 'knockback' | 'heal' | 'ward' | 'explosion' | 'freeze' | 'taunt' | 'lightning';
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
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
  effects: BattleEffect[];
  playerBaseHp: number;
  enemyStructureHp: number;
  battleTimeSec: number;
  phase: number;
  startDelayTimer: number;
  enemyStructureAttackTimer: number;
  portalEffectTimer: number;
  enemySpawnCooldownMs: number;
  waveIndex: number;
  phaseWaveIndex: number;
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
