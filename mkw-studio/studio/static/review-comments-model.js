/* Internal review metadata. No artwork, asset bytes or browser state. */
(function (root) {
  "use strict";
  const maxLength = 1000;
  function normalize(value) {
    if (typeof value !== "string" || value.length > maxLength)
      throw Error(
        `Bitte höchstens ${maxLength} Zeichen als reinen Text eingeben.`,
      );
    return value.replace(/\r\n?/g, "\n").trim();
  }
  function target(project, boardId) {
    const board = project.boards.find((b) => b.id === boardId);
    if (!board) return null;
    if (project.campaign) {
      const row = project.campaign.rows.find((r) =>
        r.pages.includes(board.campaignPage),
      );
      return row && project.images.some((im) => im.id === row.imageId)
        ? { kind: "image", id: row.imageId }
        : null;
    }
    if (project.carousel) {
      const page = project.carousel.artboards?.[board.carouselSlide];
      return page
        ? { kind: "page", id: page.id }
        : { kind: "board", id: board.id };
    }
    return project.images.some((im) => im.id === board.imageId)
      ? { kind: "image", id: board.imageId }
      : null;
  }
  function owner(project, ref) {
    if (!ref) return null;
    if (ref.kind === "image")
      return project.images.find((im) => im.id === ref.id);
    if (ref.kind === "page")
      return project.carousel?.artboards?.find((a) => a.id === ref.id);
    if (ref.kind === "board" && project.carousel && !project.carousel.artboards)
      return project.boards.find((b) => b.id === ref.id);
    return null;
  }
  function read(project, ref) {
    const value = owner(project, ref)?.reviewComment;
    return typeof value === "string" ? value : "";
  }
  function update(project, ref, raw) {
    const value = normalize(raw),
      source = owner(project, ref);
    if (!source)
      throw Error(
        "Dieses Bild ist nicht mehr vorhanden. Bitte die Vorschau erneut öffnen.",
      );
    if ((source.reviewComment || "") === value) return project;
    const next = { ...source };
    if (value) next.reviewComment = value;
    else delete next.reviewComment;
    if (ref.kind === "image")
      return {
        ...project,
        images: project.images.map((im) => (im === source ? next : im)),
      };
    if (ref.kind === "page")
      return {
        ...project,
        carousel: {
          ...project.carousel,
          artboards: project.carousel.artboards.map((a) =>
            a === source ? next : a,
          ),
        },
      };
    return {
      ...project,
      boards: project.boards.map((b) => (b === source ? next : b)),
    };
  }
  // Old Designer notes live on real boards until canonical pages exist. Adopt metadata only.
  function adopt(project) {
    if (!project.carousel?.artboards || project.campaign) return project;
    let next = project;
    for (const b of project.boards) {
      if (b.reviewComment === undefined) continue;
      const page = next.carousel.artboards[b.carouselSlide];
      if (!page) continue;
      if (page.reviewComment === undefined)
        next = update(next, { kind: "page", id: page.id }, b.reviewComment);
      next = {
        ...next,
        boards: next.boards.map((v) => {
          if (v.id !== b.id) return v;
          const copy = { ...v };
          delete copy.reviewComment;
          return copy;
        }),
      };
    }
    return next;
  }
  function validate(project) {
    for (const value of [
      ...(project.images || []),
      ...(project.boards || []),
      ...(project.carousel?.artboards || []),
    ]) {
      if (value.reviewComment !== undefined) normalize(value.reviewComment);
    }
  }
  const api = Object.freeze({
    maxLength,
    normalize,
    target,
    owner,
    read,
    update,
    adopt,
    validate,
  });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWReviewCommentsModel = api;
})(globalThis);
