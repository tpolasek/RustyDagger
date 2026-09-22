/**
 * Port of `DCourt/Screens/Areas/arQueen.java` - Queen Beth's court.
 *
 * The four court games (dice / mingle / boast / game) are separate notice
 * screens; petitioning for rank and the investment letter are implemented
 * here.  Text templates are copied verbatim from the Java source (they are
 * `MadLib` input, so the `$token$` spelling matters).
 *
 * Two Java members had to move: `petition` / `invest` name both a Button field
 * and a method there, which TypeScript cannot express in one class, so the
 * fields are private `petitionBtn` / `investBtn` (the methods keep the Java
 * names).
 */

import { color } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { type GameEvent } from "../../ui/widget";
import { Button } from "../../ui/button";
import { Indoors } from "../Template/Indoors";
import { arNotice } from "../Utility/arNotice";
import { arPackage } from "../Utility/arPackage";
import { Tools } from "../../Tools/Tools";
import { MadLib } from "../../Tools/MadLib";
import { Constants } from "../../Static/Constants";
import { GameStrings } from "../../Static/GameStrings";
import { itList } from "../../Items/itList";
import { itNote } from "../../Items/List/itNote";
import { itCount } from "../../Items/Token/itCount";
import { arqBoast } from "./Queen/arqBoast";
import { arqDice } from "./Queen/arqDice";
import { arqGame } from "./Queen/arqGame";
import { arqMingle } from "./Queen/arqMingle";
import { arTown } from "./arTown";

export class arQueen extends Indoors {
  private readonly hero = Screen.getHero();
  private tools!: Button[];
  private petitionBtn!: Button;
  private investBtn!: Button;

  static readonly MAXIMUM_RANK = 9;
  static readonly INVEST_DANGER = 9;
  static readonly PETITION_COST = 5000;
  static readonly PETITION_QUEST = 3;
  static readonly INVEST_COST = 100000;
  static readonly INVEST_QUEST = 5;

  static readonly text: string[] = ["{1}Dice", "{1}Mingle", "{1}Boast", "{1}Game"];

  /**
   * Java `arQueen.greeting`.  Index 0 is the fallback slot: Java left it null
   * and tested `msg == null`, but `Tools.select` takes a `readonly string[]`
   * and normalises a null entry to `""`, so the port keeps `""` and tests that
   * (no real greeting is empty).
   */
  static readonly greeting: string[] = [
    "",
    "What a clever little man.",
    "I'm getting bored.",
    "Tell me a story.",
    "Where have you been?",
    "Give me a good reason.",
    "OFF WITH HIS HEAD!",
    "Show me something special.",
    "You are boring me.",
    "Why should I listen?",
    "Give me a good jape.",
  ];

  static readonly investMsg =
    "$TB$You enter into business with one $lordname$ , a $MAN$ of good repute.  $HE$ is investing in $jobname$.  If all goes well, you should see a return of $reward$ marks for your investment.  The risks are $risk$ and so are the rewards.$CR$$TB$The $lordrank$ will contact you upon the morrow with word of the results.$CR$";
  static readonly feelGood = "$CR$$TB$(You have a bad feeling about this)$CR$";
  static readonly feelBad = "$CR$$TB$(You have a good feeling about this)$CR$";
  static readonly investFeel: string[] = [
    "$CR$$TB$(You have a bad feeling about this)$CR$",
    "$CR$$TB$(You have a bad feeling about this)$CR$",
    "",
    "$CR$$TB$(You have a good feeling about this)$CR$",
    "$CR$$TB$(You have a good feeling about this)$CR$",
  ];
  static readonly investNote =
    "$today$$CR$My Good $rank$ $name$,$CR$I write to inform you of events concerning our mutual venture.";
  static readonly investText: string[] = [
    "$today$$CR$This letter is to inform you that the $lordname$ was beaten senseless and robbed utterly while engaged in business. $CR$Sincerely,$CR$$official$",
    "Things went very poorly. I am deeply ashamed to report substantial losses. Pray accept this small sum as my sole apology.$CR$Deepest Regrets, $CR$$lordname$ ",
    "There were several setbacks to the venture we have planned.  I am able to return your original investment, but no more. $CR$Regretfully, $CR$$lordname$",
    "Business has progressed exactly as expected. Your share of the proceeds accompany this letter. $CR$Ever yours, $CR$$lordname$",
    "As the purse accompanying this missive indicates, things went extremely well. You will find an extra $bonus$ marks above the amount I promised you. $CR$Thank you for your trust.$CR$$lordname$",
  ];
  static readonly investJobs: string[][] = [
    ["the Oat Harvest", "the Wheat Harvest", "the Barley Harvest"],
    ["the Grape Harvest", "Hog Futures", "Wool Futures"],
    ["a Cargo of Wine", "a Cargo of Beer", "a Cargo of Dried Meat"],
    ["the Leather Works", "the Iron Works", "the Lumber Yard"],
    ["a Flower Shop", "a Pastry Shop", "a Fine Theatre"],
    ["a Cargo of Weapons", "a Cargo of Farm Tools", "A Cargo of Glassware"],
    ["a Cargo of Artwork", "a Cargo of Fine Wines", "a Cargo of Jewelry"],
    ["bribes to the Chief Counselor", "bribes to the Guard Captain", "bribes to the Guild Master"],
  ];
  static readonly investRisk: string[] = [
    "marginal",
    "minimal",
    "small",
    "moderate",
    "large",
    "substantial",
    "massive",
    "incredible",
  ];
  static readonly officialTitle: string[] = [
    "Captain ",
    "Doctor ",
    "Mayor ",
    "Abbot ",
    "Lieutenant ",
    "Officer ",
    "Father ",
    "Brother ",
    "Sherrif",
    "Alderman",
    "Sultan",
    "Major",
  ];
  static readonly petitionText: string[] = [
    '$TB$The queen laughs coldly at your ambitions. $CR$$TB$"The rank of $newrank$ is at such far remove that you may find the stars to be a closer companion.  Do not even dare to speak to me again until you have a gift worthy of my attentions." $CR$$TB$She signals her guards who drag you out and throw you from the castle. $CR$',
    '$TB$The queen stares at you as if you were a stain on the carpet. $CR$$TB$"The rank of $newrank$ is far from your grasp at this moment.  Go forth, do good works to curry favor with this court." $CR$$TB$She turns her gaze away from you in a clear gesture of dismissal. $CR$',
    '$TB$Her majesty smiles shyly. $CR$$TB$"You have made great inroads with this court.  Many nobles find you a pleasing companion and speak favorably of you.  The rank of $newrank$ is not an impossible dream, but still requires more work." $CR$$TB$The queen acknowledges your parting bow, and turns to whisper giggling comments to her ladies in waiting. $CR$',
    '$TB$The queen smiles on you benignly. $CR$$TB$"The rank of $newrank$ is not far from your grasp.  If you could gain the greatest approval of my counselors and nobles, I could be persuaded to grant you a new title." $CR$$TB$The queen turns her attention to matters of state, but you suspect your case is on her mind. $CR$',
    '$TB$$TB$*** Social Standing Raised *** $CR$$TB$Proclamations are sent accross the land: $CR$ $CR$$TB$"Her majesty Queen Beth is pleased to declare that one of her most faithful and loyal of subjects, the honorable $newrank$ $name$ ;  has earned her deepest gratitude and the respect of the Dragon Court as a whole. $CR$ $CR$$TB$"In Recognition of his long standing good works, we are delighted to declare that $name$ shall henceforth be known as:  $CR$ $CR$$TB$$TB$$TB$$TB$" $newrank$ $name$ "!!',
  ];
  static readonly recommendMsg = "$CR$Perhaps you could speak with the Queen...$CR$";

  constructor(from: Screen | null) {
    super(from, "Queen Beth reigns over Dragon Court");
    this.setBackground(color(255, 128, 128));
    this.setForeground(color(128, 0, 0));
  }

  override getFace(): string {
    return "Faces/Ruler.jpg";
  }

  override getGreeting(): string {
    const msg = Tools.select(arQueen.greeting);
    return msg.length === 0 ? `Have you seen ${Screen.getBest()}?` : msg;
  }

  /** Java overrode `update(Graphics)` to refresh the button states too. */
  override update(): void {
    super.update();
    this.updateTools();
  }

  override localPaint(): void {
    const rank = Number(this.hero.getSocial());
    const sex = Number(this.hero.getGender());
    super.localPaint();
    if (rank < 9) {
      this.label(
        `${Constants.rankName[sex][rank]} to ${Constants.rankName[sex][rank + 1]}`,
        180,
        190,
      );
    }
  }

  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    if (Screen.getQuests() > 0) {
      if (e.target === this.tools[0]) {
        Tools.setRegion(new arqDice(this));
      } else if (e.target === this.tools[1]) {
        Tools.setRegion(new arqMingle(this));
      } else if (e.target === this.tools[2]) {
        Tools.setRegion(new arqBoast(this));
      } else if (e.target === this.tools[3]) {
        Tools.setRegion(new arqGame(this));
      }
    }
    if (e.target === this.petitionBtn) {
      this.petition();
    } else if (e.target === this.investBtn) {
      this.invest();
    } else if (e.target === this.getPic(0)) {
      Tools.setRegion(this.getHome());
    }
    return super.action(e, o);
  }

  override createTools(): void {
    this.tools = new Array<Button>(arQueen.text.length);
    for (let i = 0; i < this.tools.length; i++) {
      this.tools[i] = new Button(arQueen.text[i]);
      /* Java: reshape(160 + ((i / 2) * 100), 50 + ((i % 2) * 40), 90, 25) */
      this.tools[i].reshape(160 + Math.trunc(i / 2) * 100, 50 + (i % 2) * 40, 90, 25);
      this.tools[i].setFont(Tools.statusF);
    }
    this.petitionBtn = new Button("{3} Petition $5000");
    this.petitionBtn.reshape(170, 200, 170, 25);
    this.petitionBtn.setFont(Tools.statusF);
    this.petitionBtn.show(Screen.getSocial() < 9);
    this.investBtn = new Button("{5}Invest $100k");
    this.investBtn.reshape(170, 130, 170, 25);
    this.investBtn.setFont(Tools.statusF);
    this.updateTools();
  }

  override addTools(): void {
    for (let i = 0; i < this.tools.length; i++) {
      this.add(this.tools[i]);
    }
    this.add(this.petitionBtn);
    this.add(this.investBtn);
  }

  updateTools(): void {
    /* Java built the buttons in the constructor; the port builds them on the
     * first `init()`, so `update()` before then has nothing to refresh. */
    if (!this.tools) {
      return;
    }
    const rank = Screen.getSocial();
    const cash = Screen.getMoney();
    const quests = Screen.getQuests();
    for (let i = 0; i < this.tools.length; i++) {
      this.tools[i].enable(quests >= 1);
    }
    if (cash < 1000) {
      this.tools[0].enable(false);
    }
    this.petitionBtn.enable(quests >= 3 && cash >= arQueen.PETITION_COST);
    this.petitionBtn.show(rank < 9);
    this.investBtn.enable(cash >= arQueen.INVEST_COST && quests >= 5);
  }

  /** Java `arQueen.invest()` (was `synchronized`; the port is single threaded). */
  invest(): void {
    /* Java short-circuits in this order, so the roll only happens when the
     * hero can afford the venture. */
    if (Screen.getQuests() < 5 || Screen.getMoney() < arQueen.INVEST_COST) {
      return;
    }
    const rank = Screen.getSocial() + Tools.roll(4) - 1;
    if (rank < 0 || rank > 11) {
      return;
    }
    const risk = Math.trunc((rank + Tools.roll(rank + 2)) / 3);
    let gain = 0;
    const index = Tools.fourTest(this.hero.getWits(), 20 + risk * 40);
    const reward = Math.trunc((arQueen.INVEST_COST * (23 + risk * 3)) / 20);
    const msg = new MadLib(arQueen.investMsg.concat(arQueen.investFeel[index]));
    let note = new MadLib(arQueen.investNote.concat(arQueen.investText[index]));
    switch (index) {
      case 0:
        note = new MadLib(arQueen.investText[0]);
        note.replace(
          "$official$",
          `${Tools.select(arQueen.officialTitle)} ${Tools.select(GameStrings.Names)}`,
        );
        gain = 0;
        break;
      case 1:
        gain = Math.trunc(arQueen.INVEST_COST / 2);
        break;
      case 2:
        msg.append(this.hero.gainExp(risk * 5 + rank));
        msg.append(this.hero.gainWits(5));
        gain = arQueen.INVEST_COST;
        break;
      case 3:
        msg.append(this.hero.gainExp(risk * 10 + rank));
        msg.append(this.hero.gainWits(10));
        gain = reward;
        break;
      case 4:
        gain = Math.trunc((reward * 3) / 2);
        msg.replace("$bonus$", `${gain - reward}`);
        msg.append(this.hero.gainExp(risk * 15 + rank));
        msg.append(this.hero.gainWits(15));
        break;
    }
    const name = `${Constants.rankTitle[rank]}${Tools.select(GameStrings.Names)}`;
    const sex = Tools.roll(2);
    note.replace("$lordname$", name);
    note.replace("$rank$", this.hero.getRankTitle());
    note.replace("$name$", this.hero.getName());
    note.replace("$today$", Tools.getToday());
    msg.replace("$lordname$", name);
    msg.replace("$lordrank$", Constants.rankName[sex][rank]);
    msg.replace("$jobname$", Tools.select(arQueen.investJobs[risk]));
    msg.replace("$cost$", `${arQueen.INVEST_COST}`);
    msg.replace("$risk$", arQueen.investRisk[risk]);
    msg.replace("$reward$", `${reward}`);
    msg.genderize(sex === 0);
    const mail = new itList(Constants.MAIL);
    mail.append(new itNote("Letter", name, note.getText()));
    if (gain > 0) {
      mail.add(new itCount("Marks", gain));
    }
    Screen.subMoney(arQueen.INVEST_COST);
    this.hero.addFatigue(5);
    if (!Screen.saveHero()) {
      Screen.addMoney(arQueen.INVEST_COST);
      this.hero.subFatigue(5);
      Tools.setRegion(new arNotice(this.getHome(), GameStrings.SAVE_CANCEL));
      return;
    }
    const result = arPackage.send(name, String(this.hero.getName()), mail);
    if (result != null) {
      Screen.addMoney(arQueen.INVEST_COST);
      this.hero.subFatigue(5);
      Tools.setRegion(new arNotice(this, GameStrings.MAIL_CANCEL.concat(result)));
      return;
    }
    Tools.setRegion(new arNotice(this, msg.getText()));
  }

  /** Java `arQueen.petition()` (was `synchronized`; the port is single threaded). */
  petition(): void {
    const rank = Screen.getSocial();
    const cost = Constants.rankCost[rank];
    const sex = this.hero.getGender();
    if (Screen.getQuests() < 3 || Screen.getMoney() < arQueen.PETITION_COST) {
      return;
    }
    this.hero.addFatigue(3);
    Screen.subMoney(arQueen.PETITION_COST);
    this.hero.addFavor(arQueen.PETITION_COST);
    const favor = this.hero.hasTrait(Constants.POPULAR)
      ? Math.trunc(this.hero.getFavor() / 700)
      : Math.trunc(this.hero.getFavor() / 1000);
    let index = Math.trunc((favor * 4) / cost);
    if (index > 4) {
      index = 4;
    }
    const msg = new MadLib(arQueen.petitionText[index]);
    msg.replace("$newrank$", Constants.rankName[sex][rank + 1]);
    msg.replace("$name$", this.hero.getName());
    let next: Screen;
    switch (index) {
      case 0:
        next = new arNotice(new arTown(), msg.getText());
        break;
      case 1:
      case 2:
      case 3:
        next = new arNotice(this, msg.getText());
        break;
      default:
        this.hero.getStatus().zero(Constants.FAVOR);
        this.hero.addRank(Constants.SOCIAL, 1);
        this.hero.addStatus(Constants.FAME, this.hero.getSocial() * 100);
        next = new arNotice(this, msg.getText());
        break;
    }
    Tools.setRegion(next);
  }

  /** Java `arQueen.Recommend()` - a hint appended to the court game texts. */
  static Recommend(): string {
    const hero = Screen.getHero();
    const favor = hero.hasTrait(Constants.POPULAR)
      ? Math.trunc(hero.getFavor() / 700)
      : Math.trunc(hero.getFavor() / 900);
    return favor < Constants.rankCost[hero.getSocial()] || Tools.roll(2) > 0
      ? ""
      : arQueen.recommendMsg;
  }
}
