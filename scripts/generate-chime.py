"""Generates the session cue chime: a soft two-note bell (E6 then A6).

Writes a 16-bit mono 44.1 kHz WAV for each platform. Run with:
python3 scripts/generate-chime.py
"""

import math
import struct
import wave
from pathlib import Path

RATE = 44_100
ROOT = Path(__file__).resolve().parent.parent
OUTPUTS = [
    ROOT / 'modules/session-runtime/ios/chime.wav',
    ROOT / 'modules/session-runtime/android/src/main/res/raw/chime.wav',
]


def bell(frequency: float, start: float, length: float, t: float) -> float:
    local = t - start
    if local < 0 or local > length:
        return 0.0
    attack = min(1.0, local / 0.005)
    decay = math.exp(-local * 6.0)
    tone = (
        math.sin(2 * math.pi * frequency * local)
        + 0.35 * math.sin(2 * math.pi * frequency * 2.0 * local)
        + 0.12 * math.sin(2 * math.pi * frequency * 3.01 * local)
    )
    return attack * decay * tone


def main() -> None:
    duration = 0.75
    frames = bytearray()
    for index in range(int(RATE * duration)):
        t = index / RATE
        sample = 0.32 * (bell(1318.5, 0.0, 0.6, t) + bell(1760.0, 0.14, 0.6, t))
        fade = min(1.0, (duration - t) / 0.05)
        value = max(-1.0, min(1.0, sample * fade))
        frames += struct.pack('<h', int(value * 32_767))
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(output), 'wb') as file:
            file.setnchannels(1)
            file.setsampwidth(2)
            file.setframerate(RATE)
            file.writeframes(bytes(frames))
        print(f'wrote {output.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
