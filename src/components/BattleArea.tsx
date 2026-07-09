import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BATTLE_CONFIG, WAVES, WARRIOR_COLORS } from '../config';
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

  const wallHpPct = Math.max(0, state.wallHp / BATTLE_CONFIG.wallMaxHealth) * 100;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden border-b-4 border-neutral-700" ref={containerRef}>
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-800 to-neutral-900 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
          <span className="text-neutral-500 font-bold tracking-widest text-lg">BATTLE AREA</span>
          {state.waveDelayTimer > 0 && state.wave < WAVES.length && (
            <span className="text-white font-bold tracking-widest text-2xl mt-4 animate-pulse">
              WAVE {state.wave + 1}
            </span>
          )}
        </div>

        {state.entities.map((entity) => (
          <div
            key={entity.id}
            className="absolute -ml-6 -mt-8 w-12 h-16 flex flex-col items-center justify-end transition-transform duration-75"
            style={{
              left: entity.x,
              top: entity.y,
              zIndex: Math.round(entity.y),
            }}
          >
            {entity.faction === 'player' ? (
              <WarriorVisual
                colorIdx={entity.colorIdx}
                lifetimeProgress={
                  entity.lifetimeRemainingSec !== undefined && entity.maxLifetimeSec
                    ? entity.lifetimeRemainingSec / entity.maxLifetimeSec
                    : undefined
                }
                className="w-full h-full mb-1 drop-shadow-md"
              />
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
        WAVE {Math.min(state.wave + 1, WAVES.length)} / {WAVES.length}
      </div>

      <div className="absolute bottom-4 left-0 right-0 h-3 bg-red-950/80 z-30 flex items-center justify-center overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 bg-red-500 transition-all duration-300"
          style={{ width: `${wallHpPct}%` }}
        />
        <span className="relative text-[10px] font-bold text-white drop-shadow-md tracking-wider">
          WALL HP: {Math.max(0, Math.floor(state.wallHp))}
        </span>
      </div>
    </div>
  );
});
