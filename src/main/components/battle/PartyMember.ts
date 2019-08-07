import { Combatant } from "./Combatant";
import { CombatantType } from "./CombatDataStructures";

export class PartyMember extends Combatant {
  private experienceCurve: number = 1.2;
  public setExperienceCurve(newCurve) {
    this.experienceCurve = newCurve;
  }
  constructor(
    id,
    name,
    spriteKey,
    maxHp,
    maxMp,
    level,
    intellect,
    dexterity,
    strength,
    wisdom,
    stamina,
    physicalResist,
    magicalResist,
    public combatClass: CombatClass,
    public currentExperience,
    public toNextLevel,
    spells?) {
    super(
      id,
      name,
      spriteKey,
      maxHp,
      maxMp,
      level,
      intellect,
      dexterity,
      strength,
      wisdom,
      stamina,
      physicalResist,
      magicalResist,
      spells);
    this.type = CombatantType.partyMember;

  }

  public levelUp() {
    this.level += 1;
  }

  public getExperienceToNextLevel() {
    return this.toNextLevel * this.level * this.experienceCurve;
  }

  public getAttackPower() {
    //TODO: Factor in equipment as well, and factor in a modifier.
    return this.modified('strength');
  }
  public getMagicPower() {
    return this.modified('intellect');
  }
  public getDefensePower() {
    return this.modified('stamina');
  }
  public getSpeed() {
    return this.modified('dexterity');
  }

  public getCritChance() {
    return this.modified('dexterity') * .01;
  }

  private levelModifier() {
    return 1 + this.level / 5;
  }

  /**
   * the modified getters take the party member's class into consideration
   */
  private modified(baseStat) {
    if (!this[baseStat]) {
      throw new Error(`Base state ${baseStat} does not exist on ${this.name}`)
    }
    return this[baseStat] * this.combatClass[baseStat] * this.levelModifier();
  }

  // ===================================
  // Leveling up
  // ===================================
  /**
   * Returns true if leveled up;
   * @param partyMember The party member to gain experience
   * @param experiencePoints Experience points to apply to party member
   */
  public gainExperience(experiencePoints: number) {
    const total = this.currentExperience + experiencePoints;
    const overFlow = total - this.toNextLevel * this.level;
    if (total > this.getExperienceToNextLevel()) {
      this.levelUp();
      this.currentExperience = overFlow;
      return true;
    }
    this.currentExperience = total;
    return false
  }
}

export interface CombatClass {
  name: string,
  id: number,
  maxHp: number
  maxMp: number
  intellect: number
  dexterity: number
  wisdom: number
  stamina: number
  strength: number
  physicalResist: number
  magicalResist: number
}