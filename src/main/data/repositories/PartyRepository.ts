import { Repository } from "./Repository";
import { Spell } from "../../components/battle/CombatDataStructures";

export class PartyRepository extends Repository<PartyMemberData> {
  constructor(game: Phaser.Game) {
    const partyMembers = game.cache.json.get('party-members')
    super(partyMembers);

  }
}

export interface PartyMemberData {
  id: number,
  name: string,
  spriteKey: string,
  maxHp: number,
  maxMp: number,
  level: number,
  intellect: number,
  dexterity: number,
  strength: number,
  wisdom: number,
  stamina: number,
  physicalResist: number,
  magicalResist: number,
  classId: number,
  currentExperience: number,
  toNextLevel: number,
}