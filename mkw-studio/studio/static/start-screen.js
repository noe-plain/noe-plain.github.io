"use strict";
// Tool-only start artwork. This service never touches a project or its assets.
const MKWStartScreen = (() => {
  const dialog = document.querySelector("#startDialog"),
    settings = document.querySelector("#settingsDialog"),
    card = document.createElement("section"),
    notice = document.createElement("p");
  card.className = "settings-start-background";
  card.innerHTML = `<h3>Startseite</h3><p>Ein eigenes Bild für deinen Einstieg ins Studio. Deine Designs bleiben unverändert.</p><div class="settings-start-background-preview"><span>Hintergrund aus deiner Hauptfarbe</span><img id="startBackgroundPreview" alt="Vorschau deines Startbilds" hidden decoding="async"></div><div class="settings-start-background-actions"><button id="chooseStartBackground" type="button">Bild auswählen</button><button id="removeStartBackground" type="button" disabled>Entfernen</button></div><input id="startBackgroundFile" type="file" accept="image/jpeg,image/png,image/webp" hidden><p id="startBackgroundStatus" role="status"></p>`;
  document.querySelector("#settings-panel-general").append(card);
  MKWSettings.register(
    "background",
    "general",
    ".settings-start-background",
    "Startbild",
    "Ein Hintergrundbild für die Startseite auswählen oder entfernen.",
    "hintergrund foto bild startseite",
  );
  notice.id = "startBackgroundNotice";
  notice.setAttribute("role", "status");
  notice.hidden = true;
  document.querySelector("#startStatus").after(notice);
  const choose = card.querySelector("#chooseStartBackground"),
    remove = card.querySelector("#removeStartBackground"),
    file = card.querySelector("#startBackgroundFile"),
    preview = card.querySelector("img"),
    status = card.querySelector("#startBackgroundStatus");
  let currentURL = null,
    generation = 0,
    locks = 0,
    working = false,
    available = false,
    mutation = Promise.resolve();
  const maxBytes = 2 * 1024 * 1024;
  function controls() {
    choose.disabled = working || locks > 0;
    remove.disabled = working || locks > 0 || !available;
    choose.textContent = available ? "Ersetzen" : "Bild auswählen";
  }
  function message(text = "", error = false) {
    status.textContent = text;
    status.classList.toggle("is-error", error);
    status.setAttribute("role", error ? "alert" : "status");
    notice.hidden = !error;
    notice.textContent = error ? text : "";
  }
  function release() {
    dialog.style.removeProperty("--studio-start-image");
    preview.removeAttribute("src");
    preview.hidden = true;
    if (currentURL) URL.revokeObjectURL(currentURL);
    currentURL = null;
  }
  async function refresh(force = false) {
    if (!dialog.open && !settings.open) {
      generation++;
      release();
      return;
    }
    // Keep the same decoded image while moving between start and settings.
    if (!force && currentURL) return;
    const token = ++generation;
    const finishLoading = MKWUIControls.loading(preview.parentElement);
    release();
    try {
      const blob = await MKWSetupStore.background();
      if (token !== generation || (!dialog.open && !settings.open)) return;
      available = !!blob;
      controls();
      preview.previousElementSibling.hidden = available;
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      // Decode the bounded stored image before making it visible.
      preview.src = url;
      try {
        await preview.decode();
      } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
      }
      if (token !== generation || (!dialog.open && !settings.open)) {
        URL.revokeObjectURL(url);
        return;
      }
      currentURL = url;
      preview.hidden = false;
      dialog.style.setProperty("--studio-start-image", `url("${url}")`);
    } catch {
      if (token === generation) {
        release();
        message(
          "Das Startbild konnte nicht geladen werden. Bitte in den Einstellungen ersetzen oder entfernen.",
          true,
        );
      }
    } finally {
      finishLoading();
    }
  }
  async function checked(blob) {
    if (
      !blob ||
      blob.size > maxBytes ||
      !["image/jpeg", "image/png", "image/webp"].includes(blob.type)
    )
      throw Error("Das Startbild ist ungültig oder grösser als 2 MB.");
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
      if (
        !bitmap.width ||
        !bitmap.height ||
        Math.max(bitmap.width, bitmap.height) > 2560
      )
        throw Error();
    } catch {
      throw Error("Das Startbild kann nicht gelesen werden oder ist zu gross.");
    } finally {
      bitmap?.close();
    }
    return blob;
  }
  async function optimise(input) {
    if (
      !input ||
      input.size > 32 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(input.type)
    )
      throw Error("Bitte ein JPG-, PNG- oder WebP-Bild bis 32 MB wählen.");
    let bitmap, canvas;
    try {
      bitmap = await createImageBitmap(input);
      if (
        !bitmap.width ||
        !bitmap.height ||
        bitmap.width * bitmap.height > 64000000
      )
        throw Error(
          "Das Bild ist zu gross. Bitte eine kleinere Version wählen.",
        );
      const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
      canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.86, 0.7, 0.5]) {
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (blob && blob.size <= maxBytes) return blob;
      }
      throw Error("Das Bild konnte nicht ausreichend verkleinert werden.");
    } finally {
      bitmap?.close();
      if (canvas) canvas.width = canvas.height = 0;
    }
  }
  async function edit(input) {
    if (working || locks) return;
    working = true;
    const finishLoading = MKWUIControls.loading("#startBackgroundStatus");
    controls();
    message(input ? "Bild wird vorbereitet …" : "Startbild wird entfernt …");
    mutation = (async () => {
      const blob = input ? await optimise(input) : null;
      await MKWSetupStore.setBackground(blob);
      available = !!blob;
      message(
        input
          ? "Startbild gespeichert."
          : "Standardhintergrund wiederhergestellt.",
      );
      await refresh(true);
    })()
      .catch((error) =>
        message("Startbild nicht gespeichert: " + error.message, true),
      )
      .finally(() => {
        finishLoading();
        working = false;
        controls();
      });
    await mutation;
  }
  choose.onclick = () => file.click();
  remove.onclick = () => edit(null);
  file.onchange = () => {
    const image = file.files[0];
    file.value = "";
    if (image) edit(image);
  };
  document.querySelector("#startSettings").onclick = () => {
    document.querySelector("#settings").onclick();
  };
  const observer = new MutationObserver(() => {
    void refresh();
  });
  observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
  observer.observe(settings, { attributes: true, attributeFilter: ["open"] });
  async function readPortable(items) {
    if (!items?.length) return null;
    return checked(await (await fetch(items[0].data)).blob());
  }
  return Object.freeze({
    refresh,
    settled: () => mutation,
    pause: () => {
      locks++;
      controls();
      return () => {
        locks--;
        controls();
      };
    },
    capture: async () => {
      await mutation;
      const blob = await MKWSetupStore.background();
      return blob
        ? [
            {
              id: "start-background",
              name: "Startbild",
              data: await dataURL(blob),
            },
          ]
        : [];
    },
    validate: async (items) => {
      if (items !== undefined) await readPortable(items);
    },
    replace: async (items) => {
      // Older setups without this optional field preserve device personalisation.
      if (items !== undefined)
        await MKWSetupStore.setBackground(await readPortable(items));
    },
  });
})();
