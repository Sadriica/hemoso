"""Cut the 30-second demo video (T-16, REQ-31) in the style of a product launch:
slow zooms into the real screens, short cross-dissolves and clean title cards.

Every frame of the app is a real screenshot of `main` taken by
team/eng2/notes/t16_record.py; nothing is generated. The shot table and the
timings are those of submission/video.md (Bio 1).

    python t16_edit.py --take t16-take --faces-open faces_open.mp4 \
        --faces-close faces_close.mp4 --voice voice.m4a --subs subs.srt \
        --font fonts/BarlowCondensed-700.ttf --out demo.mp4

Without --faces-open/--faces-close the two face shots become title cards; without
--voice the video is silent; without --subs nothing is burned in. Needs ffmpeg
with libass and libfreetype (ffmpeg -filters | grep -E "xfade|zoompan|drawtext").
"""

from __future__ import annotations

import argparse
import shlex
import subprocess
from pathlib import Path

W, H, FPS = 1920, 1080, 30
FADE = 0.35  # seconds of cross-dissolve between two shots
BG = "0x0B1020"  # the app's night-sky background
ACCENT = "0xF2B544"

# (shot, seconds on screen, kind, source, focus x, focus y, zoom end, card text)
# kind: still = zoom into a PNG of t16_record.py; faces = a video clip; card = text.
# focus x / y: the point of the screenshot the zoom moves towards, 0..1.
SHOTS = [
    ("S0", 2.0, "faces", "open", 0, 0, 0, "Team ReTardis"),
    ("S1", 3.0, "still", "s6-status-list", 0.50, 0.22, 1.18, ""),
    ("S2", 2.0, "card", "", 0, 0, 0, "HeMoSo|Your health, checked against your usual range"),
    ("S3", 3.0, "still", "s3-identify", 0.50, 0.45, 1.12, ""),
    ("S4", 3.0, "still", "s4-entry", 0.55, 0.70, 1.22, ""),
    ("S5", 3.0, "still", "s5-status-orbit", 0.50, 0.50, 1.15, ""),
    ("S6", 2.5, "still", "s7-fever-evidence", 0.45, 0.40, 1.25, ""),
    ("S7", 1.5, "still", "s7-fever-evidence", 0.45, 0.62, 1.45, ""),
    ("S8", 3.0, "still", "s6-status-list", 0.50, 0.60, 1.10, ""),
    ("S9", 3.0, "card", "", 0, 0, 0, "Moon · Mars · Base|The same daily check, so a change is seen in time"),
    ("S10", 4.0, "faces", "close", 0, 0, 0, "hemoso.space"),
]


def esc(text: str) -> str:
    """Text for drawtext: escape the characters its parser treats specially."""
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def card(font: str, text: str, frames: int) -> str:
    """A title card: a big line that rises into place, a smaller line under it."""
    big, _, small = text.partition("|")
    rise = f"(h/2-60)+40*max(0,1-t/0.5)"
    parts = [
        f"color=c={BG}:s={W}x{H}:r={FPS}:d={frames / FPS}",
        f"drawtext=fontfile='{font}':text='{esc(big)}':fontsize=150:fontcolor=white:"
        f"x=(w-text_w)/2:y='{rise}-text_h/2':alpha='min(1,t/0.4)'",
    ]
    if small:
        parts.append(
            f"drawtext=fontfile='{font}':text='{esc(small)}':fontsize=54:fontcolor={ACCENT}:"
            f"x=(w-text_w)/2:y=h/2+70:alpha='min(1,max(0,(t-0.25)/0.4))'"
        )
    return ",".join(parts)


def still(frames: int, fx: float, fy: float, zend: float) -> str:
    """Slow zoom into one point of a screenshot, eased, no jitter (upscaled first)."""
    # smoothstep ease from 1 to zend over the shot
    p = f"(on/{max(frames - 1, 1)})"
    z = f"1+({zend}-1)*({p}*{p}*(3-2*{p}))"
    x = f"max(0,min(iw-iw/zoom,{fx}*iw-iw/zoom/2))"
    y = f"max(0,min(ih-ih/zoom,{fy}*ih-ih/zoom/2))"
    return (
        f"scale={W * 2}:{H * 2}:force_original_aspect_ratio=decrease,"
        f"pad={W * 2}:{H * 2}:(ow-iw)/2:(oh-ih)/2:color={BG},"
        f"zoompan=z='{z}':x='{x}':y='{y}':d={frames}:s={W}x{H}:fps={FPS},setsar=1"
    )


def build(args: argparse.Namespace) -> list[str]:
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
    chains = []
    n = len(SHOTS)
    idx = 0
    for i, (shot, secs, kind, src, fx, fy, zend, text) in enumerate(SHOTS):
        # every shot but the last carries the cross-dissolve into the next one
        dur = secs + (FADE if i < n - 1 else 0)
        frames = round(dur * FPS)
        face = args.faces_open if src == "open" else args.faces_close
        if kind == "still":
            cmd += ["-loop", "1", "-t", f"{dur}", "-i", str(Path(args.take) / f"{src}.png")]
            chains.append(f"[{idx}:v]{still(frames, fx, fy, zend)},format=yuv420p[v{i}]")
            idx += 1
        elif kind == "faces" and face:
            cmd += ["-i", face]
            label = (
                f",drawtext=fontfile='{args.font}':text='{esc(text)}':fontsize=72:fontcolor=white:"
                f"box=1:boxcolor=black@0.45:boxborderw=24:x=80:y=80"
            )
            chains.append(
                f"[{idx}:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                f"fps={FPS},trim=duration={dur},setpts=PTS-STARTPTS{label},setsar=1,format=yuv420p[v{i}]"
            )
            idx += 1
        else:
            chains.append(f"{card(args.font, text, frames)},setsar=1,format=yuv420p[v{i}]")
    # chain the shots with cross-dissolves
    last, offset = "v0", 0.0
    for i in range(1, n):
        offset += SHOTS[i - 1][1]
        out = f"x{i}"
        chains.append(f"[{last}][v{i}]xfade=transition=fade:duration={FADE}:offset={offset:.3f}[{out}]")
        last = out
    final = last
    if args.subs:
        chains.append(
            f"[{final}]subtitles='{args.subs}':force_style='FontName=Inter,FontSize=22,"
            f"PrimaryColour=&H00FFFFFF,BorderStyle=3,BackColour=&H80000000,Outline=0,MarginV=40'[vs]"
        )
        final = "vs"
    if args.voice:
        cmd += ["-i", args.voice]
    cmd += ["-filter_complex", ";".join(chains), "-map", f"[{final}]"]
    if args.voice:
        cmd += ["-map", f"{idx}:a", "-c:a", "aac", "-b:a", "160k", "-af", "loudnorm=I=-16:TP=-1.5"]
    cmd += ["-t", "30", "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", args.out]
    return cmd


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--take", default="t16-take", help="folder with the PNG stills of t16_record.py")
    ap.add_argument("--faces-open")
    ap.add_argument("--faces-close")
    ap.add_argument("--voice")
    ap.add_argument("--subs")
    ap.add_argument("--font", required=True, help="a .ttf or .otf (drawtext cannot read .woff2)")
    ap.add_argument("--out", default="demo.mp4")
    ap.add_argument("--print", action="store_true", help="print the ffmpeg command and stop")
    args = ap.parse_args()
    assert abs(sum(s[1] for s in SHOTS) - 30.0) < 1e-6, "the shots must add up to 30 s"
    cmd = build(args)
    if args.print:
        print(" ".join(shlex.quote(c) for c in cmd))
        return
    subprocess.run(cmd, check=True)
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", args.out],
        capture_output=True, text=True, check=True,
    )
    print(f"{args.out}: {float(probe.stdout):.2f} s (must be 30 or less)")


if __name__ == "__main__":
    main()
