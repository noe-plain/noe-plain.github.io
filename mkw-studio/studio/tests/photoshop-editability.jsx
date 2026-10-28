(function () {
  // Run from Photoshop: File > Scripts > Browse. Only generated fixtures are opened.
  var fixtureRoot =
    $.getenv("MKW_PSD_FIXTURES") || "/private/tmp/mkw-release-final2-firefox";
  var oldDialogs = app.displayDialogs,
    doc = null,
    lines = [],
    out = new File("/private/tmp/mkw-psd-editability-report.txt");
  function log(t) {
    lines.push(t);
    out.encoding = "UTF8";
    out.open("w");
    out.write(lines.join("\n"));
    out.close();
  }
  function walk(p) {
    var a = [];
    for (var i = 0; i < p.layers.length; i++) {
      var l = p.layers[i];
      a.push(l);
      if (l.typename === "LayerSet") a = a.concat(walk(l));
    }
    return a;
  }
  try {
    app.displayDialogs = DialogModes.NO;
    log(
      "Photoshop " +
        app.version +
        "; initial type-update prompt was inspected separately through the UI. Automated commands suppress repeated prompts.",
    );
    var files = ["psd-editability", "psd-post-editability"];
    for (var k = 0; k < files.length; k++) {
      var fixtureName = files[k],
        fixture = new File(fixtureRoot + "/" + fixtureName + ".psd");
      log("SOURCE " + fixture.fsName + " exists=" + fixture.exists);
      doc = app.open(fixture);
      log(
        "OPEN " +
          fixtureName +
          " " +
          doc.width.as("px") +
          "x" +
          doc.height.as("px"),
      );
      var layers = walk(doc),
        text = null,
        smart = null,
        types = 0,
        smarts = 0,
        fills = 0;
      for (var i = 0; i < layers.length; i++) {
        var l = layers[i];
        if (l.typename !== "ArtLayer") continue;
        if (l.kind === LayerKind.TEXT) {
          types++;
          if (!text) text = l;
        }
        if (l.kind === LayerKind.SMARTOBJECT) {
          smarts++;
          if (!smart || l.name === "Foto – Rahmen" || l.name === "Bildinhalt")
            smart = l;
        }
        if (l.kind === LayerKind.SOLIDFILL) fills++;
      }
      log("COUNTS type=" + types + " smart=" + smarts + " fills=" + fills);
      if (!text || !smart) throw Error("Missing editable layers");
      doc.activeLayer = text;
      var duplicate = text.duplicate();
      duplicate.textItem.contents = "Test: Text erfolgreich geändert";
      duplicate.visible = false;
      log("TYPE EDIT " + duplicate.textItem.contents);
      duplicate.remove();
      if (text.textItem.kind === TextType.PARAGRAPHTEXT) {
        var width = text.textItem.width;
        text.textItem.width = UnitValue(width.as("px") - 10, "px");
        text.textItem.width = width;
        log("BOX RESIZE + RESTORE");
      }
      doc.activeLayer = smart;
      executeAction(
        stringIDToTypeID("placedLayerEditContents"),
        undefined,
        DialogModes.NO,
      );
      var source = app.activeDocument;
      log(
        "SMART PHOTO OPEN " +
          source.width.as("px") +
          "x" +
          source.height.as("px"),
      );
      if (source.width.as("px") < 600)
        throw Error("Photo source resolution lost");
      source.close(SaveOptions.DONOTSAVECHANGES);
      app.activeDocument = doc;
      var save = new PhotoshopSaveOptions();
      save.layers = true;
      save.embedColorProfile = true;
      doc.saveAs(
        new File("/private/tmp/" + fixtureName + "-photoshop.psd"),
        save,
        true,
        Extension.LOWERCASE,
      );
      var png = new PNGSaveOptions();
      doc.saveAs(
        new File("/private/tmp/" + fixtureName + "-photoshop.png"),
        png,
        true,
        Extension.LOWERCASE,
      );
      doc.close(SaveOptions.DONOTSAVECHANGES);
      doc = null;
      doc = app.open(
        new File("/private/tmp/" + fixtureName + "-photoshop.psd"),
      );
      log("REOPEN " + walk(doc).length + " layers");
      doc.close(SaveOptions.DONOTSAVECHANGES);
      doc = null;
    }
    log(
      "PASS open, coherent type edit, paragraph resize, smart-content open, save and reopen",
    );
  } catch (e) {
    log("ERROR " + e.message + " line " + e.line);
  } finally {
    if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
    app.displayDialogs = oldDialogs;
  }
})();
