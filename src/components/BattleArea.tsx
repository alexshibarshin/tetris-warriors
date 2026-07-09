import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BATTLE_CONFIG, SPAWN_PHASES, WARRIOR_COLORS } from '../config';
import { BattleState } from '../types';
import { EnemyVisual } from './EnemyVisual';
import { WarriorVisual } from './WarriorVisual';
import { DEFAULT_GAME_DESIGN } from '../game/design';
import { WarriorSpawnRequest } from '../game/types';

export interface BattleAreaRef {
  spawnWarriors: (warriors: WarriorSpawnRequest[], boardCols: number) => void;
  reset: () => void;
}

export interface BattleAreaProps {
  onGameEnd?: (result: 'victory' | 'defeat') => void;
}

export const BattleArea = forwardRef<BattleAreaRef, BattleAreaProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<BattleState>(() => DEFAULT_GAME_DESIGN.battle.createBattleState());

  const stateRef = useRef(state);
  const lastTimeRef = useRef<number>(0);
  const lastEnemySpawnRef = useRef<number>(0);
  const reqRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    spawnWarriors: (warriors, boardCols) => {
      if (!containerRef.current || stateRef.current.status !== 'playing') {
        return;
      }

      DEFAULT_GAME_DESIGN.battle.spawnPlayerWarriors(
        stateRef.current,
        warriors,
        boardCols,
        {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        },
      );
    },
    reset: () => {
      const freshState = DEFAULT_GAME_DESIGN.battle.createBattleState();
      stateRef.current = freshState;
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

      if (stateRef.current.status === 'playing' && containerRef.current) {
        const step = DEFAULT_GAME_DESIGN.battle.stepBattleState({
          state: stateRef.current,
          dt,
          time,
          viewport: {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          },
          lastEnemySpawnAt: lastEnemySpawnRef.current,
        });

        lastEnemySpawnRef.current = step.lastEnemySpawnAt;
        if (step.result.outcome) {
          props.onGameEnd?.(step.result.outcome);
        }
      }

      setState({ ...stateRef.current });
      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqRef.current);
  }, [props.onGameEnd]);

  const playerBaseHpPct = Math.max(0, state.playerBaseHp / BATTLE_CONFIG.playerBaseMaxHealth) * 100;
  const enemyStructureHpPct = Math.max(0, state.enemyStructureHp / BATTLE_CONFIG.enemyStructureMaxHealth) * 100;
  const enemyStructureLeft = `${BATTLE_CONFIG.enemyStructureXRatio * 100}%`;
  const phaseNumber = Math.min(state.phase + 1, SPAWN_PHASES.length);

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
    <div className="flex-1 flex flex-col relative overflow-hidden border-b-4 border-neutral-700" ref={containerRef}>
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-800 to-neutral-900 pointer-events-none overflow-hidden">
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
            <div className="mt-1 text-[10px] font-black tracking-[0.35em] text-red-200/85">
              ENEMY PORTAL
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
              <WarriorVisual colorIdx={entity.colorIdx} className="w-full h-full mb-1 drop-shadow-md" />
            ) : (
              <EnemyVisual colorIdx={entity.colorIdx} className="w-full h-full mb-1 drop-shadow-md" />
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
          </div>
        ))}

        {state.projectiles.map((projectile) => (
          <div
            key={projectile.id}
            className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full ${WARRIOR_COLORS[projectile.colorIdx]} shadow-[0_0_8px_rgba(255,255,255,0.5)]`}
            style={{ left: projectile.x, top: projectile.y }}
          />
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

      <div className="absolute bottom-0 left-0 right-0 h-4 bg-neutral-950 border-t-4 border-neutral-700 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-30">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgoJPHJlY3Qgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz4KCTxwYXRoIGQ9Ik0wLDBMODw4Wk04LDBMMCw4WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] pointer-events-none" />
      </div>

      <div className="absolute top-2 left-4 z-40 bg-black/60 px-3 py-1 rounded-full border border-neutral-700 font-mono text-sm font-bold text-white shadow-md">
        PHASE {phaseNumber} / {SPAWN_PHASES.length}
      </div>

      <div className="absolute top-2 right-4 z-40 bg-black/60 px-3 py-1 rounded-full border border-red-900/80 font-mono text-sm font-bold text-red-100 shadow-md">
        PORTAL HP: {Math.max(0, Math.floor(state.enemyStructureHp))}
      </div>

      <div className="absolute top-14 left-1/2 -translate-x-1/2 w-48 h-3 bg-red-950/80 z-30 flex items-center justify-center overflow-hidden rounded-full border border-red-900/80">
        <div
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-700 via-orange-500 to-amber-300 transition-all duration-300"
          style={{ width: `${enemyStructureHpPct}%` }}
        />
        <span className="relative text-[10px] font-bold text-white drop-shadow-md tracking-wider">
          ENEMY PORTAL
        </span>
      </div>

      <div className="absolute bottom-4 left-0 right-0 h-3 bg-red-950/80 z-30 flex items-center justify-center overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 bg-red-500 transition-all duration-300"
          style={{ width: `${playerBaseHpPct}%` }}
        />
        <span className="relative text-[10px] font-bold text-white drop-shadow-md tracking-wider">
          YOUR GATE HP: {Math.max(0, Math.floor(state.playerBaseHp))}
        </span>
      </div>
    </div>
  );
});
