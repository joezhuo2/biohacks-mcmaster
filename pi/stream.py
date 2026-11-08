import argparse
from collections import deque
from dataclasses import dataclass, replace
from datetime import datetime, timezone
import math
import signal
import threading
import time


# shortcut: clearance is estimated from peak shank swing (~25 deg -> 20 mm target), replace once a distance sensor is fitted.
CLEARANCE_MM_PER_DEG = 0.8
CLEARANCE_OFFSET_MM = 0.0
FORWARD_AXIS = 1
FORWARD_SIGN = 1
BUFFER_SECONDS = 30
POST_SECONDS = 0.25


def decode6(value):
    value &= 0x3F
    return value - 64 if value & 0x20 else value


@dataclass(frozen=True)
class StepState:
    armed: bool = False
    peak: float = -180.0
    peak_time: float = 0.0
    previous_time: object = None


def detect_step(state, tilt, now):
    if not state.armed:
        if tilt >= 8.0:
            return replace(state, armed=True, peak=tilt, peak_time=now), None
        return state, None
    if tilt > state.peak:
        state = replace(state, peak=tilt, peak_time=now)
    if tilt > 3.0:
        return state, None
    interval = (state.peak_time - state.previous_time
                if state.previous_time is not None else None)
    state = replace(state, armed=False)
    if interval is not None and interval < 0.4:
        return state, None
    event = None
    if interval is not None and interval <= 60.0:
        event = {"peakDorsiDeg": state.peak, "strideMs": interval * 1000,
                 "peakTime": state.peak_time}
    return replace(state, previous_time=state.peak_time), event


class Sensor:
    def __init__(self):
        from smbus2 import SMBus
        self.bus = SMBus(1)
        try:
            self.bus.write_byte_data(0x4C, 0x07, 0x00)
            self.bus.write_byte_data(0x4C, 0x08, 0x00)
            self.bus.write_byte_data(0x4C, 0x07, 0x01)
            time.sleep(0.02)
        except Exception:
            self.bus.close()
            raise

    def read(self):
        for _ in range(10):
            values = self.bus.read_i2c_block_data(0x4C, 0x00, 3)
            if not any(value & 0x40 for value in values):
                return [decode6(value) / 21.33 for value in values]
            time.sleep(0.001)
        raise OSError("MMA7660 Alert flag did not clear")

    def close(self):
        try:
            self.bus.write_byte_data(0x4C, 0x07, 0x00)
        finally:
            self.bus.close()


def iso_time(seconds):
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat(timespec="milliseconds")


class Poster:
    def __init__(self, url, rate):
        import requests
        self.requests = requests
        self.url = url
        self.queue = deque()
        self.limit = max(1, math.ceil(rate * BUFFER_SECONDS))
        self.lock = threading.Lock()
        self.stop = threading.Event()
        self.status = "waiting"
        self.sequence = 0
        self.thread = threading.Thread(target=self.run)
        self.thread.start()

    def add(self, now, sample, step):
        with self.lock:
            self.sequence += 1
            self.queue.append((self.sequence, now, sample, step))
            self.trim(now)

    def trim(self, now):
        while self.queue and (self.queue[0][1] < now - BUFFER_SECONDS
                              or len(self.queue) > self.limit):
            self.queue.popleft()

    def post(self, session):
        with self.lock:
            self.trim(time.monotonic())
            batch = []
            step_count = 0
            for item in self.queue:
                if len(batch) == 10000 or (item[3] is not None and step_count == 1000):
                    break
                batch.append(item)
                step_count += item[3] is not None
        if not batch:
            return True
        payload = {"samples": [item[2] for item in batch],
                   "steps": [item[3] for item in batch if item[3] is not None]}
        try:
            response = session.post(self.url, json=payload, timeout=(1, 2))
            with response:
                self.status = "HTTP " + str(response.status_code)
                response.raise_for_status()
        except self.requests.RequestException as error:
            self.status = "failed POST: " + type(error).__name__
            return False
        with self.lock:
            while self.queue and self.queue[0][0] <= batch[-1][0]:
                self.queue.popleft()
        return True

    def run(self):
        with self.requests.Session() as session:
            while not self.stop.wait(POST_SECONDS):
                self.post(session)
            while self.queue:
                if not self.post(session):
                    break

    def close(self):
        self.stop.set()
        self.thread.join()
        if self.queue:
            print(f"Shutdown: {len(self.queue)} samples unsent; {self.status}", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Stream calibrated shank tilt to /api/ingest")
    parser.add_argument("--url", default="http://localhost:3000/api/ingest")
    parser.add_argument("--assist", type=float, default=50)
    parser.add_argument("--rate", type=float, default=100)
    parser.add_argument("--fake", action="store_true")
    parser.add_argument("--calibrate-seconds", type=float, default=2)
    args = parser.parse_args()
    if not math.isfinite(args.assist) or not 0 <= args.assist <= 100:
        parser.error("--assist must be between 0 and 100")
    if not math.isfinite(args.rate) or not 0 < args.rate <= 120:
        parser.error("--rate must be greater than 0 and at most 120")
    if not math.isfinite(args.calibrate_seconds) or args.calibrate_seconds < 0:
        parser.error("--calibrate-seconds must be finite and nonnegative")

    running = threading.Event()
    running.set()
    signal.signal(signal.SIGINT, lambda *_: running.clear())
    signal.signal(signal.SIGTERM, lambda *_: running.clear())
    sensor = None
    poster = None
    try:
        sensor = None if args.fake else Sensor()
        poster = Poster(args.url, args.rate)
        print(f"Stand still for {args.calibrate_seconds:g} seconds for standing calibration.", flush=True)
        start = time.monotonic()
        wall_offset = time.time() - start
        deadline = last_filter = last_status = start
        gravity = None
        calibration = [0.0, 0.0, 0.0]
        calibration_count = 0
        baseline = None
        state = StepState()
        count = 0
        read_status = ""
        while running.is_set():
            now = time.monotonic()
            elapsed = now - start
            try:
                if args.fake:
                    angle = (0 if elapsed < args.calibrate_seconds else
                             20 * math.sin(2 * math.pi * (elapsed - args.calibrate_seconds)))
                    radians = math.radians(angle)
                    vector = [math.cos(radians), math.sin(radians), 0.0]
                else:
                    vector = sensor.read()
                alpha = 1 - math.exp(-(now - last_filter) / 0.08)
                gravity = (vector if gravity is None else
                           [a + alpha * (b - a) for a, b in zip(gravity, vector)])
                last_filter = now
                count += 1
                read_status = ""
                if baseline is None:
                    calibration = [a + b for a, b in zip(calibration, vector)]
                    calibration_count += 1
                    if elapsed >= args.calibrate_seconds:
                        average = [value / calibration_count for value in calibration]
                        baseline = math.degrees(math.atan2(
                            FORWARD_SIGN * average[FORWARD_AXIS], average[0]))
                        print("Calibration complete; start walking.", flush=True)
                else:
                    pitch = math.degrees(math.atan2(
                        FORWARD_SIGN * gravity[FORWARD_AXIS], gravity[0]))
                    tilt = (pitch - baseline + 180) % 360 - 180
                    state, detected = detect_step(state, tilt, now)
                    sample = {"time": iso_time(now + wall_offset),
                              "ankleDeg": round(tilt, 3), "assistPct": args.assist}
                    step = None
                    if detected:
                        peak = detected["peakDorsiDeg"]
                        step = {"time": iso_time(detected["peakTime"] + wall_offset),
                                "terrain": "level", "peakDorsiDeg": round(peak, 3),
                                "strideMs": detected["strideMs"], "assistPct": args.assist,
                                "minClearanceMm": max(0, min(1000,
                                    CLEARANCE_OFFSET_MM + CLEARANCE_MM_PER_DEG * peak))}
                    poster.add(now, sample, step)
            except OSError as error:
                read_status = f"; sensor: {error}"
            if now - last_status >= 1:
                print(f"{count / (now - last_status):.1f} samples/s; last POST: {poster.status}"
                      + read_status, flush=True)
                count = 0
                last_status = now
            deadline += 1 / args.rate
            if deadline < time.monotonic():
                deadline = time.monotonic() + 1 / args.rate
            time.sleep(max(0, deadline - time.monotonic()))
    finally:
        if poster is not None:
            poster.close()
        if sensor is not None:
            sensor.close()


if __name__ == "__main__":
    main()
