import { Item } from '../Items/Item';
import { itMonster } from '../Items/List/itMonster';
import * as Quests from '../Static/Quests';
import * as VQuests from '../Static/VQuests';
import { Tools } from '../Tools/Tools';

/**
 * Java `DCourt.Control.MonsterTable` (`MonsterTable.java`) - the static monster table: quest key
 * (`"Fields:Goblin"`) to the `itMonster` definition string.
 *
 * The monster definition strings themselves live with the quest data (`Quests`/`VQuests`), which
 * the Java sources keep under `DCourt.Screens.Quest`. Per the porting plan they are ported as data
 * modules under `Static/` so that Control does not have to reach into `Screens/` (that edge is the
 * one that would make `Control <-> Screens` a runtime import cycle); this module imports them from
 * there. The Static port exports the Java interface constants as top-level named exports, so the
 * namespace import below keeps the call sites reading exactly like the Java source
 * (`Quests.townGuard`, `VQuests.seaSerpent`).
 *
 * Everything else - keys, order and the `testGear()` call - is a mechanical port of
 * `MonsterTable.java:53-121`.
 */
export class MonsterTable {
  private static table: Map<string, itMonster> | null = null;
  /** Java `static boolean loading` (`MonsterTable.java:13`) - preserved as-is. */
  static loading = false;

  constructor() {
    this.buildTable();
  }

  /** Java `static boolean isLoading()` (`MonsterTable.java:19-21`). */
  static isLoading(): boolean {
    return MonsterTable.loading;
  }

  /** Java `static itMonster find(String key)` (`MonsterTable.java:23-33`). */
  static find(key: string): itMonster | null {
    const what = MonsterTable.table?.get(key) ?? null;
    if (what != null) {
      return what;
    }
    console.error(`MonsterTable could not find key=[${key}]`);
    return null;
  }

  /** Java `add(String key, String info)` (`MonsterTable.java:35-51`). */
  private add(key: string, info: string): void {
    const it = Item.factory(info);
    if (it == null || !(it instanceof itMonster)) {
      console.error(`MonsterTable bad item = [${info}]`);
      return;
    }
    if (MonsterTable.table == null) {
      MonsterTable.table = new Map<string, itMonster>();
    }
    if (MonsterTable.table.get(key) != null) {
      console.error(`MonsterTable duplicate key=[${key}]`);
      return;
    }
    it.testGear();
    MonsterTable.table.set(key, it);
  }

  /** Java `synchronized void buildTable()` (`MonsterTable.java:53-121`). */
  buildTable(): void {
    if (MonsterTable.table != null) {
      MonsterTable.loading = false;
      Tools.repaint();
      return;
    }
    MonsterTable.table = new Map<string, itMonster>();
    this.add('Town:Guard', Quests.townGuard);
    this.add('Castle:Guard', Quests.castleGuard);
    this.add('Vortex:Guard', Quests.vortexGuard);
    this.add('Faery', Quests.faeryRing);
    this.add('Fields:Rodent', Quests.fieldRodent);
    this.add('Fields:Goblin', Quests.fieldGoblin);
    this.add('Fields:Gypsy', Quests.fieldGypsy);
    this.add('Fields:Centaur', Quests.fieldCentaur);
    this.add('Fields:Merchant', Quests.fieldMerchant);
    this.add('Fields:Wizard', Quests.fieldWizard);
    this.add('Fields:Soldier', Quests.fieldSoldier);
    Tools.repaint();
    this.add('Forest:Boar', Quests.forestBoar);
    this.add('Forest:Orc', Quests.forestOrc);
    this.add('Forest:Elf', Quests.forestElf);
    this.add('Forest:Gryphon', Quests.forestGryphon);
    this.add('Forest:Snot', Quests.forestSnot);
    this.add('Forest:Unicorn', Quests.forestUnicorn);
    this.add('Mound:Gate', Quests.moundGate);
    this.add('Mound:Gang', Quests.moundGang);
    this.add('Mound:Rager', Quests.moundRager);
    this.add('Mound:Thief', Quests.moundThief);
    this.add('Mound:Worm', Quests.moundWorm);
    this.add('Mound:Mage', Quests.moundMage);
    this.add('Mound:Guard', Quests.moundGuard);
    this.add('Mound:Vault', Quests.moundVault);
    this.add('Mound:Champ', Quests.moundChamp);
    this.add('Mound:Queen', Quests.moundQueen);
    Tools.repaint();
    this.add('Hills:Goat', Quests.hillsGoat);
    this.add('Hills:Basilisk', Quests.hillsBasilisk);
    this.add('Hills:Wyvern', Quests.hillsWyvern);
    this.add('Hills:Troll', Quests.hillsTroll);
    this.add('Hills:Sphinx', Quests.hillsSphinx);
    this.add('Hills:Giant', Quests.hillsGiant);
    this.add('Hills:Dragon', Quests.hillsDragon);
    this.add('Dunjeon:Rodent', VQuests.dungRodent);
    this.add('Dunjeon:Snot', VQuests.dungSnot);
    this.add('Dunjeon:Rager', VQuests.dungRager);
    this.add('Dunjeon:Gang', VQuests.dungGang);
    this.add('Dunjeon:Troll', VQuests.dungTroll);
    this.add('Dunjeon:Mage', VQuests.dungMage);
    Tools.repaint();
    this.add('Ocean:Traders', VQuests.seaTraders);
    this.add('Ocean:Serpent', VQuests.seaSerpent);
    this.add('Ocean:Mermaid', VQuests.seaMermaid);
    this.add('Brasil:Harpy', VQuests.braHarpy);
    this.add('Brasil:Fighter', VQuests.braFighter);
    this.add('Brasil:Golem', VQuests.braGolem);
    this.add('Brasil:Medusa', VQuests.braMedusa);
    this.add('Brasil:Hero', VQuests.braHero);
    Tools.repaint();
    this.add('Shang:Gunner', VQuests.shaGunner);
    this.add('Shang:Plague', VQuests.shaPlague);
    this.add('Shang:Peasant', VQuests.shaPeasant);
    this.add('Shang:Ninja', VQuests.shaNinja);
    this.add('Shang:Shogun', VQuests.shaShogun);
    this.add('Shang:Panda', VQuests.shaPanda);
    this.add('Shang:Samurai', VQuests.shaSamurai);
    MonsterTable.loading = false;
    Tools.repaint();
  }
}
