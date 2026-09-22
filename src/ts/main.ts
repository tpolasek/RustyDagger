import { arLoading } from "./DCourt/Screens/Command";
import "./DCourt/Screens/Areas/areasIndex";
import "./DCourt/Screens/Wilds";
import { Tools } from "./DCourt/Tools/Tools";
import { FileLoader } from "./DCourt/Tools/FileLoader";

async function boot(): Promise<void> {
  if (!(await FileLoader.probeServer())) {
    console.warn("[DCourt] game server not found - saving to localStorage instead");
  }
  await FileLoader.migrate();
  Tools.setArtpath("Images");
  Tools.installStage("stage");
  Tools.setRegion(new arLoading());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
