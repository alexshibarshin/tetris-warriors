import {
  BATTLE_CONFIG,
  WAVES,
  WARRIOR_COLORS,
  WARRIOR_HEX_COLORS,
} from '../config';
import { BattleState, DamageText, Entity, Projectile, UnitClass } from '../types';
import { WarriorSpawnRequest } from './types';

export type BattleViewport = {
  width: number;
  height: number;
};

export type BattleStepResult = {
  outcome?: 'victory' | 'defeat';
};

function createId() {
  return Math.random().toString(36).substring(2, 9);
}

function createWaveState(): BattleState {
  return {
    entities: [],
    projectiles: [],
    damageTexts: [],
    wallHp: BATTLE_CONFIG.wallMaxHealth,
    wave: 0,
    enemiesSpawnedInWave: 0,
    waveDelayTimer: BATTLE_CONFIG.initialWaveDelaySec,
    status: 'playing',
  };
}

function getRandomUnitClass(): UnitClass {
  return Math.random() > BATTLE_CONFIG.unitClassChance ? 'melee' : 'ranged';
}

function getEnemySpawnX(wave: number, width: number) {
  const band =
    BATTLE_CONFIG.enemySpawnBands[wave] ??
    BATTLE_CONFIG.enemySpawnBands[BATTLE_CONFIG.enemySpawnBands.length - 1];

  if (band) {
    return width * band.minRatio + Math.random() * width * (band.maxRatio - band.minRatio);
  }

  return Math.random() * (width - BATTLE_CONFIG.enemySpawnPaddingPx * 2) + BATTLE_CONFIG.enemySpawnPaddingPx;
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

function triggerAttackVisual(entity: Entity, targetX: number, targetY: number) {
  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;

  entity.attackVisualTimer = BATTLE_CONFIG.attackVisualDurationMs;
  entity.attackVisualDurationMs = BATTLE_CONFIG.attackVisualDurationMs;
  entity.attackVisualDx = dx / length;
  entity.attackVisualDy = dy / length;
}

function spawnEnemyForWave(state: BattleState, viewport: BattleViewport) {
  const currentWave = WAVES[state.wave];
  if (!currentWave) {
    return;
  }

  const hp = BATTLE_CONFIG.enemyHp * currentWave.hpMultiplier;
  state.enemiesSpawnedInWave += 1;
  state.entities.push({
    id: createId(),
    faction: 'enemy',
    unitClass: getRandomUnitClass(),
    colorIdx: Math.floor(Math.random() * WARRIOR_COLORS.length),
    x: getEnemySpawnX(state.wave, viewport.width),
    y: BATTLE_CONFIG.enemySpawnYOffsetPx,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    targetId: null,
    attackTimer: 0,
    attackVisualTimer: 0,
    attackVisualDurationMs: BATTLE_CONFIG.attackVisualDurationMs,
    attackVisualDx: 0,
    attackVisualDy: 1,
  });
}

function updateWaveFlow(state: BattleState, time: number, lastEnemySpawnAt: number, viewport: BattleViewport) {
  if (state.waveDelayTimer > 0) {
    return { lastEnemySpawnAt, outcome: undefined as BattleStepResult['outcome'] };
  }

  const currentWave = WAVES[state.wave];
  if (!currentWave) {
    return { lastEnemySpawnAt, outcome: undefined as BattleStepResult['outcome'] };
  }

  if (state.enemiesSpawnedInWave < currentWave.totalEnemies) {
    if (time - lastEnemySpawnAt > currentWave.spawnRateMs) {
      spawnEnemyForWave(state, viewport);
      return {
        lastEnemySpawnAt: time,
        outcome: undefined as BattleStepResult['outcome'],
      };
    }

    return { lastEnemySpawnAt, outcome: undefined as BattleStepResult['outcome'] };
  }

  const enemiesAlive = state.entities.some((entity) => entity.faction === 'enemy' && entity.hp > 0);
  if (enemiesAlive) {
    return { lastEnemySpawnAt, outcome: undefined as BattleStepResult['outcome'] };
  }

  if (state.wave + 1 < WAVES.length) {
    state.wave += 1;
    state.enemiesSpawnedInWave = 0;
    state.waveDelayTimer = BATTLE_CONFIG.interWaveDelaySec;
    return { lastEnemySpawnAt, outcome: undefined as BattleStepResult['outcome'] };
  }

  state.status = 'victory';
  return { lastEnemySpawnAt, outcome: 'victory' as const };
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

function computeHitDamage(attacker: Entity, target: Entity, waveIndex: number) {
  let damage = attacker.unitClass === 'melee' ? BATTLE_CONFIG.meleeDamage : BATTLE_CONFIG.rangedDamage;

  if (attacker.faction === 'enemy') {
    const currentWave = WAVES[waveIndex] || WAVES[WAVES.length - 1];
    damage = BATTLE_CONFIG.enemyDamage * currentWave.damageMultiplier;
    if (attacker.colorIdx !== target.colorIdx) {
      damage *= BATTLE_CONFIG.enemyWrongColorDamageMultiplier;
    }
  } else if (attacker.colorIdx !== target.colorIdx) {
    damage *= BATTLE_CONFIG.warriorWrongColorDamageMultiplier;
  }

  return Math.round(damage);
}

function pushProjectile(state: BattleState, attacker: Entity, target: Entity, damage: number) {
  const length = Math.sqrt((target.x - attacker.x) ** 2 + (target.y - attacker.y) ** 2);
  state.projectiles.push({
    id: Math.random().toString(36),
    x: attacker.x,
    y: attacker.y,
    vx: ((target.x - attacker.x) / length) * BATTLE_CONFIG.projectileSpeed,
    vy: ((target.y - attacker.y) / length) * BATTLE_CONFIG.projectileSpeed,
    targetId: target.id,
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
  for (let index = 0; index < state.entities.length; index += 1) {
    const entity = state.entities[index];
    if (entity.hp <= 0) {
      continue;
    }

    entity.attackTimer -= dt * 1000;
    entity.attackVisualTimer = Math.max(0, entity.attackVisualTimer - dt * 1000);

    const { bestTarget, minDistance } = findBestTarget(entity, state.entities);
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
          const damage = computeHitDamage(entity, bestTarget, state.wave);

          if (entity.unitClass === 'melee') {
            bestTarget.hp -= damage;
            addDamageText(
              state,
              bestTarget.x,
              bestTarget.y - BATTLE_CONFIG.damageTextYOffsetPx,
              damage.toString(),
              WARRIOR_HEX_COLORS[entity.colorIdx],
            );
          } else {
            pushProjectile(state, entity, bestTarget, damage);
          }
        }
      } else {
        targetX = bestTarget.x;
        targetY = bestTarget.y;
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
          const currentWave = WAVES[state.wave] || WAVES[WAVES.length - 1];
          const wallDamage = Math.round(BATTLE_CONFIG.wallDamage * currentWave.damageMultiplier);
          state.wallHp -= wallDamage;
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
}

function stepProjectiles(state: BattleState, dt: number, viewport: BattleViewport) {
  for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = state.projectiles[index];
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    const target = state.entities.find((entity) => entity.id === projectile.targetId);
    if (target && target.hp > 0) {
      const distance = Math.sqrt((target.x - projectile.x) ** 2 + (target.y - projectile.y) ** 2);
      if (distance < BATTLE_CONFIG.projectileHitRadiusPx) {
        target.hp -= projectile.damage;
        addDamageText(
          state,
          target.x,
          target.y - BATTLE_CONFIG.damageTextYOffsetPx,
          projectile.damage.toString(),
          WARRIOR_HEX_COLORS[projectile.colorIdx],
        );
        state.projectiles.splice(index, 1);
      }
      continue;
    }

    if (
      projectile.x < 0 ||
      projectile.x > viewport.width ||
      projectile.y < 0 ||
      projectile.y > viewport.height
    ) {
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
  if (state.wallHp < 0) {
    state.wallHp = 0;
  }
}

export function createBattleState() {
  return createWaveState();
}

export function spawnPlayerWarriors(
  state: BattleState,
  warriors: WarriorSpawnRequest[],
  boardCols: number,
  viewport: BattleViewport,
) {
  const cellWidth = viewport.width / boardCols;

  const newEntities: Entity[] = warriors.map((warrior) => ({
    id: createId(),
    faction: 'player',
    unitClass: getRandomUnitClass(),
    colorIdx: warrior.colorIdx,
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
    hp: BATTLE_CONFIG.warriorHp,
    maxHp: BATTLE_CONFIG.warriorHp,
    targetId: null,
    attackTimer: 0,
    attackVisualTimer: 0,
    attackVisualDurationMs: BATTLE_CONFIG.attackVisualDurationMs,
    attackVisualDx: 0,
    attackVisualDy: -1,
  }));

  state.entities.push(...newEntities);
}

export function stepBattleState(params: {
  state: BattleState;
  dt: number;
  time: number;
  viewport: BattleViewport;
  lastEnemySpawnAt: number;
}): { lastEnemySpawnAt: number; result: BattleStepResult } {
  const { state, dt, time, viewport, lastEnemySpawnAt } = params;

  if (state.status !== 'playing') {
    return { lastEnemySpawnAt, result: {} };
  }

  if (state.wallHp <= 0) {
    state.status = 'defeat';
    return { lastEnemySpawnAt, result: { outcome: 'defeat' } };
  }

  if (state.waveDelayTimer > 0) {
    state.waveDelayTimer -= dt;
  }

  const waveFlow = updateWaveFlow(state, time, lastEnemySpawnAt, viewport);
  if (waveFlow.outcome) {
    return { lastEnemySpawnAt: waveFlow.lastEnemySpawnAt, result: { outcome: waveFlow.outcome } };
  }

  stepEntities(state, dt, viewport);
  stepProjectiles(state, dt, viewport);
  stepDamageTexts(state, dt);
  cleanupState(state);

  if (state.wallHp <= 0) {
    state.status = 'defeat';
    return { lastEnemySpawnAt: waveFlow.lastEnemySpawnAt, result: { outcome: 'defeat' } };
  }

  return { lastEnemySpawnAt: waveFlow.lastEnemySpawnAt, result: {} };
}
