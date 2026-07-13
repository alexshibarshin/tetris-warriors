import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BATTLE_CONFIG, NEUTRAL_HEX_COLOR, SPAWN_PHASES, WARRIOR_COLORS } from '../config';
import { BattleSnapshot, BattleState } from '../types';
import { EnemyVisual } from './EnemyVisual';
import { WarriorVisual } from './WarriorVisual';
import { BattleViewport, getSuddenDeathLevel } from '../game/battle';
import { DEFAULT_GAME_DESIGN } from '../game/design';
import { PlayerBuildState } from '../game/progression';
import { StageTheme } from '../game/stageTheme';
import { WarriorSpawnRequest } from '../game/types';

export interface BattleAreaRef {
  spawnWarriors: (warriors: WarriorSpawnRequest[], boardCols: number, build: PlayerBuildState) => void;
  healPlayerBase: (fraction: number) => void;
  reset: (stageTheme: StageTheme) => void;
}

export interface BattleAreaProps {
  paused: boolean;
  build: PlayerBuildState;
  stageTheme: StageTheme;
  onGameEnd?: (result: 'victory' | 'defeat') => void;
  onBattleStateChange?: (snapshot: BattleSnapshot) => void;
}

type BattleLayout = {
  viewport: BattleViewport;
  scale: number;
  offsetY: number;
};

function getBattleLayout(containerWidth: number, containerHeight: number): BattleLayout {
  const safeWidth = Math.max(containerWidth, 1);
  const safeHeight = Math.max(containerHeight, 1);
  const gameplayHeight = BATTLE_CONFIG.gameplayHeightPx;
  const scale = Math.min(1, safeHeight / gameplayHeight);

  return {
    viewport: {
      width: safeWidth / scale,
      height: gameplayHeight,
    },
    scale,
    offsetY: safeHeight - gameplayHeight * scale,
  };
}

function TierStars({ tier }: { tier: number }) {
  if (tier <= 1) {
    return null;
  }

  return (
    <div className="absolute -left-1 -top-1 flex gap-0.5">
      {Array.from({ length: tier - 1 }, (_, index) => (
        <span key={index} className="text-[9px] leading-none text-yellow-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          ★
        </span>
      ))}
    </div>
  );
}

export const BattleArea = forwardRef<BattleAreaRef, BattleAreaProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<BattleState>(() => DEFAULT_GAME_DESIGN.battle.createBattleState(props.stageTheme));
  const [containerSize, setContainerSize] = useState({
    width: 1,
    height: BATTLE_CONFIG.gameplayHeightPx,
  });

  const stateRef = useRef(state);
  const lastTimeRef = useRef<number>(0);
  const lastEnemySpawnRef = useRef<number>(0);
  const reqRef = useRef<number>(0);
  const lastSnapshotRef = useRef<BattleSnapshot | null>(null);
  const pausedRef = useRef(props.paused);
  const buildRef = useRef(props.build);
  const onGameEndRef = useRef(props.onGameEnd);
  const onBattleStateChangeRef = useRef(props.onBattleStateChange);

  pausedRef.current = props.paused;
  buildRef.current = props.build;
  onGameEndRef.current = props.onGameEnd;
  onBattleStateChangeRef.current = props.onBattleStateChange;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const element = containerRef.current;
    const measure = () => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    spawnWarriors: (warriors, boardCols, build) => {
      if (!containerRef.current || stateRef.current.status !== 'playing') {
        return;
      }

      const layout = getBattleLayout(containerRef.current.clientWidth, containerRef.current.clientHeight);

      DEFAULT_GAME_DESIGN.battle.spawnPlayerWarriors(
        stateRef.current,
        warriors,
        boardCols,
        layout.viewport,
        build,
      );
      setState({ ...stateRef.current });
    },
    healPlayerBase: (fraction) => {
      DEFAULT_GAME_DESIGN.battle.healPlayerBase(stateRef.current, fraction);
      setState({ ...stateRef.current });
    },
    reset: (stageTheme) => {
      const freshState = DEFAULT_GAME_DESIGN.battle.createBattleState(stageTheme);
      stateRef.current = freshState;
      lastSnapshotRef.current = null;
      setState(freshState);
      lastTimeRef.current = 0;
      lastEnemySpawnRef.current = 0;
    },
  }));

  useEffect(() => {
    const loop = (time: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }

      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!pausedRef.current && stateRef.current.status === 'playing' && containerRef.current) {
        const layout = getBattleLayout(containerRef.current.clientWidth, containerRef.current.clientHeight);
        const step = DEFAULT_GAME_DESIGN.battle.stepBattleState({
          state: stateRef.current,
          dt,
          viewport: layout.viewport,
          lastEnemySpawnAt: lastEnemySpawnRef.current,
          build: buildRef.current,
        });

        lastEnemySpawnRef.current = step.lastEnemySpawnAt;
        if (step.result.outcome) {
          onGameEndRef.current?.(step.result.outcome);
        }
      }

      const snapshot = {
        playerBaseHp: stateRef.current.playerBaseHp,
        playerBaseMaxHp: BATTLE_CONFIG.playerBaseMaxHealth,
        enemyStructureHp: stateRef.current.enemyStructureHp,
        enemyStructureMaxHp: BATTLE_CONFIG.enemyStructureMaxHealth,
        phase: stateRef.current.phase,
      };

      if (
        !lastSnapshotRef.current ||
        lastSnapshotRef.current.playerBaseHp !== snapshot.playerBaseHp ||
        lastSnapshotRef.current.enemyStructureHp !== snapshot.enemyStructureHp ||
        lastSnapshotRef.current.phase !== snapshot.phase
      ) {
        lastSnapshotRef.current = snapshot;
        onBattleStateChangeRef.current?.(snapshot);
      }

      setState({ ...stateRef.current });
      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqRef.current);
  }, []);

  const playerBaseHpPct = Math.max(0, state.playerBaseHp / BATTLE_CONFIG.playerBaseMaxHealth) * 100;
  const enemyStructureHpPct = Math.max(0, state.enemyStructureHp / BATTLE_CONFIG.enemyStructureMaxHealth) * 100;
  const portalPhaseMultiplier =
    BATTLE_CONFIG.structureDamageMultipliersByPhase[state.phase] ??
    BATTLE_CONFIG.structureDamageMultipliersByPhase[BATTLE_CONFIG.structureDamageMultipliersByPhase.length - 1];
  const portalDamage = Math.round(BATTLE_CONFIG.structureDamage * portalPhaseMultiplier);
  const battleLayout = getBattleLayout(containerSize.width, containerSize.height);
  const enemyStructureLeft = `${BATTLE_CONFIG.enemyStructureXRatio * 100}%`;
  const phaseNumber = Math.min(state.phase + 1, SPAWN_PHASES.length);
  const suddenDeathLevel = getSuddenDeathLevel(state.battleTimeSec);
  const suddenDeathDamageMultiplier = 1 + suddenDeathLevel * BATTLE_CONFIG.suddenDeathDamageBonusPerStep;

  const getEntityTransform = (entity: BattleState['entities'][number]) => {
    const duration = entity.attackVisualDurationMs || 1;
    const progress = Math.min(1, Math.max(0, 1 - entity.attackVisualTimer / duration));
    const impulse = Math.sin(progress * Math.PI);

    const lungeX = entity.attackVisualDx * BATTLE_CONFIG.attackVisualLungePx * impulse;
    const lungeY = entity.attackVisualDy * BATTLE_CONFIG.attackVisualLungePx * impulse - BATTLE_CONFIG.attackVisualLiftPx * impulse;
    const tilt = entity.attackVisualDx * BATTLE_CONFIG.attackVisualTiltDeg * impulse;
    const scaleX = 1 + BATTLE_CONFIG.attackVisualStretch * impulse;
    const scaleY = 1 - BATTLE_CONFIG.attackVisualStretch * impulse * 0.65;

    return `translate(${lungeX}px, ${lungeY}px) rotate(${tilt}deg) scale(${scaleX}, ${scaleY})`;
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden border-b-4 border-neutral-700 z-0" ref={containerRef}>
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-800 to-neutral-900 pointer-events-none overflow-hidden">
        <div
          className="absolute"
          style={{
            left: '50%',
            top: battleLayout.offsetY,
            width: battleLayout.viewport.width,
            height: BATTLE_CONFIG.gameplayHeightPx,
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${battleLayout.scale})`,
              transformOrigin: 'top center',
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
              <span className="text-neutral-500 font-bold tracking-[0.4em] text-lg">BATTLEFIELD</span>
              {state.startDelayTimer > 0 && (
                <span className="text-white font-bold tracking-widest text-2xl mt-4 animate-pulse">
                  PORTAL AWAKENS
                </span>
              )}
            </div>

            <div
              className="absolute -translate-x-1/2 z-20 pointer-events-none"
              style={{ left: enemyStructureLeft, top: BATTLE_CONFIG.enemyStructureYPx - 28 }}
            >
              <div className="relative flex flex-col items-center">
                <div className="absolute top-12 w-32 h-16 rounded-full bg-red-500/25 blur-2xl" />
                <div className="relative w-28 h-20">
                  <div className="absolute inset-x-2 bottom-0 h-10 rounded-t-[40px] bg-neutral-950 border-2 border-red-950 shadow-[0_0_20px_rgba(0,0,0,0.6)]" />
                  <div className="absolute inset-x-5 top-5 bottom-1 rounded-[999px] border-2 border-red-500/60 bg-gradient-to-b from-red-200/20 via-red-500/30 to-red-950/70 shadow-[0_0_18px_rgba(239,68,68,0.45)]" />
                  <div className="absolute inset-x-8 top-8 bottom-4 rounded-[999px] bg-gradient-to-b from-orange-200/60 via-red-400/55 to-red-950/0 animate-pulse" />
                  <div className="absolute left-1/2 top-2 -translate-x-1/2 w-8 h-8 rotate-45 rounded-sm border border-red-300/40 bg-neutral-900" />
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  {props.stageTheme.dominantColorIndices.map((colorIdx) => (
                    <span
                      key={colorIdx}
                      className={`w-3 h-3 rounded-full border border-white/50 ${WARRIOR_COLORS[colorIdx]}`}
                    />
                  ))}
                  <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: NEUTRAL_HEX_COLOR }} />
                </div>
                <div className="mt-1 text-[10px] font-black tracking-[0.35em] text-red-200/85">
                  ENEMY PORTAL
                </div>
                <div className="text-[9px] font-bold tracking-[0.12em] text-orange-200/80">
                  {props.stageTheme.portalEffect.icon} {props.stageTheme.portalEffect.name.toUpperCase()}
                </div>
              </div>
            </div>

            {state.entities.map((entity) => (
              <div
                key={entity.id}
                className="absolute -ml-6 -mt-8 w-12 h-16 flex flex-col items-center justify-end transition-transform duration-75"
                style={{
                  left: entity.x,
                  top: entity.y,
                  zIndex: Math.round(entity.y),
                  transform: getEntityTransform(entity),
                  transformOrigin: '50% 80%',
                }}
              >
                {entity.faction === 'player' ? (
                  <div className="relative w-full h-full mb-1">
                    <WarriorVisual warriorId={entity.warriorId} colorIdx={entity.colorIdx ?? 0} tier={entity.tier} className="w-full h-full drop-shadow-md" />
                    <TierStars tier={entity.tier} />
                    {entity.shield > 0 && <div className="absolute inset-0 rounded-full border-2 border-violet-300/80 bg-violet-300/10 shadow-[0_0_12px_rgba(196,181,253,.7)]" />}
                  </div>
                ) : (
                  <div className="relative w-full h-full mb-1">
                    <EnemyVisual colorIdx={entity.colorIdx} theme={props.stageTheme.enemyTheme.id} signature={entity.enemyKind === 'signature'} className="w-full h-full drop-shadow-md" />
                    {entity.warded && <div className="absolute inset-0 rounded-full border-2 border-cyan-200 bg-cyan-300/15 shadow-[0_0_14px_rgba(103,232,249,.8)]" />}
                    {entity.poisonStacks > 0 && <div className="absolute -left-1 top-1 rounded-full bg-green-500 px-1 text-[8px] font-black text-black">{entity.poisonStacks}</div>}
                    {entity.frozenTimer > 0 && <div className="absolute -right-1 top-1 text-sm drop-shadow-md">❄</div>}
                    {entity.stunnedTimer > 0 && <div className="absolute right-2 -top-1 text-sm drop-shadow-md">⚡</div>}
                    {entity.armor > 0 && <div className="absolute -left-1 bottom-2 text-xs drop-shadow-md">⬟</div>}
                  </div>
                )}

                <div className="absolute -right-1 top-2 w-4 h-4 rounded-full border border-black/50 flex items-center justify-center text-[10px] bg-white/20 text-white font-bold drop-shadow-sm">
                  {entity.unitClass === 'melee' ? '⚔' : '⚚'}
                </div>

                <div className="absolute -bottom-2 w-8 h-1.5 bg-black/80 rounded-full overflow-hidden border border-neutral-700">
                  <div
                    className="h-full bg-green-500 transition-all duration-200"
                    style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
                  />
                </div>
                {entity.shield > 0 && (
                  <div className="absolute -bottom-4 w-8 h-1 bg-violet-950/80 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-300" style={{ width: `${Math.min(100, entity.shield / Math.max(1, entity.maxShield) * 100)}%` }} />
                  </div>
                )}
              </div>
            ))}

            {state.effects.map((effect) => (
              <div
                key={effect.id}
                className={`absolute rounded-full border-4 pointer-events-none ${
                  effect.kind === 'heal' ? 'border-emerald-300 bg-emerald-400/15' :
                  effect.kind === 'ward' ? 'border-cyan-200 bg-cyan-300/10' :
                  effect.kind === 'explosion' ? 'border-orange-300 bg-red-500/30' :
                  effect.kind === 'freeze' ? 'border-sky-200 bg-sky-300/20' :
                  effect.kind === 'lightning' ? 'border-yellow-200 bg-yellow-300/30' :
                  effect.kind === 'taunt' ? 'border-violet-300 bg-violet-400/15' :
                  'border-white/70 bg-white/10'
                }`}
                style={{
                  left: effect.x - effect.radius,
                  top: effect.y - effect.radius,
                  width: effect.radius * 2,
                  height: effect.radius * 2,
                  opacity: effect.life / effect.maxLife,
                  transform: `scale(${1.2 - effect.life / effect.maxLife * 0.2})`,
                }}
              />
            ))}

            {state.projectiles.map((projectile) => (
              <div
                key={projectile.id}
                className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                style={{
                  left: projectile.x,
                  top: projectile.y,
                  backgroundColor: projectile.colorIdx === null ? NEUTRAL_HEX_COLOR : undefined,
                }}
              >
                {projectile.colorIdx !== null && (
                  <div className={`w-full h-full rounded-full ${WARRIOR_COLORS[projectile.colorIdx]}`} />
                )}
              </div>
            ))}

            {state.damageTexts.map((damageText) => (
              <div
                key={damageText.id}
                className="absolute font-bold text-lg font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none"
                style={{
                  left: damageText.x,
                  top: damageText.y,
                  color: damageText.color,
                  opacity: damageText.life / damageText.maxLife,
                  transform: 'translateX(-50%)',
                }}
              >
                {damageText.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-4 bg-neutral-950 border-t-4 border-neutral-700 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-30">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgoJPHJlY3Qgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz4KCTxwYXRoIGQ9Ik0wLDBMODw4Wk04LDBMMCw4WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] pointer-events-none" />
      </div>

      <div className="absolute top-2 left-4 z-40 bg-black/60 px-3 py-1 rounded-full border border-neutral-700 font-mono text-sm font-bold text-white shadow-md">
        PHASE {phaseNumber} / {SPAWN_PHASES.length}
      </div>

      {state.enemyWavesSuppressed && (
        <div className="absolute top-10 left-4 z-40 rounded-full border border-cyan-300/30 bg-cyan-950/75 px-3 py-1 text-[9px] font-black tracking-[0.18em] text-cyan-100 shadow-md">
          PORTAL WAVES PAUSED
        </div>
      )}

      {suddenDeathLevel > 0 && (
        <div className="absolute top-10 left-1/2 z-40 -translate-x-1/2 rounded-full border border-orange-300/70 bg-red-950/90 px-3 py-1 text-[10px] font-black tracking-[0.16em] text-amber-100 shadow-[0_0_16px_rgba(239,68,68,.55)] animate-pulse">
          SUDDEN DEATH ×{suddenDeathDamageMultiplier.toFixed(1)}
        </div>
      )}

      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-36 h-2.5 bg-red-950/75 z-30 flex items-center justify-center overflow-hidden rounded-full border border-red-900/70">
        <div
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-700 via-orange-500 to-amber-300 transition-all duration-300"
          style={{ width: `${enemyStructureHpPct}%` }}
        />
        <span className="relative px-2 text-[9px] font-bold text-white drop-shadow-md tracking-wide">
          {Math.max(0, Math.floor(state.enemyStructureHp))} / {BATTLE_CONFIG.enemyStructureMaxHealth}
        </span>
      </div>

      <div className="absolute bottom-1 left-3 right-3 h-3 bg-red-950/80 z-30 flex items-center justify-center overflow-hidden rounded-full border border-red-950/80">
        <div
          className="absolute left-0 top-0 bottom-0 bg-red-500 transition-all duration-300"
          style={{ width: `${playerBaseHpPct}%` }}
        />
        <span className="relative text-[10px] font-bold text-white drop-shadow-md tracking-wider">
          YOUR GATE HP: {Math.max(0, Math.floor(state.playerBaseHp))}
        </span>
        {[20, 40, 60, 80].map((threshold) => (
          <span
            key={threshold}
            className="absolute inset-y-0 w-px bg-white/45"
            style={{ left: `${threshold}%` }}
          />
        ))}
      </div>

      {props.paused && (
        <div className="absolute inset-0 z-40 bg-black/35 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
          <div className="px-4 py-2 rounded-full bg-black/70 border border-white/10 text-white text-sm font-bold tracking-[0.3em]">
            PAUSED
          </div>
        </div>
      )}
    </div>
  );
});
