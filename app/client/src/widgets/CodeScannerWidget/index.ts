import IconSVG from "./icon.svg";
import Widget from "./widget";
import { ButtonPlacementTypes } from "components/constants";

export const CONFIG = {
  type: Widget.getWidgetType(),
  name: "扫码器",
  iconSVG: IconSVG,
  needsMeta: true,
  searchTags: [
    "barcode scanner",
    "qr scanner",
    "code detector",
    "barcode reader",
    "code scanner",
    "二维码",
    "条形码",
  ],
  defaults: {
    rows: 4,
    label: "扫描二维码/条形码",
    columns: 16,
    widgetName: "CodeScanner",
    isDefaultClickDisabled: true,
    version: 1,
    isRequired: false,
    isDisabled: false,
    animateLoading: true,
    placement: ButtonPlacementTypes.CENTER,
  },
  properties: {
    derived: Widget.getDerivedPropertiesMap(),
    default: Widget.getDefaultPropertiesMap(),
    meta: Widget.getMetaPropertiesMap(),
    config: Widget.getPropertyPaneConfig(),
    styleConfig: Widget.getPropertyPaneStyleConfig(),
    contentConfig: Widget.getPropertyPaneContentConfig(),
  },
};

export default Widget;
