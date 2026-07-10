import { PROGRESSION_CONFIG, WARRIOR_COLOR_NAMES } from '../config';
import { CellData } from './types';
import { UnitClass } from '../types';

export type UpgradeRarity = 'rare' | 'epic' | 'legendary';
export type UpgradeCard =
  | {
      id: string;
      type: 'tier';
      rarity: UpgradeRarity;
      colorIdx: number;
      targetTier: number;
      title: string;
      description: string;
      offerWeight: number;
    }
  | {
      id: string;
      type: 'wallHeal';
      rarity: UpgradeRarity;
      healFraction: number;
      title: string;
      description: string;
      offerWeight: number;
    }
  | {
      id: string;
      type: 'summonWarriors';
      rarity: UpgradeRarity;
      colorIdx: number;
      summonCount: number;
      title: string;
      description: string;
      offerWeight: number;
    };

export type PlayerDeckEntry = {
  colorIdx: number;
  name: string;
  unitClass: UnitClass;
  tier: number;
  spawnWeight: number;
};

export type PlayerBuildState = {
  deck: PlayerDeckEntry[];
};

export type UpgradeDraftContext = {
  playerBaseHp: number;
  playerBaseMaxHp: number;
};

export function createInitialPlayerBuild(): PlayerBuildState {
  return {
    deck: PROGRESSION_CONFIG.playerDeck.map((entry) => ({
      ...entry,
      tier: 1,
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

export function getBuildCombatScale(build: PlayerBuildState) {
  const totalWeight = build.deck.reduce((sum, entry) => sum + entry.spawnWeight, 0);

  if (totalWeight <= 0) {
    return 1;
  }

  // Unit combat value grows with both survivability and damage, so tier scaling is squared
  // and then averaged by the board spawn weights that shape the player's real composition.
  const weightedPower = build.deck.reduce((sum, entry) => {
    const multiplier = getTierStatMultiplier(entry.tier);
    return sum + entry.spawnWeight * multiplier * multiplier;
  }, 0);

  return weightedPower / totalWeight;
}

function getRarityForTargetTier(targetTier: number): UpgradeRarity {
  if (targetTier >= 4) {
    return 'legendary';
  }
  if (targetTier >= 3) {
    return 'epic';
  }
  return 'rare';
}

function getOfferWeightForRarity(rarity: UpgradeRarity) {
  return PROGRESSION_CONFIG.rarityOfferWeights[rarity];
}

function getTierScaledSummonOfferWeight(tier: number) {
  return (
    getOfferWeightForRarity('rare') *
    Math.pow(PROGRESSION_CONFIG.tierUpgradeSpawnWeightMultiplier, Math.max(0, tier - 1))
  );
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

  if (totalWeight <= 0) {
    return cards[Math.floor(Math.random() * cards.length)] ?? null;
  }

  let roll = Math.random() * totalWeight;

  for (const card of cards) {
    roll -= card.offerWeight;
    if (roll <= 0) {
      return card;
    }
  }

  return cards[cards.length - 1] ?? null;
}

export function pickWeightedDeckColor(build: PlayerBuildState) {
  const totalWeight = build.deck.reduce((sum, entry) => sum + entry.spawnWeight, 0);
  let roll = Math.random() * Math.max(1, totalWeight);

  for (const entry of build.deck) {
    roll -= entry.spawnWeight;
    if (roll <= 0) {
      return entry.colorIdx;
    }
  }

  return build.deck[build.deck.length - 1]?.colorIdx ?? 0;
}

export function generateUpgradeChoices(build: PlayerBuildState, context: UpgradeDraftContext) {
  const cards: UpgradeCard[] = [];

  for (const entry of build.deck) {
    if (entry.tier < PROGRESSION_CONFIG.maxTier) {
      const targetTier = entry.tier + 1;
      const rarity = getRarityForTargetTier(targetTier);
      cards.push({
        id: `tier-${entry.colorIdx}-${targetTier}`,
        type: 'tier',
        rarity,
        colorIdx: entry.colorIdx,
        targetTier,
        title: `${entry.name} Ascension`,
        description: `Raise all ${entry.name.toLowerCase()} warriors in your build to tier ${targetTier}.`,
        offerWeight: getOfferWeightForRarity(rarity),
      });
    }

    cards.push({
      id: `summon-${entry.colorIdx}`,
      type: 'summonWarriors',
      rarity: 'rare',
      colorIdx: entry.colorIdx,
      summonCount: PROGRESSION_CONFIG.summonWarriorsCardCount,
      title: `${entry.name} Reinforcements`,
      description: `Spawn ${PROGRESSION_CONFIG.summonWarriorsCardCount} ${entry.name.toLowerCase()} warriors on the board right now.`,
      offerWeight: getTierScaledSummonOfferWeight(entry.tier),
    });
  }

  const missingHpFraction = 1 - context.playerBaseHp / context.playerBaseMaxHp;
  if (missingHpFraction >= PROGRESSION_CONFIG.wallHealOfferMinMissingFraction) {
    cards.push({
      id: 'wall-heal',
      type: 'wallHeal',
      rarity: 'rare',
      healFraction: PROGRESSION_CONFIG.wallHealFraction,
      title: 'Emergency Masonry',
      description: 'Restore 25% of your gate health immediately.',
      offerWeight: 1,
    });
  }

  const pool = shuffleInPlace([...cards]);
  const chosen: UpgradeCard[] = [];

  while (chosen.length < 3 && pool.length > 0) {
    const picked = drawWeightedCard(pool);
    if (!picked) {
      break;
    }

    chosen.push(picked);
    const removeIndex = pool.findIndex((candidate) => candidate.id === picked.id);
    if (removeIndex >= 0) {
      pool.splice(removeIndex, 1);
    }
  }

  return chosen;
}

export function applyUpgradeCard(build: PlayerBuildState, card: UpgradeCard) {
  if (card.type === 'wallHeal' || card.type === 'summonWarriors') {
    return build;
  }

  return {
    deck: build.deck.map((entry) => {
      if (entry.colorIdx !== card.colorIdx) {
        return entry;
      }

      if (card.type === 'tier') {
        return {
          ...entry,
          tier: Math.max(entry.tier, card.targetTier),
          spawnWeight: entry.spawnWeight * PROGRESSION_CONFIG.tierUpgradeSpawnWeightMultiplier,
        };
      }
    }),
  };
}

export function applyTierUpgradeToBoard(board: CellData[][], build: PlayerBuildState, colorIdx: number) {
  const entry = getDeckEntry(build, colorIdx);

  return board.map((row) =>
    row.map((cell) => {
      if (cell.state !== 'ready' || cell.type !== 'warrior' || cell.colorIdx !== colorIdx) {
        return cell;
      }

      return {
        ...cell,
        tier: entry.tier,
      };
    }),
  );
}

export function getColorDisplayName(colorIdx: number) {
  return WARRIOR_COLOR_NAMES[colorIdx] ?? 'Unknown';
}
