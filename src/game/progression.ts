import { PROGRESSION_CONFIG, WARRIOR_COLOR_NAMES } from '../config';
import { CellData } from './types';
import { CombatClass, PerkId, WARRIORS, WarriorId, WARRIOR_BY_ID } from './content';

export type UpgradeRarity = 'rare' | 'epic' | 'legendary';
export type UpgradeCard =
  | {
      id: string; type: 'tier'; rarity: UpgradeRarity; warriorId: WarriorId; perkId: PerkId;
      colorIdx: number; targetTier: 2 | 3 | 4; title: string; description: string; offerWeight: number;
    }
  | {
      id: string; type: 'wallHeal'; rarity: UpgradeRarity; healFraction: number;
      title: string; description: string; offerWeight: number;
    }
  | {
      id: string; type: 'summonWarriors'; rarity: UpgradeRarity; warriorId: WarriorId;
      colorIdx: number; summonCount: number; title: string; description: string; offerWeight: number;
    }
  | {
      id: string; type: 'spawnBooster'; rarity: UpgradeRarity; boosterCount: number;
      title: string; description: string; offerWeight: number;
    };

export type PlayerDeckEntry = {
  warriorId: WarriorId;
  colorIdx: number;
  name: string;
  combatClass: CombatClass;
  unitClass: 'melee' | 'ranged';
  tier: number;
  selectedPerks: PerkId[];
  spawnWeight: number;
};

export type PlayerBuildState = { deck: PlayerDeckEntry[] };
export type UpgradeDraftContext = { playerBaseHp: number; playerBaseMaxHp: number };

export function createInitialPlayerBuild(): PlayerBuildState {
  return {
    deck: WARRIORS.map((warrior) => ({
      warriorId: warrior.id,
      colorIdx: warrior.colorIdx,
      name: warrior.name,
      combatClass: warrior.combatClass,
      unitClass: warrior.unitClass,
      tier: 1,
      selectedPerks: [],
      spawnWeight: 1,
    })),
  };
}

export function getTierStatMultiplier(tier: number) {
  return 1 + (tier - 1) * PROGRESSION_CONFIG.tierStatBonusPerLevel;
}

export function getDeckEntry(build: PlayerBuildState, colorIdx: number) {
  return build.deck.find((entry) => entry.colorIdx === colorIdx) ?? build.deck[0];
}

export function getDeckEntryByWarrior(build: PlayerBuildState, warriorId: WarriorId) {
  return build.deck.find((entry) => entry.warriorId === warriorId) ?? build.deck[0];
}

export function getBuildCombatScale(build: PlayerBuildState) {
  const totalWeight = build.deck.reduce((sum, entry) => sum + entry.spawnWeight, 0);
  if (totalWeight <= 0) return 1;
  return build.deck.reduce((sum, entry) => {
    const multiplier = getTierStatMultiplier(entry.tier);
    return sum + entry.spawnWeight * multiplier * multiplier;
  }, 0) / totalWeight;
}

function getRarityForTargetTier(targetTier: number): UpgradeRarity {
  return targetTier >= 4 ? 'legendary' : targetTier >= 3 ? 'epic' : 'rare';
}

function getOfferWeightForRarity(rarity: UpgradeRarity) {
  return PROGRESSION_CONFIG.rarityOfferWeights[rarity];
}

function shuffleInPlace<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function drawWeightedCard(cards: UpgradeCard[]) {
  const totalWeight = cards.reduce((sum, card) => sum + card.offerWeight, 0);
  let roll = Math.random() * Math.max(totalWeight, 1);
  for (const card of cards) {
    roll -= card.offerWeight;
    if (roll <= 0) return card;
  }
  return cards[cards.length - 1] ?? null;
}

export function pickWeightedDeckColor(build: PlayerBuildState) {
  const totalWeight = build.deck.reduce((sum, entry) => sum + entry.spawnWeight, 0);
  let roll = Math.random() * Math.max(1, totalWeight);
  for (const entry of build.deck) {
    roll -= entry.spawnWeight;
    if (roll <= 0) return entry.colorIdx;
  }
  return build.deck[build.deck.length - 1]?.colorIdx ?? 0;
}

export function generateUpgradeChoices(build: PlayerBuildState, context: UpgradeDraftContext) {
  const cards: UpgradeCard[] = [];

  for (const entry of build.deck) {
    if (entry.tier < PROGRESSION_CONFIG.maxTier) {
      const targetTier = (entry.tier + 1) as 2 | 3 | 4;
      const rarity = getRarityForTargetTier(targetTier);
      const warrior = WARRIOR_BY_ID[entry.warriorId];
      for (const perk of warrior.perks.filter((candidate) => candidate.tier === targetTier)) {
        cards.push({
          id: `tier-${entry.warriorId}-${perk.id}`,
          type: 'tier', rarity, warriorId: entry.warriorId, perkId: perk.id,
          colorIdx: entry.colorIdx, targetTier, title: perk.title, description: perk.cardText,
          offerWeight: getOfferWeightForRarity(rarity),
        });
      }
    }

    cards.push({
      id: `summon-${entry.warriorId}`, type: 'summonWarriors', rarity: 'rare',
      warriorId: entry.warriorId, colorIdx: entry.colorIdx,
      summonCount: PROGRESSION_CONFIG.summonWarriorsCardCount,
      title: entry.name, description: `Добавить ${PROGRESSION_CONFIG.summonWarriorsCardCount} на доску.`,
      offerWeight: getOfferWeightForRarity('rare'),
    });
  }

  const missingHpFraction = 1 - context.playerBaseHp / context.playerBaseMaxHp;
  if (missingHpFraction >= PROGRESSION_CONFIG.wallHealOfferMinMissingFraction) {
    cards.push({
      id: 'wall-heal', type: 'wallHeal', rarity: 'rare', healFraction: PROGRESSION_CONFIG.wallHealFraction,
      title: 'Ремонт ворот', description: 'Восстановить 25% здоровья.', offerWeight: 1,
    });
  }
  cards.push({
    id: 'spawn-booster', type: 'spawnBooster', rarity: 'epic',
    boosterCount: PROGRESSION_CONFIG.boosterCardSpawnCount,
    title: 'Бустер', description: 'Добавить случайный бустер на доску.', offerWeight: getOfferWeightForRarity('epic') * 0.6,
  });

  const pool = shuffleInPlace([...cards]);
  const chosen: UpgradeCard[] = [];
  while (chosen.length < 3 && pool.length > 0) {
    const picked = drawWeightedCard(pool);
    if (!picked) break;
    chosen.push(picked);
    const index = pool.findIndex((candidate) => candidate.id === picked.id);
    if (index >= 0) pool.splice(index, 1);
  }
  return chosen;
}

export function applyUpgradeCard(build: PlayerBuildState, card: UpgradeCard): PlayerBuildState {
  if (card.type !== 'tier') return build;
  return {
    deck: build.deck.map((entry) => entry.warriorId !== card.warriorId ? entry : ({
      ...entry,
      tier: Math.max(entry.tier, card.targetTier),
      selectedPerks: entry.selectedPerks.includes(card.perkId) ? entry.selectedPerks : [...entry.selectedPerks, card.perkId],
      spawnWeight: entry.spawnWeight * PROGRESSION_CONFIG.tierUpgradeSpawnWeightMultiplier,
    })),
  };
}

export function applyTierUpgradeToBoard(board: CellData[][], build: PlayerBuildState, warriorId: WarriorId) {
  const entry = getDeckEntryByWarrior(build, warriorId);
  return board.map((row) => row.map((cell) => {
    if (cell.state !== 'ready' || cell.type !== 'warrior' || cell.warriorId !== warriorId) return cell;
    return { ...cell, tier: entry.tier };
  }));
}

export function getColorDisplayName(colorIdx: number) {
  return WARRIOR_COLOR_NAMES[colorIdx] ?? 'Unknown';
}
