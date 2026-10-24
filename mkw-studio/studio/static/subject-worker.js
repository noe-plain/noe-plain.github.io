"use strict";
importScripts("vendor/vision.js?v=ba79f383ab75");
const faceModelURL = "vendor/face.tflite?v=b4578f35940b",
  personModelURL = "vendor/person.tflite?v=0720bf247bd7";
let files, faces, persons;
async function resources() {
  files ??= MKWVision.FilesetResolver.forVisionTasks(
    new URL("vendor/vision-wasm/", self.location).href,
  );
  return files;
}
async function faceDetector() {
  faces ??= resources().then((resolver) =>
    MKWVision.FaceDetector.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath: new URL(faceModelURL, self.location).href,
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.5,
    }),
  );
  return faces;
}
async function personDetector() {
  persons ??= resources().then((resolver) =>
    MKWVision.ObjectDetector.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath: new URL(personModelURL, self.location).href,
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      categoryAllowlist: ["person"],
      scoreThreshold: 0.4,
      maxResults: 20,
    }),
  );
  return persons;
}
function box(d, w, h) {
  const b = d.boundingBox;
  return {
    x: Math.max(0, b.originX / w),
    y: Math.max(0, b.originY / h),
    w: Math.min(1, b.width / w),
    h: Math.min(1, b.height / h),
    score: d.categories[0].score,
  };
}
self.onmessage = async ({ data: { id, bitmap } }) => {
  try {
    const face = await faceDetector(),
      detections = face.detect(bitmap).detections,
      w = bitmap.width,
      h = bitmap.height;
    let people = detections
      .filter((d) => d.boundingBox && d.keypoints.length >= 2)
      .map((d) => ({
        ...box(d, w, h),
        eyes: {
          x: (d.keypoints[0].x + d.keypoints[1].x) / 2,
          y: (d.keypoints[0].y + d.keypoints[1].y) / 2,
        },
      }));
    if (!people.length) {
      const person = await personDetector();
      people = person.detect(bitmap).detections.map((d) => box(d, w, h));
    }
    self.postMessage({ id, people });
  } catch (e) {
    self.postMessage({ id, error: e.message });
  } finally {
    bitmap.close();
  }
};
