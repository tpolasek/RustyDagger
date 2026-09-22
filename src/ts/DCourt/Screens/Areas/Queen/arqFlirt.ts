/**
 * Port of `DCourt/Screens/Areas/Queen/arqFlirt.java` - the quick "Working..."
 * notice (the queen's flirt interaction is not implemented in the original).
 */

import { Screen } from "../../../ui/screen";
import { arNotice } from "../../Utility/arNotice";

export class arqFlirt extends arNotice {
  constructor(from: Screen | null) {
    super(from, "\tWorking...");
  }
}
