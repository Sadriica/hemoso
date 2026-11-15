"""Record the prototype shots of the demo video (T-16, REQ-31).

Walks the demo path of `submission/video.md` (shot map of Sun 08:47) on a build
of `main` at 1280 x 800 (stills at 2x pixels) and saves one WebM take plus the
PNG stills `team/eng1/notes/t16_edit.py` reads, by those names: s3-identify,
s4-entry, s5-status-orbit, s6-status-list (S1 and S8), s7-fever-evidence (S6 and
S7), plus s8-status-list-again. Synthetic data only: the demo
astronaut, values typed in the report.

    pnpm --dir frontend build && pnpm --dir frontend preview --port 4399
    frontend/.venv/Scripts/python team/eng2/notes/t16_record.py [url] [out_dir]

The pauses follow the shot table, so the take can be cut by time. The voice and
the faces (S0, S9, S10) are recorded apart; subtitles are burned in afterwards.
"""

from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4399"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "t16-take").resolve()

# The staged moment: day 31, a fever and a faster pulse than usual. The core
# temperature is typed last, so the S4 still ends on the value the story is about.
FEVER_DAY = "31"
FEVER = {
    "glucose_mgdl": "95",
    "sleep_h": "7",
    "bp_sys_mmhg": "118",
    "bp_dia_mmhg": "76",
    "hr_bpm": "96",
    "temp_core_c": "38.5",
}


def still(page: Page, name: str, hold_ms: int) -> None:
    """Hold the screen for the shot and save its still for the slides."""
    page.wait_for_timeout(hold_ms)
    page.screenshot(path=str(OUT / f"{name}.png"))


def click(page: Page, label: str) -> None:
    page.get_by_role("button", name=label).first.click()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            # 2x pixels: team/eng1/notes/t16_edit.py zooms up to 1.45x.
            device_scale_factor=2,
            record_video_dir=str(OUT),
            record_video_size={"width": 1280, "height": 800},
            reduced_motion="no-preference",
        )
        page = context.new_page()
        page.goto(URL, wait_until="networkidle")
        if page.get_by_role("button", name="Skip intro").count():
            click(page, "Skip intro")
        page.get_by_role("radio").first.check()
        still(page, "s3-identify", 1500)

        click(page, "Open the demo")
        day = page.locator("input[id$='-mission-day']").first
        day.wait_for()
        day.fill(FEVER_DAY)
        for key, value in FEVER.items():
            field = page.locator(f"input[id$='-{key}']").first
            field.click()
            field.press_sequentially(value, delay=90)
        still(page, "s4-entry", 1200)

        click(page, "Save readings")
        page.wait_for_timeout(800)
        click(page, "See my status")
        page.get_by_role("heading", name="Status for Demo astronaut 1").wait_for()
        still(page, "s5-status-orbit", 2500)

        if page.get_by_role("button", name="List view").count():
            click(page, "List view")
        still(page, "s6-status-list", 2500)

        page.get_by_role("heading", name="Possible conditions").first.scroll_into_view_if_needed()
        still(page, "s7-fever-evidence", 3000)

        # S8: back to the list, the other readings in their usual range.
        page.get_by_role("heading", name="Status for Demo astronaut 1").first.scroll_into_view_if_needed()
        page.mouse.wheel(0, 300)
        still(page, "s8-status-list-again", 3000)

        context.close()
        browser.close()
    print(f"take and stills in {OUT}")


if __name__ == "__main__":
    main()
