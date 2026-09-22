/**
 * Barrel for the DOM UI framework (`src/ts/DCourt/ui`).
 *
 * Import order / dependency direction (kept acyclic on purpose):
 *
 *   dom.ts        no imports                      - geometry, fonts, colors, bevels
 *   resources.ts  no imports                      - HTMLImageElement cache
 *   session.ts    type-only ui/screen             - loose game-state registry
 *   widget.ts     dom                             - Widget base + GameEvent
 *   stage.ts      dom + type-only ui/screen       - #stage, setRegion, coords
 *   screen.ts     dom, widget, portrait, statusPic, session, stage
 *   portrait.ts   dom, widget, resources
 *   statusPic.ts  dom, widget, resources, session, stage
 *   button.ts / checkbox.ts / textField.ts / textArea.ts / textList.ts
 *   options.ts    dom, widget, Tools (RNG only)
 *
 * `ui/` never imports `DCourt.Screens.*`; the two screen-dependent behaviours
 * (the status screen, rankings) go through hooks registered by later phases.
 *
 * Typical screen port:
 *
 *   import { Screen } from "../ui/screen";
 *   import { Portrait } from "../ui/portrait";
 *   import { Button } from "../ui/button";
 *   import { Tools } from "../Tools/Tools";
 *
 *   export class arTavern extends Screen {
 *     private exit!: Button;
 *     constructor(from?: Screen | null) { super(from, "The Rusty Dagger"); }
 *     override createTools(): void {
 *       this.addPic(new Portrait("TwnTavern.jpg", "Leave", 10, 200, 96, 64));
 *       this.exit = new Button("Exit");
 *       this.exit.reshape(300, 270, 60, 20);
 *     }
 *     override addTools(): void {
 *       this.add(this.exit);
 *     }
 *     override action(e: GameEvent, o?: unknown): boolean {
 *       if (Tools.movedAway(this)) return true;
 *       if (e.target === this.exit) Tools.setRegion(this.getHome());
 *       if (e.target === this.getPic(0)) Tools.setRegion(this.getHome());
 *       return super.action(e, o);
 *     }
 *   }
 */

export * from "./dom";
export * from "./resources";
export * from "./session";
export * from "./widget";
export * from "./stage";
export * from "./screen";
export * from "./portrait";
export * from "./statusPic";
export * from "./button";
export * from "./checkbox";
export * from "./textField";
export * from "./textArea";
export * from "./textList";
export * from "./options";
