/**
 * arPeer - the DOM port of `DCourt.Screens.Utility.arPeer`.
 *
 * "Examine Hero": the palantir / gem-vision screen that describes another hero
 * from their looks list, built from the `MadLib` templates (`noDescription`,
 * the gender/dress/behaviour grammar and the traits tail).  Access is bought
 * with money (`USEMONEY`), a gem (`USEMAGIC`), the clan palantir (`CLANPEER`)
 * or granted free (`USEPALANTIR` / own name).
 *
 * The Java bodies are ported unchanged:
 *  - `LoadVision` charges the purse/gem before the hero file is loaded (no
 *    refund on an unreadable name - kept);
 *  - `BuildDescription` keeps the short-circuit `Tools.chance(3)` on the habit
 *    branch and the `row % 6` newline in the traits tail;
 *  - `localPaint` enables the Seek button each paint and draws the cost line in
 *    the screen foreground (black, because `createTools` restores it, exactly as
 *    in Java).
 *
 * DOM notes:
 *  - `Breaker`/`drawText` come from `arNotice`; the `courtF` metrics are its
 *    concern.
 *  - `Screen.getHero()` is the structural `HeroLike`; the typed `itHero` cast
 *    mirrors Java's declared `itHero h = Screen.getHero()`.
 */

import { GearTable } from "../../Control/GearTable";
import { Item } from "../../Items/Item";
import type { itHero } from "../../Items/List/itHero";
import { ArmsTrait } from "../../Static/ArmsTrait";
import { Constants } from "../../Static/Constants";
import { Buffer } from "../../Tools/Buffer";
import { FileLoader } from "../../Tools/FileLoader";
import { MadLib } from "../../Tools/MadLib";
import { Tools } from "../../Tools/Tools";
import { Button } from "../../ui/button";
import { COLORS, type ColorSpec } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { FTextField } from "../../ui/textField";
import type { GameEvent } from "../../ui/widget";
import { arNotice } from "./arNotice";

export class arPeer extends arNotice {
  private heroName!: FTextField;

  private seek!: Button;

  private done!: Button;

  private pname: string | null = null;

  private target!: itHero;

  private spend: number;

  /** Java `arPeer.SEEKMONEY`. */
  static readonly SEEKMONEY = 250;

  /** Java `arPeer.SEEKGEM`. */
  static readonly SEEKGEM = "Opal";

  /** Java `arPeer.DISABLED` / `USEMONEY` / `USEMAGIC` / `USEPALANTIR` / `CLANPEER`. */
  static readonly DISABLED = 0;
  static readonly USEMONEY = 1;
  static readonly USEMAGIC = 2;
  static readonly USEPALANTIR = 3;
  static readonly CLANPEER = 4;

  /** Java `arPeer.sex_Act` / `sex_Dress`. */
  static readonly sex_Act: string[] = ["masculine", "feminine", "ambiguous", "neutral"];
  static readonly sex_Dress: string[] = [
    "trousers and dark colors",
    "long skirts and bright colors",
    "fluffy pants and a puffy shirt",
    "dark overcoat concealing all",
  ];

  /** Java `arPeer.situation`. */
  static readonly situation: string[] = [
    " battling a centaur, bellowing forth ",
    " fleeing a wyvern, shrieking in terror ",
    " riding a gryphon above the clouds, exhorting ",
    " searching the corpse of an elf, mumbling ",
    " tracking a forest boar, muttering ",
    " seducing a castle servant, whispering ",
    " gambling amongst nobles, chuckling ",
    " training at the guild, while crying ",
    " sharing a beer in the tavern, while boasting ",
    " tricking a goblin mage, then saying ",
    " stroking a goblin queen, then moaning ",
  ];

  /** Java `arPeer.strongAdj`. */
  static readonly strongAdj: string[] = [
    "stern",
    "brave",
    "headstrong",
    "alert",
    "valiant",
    "cunning",
    "powerful",
  ];

  /** Java `arPeer.noDescription`. */
  static readonly noDescription =
    "$title$ $name$ = No Description\n\n\tGuts: $guts$\tWits: $wits$\tCharm: $charm$\nWeapon: $weapon$\nArmor: $armor$";

  /** Java `arPeer.describe0`. */
  static readonly describe0 =
    "\t$title$ $name$ $clanmsg$ is a $build$ $race$ with $hair$ hair, $eyes$ eyes, and $skin$ skin. $dress$ $behave$ $intro$ the odd trait of $marks$. Rumor has it that $HE$ is a $sign$. \n\tAs you peer into the gem you espy";

  /** Java `arPeer.describe1`. */
  static readonly describe1 = "$him$ $situation$ \"$phrase$\"";

  /** Java `arPeer.describe2`. */
  static readonly describe2 = "that $habit$.";

  /** Java `arPeer.describe3`. */
  static readonly describe3 =
    "\n\tGuts: $guts$\tWits: $wits$\tCharm: $charm$\nWeapon: $weapon$\nArmor: $armor$";

  /** Java `arPeer.clanmsg` / `dressmsg` / `behave1` / `behave2` / `intro1` / `intro2`. */
  static readonly clanmsg = "of the $clan$ Clan";
  static readonly dressmsg = "$He$ is dressed in a $sexact$ fashion; $sexdress$";
  static readonly behave1 = "$and$ $his$ behaviour is $also$ suspiciously $sexact$.";
  static readonly behave2 = "$His$ behaviour is suspiciously $sexact$.";
  static readonly intro1 = "This $adject$ $rank$ is overall undistinguished, save for";
  static readonly intro2 = "In addition, this $adject$ $rank$ has";

  /** Java `arPeer.STOP` / `AND` / `WHILE` / `ALSO`. */
  static readonly STOP = ".";
  static readonly AND = "and";
  static readonly WHILE = "while";
  static readonly ALSO = "also";

  /** Java `arPeer(Screen from, int source, String who)`. */
  constructor(from: Screen | null, source: number, who: string | null) {
    super(from, "Examine Hero");
    this.setBackground(COLORS.blue);
    this.setForeground(COLORS.white);
    this.setFont(Tools.courtF);
    this.hideStatusBar();
    this.pname = who === null ? String(Screen.getHero().getName()) : who;
    this.spend = source;
    if (this.spend === arPeer.USEMAGIC && GearTable.canMageUse(arPeer.SEEKGEM)) {
      this.spend = arPeer.DISABLED;
    }
    this.setMessage("Working...");
  }

  /** Java `init()`. */
  override init(): void {
    super.init();
    this.LoadVision(this.pname);
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    const h = Screen.getHero() as unknown as itHero;
    if (this.spend !== arPeer.CLANPEER) {
      this.seek.enable(
        this.heroName.isMatch(h.getName()) ||
          (this.spend === arPeer.USEMONEY && h.getMoney() > arPeer.SEEKMONEY) ||
          (this.spend === arPeer.USEMAGIC && h.packCount(arPeer.SEEKGEM) > 3),
      );
    }
    const col: ColorSpec = this.getForeground();
    this.fill(0, 0, Tools.DEFAULT_WIDTH, Tools.DEFAULT_HEIGHT, this.getBackground());
    if (this.heroName.isMatch(h.getName())) {
      this.label("Cost: Free", 195, 23, { font: Tools.statusF, color: col });
    } else if (this.spend === arPeer.USEMONEY) {
      this.label("Cost: $250", 195, 23, { font: Tools.statusF, color: col });
    } else if (this.spend === arPeer.USEMAGIC) {
      this.label(`Cost: 3/${h.packCount(arPeer.SEEKGEM)} ${arPeer.SEEKGEM}`, 195, 23, {
        font: Tools.statusF,
        color: col,
      });
    } else if (this.spend === arPeer.CLANPEER) {
      this.label(`${String(h.getClan())} Clan Palantir`, 10, 20, {
        font: Tools.statusF,
        color: col,
      });
    } else {
      this.label("Cost: ---", 200, 20, { font: Tools.statusF, color: col });
    }
    this.drawText(10, 40, col);
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, _o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.done) {
      Tools.setRegion(this.getHome());
    }
    if (e.target === this.seek) {
      this.LoadVision(this.heroName.getText());
    }
    this.repaint();
    return true;
  }

  /** Java `createTools()`. */
  override createTools(): void {
    this.setFont(Tools.textF);
    this.setForeground(COLORS.black);
    this.done = new Button("Done");
    this.done.reshape(335, 7, 60, 20);
    this.heroName = new FTextField(15);
    this.heroName.reshape(70, 5, 120, 22);
    if (this.spend !== arPeer.CLANPEER) {
      this.heroName.setText(String(Screen.getHero().getName()));
    }
    this.seek = new Button("Seek");
    this.seek.reshape(5, 7, 60, 20);
  }

  /** Java `addTools()`. */
  override addTools(): void {
    this.add(this.done);
    if (this.spend !== arPeer.CLANPEER) {
      this.add(this.seek);
      this.add(this.heroName);
    }
  }

  /** Java `LoadVision(String who)`. */
  LoadVision(who: string | null): void {
    const h = Screen.getHero() as unknown as itHero;
    this.pname = who;
    if (who === null || who.length < 4) {
      this.setMessage(`Illegal Name: <${String(who)}>`);
    } else if (h.isMatch(this.pname)) {
      this.target = h;
      this.BuildDescription();
    } else {
      if (this.spend === arPeer.USEMONEY) {
        h.subMoney(arPeer.SEEKMONEY);
      }
      if (this.spend === arPeer.USEMAGIC) {
        h.subPack(arPeer.SEEKGEM, 3);
      }
      // Java declared the loader's result nullable; the ported loader never is.
      const buf: Buffer | null = FileLoader.loadHero(who);
      if (buf === null || buf.isEmpty() || buf.isError()) {
        if (!FileLoader.hasCached(String(who))) {
          this.setMessage(`Seeking <${this.pname}>`);
          FileLoader.whenHeroLoaded(String(who), () => {
            if (!Tools.movedAway(this)) {
              this.LoadVision(who);
            }
          });
          return;
        }
        this.setMessage(`Unable to Load <${this.pname}>`);
        return;
      }
      this.target = Item.factory(buf) as unknown as itHero;
      this.BuildDescription();
    }
  }

  /** Java `BuildDescription()`. */
  BuildDescription(): void {
    let mad: MadLib;
    const lp = this.target.getLooks();
    if (lp === null || lp.getCount() < 1) {
      mad = new MadLib(arPeer.noDescription);
    } else {
      const habit = lp.getValue(Constants.HABIT);
      if (habit === null || !Tools.chance(3)) {
        mad = new MadLib(
          "\t$title$ $name$ $clanmsg$ is a $build$ $race$ with $hair$ hair, $eyes$ eyes, and $skin$ skin. $dress$ $behave$ $intro$ the odd trait of $marks$. Rumor has it that $HE$ is a $sign$. \n\tAs you peer into the gem you espy $him$ $situation$ \"$phrase$\"\n\tGuts: $guts$\tWits: $wits$\tCharm: $charm$\nWeapon: $weapon$\nArmor: $armor$",
        );
      } else {
        mad = new MadLib(
          "\t$title$ $name$ $clanmsg$ is a $build$ $race$ with $hair$ hair, $eyes$ eyes, and $skin$ skin. $dress$ $behave$ $intro$ the odd trait of $marks$. Rumor has it that $HE$ is a $sign$. \n\tAs you peer into the gem you espy that $habit$.\n\tGuts: $guts$\tWits: $wits$\tCharm: $charm$\nWeapon: $weapon$\nArmor: $armor$",
        );
      }
      // Java's `MadLib.replace(key, null)` left the `$token$` in place, so a
      // null lookup is simply not replaced here either.
      const put = (key: string, val: string | number | null): void => {
        if (val !== null) {
          mad.replace(key, val);
        }
      };
      const clan = this.target.getClan();
      if (clan === null) {
        mad.replace("$clanmsg$", "");
      } else {
        mad.replace("$clanmsg$", arPeer.clanmsg);
        mad.replace("$clan$", clan);
      }
      put("$build$", lp.getValue(Constants.BUILD));
      put("$race$", lp.getValue(Constants.RACE));
      put("$hair$", lp.getValue(Constants.HAIR));
      put("$eyes$", lp.getValue(Constants.EYES));
      put("$skin$", lp.getValue(Constants.SKIN));
      const val = lp.getValue(Constants.TITLE);
      let gender = 0;
      while (gender < 2 && val !== null && val !== Constants.sexs[gender]) {
        gender++;
      }
      const val2 = lp.getValue(Constants.DRESS);
      let dress = 0;
      while (dress < 4 && val2 !== null && val2 !== Constants.sexs[dress]) {
        dress++;
      }
      const val3 = lp.getValue(Constants.BEHAVE);
      let behave = 0;
      while (behave < 4 && val3 !== null && val3 !== Constants.sexs[behave]) {
        behave++;
      }
      if (gender !== dress) {
        mad.replace("$dress$", arPeer.dressmsg);
        mad.replace("$sexact$", arPeer.sex_Act[dress]!);
        mad.replace("$sexdress$", arPeer.sex_Dress[dress]!);
        if (gender === behave) {
          mad.replace("$behave$", arPeer.STOP);
        } else {
          mad.replace("$behave$", arPeer.behave1);
          mad.replace("$and$", dress === behave ? arPeer.AND : arPeer.WHILE);
          mad.replace("$also$", dress === behave ? arPeer.ALSO : "");
          mad.replace("$sexact$", arPeer.sex_Act[behave]!);
        }
      } else if (gender !== behave) {
        mad.replace("$dress$", "");
        mad.replace("$behave$", arPeer.behave2);
        mad.replace("$sexact$", arPeer.sex_Act[behave]!);
      } else {
        mad.replace("$dress$", "");
        mad.replace("$behave$", "");
      }
      mad.replace("$intro$", gender === dress ? arPeer.intro1 : arPeer.intro2);
      put("$marks$", lp.getValue("Marks"));
      put("$sign$", lp.getValue(Constants.SIGN));
      mad.replace("$situation$", Tools.select(arPeer.situation));
      put("$phrase$", lp.getValue(Constants.PHRASE));
      put("$habit$", habit);
      mad.replace("$rank$", this.target.getRankTitle());
      mad.replace("$adject$", Tools.select(arPeer.strongAdj));
      mad.genderize(gender === 0);
    }
    mad.replace("$title$", this.target.getTitle());
    mad.replace("$name$", this.target.getName());
    mad.replace("$guts$", this.target.getGuts());
    mad.replace("$wits$", this.target.getWits());
    mad.replace("$charm$", this.target.getCharm());
    const ap = this.target.findGearTrait(ArmsTrait.RIGHT);
    mad.replace("$weapon$", ap === null ? Constants.NONE : String(ap.getName()));
    const ap2 = this.target.findGearTrait(ArmsTrait.BODY);
    mad.replace("$armor$", ap2 === null ? Constants.NONE : String(ap2.getName()));
    let msg = mad.getText().concat("\nTraits: ");
    let row = 1;
    for (let i = 0; i < Constants.TraitList.length; i++) {
      const trait = Constants.TraitList[i]!;
      if (this.target.hasTrait(trait)) {
        msg = msg.concat(String(trait).concat(" "));
        row++;
        if (row % 6 === 0) {
          msg = msg.concat("\n\t");
        }
      }
    }
    if (row === 1) {
      msg = msg.concat(Constants.NONE);
    }
    this.setMessage(msg);
  }
}
