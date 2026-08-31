import React from "react";
import "./ItemComponents.css";

interface SimilarItemsInfoProps {
  similarItems: string[];
}

const SimilarItemsInfo = ({ similarItems }: SimilarItemsInfoProps) => {
  if (similarItems.length === 0) return null;

  return (
    <>
      <div className="break" />
      <div className="similar-items-infobox">
        <b>Also matching</b>: {similarItems.join(", ")}
      </div>
    </>
  );
};

export default SimilarItemsInfo;
