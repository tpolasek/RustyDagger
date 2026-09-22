/**
 * arBuild - the DOM port of `DCourt.Screens.Command.arBuild` ("Hero Description").
 *
 * The optional appearance screen `arEntry` sends new heroes through
 * (`Player.needsBuild()`); `arFinish`-style home navigation: `Save` writes the
 * looks and returns home, `Done` just returns.
 *
 * Layout, the 14 radio buttons in 4 `CheckboxGroup`s (gender/dress/behavior/title)
 * and the 9 text fields are Java's rectangles; `Randomize()` re-rolls every field
 * from `GameStrings`, and `CreateHeroLooks()` writes them into the hero's `looks`
 * list as `itValue`s, exactly as the Java source did.
 */

import { Constants } from "../../Static/Constants";
import { GameStrings } from "../../Static/GameStrings";
import { type itHero } from "../../Items/List/itHero";
import { itList } from "../../Items/itList";
import { itValue } from "../../Items/Token/itValue";
import { COLORS } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { Button } from "../../ui/button";
import { Checkbox, CheckboxGroup } from "../../ui/checkbox";
import { FTextField } from "../../ui/textField";
import type { GameEvent } from "../../ui/widget";
import { Tools } from "../../Tools/Tools";

/** Java `arBuild.tlen`: the maximum length of each text field. */
const tlen: number[] = [15, 15, 15, 15, 15, 15, 40, 60, 60];

/** Java `arBuild.trect`: the text field rectangles. */
const trect = [
  { x: 70, y: 103, width: 100, height: 22 },
  { x: 70, y: 133, width: 100, height: 22 },
  { x: 70, y: 163, width: 100, height: 22 },
  { x: 260, y: 103, width: 100, height: 22 },
  { x: 260, y: 133, width: 100, height: 22 },
  { x: 260, y: 163, width: 100, height: 22 },
  { x: 170, y: 193, width: 225, height: 22 },
  { x: 170, y: 219, width: 225, height: 22 },
  { x: 170, y: 245, width: 225, height: 22 },
];

export class arBuild extends Screen {
  private save!: Button;
  private done!: Button;
  private random!: Button;
  private cbg!: CheckboxGroup[];
  private cb!: Checkbox[];
  private text!: FTextField[];
  /** Java `int gender` - 0 male, 1 female (index into `rankName`). */
  private gender = 0;

  /** Java `arBuild(Screen from)`. */
  constructor(from: Screen | null) {
    super(from, "Hero Description");
    this.setBackground(COLORS.blue);
    this.setForeground(COLORS.white);
    this.setFont(Tools.courtF);
    this.hideStatusBar();
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    const h = Screen.getHero() as itHero;
    const rank = Constants.rankName[this.gender]?.[h.getSocial()] ?? "";
    this.label(`Description of ${rank} ${h.getName()}`, 5, 15, { font: Tools.statusF });
    this.label("Nervous Habit", 50, 210, { font: Tools.courtF });
    this.label("Distinguishing Marks", 2, 236, { font: Tools.courtF });
    this.label("Clever Catch-phrase", 10, 262, { font: Tools.courtF });
    this.label(Constants.GENDER, 5, 35, { font: Tools.courtF });
    this.label(Constants.DRESS, 5, 55, { font: Tools.courtF });
    this.label("Behavior", 5, 75, { font: Tools.courtF });
    this.label(Constants.TITLE, 5, 95, { font: Tools.courtF });
    this.label(Constants.SKIN, 210, 120, { font: Tools.courtF });
    this.label(Constants.EYES, 210, 150, { font: Tools.courtF });
    this.label(Constants.HAIR, 210, 180, { font: Tools.courtF });
    this.label(Constants.RACE, 20, 120, { font: Tools.courtF });
    this.label(Constants.BUILD, 20, 150, { font: Tools.courtF });
    this.label(Constants.SIGN, 20, 180, { font: Tools.courtF });
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (this.movedAway()) {
      return true;
    }
    if (e.target === this.random) {
      this.Randomize();
    }
    if (e.target === this.done) {
      Tools.setRegion(this.getHome());
    }
    if (e.target === this.save) {
      this.CreateHeroLooks();
      Tools.setRegion(this.getHome());
    }
    if (e.target === this.cb[12]) {
      this.gender = 0;
    }
    if (e.target === this.cb[13]) {
      this.gender = 1;
    }
    this.repaint();
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    this.setFont(Tools.textF);
    this.setForeground(COLORS.black);

    this.save = new Button("Fix These Settings Permanently");
    this.save.setFont(Tools.textF);
    this.done = new Button("I'll get to this later");
    this.done.setFont(Tools.textF);
    this.random = new Button("Random");
    this.random.setFont(Tools.textF);

    this.cbg = new Array<CheckboxGroup>(4);
    for (let i = 0; i < this.cbg.length; i++) {
      this.cbg[i] = new CheckboxGroup();
    }
    this.cb = new Array<Checkbox>(14);
    for (let i2 = 0; i2 < this.cb.length; i2++) {
      this.cb[i2] = new Checkbox(
        Constants.sexs[i2 % 4]!,
        this.cbg[Math.trunc(i2 / 4)]!,
        i2 % 4 === 0,
      );
      this.cb[i2]!.setBackground(COLORS.blue);
      this.cb[i2]!.setFont(Tools.textF);
      this.cb[i2]!.reshape(80 + (i2 % 4) * 70, 20 + Math.trunc(i2 / 4) * 20, 60, 20);
    }
    this.save.reshape(5, 275, 200, 20);
    this.done.reshape(245, 275, 150, 20);
    this.random.reshape(328, 2, 70, 20);

    this.text = new Array<FTextField>(tlen.length);
    for (let i3 = 0; i3 < tlen.length; i3++) {
      this.text[i3] = new FTextField(tlen[i3]!);
      this.text[i3]!.reshape(trect[i3]!);
      this.text[i3]!.setFont(Tools.statusF);
    }
    for (let i4 = 0; i4 < 3; i4++) {
      this.text[i4 + 0]!.reshape(70, 103 + i4 * 30, 100, 22);
      this.text[i4 + 3]!.reshape(260, 103 + i4 * 30, 100, 22);
      this.text[i4 + 6]!.reshape(170, 193 + i4 * 25, 225, 22);
    }
  }

  /** Java `addTools()`. */
  override addTools(): void {
    for (let i = 0; i < this.cb.length; i++) {
      this.add(this.cb[i]!);
    }
    for (let i2 = 0; i2 < this.text.length; i2++) {
      this.add(this.text[i2]!);
    }
    this.add(this.save);
    this.add(this.done);
    this.add(this.random);
    this.Randomize();
  }

  /** Java `Randomize()`: roll every appearance field and the gender radios. */
  Randomize(): void {
    this.text[0]!.setText(GameStrings.races[Tools.roll(GameStrings.races.length)] ?? "");
    this.text[1]!.setText(Tools.select(GameStrings.builds));
    this.text[2]!.setText(Tools.select(GameStrings.signs));
    this.text[3]!.setText(Tools.select(GameStrings.colors));
    this.text[4]!.setText(Tools.select(GameStrings.colors));
    this.text[5]!.setText(Tools.select(GameStrings.colors));
    this.text[6]!.setText(Tools.select(GameStrings.habits));
    this.text[7]!.setText(Tools.select(GameStrings.features));
    this.text[8]!.setText(Tools.select(GameStrings.phrases));
    this.gender = Tools.roll(2);
    this.cbg[0]!.setCurrent(this.cb[this.gender]!);
    this.cbg[1]!.setCurrent(this.cb[4 + this.gender]!);
    this.cbg[2]!.setCurrent(this.cb[8 + this.gender]!);
    this.cbg[3]!.setCurrent(this.cb[12 + this.gender]!);
  }

  /** Java `CreateHeroLooks()`: write the radios and fields into the hero record. */
  CreateHeroLooks(): void {
    const lp = Screen.getHero().getLooks() as itList;
    for (let i = 0; i < 4; i++) {
      if (this.cb[0 + i]!.getState()) {
        lp.append(Constants.GENDER, Constants.sexs[i]!);
      }
      if (this.cb[4 + i]!.getState()) {
        lp.append(Constants.DRESS, Constants.sexs[i]!);
      }
      if (this.cb[8 + i]!.getState()) {
        lp.append(Constants.BEHAVE, Constants.sexs[i]!);
      }
      if (i < 2 && this.cb[12 + i]!.getState()) {
        lp.append(Constants.TITLE, Constants.sexs[i]!);
      }
    }
    lp.append(new itValue(Constants.RACE, Tools.detokenize(this.text[0]!.getText())));
    lp.append(new itValue(Constants.BUILD, Tools.detokenize(this.text[1]!.getText())));
    lp.append(new itValue(Constants.SIGN, Tools.detokenize(this.text[2]!.getText())));
    lp.append(new itValue(Constants.SKIN, Tools.detokenize(this.text[3]!.getText())));
    lp.append(new itValue(Constants.EYES, Tools.detokenize(this.text[4]!.getText())));
    lp.append(new itValue(Constants.HAIR, Tools.detokenize(this.text[5]!.getText())));
    lp.append(new itValue(Constants.HABIT, Tools.detokenize(this.text[6]!.getText())));
    lp.append(new itValue("Marks", Tools.detokenize(this.text[7]!.getText())));
    lp.append(new itValue(Constants.PHRASE, Tools.detokenize(this.text[8]!.getText())));
  }
}
