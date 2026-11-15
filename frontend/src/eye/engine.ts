// The model behind the eye check. Only the tiny face detector and the 68 point
// tiny landmark net load here (no recognition net). The file is loaded with
// import() from detector.ts, so a browser that never opens the check downloads
// none of it. Frames are processed on the device and never copied or sent.

import * as faceapi from '@vladmandic/face-api'
import {
  BACKEND_ORDER,
  describeError,
  firstWorkingBackend,
} from '../face/backends'
import { DETECTOR_INPUT_SIZE, DETECTOR_SCORE } from './constants'
import type { Point } from './ear'

const BASE = import.meta.env.BASE_URL
const MODEL_URL = `${BASE}models`
const WASM_URL = new URL(`${BASE}wasm/`, document.baseURI).href

const OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: DETECTOR_INPUT_SIZE,
  scoreThreshold: DETECTOR_SCORE,
})

interface TfRuntime {
  setBackend(name: string): Promise<boolean>
  ready(): Promise<void>
  setWasmPaths(prefix: string): void
}
const tf = faceapi.tf as unknown as TfRuntime

async function useBackend(backend: string): Promise<void> {
  if (backend === 'wasm') tf.setWasmPaths(WASM_URL)
  const switched = await tf.setBackend(backend)
  if (!switched) throw new Error(`backend ${backend} is not available`)
  await tf.ready()
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
  ])
  // One real pass on a blank canvas: a backend that cannot run the nets fails
  // here, not in front of the person.
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 160
  await faceapi.detectSingleFace(canvas, OPTIONS).withFaceLandmarks(true)
}

let models: Promise<void> | null = null

export function loadEyeModels(): Promise<void> {
  models ??= (async () => {
    const backend = await firstWorkingBackend(BACKEND_ORDER, useBackend, (m) =>
      console.warn(m),
    )
    console.info(`eye: running on the ${backend} backend`)
  })().catch((error: unknown) => {
    models = null
    console.warn(`eye: could not start (${describeError(error)})`)
    throw error
  })
  return models
}

/** The 68 landmarks of the face in the frame, or null when there is none. */
export async function landmarksFrom(
  video: HTMLVideoElement,
): Promise<Point[] | null> {
  await loadEyeModels()
  const found = await faceapi
    .detectSingleFace(video, OPTIONS)
    .withFaceLandmarks(true)
  return found === undefined
    ? null
    : found.landmarks.positions.map(({ x, y }) => ({ x, y }))
}
