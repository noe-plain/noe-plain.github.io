const fs = require("node:fs/promises"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url"),
  { launch } = require("../../tests/browser.cjs");
const directory =
  process.env.MKW_DRAFT_OUTPUT || "/tmp/mkw-vorlagen-2026-11-16";
const escape = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
(async () => {
  const { summary } = JSON.parse(
    await fs.readFile(path.join(directory, "verification.json"), "utf8"),
  );
  const style = `*{box-sizing:border-box}body{margin:0;padding:48px;background:#f0f2f5;color:#20252d;font:16px/1.45 Arial,sans-serif}header{display:flex;justify-content:space-between;gap:32px;align-items:start;margin-bottom:32px}h1{font-size:44px;line-height:1.05;letter-spacing:-1.2px;margin:0 0 16px}header p{margin:0;color:#566173;max-width:780px;font-size:18px}.tag{font-size:12px;font-weight:700;letter-spacing:1.4px;white-space:nowrap;padding:12px 16px;background:#dde8ff;color:#17274c;border-radius:999px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.card{overflow:hidden;background:#fcfcfd;border:1px solid #cdd3dd;border-radius:20px;box-shadow:0 2px 6px #00000008}.poster{aspect-ratio:4/5;background:#e8ebef;display:grid;place-items:center}.poster img{display:block;width:100%;max-height:100%;object-fit:contain}.caption{padding:20px 22px 24px}.eyebrow{color:#566173;font-size:12px;font-weight:700;letter-spacing:1px;margin-bottom:8px}h2{font-size:23px;line-height:1.2;margin:0 0 10px}.caption p{color:#566173;margin:0;min-height:46px}.fields{border-top:1px solid #e2e5ea;margin-top:16px;padding-top:12px;font-size:12px;color:#566173}footer{margin-top:28px;color:#566173;font-size:13px}.strip{display:grid;grid-template-columns:repeat(var(--count),minmax(0,1fr));gap:22px}.strip img{width:100%;display:block;box-shadow:0 3px 18px #0002}.strip figure{margin:0}.strip figcaption{padding-top:10px;color:#566173;font-size:14px}`;
  const header = (title, description) =>
    `<header><div><h1>${escape(title)}</h1><p>${escape(description)}</p></div><div class="tag">ENTWÜRFE ZUR FREIGABE</div></header>`;
  const html = `<!doctype html><html lang="de"><meta charset="utf-8"><title>MKW · Vorlagenatelier</title><style>${style}</style><body>${header("Content schneller gestalten.", "Drei bearbeitbare Vorlagen für das Musikkollegium Winterthur. Schriften, Bilder und Farben kommen aus dem bestehenden Studio. Alle Inhalte sind Beispiele.")}<main class="grid">${summary.map((d, i) => `<article class="card"><div class="poster"><img src="${d.id}-1.png" alt="Entwurf ${escape(d.name)}"></div><div class="caption"><div class="eyebrow">${String(i + 1).padStart(2, "0")} · ${d.slides} ${d.slides === 1 ? "SLIDE" : "SLIDES"}${d.id === "kurz" ? " · QUADRAT" : " · HOCHFORMAT"}</div><h2>${escape(d.name)}</h2><p>${escape(d.purpose)}</p><div class="fields">Austauschen: ${d.replace.map(escape).join(" · ")}</div></div></article>`).join("")}</main><footer>Bearbeitbare MKW-Dateien · Foto-freie Vorlagendaten · Noch nicht in der mitgelieferten Bibliothek · Beispielaufnahmen aus dem Studio-Testbestand</footer></body></html>`;
  const contact = path.join(directory, "vorlagen-uebersicht.html");
  await fs.writeFile(contact, html);
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1100 },
    });
    async function capture(file, name) {
      await page.goto(pathToFileURL(file).href);
      await page.evaluate(() =>
        Promise.all([...document.images].map((i) => i.decode())),
      );
      await page.screenshot({
        path: path.join(directory, name),
        fullPage: true,
      });
    }
    await capture(contact, "vorlagen-uebersicht.png");
    for (const d of summary.filter((d) => d.slides > 1)) {
      const file = path.join(directory, `${d.id}-alle-slides.html`);
      await fs.writeFile(
        file,
        `<!doctype html><html lang="de"><meta charset="utf-8"><title>${escape(d.name)}</title><style>${style}</style><body>${header(d.name, d.purpose)}<main class="strip" style="--count:${d.slides}">${Array.from({ length: d.slides }, (_, i) => `<figure><img src="${d.id}-${i + 1}.png" alt="Slide ${i + 1}"><figcaption>Slide ${i + 1} von ${d.slides}</figcaption></figure>`).join("")}</main><footer>Redaktionelle Beispielinhalte · Alle Text-, Bild- und Formebenen bleiben im MKW-Projekt bearbeitbar.</footer></body></html>`,
      );
      await capture(file, `${d.id}-alle-slides.png`);
    }
  } finally {
    await browser.close();
  }
  console.log(
    "Created native-rendered contact sheet and two complete carousel strips.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
