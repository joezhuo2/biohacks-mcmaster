# 3-Minute Pitch: Adaptive Ankle-Foot Brace

Target length: about 420 spoken words, 3:00 at a calm pace. Timestamps are cumulative. Lines in **bold** are actions at the table.

## 0:00 to 0:30 | The problem

Alex Chen is 47. He has taught biology in Hamilton for 19 years, and he has ALS. His goal is simple: still be in a classroom in June 2027.

The biggest thing in the way is his right foot. Foot drop means his toe catches the floor. He has fallen twice in three months, both times after 6 PM, on the stairs or at dusk. That timing is the clue: his ankle is weakest when he is most tired.

## 0:30 to 1:10 | The idea

He already wears a brace at school, a passive ankle-foot orthosis. It gives the same help at 9 AM as at 9 PM, and he leaves it off at home, where both falls happened.

So we built an adaptive brace. It measures ankle angle and toe clearance on every step, knows when he is on stairs, and raises its lift assist as fatigue lowers his clearance. It stays under his trousers, with no buttons or buckles to fight with weak fingers. No new visible device, which matters to a man who has turned down a stool, a microphone and a stairlift.

## 1:10 to 2:10 | Demo

**Open the dashboard in Physician mode.**

The brace streams from a Raspberry Pi into Tiger Data. Here is his live ankle trace and the assist level. Every evening, clearance drops and assist climbs to keep his toe above the 2 centimetre target.

**Press `n` in the simulator to force a stair near-trip.**

That near-trip is logged, and in Family mode Jordan sees a calm banner, not a siren. Alex is alone until 4:30 most days, and he wants to stay reachable without being watched.

**Switch to the heatmap, then the forecast.**

This heatmap is 14 days by hour: the low-clearance band is every evening. The forecast fits 90 days of data and projects when his evening clearance will cross the 1.2 centimetre risk line. We calibrate his stride against ALS and control patients from the PhysioNet gait database, and match today against his most similar past days.

**Generate a Gemini physician report.**

Gemini turns three months of data into findings, progression since baseline, suggested physiotherapy focus and questions for his next clinic visit. It is labelled as suggestions for his physiotherapist, not a diagnosis.

## 2:10 to 2:40 | Why it works

His clinic sees him every three months. This fills the gap between visits with real data from his real day. Tiger Data hypertables, continuous aggregates and compression keep 90 days of step-level data fast to query. And as ALS progresses, the brace does not get replaced; it adjusts.

## 2:40 to 3:00 | Close

AFOs are standard care for foot drop. We made one that notices when he is tired and helps more, and lets the people who care about him see it.

Alex wants his students to remember a teacher, not a patient. This brace keeps him on his feet long enough for that.

## Likely judge questions

- **Is adaptive assist proven for ALS?** No. AFOs are standard for foot drop; adaptive assist is a prototype. We present it as a promising direction.
- **How is toe clearance measured?** TODO: fill in from the hardware build (see open questions in `docs/plan/CONTEXT.md`). The demo uses a simulator that posts the same data the Pi does.
- **Why not just cues or alarms?** His falls come from motor weakness, not missing sensation. A cue does not lift the foot; the brace does.
- **What happens as he gets weaker?** Assist rises over months, the forecast shows when, and the physician report flags it before the next visit.
