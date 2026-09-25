/**
 * Screen - the DOM rewrite of `DCourt.Screens.Screen` (the AWT Panel subclass
 * every screen extends).
 *
 * Mental model (unchanged from Java):
 *  - a screen is a 400x300 absolutely positioned layer inside `#stage`;
 *  - `createTools()` builds the widgets (portraits, buttons, lists ...);
 *  - `addTools()` attaches them to the screen;
 *  - `localPaint()` draws the static text/boxes of the screen background;
 *  - input arrives as `action(e, o)` / `mouseDown(e, x, y)` where `e.target` is
 *    the widget that fired, exactly like AWT's `Event.target`.
 *
 * Two deliberate differences from Java, both forced by the DOM:
 *
 *  1. `createTools()` runs on the **first** `init()` instead of from the
 *     constructor.  TS class-field initializers (and ported constructor bodies)
 *     run *after* `super(...)`, so calling an overridden `createTools()` from
 *     the base constructor would observe half-initialised subclasses.  It still
 *     runs before `addTools()` and before the first paint, and only once per
 *     instance - so the observable order matches Java.
 *  2. `repaint()` is synchronous: it clears the paint layer and calls
 *     `localPaint()` immediately.
 *
 * The base class never imports a concrete screen: the status screen is reached
 * through a factory registered by Phase 5 (`session.setStatusScreenFactory`).
 */

import {
  COLORS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  type ColorSpec,
  type FontName,
  type RectLike,
  type TextOptions,
  assignRect,
  boxEl,
  div,
  textEl,
} from "./dom";
import { imageElement } from "./resources";
import { Portrait } from "./portrait";
import { EVENT_ACTION, EVENT_MOUSE_DOWN, Widget, type GameEvent, gameEvent } from "./widget";
import { ensureStatusPic, sharedStatusPic } from "./statusPic";
import * as session from "./session";
import type { HeroLike, ItemLike, ListLike, PlayerLike } from "./session";
import { coordsIn, movedAway as stageMovedAway, setRegion } from "./stage";

export abstract class Screen {
  /** Java `Tools.DEFAULT_WIDTH` / `HEIGHT`. */
  static readonly WIDTH = DEFAULT_WIDTH;
  static readonly HEIGHT = DEFAULT_HEIGHT;

  /** Root layer of this screen (Java: the Panel added to the applet). */
  readonly root: HTMLDivElement;

  /** Layer rebuilt by every `paint()`; sits behind the widgets. */
  readonly paintLayer: HTMLDivElement;

  /** Optional region kind tag used by `regionIs("arMound")` style checks. */
  kind?: string;

  private readonly abort = new AbortController();
  private readonly title: string;
  private home: Screen | null;
  private readonly widgets: Widget[] = [];
  private pics: Portrait[] | null = null;
  private statusBar = true;
  private toolsCreated = false;
  private defaultFont: FontName = "courtF";
  private foreground: ColorSpec = COLORS.black;
  private background: ColorSpec = COLORS.fill;

  /**
   * Java overloads:
   *   new Screen()                    -> "Default Screen"
   *   new Screen(from)                -> "Default Screen"
   *   new Screen(name)                -> name
   *   new Screen(from, name)          -> name
   * Subclasses call `super(from, "Title")` or `super("Title")`.
   */
  constructor(from?: Screen | string | null, name?: string) {
    let home: Screen | null = null;
    let title = "Default Screen";
    if (typeof from === "string") {
      title = from;
    } else if (from) {
      home = from;
      title = name ?? "Default Screen";
    } else if (name !== undefined) {
      title = name;
    }
    this.home = home;
    this.title = title;

    this.root = div("screen");
    this.root.style.background = this.background;
    this.paintLayer = div(null);
    this.paintLayer.style.position = "absolute";
    this.paintLayer.style.left = "0";
    this.paintLayer.style.top = "0";
    this.paintLayer.style.width = `${DEFAULT_WIDTH}px`;
    this.paintLayer.style.height = `${DEFAULT_HEIGHT}px`;
    this.paintLayer.style.pointerEvents = "none";
    this.root.appendChild(this.paintLayer);

    this.root.addEventListener("mousedown", this.onRootDown, { signal: this.abort.signal });
  }

  /* ------------------------------------------------------------ naming */

  /** Java `Screen.toString()`. */
  toString(): string {
    return this.title;
  }

  /** Java `Screen.getTitle()`. */
  getTitle(): string {
    return this.title;
  }

  /** Java `Screen.getHome()`. */
  getHome(): Screen | null {
    return this.home;
  }

  /** Java `Screen.setHome(Screen)`. */
  setHome(next: Screen | null): void {
    this.home = next;
  }

  /* --------------------------------------------------------- lifecycle */

  /**
   * Java `Screen.init()`: (re)build the screen contents.  Called by
   * `Stage.setRegion` every time this screen becomes the active region.
   */
  init(): void {
    if (!this.toolsCreated) {
      this.toolsCreated = true;
      this.createTools();
    }
    this.clearWidgets();
    this.addTools();
    if (this.pics) {
      for (const pic of this.pics) {
        pic.host = this;
        pic.mount(this.root);
      }
    }
    if (this.statusBar) {
      const strip = ensureStatusPic();
      strip.host = this;
      strip.mount(this.root);
    }
    this.repaint();
  }

  /** Java `Screen.questInit()` - level-up bookkeeping before a quest. */
  questInit(): void {
    Screen.getHero().tryToLevel(this);
  }

  /** Java `Screen.createTools()` - override to build widgets. */
  createTools(): void {}

  /** Java `Screen.addTools()` - override to `add()` the widgets. */
  addTools(): void {}

  /** Java `Screen.hideStatusBar()`. */
  hideStatusBar(): void {
    this.statusBar = false;
  }

  /** True when the bottom status strip is shown. */
  hasStatusBar(): boolean {
    return this.statusBar;
  }

  /** Java `Screen.updatePack()` - no-op hook overridden by shops. */
  updatePack(): void {}

  /* ---------------------------------------------------------- painting */

  /** Repaint the screen: background text first, then every widget. */
  repaint(): void {
    this.paint();
    for (const w of this.widgets) w.repaint();
    if (this.statusBar) sharedStatusPic()?.repaint();
  }

  /** Java `Screen.update(Graphics)`: repaint this screen. */
  update(): void {
    this.paint();
  }

  /** Java `Screen.paint(Graphics)`: redraw the background layer. */
  paint(): void {
    this.paintLayer.replaceChildren();
    this.localPaint();
  }

  /** Java `Screen.localPaint(Graphics)`: override to draw the screen. */
  localPaint(): void {
    this.label(this.title, 10, 20, { font: "courtF", color: this.foreground });
  }

  /** Java `Component.setFont` - the default font for `label()` calls. */
  setFont(font: FontName): void {
    this.defaultFont = font;
  }

  /** The screen's current default font slot. */
  getFont(): FontName {
    return this.defaultFont;
  }

  /** Java `Component.setForeground` - the default text color. */
  setForeground(col: ColorSpec): void {
    this.foreground = col;
  }

  /** Java `Component.getForeground`. */
  getForeground(): ColorSpec {
    return this.foreground;
  }

  /** Java `Component.setBackground`. */
  setBackground(col: ColorSpec): void {
    this.background = col;
    this.root.style.background = col;
  }

  /** Java `Component.getBackground`. */
  getBackground(): ColorSpec {
    return this.background;
  }

  /* ------------------------------------------------- painting helpers */

  /** Positioned text at a Java baseline (uses `drawString` coordinates). */
  label(msg: string, x: number, y: number, opts: TextOptions = {}): HTMLDivElement {
    const node = textEl(msg, x, y, {
      ...opts,
      font: opts.font ?? this.defaultFont,
      color: opts.color ?? this.foreground,
    });
    this.paintLayer.appendChild(node);
    return node;
  }

  /** `DrawTools.center(g, msg, x, y)`. */
  center(msg: string, x: number, y: number, opts: TextOptions = {}): HTMLDivElement {
    return this.label(msg, x, y, { ...opts, align: "center" });
  }

  /** `DrawTools.right(g, msg, x, y)`. */
  alignRight(msg: string, x: number, y: number, opts: TextOptions = {}): HTMLDivElement {
    return this.label(msg, x, y, { ...opts, align: "right" });
  }

  /** `DrawTools.sink(g, back, r)` / `FTools.drawSink` - inset chrome. */
  sink(x: number, y: number, w: number, h: number, background?: ColorSpec): HTMLDivElement {
    const node = boxEl(x, y, w, h, "in");
    if (background) node.style.background = background;
    this.paintLayer.appendChild(node);
    return node;
  }

  /** `DrawTools.bar(g, back, r)` / `FTools.drawBar` - outset chrome. */
  bar(x: number, y: number, w: number, h: number, background?: ColorSpec): HTMLDivElement {
    const node = boxEl(x, y, w, h, "out");
    if (background) node.style.background = background;
    this.paintLayer.appendChild(node);
    return node;
  }

  /** `g.fillRect(x, y, w, h)` with `g.setColor(...)`. */
  fill(x: number, y: number, w: number, h: number, background: ColorSpec): HTMLDivElement {
    const node = div(null);
    node.style.position = "absolute";
    assignRect(node, { x, y, width: w, height: h });
    node.style.background = background;
    this.paintLayer.appendChild(node);
    return node;
  }

  /** `g.drawImage(img, x, y, w, h)` for background art. */
  image(path: string, x: number, y: number, w: number, h: number): HTMLImageElement {
    const node = imageElement(path, x, y, w, h);
    this.paintLayer.appendChild(node);
    return node;
  }

  /** `g.drawRect` outline. */
  outline(x: number, y: number, w: number, h: number, stroke: ColorSpec = COLORS.black): HTMLDivElement {
    const node = div(null);
    assignRect(node, { x, y, width: w, height: h });
    node.style.border = `1px solid ${stroke}`;
    this.paintLayer.appendChild(node);
    return node;
  }

  /* -------------------------------------------------------- components */

  /** Java `Container.add(Component)`. */
  add(widget: Widget): void {
    this.widgets.push(widget);
    widget.host = this;
    widget.mount(this.root);
  }

  /** Java `Container.removeAll()`. */
  removeAll(): void {
    this.clearWidgets();
    this.root.replaceChildren(this.paintLayer);
  }

  protected clearWidgets(): void {
    this.widgets.length = 0;
    this.root.replaceChildren(this.paintLayer);
  }

  /** Java `Screen.addPic(Portrait)`. */
  addPic(pic: Portrait): void {
    if (!this.pics) this.pics = [];
    this.pics.push(pic);
  }

  /** Java `Screen.getPic(int)`: the portrait at `ix`, or null. */
  getPic(ix: number): Portrait | null;
  /** Java `Screen.getPic(Object)`: the index of `pic`, or -1. */
  getPic(pic: Portrait): number;
  /** Java `Screen.getPic(Object)` for untyped targets (`getPic(e.target)`). */
  getPic(obj: unknown): number;
  getPic(ixOrObj: unknown): Portrait | number | null {
    if (typeof ixOrObj === "number") {
      if (!this.pics || ixOrObj < 0 || ixOrObj >= this.pics.length) return null;
      return this.pics[ixOrObj] ?? null;
    }
    if (!this.pics) return -1;
    return this.pics.indexOf(ixOrObj as Portrait);
  }

  /** Every portrait on this screen (Java's `pics` Vector). */
  getPics(): readonly Portrait[] {
    return this.pics ?? [];
  }

  /* ------------------------------------------------------------ input */

  private readonly onRootDown = (ev: Event): void => {
    const me = ev as MouseEvent;
    const pt = coordsIn(me, this.root);
    this.mouseDown(gameEvent(this, EVENT_MOUSE_DOWN, pt.x, pt.y), pt.x, pt.y);
  };

  /**
   * Java `Screen.action(Event e, Object o)`.
   *
   * `e.target` is the widget that fired, so ported bodies keep their shape:
   *   if (e.target === this.save) { ... }
   */
  action(e: GameEvent, o?: unknown): boolean {
    if (e.target !== sharedStatusPic()) return true;
    const next = session.openStatusScreen(this);
    if (next) setRegion(next);
    else console.warn("[DCourt] status screen factory is not registered");
    return true;
  }

  /** Java `Screen.mouseDown(Event e, int x, int y)`. */
  mouseDown(e: GameEvent, x: number, y: number): boolean {
    const next = this.down(x, y);
    if (next === null) {
      this.action(gameEvent(this, EVENT_ACTION, x, y), null);
      return true;
    }
    setRegion(next);
    return true;
  }

  /** Java `Screen.down(int x, int y)`: override to route map clicks. */
  down(x: number, y: number): Screen | null {
    return null;
  }

  /** Detach the screen's listeners (only used when a screen is discarded). */
  destroy(): void {
    this.abort.abort();
    for (const w of this.widgets) w.destroy();
  }

  /* ------------------------------------------------------- hero facade */

  /**
   * Java `Tools.getHero()`.  Java dereferenced the hero without a null check
   * (a null player was an NPE), so this throws when nothing is loaded; use
   * `heroOrNull()` for the few places that legitimately test for it.
   */
  static getHero(): HeroLike {
    const hero = session.getHero();
    if (!hero) throw new Error("Screen.getHero(): no hero is loaded");
    return hero;
  }

  /** Nullable hero access (arRanking / StatusPic test for it). */
  static heroOrNull(): HeroLike | null {
    return session.getHero();
  }

  /** Java `Screen.getPlayer()`; throws when no player is installed. */
  static getPlayer(): PlayerLike {
    const player = session.getPlayer();
    if (!player) throw new Error("Screen.getPlayer(): no player is loaded");
    return player;
  }

  /** Nullable player access. */
  static playerOrNull(): PlayerLike | null {
    return session.getPlayer();
  }

  /** Java `Screen.tryToExit(where, loc, cost)`. */
  static tryToExit(where: Screen, loc: string, cost: number): Screen | null {
    return session.tryToExit(where, loc, cost);
  }

  /** Java `Screen.getSessionID()`. */
  static getSessionID(): number {
    return session.getSessionID();
  }

  /** Java `Screen.getBest()`. */
  static getBest(): string {
    return session.getBest();
  }

  /** Java `Screen.getLeader()`. */
  static getLeader(): string {
    return session.getLeader();
  }

  /** Java `Screen.saveHero()`. */
  static saveHero(): boolean {
    return session.saveHero();
  }

  /** Java `Screen.getState()`. */
  static getState(): string {
    return String(Screen.getHero().getState());
  }

  /** Java `Screen.setState(String)`. */
  static setState(val: string): void {
    Screen.getHero().setState(val);
  }

  /** Java `Screen.getGuts()`. */
  static getGuts(): number {
    return Number(Screen.getHero().getGuts());
  }

  /** Java `Screen.getWits()`. */
  static getWits(): number {
    return Number(Screen.getHero().getWits());
  }

  /** Java `Screen.getCharm()`. */
  static getCharm(): number {
    return Number(Screen.getHero().getCharm());
  }

  /** Java `Screen.getQuests()`. */
  static getQuests(): number {
    return Number(Screen.getHero().getQuests());
  }

  /** Java `Screen.getLevel()`. */
  static getLevel(): number {
    return Number(Screen.getHero().getLevel());
  }

  /** Java `Screen.getSocial()`. */
  static getSocial(): number {
    return Number(Screen.getHero().getSocial());
  }

  /** Java `Screen.getPlace()`. */
  static getPlace(): string {
    return String(Screen.getHero().getPlace());
  }

  /** Java `Screen.setPlace(String)`. */
  static setPlace(val: string): void {
    Screen.getHero().setPlace(val);
  }

  /** Java `Screen.getActions()`. */
  static getActions(): ListLike {
    return Screen.getHero().getActions();
  }

  /** Java `Screen.getGear()`. */
  static getGear(): ListLike {
    return Screen.getHero().getGear();
  }

  /** Java `Screen.getStatus()`. */
  static getStatus(): ListLike {
    return Screen.getHero().getStatus();
  }

  /** Java `Screen.getPack()`. */
  static getPack(): ListLike {
    return Screen.getHero().getPack();
  }

  /** Java `Screen.getStore()`. */
  static getStore(): ListLike {
    return Screen.getHero().getStore();
  }

  /** Java `Screen.packCount(Item|String)`. */
  static packCount(itOrId: ItemLike | string): number {
    const id = typeof itOrId === "string" ? itOrId : String(itOrId.getName());
    return Number(Screen.getHero().packCount(id));
  }

  /** Java `Screen.hasTrait(String)`. */
  static hasTrait(val: string): boolean {
    return Boolean(Screen.getHero().hasTrait(val));
  }

  /** Java `Screen.findGearTrait(String)`. */
  static findGearTrait(val: string): ItemLike | null {
    return (Screen.getHero().findGearTrait(val) ?? null) as ItemLike | null;
  }

  /** Java `Screen.getMoney()`. */
  static getMoney(): number {
    return Number(Screen.getHero().getMoney());
  }

  /** Java `Screen.addMoney(int)`. */
  static addMoney(val: number): number {
    return Number(Screen.getHero().addMoney(val));
  }

  /** Java `Screen.subMoney(int)`. */
  static subMoney(val: number): number {
    return Number(Screen.getHero().subMoney(val));
  }

  /** Java `Screen.addFatigue(int)`. */
  static addFatigue(val: number): number {
    return Number(Screen.getHero().addFatigue(val));
  }

  /** Java `Screen.subFatigue(int)`. */
  static subFatigue(val: number): number {
    return Number(Screen.getHero().subFatigue(val));
  }

  /**
   * Java `Screen.addPack(String, int)` and `addPack(Item)`.
   * The string form checks `GearTable.find(id)` first and returns 0 when the
   * item is unknown; the item form silently ignores unknown items.
   */
  static addPack(idOrItem: ItemLike | string, num = 1): number {
    if (typeof idOrItem === "string") {
      if (!session.gearFind(idOrItem)) return 0;
      return Number(Screen.getHero().addPack(idOrItem, num));
    }
    if (session.gearFind(idOrItem)) Screen.getHero().addPack(idOrItem);
    return 0;
  }

  /** Java `Screen.putPack(Item)`. */
  static putPack(it: ItemLike): void {
    if (session.gearFind(it)) Screen.getHero().putPack(it);
  }

  /** Java `Screen.subPack(String, int)` and `subPack(Item)`. */
  static subPack(idOrItem: ItemLike | string, num = 1): number {
    if (typeof idOrItem === "string") return Number(Screen.getHero().subPack(idOrItem, num));
    Screen.getHero().subPack(idOrItem);
    return 0;
  }

  /** Java `Screen.selectPack(int)`. */
  static selectPack(ix: number): ItemLike | null {
    return (Screen.getHero().selectPack(ix) ?? null) as ItemLike | null;
  }

  /** Java `Screen.firstPack(String)`. */
  static firstPack(id: string): number {
    return Number(Screen.getHero().firstPack(id));
  }

  /** Java `Screen.indexPack(Item)`. */
  static indexPack(it: ItemLike): number {
    return Number(Screen.getHero().indexPack(it));
  }

  /** Java `Screen.findBeast(String)` -> `MonsterTable.find(key)`. */
  static findBeast(key: string): ItemLike | null {
    return session.findMonster(key);
  }

  /** Java `Screen.packString(String entry, itList list)`. */
  static packString(entry: string, list: ListLike | null): string {
    if (!list || Number(list.getCount()) < 1) return "";
    let msg = `${entry}\n`;
    for (let ix = 0; ix < Number(list.getCount()); ix++) {
      msg += `     ${list.select(ix).toLoot()}\n`;
    }
    return msg;
  }

  /** Java `Tools.movedAway(this)`. */
  protected movedAway(): boolean {
    return stageMovedAway(this);
  }

  /** Bounds of the screen in logical pixels. */
  bounds(): RectLike {
    return { x: 0, y: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }
}
