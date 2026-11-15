// The model behind the face panel (REQ-36). This is the only file that imports
// @vladmandic/face-api, and the screen loads it with import(): a browser that
// never opens the panel downloads none of it, and the main page stays small.
//
// The three model files sit in public/models/ on this site, with the package
// licence next to them, and the WebAssembly files in public/wasm/. Nothing is
// loaded from a CDN, and no picture leaves the page.

import * as faceapi from '@vladmandic/face-api'
import {
  BACKEND_ORDER,
  describeError,
  firstWorkingBackend,
} from './backends'

const BASE = import.meta.env.BASE_URL
const MODEL_URL = `${BASE}models`
const WASM_URL = new URL(`${BASE}wasm/`, document.baseURI).href

const MODEL_BINARIES = [
  'tiny_face_detector_model.bin',
  'face_landmark_68_tiny_model.bin',
  'face_recognition_model.bin',
]

// 224 px is the detector's smaller input: enough for one face at arm's length
// and a third of the work of 416 px on a laptop.
const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.5,
})

// 0 to 1, called while the model files download.
export type ProgressCallback = (fraction: number) => void

let models: Promise<string> | null = null
const listeners = new Set<ProgressCallback>()

// Reads the three binaries once, so the person sees a number while 6.4 MB come
// down on a phone. The files then sit in the browser cache for loadFromUri.
async function downloadModels(onProgress: ProgressCallback): Promise<void> {
  const loaded = MODEL_BINARIES.map(() => 0)
  const totals = MODEL_BINARIES.map(() => 0)
  const report = () => {
    const total = totals.reduce((sum, value) => sum + value, 0)
    if (total > 0 && totals.every((value) => value > 0)) {
      onProgress(Math.min(1, loaded.reduce((sum, value) => sum + value, 0) / total))
    }
  }
  await Promise.all(
    MODEL_BINARIES.map(async (file, index) => {
      const response = await fetch(`${MODEL_URL}/${file}`, {
        cache: 'force-cache',
      })
      if (!response.ok) throw new Error(`model file ${file}: ${response.status}`)
      totals[index] = Number(response.headers.get('content-length') ?? 0)
      const reader = response.body?.getReader()
      if (reader === undefined) {
        await response.arrayBuffer()
        return
      }
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        loaded[index] += value.length
        report()
      }
    }),
  )
  onProgress(1)
}

async function loadNets(): Promise<void> {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
}

// One real pass through the detector and the recognition net on a blank
// canvas: a backend that cannot run them fails here, not on the person's face.
async function warmUp(): Promise<void> {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 160
  await faceapi.detectSingleFace(canvas, DETECTOR_OPTIONS)
  await faceapi.nets.faceRecognitionNet.computeFaceDescriptor(canvas)
}

// The package ships no types for its bundled TensorFlow.js: only what is used.
interface TfRuntime {
  setBackend(name: string): Promise<boolean>
  ready(): Promise<void>
  setWasmPaths(prefix: string): void
}
const tf = faceapi.tf as unknown as TfRuntime

async function useBackend(backend: string): Promise<void> {
  if (backend === 'wasm') {
    tf.setWasmPaths(WASM_URL)
  }
  const switched = await tf.setBackend(backend)
  if (!switched) throw new Error(`backend ${backend} is not available`)
  await tf.ready()
  await loadNets()
  await warmUp()
}

function warn(message: string): void {
  console.warn(message)
}

// Loads the files and picks the first backend that works. The same promise
// answers every caller, and a failure is dropped so the next try starts again.
export function loadModels(onProgress?: ProgressCallback): Promise<string> {
  if (onProgress !== undefined) listeners.add(onProgress)
  models ??= (async () => {
    await downloadModels((fraction) => {
      for (const listener of listeners) listener(fraction)
    })
    const backend = await firstWorkingBackend(BACKEND_ORDER, useBackend, warn)
    console.info(`face: running on the ${backend} backend`)
    return backend
  })().catch((error: unknown) => {
    models = null
    warn(`face: could not start (${describeError(error)})`)
    throw error
  })
  return models.finally(() => {
    if (onProgress !== undefined) listeners.delete(onProgress)
  })
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
