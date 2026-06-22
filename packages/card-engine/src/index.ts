export { CARD_WIDTH, CARD_HEIGHT } from "./constants";
export { fitTemplateRaster, preserveExactTemplateRaster } from "./raster";
export { resolveCardDimensions, scaleFromCr80 } from "./dimensions";
export type { CardDimensions } from "./dimensions";
export {
  DEFAULT_TEMPLATE_LAYOUT,
  DEFAULT_FIELD_LABELS,
  scaleTemplateLayout,
  createDefaultLayoutForSource,
} from "./layout";
export type { TemplateFieldKey, TemplateFieldLayout, TemplateLayout } from "./layout";
export type { RenderStudentCardInput, SchoolCardData, StudentCardData } from "./types";
export {
  renderStudentCard,
  renderStudentCardBack,
  validateStudentCard,
  buildStudentPrintZip,
} from "./render";
