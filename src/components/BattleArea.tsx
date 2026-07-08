import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { BattleState, Entity, Projectile, DamageText, Faction, UnitClass } from '../types';
import { BATTLE_CONFIG, WAVES, WARRIOR_COLORS, WARRIOR_TEXT_COLORS, WARRIOR_HEX_COLORS } from '../config';
import { WarriorVisual } from './WarriorVisual';
import { EnemyVisual } from './EnemyVisual';

export interface BattleAreaRef {
  spawnWarriors: (warriors: { col: number; colorIdx: number }[], boardCols: number) => void;
  reset: () => void;
}

export interface BattleAreaProps {
  onGameEnd?: (result: 'victory' | 'defeat') => void;
}

export const BattleArea = forwardRef<BattleAreaRef, BattleAreaProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const initialState = {
    entities: [],
    projectiles: [],
    damageTexts: [],
    wallHp: BATTLE_CONFIG.wallMaxHealth,
    wave: 0,
    enemiesSpawnedInWave: 0,
    waveDelayTimer: BATTLE_CONFIG.initialWaveDelaySec, // initial delay before wave 1 starts
    status: 'playing' as const,
  };

  const [state, setState] = useState<BattleState>({ ...initialState });

  const stateRef = useRef(state);
  const lastTimeRef = useRef<number>(0);
  const lastEnemySpawnRef = useRef<number>(0);
  const reqRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    spawnWarriors: (warriors, boardCols) => {
      if (!containerRef.current || stateRef.current.status !== 'playing') return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const cellWidth = width / boardCols;

      const newEntities: Entity[] = warriors.map((w) => ({
        id: Math.random().toString(36).substring(2, 9),
        faction: 'player',
        unitClass: Math.random() > 0.5 ? 'melee' : 'ranged',
        colorIdx: w.colorIdx,
        x: (w.col * cellWidth) + (cellWidth / 2) + (Math.random() * 10 - 5),
        y: height - 10 + (Math.random() * 10 - 5),
        vx: 0,
        vy: 0,
        hp: BATTLE_CONFIG.warriorHp,
        maxHp: BATTLE_CONFIG.warriorHp,
        targetId: null,
        attackTimer: 0,
      }));

      stateRef.current.entities.push(...newEntities);
    },
    reset: () => {
      stateRef.current = { ...initialState };
      setState({ ...initialState });
      lastTimeRef.current = 0;
      lastEnemySpawnRef.current = 0;
    }
  }));

  useEffect(() => {
    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (stateRef.current.status === 'playing') {
        update(dt, time);
      }
      
      // Copy state to trigger re-render
      setState({ ...stateRef.current });
      
      reqRef.current = requestAnimationFrame(loop);
    };
    
    reqRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqRef.current);
  }, []);

  const getEnemySpawnX = (wave: number, width: number) => {
    if (wave === 0) {
      return width * 0.35 + Math.random() * width * 0.3;
    }

    if (wave === 1) {
      return width * 0.2 + Math.random() * width * 0.6;
    }

    return Math.random() * (width - 40) + 20;
  };

  const update = (dt: number, time: number) => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const st = stateRef.current;

    if (st.status !== 'playing') return;

    // Check game over
    if (st.wallHp <= 0) {
      st.status = 'defeat';
      props.onGameEnd?.('defeat');
      return;
    }

    // Wave Logic
    if (st.waveDelayTimer > 0) {
      st.waveDelayTimer -= dt;
    } else {
      const currentWave = WAVES[st.wave];
      if (currentWave) {
        if (st.enemiesSpawnedInWave < currentWave.totalEnemies) {
          if (time - lastEnemySpawnRef.current > currentWave.spawnRateMs) {
            lastEnemySpawnRef.current = time;
            st.enemiesSpawnedInWave++;
            const hp = BATTLE_CONFIG.enemyHp * currentWave.hpMultiplier;
            st.entities.push({
              id: Math.random().toString(36).substring(2, 9),
              faction: 'enemy',
              unitClass: Math.random() > 0.5 ? 'melee' : 'ranged',
              colorIdx: Math.floor(Math.random() * WARRIOR_COLORS.length),
              x: getEnemySpawnX(st.wave, width),
              y: 10,
              vx: 0,
              vy: 0,
              hp: hp,
              maxHp: hp,
              targetId: null,
              attackTimer: 0,
            });
          }
        } else {
          // Check if all enemies are dead
          const enemiesAlive = st.entities.some(e => e.faction === 'enemy' && e.hp > 0);
          if (!enemiesAlive) {
            if (st.wave + 1 < WAVES.length) {
              st.wave++;
              st.enemiesSpawnedInWave = 0;
              st.waveDelayTimer = 3; // 3 seconds delay between waves
            } else {
              st.status = 'victory';
              props.onGameEnd?.('victory');
              return;
            }
          }
        }
      }
    }

    // Logic for entities
    for (let i = 0; i < st.entities.length; i++) {
      const e = st.entities[i];
      if (e.hp <= 0) continue;

      e.attackTimer -= dt * 1000;

      // Find target
      let bestTarget: Entity | null = null;
      let minDist = Infinity;

      for (let j = 0; j < st.entities.length; j++) {
        const other = st.entities[j];
        if (other.hp <= 0 || other.faction === e.faction) continue;

        const dx = other.x - e.x;
        const dy = other.y - e.y;
        
        // Dynamic lanes check
        if (Math.abs(dx) > BATTLE_CONFIG.aggroRangeX) continue;
        if (Math.abs(dy) > BATTLE_CONFIG.aggroRangeY) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          bestTarget = other;
        }
      }

      e.targetId = bestTarget ? bestTarget.id : null;

      let targetX = e.x;
      let targetY = e.y;
      let isAttacking = false;
      let speedMult = 1;

      if (bestTarget) {
        const range = e.unitClass === 'melee' ? BATTLE_CONFIG.meleeRange : BATTLE_CONFIG.rangedRange;
        if (minDist <= range) {
          isAttacking = true;
          if (e.attackTimer <= 0) {
            e.attackTimer = BATTLE_CONFIG.attackCooldownMs;
            
            let dmg = e.unitClass === 'melee' ? BATTLE_CONFIG.meleeDamage : BATTLE_CONFIG.rangedDamage;
            
            if (e.faction === 'enemy') {
              const currentWave = WAVES[st.wave] || WAVES[WAVES.length - 1];
              dmg = BATTLE_CONFIG.enemyDamage * currentWave.damageMultiplier;
              if (e.colorIdx !== bestTarget.colorIdx) {
                dmg *= BATTLE_CONFIG.enemyWrongColorDamageMultiplier;
              }
            } else if (e.colorIdx !== bestTarget.colorIdx) {
              dmg *= BATTLE_CONFIG.warriorWrongColorDamageMultiplier;
            }
            dmg = Math.round(dmg);
            
            if (e.unitClass === 'melee') {
              bestTarget.hp -= dmg;
              addDamageText(st, bestTarget.x, bestTarget.y - 20, dmg.toString(), WARRIOR_HEX_COLORS[e.colorIdx]);
            } else {
              // Fire projectile
              const pLen = Math.sqrt((bestTarget.x - e.x)**2 + (bestTarget.y - e.y)**2);
              st.projectiles.push({
                id: Math.random().toString(36),
                x: e.x,
                y: e.y,
                vx: ((bestTarget.x - e.x) / pLen) * BATTLE_CONFIG.projectileSpeed,
                vy: ((bestTarget.y - e.y) / pLen) * BATTLE_CONFIG.projectileSpeed,
                targetId: bestTarget.id,
                damage: dmg,
                colorIdx: e.colorIdx,
                faction: e.faction,
              });
            }
          }
        } else {
          // Move towards target
          targetX = bestTarget.x;
          targetY = bestTarget.y;
        }
      } else {
        // No target, move to default goal
        if (e.faction === 'player') {
          speedMult = 0.4; // Wander slower than normal movement
          if (e.idleTimer === undefined || e.idleTimer <= 0) {
            e.idleTimer = 1 + Math.random() * 2; // change idle target every 1-3 seconds
            
            let dx = (Math.random() - 0.5) * 120;
            let dy = (Math.random() - 0.5) * 100;
            
            // If they are too high (y is small), encourage moving down
            if (e.y < height - 150) {
              dy = Math.abs(dy) + 40; 
            } else if (e.y > height - 40) {
              // Keep them from overlapping the wall too much
              dy = -Math.abs(dy) - 20;
            }

            e.idleTargetX = Math.max(20, Math.min(width - 20, e.x + dx));
            e.idleTargetY = Math.max(20, Math.min(height - 20, e.y + dy));
          } else {
            e.idleTimer -= dt;
          }
          targetX = e.idleTargetX!;
          targetY = e.idleTargetY!;
        } else {
          targetY = height; // Move to wall
          // Wall attack logic
          if (e.y >= height - BATTLE_CONFIG.meleeRange) {
            isAttacking = true;
            if (e.attackTimer <= 0) {
              e.attackTimer = BATTLE_CONFIG.attackCooldownMs;
              const currentWave = WAVES[st.wave] || WAVES[WAVES.length - 1];
              const wallDmg = Math.round(BATTLE_CONFIG.wallDamage * currentWave.damageMultiplier);
              st.wallHp -= wallDmg;
              addDamageText(st, e.x, height - 10, wallDmg.toString(), '#ff0000');
            }
          }
        }
      }

      // Movement & Separation
      let vx = 0;
      let vy = 0;

      if (!isAttacking) {
        const dx = targetX - e.x;
        const dy = targetY - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        
        // Prevent jittering when reached idle target
        if (speedMult < 1 && dist < 5) {
          vx = 0;
          vy = 0;
        } else {
          vx = (dx / dist) * BATTLE_CONFIG.moveSpeed * speedMult;
          vy = (dy / dist) * BATTLE_CONFIG.moveSpeed * speedMult;
        }
      }

      // Separation force
      for (let j = 0; j < st.entities.length; j++) {
        if (i === j) continue;
        const other = st.entities[j];
        if (other.hp <= 0) continue;
        const dx = e.x - other.x;
        const dy = e.y - other.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < BATTLE_CONFIG.separationRadius && dist > 0) {
          const force = (BATTLE_CONFIG.separationRadius - dist) / BATTLE_CONFIG.separationRadius;
          vx += (dx / dist) * force * BATTLE_CONFIG.separationForce;
          vy += (dy / dist) * force * BATTLE_CONFIG.separationForce;
        }
      }

      // Apply
      e.x += vx * dt;
      e.y += vy * dt;
      
      // Bounds
      e.x = Math.max(10, Math.min(width - 10, e.x));
    }

    // Cleanup dead entities
    st.entities = st.entities.filter(e => e.hp > 0 && e.y > -100);

    // Update Projectiles
    for (let i = st.projectiles.length - 1; i >= 0; i--) {
      const p = st.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Check collision with target
      const target = st.entities.find(e => e.id === p.targetId);
      if (target && target.hp > 0) {
        const dist = Math.sqrt((target.x - p.x)**2 + (target.y - p.y)**2);
        if (dist < 15) {
          target.hp -= p.damage;
          addDamageText(st, target.x, target.y - 20, p.damage.toString(), WARRIOR_HEX_COLORS[p.colorIdx]);
          st.projectiles.splice(i, 1);
          continue;
        }
      } else {
         if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
             st.projectiles.splice(i, 1);
         }
      }
    }

    // Update Damage Texts
    for (let i = st.damageTexts.length - 1; i >= 0; i--) {
      const d = st.damageTexts[i];
      d.life -= dt;
      d.y -= 20 * dt; // Float up
      if (d.life <= 0) {
        st.damageTexts.splice(i, 1);
      }
    }
    
    if (st.wallHp < 0) st.wallHp = 0;
  };

  const addDamageText = (st: BattleState, x: number, y: number, text: string, color: string) => {
    st.damageTexts.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      life: 1.0,
      maxLife: 1.0,
      color,
    });
  };

  const wallHpPct = Math.max(0, state.wallHp / BATTLE_CONFIG.wallMaxHealth) * 100;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden border-b-4 border-neutral-700" ref={containerRef}>
      {/* Battle Area Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-800 to-neutral-900 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
          <span className="text-neutral-500 font-bold tracking-widest text-lg">BATTLE AREA</span>
          {state.waveDelayTimer > 0 && state.wave < WAVES.length && (
            <span className="text-white font-bold tracking-widest text-2xl mt-4 animate-pulse">
              WAVE {state.wave + 1}
            </span>
          )}
        </div>

        {/* Entities */}
        {state.entities.map(e => (
          <div 
            key={e.id}
            className="absolute -ml-6 -mt-8 w-12 h-16 flex flex-col items-center justify-end transition-transform duration-75"
            style={{ 
              left: e.x, 
              top: e.y,
              zIndex: Math.round(e.y) 
            }}
          >
            {e.faction === 'player' ? (
              <WarriorVisual colorIdx={e.colorIdx} className="w-full h-full mb-1 drop-shadow-md" />
            ) : (
              <EnemyVisual colorIdx={e.colorIdx} className="w-full h-full mb-1 drop-shadow-md" />
            )}
            
            {/* Class Icon */}
            <div className={`absolute -right-1 top-2 w-4 h-4 rounded-full border border-black/50 flex items-center justify-center text-[10px] bg-white/20 text-white font-bold drop-shadow-sm`}>
                {e.unitClass === 'melee' ? '⚔' : '⚚'}
            </div>

            {/* HP Bar */}
            <div className="absolute -bottom-2 w-8 h-1.5 bg-black/80 rounded-full overflow-hidden border border-neutral-700">
              <div 
                className="h-full bg-green-500 transition-all duration-200"
                style={{ width: `${(e.hp / e.maxHp) * 100}%` }}
              />
            </div>
          </div>
        ))}

        {/* Projectiles */}
        {state.projectiles.map(p => (
          <div 
            key={p.id}
            className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full ${WARRIOR_COLORS[p.colorIdx]} shadow-[0_0_8px_rgba(255,255,255,0.5)]`}
            style={{ left: p.x, top: p.y }}
          />
        ))}

        {/* Damage Texts */}
        {state.damageTexts.map(d => (
          <div
            key={d.id}
            className="absolute font-bold text-lg font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none"
            style={{
              left: d.x,
              top: d.y,
              color: d.color,
              opacity: d.life / d.maxLife,
              transform: 'translateX(-50%)'
            }}
          >
            {d.text}
          </div>
        ))}
      </div>

      {/* The Wall */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-neutral-950 border-t-4 border-neutral-700 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-30">
         <div className="absolute inset-0 flex items-center justify-center opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgoJPHJlY3Qgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz4KCTxwYXRoIGQ9Ik0wLDBMODw4Wk04LDBMMCw4WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] pointer-events-none" />
      </div>
      
      {/* Wave Indicator */}
      <div className="absolute top-2 left-4 z-40 bg-black/60 px-3 py-1 rounded-full border border-neutral-700 font-mono text-sm font-bold text-white shadow-md">
        WAVE {Math.min(state.wave + 1, WAVES.length)} / {WAVES.length}
      </div>

      {/* Wall Health Bar (Full Width) */}
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
