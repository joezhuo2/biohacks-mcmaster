# Raspberry Pi shank streamer

Connect the Grove MMA7660FC to an I2C port on a Grove Base HAT, or wire
SDA to GPIO2 (pin 3), SCL to GPIO3 (pin 5), 3.3V (pin 1), and GND (pin 6).
Mount X pointing down the shank and +Y forward in the sagittal plane.
`FORWARD_AXIS` and `FORWARD_SIGN` in `stream.py` can be adjusted for a different
mounting orientation. Forward tilt is positive.

Enable I2C in `sudo raspi-config` under Interface Options, then reboot if prompted.
Install `i2c-tools` (`sudo apt install i2c-tools`); `i2cdetect -y 1` should show `4c`.

From the repository root:

```sh
python3 -m venv pi/.venv
. pi/.venv/bin/activate
pip install -r pi/requirements.txt
python pi/stream.py
python pi/stream.py --url http://192.168.1.20:3000/api/ingest --assist 50
python pi/stream.py --rate 100 --calibrate-seconds 3
```

Replace `192.168.1.20` with the laptop/VM IP running the backend. It must listen
on a network-accessible interface and allow connections on port 3000.
Stand still during the startup calibration (default 2 seconds), then walk.
The default URL assumes the backend runs on the Pi itself.

Laptop checks (no I2C hardware or smbus2 import needed in fake mode):

```sh
python pi/test_stream.py
python pi/stream.py --fake --url http://localhost:3000/api/ingest
python pi/stream.py --fake --url http://127.0.0.1:9/api/ingest
```

Fake mode stands still during calibration, then produces a 1 Hz swing.
Windows users can activate the environment with `pi\.venv\Scripts\Activate.ps1`.

Samples use low-pass filtered gravity to measure shank pitch as an ankle-angle
proxy; this is not a direct ankle measurement. Steps use an 8-degree trigger,
a 3-degree falling threshold, and at least 400 ms between forward peaks. The
first peak establishes timing; later peaks emit strides, with timing reset after
pauses over 60 seconds. Terrain is always `level`; clearance uses the clamped
linear estimate configured at the top of `stream.py`.

The background sender posts every 250 ms without an `x-source` header, so the
backend records source `pi` (including fake mode). Failed batches retry while
the queue retains at most 30 seconds of data, dropping oldest entries. Requests
respect the backend's 10,000-sample and 1,000-step limits. Ambiguous network
failures can cause duplicates on retry because ingest has no deduplication key.
Ctrl+C stops sampling and attempts to flush queued batches; an unavailable
backend leaves unsent samples, reported at exit. The buffer is memory-only.
