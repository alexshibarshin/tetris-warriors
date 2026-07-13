import { BATTLE_CONFIG, SPAWN_PHASES, WARRIOR_COLORS } from '../config';
import type { PerkId } from './content';

export type PortalEffectId = 'knockback' | 'heal' | 'ward' | 'volatile';
export type EnemyThemeId = 'horde' | 'elite' | 'armor' | 'rush' | 'backline' | 'regen';
export type SpawnPatternId = 'steady' | 'surge' | 'heavy' | 'alternating' | 'escalating';

export type PortalEffectDefinition = {
  id: PortalEffectId; name: string; icon: string; shortText: string; hint: string; intervalSec: number;
};
export type EnemyThemeDefinition = {
  id: EnemyThemeId; name: string; icon: string; shortText: string; hint: string;
};
export type SpawnPatternDefinition = {
  id: SpawnPatternId; name: string; icon: string; shortText: string;
};
export type WavePressureProfile = {
  intervalMultiplier: number;
  packMultiplier: number;
  hpMultiplier: number;
  damageMultiplier: number;
  signatureChanceBonus: number;
};

export const PORTAL_EFFECTS: PortalEffectDefinition[] = [
  { id: 'knockback', name: 'Портал Бури', icon: '↟', shortText: 'Периодически отталкивает воинов.', hint: 'Дальний бой или стойкость помогут.', intervalSec: 11 },
  { id: 'heal', name: 'Портал Жизни', icon: '✦', shortText: 'Периодически лечит всех врагов.', hint: 'Нужны фокус, яд или мощные удары.', intervalSec: 10 },
  { id: 'ward', name: 'Портал Щитов', icon: '◇', shortText: 'Даёт врагам щит от следующего удара.', hint: 'Частые атаки быстро сбивают щиты.', intervalSec: 9 },
  { id: 'volatile', name: 'Пепельный Портал', icon: '✹', shortText: 'Убитые враги взрываются рядом с собой.', hint: 'Дистанция и щиты помогут пережить взрывы.', intervalSec: 0 },
];

export const ENEMY_THEMES: EnemyThemeDefinition[] = [
  { id: 'horde', name: 'Орда', icon: '♟♟', shortText: 'Много слабых врагов.', hint: 'Полезен массовый урон.' },
  { id: 'elite', name: 'Элиты', icon: '♛', shortText: 'Мало очень живучих врагов.', hint: 'Полезен урон в одну цель.' },
  { id: 'armor', name: 'Броня', icon: '⬟', shortText: 'Броня режет каждый слабый удар.', hint: 'Полезны тяжёлые удары и яд.' },
  { id: 'rush', name: 'Налёт', icon: '➤', shortText: 'Быстрые враги давят заднюю линию.', hint: 'Полезны контроль и бойцы.' },
  { id: 'backline', name: 'Прикрытый стрелок', icon: '⌁', shortText: 'Опасный враг прячется за фронтом.', hint: 'Доберитесь до задней линии.' },
  { id: 'regen', name: 'Регенерация', icon: '♥', shortText: 'Враги медленно восстанавливают здоровье.', hint: 'Полезны яд, фокус и добивание.' },
];

export const SPAWN_PATTERNS: SpawnPatternDefinition[] = [
  { id: 'steady', name: 'Давление', icon: '••••', shortText: 'Частые небольшие волны.' },
  { id: 'surge', name: 'Набеги', icon: '•••  •••', shortText: 'Большие волны с паузами.' },
  { id: 'heavy', name: 'Тяжёлые волны', icon: '◆   ◆', shortText: 'Редкие сильные враги.' },
  { id: 'alternating', name: 'Чередование', icon: '• ◆ • ◆', shortText: 'Обычные и опасные волны чередуются.' },
  { id: 'escalating', name: 'Эскалация', icon: '• •• ◆◆', shortText: 'Опасных врагов становится больше.' },
];

/**
 * The phase sets the unavoidable baseline. The generated pattern shapes that
 * pressure into cadence, peaks, and elite density, so every stage remains
 * active while still demanding a different answer from the player.
 */
export function getWavePressureProfile(pattern: SpawnPatternId, phaseWaveIndex: number): WavePressureProfile {
  if (pattern === 'steady') {
    return { intervalMultiplier: 0.72, packMultiplier: 0.78, hpMultiplier: 0.9, damageMultiplier: 0.9, signatureChanceBonus: -0.03 };
  }
  if (pattern === 'surge') {
    const isSurge = phaseWaveIndex % 3 === 2;
    return isSurge
      ? { intervalMultiplier: 1.18, packMultiplier: 1.38, hpMultiplier: 1.1, damageMultiplier: 1.08, signatureChanceBonus: 0.08 }
      : { intervalMultiplier: 0.82, packMultiplier: 0.84, hpMultiplier: 0.92, damageMultiplier: 0.92, signatureChanceBonus: -0.01 };
  }
  if (pattern === 'heavy') {
    return { intervalMultiplier: 1.25, packMultiplier: 0.74, hpMultiplier: 1.6, damageMultiplier: 1.42, signatureChanceBonus: 0.08 };
  }
  if (pattern === 'alternating') {
    const isDangerWave = phaseWaveIndex % 2 === 1;
    return isDangerWave
      ? { intervalMultiplier: 1.15, packMultiplier: 1.15, hpMultiplier: 1.16, damageMultiplier: 1.12, signatureChanceBonus: 0.12 }
      : { intervalMultiplier: 0.82, packMultiplier: 0.82, hpMultiplier: 0.92, damageMultiplier: 0.92, signatureChanceBonus: -0.02 };
  }

  const ramp = Math.min(0.3, phaseWaveIndex * 0.06);
  return {
    intervalMultiplier: 1 - ramp * 0.18,
    packMultiplier: 0.88 + ramp * 0.45,
    hpMultiplier: 0.94 + ramp * 0.45,
    damageMultiplier: 0.94 + ramp * 0.25,
    signatureChanceBonus: ramp * 0.24 - 0.03,
  };
}

export type StageTheme = {
  seed: string;
  dominantColorIndices: number[];
  portalEffect: PortalEffectDefinition;
  enemyTheme: EnemyThemeDefinition;
  spawnPattern: SpawnPatternDefinition;
  recommendation: string;
};

const COLOR_NAMES_RU = ['красных', 'синих', 'зелёных', 'жёлтых', 'фиолетовых'];

type PerkStageMatch = {
  portals?: PortalEffectId[];
  enemies?: EnemyThemeId[];
  patterns?: SpawnPatternId[];
};

const PERK_STAGE_MATCHES: Record<PerkId, PerkStageMatch> = {
  'iron-step': { portals: ['knockback'] },
  'blood-harvest': { portals: ['volatile'], enemies: ['horde'], patterns: ['surge'] },
  'wide-swing': { enemies: ['horde'], patterns: ['steady', 'surge'] },
  'heavy-axe': { enemies: ['elite', 'armor', 'regen'], patterns: ['heavy'] },
  'meat-grinder': { enemies: ['horde'], patterns: ['surge'] },
  'duel-rage': { enemies: ['elite', 'armor', 'regen'], patterns: ['heavy'] },
  'ice-trap': { enemies: ['rush'] },
  'split-arrow': { portals: ['ward'] },
  'shatter': { enemies: ['elite', 'armor'], patterns: ['heavy'] },
  'ice-burst': { enemies: ['horde'], patterns: ['surge'] },
  'deep-cold': { enemies: ['rush', 'elite'], patterns: ['heavy'] },
  'shard-volley': { enemies: ['horde'], patterns: ['surge'] },
  'shadow-dash': { enemies: ['horde', 'backline'] },
  'smoke-screen': { portals: ['volatile'], enemies: ['rush'] },
  'rot-poison': { portals: ['heal'], enemies: ['armor', 'regen'] },
  'contagion': { enemies: ['horde'], patterns: ['surge'] },
  'execution': { portals: ['heal'], enemies: ['elite', 'armor', 'regen'], patterns: ['heavy'] },
  'epidemic': { enemies: ['horde'], patterns: ['surge'] },
  'wide-arc': { enemies: ['horde'], patterns: ['surge'] },
  'return-arc': { portals: ['heal'], enemies: ['elite', 'armor', 'regen'], patterns: ['heavy'] },
  'split-lightning': { portals: ['ward'] },
  'thunder-stun': { enemies: ['rush', 'elite'], patterns: ['heavy'] },
  'perfect-storm': { enemies: ['horde'], patterns: ['surge'] },
  'overload': { portals: ['heal'], enemies: ['elite', 'armor', 'regen'], patterns: ['heavy'] },
  'void-anchor': { portals: ['knockback'] },
  'shared-ward': { portals: ['volatile'], enemies: ['rush'] },
  'mass-taunt': { enemies: ['horde', 'rush'], patterns: ['surge'] },
  'duel-taunt': { enemies: ['elite', 'backline'], patterns: ['heavy'] },
  'eternal-bastion': { portals: ['volatile'], enemies: ['rush'], patterns: ['escalating'] },
  'challenge-mark': { enemies: ['elite', 'armor', 'regen'], patterns: ['heavy'] },
};

function pick<T>(items: T[]) { return items[Math.floor(Math.random() * items.length)] ?? items[0]; }

function pickUniqueColor(excluded: number[]) {
  const available = Array.from({ length: WARRIOR_COLORS.length }, (_, index) => index).filter((index) => !excluded.includes(index));
  return pick(available) ?? 0;
}

function isCompatible(portal: PortalEffectId, enemy: EnemyThemeId, pattern: SpawnPatternId) {
  if (portal === 'heal' && enemy === 'regen') return false;
  if (portal === 'knockback' && enemy === 'backline') return false;
  if (portal === 'ward' && enemy === 'horde' && pattern === 'surge') return false;
  if (portal === 'volatile' && enemy === 'horde' && pattern === 'surge') return false;
  if (enemy === 'elite' && pattern === 'surge') return false;
  if (enemy === 'horde' && pattern === 'heavy') return false;
  return true;
}

function buildRecommendation(colors: number[], portal: PortalEffectDefinition, enemy: EnemyThemeDefinition) {
  const colorCopy = colors.map((color) => COLOR_NAMES_RU[color]).join(' и ');
  const hint = Math.random() < 0.5 ? portal.hint : enemy.hint;
  return `Пробуйте ${colorCopy} воинов. ${hint}`;
}

export function createStageTheme(): StageTheme {
  const primary = Math.floor(Math.random() * WARRIOR_COLORS.length);
  const dominantColorIndices = [primary, pickUniqueColor([primary])];

  let portalEffect = pick(PORTAL_EFFECTS);
  let enemyTheme = pick(ENEMY_THEMES);
  let spawnPattern = pick(SPAWN_PATTERNS);
  for (let attempt = 0; attempt < 20 && !isCompatible(portalEffect.id, enemyTheme.id, spawnPattern.id); attempt += 1) {
    portalEffect = pick(PORTAL_EFFECTS);
    enemyTheme = pick(ENEMY_THEMES);
    spawnPattern = pick(SPAWN_PATTERNS);
  }

  return {
    seed: Math.random().toString(36).slice(2, 9),
    dominantColorIndices,
    portalEffect,
    enemyTheme,
    spawnPattern,
    recommendation: buildRecommendation(dominantColorIndices, portalEffect, enemyTheme),
  };
}

export function getPerkRecommendationReasons(perkId: PerkId, theme: StageTheme) {
  const match = PERK_STAGE_MATCHES[perkId];
  const reasons: string[] = [];
  if (match.portals?.includes(theme.portalEffect.id)) reasons.push(theme.portalEffect.name);
  if (match.enemies?.includes(theme.enemyTheme.id)) reasons.push(theme.enemyTheme.name);
  if (match.patterns?.includes(theme.spawnPattern.id)) reasons.push(theme.spawnPattern.name);
  return reasons;
}

export function getNeutralEnemyShareForPhase(phaseIndex: number) {
  return BATTLE_CONFIG.neutralEnemySharesByPhase[phaseIndex] ?? BATTLE_CONFIG.neutralEnemySharesByPhase[BATTLE_CONFIG.neutralEnemySharesByPhase.length - 1];
}

export function rollEnemyColor(theme: StageTheme, phaseIndex: number): number | null {
  if (Math.random() < getNeutralEnemyShareForPhase(phaseIndex)) return null;
  if (theme.dominantColorIndices.length === 1) return theme.dominantColorIndices[0];
  const [primary, secondary] = theme.dominantColorIndices;
  return Math.random() < BATTLE_CONFIG.challengePrimaryColorShare ? primary : secondary;
}

export function getStageThemeLabel(theme: StageTheme) { return theme.portalEffect.name; }
export function getPhaseCount() { return SPAWN_PHASES.length; }
