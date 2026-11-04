(function (root) {
  "use strict";
  const policy =
    typeof module !== "undefined"
      ? require("./carousel-policy.js")
      : root.MKWCarouselPolicy;
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const maxPages = 200,
    maxSpreadPages = 20,
    defaultGap = 240;
  const active = (c) => !!c?.pageStructure;
  const fail = (message) => {
    throw Error(message);
  };
  const effectSeed = (o) => {
    if (o.effectSeed !== undefined) return o.effectSeed;
    let seed = 2166136261;
    for (const char of o.id)
      seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
    return seed >>> 0;
  };
  const pageIds = (c) => c.artboards.map((a) => a.id);
  function valid(c, metadata = true) {
    const s = c?.pageStructure;
    if (!s) return true;
    if (
      !Array.isArray(c.artboards) ||
      c.layout !== "free" ||
      s.version !== 1 ||
      !["single", "spreads"].includes(s.mode) ||
      typeof s.shuffle !== "boolean" ||
      !["left", "right"].includes(s.binding) ||
      !Number.isInteger(s.gap) ||
      s.gap < 32 ||
      s.gap > 1000 ||
      !Number.isInteger(s.bleed) ||
      s.bleed < 0 ||
      s.bleed > 100 ||
      !Number.isInteger(s.startNumber) ||
      s.startNumber < 1 ||
      s.startNumber > 999999 ||
      !Array.isArray(s.groups) ||
      c.n < 0 ||
      c.n > maxPages
    )
      return false;
    if (
      metadata &&
      s.artboardInfo !== undefined &&
      (!Array.isArray(s.artboardInfo) ||
        s.artboardInfo.length !== s.groups.length ||
        new Set(s.artboardInfo.map((v) => v?.id)).size !==
          s.artboardInfo.length ||
        s.artboardInfo.some(
          (v) =>
            !v ||
            typeof v.id !== "string" ||
            !/^[-\w]{1,160}$/.test(v.id) ||
            typeof v.name !== "string" ||
            !v.name.trim() ||
            v.name.length > 80,
        ))
    )
      return false;
    const ids = pageIds(c),
      flat = s.groups.flat();
    return (
      s.groups.every(
        (g) =>
          Array.isArray(g) &&
          g.length > 0 &&
          g.length <= maxSpreadPages &&
          (s.mode !== "single" || g.length === 1),
      ) &&
      flat.length === ids.length &&
      new Set(flat).size === ids.length &&
      flat.every((id, i) => id === ids[i])
    );
  }
  function groups(ids, mode) {
    if (mode === "single") return ids.map((id) => [id]);
    return Array.from({ length: Math.ceil(ids.length / 2) }, (_, i) =>
      ids.slice(i * 2, i * 2 + 2),
    );
  }
  function initialise(source, id) {
    const c = copy(source);
    delete c.pageGroups;
    if (!policy.isFree(c)) {
      c.artboards = policy
        .frames(c)
        .map((a, i) => ({ ...a, id: id(), name: `Seite ${i + 1}` }));
      c.layout = "free";
    }
    c.pageStructure = {
      version: 1,
      mode: "single",
      shuffle: true,
      binding: "left",
      gap: defaultGap,
      bleed: 0,
      startNumber: 1,
      groups: groups(pageIds(c), "single"),
    };
    return c;
  }
  function pack(c) {
    const s = c.pageStructure,
      byId = new Map(c.artboards.map((a) => [a.id, a]));
    let x = 0,
      y = 0,
      columnWidth = 0;
    for (const group of s.groups) {
      const pages = group.map((id) => byId.get(id)),
        w = pages.reduce((sum, a) => sum + a.w, 0),
        h = Math.max(...pages.map((a) => a.h));
      if (y && y + h > 100000) {
        x += columnWidth + s.gap;
        y = 0;
        columnWidth = 0;
      }
      let left = x;
      if (s.binding === "right") pages.reverse();
      for (const a of pages) {
        a.x = left;
        a.y = y;
        left += a.w;
      }
      y += h + s.gap;
      columnWidth = Math.max(columnWidth, w);
    }
  }
  const sharedArea = (a, b) =>
    Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  function carry(
    before,
    after,
    bounds,
    id,
    deleteIds = new Set(),
    deleteContent = false,
  ) {
    const oldFrames = policy.frames(before),
      frames = new Map(after.artboards.map((a) => [a.id, a])),
      result = [];
    const oldIds =
      before.artboards?.map((a) => a.id) ||
      after.artboards.slice(0, before.n).map((a) => a.id);
    const sourceMap = new Map();
    for (const o of before.objects) {
      const b = bounds(o),
        hits = oldFrames
          .map((a, i) => ({ a, id: oldIds[i], area: sharedArea(a, b) }))
          .filter((v) => (o.pageFragment ? o.pageId === v.id : v.area > 0));
      const kept = hits.filter((v) => frames.has(v.id));
      if (!kept.length) {
        if (
          deleteContent &&
          hits.length &&
          o.type !== "logo" &&
          hits.every((v) => deleteIds.has(v.id))
        )
          continue;
        const item = copy(o);
        if (hits.length && hits.every((v) => deleteIds.has(v.id))) {
          const extent = policy.extent(after),
            shift = extent.w + after.pageStructure.gap - Math.min(0, b.x);
          item.x += shift;
          if (Math.abs(item.x) > 100000)
            fail(
              "Für die behaltenen Inhalte fehlt Platz auf der Montagefläche. Wähle einen kleineren Bogenbereich oder behalte das Original mit Rückgängig.",
            );
        }
        delete item.pageId;
        delete item.pageFragment;
        result.push(item);
        continue;
      }
      const deltas = kept.map((v) => ({
        ...v,
        dx: frames.get(v.id).x - v.a.x,
        dy: frames.get(v.id).y - v.a.y,
      }));
      const split =
        o.pageFragment ||
        deltas.some((v) => v.dx !== deltas[0].dx || v.dy !== deltas[0].dy);
      const chosen = split
        ? deltas
        : [deltas.reduce((a, b) => (a.area >= b.area ? a : b))];
      chosen.forEach((v, i) => {
        const item = {
          ...copy(o),
          id: i === 0 ? o.id : id(),
          x: o.x + v.dx,
          y: o.y + v.dy,
          pageId: v.id,
        };
        if (split) {
          item.pageFragment = true;
          item.effectSeed = effectSeed(o);
        } else delete item.pageFragment;
        if (Math.abs(item.x) > 100000 || Math.abs(item.y) > 100000)
          fail(
            "Ein Inhalt würde ausserhalb des unterstützten Bereichs liegen. Verschiebe ihn zuerst näher an seine Seite.",
          );
        sourceMap.set(`${o.id}:${v.id}`, item.id);
        result.push(item);
      });
    }
    for (const o of result)
      if (o.imageSourceId) {
        const target = sourceMap.get(`${o.imageSourceId}:${o.pageId}`);
        if (target) o.imageSourceId = target;
        else if (!result.some((v) => v.id === o.imageSourceId))
          delete o.imageSourceId;
      }
    if (result.length > 500)
      fail(
        "Diese Änderung würde mehr als 500 Ebenen erzeugen. Reduziere übergreifende Inhalte oder teile das Projekt auf. Es wurde nichts verändert.",
      );
    after.objects = result;
  }
  function execute(
    source,
    action,
    bounds = (o) => o,
    id = (() => {
      let n = 0;
      return () => `spread-${++n}`;
    })(),
  ) {
    if (action.type === "edit-spread") {
      const base = action.ids?.[0],
        group = source.pageStructure?.groups.find((g) => g.includes(base));
      if (!group) fail("Wähle einen vorhandenen Druckbogen.");
      let result =
        group.length === action.count
          ? copy(source)
          : plan(
              source,
              { type: "resize-spread", ids: [base], count: action.count },
              bounds,
              id,
            );
      if (action.format) {
        const ids = result.pageStructure.groups.find((g) => g.includes(base));
        result = plan(
          result,
          { type: "format", ids, format: action.format },
          bounds,
          id,
        );
      }
      const ids = result.pageStructure.groups.find((g) => g.includes(base)),
        frames = ids.map((id) => result.artboards.find((a) => a.id === id)),
        a = frames[0],
        x = Math.min(...frames.map((a) => a.x)),
        y = Math.min(...frames.map((a) => a.y));
      if (action.x !== x || action.y !== y)
        result = plan(
          result,
          {
            type: "position",
            ids: [base],
            x: a.x + action.x - x,
            y: a.y + action.y - y,
          },
          bounds,
          id,
        );
      return result;
    }
    if (action.type === "batch") {
      let result = copy(source);
      for (const operation of action.actions)
        result = plan(result, operation, bounds, id);
      return result;
    }
    const used = new Set(
      [...(source.artboards || []), ...source.objects].map((v) => v.id),
    );
    const nextId = id;
    id = () => {
      let value = nextId();
      while (used.has(value)) value = nextId();
      used.add(value);
      return value;
    };
    const before = copy(source),
      c = active(source) ? copy(source) : initialise(source, id),
      s = c.pageStructure;
    if (!active(source) && action.type !== "enable" && action.type !== "mode")
      fail("Aktiviere zuerst die Seitenverwaltung.");
    if (active(source) && !valid(c)) fail("Die Seitenstruktur ist beschädigt.");
    const selected = new Set(action.ids || []),
      existing = pageIds(c);
    if ([...selected].some((v) => !existing.includes(v)))
      fail("Eine ausgewählte Seite ist nicht mehr vorhanden.");
    let removed = new Set(),
      deleteContent = false,
      reorder = false;
    switch (action.type) {
      case "enable":
        if (!policy.isFree(source)) {
          s.mode = "spreads";
          s.shuffle = false;
          s.groups = [existing];
          return c;
        }
        break;
      case "mode":
        if (!["single", "spreads"].includes(action.mode))
          fail("Wähle einen gültigen Seitenmodus.");
        s.mode = action.mode;
        if (s.mode === "spreads") {
          s.shuffle = false;
          if (!active(source) && !policy.isFree(source)) s.groups = [existing];
          return c;
        }
        s.groups = groups(existing, s.mode);
        break;
      case "settings": {
        const rearrange =
          action.binding !== undefined ||
          action.gap !== undefined ||
          action.shuffle === true;
        for (const key of ["binding", "gap", "bleed", "startNumber", "shuffle"])
          if (action[key] !== undefined) s[key] = action[key];
        if (action.shuffle === true) s.groups = groups(existing, s.mode);
        if (!rearrange) {
          if (!valid(c, false))
            fail("Ungültige Druckangaben. Es wurde nichts verändert.");
          return c;
        }
        break;
      }
      case "resize-spread": {
        const groupIndex = s.groups.findIndex((g) =>
            g.some((value) => selected.has(value)),
          ),
          group = s.groups[groupIndex],
          count = action.count;
        if (
          !group ||
          !Number.isInteger(count) ||
          count < 1 ||
          count > maxSpreadPages
        )
          fail("Ein Druckbogen kann 1–20 Seiten enthalten.");
        const difference = count - group.length;
        if (c.n + Math.max(0, difference) > maxPages)
          fail("Ein Projekt kann höchstens 200 Seiten enthalten.");
        if (difference > 0) {
          const base = c.artboards.find((a) => a.id === group[0]),
            added = Array.from({ length: difference }, (_, i) => ({
              ...base,
              id: id(),
              name: `Seite ${c.n + i + 1}`,
            })),
            index = c.artboards.findIndex((a) => a.id === group.at(-1)) + 1;
          c.artboards.splice(index, 0, ...added);
          s.groups[groupIndex] = [...group, ...added.map((a) => a.id)];
        } else if (difference < 0)
          s.groups.splice(
            groupIndex,
            1,
            group.slice(0, count),
            ...group.slice(count).map((id) => [id]),
          );
        if (count > 1) s.mode = "spreads";
        s.shuffle = false;
        break;
      }
      case "join": {
        if (selected.size > maxSpreadPages)
          fail(
            "Ein Druckbogen kann höchstens 20 Seiten enthalten. Es wurde nichts verändert.",
          );
        if (selected.size < 2) fail("Wähle mindestens zwei Seiten aus.");
        const chosen = existing.filter((v) => selected.has(v)),
          index = existing.findIndex((v) => selected.has(v));
        const order = existing.filter((v) => !selected.has(v));
        order.splice(index, 0, ...chosen);
        c.artboards = order.map((v) => c.artboards.find((a) => a.id === v));
        s.groups = s.groups
          .map((g) => g.filter((v) => !selected.has(v)))
          .filter((g) => g.length);
        const insert = s.groups.findIndex((g) => order.indexOf(g[0]) > index);
        s.groups.splice(insert < 0 ? s.groups.length : insert, 0, chosen);
        s.mode = "spreads";
        s.shuffle = false;
        break;
      }
      case "detach":
        s.groups = s.groups.flatMap((g) => {
          const result = [];
          let run = [];
          for (const value of g) {
            if (selected.has(value)) {
              if (run.length) result.push(run);
              result.push([value]);
              run = [];
            } else run.push(value);
          }
          if (run.length) result.push(run);
          return result;
        });
        s.shuffle = false;
        break;
      case "split":
        s.groups = s.groups.flatMap((g) =>
          g.some((v) => selected.has(v)) ? g.map((v) => [v]) : [g],
        );
        s.shuffle = false;
        break;
      case "move": {
        const moving = existing.filter((v) => selected.has(v));
        if (
          !moving.length ||
          !Number.isInteger(action.index) ||
          action.index < 0 ||
          action.index > existing.length
        )
          fail("Wähle Seiten und eine gültige Zielposition.");
        const target = existing[action.index],
          order = existing.filter((v) => !selected.has(v));
        let index = target ? order.indexOf(target) : order.length;
        if (index < 0) return copy(source);
        order.splice(index, 0, ...moving);
        c.artboards = order.map((v) => c.artboards.find((a) => a.id === v));
        reorder = true;
        break;
      }
      case "append-page": {
        const group = s.groups.find((g) => g.some((v) => selected.has(v)));
        if (!group || group.length >= maxSpreadPages || c.n >= maxPages)
          fail(
            "Ein Artboard kann höchstens 20 Seiten enthalten; ein Projekt höchstens 200.",
          );
        const members = group.map((v) => c.artboards.find((a) => a.id === v)),
          base = members.at(-1),
          page = {
            ...base,
            id: id(),
            name: `Seite ${c.n + 1}`,
            x:
              s.binding === "right"
                ? Math.min(...members.map((a) => a.x)) - base.w
                : Math.max(...members.map((a) => a.x + a.w)),
            y: members[0].y,
          };
        if (page.x < 0 || page.x + page.w > 100000 || page.y + page.h > 100000)
          fail(
            "Neben diesem Bogen fehlt Platz. Verschiebe ihn zuerst weiter in die Montagefläche.",
          );
        if (
          c.artboards.some(
            (a) => !group.includes(a.id) && sharedArea(a, page) > 0,
          )
        )
          fail(
            "Die neue Seite würde ein anderes Artboard überdecken. Verschiebe dieses zuerst, oder erstelle ein unabhängiges Artboard.",
          );
        c.artboards.splice(
          c.artboards.findIndex((a) => a.id === group.at(-1)) + 1,
          0,
          page,
        );
        group.push(page.id);
        c.n++;
        s.mode = "spreads";
        s.shuffle = false;
        return c;
      }
      case "add": {
        const count = action.count ?? 1;
        if (
          !Number.isInteger(count) ||
          count < 1 ||
          count > maxPages ||
          c.n + count > maxPages
        )
          fail(`Ein Projekt kann höchstens ${maxPages} Seiten enthalten.`);
        const base = c.artboards.find((a) => selected.has(a.id)) ||
          c.artboards.at(-1) || {
            ...Object.fromEntries(policy.formatKeys.map((k) => [k, c[k]])),
            bg: c.bg,
          };
        const added = Array.from({ length: count }, (_, i) => ({
          ...base,
          id: id(),
          name: `Seite ${c.n + i + 1}`,
        }));
        c.artboards.push(...added);
        if (action.spread) {
          if (count > maxSpreadPages)
            fail("Ein Artboard kann höchstens 20 Seiten enthalten.");
          const extent = policy.extent(source),
            width = added.reduce((sum, a) => sum + a.w, 0),
            height = Math.max(...added.map((a) => a.h));
          let x = 0,
            y = source.n ? extent.h + s.gap : 0;
          if (y + height > 100000) {
            x = extent.w + s.gap;
            y = 0;
          }
          if (x + width > 100000 || y + height > 100000)
            fail(
              "Für ein weiteres Artboard fehlt Platz auf der Montagefläche.",
            );
          for (const a of s.binding === "right"
            ? [...added].reverse()
            : added) {
            a.x = x;
            a.y = y;
            x += a.w;
          }
          if (count > 1) s.mode = "spreads";
          s.shuffle = false;
          s.groups.push(added.map((a) => a.id));
          c.n = c.artboards.length;
          return c;
        } else s.groups.push(...added.map((a) => [a.id]));
        break;
      }
      case "duplicate": {
        if (!selected.size || c.n + selected.size > maxPages)
          fail(`Wähle Seiten; höchstens ${maxPages} sind möglich.`);
        const added = c.artboards
          .filter((a) => selected.has(a.id))
          .map((a) => ({
            ...a,
            id: id(),
            name: `${a.name} Kopie`.slice(0, 80),
          }));
        c.artboards.push(...added);
        s.groups.push(...added.map((a) => [a.id]));
        break;
      }
      case "delete":
        removed = selected;
        deleteContent = action.content === true;
        c.artboards = c.artboards.filter((a) => !removed.has(a.id));
        s.groups = s.groups
          .map((g) => g.filter((v) => !removed.has(v)))
          .filter((g) => g.length);
        break;
      case "edit": {
        const a = c.artboards.find((a) => selected.has(a.id));
        if (!a || selected.size !== 1) fail("Wähle eine Seite.");
        const changes = action.values;
        if (
          typeof changes.name !== "string" ||
          !changes.name.trim() ||
          changes.name.length > 80 ||
          !/^#[0-9a-f]{6}$/i.test(changes.bg) ||
          !policy.validFormat(changes)
        )
          fail("Prüfe Namen, Farbe, Format und Schutzzonen.");
        const group = s.groups.find((g) => g.includes(a.id)),
          dx = changes.x - a.x,
          dy = changes.y - a.y;
        for (const other of c.artboards)
          if (group.includes(other.id)) {
            other.x += dx;
            other.y += dy;
          }
        const resize = policy.formatKeys.some((k) => a[k] !== changes[k]);
        Object.assign(a, changes);
        if (resize) pack(c);
        carry(before, c, bounds, id);
        if (!policy.validBoards(c))
          fail("Die Änderung passt nicht in den Arbeitsbereich.");
        return c;
      }
      case "position": {
        if (
          !Number.isInteger(action.x) ||
          !Number.isInteger(action.y) ||
          action.x < 0 ||
          action.y < 0
        )
          fail("Positionen müssen ganze positive Pixelwerte sein.");
        const first = c.artboards.find((a) => selected.has(a.id));
        if (!first) fail("Wähle einen Bogen.");
        const group = s.groups.find((g) => g.includes(first.id)),
          dx = action.x - first.x,
          dy = action.y - first.y;
        for (const a of c.artboards)
          if (group.includes(a.id)) {
            a.x += dx;
            a.y += dy;
          }
        if (!policy.validBoards(c))
          fail(
            "Der Bogen überschneidet eine andere Seite oder liegt zu weit ausserhalb.",
          );
        carry(before, c, bounds, id);
        return c;
      }
      case "rename": {
        if (
          selected.size !== 1 ||
          typeof action.name !== "string" ||
          !action.name.trim() ||
          action.name.trim().length > 80
        )
          fail("Verwende einen Seitennamen mit 1–80 Zeichen.");
        c.artboards.find((a) => selected.has(a.id)).name = action.name.trim();
        return c;
      }
      case "format":
        if (!selected.size || !policy.validFormat(action.format))
          fail(
            "Wähle Seiten und ein gültiges Format (240–4000 px); die Schutzzonen müssen in die Seite passen.",
          );
        for (const a of c.artboards)
          if (selected.has(a.id)) Object.assign(a, action.format);
        break;
      default:
        fail("Unbekannte Seitenaktion.");
    }
    c.n = c.artboards.length;
    if (
      s.shuffle &&
      (reorder ||
        ["add", "duplicate", "delete", "format"].includes(action.type))
    )
      s.groups = groups(pageIds(c), s.mode);
    else if (reorder) {
      const original = s.groups;
      s.groups = [];
      for (const a of c.artboards) {
        const g = original.find((g) => g.includes(a.id)),
          prev = s.groups.at(-1);
        if (prev && g.includes(prev.at(-1))) prev.push(a.id);
        else s.groups.push([a.id]);
      }
    }
    if (!valid(c, false))
      fail(
        "Ungültige Seitenangaben. Abstand: 32–1000 px, Anschnitt: 0–100 px, Seitennummer: 1–999999.",
      );
    if (action.type !== "enable" || !policy.isFree(source)) pack(c);
    carry(before, c, bounds, id, removed, deleteContent);
    if (action.type === "duplicate") {
      const originals = before.artboards.filter((a) => selected.has(a.id)),
        added = c.artboards.slice(-originals.length);
      const copies = [];
      originals.forEach((a, i) => {
        for (const o of before.objects)
          if (
            o.pageId === a.id ||
            (!o.pageFragment && sharedArea(a, bounds(o)) > 0)
          )
            copies.push({
              ...copy(o),
              id: id(),
              pageId: added[i].id,
              pageFragment: true,
              effectSeed: effectSeed(o),
              x: o.x + added[i].x - a.x,
              y: o.y + added[i].y - a.y,
            });
      });
      for (const a of added) {
        const originalsForPage = before.objects.filter(
          (o) =>
            o.pageId === originals[added.indexOf(a)].id ||
            (!o.pageFragment &&
              sharedArea(originals[added.indexOf(a)], bounds(o)) > 0),
        );
        const copiesForPage = copies.filter((o) => o.pageId === a.id),
          links = new Map(
            originalsForPage.map((o, i) => [o.id, copiesForPage[i].id]),
          );
        for (const o of copiesForPage)
          if (o.imageSourceId) {
            if (links.has(o.imageSourceId))
              o.imageSourceId = links.get(o.imageSourceId);
            else delete o.imageSourceId;
          }
      }
      c.objects.push(...copies);
    }
    if (c.objects.length > 500 || !policy.validBoards(c))
      fail(
        "Die Seiten passen nicht in den unterstützten Arbeitsbereich oder überschreiten 500 Ebenen. Es wurde nichts verändert.",
      );
    return c;
  }
  function plan(source, action, bounds = (o) => o, id) {
    let n = 0;
    const used = new Set(
      [
        ...(source.artboards || []),
        ...(source.objects || []),
        ...(source.pageStructure?.artboardInfo || []),
      ].map((v) => v.id),
    );
    const generate = id || (() => `structure-${++n}`);
    const makeId = () => {
      const base = generate();
      let value = base,
        suffix = 0;
      while (used.has(value)) value = `${base}-${++suffix}`;
      used.add(value);
      return value;
    };
    if (action.type === "duplicate-to") {
      const originals = new Set(pageIds(source));
      const c = plan(
        source,
        { type: "duplicate", ids: action.ids },
        bounds,
        makeId,
      );
      const ids = pageIds(c).filter((id) => !originals.has(id));
      return plan(
        c,
        action.artboardId
          ? { type: "move-to-artboard", id: action.artboardId, ids }
          : { type: "move", ids, index: action.index },
        bounds,
        makeId,
      );
    }
    if (action.type === "move-to-artboard") {
      const info = source.pageStructure?.artboardInfo,
        index = info?.findIndex((a) => a.id === action.id);
      if (index === undefined || index < 0)
        fail("Wähle ein vorhandenes Ziel-Artboard.");
      const target = source.pageStructure.groups[index],
        ids = [...new Set([...target, ...action.ids])];
      if (ids.length > maxSpreadPages)
        fail("In einem Artboard sind höchstens 20 Seiten möglich.");
      if (action.ids.every((id) => target.includes(id))) return copy(source);
      const result = plan(source, { type: "join", ids }, bounds, makeId),
        at = result.pageStructure.groups.findIndex((g) =>
          g.includes(target[0]),
        );
      result.pageStructure.artboardInfo[at] = { ...info[index] };
      const usedNames = new Set([info[index].id]);
      result.pageStructure.groups.forEach((g, i) => {
        if (i === at) return;
        let best = -1,
          score = 0;
        source.pageStructure.groups.forEach((old, j) => {
          const shared = old.filter((id) => g.includes(id)).length;
          if (!usedNames.has(info[j].id) && shared > score) {
            best = j;
            score = shared;
          }
        });
        if (best >= 0) {
          result.pageStructure.artboardInfo[i] = { ...info[best] };
          usedNames.add(info[best].id);
        }
      });
      return result;
    }
    if (action.type === "rename-artboard") {
      const c = copy(source),
        info = c.pageStructure?.artboardInfo?.find((a) => a.id === action.id);
      if (
        !info ||
        typeof action.name !== "string" ||
        !action.name.trim() ||
        action.name.trim().length > 80
      )
        fail("Gib dem Artboard einen Namen mit 1–80 Zeichen.");
      info.name = action.name.trim();
      return c;
    }
    if (action.type === "duplicate-artboard") {
      const s = source.pageStructure,
        index = s?.artboardInfo?.findIndex((a) => a.id === action.id);
      if (index === undefined || index < 0) fail("Wähle ein Artboard.");
      const originals = new Set(pageIds(source)),
        group = s.groups[index];
      let c = plan(source, { type: "duplicate", ids: group }, bounds, makeId);
      const added = pageIds(c).filter((v) => !originals.has(v));
      if (added.length > 1)
        c = plan(c, { type: "join", ids: added }, bounds, makeId);
      const i = c.pageStructure.groups.findIndex((g) => g.includes(added[0]));
      c.pageStructure.artboardInfo[i].name =
        `${s.artboardInfo[index].name} Kopie`.slice(0, 80);
      return c;
    }
    const next = execute(source, action, bounds, makeId);
    const old = source.pageStructure,
      usedGroups = new Set();
    next.pageStructure.artboardInfo = next.pageStructure.groups.map(
      (group, i) => {
        let best = -1,
          score = 0;
        (old?.groups || []).forEach((g, j) => {
          const shared = g.filter((id) => group.includes(id)).length;
          if (!usedGroups.has(j) && shared > score) {
            score = shared;
            best = j;
          }
        });
        if (best >= 0) {
          usedGroups.add(best);
          const info = old.artboardInfo?.[best];
          if (info) return { ...info };
        }
        return { id: makeId(), name: `Artboard ${i + 1}` };
      },
    );
    if (!valid(next)) fail("Die Artboard-Struktur ist ungültig.");
    return next;
  }
  const api = Object.freeze({
    active,
    valid,
    plan,
    maxPages,
    maxSpreadPages,
    defaultGap,
  });
  if (typeof module !== "undefined") module.exports = api;
  root.MKWSpreadLayoutModel = api;
})(globalThis);
