# Local recognition models

The worker loads recognition resources only when importing FD campaign images.
Photos are processed locally; no detection service is contacted.

- `face.tflite`: Google MediaPipe BlazeFace short-range, Apache 2.0.
  Source: https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
  Model card/license: https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20%28Short%20Range%29.pdf
  Downloaded 2026-10-24, SHA-256: `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f`.
  License text: `LICENSE-MediaPipe.txt`.
- `person.tflite`: existing EfficientDet person fallback; license in
  `LICENSE-EfficientDet.txt`.

`build/vision-entry.js` bundles the pinned MediaPipe Tasks Vision package;
`build/version-assets.mjs` versions the worker, vision bundle and models by content.
BlazeFace's first two normalized landmarks are the left and right eyes.
A face's box centre and average eye height determine the initial crop. A missing
face falls back to the previous body detector. Detection is assistive and may miss
small, obscured, sideways or poorly lit faces; the manual crop remains available.
