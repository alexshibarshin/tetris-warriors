import { BATTLE_CONFIG, SPAWN_PHASES, WARRIOR_COLORS } from '../config';

export type StageTheme = {
  dominantColorIndices: number[];
};

function pickUniqueColor(excluded: number[]) {
  const available = Array.from({ length: WARRIOR_COLORS.length }, (_, index) => index).filter(
    (index) => !excluded.includes(index),
  );

  return available[Math.floor(Math.random() * available.length)] ?? 0;
}

export function createStageTheme(): StageTheme {
  const primary = Math.floor(Math.random() * WARRIOR_COLORS.length);
  const dominantColorIndices = [primary];

  if (Math.random() < BATTLE_CONFIG.challengeStageDualColorChance) {
    dominantColorIndices.push(pickUniqueColor(dominantColorIndices));
  }

  return { dominantColorIndices };
}

export function getNeutralEnemyShareForPhase(phaseIndex: number) {
  return (
    BATTLE_CONFIG.neutralEnemySharesByPhase[phaseIndex] ??
    BATTLE_CONFIG.neutralEnemySharesByPhase[BATTLE_CONFIG.neutralEnemySharesByPhase.length - 1]
  );
}

export function rollEnemyColor(theme: StageTheme, phaseIndex: number): number | null {
  const neutralShare = getNeutralEnemyShareForPhase(phaseIndex);

  if (Math.random() < neutralShare) {
    return null;
  }

  if (theme.dominantColorIndices.length === 1) {
    return theme.dominantColorIndices[0];
  }

  const [primary, secondary] = theme.dominantColorIndices;
  return Math.random() < BATTLE_CONFIG.challengePrimaryColorShare ? primary : secondary;
}

export function getStageThemeLabel(theme: StageTheme) {
  if (theme.dominantColorIndices.length === 1) {
    return 'Mono Surge';
  }

  return 'Twin Surge';
}

export function getPhaseCount() {
  return SPAWN_PHASES.length;
}
