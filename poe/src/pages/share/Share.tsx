import React from "react";
import SharePage from "@shared/components/share/SharePage";
import {poeShare} from "./shareConfig";

export default function Share() {
  return <SharePage config={poeShare}/>;
}
