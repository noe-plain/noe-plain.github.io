/* Pure CSV/JSON parsing, field mapping and template expansion; usable in Node tests. */
(function (root) {
  "use strict";
  const fields = {
    date: "Datum",
    code: "Kürzel",
    title: "Projektname",
    concert: "Übertitel",
    headline: "Konzerttitel",
    subtitle: "Untertitel",
    copyright: "Copyright",
    image: "Bilddatei",
  };
  const aliases = {
    date: ["datum", "date", "konzertdatum"],
    code: ["kurzel", "kuerzel", "code"],
    title: ["projektname", "projekt", "project", "title"],
    concert: ["ubertitel", "uebertitel", "uberschrift", "heading", "concert"],
    headline: ["konzerttitel", "headline", "concerttitle"],
    subtitle: ["untertitel", "subtitle"],
    copyright: ["copyright", "bildnachweis", "credit"],
    image: ["bild", "bilddatei", "image", "filename", "dateiname"],
  };
  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  function delimiter(text) {
    const first = text.split(/\r?\n/)[0];
    return [";", ",", "\t"]
      .map((value) => [value, parseCSV(first, value)[0]?.length || 0])
      .sort((a, b) => b[1] - a[1])[0][0];
  }
  function parseCSV(text, separator) {
    const rows = [];
    let row = [],
      value = "",
      quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (quoted && text[i + 1] === '"') {
          value += '"';
          i++;
        } else if (quoted || !value) quoted = !quoted;
        else value += ch;
      } else if (ch === separator && !quoted) {
        row.push(value);
        value = "";
      } else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(value);
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
        value = "";
      } else value += ch;
    }
    if (quoted)
      throw Error(
        "Eine CSV-Zelle hat ein nicht geschlossenes Anführungszeichen.",
      );
    row.push(value);
    if (row.some((v) => v.trim())) rows.push(row);
    return rows;
  }
  function parse(text, name = "data.csv") {
    text = text.replace(/^\uFEFF/, "");
    let records;
    if (/\.json$/i.test(name) || /^\s*[\[{]/.test(text)) {
      const value = JSON.parse(text);
      records = Array.isArray(value) ? value : value.records;
      if (
        !Array.isArray(records) ||
        records.some(
          (row) => !row || typeof row !== "object" || Array.isArray(row),
        )
      )
        throw Error(
          'JSON benötigt eine Liste von Datensätzen oder {"records": [...]}.',
        );
      if (
        records.some((row) =>
          Object.values(row).some(
            (value) => value !== null && typeof value === "object",
          ),
        )
      )
        throw Error("Bitte einfache Text- oder Zahlenfelder verwenden.");
    } else {
      const rows = parseCSV(text, delimiter(text)),
        header = rows.shift()?.map((value) => value.trim());
      if (
        !header?.length ||
        header.some((key) => !key) ||
        new Set(header).size !== header.length
      )
        throw Error("Die erste CSV-Zeile braucht eindeutige Spaltennamen.");
      records = rows.map((values, i) => {
        if (values.length > header.length)
          throw Error(`Zeile ${i + 2}: mehr Werte als Spalten.`);
        return Object.fromEntries(
          header.map((key, j) => [key, values[j] || ""]),
        );
      });
    }
    if (!records.length || records.length > 500)
      throw Error("Bitte 1–500 Datensätze importieren.");
    const columns = [...new Set(records.flatMap(Object.keys))];
    return { records, columns };
  }
  function suggest(columns) {
    return Object.fromEntries(
      Object.keys(fields).map((field) => [
        field,
        columns.find((column) => aliases[field].includes(normalize(column))) ||
          "",
      ]),
    );
  }
  function map(record, mapping) {
    const row = Object.fromEntries(
      Object.keys(fields).map((field) => [
        field,
        String(record[mapping[field]] ?? "").trim(),
      ]),
    );
    row._mapped = Object.keys(fields).filter((field) => !!mapping[field]);
    return row;
  }
  function expand(template, row, asset, index = 0) {
    const project = root.MKWProjectAssets.hydrate(
      root.MKWProjectAssets.compact(template),
    );
    project.projectId = crypto.randomUUID();
    delete project.exportOptions;
    project.meta = {
      ...project.meta,
      ...Object.fromEntries(
        ["date", "code", "title", "concert", "headline", "subtitle"]
          .filter((key) => (row._mapped ? row._mapped.includes(key) : row[key]))
          .map((key) => [key, row[key]]),
      ),
    };
    project.meta.title =
      row.title || `${template.meta.title || "Serie"} ${index + 1}`;
    project.meta.date = row.date || root.MKW.headingDate(row.concert) || "";
    if (project.carousel) {
      const values = {
        ...row,
        datum: row.date,
        kurzel: row.code,
        kürzel: row.code,
        projektname: project.meta.title,
        übertitel: row.concert,
        uebertitel: row.concert,
        konzerttitel: row.headline,
        untertitel: row.subtitle,
        bild: row.image,
      };
      for (const object of project.carousel.objects) {
        if (object.type === "text")
          object.text = object.text.replace(
            /\{\{\s*([^}]+?)\s*\}\}/g,
            (_, key) => values[key.toLowerCase()] ?? "",
          );
      }
      if (asset) {
        const target =
          project.carousel.objects.find((object) => object.type === "image") ||
          project.carousel.objects.find(
            (object) => object.type === "angle" || object.fillMode === "image",
          );
        if (!target)
          throw Error(
            "Die Carousel-Vorlage braucht einen Bildrahmen für die Bildzuordnung.",
          );
        project.images.push(asset);
        target.imageId = asset.id;
        target.scale = 1;
        target.panX = target.panY = 0;
      }
    } else {
      const source = template.images[0],
        boards = template.boards.filter(
          (board) => board.imageId === source?.id,
        );
      if (!boards.length)
        throw Error(
          "Bitte zuerst mindestens ein Vorlagenbild mit Formaten erstellen.",
        );
      const im = asset || source;
      project.images = [im];
      project.boards = JSON.parse(JSON.stringify(boards));
      project.textOverrides = {};
      project.textTypeOverrides = {};
      project.familyOverrides = {};
      for (const board of project.boards) {
        board.id = crypto.randomUUID();
        board.imageId = im.id;
        if (asset) {
          const before = source;
          board.image.scale *=
            Math.max(board.w / im.width, board.h / im.height) /
            Math.max(board.w / before.width, board.h / before.height);
        }
        for (const [key, field] of [
          ["date", "concert"],
          ["title", "headline"],
          ["subtitle", "subtitle"],
          ["copyright", "copyright"],
        ])
          if (
            row._mapped ? row._mapped.includes(field) : row[field] !== undefined
          ) {
            board.elements[key].text =
              key === "date" || (key === "title" && project.meta.uppercase)
                ? row[field].toUpperCase()
                : row[field];
          }
      }
    }
    return root.MKWProjectAssets.prune(project);
  }
  const api = { fields, parse, parseCSV, suggest, map, expand };
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWBatchData = api;
})(globalThis);
