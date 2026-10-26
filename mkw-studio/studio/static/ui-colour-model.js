(function (root) {
  "use strict";
  const defaultColour = "#315bcc";
  const valid = (value) => /^#[0-9a-f]{6}$/i.test(value);
  const linear = (v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const srgb = (v) =>
    v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  function rgb(hex) {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  }
  function luminance(hex) {
    const [r, g, b] = rgb(hex).map(linear);
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
  }
  function contrast(a, b) {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function lab(hex) {
    const [r, g, b] = rgb(hex).map(linear),
      l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
      m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
      s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  }
  function fromLab(l, a, b) {
    const x = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
      y = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
      z = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z,
      -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
      -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z,
    ];
  }
  function tone(seed, lightness, chroma = 1, opposite = false, rotation = 0) {
    let [, a, b] = lab(seed);
    if ((opposite || rotation) && Math.hypot(a, b) < 0.02)
      [, a, b] = lab(defaultColour);
    if (opposite) {
      a = -a;
      b = -b;
    }
    if (rotation) {
      const angle = (rotation * Math.PI) / 180,
        x = a * Math.cos(angle) - b * Math.sin(angle);
      b = a * Math.sin(angle) + b * Math.cos(angle);
      a = x;
    }
    let low = 0,
      high = chroma,
      channels;
    for (let i = 0; i < 16; i++) {
      const scale = (low + high) / 2,
        candidate = fromLab(lightness, a * scale, b * scale);
      if (candidate.every((v) => v >= 0 && v <= 1)) low = scale;
      else high = scale;
    }
    channels = fromLab(lightness, a * low, b * low);
    return (
      "#" +
      channels
        .map((v) =>
          Math.round(Math.max(0, Math.min(1, srgb(v))) * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  }
  function palette(colour = defaultColour, theme = "light", mode = "normal") {
    const seed = valid(colour) ? colour.toLowerCase() : defaultColour,
      dark = theme === "dark",
      complementary = mode === "complementary",
      rotation = mode === "analogous" ? 30 : mode === "triadic" ? 120 : 0,
      vivid = complementary || !!rotation,
      primary = tone(seed, dark ? 0.82 : 0.47),
      container = tone(seed, dark ? 0.33 : 0.93, 0.35),
      onContainer = tone(seed, dark ? 0.94 : 0.28, 0.4);
    return Object.freeze({
      primary,
      "on-primary": dark ? "#12151b" : "#ffffff",
      "primary-hover": tone(seed, dark ? 0.88 : 0.41),
      "primary-container": container,
      "on-primary-container": onContainer,
      "secondary-container": tone(
        seed,
        dark ? 0.34 : 0.93,
        vivid ? 0.65 : 0.16,
        complementary,
        rotation,
      ),
      "on-secondary-container": tone(
        seed,
        dark ? 0.94 : 0.28,
        vivid ? 0.65 : 0.16,
        complementary,
        rotation,
      ),
      "tertiary-container": tone(
        seed,
        dark ? 0.34 : 0.93,
        mode === "triadic" ? 0.65 : 0.16,
        false,
        mode === "triadic" ? -120 : 0,
      ),
      "on-tertiary-container": tone(
        seed,
        dark ? 0.94 : 0.28,
        mode === "triadic" ? 0.65 : 0.16,
        false,
        mode === "triadic" ? -120 : 0,
      ),
      "primary-outline": tone(seed, dark ? 0.64 : 0.58, 0.6),
      surface: dark ? "#191c21" : "#fcfcfd",
      "surface-container-low": dark ? "#1e2228" : "#f6f7f9",
      "surface-container": dark ? "#252930" : "#f0f2f5",
      "surface-container-high": dark ? "#2e333b" : "#e8ebef",
      "surface-container-highest": dark ? "#393f48" : "#dfe3e9",
      "surface-bright": dark ? "#30353e" : "#ffffff",
      "on-surface": dark ? "#e6e8ed" : "#20252d",
      "on-surface-variant": dark ? "#b6bfcc" : "#566173",
      outline: dark ? "#8993a3" : "#737f91",
      "outline-variant": dark ? "#424a57" : "#cdd3dd",
      workspace: dark ? "#111419" : "#e9ecf0",
      "workspace-dot": dark ? "#353c47" : "#c2c9d4",
      error: dark ? "#ffb4ab" : "#b3261e",
      "error-container": dark ? "#4c2425" : "#fce8e6",
      warning: dark ? "#ffd580" : "#835200",
      "warning-container": dark ? "#433518" : "#fff0cb",
      success: dark ? "#9ed5b4" : "#24633e",
      "success-container": dark ? "#1d3c2d" : "#ddf3e4",
    });
  }
  const api = { defaultColour, valid, palette, contrast };
  root.MKWUIColor = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "object" ? globalThis : this);
