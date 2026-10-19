"use strict";
// Library ordering moves metadata only. No image decoding or writes while dragging.
function sponsorBindOrdering(root, save) {
  let dragging = null,
    drop = null,
    saving = false;
  const clear = () => {
    for (const el of root.querySelectorAll(
      ".sponsor-drop-before,.sponsor-drop-after,.sponsor-drop-group",
    ))
      el.classList.remove(
        "sponsor-drop-before",
        "sponsor-drop-after",
        "sponsor-drop-group",
      );
  };
  const commit = async (source, destination) => {
    if (saving) return;
    const previous = sponsorGroups;
    try {
      const next = MKWSponsors.moveLogo(
        previous,
        source.groupId,
        source.logoId,
        destination.groupId,
        destination.beforeId,
      );
      if (!next) return;
      saving = true;
      const controls = [...root.querySelectorAll("button,input")];
      for (const control of controls) control.disabled = true;
      sponsorGroups = next;
      try {
        await save();
      } catch (error) {
        sponsorGroups = previous;
        for (const control of controls) control.disabled = false;
        throw error;
      }
      await sponsorRenderSettings();
      const moved = [...root.querySelectorAll("[data-sponsor-drag]")].find(
        (el) => el.dataset.sponsorDrag === source.logoId,
      );
      moved?.focus({ preventScroll: true });
      moved?.scrollIntoView({ block: "nearest" });
      root.querySelector("#sponsorLibraryStatus").textContent =
        "Logo verschoben. Vorhandene Projektleisten bei Bedarf über die Bibliothek aktualisieren.";
    } catch (error) {
      root.querySelector("#sponsorLibraryStatus").textContent = error.message;
    } finally {
      saving = false;
    }
  };
  root.ondragstart = (event) => {
    const row = event.target.closest("[data-sponsor-drag]");
    if (!row || saving || event.target.closest("button,input"))
      return event.preventDefault();
    dragging = {
      logoId: row.dataset.sponsorDrag,
      groupId: row.dataset.sourceGroup,
    };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "application/x-mkw-sponsor",
      JSON.stringify(dragging),
    );
    row.classList.add("sponsor-is-dragging");
  };
  root.ondragover = (event) => {
    if (!dragging || saving) return;
    const group = event.target.closest(".sponsor-library-group");
    if (!group) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clear();
    const row = event.target.closest("[data-sponsor-drag]"),
      after =
        row &&
        event.clientY >=
          row.getBoundingClientRect().top +
            row.getBoundingClientRect().height / 2;
    drop = {
      groupId: group.dataset.libraryGroup,
      beforeId: row
        ? (after
            ? row.nextElementSibling?.dataset.sponsorDrag
            : row.dataset.sponsorDrag) || null
        : null,
    };
    (row || group).classList.add(
      row
        ? after
          ? "sponsor-drop-after"
          : "sponsor-drop-before"
        : "sponsor-drop-group",
    );
  };
  root.ondragleave = (event) => {
    if (!root.contains(event.relatedTarget)) {
      clear();
      drop = null;
    }
  };
  root.ondrop = (event) => {
    if (!dragging || !drop) return;
    event.preventDefault();
    const source = dragging,
      destination = drop;
    dragging = drop = null;
    clear();
    commit(source, destination);
  };
  root.ondragend = () => {
    dragging = drop = null;
    clear();
    root
      .querySelector(".sponsor-is-dragging")
      ?.classList.remove("sponsor-is-dragging");
  };
  root.onkeydown = (event) => {
    const row = event.target.closest("[data-sponsor-drag]");
    if (
      !row ||
      event.target !== row ||
      !event.altKey ||
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    )
      return;
    event.preventDefault();
    const groupIndex = sponsorGroups.findIndex(
        (g) => g.id === row.dataset.sourceGroup,
      ),
      group = sponsorGroups[groupIndex],
      index = group.logos.findIndex((l) => l.id === row.dataset.sponsorDrag),
      source = { groupId: group.id, logoId: row.dataset.sponsorDrag };
    if (event.key === "ArrowUp" && index > 0)
      commit(source, {
        groupId: group.id,
        beforeId: group.logos[index - 1].id,
      });
    if (event.key === "ArrowDown" && index < group.logos.length - 1)
      commit(source, {
        groupId: group.id,
        beforeId: group.logos[index + 2]?.id,
      });
    const target =
      sponsorGroups[groupIndex + (event.key === "ArrowLeft" ? -1 : 1)];
    if (["ArrowLeft", "ArrowRight"].includes(event.key) && target)
      commit(source, { groupId: target.id });
  };
}
