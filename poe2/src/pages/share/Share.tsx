import React from "react";
import SharePage from "@shared/components/share/SharePage";
import {poe2Share} from "./shareConfig";

export default function Share() {
  return <SharePage config={poe2Share}/>;
}
