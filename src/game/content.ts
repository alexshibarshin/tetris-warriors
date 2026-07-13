export type WarriorId = 'red-cleaver' | 'blue-hunter' | 'green-rogue' | 'yellow-mage' | 'purple-warden';
export type CombatClass = 'fighter' | 'rogue' | 'archer' | 'mage';
export type PerkId =
  | 'iron-step' | 'blood-harvest' | 'wide-swing' | 'heavy-axe' | 'meat-grinder' | 'duel-rage'
  | 'ice-trap' | 'split-arrow' | 'shatter' | 'ice-burst' | 'deep-cold' | 'shard-volley'
  | 'shadow-dash' | 'smoke-screen' | 'rot-poison' | 'contagion' | 'execution' | 'epidemic'
  | 'wide-arc' | 'return-arc' | 'split-lightning' | 'thunder-stun' | 'perfect-storm' | 'overload'
  | 'void-anchor' | 'shared-ward' | 'mass-taunt' | 'duel-taunt' | 'eternal-bastion' | 'challenge-mark';

export type PerkDefinition = {
  id: PerkId;
  tier: 2 | 3 | 4;
  title: string;
  cardText: string;
  description: string;
  details: string;
};

export type WarriorDefinition = {
  id: WarriorId;
  name: string;
  role: string;
  combatClass: CombatClass;
  unitClass: 'melee' | 'ranged';
  colorIdx: number;
  baseHp: number;
  baseDamage: number;
  passiveTitle: string;
  passiveText: string;
  perks: PerkDefinition[];
};

export const WARRIORS: WarriorDefinition[] = [
  {
    id: 'red-cleaver', name: 'Красный Рубака', role: 'Боец • Орда', combatClass: 'fighter', unitClass: 'melee',
    colorIdx: 0, baseHp: 44, baseDamage: 14, passiveTitle: 'В гуще',
    passiveText: 'Атакует на 50% быстрее, когда рядом 3 врага.',
    perks: [
      { id: 'iron-step', tier: 2, title: 'Железная поступь', cardText: 'Нельзя оттолкнуть.', description: 'Рубаку больше нельзя оттолкнуть или сдвинуть вражескими эффектами.', details: 'Полный иммунитет ко всем эффектам принудительного перемещения, включая Портал Бури.' },
      { id: 'blood-harvest', tier: 2, title: 'Кровавая жатва', cardText: 'Убийство лечит 10% здоровья.', description: 'Каждое убийство восстанавливает Рубаке 10% максимального здоровья.', details: 'Лечение получает только сам Рубака. Оно срабатывает сразу при убийстве — до посмертного взрыва врага.' },
      { id: 'wide-swing', tier: 3, title: 'Широкий замах', cardText: 'Каждый 3-й удар бьёт по области.', description: 'Каждый третий удар Рубаки также ранит всех врагов рядом с ним.', details: 'Основная цель получает обычный урон. Остальные враги в ближнем радиусе получают 70% урона удара.' },
      { id: 'heavy-axe', tier: 3, title: 'Тяжёлый топор', cardText: 'В 2 раза медленнее. 220% урона.', description: 'Рубака атакует вдвое медленнее, но каждый удар наносит 220% обычного урона.', details: 'Меняет все обычные атаки. Высокий разовый урон особенно эффективен против брони и лечения.' },
      { id: 'meat-grinder', tier: 4, title: 'Мясорубка', cardText: 'В Ярости все удары бьют по области.', description: 'Пока Рубака окружён и действует «В гуще», каждый его удар ранит врагов вокруг.', details: 'Требуются минимум 3 врага рядом. Основная цель получает обычный урон, остальные — 60% урона удара.' },
      { id: 'duel-rage', tier: 4, title: 'Дуэльная ярость', cardText: '3 удара в одну цель удваивают урон.', description: 'После трёх ударов подряд по одной цели Рубака начинает наносить ей двойной урон.', details: 'Усиление действует с третьего удара включительно и сохраняется, пока Рубака не сменит цель.' },
    ],
  },
  {
    id: 'blue-hunter', name: 'Морозный Охотник', role: 'Лучник • Контроль', combatClass: 'archer', unitClass: 'ranged',
    colorIdx: 1, baseHp: 30, baseDamage: 12, passiveTitle: 'Морозная метка',
    passiveText: '3-я стрела в одну цель замораживает её.',
    perks: [
      { id: 'ice-trap', tier: 2, title: 'Ледяная ловушка', cardText: 'Замораживает приблизившегося врага.', description: 'Когда враг подходит близко к Охотнику, тот автоматически замораживает его на 2 секунды.', details: 'Выбирает ближайшего врага в увеличенном радиусе ближнего боя. Перезарядка ловушки — 8 секунд.' },
      { id: 'split-arrow', tier: 2, title: 'Раздвоенная стрела', cardText: 'Каждый выстрел выпускает 2 стрелы.', description: 'Каждый выстрел выпускает в одну цель две стрелы вместо одной.', details: 'Стрелы наносят 70% и 40% обычного урона. Каждая отдельно сбивает одноударный щит и засчитывается для Морозной метки.' },
      { id: 'shatter', tier: 3, title: 'Раскол', cardText: 'Замороженная цель получает +30% урона.', description: 'Пока враг заморожен Охотником, он получает на 30% больше урона от всех союзников.', details: 'Бонус применяется ко всему входящему урону только во время заморозки, наложенной этим Охотником.' },
      { id: 'ice-burst', tier: 3, title: 'Ледяной взрыв', cardText: 'Смерть замороженного врага морозит соседей.', description: 'Если замороженный враг погибает, ледяной взрыв замораживает врагов рядом с ним.', details: 'Взрыв выбирает до 3 ближайших врагов в радиусе 90 и замораживает каждого на 0,8 секунды.' },
      { id: 'deep-cold', tier: 4, title: 'Глубокий холод', cardText: 'Заморозка срабатывает за 2 стрелы.', description: 'Морозная метка теперь замораживает цель после двух попаданий вместо трёх.', details: 'Счётчик по-прежнему сбрасывается при смене цели. Длительность заморозки — 1 секунда.' },
      { id: 'shard-volley', tier: 4, title: 'Осколочный залп', cardText: 'Заморозка выпускает осколки по соседям.', description: 'Каждая заморозка выпускает ледяные осколки по врагам рядом с целью.', details: 'До 3 соседних врагов в радиусе 90 получают по 60% базового урона стрелы.' },
    ],
  },
  {
    id: 'green-rogue', name: 'Ядовитый Клинок', role: 'Рога • Яд', combatClass: 'rogue', unitClass: 'melee',
    colorIdx: 2, baseHp: 32, baseDamage: 13, passiveTitle: 'Яд',
    passiveText: 'Удары накладывают до 5 стаков Яда.',
    perks: [
      { id: 'shadow-dash', tier: 2, title: 'Теневой рывок', cardText: 'После убийства прыгает к новой цели.', description: 'После убийства Клинок мгновенно перемещается к следующему врагу и усиливает первый удар.', details: 'Выбирает ближайшего живого врага. Первый удар после рывка наносит 150% обычного урона.' },
      { id: 'smoke-screen', tier: 2, title: 'Дымовая завеса', cardText: 'После убийства получает щит 25%.', description: 'После каждого убийства Клинок получает временный щит на 25% максимального здоровья.', details: 'Щит действует 3 секунды. Новое убийство восстанавливает его объём и обновляет длительность.' },
      { id: 'rot-poison', tier: 3, title: 'Гнилостный яд', cardText: 'Яд вдвое снижает лечение.', description: 'Отравленные враги получают вдвое меньше лечения от любых источников.', details: 'Снижение лечения составляет 50% и действует, пока на цели остаётся хотя бы 1 стак Яда.' },
      { id: 'contagion', tier: 3, title: 'Заражение', cardText: 'После смерти Яд переходит следующей цели.', description: 'После смерти отравленного врага весь его Яд переходит на ближайшего живого врага.', details: 'Переносятся все стаки, оставшаяся длительность и текущий урон Яда.' },
      { id: 'execution', tier: 4, title: 'Казнь', cardText: '5 стаков превращаются в удар 350%.', description: 'Атака по врагу с 5 стаками Яда наносит 350% обычного урона.', details: 'Усиление применяется к прямому удару и после него поглощает все 5 стаков Яда.' },
      { id: 'epidemic', tier: 4, title: 'Эпидемия', cardText: '5 стаков заражают 3 врагов рядом.', description: 'Когда цель впервые получает 5 стаков Яда, она заражает до трёх соседних врагов.', details: 'Каждый сосед в радиусе 95 получает по 3 стака Яда на 4 секунды. На одной цели срабатывает один раз.' },
    ],
  },
  {
    id: 'yellow-mage', name: 'Грозовой Маг', role: 'Маг • Цепи', combatClass: 'mage', unitClass: 'ranged',
    colorIdx: 3, baseHp: 28, baseDamage: 11, passiveTitle: 'Цепная молния',
    passiveText: 'Молния перескакивает по 3 близким врагам.',
    perks: [
      { id: 'wide-arc', tier: 2, title: 'Широкая дуга', cardText: 'Молния прыгает ещё по 2 врагам.', description: 'Цепная молния может перескочить ещё на двух врагов и поразить до пяти целей.', details: 'Четвёртая и пятая цели получают 30% и 20% обычного урона, если не выбран перк «Идеальная буря».' },
      { id: 'return-arc', tier: 2, title: 'Возвратная дуга', cardText: 'Молния возвращается в первую цель.', description: 'После всех прыжков молния возвращается в первую цель и ударяет её ещё раз.', details: 'Возвратный удар наносит первой цели дополнительные 60% обычного урона.' },
      { id: 'split-lightning', tier: 3, title: 'Раздвоенная молния', cardText: 'Каждое звено цепи ударяет дважды.', description: 'Каждая цель Цепной молнии получает два отдельных удара вместо одного.', details: 'Каждый удар наносит 60% положенного этой цели урона: суммарно 120%. Удары отдельно сбивают одноударные щиты.' },
      { id: 'thunder-stun', tier: 3, title: 'Громовой паралич', cardText: 'Последняя цель оглушается.', description: 'Последний враг в цепи молнии оглушается и временно перестаёт двигаться и атаковать.', details: 'Оглушение длится 1,5 секунды. Если молния поразила одну цель, оглушается она.' },
      { id: 'perfect-storm', tier: 4, title: 'Идеальная буря', cardText: 'Прыжки больше не теряют урон.', description: 'Все цели Цепной молнии получают полный урон без ослабления после каждого прыжка.', details: 'Каждое звено цепи наносит 100% обычного урона вместо базовых 100% / 70% / 40% / 30% / 20%.' },
      { id: 'overload', tier: 4, title: 'Перегрузка', cardText: 'Каждый 3-й каст наносит мощный удар.', description: 'Каждое третье заклинание наносит первой цели мощный дополнительный удар.', details: 'Дополнительный удар наносит 200% обычного урона сверх основного попадания.' },
    ],
  },
  {
    id: 'purple-warden', name: 'Страж Бездны', role: 'Боец • Защита', combatClass: 'fighter', unitClass: 'melee',
    colorIdx: 4, baseHp: 52, baseDamage: 9, passiveTitle: 'Вызов Бездны',
    passiveText: 'Таунтит врагов и получает щит за каждого.',
    perks: [
      { id: 'void-anchor', tier: 2, title: 'Якорь Бездны', cardText: 'Под щитом нельзя оттолкнуть.', description: 'Пока у Стража есть щит, его нельзя оттолкнуть или сдвинуть вражескими эффектами.', details: 'Работает при любом ненулевом объёме щита, включая щит от Вызова Бездны.' },
      { id: 'shared-ward', tier: 2, title: 'Общий оберег', cardText: 'Даёт щиты 2 ближайшим союзникам.', description: 'Каждый Вызов Бездны также даёт временный щит двум ближайшим союзникам.', details: 'Каждый союзник получает щит на 15% своего максимального здоровья длительностью 4 секунды.' },
      { id: 'mass-taunt', tier: 3, title: 'Массовый вызов', cardText: 'Таунтит и щитится вдвое сильнее.', description: 'Вызов Бездны провоцирует вдвое больше врагов и позволяет накопить вдвое больше щита.', details: 'Провоцирует до 8 врагов вместо 4. Максимальный щит увеличивается с 32% до 64% здоровья Стража.' },
      { id: 'duel-taunt', tier: 3, title: 'Личный вызов', cardText: 'Таунтит сильнейшего и получает щит 50%.', description: 'Вызов Бездны провоцирует только самого живучего врага, но сразу даёт Стражу большой щит.', details: 'Выбирает врага с самым большим максимальным здоровьем. Щит равен 50% максимального здоровья Стража.' },
      { id: 'eternal-bastion', tier: 4, title: 'Вечный бастион', cardText: 'Щит Вызова больше не исчезает сам.', description: 'Щит, полученный от Вызова Бездны, больше не пропадает со временем.', details: 'Щит остаётся, пока враги не разрушат его. Новые Вызовы пополняют щит до текущего максимума.' },
      { id: 'challenge-mark', tier: 4, title: 'Клеймо вызова', cardText: 'Спровоцированные враги получают +30% урона.', description: 'Враги, спровоцированные Стражем, получают на 30% больше урона от всех союзников.', details: 'Бонус действует только пока активна трёхсекундная провокация Стража.' },
    ],
  },
];

export const WARRIOR_BY_ID = Object.fromEntries(WARRIORS.map((warrior) => [warrior.id, warrior])) as Record<WarriorId, WarriorDefinition>;
export const PERK_BY_ID = Object.fromEntries(WARRIORS.flatMap((warrior) => warrior.perks).map((perk) => [perk.id, perk])) as Record<PerkId, PerkDefinition>;

export function getWarriorByColor(colorIdx: number) {
  return WARRIORS.find((warrior) => warrior.colorIdx === colorIdx) ?? WARRIORS[0];
}

export function hasPerk(perks: PerkId[] | undefined, perk: PerkId) {
  return perks?.includes(perk) ?? false;
}
