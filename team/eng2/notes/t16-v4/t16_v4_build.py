"""Build draft v4 of the 30 s demo video (T-16, REQ-31) from the real app.

Everything on screen is the app itself in its dark theme: the intro animation
recorded as video, then screenshots of the report, the status, the evidence
board and the Details view. The voice is synthetic (text-to-speech) and the
video says so on screen and in its metadata (REQ-20).

    pnpm --dir frontend build && pnpm --dir frontend preview --port 4399
    pip install playwright edge-tts          # plus: playwright install chromium
    python team/eng2/notes/t16-v4/t16_v4_build.py [url] [work_dir]

Needs ffmpeg and ffprobe on PATH (or FFMPEG_DIR) and Arial (Windows fonts).
Record from a local build, never from the public site: "Save readings" there
writes the staged fever into the demo history everyone sees.

To refine: the narration is BEATS, the subtitles are subs.srt beside this
file, the shot order and lengths are SHOTS, and the look of the subtitles and
labels is in `assemble`.
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import edge_tts
from playwright.sync_api import Page, sync_playwright

HERE = Path(__file__).resolve().parent
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4399"
WORK = Path(sys.argv[2] if len(sys.argv) > 2 else "t16-v4-work").resolve()
OUT = WORK / "HeMoSo-demo-draft-v4.mp4"

# The staged moment: flight day 31, a fever and a fast pulse (synthetic).
FEVER_DAY = "31"
FEVER = {"glucose_mgdl": "95", "sleep_h": "7", "bp_sys_mmhg": "118",
         "bp_dia_mmhg": "76", "hr_bpm": "96", "temp_core_c": "38.5"}

V1, V2 = "en-US-AvaNeural", "en-US-AndrewNeural"
# (start, end, voice, line). The guide's spine: who we are at 0, the challenge
# at 2, the name at 5, the idea at 10, the future from 20.
BEATS = [
    (0.0, 2.0, V2, "We're team ReTardis."),
    (2.0, 5.0, V1, "Astronaut health monitoring, because Earth is far away."),
    (5.0, 10.0, V2, "Meet HeMoSo: twelve daily readings, each checked against your own usual range."),
    (10.0, 20.0, V1, "She logs a fever and a fast pulse. HeMoSo compares them with her usual range, "
                     "scores the evidence, and says: tell the CMO. Built from NASA's open data."),
    (20.0, 26.0, V2, "From lunar missions to Mars: the same daily check, with every limit and its source on screen."),
    (26.0, 30.0, V2, "Because exploring further means taking better care of those who explore."),
]
MARGIN = 0.2  # seconds of air before the next beat

INTRO_START, INTRO_LEN, OUTRO_LEN = 0.5, 6.7, 4.0
# (still, seconds). The intro video runs first and the logo animation closes.
SHOTS = [
    ("report-top", 0.8),
    ("report-rows", 2.5),
    ("report-fever", 2.5),
    ("status-orbit", 2.5),
    ("evidence", 2.0),
    ("tell-cmo", 3.0),
    ("status-list", 3.0),
    ("details-sources", 3.0),
]
DISCLOSURE = ("Voice: synthetic text-to-speech (Microsoft Edge neural voices). "
              "Screens: real recordings and screenshots of HeMoSo, synthetic data.")


def tool(name: str) -> str:
    folder = os.environ.get("FFMPEG_DIR")
    if folder:
        return str(Path(folder) / (f"{name}.exe" if os.name == "nt" else name))
    found = shutil.which(name)
    if not found:
        sys.exit(f"{name} not found: put it on PATH or set FFMPEG_DIR")
    return found


def run(args: list[str], cwd: Path | None = None) -> None:
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"failed: {' '.join(args[:3])} ...\n{result.stderr[-1500:]}")


def duration(path: Path) -> float:
    out = subprocess.run([tool("ffprobe"), "-v", "error", "-show_entries", "format=duration",
                          "-of", "json", str(path)], capture_output=True, text=True).stdout
    return float(json.loads(out)["format"]["duration"])


def record_intro() -> Path:
    """The app's own intro animation, dark theme, as a 1920 x 1080 video."""
    folder = WORK / "intro"
    shutil.rmtree(folder, ignore_errors=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080}, color_scheme="dark",
            record_video_dir=str(folder), record_video_size={"width": 1920, "height": 1080})
        # The page is laid out for 1280 x 720; zoom fills the 1080p frame.
        context.add_init_script(
            "document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.zoom='1.5'})")
        page = context.new_page()
        page.goto(URL)
        page.wait_for_timeout(8000)
        context.close()
        browser.close()
    return next(folder.glob("*.webm"))


def fill_report(page: Page) -> None:
    day = page.locator("input[id$='-mission-day']").first
    day.wait_for()
    day.fill(FEVER_DAY)
    for key, value in FEVER.items():
        page.locator(f"input[id$='-{key}']").first.fill(value)


def capture_stills() -> None:
    """One 1920 x 1080 PNG per name in SHOTS, from the demo astronaut's check."""
    folder = WORK / "shots"
    folder.mkdir(parents=True, exist_ok=True)

    def still(page: Page, name: str, wait: int = 900) -> None:
        page.wait_for_timeout(wait)
        page.screenshot(path=str(folder / f"{name}.png"))

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_context(viewport={"width": 1280, "height": 720},
                                   device_scale_factor=1.5, color_scheme="dark").new_page()
        page.goto(URL, wait_until="networkidle")
        page.get_by_role("button", name="Skip intro").first.click()
        page.get_by_role("radio").first.check()
        page.get_by_role("button", name="Open the demo").first.click()
        page.locator("input[id$='-mission-day']").first.wait_for()
        still(page, "report-top", 1200)
        page.locator("input[id$='-hr_bpm']").first.scroll_into_view_if_needed()
        page.mouse.wheel(0, -60)
        still(page, "report-rows")
        fill_report(page)
        page.locator("input[id$='-temp_core_c']").first.scroll_into_view_if_needed()
        page.mouse.wheel(0, 60)
        still(page, "report-fever")
        page.get_by_role("button", name="Save readings").first.click()
        page.wait_for_timeout(800)
        page.get_by_role("button", name="See my status").first.click()
        page.get_by_role("heading", name="Status for Demo astronaut 1").wait_for()
        still(page, "status-orbit", 2500)
        page.get_by_role("button", name="List view").first.click()
        still(page, "status-list", 1200)
        page.get_by_role("button", name="Show the first one").first.click()
        page.wait_for_timeout(1200)
        page.get_by_role("button", name="Details").first.click()
        still(page, "tell-cmo")
        page.mouse.move(640, 300)
        page.mouse.wheel(0, 470)
        still(page, "details-sources")
        page.get_by_role("button", name="Details").first.click()
        page.get_by_role("heading", name="Possible conditions").first.scroll_into_view_if_needed()
        page.mouse.wheel(0, -90)
        still(page, "evidence", 1200)
        browser.close()


async def make_voice() -> Path:
    """One spoken line per beat, placed on its second, loudness -16 LUFS."""
    folder = WORK / "voice"
    folder.mkdir(parents=True, exist_ok=True)
    parts = []
    for i, (start, end, voice, text) in enumerate(BEATS):
        raw = folder / f"beat{i}.mp3"
        slot = end - start - MARGIN

        async def speak(rate: str) -> float:
            for attempt in range(8):
                try:
                    await edge_tts.Communicate(text, voice, rate=rate).save(str(raw))
                    return duration(raw)
                except edge_tts.exceptions.NoAudioReceived:
                    await asyncio.sleep(3 * (attempt + 1))
            sys.exit(f"no audio for beat {i}")

        length = await speak("+0%")
        if length > slot:
            length = await speak(f"+{min(30, int((length / slot - 1) * 100) + 2)}%")
        tempo = max(1.0, length / slot)
        fitted = folder / f"beat{i}.wav"
        run([tool("ffmpeg"), "-v", "error", "-y", "-i", str(raw), "-af", f"atempo={tempo:.3f}",
             "-ar", "48000", "-ac", "2", str(fitted)])
        parts.append((start, fitted))
        print(f"beat {i} {start:>4}-{end:<4} {length:5.2f} s in a slot of {slot:.1f} s, tempo {tempo:.2f}")
    inputs, chains = [], []
    for i, (start, path) in enumerate(parts):
        inputs += ["-i", str(path)]
        ms = int(start * 1000)
        chains.append(f"[{i}:a]adelay={ms}|{ms}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(parts)))
    graph = (";".join(chains) + f";{mix}amix=inputs={len(parts)}:normalize=0,"
             "loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:30[out]")
    out = folder / "voice.m4a"
    run([tool("ffmpeg"), "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]",
         "-c:a", "aac", "-b:a", "128k", "-metadata", f"comment={DISCLOSURE}", str(out)])
    return out


def assemble(intro: Path, voice: Path) -> None:
    ffmpeg = tool("ffmpeg")
    cut = WORK / "cut"
    shutil.rmtree(cut, ignore_errors=True)
    cut.mkdir(parents=True)
    enc = ["-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-r", "30", "-an"]
    fit = "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p"
    run([ffmpeg, "-v", "error", "-y", "-ss", str(INTRO_START), "-t", str(INTRO_LEN), "-i", str(intro),
         "-vf", fit, *enc, str(cut / "intro.mp4")])
    run([ffmpeg, "-v", "error", "-y", "-ss", str(INTRO_START), "-t", str(OUTRO_LEN), "-i", str(intro),
         "-vf", fit, *enc, str(cut / "outro.mp4")])
    lines = []
    for name, seconds in SHOTS:
        shutil.copy(WORK / "shots" / f"{name}.png", cut / f"{name}.png")
        lines += [f"file '{name}.png'", f"duration {seconds}"]
    lines.append(f"file '{SHOTS[-1][0]}.png'")
    (cut / "stills.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    middle = sum(seconds for _, seconds in SHOTS)
    run([ffmpeg, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "stills.txt",
         "-vf", fit, "-t", f"{middle}", *enc, "middle.mp4"], cwd=cut)
    (cut / "all.txt").write_text("file 'intro.mp4'\nfile 'middle.mp4'\nfile 'outro.mp4'\n", encoding="utf-8")
    run([ffmpeg, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "all.txt", "-c", "copy",
         "picture.mp4"], cwd=cut)
    shutil.copy(HERE / "subs.srt", cut / "subs.srt")
    shutil.copy(voice, cut / "voice.m4a")
    font, bold = r"C\:/Windows/Fonts/arial.ttf", r"C\:/Windows/Fonts/arialbd.ttf"
    label = "fontcolor=white@0.85:fontsize=20:box=1:boxcolor=black@0.5:boxborderw=8"
    app_start, app_end = INTRO_LEN, INTRO_LEN + middle
    graph = (
        # libass sizes text on a 288-line canvas: 14 there is about 52 px at 1080.
        "[0:v]subtitles=subs.srt:force_style='FontName=Arial,FontSize=14,PrimaryColour=&H00FFFFFF,"
        "BorderStyle=3,BackColour=&H80000000,OutlineColour=&H80000000,Outline=2,Shadow=0,MarginV=34',"
        f"drawtext=fontfile='{font}':text='Voice\\: synthetic (text-to-speech)':x=w-text_w-28:y=96:{label},"
        f"drawtext=fontfile='{font}':text='Prototype · synthetic data':x=28:y=96:{label}:"
        f"enable='between(t,{app_start},{app_end})',"
        f"drawtext=fontfile='{bold}':text='hemoso.space':fontcolor=white:fontsize=46:"
        f"x=(w-text_w)/2:y=h*0.67:enable='gte(t,{app_end + 1.5})'[v]"
    )
    run([ffmpeg, "-v", "error", "-y", "-i", "picture.mp4", "-i", "voice.m4a", "-filter_complex", graph,
         "-map", "[v]", "-map", "1:a", "-t", "30", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
         "-r", "30", "-c:a", "copy", "-metadata", f"comment={DISCLOSURE}", "-movflags", "+faststart",
         "final.mp4"], cwd=cut)
    shutil.copy(cut / "final.mp4", OUT)


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    intro = record_intro()
    capture_stills()
    voice = asyncio.run(make_voice())
    assemble(intro, voice)
    seconds = duration(OUT)
    print(f"{OUT} · {seconds:.2f} s · {'OK, 30 s or less' if seconds <= 30 else 'TOO LONG'}")
    if seconds > 30:
        sys.exit(1)


if __name__ == "__main__":
    main()
