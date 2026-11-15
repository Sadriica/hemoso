"""Cut the 30-second demo video (T-16, REQ-31) from the shots, voices and subtitles.

Follows the shot map of `submission/video.md` (Sun 08:47). Every input is
optional, so the cut runs today and improves as the files arrive:

    shots/     one file per shot, named by its id: s0.*, s1.*, ... s10.*
               (.png or .jpg for a still, .mp4/.webm/.mov for a clip).
               A file named like the recorder's stills also works
               (s6-s7-fever-evidence.png covers S6 and S7). A missing shot is a
               placeholder card that names what goes there.
    voice/     one audio file per beat, named by its start second: 00, 02, 05,
               10, 20, 26 (.wav or .m4a). A missing beat is silence.
    subs.srt   the English subtitles, burned in (default:
               submission/subs.srt when it exists).
    nasa.txt   two lines for the NASA caption shown from 13 to 20 s.

    python team/eng2/notes/t16_cut.py <input_dir> <out.mp4> [--subs path]

Output: H.264, yuv420p, 1280 x 800, 30 fps, AAC 128 kb/s, loudness -16 LUFS,
checked with ffprobe to be 30 s or less. Needs ffmpeg and ffprobe on PATH, or
FFMPEG_DIR pointing at their folder.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

W, H, FPS = 1280, 800, 30
LIMIT_S = 30.0

# The shot map of submission/video.md: id, start, end, what the shot shows.
SHOTS = [
    ("s0", 0.0, 2.0, "Five faces, one frame"),
    ("s1", 2.0, 5.0, "Status, list view: needs review"),
    ("s2", 5.0, 7.0, "Title card: HeMoSo and the tagline"),
    ("s3", 7.0, 10.0, "Identify: who is on duty today"),
    ("s4", 10.0, 13.0, "Report: values typed, 38.5 C last"),
    ("s5", 13.0, 16.0, "Status, orbit view"),
    ("s6", 16.0, 18.5, "Evidence board: Fever 0.75"),
    ("s7", 18.5, 20.0, "Ask your CMO or flight surgeon"),
    ("s8", 20.0, 23.0, "Status, list view again"),
    ("s9", 23.0, 26.0, "Vision card: Moon, Mars, base"),
    ("s10", 26.0, 30.0, "Five faces, end card"),
]
VOICE_STARTS = ["00", "02", "05", "10", "20", "26"]
STILL = {".png", ".jpg", ".jpeg"}
CLIP = {".mp4", ".webm", ".mov", ".mkv"}
AUDIO = {".wav", ".m4a", ".mp3"}
# The corner label from 5 to 26 s and the NASA caption from 13 to 20 s.
LABEL = ("Prototype · synthetic data", 5.0, 26.0)
NASA_WINDOW = (13.0, 20.0)


def tool(name: str) -> str:
    folder = os.environ.get("FFMPEG_DIR")
    if folder:
        return str(Path(folder) / f"{name}.exe" if os.name == "nt" else Path(folder) / name)
    found = shutil.which(name)
    if not found:
        sys.exit(f"{name} not found: put it on PATH or set FFMPEG_DIR")
    return found


def run(args: list[str], cwd: Path | None = None) -> None:
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"failed: {' '.join(args[:4])} ...\n{result.stderr[-1500:]}")


def font() -> str:
    """A font path escaped for drawtext."""
    for candidate in (r"C:\Windows\Fonts\arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                      "/System/Library/Fonts/Supplemental/Arial.ttf"):
        if Path(candidate).exists():
            return candidate.replace("\\", "/").replace(":", r"\:")
    sys.exit("no font found for the labels")


def find_shot(folder: Path, shot_id: str) -> Path | None:
    """The file for one shot: exact id first, then a recorder still naming it."""
    files = sorted(p for p in folder.iterdir() if p.suffix.lower() in STILL | CLIP) if folder.exists() else []
    for p in files:
        if p.stem.lower() == shot_id:
            return p
    for p in files:
        parts = p.stem.lower().replace("_", "-").split("-")
        if shot_id in parts:
            return p
    return None


def segment(ffmpeg: str, src: Path | None, text: str, seconds: float, out: Path, fontfile: str) -> None:
    """One shot as an exact-length 1280 x 800, 30 fps clip with no audio."""
    fit = (f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
           f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x0b1220,fps={FPS},format=yuv420p")
    if src is None:
        safe = text.replace("'", "").replace(":", r"\:")
        args = [ffmpeg, "-y", "-f", "lavfi", "-i", f"color=c=0x0b1220:s={W}x{H}:r={FPS}:d={seconds}",
                "-vf", f"drawtext=fontfile='{fontfile}':text='{safe}':fontcolor=white:fontsize=40:"
                       f"x=(w-text_w)/2:y=(h-text_h)/2,format=yuv420p"]
    elif src.suffix.lower() in STILL:
        args = [ffmpeg, "-y", "-loop", "1", "-framerate", str(FPS), "-t", f"{seconds}", "-i", str(src), "-vf", fit]
    else:
        args = [ffmpeg, "-y", "-i", str(src), "-t", f"{seconds}", "-vf", fit + ",tpad=stop_mode=clone:stop_duration=30"]
    run(args + ["-t", f"{seconds}", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), str(out)])


def voices(folder: Path) -> list[tuple[Path, int]]:
    """The voice files and their start in milliseconds, in beat order."""
    found = []
    if folder.exists():
        for start in VOICE_STARTS:
            for p in folder.iterdir():
                if p.stem == start and p.suffix.lower() in AUDIO:
                    found.append((p, int(start) * 1000))
                    break
    return found


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve()
    subs = None
    if "--subs" in sys.argv:
        subs = Path(sys.argv[sys.argv.index("--subs") + 1]).resolve()
    elif (src / "subs.srt").exists():
        subs = src / "subs.srt"
    elif Path("submission/subs.srt").exists():
        subs = Path("submission/subs.srt").resolve()

    ffmpeg, ffprobe, fontfile = tool("ffmpeg"), tool("ffprobe"), font()
    work = Path(tempfile.mkdtemp(prefix="t16-cut-"))
    report = []

    # 1. One clip per shot, then the picture track.
    listing = []
    for shot_id, start, end, text in SHOTS:
        path = find_shot(src / "shots", shot_id)
        seg = work / f"{shot_id}.mp4"
        segment(ffmpeg, path, f"{shot_id.upper()} · {text}", round(end - start, 3), seg, fontfile)
        listing.append(f"file '{seg.name}'")
        report.append(f"{shot_id:>3} {start:>5.1f}-{end:<5.1f} {path.name if path else 'PLACEHOLDER'}")
    (work / "list.txt").write_text("\n".join(listing) + "\n", encoding="utf-8")
    run([ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "picture.mp4"], cwd=work)

    # 2. Labels and subtitles over the picture.
    text, label_start, label_end = LABEL
    filters = [f"drawtext=fontfile='{fontfile}':text='{text}':fontcolor=white@0.85:fontsize=22:"
               f"x=w-text_w-24:y=72:box=1:boxcolor=black@0.55:boxborderw=8:"
               f"enable='between(t,{label_start},{label_end})'"]
    nasa = src / "nasa.txt"
    if nasa.exists():
        shutil.copy(nasa, work / "nasa.txt")
        filters.append(f"drawtext=fontfile='{fontfile}':textfile=nasa.txt:fontcolor=white:fontsize=24:"
                       f"x=40:y=72:box=1:boxcolor=black@0.7:boxborderw=12:line_spacing=6:"
                       f"enable='between(t,{NASA_WINDOW[0]},{NASA_WINDOW[1]})'")
    if subs and subs.exists():
        shutil.copy(subs, work / "subs.srt")
        # libass scales to a 288-line canvas: 11 there is about 30 px on 800 lines.
        filters.append("subtitles=subs.srt:force_style='FontName=Arial,FontSize=11,PrimaryColour=&H00FFFFFF,"
                       "OutlineColour=&H40000000,BackColour=&H40000000,BorderStyle=3,Outline=2,Shadow=0,Alignment=2,MarginV=8'")
    report.append(f"subtitles: {subs if subs and subs.exists() else 'none yet'}")
    report.append(f"NASA caption: {'nasa.txt' if nasa.exists() else 'none yet'}")

    # 3. Voices at their start second, loudness to -16 LUFS; silence without voices.
    beats = voices(src / "voice")
    inputs = ["-i", "picture.mp4"]
    if beats:
        for path, _ in beats:
            shutil.copy(path, work / path.name)
            inputs += ["-i", path.name]
        delayed = "".join(f"[{i + 1}:a]adelay={ms}|{ms}[a{i}];" for i, (_, ms) in enumerate(beats))
        mix = "".join(f"[a{i}]" for i in range(len(beats)))
        audio = f"{delayed}{mix}amix=inputs={len(beats)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad[aout]"
    else:
        inputs += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
        audio = "[1:a]anull[aout]"
    report.append("voices: " + (", ".join(p.name for p, _ in beats) if beats else "none yet (silent track)"))

    graph = f"[0:v]{','.join(filters)}[vout];{audio}"
    run([ffmpeg, "-y", *inputs, "-filter_complex", graph, "-map", "[vout]", "-map", "[aout]",
         "-t", f"{LIMIT_S - 0.5}", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS),
         "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "final.mp4"], cwd=work)
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(work / "final.mp4", out)

    # 4. The checks the guide asks for.
    probe = subprocess.run([ffprobe, "-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height,pix_fmt",
                            "-of", "default=nw=1", str(out)], capture_output=True, text=True).stdout
    duration = float(next(l.split("=")[1] for l in probe.splitlines() if l.startswith("duration=")))
    print("\n".join(report))
    print(probe.strip())
    print(f"{out} · {duration:.2f} s · {'OK, 30 s or less' if duration <= LIMIT_S else 'TOO LONG'}")
    shutil.rmtree(work, ignore_errors=True)
    if duration > LIMIT_S:
        sys.exit(1)


if __name__ == "__main__":
    main()
