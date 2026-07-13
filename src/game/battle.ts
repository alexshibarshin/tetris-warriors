import {
  BATTLE_CONFIG,
  BOARD_CONFIG,
  GENERATOR_CONFIG,
  NEUTRAL_HEX_COLOR,
  SPAWN_PHASES,
  WARRIOR_COLORS,
  WARRIOR_HEX_COLORS,
} from '../config';
import { BattleState, DamageText, Entity, Projectile } from '../types';
import { PlayerBuildState, getBuildCombatScale, getDeckEntry, getTierStatMultiplier } from './progression';
import { StageTheme, createStageTheme, rollEnemyColor } from './stageTheme';
import { WarriorSpawnRequest } from './types';

export type BattleViewport = {
  width: number;
  height: number;
};

export type BattleStepResult = {
  outcome?: 'victory' | 'defeat';
};

type SpawnPhase = (typeof SPAWN_PHASES)[number];

function createId() {
  return Math.random().toString(36).substring(2, 9);
}

function createWaveState(stageTheme: StageTheme): BattleState {
  return {
    entities: [],
    projectiles: [],
    damageTexts: [],
    playerBaseHp: BATTLE_CONFIG.playerBaseMaxHealth,
    enemyStructureHp: BATTLE_CONFIG.enemyStructureMaxHealth,
    battleTimeSec: 0,
    phase: 0,
    startDelayTimer: BATTLE_CONFIG.initialWaveDelaySec,
    enemyStructureAttackTimer: 0,
    enemySpawnCooldownMs: 900,
    burstSpawnsRemaining: 0,
    burstSpawnCooldownMs: 0,
    status: 'playing',
    stageTheme,
  };
}

function getRandomUnitClass() {
  return Math.random() > BATTLE_CONFIG.unitClassChance ? 'melee' : 'ranged';
}

function getEnemyStructurePosition(viewport: BattleViewport) {
  return {
    x: viewport.width * BATTLE_CONFIG.enemyStructureXRatio,
    y: BATTLE_CONFIG.enemyStructureYPx,
  };
}

function addDamageText(state: BattleState, x: number, y: number, text: string, color: string) {
  state.damageTexts.push({
    id: Math.random().toString(),
    x,
    y,
    text,
    life: BATTLE_CONFIG.damageTextLifeSec,
    maxLife: BATTLE_CONFIG.damageTextLifeSec,
    color,
  });
}

function getDamageColor(colorIdx: number | null) {
  return colorIdx === null ? NEUTRAL_HEX_COLOR : (WARRIOR_HEX_COLORS[colorIdx] ?? '#ffffff');
}

function triggerAttackVisual(entity: Entity, targetX: number, targetY: number) {
  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;

  entity.attackVisualTimer = BATTLE_CONFIG.attackVisualDurationMs;
  entity.attackVisualDurationMs = BATTLE_CONFIG.attackVisualDurationMs;
  entity.attackVisualDx = dx / length;
  entity.attackVisualDy = dy / length;
}

function getCurrentSpawnPhase(phaseIndex: number) {
  return SPAWN_PHASES[phaseIndex] ?? SPAWN_PHASES[SPAWN_PHASES.length - 1];
}

function getPlayerWarriorIncomePerSec() {
  return (1000 / BOARD_CONFIG.respawnIntervalMs) * (1 - GENERATOR_CONFIG.coinTargetShare);
}

function getBasePlayerCombatValue() {
  const averageBaseHit = (BATTLE_CONFIG.meleeDamage + BATTLE_CONFIG.rangedDamage) / 2;
  const colorMultiplier =
    1 / WARRIOR_COLORS.length +
    ((WARRIOR_COLORS.length - 1) / WARRIOR_COLORS.length) * BATTLE_CONFIG.warriorWrongColorDamageMultiplier;
  const dps = (averageBaseHit * colorMultiplier) / (BATTLE_CONFIG.attackCooldownMs / 1000);
  return BATTLE_CONFIG.warriorHp * dps;
}

function getAverageEnemyDamagePerHit(damageMultiplier: number, neutralShare: number) {
  const colorMultiplier =
    neutralShare +
    (1 - neutralShare) *
      (1 / WARRIOR_COLORS.length +
        ((WARRIOR_COLORS.length - 1) / WARRIOR_COLORS.length) * BATTLE_CONFIG.enemyWrongColorDamageMultiplier);

  return BATTLE_CONFIG.enemyDamage * damageMultiplier * colorMultiplier;
}

function getPlayerCombatValue(build: PlayerBuildState) {
  return getBasePlayerCombatValue() * getBuildCombatScale(build);
}

function getEnemyCombatValue(phase: SpawnPhase, neutralShare: number) {
  const dps = getAverageEnemyDamagePerHit(phase.damageMultiplier, neutralShare) / (BATTLE_CONFIG.attackCooldownMs / 1000);
  return BATTLE_CONFIG.enemyHp * phase.hpMultiplier * dps;
}

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function getPhaseIndexForTime(battleTimeSec: number) {
  let phaseIndex = 0;

  for (let index = 0; index < SPAWN_PHASES.length; index += 1) {
    if (battleTimeSec >= SPAWN_PHASES[index].startAtSec) {
      phaseIndex = index;
    } else {
      break;
    }
  }

  return phaseIndex;
}

function spawnEnemyFromStructure(state: BattleState, viewport: BattleViewport) {
  const currentPhase = getCurrentSpawnPhase(state.phase);
  const structure = getEnemyStructurePosition(viewport);
  const hp = BATTLE_CONFIG.enemyHp * currentPhase.hpMultiplier;
  const colorIdx = rollEnemyColor(state.stageTheme, state.phase);

  state.entities.push({
    id: createId(),
    faction: 'enemy',
    unitClass: getRandomUnitClass(),
    colorIdx,
    tier: 1,
    x: Math.max(
      BATTLE_CONFIG.enemySpawnPaddingPx,
      Math.min(
        viewport.width - BATTLE_CONFIG.enemySpawnPaddingPx,
        structure.x + (Math.random() * BATTLE_CONFIG.enemySpawnSpreadPx * 2 - BATTLE_CONFIG.enemySpawnSpreadPx),
      ),
    ),
    y: BATTLE_CONFIG.enemySpawnYOffsetPx,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    damageMultiplier: 1,
    targetId: null,
    attackTimer: 0,
    attackVisualTimer: 0,
    attackVisualDurationMs: BATTLE_CONFIG.attackVisualDurationMs,
    attackVisualDx: 0,
    attackVisualDy: 1,
  });
}

function countUnitsNearPoint(
  entities: Entity[],
  faction: 'player' | 'enemy',
  x: number,
  y: number,
  radius: number,
) {
  let count = 0;

  for (const entity of entities) {
    if (entity.hp <= 0 || entity.faction !== faction) {
      continue;
    }

    const dx = entity.x - x;
    const dy = entity.y - y;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) {
      count += 1;
    }
  }

  return count;
}

function getPackSize(phase: SpawnPhase, bonusUnits: number) {
  return Math.max(1, randomInt(phase.packSizeMin, phase.packSizeMax) + bonusUnits);
}

function queueNextSpawnCooldown(
  state: BattleState,
  phase: SpawnPhase,
  pressureScale: number,
  build: PlayerBuildState,
) {
  const neutralShare =
    BATTLE_CONFIG.neutralEnemySharesByPhase[state.phase] ??
    BATTLE_CONFIG.neutralEnemySharesByPhase[BATTLE_CONFIG.neutralEnemySharesByPhase.length - 1];

  const playerIncomePerSec = getPlayerWarriorIncomePerSec() * BATTLE_CONFIG.playerSpawnRealizationRate;
  const targetBudgetPerSec = playerIncomePerSec * phase.pressureBudget;
  const enemyPowerRatio = Math.max(0.2, getEnemyCombatValue(phase, neutralShare) / getPlayerCombatValue(build));
  const targetUnitsPerSec = targetBudgetPerSec / enemyPowerRatio;
  const averagePackSize = (phase.packSizeMin + phase.packSizeMax) / 2;
  const averageCooldownMs = (averagePackSize / Math.max(0.08, targetUnitsPerSec)) * 1000;
  const variance = BATTLE_CONFIG.spawnCooldownVariance;
  const minCooldown = averageCooldownMs * (1 - variance);
  const maxCooldown = averageCooldownMs * (1 + variance);
  state.enemySpawnCooldownMs = Math.max(800, randomRange(minCooldown, maxCooldown) * pressureScale);
}

function triggerSpawnPack(state: BattleState, viewport: BattleViewport, packSize: number) {
  for (let index = 0; index < packSize; index += 1) {
    spawnEnemyFromStructure(state, viewport);
  }
}

function maybeStartBurst(state: BattleState, phase: SpawnPhase, bonusBursts: number) {
  const burstChance = Math.min(0.9, phase.burstChance + bonusBursts * 0.08);
  if (Math.random() > burstChance) {
    state.burstSpawnsRemaining = 0;
    state.burstSpawnCooldownMs = 0;
    return;
  }

  state.burstSpawnsRemaining = Math.max(0, randomInt(phase.burstCountMin, phase.burstCountMax) - 1);
  state.burstSpawnCooldownMs = randomRange(phase.burstIntervalMinMs, phase.burstIntervalMaxMs);
}

function updateWaveFlow(
  state: BattleState,
  lastEnemySpawnAt: number,
  viewport: BattleViewport,
  dt: number,
  build: PlayerBuildState,
) {
  if (state.startDelayTimer > 0) {
    return { lastEnemySpawnAt, outcome: undefined as BattleStepResult['outcome'] };
  }

  const phaseIndex = getPhaseIndexForTime(state.battleTimeSec);
  state.phase = phaseIndex;

  const structure = getEnemyStructurePosition(viewport);
  const currentPhase = getCurrentSpawnPhase(phaseIndex);
  const playerCount = state.entities.filter((entity) => entity.hp > 0 && entity.faction === 'player').length;
  const enemyCount = state.entities.filter((entity) => entity.hp > 0 && entity.faction === 'enemy').length;
  const playerPressure = countUnitsNearPoint(
    state.entities,
    'player',
    structure.x,
    structure.y,
    BATTLE_CONFIG.playerPressureRadiusPx,
  );
  const enemyScreen = countUnitsNearPoint(
    state.entities,
    'enemy',
    structure.x,
    structure.y,
    BATTLE_CONFIG.enemyPressureRadiusPx,
  );

  const buildScale = getBuildCombatScale(build);
  const emergencyDefense = phaseIndex >= 2 && playerPressure >= 7 && enemyScreen <= 2;
  const pressureFactor = Math.max(
    0.88,
    Math.min(
      1.24,
      1 -
        playerCount * 0.005 -
        playerPressure * 0.007 -
        Math.min(0.08, (buildScale - 1) * 0.05) +
        enemyCount * 0.012,
    ),
  );

  if (state.burstSpawnsRemaining > 0) {
    state.burstSpawnCooldownMs -= dt * 1000;
    if (state.burstSpawnCooldownMs <= 0) {
      const bonusUnits = phaseIndex >= 3 && buildScale >= 2.1 ? 1 : 0;
      triggerSpawnPack(state, viewport, getPackSize(currentPhase, bonusUnits));
      state.burstSpawnsRemaining -= 1;
      if (state.burstSpawnsRemaining > 0) {
        state.burstSpawnCooldownMs = randomRange(currentPhase.burstIntervalMinMs, currentPhase.burstIntervalMaxMs);
      }
      return {
        lastEnemySpawnAt,
        outcome: undefined as BattleStepResult['outcome'],
      };
    }
  }

  state.enemySpawnCooldownMs -= dt * 1000;
  if (state.enemySpawnCooldownMs <= 0) {
    const bonusUnits = emergencyDefense ? 1 : phaseIndex >= 2 && buildScale >= 1.8 ? 1 : 0;
    triggerSpawnPack(state, viewport, getPackSize(currentPhase, bonusUnits));
    maybeStartBurst(state, currentPhase, phaseIndex >= 3 && buildScale >= 2.2 ? 1 : 0);
    queueNextSpawnCooldown(state, currentPhase, pressureFactor, build);
    return {
      lastEnemySpawnAt,
      outcome: undefined as BattleStepResult['outcome'],
    };
  }

  return { lastEnemySpawnAt, outcome: undefined as BattleStepResult['outcome'] };
}

function findBestTarget(entity: Entity, entities: Entity[]) {
  let bestTarget: Entity | null = null;
  let minDistance = Infinity;

  for (const other of entities) {
    if (other.hp <= 0 || other.faction === entity.faction) {
      continue;
    }

    const dx = other.x - entity.x;
    const dy = other.y - entity.y;

    if (Math.abs(dx) > BATTLE_CONFIG.aggroRangeX || Math.abs(dy) > BATTLE_CONFIG.aggroRangeY) {
      continue;
    }

    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < minDistance) {
      minDistance = distance;
      bestTarget = other;
    }
  }

  return { bestTarget, minDistance };
}

function findClosestEnemyForPlayer(entity: Entity, entities: Entity[]) {
  let bestTarget: Entity | null = null;
  let minDistance = Infinity;

  for (const other of entities) {
    if (other.hp <= 0 || other.faction !== 'enemy') {
      continue;
    }

    const dx = other.x - entity.x;
    const dy = other.y - entity.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < minDistance) {
      minDistance = distance;
      bestTarget = other;
    }
  }

  return { bestTarget, minDistance };
}

function isColorCounterApplicable(attacker: Entity, target: Entity | null) {
  return target && attacker.colorIdx !== null && target.colorIdx !== null && attacker.colorIdx !== target.colorIdx;
}

function computeHitDamage(attacker: Entity, target: Entity | null, phaseIndex: number, isStructureTarget = false) {
  let damage =
    attacker.unitClass === 'melee' ? BATTLE_CONFIG.meleeDamage : BATTLE_CONFIG.rangedDamage;

  if (attacker.faction === 'enemy') {
    const currentPhase = getCurrentSpawnPhase(phaseIndex);
    damage = BATTLE_CONFIG.enemyDamage * currentPhase.damageMultiplier;
    if (isColorCounterApplicable(attacker, target)) {
      damage *= BATTLE_CONFIG.enemyWrongColorDamageMultiplier;
    }
  } else {
    damage *= attacker.damageMultiplier;
    if (isColorCounterApplicable(attacker, target)) {
      damage *= BATTLE_CONFIG.warriorWrongColorDamageMultiplier;
    }
  }

  if (isStructureTarget) {
    damage *= 0.9;
  }

  return Math.round(damage);
}

function pushProjectile(
  state: BattleState,
  attacker: Entity,
  target: { x: number; y: number; id: string | 'enemy-structure'; kind: 'entity' | 'enemyStructure' },
  damage: number,
) {
  const length = Math.sqrt((target.x - attacker.x) ** 2 + (target.y - attacker.y) ** 2) || 1;
  state.projectiles.push({
    id: Math.random().toString(36),
    x: attacker.x,
    y: attacker.y,
    vx: ((target.x - attacker.x) / length) * BATTLE_CONFIG.projectileSpeed,
    vy: ((target.y - attacker.y) / length) * BATTLE_CONFIG.projectileSpeed,
    targetId: target.id,
    targetKind: target.kind,
    damage,
    colorIdx: attacker.colorIdx,
    faction: attacker.faction,
  });
}

function updateIdleTarget(entity: Entity, viewport: BattleViewport, dt: number) {
  if (entity.idleTimer === undefined || entity.idleTimer <= 0) {
    entity.idleTimer = BATTLE_CONFIG.idleRetargetMinSec + Math.random() * BATTLE_CONFIG.idleRetargetRangeSec;

    let dx = (Math.random() - 0.5) * BATTLE_CONFIG.idleWanderXRangePx;
    let dy = (Math.random() - 0.5) * BATTLE_CONFIG.idleWanderYRangePx;

    if (entity.y < viewport.height - BATTLE_CONFIG.idleLowerBoundFromBottomPx) {
      dy = Math.abs(dy) + BATTLE_CONFIG.idleLowerBoundBonusDyPx;
    } else if (entity.y > viewport.height - BATTLE_CONFIG.idleUpperBoundFromBottomPx) {
      dy = -Math.abs(dy) - BATTLE_CONFIG.idleUpperBoundBonusDyPx;
    }

    entity.idleTargetX = Math.max(
      BATTLE_CONFIG.idleTargetPaddingPx,
      Math.min(viewport.width - BATTLE_CONFIG.idleTargetPaddingPx, entity.x + dx),
    );
    entity.idleTargetY = Math.max(
      BATTLE_CONFIG.idleTargetPaddingPx,
      Math.min(viewport.height - BATTLE_CONFIG.idleTargetPaddingPx, entity.y + dy),
    );
  } else {
    entity.idleTimer -= dt;
  }
}

function stepEntities(state: BattleState, dt: number, viewport: BattleViewport) {
  const structure = getEnemyStructurePosition(viewport);
  const enemiesAlive = state.entities.some((candidate) => candidate.faction === 'enemy' && candidate.hp > 0);

  for (let index = 0; index < state.entities.length; index += 1) {
    const entity = state.entities[index];
    if (entity.hp <= 0) {
      continue;
    }

    entity.attackTimer -= dt * 1000;
    entity.attackVisualTimer = Math.max(0, entity.attackVisualTimer - dt * 1000);

    const { bestTarget, minDistance } =
      entity.faction === 'player' ? findClosestEnemyForPlayer(entity, state.entities) : findBestTarget(entity, state.entities);
    entity.targetId = bestTarget?.id ?? null;

    let targetX = entity.x;
    let targetY = entity.y;
    let isAttacking = false;
    let speedMultiplier = 1;

    if (bestTarget) {
      const range = entity.unitClass === 'melee' ? BATTLE_CONFIG.meleeRange : BATTLE_CONFIG.rangedRange;

      if (minDistance <= range) {
        isAttacking = true;
        if (entity.attackTimer <= 0) {
          entity.attackTimer = BATTLE_CONFIG.attackCooldownMs;
          triggerAttackVisual(entity, bestTarget.x, bestTarget.y);
          const damage = computeHitDamage(entity, bestTarget, state.phase);

          if (entity.unitClass === 'melee') {
            bestTarget.hp -= damage;
            addDamageText(
              state,
              bestTarget.x,
              bestTarget.y - BATTLE_CONFIG.damageTextYOffsetPx,
              damage.toString(),
              getDamageColor(entity.colorIdx),
            );
          } else {
            pushProjectile(state, entity, { x: bestTarget.x, y: bestTarget.y, id: bestTarget.id, kind: 'entity' }, damage);
          }
        }
      } else {
        targetX = bestTarget.x;
        targetY = bestTarget.y;
      }
    } else if (entity.faction === 'player' && state.enemyStructureHp > 0 && !enemiesAlive) {
      const dx = structure.x - entity.x;
      const dy = structure.y - entity.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const range = entity.unitClass === 'melee' ? BATTLE_CONFIG.meleeRange + 18 : BATTLE_CONFIG.rangedRange;

      if (distance <= range) {
        isAttacking = true;
        if (entity.attackTimer <= 0) {
          entity.attackTimer = BATTLE_CONFIG.attackCooldownMs;
          triggerAttackVisual(entity, structure.x, structure.y);
          const damage = computeHitDamage(entity, null, state.phase, true);

          if (entity.unitClass === 'melee') {
            state.enemyStructureHp -= damage;
            addDamageText(
              state,
              structure.x,
              structure.y + 28,
              damage.toString(),
              getDamageColor(entity.colorIdx),
            );
          } else {
            pushProjectile(
              state,
              entity,
              { x: structure.x, y: structure.y + 8, id: 'enemy-structure', kind: 'enemyStructure' },
              damage,
            );
          }
        }
      } else {
        targetX = structure.x;
        targetY = structure.y + 24;
      }
    } else if (entity.faction === 'player') {
      speedMultiplier = BATTLE_CONFIG.idleMoveSpeedMultiplier;
      updateIdleTarget(entity, viewport, dt);
      targetX = entity.idleTargetX ?? entity.x;
      targetY = entity.idleTargetY ?? entity.y;
    } else {
      targetY = viewport.height;
      if (entity.y >= viewport.height - BATTLE_CONFIG.meleeRange) {
        isAttacking = true;
        if (entity.attackTimer <= 0) {
          entity.attackTimer = BATTLE_CONFIG.attackCooldownMs;
          triggerAttackVisual(entity, entity.x, viewport.height + BATTLE_CONFIG.meleeRange);
          const currentPhase = getCurrentSpawnPhase(state.phase);
          const wallDamage = Math.round(BATTLE_CONFIG.playerBaseDamage * currentPhase.damageMultiplier);
          state.playerBaseHp -= wallDamage;
          addDamageText(
            state,
            entity.x,
            viewport.height - BATTLE_CONFIG.damageTextYOffsetPx,
            wallDamage.toString(),
            '#ff0000',
          );
        }
      }
    }

    let vx = 0;
    let vy = 0;

    if (!isAttacking) {
      const dx = targetX - entity.x;
      const dy = targetY - entity.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;

      if (speedMultiplier < 1 && distance < BATTLE_CONFIG.idleStopDistancePx) {
        vx = 0;
        vy = 0;
      } else {
        vx = (dx / distance) * BATTLE_CONFIG.moveSpeed * speedMultiplier;
        vy = (dy / distance) * BATTLE_CONFIG.moveSpeed * speedMultiplier;
      }
    }

    for (let otherIndex = 0; otherIndex < state.entities.length; otherIndex += 1) {
      if (index === otherIndex) {
        continue;
      }

      const other = state.entities[otherIndex];
      if (other.hp <= 0) {
        continue;
      }

      const dx = entity.x - other.x;
      const dy = entity.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < BATTLE_CONFIG.separationRadius && distance > 0) {
        const force = (BATTLE_CONFIG.separationRadius - distance) / BATTLE_CONFIG.separationRadius;
        vx += (dx / distance) * force * BATTLE_CONFIG.separationForce;
        vy += (dy / distance) * force * BATTLE_CONFIG.separationForce;
      }
    }

    entity.x += vx * dt;
    entity.y += vy * dt;
    entity.x = Math.max(
      BATTLE_CONFIG.enemySpawnPaddingPx / 2,
      Math.min(viewport.width - BATTLE_CONFIG.enemySpawnPaddingPx / 2, entity.x),
    );
  }

  if (state.enemyStructureHp > 0) {
    state.enemyStructureAttackTimer -= dt * 1000;
    if (state.enemyStructureAttackTimer <= 0) {
      let target: Entity | null = null;
      let minDistance = Infinity;

      for (const candidate of state.entities) {
        if (candidate.hp <= 0 || candidate.faction !== 'player') {
          continue;
        }

        const dx = candidate.x - structure.x;
        const dy = candidate.y - structure.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= BATTLE_CONFIG.structureAttackRange && distance < minDistance) {
          minDistance = distance;
          target = candidate;
        }
      }

      if (target) {
        state.enemyStructureAttackTimer = BATTLE_CONFIG.structureAttackCooldownMs;
        pushProjectile(
          state,
          {
            id: 'enemy-structure',
            faction: 'enemy',
            unitClass: 'ranged',
            colorIdx: target.colorIdx,
            tier: 1,
            x: structure.x,
            y: structure.y + 10,
            vx: 0,
            vy: 0,
            hp: 1,
            maxHp: 1,
            damageMultiplier: 1,
            targetId: null,
            attackTimer: 0,
            attackVisualTimer: 0,
            attackVisualDurationMs: BATTLE_CONFIG.attackVisualDurationMs,
            attackVisualDx: 0,
            attackVisualDy: 1,
          },
          { x: target.x, y: target.y, id: target.id, kind: 'entity' },
          BATTLE_CONFIG.structureDamage,
        );
      }
    }
  }
}

function stepProjectiles(state: BattleState, dt: number, viewport: BattleViewport) {
  const structurePosition = getEnemyStructurePosition(viewport);
  const structureTarget = {
    ...structurePosition,
    y: structurePosition.y + 8,
  };

  for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = state.projectiles[index];
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    const target =
      projectile.targetKind === 'entity'
        ? state.entities.find((entity) => entity.id === projectile.targetId)
        : null;

    if (projectile.targetKind === 'enemyStructure' && state.enemyStructureHp > 0) {
      const distance = Math.sqrt((structureTarget.x - projectile.x) ** 2 + (structureTarget.y - projectile.y) ** 2);
      if (distance < BATTLE_CONFIG.projectileHitRadiusPx + 10) {
        state.enemyStructureHp -= projectile.damage;
        addDamageText(
          state,
          structureTarget.x,
          structureTarget.y + 20,
          projectile.damage.toString(),
          getDamageColor(projectile.colorIdx),
        );
        state.projectiles.splice(index, 1);
      }
      continue;
    }

    if (target && target.hp > 0) {
      const distance = Math.sqrt((target.x - projectile.x) ** 2 + (target.y - projectile.y) ** 2);
      if (distance < BATTLE_CONFIG.projectileHitRadiusPx) {
        target.hp -= projectile.damage;
        addDamageText(
          state,
          target.x,
          target.y - BATTLE_CONFIG.damageTextYOffsetPx,
          projectile.damage.toString(),
          getDamageColor(projectile.colorIdx),
        );
        state.projectiles.splice(index, 1);
      }
      continue;
    }

    if (projectile.x < 0 || projectile.x > viewport.width || projectile.y < 0 || projectile.y > viewport.height) {
      state.projectiles.splice(index, 1);
    }
  }
}

function stepDamageTexts(state: BattleState, dt: number) {
  for (let index = state.damageTexts.length - 1; index >= 0; index -= 1) {
    const damageText = state.damageTexts[index];
    damageText.life -= dt;
    damageText.y -= BATTLE_CONFIG.damageTextRiseSpeedPxPerSec * dt;
    if (damageText.life <= 0) {
      state.damageTexts.splice(index, 1);
    }
  }
}

function cleanupState(state: BattleState) {
  state.entities = state.entities.filter(
    (entity) => entity.hp > 0 && entity.y > -BATTLE_CONFIG.entityCleanupAboveTopPx,
  );
  if (state.playerBaseHp < 0) {
    state.playerBaseHp = 0;
  }
  if (state.enemyStructureHp < 0) {
    state.enemyStructureHp = 0;
  }
}

export function createBattleState(stageTheme: StageTheme = createStageTheme()) {
  return createWaveState(stageTheme);
}

export function healPlayerBase(state: BattleState, fraction: number) {
  state.playerBaseHp = Math.min(
    BATTLE_CONFIG.playerBaseMaxHealth,
    state.playerBaseHp + BATTLE_CONFIG.playerBaseMaxHealth * fraction,
  );
}

export function spawnPlayerWarriors(
  state: BattleState,
  warriors: WarriorSpawnRequest[],
  boardCols: number,
  viewport: BattleViewport,
  build: PlayerBuildState,
) {
  const cellWidth = viewport.width / boardCols;

  const newEntities: Entity[] = warriors.map((warrior) => {
    const deckEntry = getDeckEntry(build, warrior.colorIdx);
    const tier = warrior.tier ?? deckEntry.tier;
    const statMultiplier = getTierStatMultiplier(tier);
    const hp = BATTLE_CONFIG.warriorHp * statMultiplier;

    return {
      id: createId(),
      faction: 'player',
      unitClass: deckEntry.unitClass,
      colorIdx: warrior.colorIdx,
      tier,
      x:
        warrior.col * cellWidth +
        cellWidth / 2 +
        (Math.random() * BATTLE_CONFIG.spawnJitterPx - BATTLE_CONFIG.spawnJitterHalfRangePx),
      y:
        viewport.height -
        BATTLE_CONFIG.playerSpawnYOffsetPx +
        (Math.random() * BATTLE_CONFIG.spawnJitterPx - BATTLE_CONFIG.spawnJitterHalfRangePx),
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      damageMultiplier: statMultiplier,
      targetId: null,
      attackTimer: 0,
      attackVisualTimer: 0,
      attackVisualDurationMs: BATTLE_CONFIG.attackVisualDurationMs,
      attackVisualDx: 0,
      attackVisualDy: -1,
    };
  });

  state.entities.push(...newEntities);
}

export function stepBattleState(params: {
  state: BattleState;
  dt: number;
  viewport: BattleViewport;
  lastEnemySpawnAt: number;
  build: PlayerBuildState;
}): { lastEnemySpawnAt: number; result: BattleStepResult } {
  const { state, dt, viewport, lastEnemySpawnAt, build } = params;

  if (state.status !== 'playing') {
    return { lastEnemySpawnAt, result: {} };
  }

  if (state.playerBaseHp <= 0) {
    state.status = 'defeat';
    return { lastEnemySpawnAt, result: { outcome: 'defeat' } };
  }

  if (state.enemyStructureHp <= 0) {
    state.status = 'victory';
    return { lastEnemySpawnAt, result: { outcome: 'victory' } };
  }

  if (state.startDelayTimer > 0) {
    state.startDelayTimer -= dt;
  } else {
    state.battleTimeSec += dt;
  }

  const waveFlow = updateWaveFlow(state, lastEnemySpawnAt, viewport, dt, build);
  stepEntities(state, dt, viewport);
  stepProjectiles(state, dt, viewport);
  stepDamageTexts(state, dt);
  cleanupState(state);

  if (state.enemyStructureHp <= 0) {
    state.status = 'victory';
    return { lastEnemySpawnAt: waveFlow.lastEnemySpawnAt, result: { outcome: 'victory' } };
  }

  if (state.playerBaseHp <= 0) {
    state.status = 'defeat';
    return { lastEnemySpawnAt: waveFlow.lastEnemySpawnAt, result: { outcome: 'defeat' } };
  }

  return { lastEnemySpawnAt: waveFlow.lastEnemySpawnAt, result: {} };
}
