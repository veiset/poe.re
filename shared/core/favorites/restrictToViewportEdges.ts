import type {Modifier} from "@dnd-kit/core";

export const restrictToViewportEdges: Modifier = ({activeNodeRect, transform, windowRect}) => {
  if (!activeNodeRect || !windowRect) return transform;

  let {x, y} = transform;

  if (activeNodeRect.left + x < windowRect.left) x = windowRect.left - activeNodeRect.left;
  else if (activeNodeRect.right + x > windowRect.right) x = windowRect.right - activeNodeRect.right;

  if (activeNodeRect.top + y < windowRect.top) y = windowRect.top - activeNodeRect.top;
  else if (activeNodeRect.bottom + y > windowRect.bottom) y = windowRect.bottom - activeNodeRect.bottom;

  return {...transform, x, y};
};
