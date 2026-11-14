// The model behind the face panel (REQ-36). This is the only file that imports
// @vladmandic/face-api, and the screen loads it with import(): a browser that
// never opens the panel downloads none of it, and the main page stays small.
//
// The three model files sit in public/models/ on this site, with the package
// licence next to them. Nothing is loaded from a CDN.

import * as faceapi from '@vladmandic/face-api'

const MODEL_URL = './models'

// 224 px is the detector's smaller input: enough for one face at arm's length
// and a third of the work of 416 px on a laptop.
const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.5,
})

let models: Promise<void> | null = null

export function loadModels(): Promise<void> {
  models ??= Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => undefined)
  return models
}

// One descriptor for the face in the current frame, or null when there is no
// face. The frame itself is not copied anywhere.
export async function descriptorFrom(
  video: HTMLVideoElement,
): Promise<number[] | null> {
  await loadModels()
  // withFaceLandmarks(true) is the tiny 68 point net, the one copied to
  // public/models: the full one is another 350 kB for a small gain on a laptop
  // camera.
  const detected = await faceapi
    .detectSingleFace(video, DETECTOR_OPTIONS)
    .withFaceLandmarks(true)
    .withFaceDescriptor()
  return detected === undefined ? null : Array.from(detected.descriptor)
}
