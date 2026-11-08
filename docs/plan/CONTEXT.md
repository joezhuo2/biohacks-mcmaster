# BioHacks McMaster 2026: Adaptive Ankle-Foot Brace

An adaptive ankle-foot orthosis (AFO) for Alex Chen (47, ALS) that targets his right foot drop so he can keep teaching and stop falling on the stairs. The brace senses ankle angle, toe clearance and gait events, detects stair climbing, and raises its lift assist as fatigue lowers his toe clearance through the afternoon. A Raspberry Pi reads the sensors and streams data to a Next.js backend on Tiger Data, and a care dashboard shows it to his family and his physician, with Gemini-generated summaries and physiotherapy suggestions. See `PATIENT_CASE.md` for the patient case and design implications, and `docs/superpowers/specs/2026-11-07-dashboard-design.md` for the dashboard and backend design. Links are at the bottom of this file.

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

- Pitch goal: staying in a classroom in June 2027 and not falling on the stairs at home. Target moments: walking between desks and the board late in the school day, and the 14 stairs at home after 6 PM, when both of his falls happened.
- Device: an adaptive AFO on his right leg. It replaces the earlier haptic backpack and gyroscope rig concepts. He already wears a passive right AFO at school but not at home, so the brace builds on a device he accepts instead of adding a new visible one.
- Adaptation: lift assist rises automatically with fatigue, when toe clearance drops. Clearance target is 2 cm; 1.2 cm is the risk threshold used by the forecast.
- Sensing: ankle angle (dorsiflexion positive), toe clearance per swing, gait events (toe-off, cadence, stride time), terrain (level, stairs up, stairs down), assist level, and on/off wear status. The Pi samples at about 100 Hz; the dashboard live stream is throttled to 20 Hz.
- Raspberry Pi 4B is the brain. It has WiFi built in, reads the Grove 3-axis accelerometer over I2C, drives the assist servo (directly or via the Grove Motor/Servo Driver Board), and runs from a USB-C power bank. The accelerometer has no gyro, so angles come from the filtered gravity vector and need tuning while walking.
- Data path: the Pi POSTs samples, steps and events to `/api/ingest` on a Next.js app with a custom Node server and a `ws` WebSocket server at `/ws`. Hosting target is a Vultr VM, since Vercel serverless functions do not hold persistent WebSockets. A simulator (`web/scripts/simulate.ts`) posts like the Pi and seeded history (`web/scripts/seed.ts`) covers 90 days, so the whole system demos without hardware.
- Dashboard: one Next.js app with two modes. Family mode is calm and plain (today strip, weekly stability, weekly summary, a near-trip banner with a soft chime). Physician mode has a live ankle trace, KPIs, progression with clinic visits, an hour-by-day clearance heatmap, events, similar days, a 90-day forecast and Gemini reports.
- Tiger Data (TimescaleDB): hypertables for samples and steps, continuous aggregates per hour and day, compression and retention policies, an anomaly query (hours below the 30-day mean minus 2 standard deviations, plus stair near-trips), toolkit percentiles for daily clearance, pgvector nearest-neighbour search for similar gait days, and a 90-day forecast fitted on the daily rollup. The engine card shows raw versus rollup query time.
- PhysioNet Gait in Neurodegenerative Disease database: ALS and control stride time and stride variability calibrate how far Alex's gait sits between healthy and ALS reference values.
- Gemini reports: a plain weekly summary for family (automatic every Monday) and an on-demand physician report over a chosen range with stability findings, progression versus baseline, suggested physiotherapy focus and questions for the next visit. Input is aggregates and anomalies, never raw samples. Reports are labelled as AI-generated suggestions for his physiotherapist, not medical advice.
- Bambu Lab prints: the brace shell and assist mechanism mounts, the Pi and battery enclosure, and a rigid sensor mount on the shank. Ask an organizer to print.
- Team: 4 people, one owner per area.

## MLH hardware lab (relevant parts)

Raspberry Pi 4B kits (9), Arduinos of unspecified model with Base Shields (12), Grove 3 Axis Digital Accelerometer (10), Grove Servo (4), Grove Motor/Servo Driver Board (5), Grove Buzzer (10), Grove cables, jumpers, breadboards, resistors, capacitors, multimeter. No ESP32, gyro or batteries are listed. Full list: https://guide.mlh.com/organizer-resources/hardware-lab-contents

## Open questions

- How toe clearance is measured on the physical brace (estimated from ankle angle and stride, or a distance sensor), and how the assist servo couples to the foot plate.
- Whether the ElevenLabs and GoDaddy prizes are still in scope; the current build does not use ElevenLabs and no domain is chosen.
- Vultr deployment status of the custom server.

## Working rules

- Commit and push directly to main in this repo.
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
