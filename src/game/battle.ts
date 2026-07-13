import {
  BATTLE_CONFIG, NEUTRAL_HEX_COLOR, SPAWN_PHASES,
  WARRIOR_COLORS, WARRIOR_HEX_COLORS,
} from '../config';
import { BattleEffect, BattleState, Entity, Projectile } from '../types';
import { hasPerk, PerkId, WarriorId, WARRIOR_BY_ID } from './content';
import { PlayerBuildState, getDeckEntryByWarrior, getTierStatMultiplier } from './progression';
import { StageTheme, WavePressureProfile, createStageTheme, getWavePressureProfile, rollEnemyColor } from './stageTheme';
import { WarriorSpawnRequest } from './types';

export type BattleViewport = { width: number; height: number };
export type BattleStepResult = { outcome?: 'victory' | 'defeat' };
type SpawnPhase = (typeof SPAWN_PHASES)[number];

const id = () => Math.random().toString(36).slice(2, 9);
const currentPhase = (index: number) => SPAWN_PHASES[index] ?? SPAWN_PHASES[SPAWN_PHASES.length - 1];
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const living = (state: BattleState, faction?: 'player' | 'enemy') => state.entities.filter((entity) => entity.hp > 0 && (!faction || entity.faction === faction));

function baseEntity(partial: Partial<Entity>): Entity {
  return {
    id: id(), faction: 'enemy', unitClass: 'melee', colorIdx: null, tier: 1,
    x: 0, y: 0, vx: 0, vy: 0, hp: 1, maxHp: 1, shield: 0, maxShield: 0, shieldTimer: 0,
    warded: false, armor: 0, regenPerSec: 0, moveSpeedMultiplier: 1,
    frozenTimer: 0, stunnedTimer: 0, poisonStacks: 0, poisonTimer: 0, poisonDps: 0,
    poisonSourceId: null, poisonSpreadAtMax: false, frozenById: null,
    tauntSourceId: null, tauntTimer: 0, damageTakenMultiplier: 1,
    signatureTimer: 0, perkTimer: 0, attackCount: 0, comboTargetId: null, comboHits: 0,
    empoweredHitMultiplier: 1, deathProcessed: false, damageMultiplier: 1, targetId: null,
    attackTimer: 0, attackVisualTimer: 0, attackVisualDurationMs: BATTLE_CONFIG.attackVisualDurationMs,
    attackVisualDx: 0, attackVisualDy: 1,
    ...partial,
  };
}

function createWaveState(stageTheme: StageTheme): BattleState {
  return {
    entities: [], projectiles: [], damageTexts: [], effects: [],
    playerBaseHp: BATTLE_CONFIG.playerBaseMaxHealth,
    enemyStructureHp: BATTLE_CONFIG.enemyStructureMaxHealth,
    battleTimeSec: 0, phase: 0, startDelayTimer: BATTLE_CONFIG.initialWaveDelaySec,
    enemyStructureAttackTimer: 0, enemySpawnCooldownMs: 900, waveIndex: 0, phaseWaveIndex: 0,
    playerBasePulseCount: 0, enemyWavesSuppressed: false,
    portalEffectTimer: Math.max(4, stageTheme.portalEffect.intervalSec * 0.65),
    status: 'playing', stageTheme,
  };
}

function structurePosition(viewport: BattleViewport) {
  return { x: viewport.width * BATTLE_CONFIG.enemyStructureXRatio, y: BATTLE_CONFIG.enemyStructureYPx };
}

function addText(state: BattleState, x: number, y: number, text: string, color: string) {
  state.damageTexts.push({ id: id(), x, y, text, life: 1, maxLife: 1, color });
}

function addEffect(state: BattleState, kind: BattleEffect['kind'], x: number, y: number, radius: number, life = 0.55) {
  state.effects.push({ id: id(), kind, x, y, radius, life, maxLife: life });
}

function damageColor(colorIdx: number | null) {
  return colorIdx === null ? NEUTRAL_HEX_COLOR : (WARRIOR_HEX_COLORS[colorIdx] ?? '#fff');
}

function triggerAttackVisual(entity: Entity, target: { x: number; y: number }) {
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const length = Math.hypot(dx, dy) || 1;
  entity.attackVisualTimer = BATTLE_CONFIG.attackVisualDurationMs;
  entity.attackVisualDx = dx / length;
  entity.attackVisualDy = dy / length;
}

function sourceHas(state: BattleState, sourceId: string | null, perk: PerkId) {
  const source = sourceId ? state.entities.find((entity) => entity.id === sourceId) : null;
  return hasPerk(source?.perks, perk);
}

function incomingMultiplier(state: BattleState, target: Entity) {
  let multiplier = 1;
  if (target.frozenTimer > 0 && sourceHas(state, target.frozenById, 'shatter')) multiplier *= 1.3;
  if (target.tauntTimer > 0 && sourceHas(state, target.tauntSourceId, 'challenge-mark')) multiplier *= 1.3;
  return multiplier;
}

export function getSuddenDeathLevel(battleTimeSec: number) {
  if (battleTimeSec < BATTLE_CONFIG.suddenDeathStartSec) return 0;
  return 1 + Math.floor((battleTimeSec - BATTLE_CONFIG.suddenDeathStartSec) / BATTLE_CONFIG.suddenDeathIntervalSec);
}

function suddenDeathDamageMultiplier(state: BattleState) {
  return 1 + getSuddenDeathLevel(state.battleTimeSec) * BATTLE_CONFIG.suddenDeathDamageBonusPerStep;
}

function nearestEntity(state: BattleState, origin: Entity, faction: 'player' | 'enemy', excludedId?: string) {
  return living(state, faction)
    .filter((entity) => entity.id !== excludedId)
    .sort((a, b) => distance(origin, a) - distance(origin, b))[0] ?? null;
}

function processDeath(state: BattleState, target: Entity, attacker: Entity | null) {
  if (target.deathProcessed) return;
  target.deathProcessed = true;

  if (attacker?.faction === 'player') {
    if (hasPerk(attacker.perks, 'blood-harvest')) {
      const heal = attacker.maxHp * 0.1;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      addText(state, attacker.x, attacker.y - 14, `+${Math.round(heal)}`, '#86efac');
    }
    if (hasPerk(attacker.perks, 'smoke-screen')) {
      attacker.shield = Math.max(attacker.shield, attacker.maxHp * 0.25);
      attacker.maxShield = Math.max(attacker.maxShield, attacker.maxHp * 0.25);
      attacker.shieldTimer = 3;
    }
    if (hasPerk(attacker.perks, 'shadow-dash')) {
      const next = nearestEntity(state, target, 'enemy', target.id);
      if (next) {
        attacker.x = next.x;
        attacker.y = next.y + 28;
        attacker.empoweredHitMultiplier = 1.5;
      }
    }
  }

  if (target.poisonStacks > 0 && sourceHas(state, target.poisonSourceId, 'contagion')) {
    const next = nearestEntity(state, target, 'enemy', target.id);
    if (next) {
      next.poisonStacks = Math.min(5, target.poisonStacks);
      next.poisonTimer = target.poisonTimer;
      next.poisonDps = target.poisonDps;
      next.poisonSourceId = target.poisonSourceId;
    }
  }

  if (target.frozenTimer > 0 && sourceHas(state, target.frozenById, 'ice-burst')) {
    const nearby = living(state, 'enemy').filter((entity) => entity.id !== target.id && distance(entity, target) <= 90).slice(0, 3);
    for (const enemy of nearby) {
      enemy.frozenTimer = Math.max(enemy.frozenTimer, 0.8);
      enemy.frozenById = target.frozenById;
      addEffect(state, 'freeze', enemy.x, enemy.y, 22, 0.8);
    }
  }

  if (target.faction === 'enemy' && state.stageTheme.portalEffect.id === 'volatile') {
    const radius = target.enemyKind === 'signature' ? 72 : 52;
    const blast = target.enemyKind === 'signature' ? 13 : 8;
    addEffect(state, 'explosion', target.x, target.y, radius, 0.6);
    for (const warrior of living(state, 'player')) {
      if (distance(warrior, target) <= radius) applyDamage(state, warrior, blast * suddenDeathDamageMultiplier(state), null, false);
    }
  }
}

function applyDamage(state: BattleState, target: Entity, rawDamage: number, attacker: Entity | null, direct = true) {
  if (target.hp <= 0) return 0;
  if (direct && target.warded && attacker?.faction === 'player') {
    target.warded = false;
    addText(state, target.x, target.y - 14, 'ЩИТ', '#a5f3fc');
    return 0;
  }

  let damage = rawDamage * incomingMultiplier(state, target);
  if (direct && target.armor > 0) damage = Math.max(1, damage - target.armor);
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, damage);
    target.shield -= absorbed;
    damage -= absorbed;
    if (absorbed > 0) addText(state, target.x, target.y - 14, `-${Math.round(absorbed)}`, '#c4b5fd');
  }
  if (damage > 0) {
    target.hp -= damage;
    addText(state, target.x, target.y - 10, Math.round(damage).toString(), damageColor(attacker?.colorIdx ?? null));
  }
  if (target.hp <= 0) processDeath(state, target, attacker);
  return damage;
}

function freezeTarget(state: BattleState, target: Entity, source: Entity, duration: number) {
  target.frozenTimer = Math.max(target.frozenTimer, duration);
  target.frozenById = source.id;
  addEffect(state, 'freeze', target.x, target.y, 24, duration);
}

function applyFrostHit(state: BattleState, source: Entity, target: Entity) {
  if (source.comboTargetId !== target.id) {
    source.comboTargetId = target.id;
    source.comboHits = 0;
  }
  source.comboHits += 1;
  const threshold = hasPerk(source.perks, 'deep-cold') ? 2 : 3;
  if (source.comboHits < threshold) return;
  source.comboHits = 0;
  freezeTarget(state, target, source, 1);
  if (hasPerk(source.perks, 'shard-volley')) {
    for (const enemy of living(state, 'enemy').filter((entity) => entity.id !== target.id && distance(entity, target) <= 90).slice(0, 3)) {
      applyDamage(state, enemy, WARRIOR_BY_ID['blue-hunter'].baseDamage * getTierStatMultiplier(source.tier) * 0.6 * suddenDeathDamageMultiplier(state), source);
    }
  }
}

function applyPoisonHit(state: BattleState, source: Entity, target: Entity) {
  target.poisonStacks = Math.min(5, target.poisonStacks + 1);
  target.poisonTimer = 4;
  target.poisonSourceId = source.id;
  target.poisonDps = source.damageMultiplier * WARRIOR_BY_ID['green-rogue'].baseDamage * 0.1 * target.poisonStacks;
  if (target.poisonStacks === 5 && !target.poisonSpreadAtMax && hasPerk(source.perks, 'epidemic')) {
    target.poisonSpreadAtMax = true;
    for (const enemy of living(state, 'enemy').filter((entity) => entity.id !== target.id && distance(entity, target) <= 95).slice(0, 3)) {
      enemy.poisonStacks = Math.max(enemy.poisonStacks, 3);
      enemy.poisonTimer = 4;
      enemy.poisonSourceId = source.id;
      enemy.poisonDps = source.damageMultiplier * WARRIOR_BY_ID['green-rogue'].baseDamage * 0.3;
    }
  }
}

function playerDamage(state: BattleState, attacker: Entity, target: Entity | null, structure = false) {
  const definition = WARRIOR_BY_ID[attacker.warriorId!];
  let damage = definition.baseDamage * attacker.damageMultiplier * attacker.empoweredHitMultiplier;
  attacker.empoweredHitMultiplier = 1;
  if (structure) {
    if (!state.stageTheme.dominantColorIndices.includes(attacker.colorIdx ?? -1)) damage *= BATTLE_CONFIG.warriorWrongColorDamageMultiplier;
    return damage * 0.9 * suddenDeathDamageMultiplier(state);
  }
  if (target?.colorIdx !== null && target?.colorIdx !== attacker.colorIdx) damage *= BATTLE_CONFIG.warriorWrongColorDamageMultiplier;
  return damage * suddenDeathDamageMultiplier(state);
}

function pushProjectile(state: BattleState, attacker: Entity, target: Entity, damage: number, frostHit = false, xOffset = 0) {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const length = Math.hypot(dx, dy) || 1;
  state.projectiles.push({
    id: id(), x: attacker.x + xOffset, y: attacker.y, vx: dx / length * BATTLE_CONFIG.projectileSpeed,
    vy: dy / length * BATTLE_CONFIG.projectileSpeed, targetId: target.id,
    targetKind: 'entity', damage,
    colorIdx: attacker.colorIdx, faction: attacker.faction, attackerId: attacker.id,
    warriorId: attacker.warriorId, frostHit,
  });
}

function selectPlayerTarget(state: BattleState, attacker: Entity) {
  const enemies = living(state, 'enemy');
  if (!enemies.length) return null;
  return enemies.sort((a, b) => {
    const priorityA = (a.enemyKind === 'signature' ? -70 : 0) + (attacker.combatClass === 'rogue' ? a.hp / a.maxHp * 30 : 0);
    const priorityB = (b.enemyKind === 'signature' ? -70 : 0) + (attacker.combatClass === 'rogue' ? b.hp / b.maxHp * 30 : 0);
    return distance(attacker, a) + priorityA - distance(attacker, b) - priorityB;
  })[0];
}

function selectEnemyTarget(state: BattleState, attacker: Entity) {
  if (attacker.tauntTimer > 0 && attacker.tauntSourceId) {
    const taunter = state.entities.find((entity) => entity.id === attacker.tauntSourceId && entity.hp > 0);
    if (taunter) return taunter;
  }
  return living(state, 'player').sort((a, b) => distance(attacker, a) - distance(attacker, b))[0] ?? null;
}

function nearbyEnemies(state: BattleState, origin: Entity, radius: number) {
  return living(state, 'enemy').filter((enemy) => distance(origin, enemy) <= radius);
}

function performRedAttack(state: BattleState, attacker: Entity, target: Entity) {
  attacker.attackCount += 1;
  if (attacker.comboTargetId !== target.id) { attacker.comboTargetId = target.id; attacker.comboHits = 0; }
  attacker.comboHits += 1;
  let damage = playerDamage(state, attacker, target);
  if (hasPerk(attacker.perks, 'heavy-axe')) damage *= 2.2;
  if (hasPerk(attacker.perks, 'duel-rage') && attacker.comboHits >= 3) damage *= 2;
  applyDamage(state, target, damage, attacker);

  const surrounded = nearbyEnemies(state, attacker, BATTLE_CONFIG.meleeRange * 1.8).length >= 3;
  const aoe = (hasPerk(attacker.perks, 'wide-swing') && attacker.attackCount % 3 === 0) || (hasPerk(attacker.perks, 'meat-grinder') && surrounded);
  if (aoe) {
    const multiplier = hasPerk(attacker.perks, 'meat-grinder') && surrounded ? 0.6 : 0.7;
    for (const enemy of nearbyEnemies(state, attacker, BATTLE_CONFIG.meleeRange * 2).filter((enemy) => enemy.id !== target.id)) {
      applyDamage(state, enemy, playerDamage(state, attacker, enemy) * multiplier, attacker);
    }
  }
}

function performRogueAttack(state: BattleState, attacker: Entity, target: Entity) {
  let damage = playerDamage(state, attacker, target);
  if (hasPerk(attacker.perks, 'execution') && target.poisonStacks >= 5) {
    damage *= 3.5;
    target.poisonStacks = 0;
    target.poisonTimer = 0;
    target.poisonSpreadAtMax = false;
  }
  applyDamage(state, target, damage, attacker);
  if (target.hp > 0) applyPoisonHit(state, attacker, target);
}

function performHunterAttack(state: BattleState, attacker: Entity, target: Entity) {
  const damage = playerDamage(state, attacker, target);
  if (hasPerk(attacker.perks, 'split-arrow')) {
    pushProjectile(state, attacker, target, damage * 0.7, true, -2);
    pushProjectile(state, attacker, target, damage * 0.4, true, 2);
  } else {
    pushProjectile(state, attacker, target, damage, true);
  }
}

function chainTargets(state: BattleState, first: Entity, maxTargets: number) {
  const result = [first];
  while (result.length < maxTargets) {
    const from = result[result.length - 1];
    const next = living(state, 'enemy')
      .filter((enemy) => !result.some((picked) => picked.id === enemy.id) && distance(from, enemy) <= 115)
      .sort((a, b) => distance(from, a) - distance(from, b))[0];
    if (!next) break;
    result.push(next);
  }
  return result;
}

function performMageAttack(state: BattleState, attacker: Entity, target: Entity) {
  attacker.attackCount += 1;
  const maxTargets = hasPerk(attacker.perks, 'wide-arc') ? 5 : 3;
  const targets = chainTargets(state, target, maxTargets);
  const fractions = hasPerk(attacker.perks, 'perfect-storm') ? targets.map(() => 1) : [1, 0.7, 0.4, 0.3, 0.2];
  const repeats = hasPerk(attacker.perks, 'split-lightning') ? [0.6, 0.6] : [1];

  targets.forEach((enemy, index) => {
    addEffect(state, 'lightning', enemy.x, enemy.y, 20, 0.25);
    repeats.forEach((repeat) => applyDamage(state, enemy, playerDamage(state, attacker, enemy) * (fractions[index] ?? 0.2) * repeat, attacker));
  });
  if (hasPerk(attacker.perks, 'return-arc') && target.hp > 0) applyDamage(state, target, playerDamage(state, attacker, target) * 0.6, attacker);
  const last = targets[targets.length - 1];
  if (last && hasPerk(attacker.perks, 'thunder-stun')) last.stunnedTimer = Math.max(last.stunnedTimer, 1.5);
  if (target.hp > 0 && hasPerk(attacker.perks, 'overload') && attacker.attackCount % 3 === 0) applyDamage(state, target, playerDamage(state, attacker, target) * 2, attacker);
}

function performPlayerAttack(state: BattleState, attacker: Entity, target: Entity) {
  if (attacker.warriorId === 'red-cleaver') performRedAttack(state, attacker, target);
  else if (attacker.warriorId === 'green-rogue') performRogueAttack(state, attacker, target);
  else if (attacker.warriorId === 'blue-hunter') performHunterAttack(state, attacker, target);
  else if (attacker.warriorId === 'yellow-mage') performMageAttack(state, attacker, target);
  else applyDamage(state, target, playerDamage(state, attacker, target), attacker);
}

function attackInterval(state: BattleState, entity: Entity) {
  let interval = BATTLE_CONFIG.attackCooldownMs;
  if (entity.warriorId === 'red-cleaver' && nearbyEnemies(state, entity, BATTLE_CONFIG.meleeRange * 1.8).length >= 3) interval /= 1.5;
  if (hasPerk(entity.perks, 'heavy-axe')) interval *= 2;
  if (entity.faction === 'player' && (entity.combatClass === 'archer' || entity.combatClass === 'mage')) {
    if (nearbyEnemies(state, entity, BATTLE_CONFIG.meleeRange * 1.25).length > 0) interval *= 1.6;
  }
  return interval;
}

function updateGuardian(state: BattleState, guardian: Entity) {
  if (guardian.warriorId !== 'purple-warden' || guardian.signatureTimer > 0) return;
  guardian.signatureTimer = 6;
  const enemies = nearbyEnemies(state, guardian, 165);
  if (!enemies.length) return;
  let selected: Entity[];
  if (hasPerk(guardian.perks, 'duel-taunt')) selected = [enemies.sort((a, b) => b.maxHp - a.maxHp)[0]];
  else selected = enemies.sort((a, b) => distance(guardian, a) - distance(guardian, b)).slice(0, hasPerk(guardian.perks, 'mass-taunt') ? 8 : 4);

  for (const enemy of selected) { enemy.tauntSourceId = guardian.id; enemy.tauntTimer = 3; }
  const cap = guardian.maxHp * (hasPerk(guardian.perks, 'mass-taunt') ? 0.64 : 0.32);
  const gained = hasPerk(guardian.perks, 'duel-taunt') ? guardian.maxHp * 0.5 : guardian.maxHp * 0.08 * selected.length;
  guardian.maxShield = cap;
  guardian.shield = Math.min(cap, guardian.shield + gained);
  guardian.shieldTimer = hasPerk(guardian.perks, 'eternal-bastion') ? Number.POSITIVE_INFINITY : 5;
  addEffect(state, 'taunt', guardian.x, guardian.y, 90, 0.6);

  if (hasPerk(guardian.perks, 'shared-ward')) {
    for (const ally of living(state, 'player').filter((entity) => entity.id !== guardian.id).sort((a, b) => distance(guardian, a) - distance(guardian, b)).slice(0, 2)) {
      ally.maxShield = Math.max(ally.maxShield, ally.maxHp * 0.15);
      ally.shield = Math.max(ally.shield, ally.maxHp * 0.15);
      ally.shieldTimer = 4;
    }
  }
}

function updateStatuses(state: BattleState, dt: number) {
  for (const entity of state.entities) {
    if (entity.hp <= 0) continue;
    entity.signatureTimer = Math.max(0, entity.signatureTimer - dt);
    entity.perkTimer = Math.max(0, entity.perkTimer - dt);
    entity.frozenTimer = Math.max(0, entity.frozenTimer - dt);
    entity.stunnedTimer = Math.max(0, entity.stunnedTimer - dt);
    entity.tauntTimer = Math.max(0, entity.tauntTimer - dt);
    if (entity.tauntTimer <= 0) entity.tauntSourceId = null;
    if (Number.isFinite(entity.shieldTimer)) {
      entity.shieldTimer = Math.max(0, entity.shieldTimer - dt);
      if (entity.shieldTimer <= 0) entity.shield = 0;
    }
    if (entity.regenPerSec > 0) entity.hp = Math.min(entity.maxHp, entity.hp + entity.regenPerSec * dt);
    if (entity.poisonTimer > 0 && entity.poisonStacks > 0) {
      entity.poisonTimer -= dt;
      entity.hp -= entity.poisonDps * suddenDeathDamageMultiplier(state) * dt;
      if (entity.hp <= 0) {
        const source = entity.poisonSourceId ? state.entities.find((candidate) => candidate.id === entity.poisonSourceId) ?? null : null;
        processDeath(state, entity, source);
      }
      if (entity.poisonTimer <= 0) {
        entity.poisonStacks = 0; entity.poisonDps = 0; entity.poisonSourceId = null; entity.poisonSpreadAtMax = false;
      }
    }
    updateGuardian(state, entity);
    if (entity.warriorId === 'blue-hunter' && hasPerk(entity.perks, 'ice-trap') && entity.perkTimer <= 0) {
      const close = nearbyEnemies(state, entity, BATTLE_CONFIG.meleeRange * 1.35)[0];
      if (close) { freezeTarget(state, close, entity, 2); entity.perkTimer = 8; }
    }
  }
}

function enemyProfile(theme: StageTheme, signature: boolean, phase: SpawnPhase, pressure: WavePressureProfile) {
  let hp = BATTLE_CONFIG.enemyHp * phase.hpMultiplier * pressure.hpMultiplier;
  let damage = BATTLE_CONFIG.enemyDamage * phase.damageMultiplier * pressure.damageMultiplier;
  let armor = 0;
  let regen = 0;
  let move = 1;
  // Each theme spends a comparable threat budget on one readable pressure.
  // It must not also get a large hidden stat increase on top of that identity.
  if (theme.enemyTheme.id === 'horde') { hp *= 0.78; damage *= 0.72; }
  if (theme.enemyTheme.id === 'elite') { hp *= 1.4; damage *= 1.25; }
  if (theme.enemyTheme.id === 'armor') { hp *= 1.05; armor = 1; }
  if (theme.enemyTheme.id === 'rush') { hp *= 0.85; damage *= 0.85; move = 1.25; }
  if (theme.enemyTheme.id === 'regen') regen = hp * 0.009;
  if (signature) { hp *= 1.45; damage *= 1.12; armor += theme.enemyTheme.id === 'armor' ? 1 : 0; }
  return { hp, damage, armor, regen, move };
}

function signatureChance(phaseIndex: number, pressure: WavePressureProfile) {
  return Math.max(0.04, Math.min(0.75, 0.1 + phaseIndex * 0.035 + pressure.signatureChanceBonus));
}

function spawnEnemy(state: BattleState, viewport: BattleViewport, pressure: WavePressureProfile) {
  const phase = currentPhase(state.phase);
  const structure = structurePosition(viewport);
  const signature = Math.random() < signatureChance(state.phase, pressure);
  const profile = enemyProfile(state.stageTheme, signature, phase, pressure);
  const ranged = state.stageTheme.enemyTheme.id === 'backline' && signature;
  state.entities.push(baseEntity({
    faction: 'enemy', unitClass: ranged ? 'ranged' : 'melee', enemyKind: signature ? 'signature' : 'basic',
    colorIdx: rollEnemyColor(state.stageTheme, state.phase),
    x: Math.max(20, Math.min(viewport.width - 20, structure.x + (Math.random() - 0.5) * BATTLE_CONFIG.enemySpawnSpreadPx * 2)),
    y: BATTLE_CONFIG.enemySpawnYOffsetPx, hp: profile.hp, maxHp: profile.hp,
    damageMultiplier: profile.damage / BATTLE_CONFIG.enemyDamage, armor: profile.armor,
    regenPerSec: profile.regen, moveSpeedMultiplier: profile.move,
  }));
}

function packSize(state: BattleState, phase: SpawnPhase, pressure: WavePressureProfile) {
  let size = Math.floor(phase.packSizeMin + Math.random() * (phase.packSizeMax - phase.packSizeMin + 1));
  size = Math.max(1, Math.round(size * pressure.packMultiplier));
  // Horde needs more bodies, but a fixed +2 becomes disproportionate once the
  // phase and the generated pattern have already enlarged a pack.
  if (state.stageTheme.enemyTheme.id === 'horde') size += 1;
  if (state.stageTheme.enemyTheme.id === 'elite') size = Math.max(1, size - 1);
  return size;
}

function enemiesPressuringPlayerBase(state: BattleState, viewport: BattleViewport) {
  return living(state, 'enemy').filter(
    (enemy) => enemy.y >= viewport.height - BATTLE_CONFIG.playerBasePulseRangePx,
  );
}

function updateWaves(state: BattleState, viewport: BattleViewport, dt: number) {
  if (state.startDelayTimer > 0) return;
  const nextPhase = SPAWN_PHASES.reduce((index, phase, candidate) => state.battleTimeSec >= phase.startAtSec ? candidate : index, 0);
  if (nextPhase !== state.phase) {
    state.phase = nextPhase;
    state.phaseWaveIndex = 0;
    state.enemySpawnCooldownMs = Math.min(state.enemySpawnCooldownMs, 800);
  }
  const phase = currentPhase(state.phase);
  state.enemyWavesSuppressed =
    enemiesPressuringPlayerBase(state, viewport).length >= BATTLE_CONFIG.enemyWaveSuppressionAttackerCount;
  if (state.enemyWavesSuppressed) return;
  state.enemySpawnCooldownMs -= dt * 1000;
  if (state.enemySpawnCooldownMs > 0) return;
  const pressure = getWavePressureProfile(state.stageTheme.spawnPattern.id, state.phaseWaveIndex);
  const size = packSize(state, phase, pressure);
  for (let index = 0; index < size; index += 1) spawnEnemy(state, viewport, pressure);

  // The generated stage contract is static: player power never changes its
  // packs or cadence. A strong build is allowed to turn that into an easier win.
  const intervalMs = phase.spawnIntervalSec * 1000 * pressure.intervalMultiplier;
  state.enemySpawnCooldownMs = Math.max(3200, Math.min(14000, intervalMs * (0.92 + Math.random() * 0.16)));
  state.waveIndex += 1;
  state.phaseWaveIndex += 1;
}

function triggerPlayerBasePulseIfNeeded(state: BattleState, viewport: BattleViewport) {
  const lostHealthShare = 1 - state.playerBaseHp / BATTLE_CONFIG.playerBaseMaxHealth;
  const reachedPulseCount = Math.min(
    BATTLE_CONFIG.playerBasePulseCount,
    Math.floor((lostHealthShare + Number.EPSILON) / BATTLE_CONFIG.playerBasePulseHealthStep),
  );
  if (reachedPulseCount <= state.playerBasePulseCount || state.playerBaseHp <= 0) return;

  state.playerBasePulseCount = reachedPulseCount;
  const pulseX = viewport.width / 2;
  const pulseY = viewport.height;
  addEffect(state, 'knockback', pulseX, pulseY, BATTLE_CONFIG.playerBasePulseRangePx, 0.9);
  addText(state, pulseX, pulseY - 34, 'WALL PULSE!', '#fde68a');

  for (const enemy of living(state, 'enemy')) {
    if (enemy.y < viewport.height - BATTLE_CONFIG.playerBasePulseRangePx) continue;
    const horizontalDirection = Math.sign(enemy.x - pulseX);
    enemy.x = Math.max(
      10,
      Math.min(viewport.width - 10, enemy.x + horizontalDirection * BATTLE_CONFIG.playerBasePulseKnockbackPx * 0.25),
    );
    enemy.y -= BATTLE_CONFIG.playerBasePulseKnockbackPx;
    enemy.stunnedTimer = Math.max(enemy.stunnedTimer, BATTLE_CONFIG.playerBasePulseStunSec);
    applyDamage(state, enemy, BATTLE_CONFIG.playerBasePulseDamage * suddenDeathDamageMultiplier(state), null, false);
  }
}

function updatePortalEffect(state: BattleState, viewport: BattleViewport, dt: number) {
  const effect = state.stageTheme.portalEffect;
  if (effect.id === 'volatile' || state.startDelayTimer > 0) return;
  state.portalEffectTimer -= dt;
  if (state.portalEffectTimer > 0) return;
  state.portalEffectTimer = effect.intervalSec;
  const structure = structurePosition(viewport);
  if (effect.id === 'knockback') {
    addEffect(state, 'knockback', structure.x, structure.y, 260, 0.85);
    for (const warrior of living(state, 'player')) {
      const anchored = hasPerk(warrior.perks, 'iron-step') || (hasPerk(warrior.perks, 'void-anchor') && warrior.shield > 0);
      if (anchored) continue;
      const dx = warrior.x - structure.x;
      const dy = warrior.y - structure.y;
      const length = Math.hypot(dx, dy) || 1;
      warrior.x += dx / length * 70;
      warrior.y += dy / length * 70;
    }
  }
  if (effect.id === 'heal') {
    addEffect(state, 'heal', structure.x, structure.y, 260, 0.8);
    for (const enemy of living(state, 'enemy')) {
      const reduction = enemy.poisonStacks > 0 && sourceHas(state, enemy.poisonSourceId, 'rot-poison') ? 0.5 : 1;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.2 * reduction);
    }
  }
  if (effect.id === 'ward') {
    addEffect(state, 'ward', structure.x, structure.y, 260, 0.8);
    for (const enemy of living(state, 'enemy')) enemy.warded = true;
  }
}

function updateIdleTarget(entity: Entity, viewport: BattleViewport, dt: number) {
  if (!entity.idleTimer || entity.idleTimer <= 0) {
    entity.idleTimer = 1 + Math.random() * 2;
    entity.idleTargetX = Math.max(20, Math.min(viewport.width - 20, entity.x + (Math.random() - 0.5) * 120));
    entity.idleTargetY = Math.max(220, Math.min(viewport.height - 35, entity.y + (Math.random() - 0.5) * 80));
  } else entity.idleTimer -= dt;
}

function attackStructure(state: BattleState, attacker: Entity, viewport: BattleViewport) {
  let damage = playerDamage(state, attacker, null, true);
  if (attacker.warriorId === 'red-cleaver' && hasPerk(attacker.perks, 'heavy-axe')) damage *= 2.2;
  if (attacker.warriorId === 'yellow-mage' && hasPerk(attacker.perks, 'return-arc')) damage *= 1.6;
  attacker.attackCount += 1;
  if (hasPerk(attacker.perks, 'overload') && attacker.attackCount % 3 === 0) damage *= 3;
  if (attacker.unitClass === 'ranged') {
    const structure = structurePosition(viewport);
    const dx = structure.x - attacker.x;
    const dy = structure.y - attacker.y;
    const length = Math.hypot(dx, dy) || 1;
    state.projectiles.push({ id: id(), x: attacker.x, y: attacker.y, vx: dx / length * BATTLE_CONFIG.projectileSpeed,
      vy: dy / length * BATTLE_CONFIG.projectileSpeed, targetId: 'enemy-structure', targetKind: 'enemyStructure',
      damage, colorIdx: attacker.colorIdx, faction: 'player', attackerId: attacker.id, warriorId: attacker.warriorId });
  } else {
    state.enemyStructureHp -= damage;
    addText(state, structurePosition(viewport).x, structurePosition(viewport).y + 25, Math.round(damage).toString(), damageColor(attacker.colorIdx));
  }
}

function stepEntities(state: BattleState, dt: number, viewport: BattleViewport) {
  const structure = structurePosition(viewport);
  const enemiesAlive = living(state, 'enemy').length > 0;
  for (const entity of state.entities) {
    if (entity.hp <= 0) continue;
    entity.attackTimer -= dt * 1000;
    entity.attackVisualTimer = Math.max(0, entity.attackVisualTimer - dt * 1000);
    if (entity.frozenTimer > 0 || entity.stunnedTimer > 0) continue;

    const target = entity.faction === 'player' ? selectPlayerTarget(state, entity) : selectEnemyTarget(state, entity);
    entity.targetId = target?.id ?? null;
    let targetX = entity.x;
    let targetY = entity.y;
    let attacking = false;
    let speed = BATTLE_CONFIG.moveSpeed * entity.moveSpeedMultiplier;

    if (target) {
      const range = entity.unitClass === 'melee' ? BATTLE_CONFIG.meleeRange : BATTLE_CONFIG.rangedRange;
      if (distance(entity, target) <= range) {
        attacking = true;
        if (entity.attackTimer <= 0) {
          entity.attackTimer = entity.faction === 'player' ? attackInterval(state, entity) : BATTLE_CONFIG.attackCooldownMs;
          triggerAttackVisual(entity, target);
          if (entity.faction === 'player') performPlayerAttack(state, entity, target);
          else {
            const damage = BATTLE_CONFIG.enemyDamage * entity.damageMultiplier * suddenDeathDamageMultiplier(state);
            if (entity.unitClass === 'ranged') pushProjectile(state, entity, target, damage);
            else applyDamage(state, target, damage, entity);
          }
        }
      } else { targetX = target.x; targetY = target.y; }
    } else if (entity.faction === 'player' && !enemiesAlive && state.enemyStructureHp > 0) {
      const range = entity.unitClass === 'melee' ? BATTLE_CONFIG.meleeRange + 18 : BATTLE_CONFIG.rangedRange;
      if (distance(entity, structure) <= range) {
        attacking = true;
        if (entity.attackTimer <= 0) {
          entity.attackTimer = attackInterval(state, entity);
          triggerAttackVisual(entity, structure);
          attackStructure(state, entity, viewport);
        }
      } else { targetX = structure.x; targetY = structure.y + 24; }
    } else if (entity.faction === 'enemy') {
      targetY = viewport.height;
      if (entity.y >= viewport.height - BATTLE_CONFIG.meleeRange) {
        attacking = true;
        if (entity.attackTimer <= 0) {
          entity.attackTimer = BATTLE_CONFIG.attackCooldownMs;
          const damage = Math.round(BATTLE_CONFIG.playerBaseDamage * currentPhase(state.phase).damageMultiplier * suddenDeathDamageMultiplier(state));
          state.playerBaseHp -= damage;
          addText(state, entity.x, viewport.height - 10, damage.toString(), '#ef4444');
          triggerPlayerBasePulseIfNeeded(state, viewport);
        }
      }
    } else {
      speed *= 0.4;
      updateIdleTarget(entity, viewport, dt);
      targetX = entity.idleTargetX ?? entity.x;
      targetY = entity.idleTargetY ?? entity.y;
    }

    let vx = 0, vy = 0;
    if (!attacking) {
      const dx = targetX - entity.x, dy = targetY - entity.y, length = Math.hypot(dx, dy) || 1;
      vx = dx / length * speed; vy = dy / length * speed;
    }
    for (const other of state.entities) {
      if (other.id === entity.id || other.hp <= 0) continue;
      const dx = entity.x - other.x, dy = entity.y - other.y, length = Math.hypot(dx, dy);
      if (length > 0 && length < BATTLE_CONFIG.separationRadius) {
        const force = (BATTLE_CONFIG.separationRadius - length) / BATTLE_CONFIG.separationRadius;
        vx += dx / length * force * BATTLE_CONFIG.separationForce;
        vy += dy / length * force * BATTLE_CONFIG.separationForce;
      }
    }
    entity.x = Math.max(10, Math.min(viewport.width - 10, entity.x + vx * dt));
    entity.y += vy * dt;
  }

  if (state.enemyStructureHp > 0) {
    state.enemyStructureAttackTimer -= dt * 1000;
    if (state.enemyStructureAttackTimer <= 0) {
      const target = living(state, 'player').filter((entity) => distance(entity, structure) <= BATTLE_CONFIG.structureAttackRange).sort((a, b) => distance(a, structure) - distance(b, structure))[0];
      if (target) {
        state.enemyStructureAttackTimer = BATTLE_CONFIG.structureAttackCooldownMs;
        const fake = baseEntity({ id: 'enemy-structure', faction: 'enemy', unitClass: 'ranged', x: structure.x, y: structure.y + 10 });
        pushProjectile(state, fake, target, Math.round(BATTLE_CONFIG.structureDamage * (BATTLE_CONFIG.structureDamageMultipliersByPhase[state.phase] ?? 1) * suddenDeathDamageMultiplier(state)));
      }
    }
  }
}

function stepProjectiles(state: BattleState, dt: number, viewport: BattleViewport) {
  const structure = { ...structurePosition(viewport), y: BATTLE_CONFIG.enemyStructureYPx + 8 };
  for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = state.projectiles[index];
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    if (projectile.targetKind === 'enemyStructure' && state.enemyStructureHp > 0) {
      if (distance(projectile, structure) < BATTLE_CONFIG.projectileHitRadiusPx + 10) {
        state.enemyStructureHp -= projectile.damage;
        addText(state, structure.x, structure.y + 20, Math.round(projectile.damage).toString(), damageColor(projectile.colorIdx));
        state.projectiles.splice(index, 1);
      }
      continue;
    }
    const target = state.entities.find((entity) => entity.id === projectile.targetId);
    if (target && target.hp > 0 && distance(projectile, target) < BATTLE_CONFIG.projectileHitRadiusPx) {
      const attacker = projectile.attackerId ? state.entities.find((entity) => entity.id === projectile.attackerId) ?? null : null;
      applyDamage(state, target, projectile.damage, attacker);
      if (projectile.frostHit && attacker && target.hp > 0) applyFrostHit(state, attacker, target);
      state.projectiles.splice(index, 1);
      continue;
    }
    if (!target || projectile.x < 0 || projectile.x > viewport.width || projectile.y < 0 || projectile.y > viewport.height) state.projectiles.splice(index, 1);
  }
}

function stepVisuals(state: BattleState, dt: number) {
  for (let index = state.damageTexts.length - 1; index >= 0; index -= 1) {
    const text = state.damageTexts[index]; text.life -= dt; text.y -= 20 * dt;
    if (text.life <= 0) state.damageTexts.splice(index, 1);
  }
  for (let index = state.effects.length - 1; index >= 0; index -= 1) {
    state.effects[index].life -= dt;
    if (state.effects[index].life <= 0) state.effects.splice(index, 1);
  }
}

function cleanup(state: BattleState) {
  state.entities = state.entities.filter((entity) => entity.hp > 0 && entity.y > -100);
  state.playerBaseHp = Math.max(0, state.playerBaseHp);
  state.enemyStructureHp = Math.max(0, state.enemyStructureHp);
}

function syncPlayerBuild(state: BattleState, build: PlayerBuildState) {
  for (const entity of state.entities) {
    if (entity.faction !== 'player' || !entity.warriorId) continue;
    const entry = getDeckEntryByWarrior(build, entity.warriorId);
    if (entry.tier !== entity.tier) {
      const nextMaxHp = WARRIOR_BY_ID[entity.warriorId].baseHp * getTierStatMultiplier(entry.tier);
      entity.hp += Math.max(0, nextMaxHp - entity.maxHp);
      entity.maxHp = nextMaxHp;
      entity.tier = entry.tier;
      entity.damageMultiplier = getTierStatMultiplier(entry.tier);
    }
    entity.perks = [...entry.selectedPerks];
  }
}

export function createBattleState(stageTheme: StageTheme = createStageTheme()) { return createWaveState(stageTheme); }

export function healPlayerBase(state: BattleState, fraction: number) {
  state.playerBaseHp = Math.min(BATTLE_CONFIG.playerBaseMaxHealth, state.playerBaseHp + BATTLE_CONFIG.playerBaseMaxHealth * fraction);
}

export function spawnPlayerWarriors(state: BattleState, warriors: WarriorSpawnRequest[], boardCols: number, viewport: BattleViewport, build: PlayerBuildState) {
  const cellWidth = viewport.width / boardCols;
  for (const request of warriors) {
    const warriorId = request.warriorId ?? build.deck.find((entry) => entry.colorIdx === request.colorIdx)?.warriorId ?? 'red-cleaver';
    const entry = getDeckEntryByWarrior(build, warriorId);
    const definition = WARRIOR_BY_ID[warriorId];
    const tier = request.tier ?? entry.tier;
    const multiplier = getTierStatMultiplier(tier);
    const hp = definition.baseHp * multiplier;
    state.entities.push(baseEntity({
      faction: 'player', warriorId, combatClass: definition.combatClass, unitClass: definition.unitClass,
      perks: [...entry.selectedPerks], colorIdx: definition.colorIdx, tier,
      x: request.col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * 10,
      y: viewport.height - BATTLE_CONFIG.playerSpawnYOffsetPx + (Math.random() - 0.5) * 10,
      hp, maxHp: hp, damageMultiplier: multiplier, attackVisualDy: -1,
    }));
  }
}

export function stepBattleState(params: { state: BattleState; dt: number; viewport: BattleViewport; lastEnemySpawnAt: number; build: PlayerBuildState }) {
  const { state, viewport, build } = params;
  const dt = Math.min(params.dt, 0.05);
  if (state.status !== 'playing') return { lastEnemySpawnAt: params.lastEnemySpawnAt, result: {} as BattleStepResult };
  if (state.startDelayTimer > 0) state.startDelayTimer -= dt;
  else state.battleTimeSec += dt;

  syncPlayerBuild(state, build);
  updateStatuses(state, dt);
  updateWaves(state, viewport, dt);
  updatePortalEffect(state, viewport, dt);
  stepEntities(state, dt, viewport);
  stepProjectiles(state, dt, viewport);
  stepVisuals(state, dt);
  cleanup(state);

  if (state.enemyStructureHp <= 0) { state.status = 'victory'; return { lastEnemySpawnAt: params.lastEnemySpawnAt, result: { outcome: 'victory' as const } }; }
  if (state.playerBaseHp <= 0) { state.status = 'defeat'; return { lastEnemySpawnAt: params.lastEnemySpawnAt, result: { outcome: 'defeat' as const } }; }
  return { lastEnemySpawnAt: params.lastEnemySpawnAt, result: {} };
}
