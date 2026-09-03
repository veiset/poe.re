import Collapsable from "@poe/components/collapsable/Collapsable";
import type {ItemRegex} from "@shared/generated/item";

interface ModWarningProps {
  itemRegex: ItemRegex
}

const ModWarning = (props: ModWarningProps) => {
  const {itemRegex} = props;
  const warnings = itemRegex.itemRegexForCategory.flatMap((e) => e.warnings);

  return <Collapsable
    header={`Show all possible warnings / mod conflicts for ${itemRegex.basetype}`}>{warnings.map((e) =>
    <div className="mod-warning">duplicate: {e}</div>)}</Collapsable>;
}

export default ModWarning;
