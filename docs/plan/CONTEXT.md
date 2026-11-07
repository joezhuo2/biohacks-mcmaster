# BioHacks McMaster 2026: Haptic Core Stability Backpack

A wearable backpack for Alex Chen (47, ALS) that counteracts his gait and balance problems so he can keep teaching: it senses trunk tilt and sway, taps his torso and speaks cues through a phone app when fatigue or foot-drop sway is detected, and streams data to a clinician dashboard with AI-generated reports. A tabletop gyroscope rig demonstrates the active-correction version. See `PATIENT_CASE.md` for the patient case (Alex Chen, ALS) and design implications, and `plan/` for the working plan. Links are at the bottom of this file.

## Event facts

- Event: BioHacks 2026 by BioEng4Youth, McMaster University, Hamilton. Official MLH Member Event.
- Format: every team solves one patient-centred neurological case, revealed at the opening ceremony. Pitches should be clear and evidence-backed. Judges come from sponsors and partners.
- Sat Nov 7: opening 10:00 AM, team formation 11:00 AM, team registration and track lock-in closes 12:00 PM.
- Sun Nov 8: submissions due 11:30 AM, expo judging 1:30 to 3:00 PM (judges visit tables), closing and winners 4:30 PM.
- Work must be made during the event. Software, hardware, 3D prints and design concepts are all accepted.
- Devpost submission needs: problem description, how it works, what was built, links to code/CAD/slides, a short video demo, every teammate added, and a track selection matching the team form.
- Devpost: https://devpost.com/submit-to/30296-biohacks-2026/manage/submissions

## Tracks and prizes

Each team competes in exactly one track. Sponsor prizes are opted into at submission. Wearables rubric (out of 100): clinical grounding 20, design and function 30 (prototype or demo counts), usability in daily life 20, feasibility 15, communication 15. $1,000 goes to the top team overall.

- Main track: Wearable Devices and Quality of Life: help Alex keep one thing that matters to him as his abilities change. 2 cash winners.
- Best Use of Gemini API: examples given are chatbots and research summarizers.
- Best Use of ElevenLabs: must integrate ElevenLabs audio.
- Best Use of Tiger Data: judged on innovative, impactful and performance-driven use.
- Best Use of Vultr: judged on pushing the limits of cloud or GPU-based builds.
- Best Domain Name from GoDaddy Registry: must register a domain with GoDaddy Registry.
- Best 3D Print by Bambu Lab: best 3D-printed design.

## Locked decisions

- Pitch goal: staying in a classroom in June 2027. Target moments: walking around the room and standing at the board, with late-day fatigue in mind.
- Mechanism is hybrid. (1) Working wearable: cues timed to the gait cycle plus spoken cues when fatigue or foot-drop sway is detected. (2) Tabletop gyroscope rig: a spinning flywheel on a servo gimbal that physically resists a tipping dummy torso, showing the active-correction version, based on TU Delft's GyBAR (see `PATIENT_CASE.md`).
- Form factor stays a backpack: as light as possible, no chest pressure, closures usable without fine finger control.
- Haptics are servo tappers, not vibration motors. The MLH hardware lab has no vibration motors or haptic drivers. Servo split: 2 Grove Servos as left/right tappers, 1 as the rig's gimbal, 1 spare. The Grove Buzzer is a piezo and cannot vibrate against the body.
- Gyro rig flywheel: hobby DC motor through the Grove Motor/Servo Driver Board (no ESC needed). Weaker than brushless, so use a heavy metal disk and tune the demo for a visible effect.
- No moving weights. Shifting a small mass barely moves the center of mass, adds mechanical risk, and could destabilize the wearer.
- Raspberry Pi 4B is the brain. The lab Arduino model is unknown and a plain Uno has no wireless. The Pi has WiFi and BLE built in, reads the Grove 3-axis accelerometer over I2C, drives the servos (directly or via the Grove Motor/Servo Driver Board), and runs from a USB-C power bank.
- The accelerometer has no gyro, so tilt comes from the low-pass filtered gravity vector. Expect noise while walking; tune filtering and thresholds early.
- Data path: Pi POSTs readings and events to Next.js over WiFi. Next.js runs with a custom server and a `ws` WebSocket server on a Vultr VM, writes to Tiger Data, and pushes events to the phone app. Vercel was rejected because its serverless functions do not hold persistent WebSockets.
- Phone app: Expo (React Native) on iOS, running in Expo Go. It connects to the backend WebSocket and plays ElevenLabs spoken cues (for example, slow down or lift the right foot). Never clone Alex's voice; voice banking is one of his stated reluctances. BLE was dropped because BLE libraries need a custom dev build (Xcode or EAS plus Apple signing), and the Pi has WiFi anyway.
- Gemini clinician reports: generated automatically after each session and on demand from the dashboard over a chosen time range. Gemini summarizes and reasons over stored data; it does not train the tilt model.
- Tiger Data (TimescaleDB): all four ideas, with focus on (1) high-frequency IMU ingestion into a hypertable with continuous aggregates per minute/hour/day and (3) anomaly-window queries that flag unusual sway and feed Gemini. Also (2) long-term progress tracking with compression and (4) a multi-patient clinician view.
- Vultr: level 1 is the VM hosting the real-time pipeline, with live tilt-to-voice latency shown on the dashboard. Stretch: train a small sway classifier on a Vultr GPU instance from labeled data (stable, swaying, near-fall) and serve it from the VM.
- Bambu Lab prints: ergonomic Pi/electronics enclosure against the spine, clip-on servo tapper pods for adjustable placement, a rigid accelerometer mount at the lower back, and the gyro rig's flywheel housing and gimbal frame. Ask an organizer to print.
- Team: 4 people, one owner per area.

## MLH hardware lab (relevant parts)

Raspberry Pi 4B kits (9), Arduinos of unspecified model with Base Shields (12), Grove 3 Axis Digital Accelerometer (10), Grove Servo (4), Grove Motor/Servo Driver Board (5), Grove Buzzer (10), JBL Go 3 (2), Grove cables, jumpers, breadboards, resistors, capacitors, multimeter. No ESP32, gyro, vibration motors, haptic drivers or batteries are listed. Full list: https://guide.mlh.com/organizer-resources/hardware-lab-contents

## Open questions

- Exact Arduino model. If it is an UNO R4 WiFi, Nano 33 BLE or Nano ESP32 it has wireless. Either way it could run the gyro rig on its own (accelerometer, DC flywheel motor, gimbal servo) so the rig is independent of the wearable.
- Source of the hobby DC motor for the flywheel. The lab lists brushless, stepper and servo motors but no plain DC motor.
- Domain name for GoDaddy Registry is not chosen.
- Owner assignment for the 4 areas (hardware/firmware, backend/data, app/audio, dashboard/CAD) is not set.
- Servo count: the lab lists 4 Grove Servos total and we need 3. Reserve them at the hardware table.

## Working rules

- Do not commit or push unless explicitly told to.
- Never use em dashes in code or text.
- Expo judging is in MCCD 7110 and 7120. Ask an organizer to 3D print parts.
- Ask for clarification and design decisions before starting tasks whenever anything is ambiguous; do not assume.
- Write paragraphs as continuous lines without mid-paragraph line breaks.
- Only comment complex edge cases; keep comments concise.
- Use concise, idiomatic names.
- No redundant null checks or boilerplate error catching where normal propagation is fine.

## Links
- hardware components: https://guide.mlh.com/organizer-resources/hardware-lab-contents
- main link: https://www.bioeng4youth.ca/
- devpost: https://devpost.com/submit-to/30296-biohacks-2026/manage/submissions