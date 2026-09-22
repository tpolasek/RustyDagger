import { arLoading } from "./DCourt/Screens/Command";
import "./DCourt/Screens/Areas/areasIndex";
import "./DCourt/Screens/Wilds";
import { Tools } from "./DCourt/Tools/Tools";

function boot(): void {
  Tools.setArtpath("Images");
  Tools.installStage("stage");
  Tools.setRegion(new arLoading());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
