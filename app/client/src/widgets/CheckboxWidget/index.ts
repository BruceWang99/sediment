import Widget from "./widget";
import IconSVG from "./icon.svg";
import { LabelPosition } from "components/constants";
import { AlignWidgetTypes } from "widgets/constants";

export const CONFIG = {
  type: Widget.getWidgetType(),
  name: "勾选",
  iconSVG: IconSVG,
  needsMeta: true,
  searchTags: ["boolean", "checkbox"],
  defaults: {
    rows: 4,
    columns: 7,
    label: "标签",
    defaultCheckedState: true,
    widgetName: "Checkbox",
    version: 1,
    alignWidget: AlignWidgetTypes.LEFT,
    labelPosition: LabelPosition.Left,
    isDisabled: false,
    isRequired: false,
    animateLoading: true,
  },
  properties: {
    derived: Widget.getDerivedPropertiesMap(),
    default: Widget.getDefaultPropertiesMap(),
    meta: Widget.getMetaPropertiesMap(),
    config: Widget.getPropertyPaneConfig(),
    contentConfig: Widget.getPropertyPaneContentConfig(),
    styleConfig: Widget.getPropertyPaneStyleConfig(),
  },
};

export default Widget;
