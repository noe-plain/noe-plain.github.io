"use strict";
const carouselPDFPresets = {
  linkedin: {
    name: "LinkedIn · Hochformat",
    w: 1080,
    h: 1350,
    compression: "lossless",
    quality: 92,
    fit: "contain",
    paper: "#ffffff",
  },
  "linkedin-square": {
    name: "LinkedIn · Quadrat",
    w: 1080,
    h: 1080,
    compression: "lossless",
    quality: 92,
    fit: "contain",
    paper: "#ffffff",
  },
  original: {
    name: "Artwork · Originalformat",
    compression: "lossless",
    quality: 95,
    fit: "contain",
    paper: "#ffffff",
  },
  compact: {
    name: "Kleine Datei",
    w: 1080,
    compression: "jpeg",
    quality: 82,
    fit: "contain",
    paper: "#ffffff",
  },
};
function carouselPDFPreset(key) {
  const c = p.carousel || { w: 1080, h: 1350 },
    preset = carouselPDFPresets[key] || carouselPDFPresets.linkedin,
    w = preset.w || c.w,
    h = preset.h || Math.round((w * c.h) / c.w);
  return { ...preset, w, h, preset: key };
}
function carouselValidatePDF(settings) {
  return (
    settings &&
    Number.isInteger(settings.w) &&
    Number.isInteger(settings.h) &&
    settings.w >= 240 &&
    settings.h >= 240 &&
    settings.w <= 4000 &&
    settings.h <= 4000 &&
    ["jpeg", "lossless"].includes(settings.compression) &&
    Number.isFinite(settings.quality) &&
    settings.quality >= 50 &&
    settings.quality <= 100 &&
    ["contain", "cover"].includes(settings.fit) &&
    /^#[0-9a-f]{6}$/i.test(settings.paper)
  );
}
async function carouselEncodePDFPage(b, settings) {
  const key = exportKey(b, settings);
  if (exportCache.has(key)) return exportCache.get(key);
  const opts = settings.pdf;
  if (!carouselValidatePDF(opts))
    throw Error(
      "PDF-Seitengrösse: 240–4000 px. Bitte die Einstellungen prüfen.",
    );
  await document.fonts.ready;
  const c = makeCanvas(opts.w, opts.h),
    ctx = exportContext(c);
  let data, filter, previewBlob;
  try {
    ctx.fillStyle = opts.paper;
    ctx.fillRect(0, 0, c.width, c.height);
    const scale = (opts.fit === "cover" ? Math.max : Math.min)(
      opts.w / b.w,
      opts.h / b.h,
    );
    ctx.save();
    ctx.translate((opts.w - b.w * scale) / 2, (opts.h - b.h * scale) / 2);
    await paint(ctx, b, scale, { transparent: false });
    ctx.restore();
    if (opts.compression === "jpeg") {
      previewBlob = await new Promise((resolve) =>
        c.toBlob(resolve, "image/jpeg", opts.quality / 100),
      );
      data = new Uint8Array(await previewBlob.arrayBuffer());
      filter = "DCTDecode";
    } else {
      previewBlob = await new Promise((resolve) =>
        c.toBlob(resolve, "image/png"),
      );
      const pixels = ctx.getImageData(0, 0, c.width, c.height).data,
        rgb = new Uint8Array(c.width * c.height * 3);
      for (let i = 0, j = 0; i < pixels.length; i += 4) {
        rgb[j++] = pixels[i];
        rgb[j++] = pixels[i + 1];
        rgb[j++] = pixels[i + 2];
      }
      if (typeof CompressionStream !== "undefined") {
        data = new Uint8Array(
          await new Response(
            new Blob([rgb])
              .stream()
              .pipeThrough(new CompressionStream("deflate")),
          ).arrayBuffer(),
        );
        filter = "FlateDecode";
      } else data = rgb;
    }
  } finally {
    c.width = c.height = 1;
  }
  if (exportCache.has(key)) return exportCache.get(key);
  const blob = new Blob([data]),
    entry = {
      blob,
      previewBlob,
      url: URL.createObjectURL(previewBlob),
      hasTransparency: false,
      pdfImage: {
        data,
        filter,
        w: opts.w,
        h: opts.h,
        source: previewBlob,
        text: carouselPDFText(b, opts),
      },
    };
  while (
    exportCacheBytes + blob.size + previewBlob.size > 128 * 1024 * 1024 &&
    exportCache.size
  ) {
    const k = exportCache.keys().next().value,
      old = exportCache.get(k);
    exportCacheBytes -= old.cacheBytes ?? old.blob.size;
    URL.revokeObjectURL(old.url);
    exportCache.delete(k);
  }
  entry.cacheBytes = blob.size + previewBlob.size;
  exportCache.set(key, entry);
  exportCacheBytes += entry.cacheBytes;
  return entry;
}
// Keep the exact canvas appearance and add real embedded text for selection/search.
function carouselPDFText(board, opts) {
  const c = p.carousel,
    scale = (opts.fit === "cover" ? Math.max : Math.min)(
      opts.w / board.w,
      opts.h / board.h,
    ),
    dx = (opts.w - board.w * scale) / 2,
    dy = (opts.h - board.h * scale) / 2,
    measure = makeCanvas(1, 1).getContext("2d"),
    result = [];
  for (const object of c.objects) {
    if (
      object.type !== "text" ||
      !carouselObjectVisible(object) ||
      !object.text.trim() ||
      (object.opacity ?? 1) === 0
    )
      continue;
    const layout = carouselTextLayout(object, measure),
      offset = carouselTextOffset(object, layout);
    for (const originalLine of layout.lines)
      for (const run of originalLine.runs) {
        const line = { ...originalLine, text: run.text, size: run.size },
          world = carouselToWorld(object, {
            x: originalLine.x + run.x,
            y: originalLine.y + run.dy + offset,
          }),
          x = world.x - board.carouselSlide * c.w,
          y = world.y;
        const runFont = p.fonts.find((font) => font.role === run.font);
        measure.font = `${line.size}px ${fontFamily(run.font)}`;
        measure.letterSpacing = run.letterSpacing + "px";
        measure.textBaseline = "alphabetic";
        const ascent = measure.measureText("Mg").actualBoundingBoxAscent;
        measure.textBaseline = "top";
        const baseline =
            ascent - measure.measureText("Mg").actualBoundingBoxAscent,
          width = run.width;
        if (
          line.text &&
          x + width > 0 &&
          x < board.w &&
          y + line.size > 0 &&
          y < board.h
        )
          result.push({
            text: line.text,
            angle: -(object.angle || 0),
            x:
              (dx +
                (x -
                  Math.sin(((object.angle || 0) * Math.PI) / 180) * baseline) *
                  scale) *
              0.75,
            y:
              (opts.h -
                dy -
                (y +
                  Math.cos(((object.angle || 0) * Math.PI) / 180) * baseline) *
                  scale) *
              0.75,
            size: line.size * scale * 0.75,
            font: run.font,
            data: runFont?.data,
            tracking: run.letterSpacing * scale * 0.75,
            glyphScale: run.glyphScale || 1,
          });
      }
  }
  return result;
}
let carouselPDFLibraryPromise;
function carouselLoadPDFLibrary() {
  if (typeof MKWPDF !== "undefined") return Promise.resolve(MKWPDF);
  return (carouselPDFLibraryPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = $("#pdf-library").dataset.src;
    script.onload = () => resolve(window.MKWPDF);
    script.onerror = () => {
      script.remove();
      carouselPDFLibraryPromise = null;
      reject(
        Error(
          "Die PDF-Bibliothek konnte nicht geladen werden. Bitte die Verbindung prüfen und erneut exportieren.",
        ),
      );
    };
    document.head.append(script);
  }));
}
async function carouselBuildPDF(pages, title) {
  await carouselLoadPDFLibrary();
  if (!pages.length || pages.length > 300)
    throw Error("Eine PDF benötigt 1–300 Seiten.");
  const {
      PDFDocument,
      StandardFonts,
      pushGraphicsState,
      popGraphicsState,
      setTextRenderingMode,
      TextRenderingMode,
    } = MKWPDF,
    document = await PDFDocument.create(),
    fonts = new Map();
  document.registerFontkit({
    ...MKWPDF.fontkit,
    create(...args) {
      const font = MKWPDF.fontkit.create(...args);
      if (font.directory?.tables?.["CFF "])
        Object.defineProperty(font, "cff", { value: true });
      return font;
    },
  });
  document.setTitle(title);
  document.setCreator("MKW Studio");
  document.setProducer("MKW Studio / pdf-lib");
  for (const record of pages) {
    const page = document.addPage([record.w * 0.75, record.h * 0.75]);
    if (!record.source)
      throw Error("PDF-Vorschaudaten fehlen. Bitte den Export erneut öffnen.");
    const bytes = await record.source.arrayBuffer(),
      image =
        record.source.type === "image/jpeg"
          ? await document.embedJpg(bytes)
          : await document.embedPng(bytes);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
    });
    page.pushOperators(
      pushGraphicsState(),
      setTextRenderingMode(TextRenderingMode.Invisible),
    );
    for (const line of record.text || []) {
      let font = fonts.get(line.font);
      if (!font) {
        font = line.data
          ? await document.embedFont(bytesFromData(line.data), {
              subset: false,
            })
          : await document.embedFont(StandardFonts.Helvetica);
        fonts.set(line.font, font);
      }
      page.pushOperators(
        MKWPDF.setCharacterSpacing(line.tracking || 0),
        MKWPDF.PDFOperator.of(
          MKWPDF.PDFOperatorNames.SetTextHorizontalScaling,
          [MKWPDF.PDFNumber.of((line.glyphScale || 1) * 100)],
        ),
      );
      page.drawText(line.text, {
        x: line.x,
        y: line.y,
        size: line.size,
        font,
        ...(line.angle ? { rotate: MKWPDF.degrees(line.angle) } : {}),
      });
    }
    page.pushOperators(popGraphicsState());
  }
  // pdf-lib labels complete CFF OpenType programs as bare CIDFontType0C streams.
  // Keep the full font program and declare OpenType when its SFNT header is OTTO.
  await document.flush();
  for (const [, value] of document.context.enumerateIndirectObjects())
    if (
      value instanceof MKWPDF.PDFRawStream &&
      value.dict.get(MKWPDF.PDFName.of("Subtype"))?.toString() ===
        "/CIDFontType0C"
    ) {
      const bytes = MKWPDF.decodePDFRawStream(value).decode();
      if (
        bytes[0] === 79 &&
        bytes[1] === 84 &&
        bytes[2] === 84 &&
        bytes[3] === 79
      )
        value.dict.set(
          MKWPDF.PDFName.of("Subtype"),
          MKWPDF.PDFName.of("OpenType"),
        );
    }
  return new Blob([await document.save()], { type: "application/pdf" });
}
function carouselPDFUI() {
  const pdf = exportOptions.format === "pdf";
  $("#pdfExportSettings").hidden = !pdf;
  $(".export-options").hidden = pdf;
  $("#exportPreset").value = pdf
    ? exportOptions.pdf?.preset || "custom"
    : exportOptions.preset || "custom";
  $("#exportPreset").querySelector("optgroup[data-pdf-presets]").hidden =
    !p.carousel;
  for (const el of document.querySelectorAll(
    "[data-export-format=pdf],#exportFormat option[value=pdf]",
  ))
    el.hidden = !p.carousel;
  $("#folder").hidden = pdf || !window.showDirectoryPicker;
  $("#zip").textContent = pdf ? "PDF herunterladen" : "ZIP herunterladen";
  $("#qualityField").hidden = pdf || exportOptions.format === "png";
  $("#transparencyField").hidden = pdf || exportOptions.format === "jpg";
  if (!pdf) return;
  exportOptions.pdf ??= carouselPDFPreset(
    studioPreferences.pdfPreset || "linkedin",
  );
  $("#exportPreset").value = exportOptions.pdf.preset || "custom";
  for (const key of ["w", "h", "compression", "quality", "fit", "paper"])
    $("#pdf-" + key).value = exportOptions.pdf[key];
  $("#pdfQualityField").hidden = exportOptions.pdf.compression !== "jpeg";
  $("#pdfQualityValue").textContent = exportOptions.pdf.quality + " %";
  $("#exportFormatHint").textContent =
    "Eine PDF mit einer Seite je ausgewählter Slide · sRGB · originalgetreues Artwork mit auswählbarem Text.";
  $("#pdfFitHint").textContent =
    p.carousel &&
    Math.abs(
      p.carousel.w / p.carousel.h - exportOptions.pdf.w / exportOptions.pdf.h,
    ) > 0.001
      ? exportOptions.pdf.fit === "cover"
        ? "Abweichendes Seitenverhältnis: Die Seiten werden randfüllend beschnitten."
        : "Abweichendes Seitenverhältnis: Das Artwork wird proportional eingepasst; freie Ränder bleiben in der Seitenfarbe."
      : "Das Seitenverhältnis entspricht deinem Artwork.";
}
async function carouselRunPDF() {
  if (busy || !exportPlan.length) return;
  busy = true;
  const finishLoading = MKWUIControls.loading("#progressText");
  exportGeneration++;
  clearTimeout(previewTimer);
  const plan = clone(exportPlan),
    settings = exportSettings(),
    disabled = new Map();
  $("#exportDialog")
    .querySelectorAll("input,select,button")
    .forEach((el) => {
      disabled.set(el, el.disabled);
      el.disabled = true;
    });
  try {
    const pages = [];
    let bytes = 0;
    for (const [i, x] of plan.entries()) {
      setExportProgress(
        i,
        plan.length + 1,
        `PDF-Seite ${i + 1} / ${plan.length} vorbereiten …`,
      );
      await new Promise((r) => setTimeout(r, 0));
      const entry = await encodedBoard(x.board, settings);
      pages.push(entry.pdfImage);
      bytes += entry.blob.size;
      if (bytes > 100000000)
        throw Error(
          "Die PDF überschreitet LinkedIns 100-MB-Limit. Wähle „Kleine Datei“ oder reduziere die Auflösung.",
        );
    }
    setExportProgress(
      plan.length,
      plan.length + 1,
      "PDF wird zusammengestellt …",
    );
    const blob = await carouselBuildPDF(pages, p.meta.title || "Designer");
    if (blob.size > 100000000)
      throw Error("PDF zu gross für LinkedIn. Bitte stärker komprimieren.");
    download(blob, MKW.projectName(p.meta) + ".pdf");
    setExportProgress(
      1,
      1,
      `Fertig · ${pages.length} Seiten · ${exportBytes(blob.size)}`,
    );
    $("#exportStatus").textContent =
      `PDF mit ${pages.length} Einzelseiten heruntergeladen · ${exportBytes(blob.size)}`;
    status("Designer als PDF exportiert");
  } catch (e) {
    $("#exportStatus").textContent = e.message;
    $("#exportProgress").classList.remove("is-running");
  } finally {
    finishLoading();
    busy = false;
    for (const [el, value] of disabled) el.disabled = value;
  }
}
function carouselInitPDF() {
  const host = document.createElement("section");
  host.id = "pdfExportSettings";
  host.hidden = true;
  host.innerHTML = `<div class="carousel-fields"><label>Breite · px<input id="pdf-w" type="number" min="240" max="4000"></label><label>Höhe · px<input id="pdf-h" type="number" min="240" max="4000"></label></div><label>Komprimierung<select id="pdf-compression"><option value="lossless">Verlustfrei · scharfe Schrift</option><option value="jpeg">JPG · kleinere Datei</option></select></label><label id="pdfQualityField">Bildqualität <output id="pdfQualityValue"></output><input id="pdf-quality" type="range" min="50" max="100" step="1"></label><label>Artwork auf der Seite<select id="pdf-fit"><option value="contain">Einpassen · ganzes Artwork erhalten</option><option value="cover">Füllen · Ränder beschneiden</option></select></label><label>Seitenfarbe<input id="pdf-paper" type="color" value="#ffffff"></label><p id="pdfFitHint"></p><small>LinkedIn: maximal 100 MB / 300 Seiten. <a href="https://www.linkedin.com/help/linkedin/answer/a523054/document-uploads-on-linkedin-faq?lang=en" target="_blank" rel="noopener">Vorgaben ansehen</a></small>`;
  $(".export-options").after(host);
  const label = document.createElement("label");
  label.className = "export-preset-field";
  label.innerHTML = `Preset<select id="exportPreset"><option value="custom">Eigene Einstellungen</option><optgroup label="PDF · Designer" data-pdf-presets>${Object.entries(
    carouselPDFPresets,
  )
    .map(([key, v]) => `<option value="${key}">${v.name}</option>`)
    .join(
      "",
    )}</optgroup><optgroup label="Bilder"><option value="jpg-high">JPG · hohe Qualität</option><option value="png-lossless">PNG · verlustfrei</option><option value="webp-small">WebP · kleine Datei</option></optgroup></select>`;
  $(".export-format-buttons").after(label);
  $("#exportPreset").onchange = () => {
    const key = $("#exportPreset").value;
    if (carouselPDFPresets[key] && p.carousel) {
      exportOptions.format = "pdf";
      exportOptions.pdf = carouselPDFPreset(key);
      $("#exportFormat").value = "pdf";
    } else if (key !== "custom") {
      const [format] = key.split("-");
      Object.assign(exportOptions, {
        format,
        quality: format === "jpg" ? 95 : 82,
        png8: false,
        transparent: false,
        preset: key,
      });
      $("#exportFormat").value = format;
      $("#exportQuality").value = exportOptions.quality;
      $("#png8").checked = false;
      $("#exportTransparent").checked = false;
    }
    exportSessions.set(p.projectId, clone(exportOptions));
    syncExportSettings();
    updateExportNames();
    scheduleExportPreviews();
  };
  host.querySelectorAll("input,select").forEach((input) => {
    const update = () => {
      const key = input.id.slice(4);
      exportOptions.pdf = {
        ...exportOptions.pdf,
        [key]:
          input.type === "number" || input.type === "range"
            ? Number(input.value)
            : input.value,
        preset: "custom",
      };
      exportSessions.set(p.projectId, clone(exportOptions));
      carouselPDFUI();
      updateExportNames();
      scheduleExportPreviews();
    };
    if (
      input.type === "number" ||
      input.type === "range" ||
      input.type === "color"
    )
      input.oninput = update;
    else input.onchange = update;
  });
}
carouselInitPDF();
