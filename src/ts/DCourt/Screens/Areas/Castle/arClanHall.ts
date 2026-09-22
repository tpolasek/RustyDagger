/**
 * arClanHall - the DOM port of `DCourt.Screens.Areas.Castle.arClanHall`
 * (Java: `Servile Krymps Clan Gathering`).
 *
 * The clan-management screen: petition/join/quit/create/disband plus the
 * leader's petition inbox (peer/next/grant/deny).  The state machine
 * (`heroStatus` 1..3, `clanStatus` 0..2), all costs/quest gates and every
 * message are kept verbatim.
 *
 * Port notes:
 *  - `createTools()` runs on the first `init()` (see ui/screen.ts), so
 *    `init()` calls `super.init()` before `findNextPetition()` to keep
 *    `heroStatus` known when `showPetitions` is computed.
 *  - Java's `findClanInfo()` called `repaint()` in the middle of
 *    `createTools()`; the DOM `repaint()` is synchronous and would run before
 *    the checkbox group exists, so that call is dropped (the `init()` repaint
 *    renders the same final state).
 *  - Java's `gainExp/gainWits/gainCharm` calls were embedded in dead
 *    `String.valueOf` expressions; they have side effects, so they are kept as
 *    statements (their text is appended only where Java appended it).
 */

import { Tools } from "../../../Tools/Tools";
import { Constants } from "../../../Static/Constants";
import { GameStrings } from "../../../Static/GameStrings";
import { Loader } from "../../../Tools/Loader";
import { MadLib } from "../../../Tools/MadLib";
import { Screen } from "../../../ui/screen";
import { Button } from "../../../ui/button";
import { Checkbox, CheckboxGroup } from "../../../ui/checkbox";
import { FTextField } from "../../../ui/textField";
import { color } from "../../../ui/dom";
import type { GameEvent } from "../../../ui/widget";
import { Indoors } from "../../Template/Indoors";
import { arNotice } from "../../Utility/arNotice";
import { arPackage } from "../../Utility/arPackage";
import { arPeer } from "../../Utility/arPeer";
import { itAgent } from "../../../Items/List/itAgent";
import { itValue } from "../../../Items/Token/itValue";
import { itList } from "../../../Items/itList";
import { itNote } from "../../../Items/List/itNote";

const JOIN_QUESTS = 1;
const JOIN_COSTS = 1000;
const QUIT_QUESTS = 5;
const QUIT_COSTS = 5000;
const DISBAND_QUESTS = 15;
const DISBAND_COSTS = 50000;
const CREATE_QUESTS = 75;
const CREATE_COSTS = 250000;

const CLANLESS = 1;
const MEMBER = 2;
const LEADER = 3;

/** Java `arClanHall.greeting`. */
const greeting: string[] = [
  "",
  "Yes, your Lordship?",
  "What are your wishes?",
  "How may I assist you?",
  "May I help you, sir?",
  "Leadership is a Burden",
  "Think carefully my lord",
  "Deliberation is a Virtue",
  "Be Wary of Usurpers",
];

const leaveClan =
  "\tIt is with bitter regret (and an empty purse) that you turn your back on the men who have been your comrades since adolescence.\n\n\t*** STATUS = CLANLESS ***\n";
const petitionMsg =
  "$TB$Your petition has been sent to $leader$, current leader of the $clan$ clan.  He will need time to consider your plea, and will hopefully respond by sending you a Grant to Join.";
const denyHead = "You draft the following missive:\n\n";
const denyMsg =
  "$today$\n\tMy Dear $name$\n\tHaving duly considered your proposal, I have come to the conclusion that you are not currently a suitable candidate for the $clan$ Clan.\n\tThere is nodoby else.  It's not you, it's us. Let's just be good friends.\n\tSincerely,\n\t$leader$";
const createMsg =
  '$TB$You labor tirelessly for the inauguration. You find a celebration hall and send out hundreds of invitations.  You hire musicians, actors, jugglers, magicians, and Moorish dancers.  You employ Orcish bouncers, Elvin chefs, Human waiters,  and Dwarven janitors.$CR$$TB$Finally, the great day comes.  Nobles from accross the kingdom are in attendance when $ruler$ makes the grand announcement: $TB$"On This Day, Clan $clan$ is Born!"$CR$';
const disbandMsg =
  "$TB$With quiet dignity, you settle the affairs of Clan $clan$. All outstanding bills are paid.  The clan hall is closed to business. A sad note is sent to $ruler$ begging out of future court functions. $CR$$TB$The final day arrives.  Without fanfare, you pack your bags and move out of the castle.$CR$$TB$$leader$ lives here no longer...";
const grantMsg =
  "\tYou compose an elegant message accepting $name$'s petition.  The hero will recieve your message upon the morrow, and should merge with the $clan$ Clan soon after.";
const reinstateMsg =
  "$TB$Servile Krymp pales with horror!$CR$$TB$\"Your Lordship,\" he whimpers, \"There has been a terrible mistake.\"  He cowers before you and cringes from your every move. \"We will rectify this error instantly.  Please don't tell $ruler$.$CR$$CR$$TB$$leader$ has been reinstated as leader of Clan $clan$.";

const joinStr = "{1}Petition To Join $1000";
const quitStr = "{5}Quit My Clan $5000";
const createStr = "{75}Create A Clan $250k";
const disbandStr = "{15}Destroy My Clan $50000";

export class arClanHall extends Indoors {
  private clantext: FTextField | null = null;
  private current: string | null = null;
  private leader: string | null = null;
  private ability: string = Constants.NONE;
  private members = 0;
  private power = 0;
  private petitionID = -1;
  private enact!: Button;
  private peer: Button | null = null;
  private next: Button | null = null;
  private grant: Button | null = null;
  private deny: Button | null = null;
  private clanAction!: CheckboxGroup;
  private join: Checkbox | null = null;
  private quit: Checkbox | null = null;
  private member: Checkbox | null = null;
  private create: Checkbox | null = null;
  private confirm!: Checkbox;
  private showPetitions = false;
  private petition: itValue | null = null;
  private heroStatus = 0;
  private clanStatus = 0;

  constructor(from: Screen | null) {
    super(from, "Servile Krymps Clan Gathering");
    this.setBackground(color(255, 255, 128));
    this.setForeground(color(96, 96, 0));
    this.setFont(Tools.courtF);
  }

  /** Java `getFace()`. */
  override getFace(): string {
    return "Faces/Serville.jpg";
  }

  /** Java `getGreeting()`. */
  override getGreeting(): string {
    const msg = Tools.select(greeting);
    return msg.length === 0 ? Tools.getBest() + " was just here" : msg;
  }

  /** Java `init()`. */
  override init(): void {
    this.petitionID = -1;
    super.init();
    this.findNextPetition();
    this.showPetitions = this.heroStatus === LEADER || this.petition !== null;
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    const h = Screen.getHero();
    const act = this.clanAction.getCurrent();
    super.localPaint();
    this.label(">>> " + h.getTitle() + h.getName(), 180, 60, { font: Tools.textF });
    if (this.clanStatus === 0) {
      this.label("Enter a Clan Name", 180, 120);
    } else if (this.clanStatus === 2) {
      this.label("No Clan Found", 180, 120);
    } else {
      if (this.heroStatus !== CLANLESS) this.label("Clan: " + this.current, 180, 80);
      this.label("Leader: " + this.leader, 180, 100);
      this.label("Men: " + this.members + "  Power: " + this.power, 180, 120);
      this.label("Abilities: " + this.ability, 180, 140);
    }
    if (act === this.create && h.getSocial() < 2) {
      this.label("Must be a Baron", 180, 200);
      this.label("to Create a Clan", 200, 220);
    }
    if (act === this.member) {
      this.fill(170, 150, 225, 50, color(255, 196, 196));
      if (this.petition === null) {
        this.label("No Petitions Outstanding", 180, 170);
      } else {
        this.label("Petition from " + this.petition.getValue(), 180, 170);
      }
    }
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) return true;

    if (e.target === this.enact) {
      const act = this.clanAction.getCurrent();
      if (act === this.join) Tools.setRegion(this.petitionClan());
      if (act === this.create) Tools.setRegion(this.createClan());
      if (act === this.quit) {
        if (this.heroStatus === LEADER) Tools.setRegion(this.disbandClan());
        else Tools.setRegion(this.quitClan());
      }
    }
    if (e.target !== this.confirm) this.confirm.setState(false);
    if (e.target === this.clantext && this.clantext !== null) {
      this.findClanInfo(this.clantext.getText());
    }
    if (e.target === this.getPic(0)) Tools.setRegion(this.getHome());
    if (this.petition !== null) {
      if (e.target === this.peer) Tools.setRegion(new arPeer(this, 4, this.petition.getValue()));
      if (e.target === this.next) this.findNextPetition();
      if (e.target === this.grant) Tools.setRegion(this.grantPetition());
      if (e.target === this.deny) Tools.setRegion(this.denyPetition());
    }
    this.updateTools();
    this.repaint();
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    const h = Screen.getHero();
    const backC = color(255, 255, 128);
    this.findClanInfo(h.getClan());
    if (this.current === null) this.heroStatus = CLANLESS;
    else if (!h.isMatch(this.leader)) this.heroStatus = MEMBER;
    else this.heroStatus = LEADER;

    this.enact = new Button();
    this.enact.reshape(170, 160, 220, 25);
    this.enact.setFont(Tools.statusF);
    this.enact.show(false);
    this.confirm = new Checkbox();
    this.confirm.reshape(180, 240, 200, 20);
    this.confirm.setFont(Tools.textF);
    this.confirm.show(false);

    if (this.heroStatus !== LEADER) {
      const clan = h.getClan();
      this.clantext = new FTextField(clan == null ? Constants.NONE : String(clan), 40);
      this.clantext.reshape(180, 63, 200, 20);
      this.clantext.setFont(Tools.textF);
    }

    this.clanAction = new CheckboxGroup();
    this.member = null;
    this.create = null;
    this.quit = null;
    this.join = null;
    if (this.heroStatus === LEADER) {
      this.member = new Checkbox("Members", this.clanAction, true);
      this.member.reshape(200, 205, 80, 25);
      this.quit = new Checkbox("Quit", this.clanAction, false);
      this.quit.reshape(280, 205, 80, 25);
    }
    if (this.heroStatus === MEMBER) {
      this.quit = new Checkbox("Quit", this.clanAction, true);
      this.quit.reshape(200, 205, 80, 25);
      this.join = new Checkbox("Join", this.clanAction, false);
      this.join.reshape(280, 205, 80, 25);
    }
    if (this.heroStatus === CLANLESS) {
      this.join = new Checkbox("Join", this.clanAction, true);
      this.join.reshape(200, 205, 80, 25);
      this.create = new Checkbox(itAgent.CREATE, this.clanAction, false);
      this.create.reshape(280, 205, 80, 25);
    }

    for (const box of [this.join, this.quit, this.create, this.member]) {
      if (box !== null) {
        box.setFont(Tools.textF);
        box.setBackground(backC);
        box.setForeground(color(0, 0, 0));
      }
    }

    if (this.heroStatus === LEADER) {
      this.peer = new Button("Peer");
      this.peer.setFont(Tools.textF);
      this.peer.reshape(175, 175, 50, 20);
      this.peer.show(false);
      this.next = new Button("Next");
      this.next.setFont(Tools.textF);
      this.next.reshape(230, 175, 50, 20);
      this.next.show(false);
      this.grant = new Button("Grant");
      this.grant.setFont(Tools.textF);
      this.grant.reshape(285, 175, 50, 20);
      this.grant.show(false);
      this.deny = new Button("Deny");
      this.deny.setFont(Tools.textF);
      this.deny.reshape(340, 175, 50, 20);
      this.deny.show(false);
    }
  }

  /** Java `addTools()`. */
  override addTools(): void {
    super.addTools();
    this.add(this.enact);
    this.add(this.confirm);
    if (this.clantext !== null) this.add(this.clantext);
    if (this.join !== null) this.add(this.join);
    if (this.quit !== null) this.add(this.quit);
    if (this.create !== null) this.add(this.create);
    if (this.member !== null) this.add(this.member);
    if (this.heroStatus === LEADER && this.peer !== null && this.next !== null && this.grant !== null && this.deny !== null) {
      this.add(this.peer);
      this.add(this.next);
      this.add(this.grant);
      this.add(this.deny);
    }
    this.updateTools();
  }

  /** Java `updateTools()`. */
  updateTools(): void {
    const h = Screen.getHero();
    this.enact.show(false);
    this.confirm.show(false);
    const act = this.clanAction.getCurrent();
    if (act !== null) {
      if (act === this.join && this.clanStatus === 1) {
        this.enact.setLabel(joinStr);
        this.confirm.setLabel("Make It So - JOIN");
        this.enact.enable(this.confirm.getState() && h.getQuests() >= JOIN_QUESTS && h.getMoney() >= JOIN_COSTS);
        this.enact.show(true);
        this.confirm.show(true);
      }
      if (act === this.quit) {
        if (this.heroStatus === LEADER) {
          this.enact.setLabel(disbandStr);
          this.confirm.setLabel("Make It So - DISBAND");
          this.enact.enable(
            this.confirm.getState() && h.getQuests() >= DISBAND_QUESTS && h.getMoney() >= DISBAND_COSTS,
          );
          this.enact.show(true);
          this.confirm.show(true);
        } else if (this.heroStatus === MEMBER) {
          this.enact.setLabel(quitStr);
          this.confirm.setLabel("Make It So - QUIT");
          this.enact.enable(
            this.confirm.getState() && h.getQuests() >= QUIT_QUESTS && h.getMoney() >= QUIT_COSTS,
          );
          this.enact.show(true);
          this.confirm.show(true);
        }
      }
      if (act === this.create && this.clanStatus === 2) {
        this.enact.setLabel(createStr);
        this.confirm.setLabel("Make It So - CREATE");
        this.enact.enable(
          this.confirm.getState() && h.getQuests() >= CREATE_QUESTS && h.getMoney() >= CREATE_COSTS,
        );
        this.enact.show(true);
        this.confirm.show(true);
      }
      if (this.heroStatus !== LEADER) return;
      if (act === this.member) {
        this.peer?.show(true);
        this.next?.show(true);
        this.grant?.show(true);
        this.deny?.show(true);
        this.enact.show(false);
        this.confirm.show(false);
        return;
      }
      this.peer?.show(false);
      this.next?.show(false);
      this.grant?.show(false);
      this.deny?.show(false);
    }
  }

  /** Java `findClanInfo(String)`. */
  findClanInfo(clan: string | null): void {
    this.clanStatus = 0;
    this.current = clan === null ? null : Tools.detokenize(clan.trim());
    this.power = 0;
    this.members = 0;
    this.ability = Constants.NONE;
    this.leader = Constants.NONE;
    const current = this.current;
    if (current === null || current.length < 1 || Constants.NONE.toUpperCase() === current.toUpperCase()) {
      return;
    }
    // Java called repaint() here; omitted because the DOM repaint is synchronous
    // and createTools() has not finished building clanAction yet.
    const buf = Loader.cgiBuffer(Loader.PEEKCLAN, current);
    if (buf === null || buf.isEmpty() || buf.isError()) {
      this.clanStatus = 2;
      return;
    }
    this.clanStatus = 1;
    this.leader = buf.token();
    if (this.leader === null) this.leader = Constants.NONE;
    if (buf.split()) this.members = buf.num();
    if (buf.split()) this.power = buf.num();
    if (buf.split()) this.ability = buf.token();

    if (this.heroStatus === CLANLESS && Screen.getHero().isMatch(this.leader)) {
      Screen.getHero().setClan(current);
      const sent = new MadLib(reinstateMsg);
      sent.replace("$leader$", this.leader);
      sent.replace("$clan$", current);
      sent.replace("$ruler$", "Queen Beth");
      Tools.setRegion(new arNotice(this.getHome(), sent.getText()));
    }
  }

  /** Java `quitClan()`. */
  quitClan(): Screen | null {
    const h = Screen.getHero();
    const oldClan = h.getClan();
    if (oldClan === null || h.getQuests() < QUIT_QUESTS || h.getMoney() < QUIT_COSTS) return null;
    h.setClan(null);
    h.subMoney(QUIT_COSTS);
    h.addFatigue(5);
    if (!Screen.saveHero()) {
      h.setClan(oldClan);
      h.addMoney(QUIT_COSTS);
      h.subFatigue(5);
      return new arNotice(this, GameStrings.SAVE_CANCEL);
    }
    // Java embedded these in a dead String expression; they still mutate the hero.
    h.gainExp(h.getLevel());
    h.gainWits(25);
    h.gainCharm(25);
    return new arNotice(this.getHome(), leaveClan);
  }

  /** Java `createClan()`. */
  createClan(): Screen | null {
    const h = Screen.getHero();
    const current = this.current;
    if (current === null || h.getQuests() < CREATE_QUESTS || h.getMoney() < CREATE_COSTS) return null;
    const oldClan = h.getClan();
    h.setClan(current);
    h.subMoney(CREATE_COSTS);
    h.addFatigue(CREATE_QUESTS);
    if (!Screen.saveHero()) {
      h.subFatigue(CREATE_QUESTS);
      h.addMoney(CREATE_COSTS);
      h.setClan(oldClan);
      return new arNotice(this, GameStrings.SAVE_CANCEL);
    }
    const buf = Loader.cgiBuffer(
      Loader.MAKECLAN,
      h.getName() + "|" + Screen.getPlayer().getSessionID() + "|" + current,
    );
    if (buf === null || buf.isError()) {
      h.subFatigue(CREATE_QUESTS);
      h.addMoney(CREATE_COSTS);
      h.setClan(oldClan);
      return new arNotice(this, GameStrings.SAVE_CANCEL);
    }
    const sent = new MadLib(createMsg);
    sent.replace("$leader$", this.leader ?? Constants.NONE);
    sent.replace("$clan$", current);
    sent.replace("$ruler$", "Queen Beth");
    const msg = sent.getText() + h.gainExp(h.getLevel() * h.getLevel() * 10);
    return new arNotice(this.getHome(), msg + h.gainWits(500) + h.gainCharm(500));
  }

  /** Java `disbandClan()`. */
  disbandClan(): Screen | null {
    const h = Screen.getHero();
    const current = this.current;
    if (current === null || h.getQuests() < DISBAND_QUESTS || h.getMoney() < DISBAND_COSTS) return null;
    const oldClan = h.getClan();
    h.setClan(current);
    h.subMoney(DISBAND_COSTS);
    h.addFatigue(15);
    if (!Screen.saveHero()) {
      h.subFatigue(15);
      h.addMoney(DISBAND_COSTS);
      h.setClan(oldClan);
      return new arNotice(this, GameStrings.SAVE_CANCEL);
    }
    const buf = Loader.cgiBuffer(
      Loader.KILLCLAN,
      h.getName() + "|" + Screen.getPlayer().getSessionID() + "|" + current,
    );
    if (buf === null || buf.isError()) {
      h.subFatigue(15);
      h.addMoney(DISBAND_COSTS);
      h.setClan(oldClan);
      return new arNotice(this, GameStrings.SAVE_CANCEL);
    }
    const sent = new MadLib(disbandMsg);
    sent.replace("$leader$", this.leader ?? Constants.NONE);
    sent.replace("$clan$", current);
    sent.replace("$ruler$", "Queen Beth");
    const msg = sent.getText() + h.gainExp(h.getLevel() * h.getLevel() + 10);
    return new arNotice(this.getHome(), msg + h.gainWits(100) + h.gainCharm(100));
  }

  /** Java `petitionClan()`. */
  petitionClan(): Screen | null {
    const h = Screen.getHero();
    if (this.current === null || this.clanStatus !== 1 || h.getQuests() < JOIN_QUESTS || h.getMoney() < JOIN_COSTS) {
      return null;
    }
    h.subMoney(JOIN_COSTS);
    h.addFatigue(1);
    if (!Screen.saveHero()) {
      h.addMoney(JOIN_COSTS);
      h.subFatigue(1);
      return new arNotice(this, GameStrings.SAVE_CANCEL);
    }
    const mail = new itList(Constants.MAIL);
    mail.append(new itNote("Petition", h.getName(), "Sire,\nI wish to join thy guild.\nThankee"));
    const result = arPackage.send(h.getTitle() + h.getName(), this.leader ?? Constants.NONE, mail);
    if (result !== null) {
      h.addMoney(JOIN_COSTS);
      h.subFatigue(1);
      return new arNotice(this, GameStrings.MAIL_CANCEL + result);
    }
    const sent = new MadLib(petitionMsg);
    sent.replace("$leader$", this.leader ?? Constants.NONE);
    sent.replace("$clan$", this.current);
    return new arNotice(this.getHome(), sent.getText());
  }

  /** Java `findNextPetition()`. */
  findNextPetition(): void {
    const it = Screen.getPack().select("Petition", this.petitionID + 1);
    if (it !== null && it !== undefined && it instanceof itValue) {
      this.petitionID++;
      this.petition = it;
    } else if (this.petitionID < 0) {
      this.petition = null;
    } else {
      const it2 = Screen.getPack().select("Petition", 0);
      if (it2 instanceof itValue) {
        this.petitionID = 0;
        this.petition = it2;
        return;
      }
      this.petition = null;
    }
  }

  /** Java `grantPetition()`. */
  grantPetition(): Screen | null {
    const hero = Screen.getHero();
    const petition = this.petition;
    if (petition === null) return null;
    const who = petition.getValue() ?? "";
    Screen.subPack(petition);
    if (!Screen.saveHero()) {
      Screen.putPack(petition);
      return new arNotice(this, GameStrings.SAVE_CANCEL);
    }
    const mail = new itList(Constants.MAIL);
    mail.append(
      new itNote(
        "Grant",
        String(hero.getClan() ?? Constants.NONE),
        "Greetings,\nIt is my pleasure to welcome you to our guild.\nGuildmaster",
      ),
    );
    const result = arPackage.send(hero.getTitle() + hero.getName(), who, mail);
    if (result !== null) {
      Screen.putPack(petition);
      return new arNotice(this, GameStrings.MAIL_CANCEL + result);
    }
    const sent = new MadLib(grantMsg);
    sent.replace("$name$", who);
    sent.replace("$clan$", String(hero.getClan() ?? Constants.NONE));
    return new arNotice(this, sent.getText());
  }

  /** Java `denyPetition()`. */
  denyPetition(): Screen | null {
    const h = Tools.getHero();
    const petition = this.petition;
    if (petition === null) return null;
    const who = petition.getValue() ?? "";
    Screen.subPack(petition);
    if (!Screen.saveHero()) {
      Screen.putPack(petition);
      return new arNotice(this, GameStrings.SAVE_CANCEL);
    }
    const msg = new MadLib(denyMsg);
    msg.replace("$today$", Tools.getToday());
    msg.replace("$name$", who);
    msg.replace("$clan$", String(h.getClan() ?? Constants.NONE));
    msg.replace("$leader$", h.getTitle() + h.getName());
    const mail = new itList(Constants.MAIL);
    mail.append(new itNote("Denial", h.getName(), msg.getText()));
    const result = arPackage.send(h.getTitle() + h.getName(), who, mail);
    if (result === null) return new arNotice(this, denyHead + msg.getText());
    Screen.putPack(petition);
    return new arNotice(this, GameStrings.MAIL_CANCEL + result);
  }
}
