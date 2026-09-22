/**
 * StatusPic - the shared bottom status strip (`DCourt.Tools.StatusPic`).
 *
 * Java: a 400x35 Portrait at y=265 that draws Status.gif and two lines of hero
 * statistics; clicking it opens the status screen (handled by `Screen.action`
 * comparing `e.target` against `Tools.statusPic`).  Java switched the second
 * line on `Tools.getRegion() instanceof arMound / arHills`; here that check goes
 * through {@link regionIs} so no concrete screen is imported.
 */

import { type ColorSpec, DEFAULT_WIDTH, baselineTop, div } from "./dom";
import { Widget } from "./widget";
import { loadImage, resourceUrl } from "./resources";
import { getHero, getStatusPic, setStatusPic } from "./session";
import { regionIs } from "./stage";

const HEIGHT = 35;
const CAPTION_TOP = 265;

export class StatusPic extends Widget {
  private line1: HTMLDivElement;
  private line2: HTMLDivElement;
  private color: ColorSpec = "#ffffff";

  constructor(x = 0, y = CAPTION_TOP, w = DEFAULT_WIDTH, h = HEIGHT) {
    super(div("status-pic"));
    this.setBounds(x, y, w, h);
    this.el.style.background = `url("${resourceUrl("Status.gif")}")`;
    this.el.style.backgroundSize = "100% 100%";
    this.el.style.backgroundRepeat = "no-repeat";
    this.el.style.cursor = "pointer";

    // Java painted both lines with Tools.textF at baselines 15 and 30.
    this.line1 = div(null, "");
    this.line2 = div(null, "");
    for (const line of [this.line1, this.line2]) {
      line.style.position = "absolute";
      line.style.left = "10px";
      line.style.whiteSpace = "pre";
      line.style.pointerEvents = "none";
      line.style.font = '11px Arial, Helvetica, sans-serif';
      line.style.color = this.color;
      this.el.appendChild(line);
    }
    this.line1.style.top = `${baselineTop("textF", 15)}px`;
    this.line2.style.top = `${baselineTop("textF", 30)}px`;

    this.listen(this.el, "click", () => this.fire());
    this.repaint();
  }

  /** Java `StatusPic.getIcon()` - the cached strip art. */
  getIcon(): HTMLImageElement | null {
    return loadImage("Status.gif");
  }

  /** Re-read the hero and redraw both lines (Java did this in `paint`). */
  override repaint(): void {
    const hero = getHero();
    if (!hero) {
      this.line1.textContent = "";
      this.line2.textContent = "";
      return;
    }
    const wounds = Number(hero.getWounds());
    const guts = Number(hero.getGuts());
    this.line1.textContent =
      `${hero.getTitle()}${hero.getName()}` +
      `  Guts:${guts - wounds}` +
      (wounds < 1 ? "" : `/${guts}`) +
      ` Wits:${hero.getWits()} Charm:${hero.getCharm()}  Cash: $${hero.getMoney()}`;

    const tail = `   Quests:${hero.getQuests()}  Level:${hero.getLevel()}  Exp:${hero.getExp()}  `;
    this.line2.textContent = tail + this.regionTail(hero);
  }

  /** The region-dependent tail of the second line (`StatusPic.paint`). */
  private regionTail(hero: { [key: string]: any }): string {
    if (regionIs("arMound")) {
      if (hero.hasTrait("CatsEyes")) return "Cats Eyes";
      const gear = hero.getGear();
      const glow = gear ? gear.findArms("Glows") : null;
      if (glow) return `glowing ${glow.getName()}`;
      return `Torch (${hero.packCount("Torch")})`;
    }
    if (regionIs("arHills")) {
      if (hero.hasTrait("HillFolk")) return "Hill Folk";
      return `Rope (${hero.packCount("Rope")})`;
    }
    return `${hero.getWeapon()} & ${hero.getArmour()}`;
  }
}

/** The shared strip (`Tools.statusPic`), created on first use. */
export function ensureStatusPic(): StatusPic {
  let pic = getStatusPic();
  if (!pic) {
    pic = new StatusPic();
    setStatusPic(pic);
  }
  return pic;
}

/** The shared strip if it already exists (used by `Screen.action`). */
export function sharedStatusPic(): StatusPic | null {
  return getStatusPic();
}
