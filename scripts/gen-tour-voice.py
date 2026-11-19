"""Generate the tour narration clips in public/audio/tour/.

One Chinese + one English clip per tour stop, named <index>-zh.mp3 / <index>-en.mp3,
where <index> is the zero-based position in createTourStops().

Voices (Microsoft Edge TTS neural voices, used only for this course demo):
  zh  zh-CN-YunxiNeural  rate +20%  pitch +10Hz   young male, median F0 ~196 Hz, emphatic (text ends with 「！」)
  en  en-US-GuyNeural    rate +10%  pitch +10Hz   median F0 ~178 Hz

Requirements:  python -m pip install --user edge-tts   (needs network)

Usage:  python scripts/gen-tour-voice.py            # 站名：<index>-zh.mp3 / <index>-en.mp3
        python scripts/gen-tour-voice.py --brief    # 讲解：<index>-brief.mp3，并入同一个时长表
Run it again whenever the stop list in src/scene/axisTour.ts changes;
src/tourVoice.test.ts fails when a clip is missing or the count drifts.
"""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "audio", "tour")

ZH = dict(voice="zh-CN-YunxiNeural", rate="+20%", pitch="+10Hz")
EN = dict(voice="en-US-GuyNeural", rate="+10%", pitch="+10Hz")

GAP_MS = 150
# 播报时长表：游览据此决定每站至少停多久，名字长就读完再走。
MANIFEST = os.path.join(ROOT, "src", "data", "tourVoice.json")

RATES = {0: 44100, 1: 48000, 2: 32000}
KBPS_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
KBPS_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]


def mp3_ms(path: str) -> int:
    """Walk the MPEG frames and add up their duration — no ffmpeg needed."""
    with open(path, "rb") as handle:
        data = handle.read()
    index = 0
    if data[:3] == b"ID3":
        index = 10 + ((data[6] & 0x7F) << 21 | (data[7] & 0x7F) << 14 | (data[8] & 0x7F) << 7 | (data[9] & 0x7F))
    total = 0.0
    while index + 4 <= len(data):
        if data[index] != 0xFF or (data[index + 1] & 0xE0) != 0xE0:
            index += 1
            continue
        version = (data[index + 1] >> 3) & 0x03   # 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
        layer = (data[index + 1] >> 1) & 0x03     # 1 = Layer III
        kbps_index = (data[index + 2] >> 4) & 0x0F
        rate_index = (data[index + 2] >> 2) & 0x03
        pad = (data[index + 2] >> 1) & 0x01
        if layer != 1 or version == 1 or rate_index == 3 or kbps_index in (0, 15):
            index += 1
            continue
        mpeg1 = version == 3
        rate = RATES[rate_index] // (1 if mpeg1 else 2 if version == 2 else 4)
        kbps = (KBPS_V1 if mpeg1 else KBPS_V2)[kbps_index]
        samples = 1152 if mpeg1 else 576
        total += samples / rate * 1000
        index += (144 if mpeg1 else 72) * kbps * 1000 // rate + pad
    return int(round(total))


def read_stops() -> list[dict]:
    """Ask the app itself for its stop list, so the clips can never drift from it."""
    dump = subprocess.run(
        ["node", os.path.join(ROOT, "scripts", "dump-tour-stops.mjs")],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    stops = json.loads(dump.stdout)
    if not stops:
        raise SystemExit("stop list is empty")
    return stops


async def synthesize(text: str, cfg: dict, path: str) -> bool:
    for attempt in range(4):
        try:
            await edge_tts.Communicate(
                text, cfg["voice"], rate=cfg["rate"], pitch=cfg["pitch"]
            ).save(path)
            if os.path.getsize(path) > 2048:
                return True
        except Exception as exc:  # noqa: BLE001 - network hiccups are the usual case
            print(f"retry {os.path.basename(path)}: {exc}", file=sys.stderr)
            await asyncio.sleep(1.5)
    return False


async def gen_briefs(stops: list[dict]) -> None:
    """只补讲解稿，站名的 60 条不动，免得重生成时换个语气。"""
    os.makedirs(OUT, exist_ok=True)
    ok = 0
    durations: dict[int, int] = {}
    for index, stop in enumerate(stops):
        text = stop.get("brief")
        if not text:
            print(f"missing brief for {index:02d} {stop['name']}", file=sys.stderr)
            continue
        path = os.path.join(OUT, f"{index:02d}-brief.mp3")
        if await synthesize(text, ZH, path):
            ok += 1
            durations[index] = mp3_ms(path)
            print(f"{index:02d}-brief {os.path.getsize(path):6d}  {text}")
        else:
            print(f"FAILED {index:02d}-brief {text}", file=sys.stderr)
    with open(MANIFEST, encoding="utf-8") as handle:
        manifest = json.load(handle)
    for index, ms in durations.items():
        manifest["clips"][index]["brief"] = ms
    with open(MANIFEST, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    print(json.dumps({"briefs": ok, "expected": len(stops)}, ensure_ascii=False))


async def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    stops = read_stops()
    if "--brief" in sys.argv:
        await gen_briefs(stops)
        return
    ok = 0
    durations: dict[tuple[int, str], int] = {}
    for index, stop in enumerate(stops):
        # 「·」读成停顿，TTS 会念成点号，换成逗号；句末加「！」把语调挑起来，不要平读。
        spoken_zh = stop["name"].replace(" · ", "，") + "！"
        for lang, text, cfg in (("zh", spoken_zh, ZH), ("en", stop["en"], EN)):
            path = os.path.join(OUT, f"{index:02d}-{lang}.mp3")
            if await synthesize(text, cfg, path):
                ok += 1
                durations[(index, lang)] = mp3_ms(path)
                print(f"{index:02d}-{lang} {os.path.getsize(path):6d}  {text}")
            else:
                print(f"FAILED {index:02d}-{lang} {text}", file=sys.stderr)
    clips = [{"zh": durations.get((i, "zh"), 0), "en": durations.get((i, "en"), 0)} for i in range(len(stops))]
    with open(MANIFEST, "w", encoding="utf-8", newline="\n") as handle:
        json.dump({"gapMs": GAP_MS, "clips": clips}, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    print(json.dumps({"clips": ok, "expected": len(stops) * 2,
                      "longest": max(sum(c.values()) for c in clips)}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
