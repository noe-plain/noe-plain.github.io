(function (root) {
  "use strict";
  const Path =
    typeof module !== "undefined"
      ? require("../static/path-model.js")
      : root.MKWPath;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const path = (points, closed = false) => ({ points, closed });
  const bend = (x, y, dx = 65, dy = 0) => ({
    x,
    y,
    in: { x: x - dx, y: y - dy },
    out: { x: x + dx, y: y + dy },
  });
  const lessons = [
    {
      name: "Ecken setzen",
      goal: "Zeichne die gestrichelte Treppe mit drei Klicks nach. Beende die offene Linie mit Enter oder «Linie beenden».",
      tip: "Klicken setzt einen Eckpunkt. Ziehen erzeugt Griffe. Für diese Treppe brauchst du keine Griffe.",
      target: [
        path([
          { x: 100, y: 270 },
          { x: 100, y: 90 },
          { x: 480, y: 90 },
        ]),
      ],
      initial: [],
    },
    {
      name: "Eine Kurve zeichnen",
      goal: "Zeichne den Bogen mit zwei Punkten nach. Ziehe am ersten Punkt nach oben, am zweiten nach unten.",
      tip: "Die Griffe folgen deiner Ziehrichtung. Du kannst sie danach mit «Punkte bearbeiten» oder den Zahlenfeldern korrigieren.",
      target: [path([bend(110, 230, 0, -110), bend(490, 230, 0, 110)])],
      initial: [],
    },
    {
      name: "Griffe ausrichten",
      goal: "Bearbeite den mittleren Punkt. Drehe seine Griffe diagonal, bis deine Linie zur gestrichelten passt.",
      tip: "Shift richtet den Griff in 45°-Schritten aus. Wähle alternativ «45° einrasten». Verbundene Griffe liegen auf einer gemeinsamen Geraden.",
      target: [
        path([{ x: 90, y: 250 }, bend(300, 180, 70, -70), { x: 510, y: 110 }]),
      ],
      initial: [path([{ x: 90, y: 250 }, bend(300, 180), { x: 510, y: 110 }])],
      edit: true,
    },
    {
      name: "Längen getrennt ändern",
      goal: "Verlängere den rechten Griff des mittleren Punkts. Der linke Griff soll an seinem Ort bleiben.",
      tip: "Halte Control oder wähle «Richtung verbunden». Die Richtung bleibt gekoppelt, die andere Grifflänge bleibt erhalten. Alt/Option beziehungsweise «Frei» löst auch die Richtung.",
      target: [path([{ x: 90, y: 270 }, bend(300, 180), { x: 510, y: 90 }])],
      initial: [path([{ x: 90, y: 270 }, bend(300, 180), { x: 510, y: 90 }])],
      edit: true,
    },
    {
      name: "Linien verbinden",
      goal: "Klicke mit «Pfad zeichnen» auf das rechte Ende der unteren Linie. Klicke danach auf den Anfang der oberen Linie, um beide zu verbinden.",
      tip: "Ein offenes Ende setzt einen Pfad fort. Ein Ende eines anderen Pfads verbindet die Linien. Ohne Ziehen geht es über die Punktliste, «Hier weiterzeichnen» und «Verbinden».",
      target: [
        path([
          { x: 90, y: 260 },
          { x: 240, y: 260 },
          { x: 360, y: 100 },
          { x: 510, y: 100 },
        ]),
      ],
      initial: [
        path([
          { x: 90, y: 260 },
          { x: 240, y: 260 },
        ]),
        path([
          { x: 360, y: 100 },
          { x: 510, y: 100 },
        ]),
      ],
    },
    {
      name: "Eine Form schliessen",
      goal: "Zeichne die Raute. Klicke zum Schliessen ausdrücklich auf deinen ersten Punkt oder wähle «Pfad schliessen».",
      tip: "Nähe allein schliesst die Form nicht. Für eine offene Linie verwendest du «Linie beenden». Geschlossen und offen sind unterschiedliche Ergebnisse.",
      target: [
        path(
          [
            { x: 300, y: 55 },
            { x: 510, y: 180 },
            { x: 300, y: 305 },
            { x: 90, y: 180 },
          ],
          true,
        ),
      ],
      initial: [],
    },
    {
      name: "Frei üben",
      goal: "Zeichne ohne Zielvorgabe. Probiere Ecken, Rundungen, offene Enden und verschiedene Griffkopplungen aus.",
      tip: "Die Übung ist unabhängig von deinem Projekt. Sie wird nicht gespeichert. «Schritt zurück» und «Neu beginnen» betreffen nur diese Fläche.",
      target: [],
      initial: [],
    },
  ];
  lessons[3].target[0].points[1].out.x = 430;
  function create(index = 0) {
    const lesson = lessons[index] || lessons[0];
    return {
      lesson: index,
      paths: copy(lesson.initial),
      selected: lesson.edit ? { path: 0, node: 1 } : null,
      tool: lesson.edit ? "edit" : "draw",
      draft: null,
      draftBase: null,
      past: [],
      future: [],
    };
  }
  const snapshot = (s) =>
    copy({
      paths: s.paths,
      selected: s.selected,
      tool: s.tool,
      draft: s.draft,
      draftBase: s.draftBase,
    });
  function remember(s, before) {
    if (JSON.stringify(before) === JSON.stringify(snapshot(s))) return;
    s.past.push(before);
    if (s.past.length > 60) {
      s.past.shift();
      for (const item of [s, ...s.past])
        if (item.draftBase)
          item.draftBase.history = Math.max(0, item.draftBase.history - 1);
    }
    s.future = [];
  }
  function change(s, fn) {
    const before = snapshot(s);
    fn();
    remember(s, before);
  }
  function undo(s, redo = false) {
    const from = redo ? s.future : s.past,
      to = redo ? s.past : s.future;
    if (!from.length) return false;
    to.push(snapshot(s));
    Object.assign(s, from.pop());
    return true;
  }
  function begin(s) {
    if (!s.draftBase)
      s.draftBase = {
        paths: copy(s.paths),
        selected: copy(s.selected),
        history: s.past.length,
      };
  }
  function add(s, x, y) {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 600 ||
      y < 0 ||
      y > 360
    )
      return false;
    if (s.paths.reduce((n, p) => n + p.points.length, 0) >= 80) return false;
    if (s.draft === null && s.paths.length >= 8) return false;
    begin(s);
    if (s.draft === null) {
      s.paths.push(path([]));
      s.draft = s.paths.length - 1;
    }
    const p = s.paths[s.draft];
    p.points.push({ x, y });
    s.selected = { path: s.draft, node: p.points.length - 1 };
    return true;
  }
  function resume(s, pi, ni) {
    const p = s.paths[pi];
    if (!p || p.closed || ![0, p.points.length - 1].includes(ni)) return false;
    begin(s);
    if (ni === 0) p.points = Path.reverse(p.points);
    s.draft = pi;
    s.tool = "draw";
    s.selected = { path: pi, node: p.points.length - 1 };
    return true;
  }
  function connect(s, pi, ni) {
    const a = s.paths[s.draft],
      b = s.paths[pi];
    if (
      !a ||
      !b ||
      a === b ||
      b.closed ||
      ![0, b.points.length - 1].includes(ni)
    )
      return false;
    a.points = Path.join(
      a.points,
      ni === 0 ? b.points : Path.reverse(b.points),
    );
    s.paths.splice(pi, 1);
    const index = s.paths.indexOf(a);
    s.selected = { path: index, node: a.points.length - 1 };
    s.draft = null;
    s.draftBase = null;
    return true;
  }
  function finish(s, closed = false) {
    const pi = s.draft ?? s.selected?.path,
      p = s.paths[pi];
    if (!p || p.points.length < (closed ? 3 : 2)) return false;
    p.closed = closed;
    s.draft = null;
    s.draftBase = null;
    return true;
  }
  function cancel(s) {
    if (!s.draftBase) return false;
    const base = s.draftBase;
    s.paths = copy(base.paths);
    s.selected = copy(base.selected);
    s.past = s.past.slice(0, base.history);
    s.future = [];
    s.draft = null;
    s.draftBase = null;
    return true;
  }
  function moveNode(node, x, y) {
    const dx = x - node.x,
      dy = y - node.y;
    for (const key of ["in", "out"])
      if (node[key]) {
        node[key].x += dx;
        node[key].y += dy;
      }
    node.x = x;
    node.y = y;
  }
  function d(p) {
    if (!p.points.length) return "";
    let value = `M${p.points[0].x} ${p.points[0].y}`;
    for (let i = 1; i < p.points.length + (p.closed ? 1 : 0); i++) {
      const a = p.points[i - 1],
        b = p.points[i % p.points.length];
      value +=
        a.out || b.in
          ? `C${(a.out || a).x} ${(a.out || a).y} ${(b.in || b).x} ${(b.in || b).y} ${b.x} ${b.y}`
          : `L${b.x} ${b.y}`;
    }
    return value + (p.closed ? "Z" : "");
  }
  function samples(p) {
    const out = [],
      count = p.points.length - (p.closed ? 0 : 1);
    for (let i = 0; i < count; i++)
      for (let n = 0; n <= 20; n++)
        out.push(
          Path.pointAt(
            p.points[i],
            p.points[(i + 1) % p.points.length],
            n / 20,
          ),
        );
    return out;
  }
  function check(s) {
    const target = lessons[s.lesson].target;
    if (!target.length)
      return {
        ok: true,
        free: true,
        message: "Frei üben: Es gibt keine vorgegebene Lösung.",
      };
    if (
      s.paths.length !== target.length ||
      s.paths.some(
        (p, i) => p.closed !== target[i].closed || p.points.length < 2,
      )
    )
      return {
        ok: false,
        message:
          "Prüfe zuerst: Sind die Linien verbunden und die Form wie im Ziel offen oder geschlossen?",
      };
    if (s.draft !== null)
      return {
        ok: false,
        message: "Beende zuerst deine Linie oder schliesse die Form.",
      };
    if (s.lesson === 3) {
      const n = s.paths[0].points[1],
        t = target[0].points[1];
      if (
        !n.in ||
        !n.out ||
        Math.hypot(n.in.x - t.in.x, n.in.y - t.in.y) > 12 ||
        Math.hypot(n.out.x - t.out.x, n.out.y - t.out.y) > 15
      )
        return {
          ok: false,
          message:
            "Prüfe die Griffe: Verlängere den Ausgangsgriff nach rechts, während der Eingangsgriff am bisherigen Ort bleibt. Control oder «Richtung verbunden» hilft dabei.",
        };
    }
    const a = s.paths.flatMap(samples),
      b = target.flatMap(samples);
    const distances = (from, to) =>
      from.map((p) =>
        Math.min(...to.map((q) => Math.hypot(p.x - q.x, p.y - q.y))),
      );
    const values = [...distances(a, b), ...distances(b, a)],
      mean = values.reduce((a, b) => a + b, 0) / values.length,
      max = Math.max(...values),
      ok = mean <= 9 && max <= 22;
    return {
      ok,
      mean,
      max,
      message: ok
        ? "Gut getroffen! Deine Linie folgt der Zielkontur. Du kannst weiterüben oder zur nächsten Übung gehen."
        : "Noch nicht ganz: Vergleiche Punkte und Griff-Richtungen mit der Zielkontur. «Zielpunkte zeigen» hilft dir.",
    };
  }
  const api = Object.freeze({
    lessons,
    create,
    copy,
    snapshot,
    remember,
    change,
    undo,
    add,
    resume,
    connect,
    finish,
    cancel,
    moveNode,
    d,
    check,
  });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWBezierLessonModel = api;
})(globalThis);
