import {
  COT,
  DOCKS,
  DUNJEON,
  FIELDS,
  FLOOR,
  FOREST,
  HILLS,
  MOUND,
  ROOM,
  SUITE,
  TOWN,
} from '../Static/Constants';
import type { ScreenRef } from './ScreenRegistry';
import { resolveScreen } from './ScreenRegistry';

/**
 * Java `DCourt.Control.PlaceTable` (`PlaceTable.java`) - the 11 sleep/awake places a hero can be
 * in, plus the screen each place launches.
 *
 * Data table ported verbatim (`PlaceTable.java:65-177`). The only behavioural change is
 * `getLaunch()`: Java used `Class.forName("DCourt.Screens." + launch).newInstance()`
 * (`PlaceTable.java:55`); here launch names are looked up in the explicit registration table in
 * `./ScreenRegistry`, and screens register themselves:
 *
 *   import { registerScreenClass } from '../Control/PlaceTable';   // re-exported
 *   import { arTown } from './Areas/arTown';
 *   registerScreenClass('Areas.arTown', arTown);
 *
 * The registration API is re-exported below so screens only need this module.
 */
export {
  registerScreen,
  registerScreenClass,
  registerScreens,
  unregisterScreen,
  hasScreen,
  registeredScreens,
  clearScreens,
} from './ScreenRegistry';

/** Java `PlaceTable$PlaceRecord` - one row of the place table. */
export class PlaceRecord {
  constructor(
    private readonly name: string,
    private readonly launch: string | null,
    private readonly decay: number,
    private readonly use: string,
    private readonly awake: string,
    private readonly sleep: string
  ) {}

  getName(): string {
    return this.name;
  }

  getLaunch(): string | null {
    return this.launch;
  }

  getUse(): string {
    return this.use;
  }

  getAwake(): string {
    return this.awake;
  }

  getSleep(): string {
    return this.sleep;
  }

  getDecay(): number {
    return this.decay;
  }
}

export class PlaceTable {
  private table: Map<string, PlaceRecord> | null = null;
  private pick: PlaceRecord | null = null;

  constructor() {
    this.buildTable();
    this.select(FIELDS);
  }

  /** Java `addTable(PlaceRecord)`; Java's table is a `Hashtable` keyed by place name. */
  addTable(place: PlaceRecord): void {
    if (this.table == null) {
      this.table = new Map<string, PlaceRecord>();
    }
    this.table.set(place.getName(), place);
  }

  /**
   * Java `select(String key)`: unknown/null keys fall back to `"limbo"` (`PlaceTable.java:21-26`).
   */
  select(key: string | null): void {
    const table = this.table;
    this.pick = key == null || table == null ? null : table.get(key) ?? null;
    if (this.pick == null) {
      this.pick = table?.get('limbo') ?? null;
    }
  }

  /* The getters below are Java `this.pick.getX()`, which NPEs when nothing is selected; the
   * constructor always selects a place (falling back to `limbo`), so `pick` is non-null here. */

  getName(): string {
    return this.pick!.getName();
  }

  getUse(): string {
    return this.pick!.getUse();
  }

  getAwake(): string {
    return this.pick!.getAwake();
  }

  getSleep(): string {
    return this.pick!.getSleep();
  }

  getDecay(): number {
    return this.pick!.getDecay();
  }

  /**
   * Java `getLaunch()` (`PlaceTable.java:48-63`) - now resolved through the screen registration
   * table instead of reflection, so the Control layer never imports `DCourt.Screens.*`.
   */
  getLaunch(): ScreenRef | null {
    const launch = this.pick == null ? null : this.pick.getLaunch();
    if (this.pick == null || launch == null) {
      return null;
    }
    return resolveScreen(launch);
  }

  /** Java `synchronized void buildTable()` (`PlaceTable.java:65-177`): builds once. */
  buildTable(): void {
    if (this.table != null) {
      return;
    }
    this.table = new Map<string, PlaceRecord>();

    this.addTable(
      new PlaceRecord(
        SUITE,
        'Areas.arTown',
        6,
        's',
        '\tYou awaken in a tavern suite, enjoy a leisurely bath, then saunter down to the common room to break your fast.\n',
        '\tAfter a sumptuous meal, you enjoy a lazy bath, flirting with the attendant, then lay yourself down on the down filled mattresses.  You fall asleep instantly.'
      )
    );
    this.addTable(
      new PlaceRecord(
        ROOM,
        'Areas.arTown',
        5,
        's',
        '\tYou awaken in a small room, listen for a moment to the sounds of the morning crowd tromping around, then get up.\n',
        '\tYou eat dinner, down a pint, wash your hands and face, then lay down on the hay filled mattress and close your eyes.\n'
      )
    );
    this.addTable(
      new PlaceRecord(
        FLOOR,
        'Areas.arTown',
        4,
        'b',
        '\tYou awaken on the tavern floor with the taste of smoke in your mouth.  You have to scramble to evade being trampled by the morning crowd, just arriving for breakfast.\n',
        '\tYou bundle up your cloak and find a relatively unsoiled section of floor to sleep on.\n'
      )
    );
    this.addTable(
      new PlaceRecord(
        TOWN,
        'Areas.arTown',
        3,
        '',
        '\tYou crawl from the alley where your body has been laying all night, stretch your newly revived limbs, and go about your business.\n',
        '\tYou drop dead in the town.\n'
      )
    );
    this.addTable(
      new PlaceRecord(
        FIELDS,
        'Wilds.arField',
        3,
        'cb',
        '\tYou awaken in a grassy meadow, soaked head to toe in morning dew.\n',
        '\tYou set camp on a grassy knoll, then watch the the sun set in radiant red and gold.\n'
      )
    );
    this.addTable(
      new PlaceRecord(
        FOREST,
        'Wilds.arForest',
        2,
        'cb',
        '\tYou awaken under a bush, itching horribly from insect bites.\n\n\tWhy in the name of heaven did you decide to come to this wretched place?\n',
        '\tYou find a hollow tree, drive out the spiders and squirrels, then hole up in a cramped position.\n'
      )
    );
    this.addTable(
      new PlaceRecord(
        MOUND,
        'Wilds.arMound',
        2,
        'b',
        '\tYou awaken under a bench in the Gobble Inn.  You itch horribly from numerous insect bites.\n\n\tWhy in the name of heaven did you decide to come to this wretched place?\n',
        '\tYou sink to the bottom of degradation.  Being utterly broke and exhausted you slump into a corner of the Gobble Inn.  You have to squabble with a tame berzerker for a spot near the fire.\n'
      )
    );
    this.addTable(
      new PlaceRecord(
        COT,
        'Wilds.arMound',
        3,
        'bc',
        '\tYou awaken on a cramped and smelly cot. Smidgen Crumb is eyeing your purse with a calculated stare.\n',
        '\tYou shell out a small fortune for a small and suspiciously odiferous cot.  You down your meal of uncooked radishes, then pull the thin covers over your shivering form\n'
      )
    );
    this.addTable(
      new PlaceRecord(
        HILLS,
        'Wilds.arHills',
        2,
        'bc',
        '\tYou roll over and nearly fall off a cliff before snapping to your senses in a heady rush of adrenalin.\n',
        '\tYou find a drafty cave that stinks of large predators.  You huddle next to a make-shift fire and descend into a nightmarish stupor.\n'
      )
    );
    this.addTable(
      new PlaceRecord(
        DOCKS,
        'Wilds.arCastle',
        2,
        '',
        '\tYou come to consciousness on a rain swept beach.  After walking for several hours, you arrive back at the docks.\n',
        'Sleep Docks'
      )
    );
    this.addTable(
      new PlaceRecord(
        DUNJEON,
        'Wilds.arCastle',
        2,
        'b',
        '\tYou come to awareness in darkness with a foul stench. You crawl towards a distant light, finally emerging from a sewer into the castle.\n',
        'Sleep Dunjeon'
      )
    );
    this.addTable(
      new PlaceRecord(
        'limbo',
        null,
        3,
        'bc',
        '\tYour character has failed to load properly. Please report this error to the System Operator. \n\tWe RECOMMEND that you reload the game (hit refresh/reload in your browser), then wait five minutes before trying to load your hero again.\n\t(You Have Awakened In Limbo)',
        '\tYou have fallen into LIMBO, that strange region that can only be entered via programming errors. You go to sleep with a strong urge to report your problem to the world builders...\n'
      )
    );
  }
}
