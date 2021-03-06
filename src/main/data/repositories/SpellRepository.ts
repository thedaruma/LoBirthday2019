import { Repository } from "./Repository";
import { Effect } from "../../components/battle/CombatDataStructures";

export enum SpellType {
  restoration,
  attack,
  status,
  manaRecover,
  revive,
}

export enum TargetArea {
  single,
  all,
  row,
  column,
  self,
}

export enum Targeting {
  ally,
  enemy,
}

export type TargetType = {
  targeting: Targeting;
  targetArea: TargetArea;
};

export type SpellData = {
  id: number;
  name: string;
  animationEffect: number;
  primaryAnimationEffect: number;
  description: string;
  basePotency: number;
  type: SpellType;
  cost: number;
  targetType: TargetType;
  status: any[];
  appliedBuffs?: number[];
  message?: string;
  isSkill?:boolean;
};

export class SpellRepository extends Repository<SpellData> {
  constructor(game: Phaser.Game) {
    const effects = game.cache.json.get("spells");
    super(effects);
  }
}
