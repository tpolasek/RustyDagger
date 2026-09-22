/**
 * Port of `DCourt/Screens/Areas/Queen/arqStudy.java` - a stub notice screen: the
 * Java version only sets up its (unused) message text and is never reached from
 * `arQueen`.
 */

import { Screen } from "../../../ui/screen";
import { arNotice } from "../../Utility/arNotice";

export class arqStudy extends arNotice {
  static readonly studyMsg =
    "$TB$You engage in a philosophical dispute with $lordname$ upon $topic$.$CR$";
  static readonly boastText: string[] = [
    "0",
    "1",
    "2",
    "3",
    "$TB$The debate waxes and wanes, other nobles enter the argument to press their points.  ",
  ];

  constructor(from: Screen | null) {
    super(from, arqStudy.studyMsg);
  }
}
