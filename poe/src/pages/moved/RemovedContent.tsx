import React from "react";
import Header from "@poe/components/Header";
import "./MovedContent.css";

type RemovedContentProps = {
  title: string;
  reason: string;
}

// A page disabled by a patch. Its code is kept, so it can come back if the game data does.
const RemovedContent = ({title, reason}: RemovedContentProps) => (
  <>
    <Header text={title}/>
    <div>
      <p className="moved-content">{reason}</p>
    </div>
  </>
);

export default RemovedContent;
