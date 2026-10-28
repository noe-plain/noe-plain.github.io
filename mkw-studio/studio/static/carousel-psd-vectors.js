"use strict";
// Preserve Bézier geometry in PSD. Complex paints keep their exact raster appearance.
function carouselPSDVectorMask(object) {
  const item = carouselPaperItem(object),
    paths = (item.children || [item]).map((path) => ({
      open: !path.closed,
      operation: "combine",
      fillRule: "non-zero",
      knots: path.segments.map((segment) => {
        const point = segment.point,
          incoming = point.add(segment.handleIn),
          outgoing = point.add(segment.handleOut);
        return {
          linked: segment.isSmooth(),
          points: [
            incoming.x,
            incoming.y,
            point.x,
            point.y,
            outgoing.x,
            outgoing.y,
          ],
        };
      }),
    }));
  item.remove();
  return { paths };
}
function carouselPSDVectorData(object, layer) {
  if (!carouselIsVector(object)) return layer;
  const mask = carouselPSDVectorMask(object),
    fill = studioPaintRead(object, "fill"),
    stroke = studioPaintRead(object, "stroke");
  const simple =
    !carouselHasEffects(object) &&
    fill.kind === "solid" &&
    stroke.kind === "solid" &&
    (!fill.enabled || fill.alpha === 1) &&
    (!stroke.enabled || stroke.alpha === 1) &&
    (!object.startEnd || object.startEnd === "none") &&
    (!object.endEnd || object.endEnd === "none");
  if (!simple) {
    layer.vectorMask = { ...mask, disable: true };
    layer.name += " · Rasterdarstellung + editierbarer Pfad";
    return layer;
  }
  layer.vectorMask = mask;
  layer.vectorFill = { type: "color", color: rgb(fill.colour) };
  layer.vectorStroke = {
    fillEnabled: fill.enabled && (object.type === "shape" || object.closed),
    strokeEnabled: stroke.enabled && object.strokeWidth > 0,
    lineWidth: { units: "Pixels", value: object.strokeWidth },
    lineDashOffset: { units: "Points", value: 0 },
    miterLimit: 4,
    lineCapType: { butt: "butt", round: "round", square: "square" }[
      object.lineCap
    ],
    lineJoinType: object.lineJoin,
    lineAlignment: "center",
    scaleLock: false,
    strokeAdjust: false,
    lineDashSet:
      object.dash === "dash"
        ? [4, 3].map((value) => ({ units: "None", value }))
        : object.dash === "dot"
          ? [0.1, 2.5].map((value) => ({ units: "None", value }))
          : [],
    blendMode: "normal",
    opacity: 1,
    content: { type: "color", color: rgb(stroke.colour) },
    resolution: 72,
  };
  return layer;
}
