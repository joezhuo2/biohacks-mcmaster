import math

from stream import StepState, decode6, detect_step


def test_decode():
    for raw, expected in [(0, 0), (1, 1), (31, 31), (32, -32),
                          (63, -1), (62, -2), (0x3A, -6)]:
        assert decode6(raw) == expected, (raw, expected)


def test_steps():
    state = StepState()
    steps = []
    for index in range(1000):
        now = index / 100
        before = state
        tilt = 20 * math.sin(2 * math.pi * now)
        state, step = detect_step(state, tilt, now)
        assert detect_step(before, tilt, now) == (state, step)
        if step:
            steps.append(step)
    assert len(steps) == 9, len(steps)
    assert all(990 <= step["strideMs"] <= 1010 for step in steps)
    assert all(19.9 <= step["peakDorsiDeg"] <= 20.1 for step in steps)
    state = StepState()
    for index in range(1000):
        state, step = detect_step(state, 2 * math.sin(index), index / 100)
        assert step is None
    state = StepState()
    detected = []
    for index in range(1000):
        state, step = detect_step(state, 20 * math.sin(2 * math.pi * index / 20), index / 100)
        if step:
            detected.append(step)
    assert detected and all(step["strideMs"] >= 400 for step in detected)


if __name__ == "__main__":
    test_decode()
    test_steps()
    print("All stream tests passed.")
