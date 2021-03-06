import { scaleUpDown, textScaleUp } from "./../../utility/tweens/text";
import { Combatant } from "./Combatant";
import { CombatContainer } from "./combat-grid/CombatContainer";
import {
  getRandomFloor,
  Directions,
  wait,
  getRandomCeil,
} from "../../utility/Utility";
import { PartyMember } from "./PartyMember";
import { CombatEvent } from "./combat-events/CombatEvent";
import { CombatInterface } from "./combat-ui/CombatInterface";
import { State } from "../../utility/state/State";
import { Enemy } from "./Enemy";
import {
  CombatEntity,
  Orientation,
  CombatActionTypes,
  CombatantType,
  Status,
  LootCrate,
} from "./CombatDataStructures";
import { EffectsRepository } from "../../data/repositories/EffectRepository";
import { TextFactory } from "../../utility/TextFactory";
import { AudioScene } from "../../scenes/audioScene";
import { WHITE } from "../../utility/Constants";
import { EnchantmentResolveType } from "../../data/repositories/CombatInfluencerRepository";
import {
  PostTurnEnchantment,
  PostAttackEnchantment,
} from "./combat-events/BuffEvents";
import { displayMessage } from "../../scenes/dialogScene";

export interface BattleState {
  flagsToFlip: number[];
  victorious: boolean;
}
export class Combat {
  private partyContainer: CombatContainer;
  private lootCrate: LootCrate;
  private enemyContainer: CombatContainer;
  private combatUI: CombatInterface;
  private combatEvents: CombatEvent[] = [];
  private partyMembers: CombatEntity[] = [];
  private enemies: CombatEntity[] = [];
  private currentPartyFocusIndex: number = -1;
  private state = State.getInstance();
  private victoryFlags: number[] = [];
  private effectsRepository: EffectsRepository;

  constructor(
    private scene: Phaser.Scene,
    party: CombatEntity[],
    enemies: CombatEntity[]
  ) {
    party.forEach((member) => {
      member.entity.setSprite(scene, Directions.right);
      this.partyMembers.push(member);
      this.applyStatus(this.partyMembers);
    });

    this.lootCrate = {
      itemIds: [],
      coin: 0,
      experiencePoints: 0,
    };

    enemies.forEach((enemy) => {
      enemy.entity.setSprite(scene, Directions.left);
      this.enemies.push(enemy);
      const enemyEntity = <Enemy>enemy.entity;
      if (enemyEntity.flagsWhenDefeated) {
        this.victoryFlags = [
          ...this.victoryFlags,
          ...enemyEntity.flagsWhenDefeated,
        ];
      }
    });

    this.addAndPopulateContainers();
    setTimeout(() => {
      this.displayInputControlsForCurrentPartyMember();
    }, 1000);

    this.scene.events.on("run-battle", async () => {
      //TODO: Make this a utility function
      const partySpeed = this.partyMembers.reduce((acc, o) => {
        acc = o.entity.getSpeed();
        return acc;
      }, 0);
      const enemySpeed = this.enemies.reduce((acc, o) => {
        acc = o.entity.getSpeed();
        return acc;
      }, 0);
      const rand100 = getRandomCeil(100);
      const partyFaster = partySpeed > enemySpeed;
      if (20 + (partyFaster ? 40 : 0) > rand100) {
        await displayMessage(
          ["Escaped Successfully"],
          this.scene.game,
          this.scene.scene
        );
        this.scene.events.emit("end-battle", {
          victorious: false,
          flagsToFlip: null,
        });
      } else {
        await displayMessage(
          ["Couldn't escape!"],
          this.scene.game,
          this.scene.scene
        );
        this.applyEnemyTurnsAndStartLoop();
      }
    });

    this.effectsRepository = new EffectsRepository(this.scene.game);
  }

  private applyStatus(partyMembers) {
    partyMembers.forEach((p) => {
      const fainted = p.entity.status.has(Status.fainted);
      if (fainted) {
        p.entity.handleFaint();
      }
    });
  }

  private setListenersOnUI() {
    this.combatUI.events.on("option-selected", (event) => {
      this.addEvent(event);
      this.confirmSelection();
    });
    this.combatUI.events.on("character-incapacitated", () => {
      this.confirmSelection();
    });
  }

  public focusPreviousPartyInput(): boolean {
    return this.focusPartyInput(Directions.left);
  }

  public focusNextPartyInput(): boolean {
    return this.focusPartyInput(Directions.right);
  }

  private focusPartyInput(direction: Directions): boolean {
    const count = this.partyMembers.length;
    const previous = direction === Directions.left;

    let tempIndex = previous
      ? this.currentPartyFocusIndex - 1
      : this.currentPartyFocusIndex + 1;

    while (previous ? tempIndex > 0 : tempIndex < count) {
      const partyMember = <PartyMember>this.partyMembers[tempIndex].entity;
      if (this.partyMemberHasImobileStatus(partyMember)) {
        previous ? tempIndex-- : tempIndex++;
      } else {
        this.currentPartyFocusIndex = tempIndex;
        previous ? this.combatEvents.pop() : null;
        return true;
      }
      //TODO: If we have no party members, the battle should end...
    }
  }

  private partyMemberHasImobileStatus(partyMember: PartyMember) {
    return (
      partyMember.status.has(Status.fainted) ||
      partyMember.status.has(Status.confused) ||
      partyMember.status.has(Status.paralyzed)
    );
  }

  private teardownInputUI() {
    this.combatUI.destroyContainer();
  }

  private constructInputUI(partyMember: PartyMember) {
    this.combatUI = new CombatInterface(
      this.scene,
      "dialog-white",
      this.enemyContainer,
      this.partyContainer
    );
    this.combatUI.create(partyMember);
    this.setListenersOnUI();
  }

  private addEvent(combatEvent) {
    this.combatEvents.push(combatEvent);
  }

  private async confirmSelection() {
    const hasNextInput = this.focusNextPartyInput();
    this.teardownInputUI();
    await wait(300);
    if (!hasNextInput) {
      this.applyEnemyTurnsAndStartLoop();
    } else {
      this.displayInputControlsForCurrentPartyMember();
    }
  }

  private applyEnemyTurnsAndStartLoop() {
    this.teardownInputUI();
    this.applyEnemyTurns();
    this.sortEventsBySpeed();
    this.startLoop();
    this.resetPartyFocusIndex();
  }

  private applyEnemyTurns() {
    this.enemies.forEach((enemy) => {
      //TODO: In here we would query the enemy's behavior script, and check the state of the battlefield before making a decision for what to do.  For now, we attack;
      const randomPartyMember = this.getRandomAttackablePartyMember();

      this.addEvent(
        new CombatEvent(
          enemy.entity,
          [randomPartyMember.entity],
          CombatActionTypes.attack,
          Orientation.right,
          this.scene
        )
      );
    });
  }

  private getRandomAttackablePartyMember() {
    const targetablePartyMembers = this.partyMembers.filter(
      (partyMember) => !partyMember.entity.status.has(Status.fainted)
    );
    return targetablePartyMembers[
      getRandomFloor(targetablePartyMembers.length)
    ];
  }

  public sortEventsBySpeed() {
    this.combatEvents.sort((a, b) => {
      return a.executor.dexterity - b.executor.dexterity;
    });
  }

  private displayInputControlsForCurrentPartyMember() {
    // if this is the first selection.
    if (this.currentPartyFocusIndex < 0) {
      this.focusNextPartyInput();
    }
    const partyMemberEntity =
      this.getCurrentPartyMember() &&
      <PartyMember>this.getCurrentPartyMember().entity;
    partyMemberEntity && this.constructInputUI(partyMemberEntity);
    this.combatUI.initialize();
  }

  private getCurrentPartyMember() {
    const partyMember = this.partyMembers[this.currentPartyFocusIndex];
    return partyMember;
  }

  private async resolvePostTurnEnchantments() {
    const actions = [];
    [...this.partyMembers, ...this.enemies].forEach((p) => {
      if (p.entity.status.has(Status.fainted)) {
        return;
      }
      const buffs = p.entity.getBuffs();
      buffs.forEach((b) => {
        b.enchantments.forEach(async (e) => {
          if (e.type === EnchantmentResolveType.postTurn) {
            const pte = new PostTurnEnchantment(
              p.entity,
              p.entity
                .getParty()
                .getMembers()
                .map((m) => m.entity),
              e,
              Orientation.left,
              this.scene
            );
            actions.push(pte.executeAction());
          }
        });
      });
    });
    await Promise.all(actions);
    await this.updateCombatGrids();
  }

  private resolvePostAttackEnchantments(
    enchanted: Combatant,
    target: Combatant
  ) {
    const actions = [];
    enchanted &&
      enchanted.getBuffs().forEach((b) => {
        b.enchantments.forEach(async (e) => {
          if (e.type === EnchantmentResolveType.postAttack) {
            const pae = new PostAttackEnchantment(
              enchanted,
              target,
              e,
              enchanted.getOrientation(),
              this.scene
            );
            actions.push(pae.executeAction());
          }
        });
      });
    return new Promise(async (resolve) => {
      const r = await Promise.all(actions);
      resolve(...r);
    });
  }

  private async checkBothPartiesForDeath() {
    return new Promise(async (resolve) => {
      await this.resolveTargetDeaths(this.partyMembers.map((m) => m.entity));
      await this.resolveTargetDeaths(this.enemies.map((m) => m.entity));
      resolve();
    });
  }

  /**
   * Resolve target actions.
   */
  private async startLoop() {
    //TODO: This can be cleaned up and polished.  A little bit of repeated code here
    /** The end of the loop */
    if (!this.combatEvents.length && this.enemies.length) {
      await this.resolvePostTurnEnchantments();
      await this.checkBothPartiesForDeath();

      /** If enemies happen to die by enchantments */
      if (!this.enemies.length) {
        return this.handleBattleEnd();
      }

      const partyBuffDissipateMessages = this.partyMembers.reduce((acc, p) => {
        acc.push(...p.entity.tickBuffs());
        return acc;
      }, []);
      const enemyBuffDissipateMessages = this.enemies.reduce((acc, p) => {
        acc.push(...p.entity.tickBuffs());
        return acc;
      }, []);
      [...partyBuffDissipateMessages, ...enemyBuffDissipateMessages].forEach(
        async (m) => {
          await displayMessage(m, this.scene.game, this.scene.scene);
        }
      );

      // Send control back to user for next round of inputs.
      this.displayInputControlsForCurrentPartyMember();
      return false;
    }

    const combatEvent = this.combatEvents.pop();
    const results = await combatEvent.executeAction();
    await Promise.all(
      results
        .filter((r) => r.actionType === CombatActionTypes.attack)
        .map(async (r) => {
          return this.resolvePostAttackEnchantments(r.executor, r.target);
        })
    );
    await this.updateCombatGrids();
    await this.checkBothPartiesForDeath();
    if (!this.enemies.length) {
      return this.handleBattleEnd();
    }
    // Handle failures
    const failures = results.filter(
      (r) => r.actionType === CombatActionTypes.failure
    );

    if (failures.length > 0) {
      const messages = failures.map((f) => f.message).filter((f) => Boolean(f));
      if (messages.length) {
        await Promise.all(
          messages.map((f) =>
            displayMessage(f, this.scene.game, this.scene.scene)
          )
        );
      }
    }
    if (combatEvent.type === CombatActionTypes.useItem) {
      await Promise.all(
        results.map((r) =>
          displayMessage(r.message, this.scene.game, this.scene.scene)
        )
      );
    }
    if (combatEvent.type === CombatActionTypes.defend) {
      await Promise.all(
        results.map((r) =>
          displayMessage(r.message, this.scene.game, this.scene.scene)
        )
      );
    }
    /** No more enemies left */
    if (this.enemies.length <= 0) {
      return this.handleBattleEnd();
    }
    this.startLoop();
  }

  private clearNonPersistentBuffs() {
    this.enemies.forEach((e) => e.entity.clearNonPersistentBuffs());
    this.partyMembers.forEach((e) => e.entity.clearNonPersistentBuffs());
  }

  private async handleBattleEnd() {
    const audio = <AudioScene>this.scene.scene.get("Audio");
    this.clearNonPersistentBuffs();
    audio.stop(this.scene["music"]);
    audio.playSound("victory");

    await displayMessage(["You've won!"], this.scene.game, this.scene.scene);
    await this.distributeLoot();
    return this.scene.events.emit("end-battle", {
      victorious: true,
      flagsToFlip: this.victoryFlags,
    });
  }

  private updateCombatGrids(): Promise<any> {
    return new Promise((resolve) => {
      this.scene.events.once("finish-update-combat-grids", () => {
        resolve();
      });
      this.scene.events.emit("update-combat-grids", this.scene);
    });
  }

  /**
   * Play death animations and sounds, reward coins and experience and items
   * @param target
   */
  private async resolveTargetDeath(target) {
    return new Promise(async (resolve) => {
      if (target && target.currentHp === 0) {
        if (target.type === CombatantType.enemy) {
          const container = target.getSprite().parentContainer;
          const cel = this.enemyContainer.getCombatCelByCombatant(target);
          const deathAnimation = async () => {
            return new Promise((resolve) => {
              const sprite = target.getSprite();
              scaleUpDown(sprite, this.scene, async () => {
                const audio = <AudioScene>this.scene.scene.get("Audio");
                audio.playSound("kill", 0.1);

                const hitEffect = this.effectsRepository.getById(3);
                await hitEffect.play(
                  sprite.x,
                  sprite.y,
                  this.scene,
                  sprite.parentContainer
                );

                resolve();
                cel.destroyEnemy();
              }).play();
            });
          };

          await deathAnimation();
          await this.lootEnemy(target, container);

          const index = this.enemies.findIndex(
            (enemy) => enemy.entity.uid === target.uid
          );
          if (index > -1) {
            this.enemies.splice(index, 1);
          }
        } else if (target.type === CombatantType.partyMember) {
          target.handleFaint();
          await displayMessage(
            [`${target.name} has fainted!`],
            this.scene.game,
            this.scene.scene
          );

          if (
            this.partyMembers.every((partyMember) =>
              partyMember.entity.status.has(Status.fainted)
            )
          ) {
            await displayMessage(
              ["Your party has been defeated..."],
              this.scene.game,
              this.scene.scene
            );
            this.scene.events.emit("game-over");
          }
        }
      }
      resolve();
    });
  }

  private async resolveTargetDeaths(targets: Combatant[]) {
    await Promise.all(
      targets.map(async (t, i) => {
        await wait(150 * i);
        return this.resolveTargetDeath(t);
      })
    );
  }

  private async lootEnemy(target: any, container: any) {
    const tf = new TextFactory(this.scene);
    const sprite = target.getSprite();

    this.lootCrate.coin += target.goldValue;
    // ===================================
    // Coins
    // ===================================
    // const coinScaleUp = () => {
    //   const coinText = tf.createText(`${target.goldValue} coins`, { x: sprite.x, y: sprite.y }, '32px', {
    //     fill: WHITE
    //   });
    //   this.scene.sound.play('coin', { volume: .4 })

    //   container.add(coinText);
    //   return new Promise((resolve) => {
    //     textScaleUp(coinText,0, -120, this.scene, () => {
    //       resolve();
    //     }).play();
    //   });
    // }
    // coinScaleUp()

    // ===================================
    // items
    // ===================================

    target.lootTable.forEach((itemObject) => {
      const roll = Math.random();
      const winningRoll = roll < itemObject.rate;
      if (winningRoll) {
        this.lootCrate.itemIds.push(itemObject.itemId);
      }
    });

    // ===================================
    // experience
    // ===================================
    const xp = Math.ceil(target.experiencePoints * (target.level / 2 + 1));
    this.lootCrate.experiencePoints += xp;

    const expScaleUp = () => {
      const experienceText = tf.createText(
        `${xp}xp`,
        { x: sprite.x, y: sprite.y },
        "32px",
        {
          fill: WHITE.str,
        }
      );
      container.add(experienceText);
      return new Promise((resolve) => {
        textScaleUp(experienceText, 0, -80, this.scene, () => {
          resolve();
        }).play();
      });
    };
    await expScaleUp();
  }

  private async distributeExperience(experience) {
    return new Promise(async (resolve) => {
      const messages = [];
      this.partyMembers.forEach((partyMember) => {
        const partyEntity = <PartyMember>partyMember.entity;
        if (partyEntity.currentHp > 0) {
          const hasLeveledUp = partyEntity.gainExperience(experience);
          if (hasLeveledUp) {
            const audio = <AudioScene>this.scene.scene.get("Audio");
            audio.playSound("level-up", 0.1);
            messages.push(
              `${partyEntity.name} has reached level ${partyEntity.level}`
            );
          }
        }
      });
      if (messages.length) {
        await displayMessage(messages, this.scene.game, this.scene.scene);
      }
      resolve();
    });
  }

  private async distributeLoot() {
    const itemMessages = this.handleItemDistribution();
    await displayMessage(
      [`Each member receives ${this.lootCrate.experiencePoints} XP.`],
      this.scene.game,
      this.scene.scene
    );
    await this.distributeExperience(this.lootCrate.experiencePoints);
    State.getInstance().playerContents.addCoins(this.lootCrate.coin);
    await displayMessage(
      [...itemMessages, `The party receives ${this.lootCrate.coin} coins.`],
      this.scene.game,
      this.scene.scene
    );
  }

  private handleItemDistribution(): string[] {
    const items = this.lootCrate.itemIds.map((id) =>
      this.state.addItemToContents(id)
    );
    if (!items.length) {
      return [];
    }
    const itemObjects: any = items.reduce((acc, item) => {
      if (acc.hasOwnProperty(item.id)) {
        acc[item.id].amount += 1;
      } else {
        acc[item.id] = {};
        acc[item.id].name = item.name;
        acc[item.id].amount = 1;
      }
      return acc;
    }, {});
    return Object.keys(itemObjects).map(
      (key) =>
        `Received ${itemObjects[key].amount} ${itemObjects[key].name}${
          itemObjects[key].amount > 1 ? "s" : ""
        }. `
    );
  }

  private resetPartyFocusIndex() {
    this.currentPartyFocusIndex = -1;
  }

  public addAndPopulateContainers() {
    this.partyContainer = new CombatContainer(
      { x: 1, y: 3 },
      this.scene,
      this.partyMembers
    );
    this.enemyContainer = new CombatContainer(
      { x: 7, y: 3 },
      this.scene,
      this.enemies
    );

    this.scene.add.existing(this.partyContainer);
    this.scene.add.existing(this.enemyContainer);

    this.partyContainer.populateContainer();
    this.enemyContainer.populateContainer();
  }

  public handleMessagesClose() {
    throw new Error("Not Yet Implemented");
  }
}
