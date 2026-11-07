# Patient Case: Alex Chen (ALS)

Source: https://www.bioeng4youth.ca/BioHacks-2026-Hacker-Package.pdf (fictional case provided by BioHacks 2026). This is a working summary for design decisions; check the PDF for exact wording before quoting it in the pitch.

## Who he is

- 47, male, right-handed. Senior biology teacher at a Hamilton high school for 19 years. Former cross-country coach and half-marathon runner; stopped running in spring 2025.
- Lives in Westdale with partner Jordan (medical radiation technologist, 7 AM to 4 PM shifts) and children Maya (16) and Leo (14).
- Two-storey house. Bedroom and the only full bathroom are upstairs, 14 stairs.

## Diagnosis and course

- Amyotrophic lateral sclerosis (ALS), limb onset, with early bulbar and respiratory involvement. Diagnosed 14 July 2026 after about 27 months of symptoms.
- June 2024: whiteboard handwriting faded; right thumb and index finger fatigued quickly. Carpal tunnel release (Jan 2025) did not help despite normal wrist studies.
- Spring 2025: right foot drop, progressing despite physiotherapy. Then falls, a cane, and spreading weakness.
- Tests: EMG shows widespread active denervation in four regions with normal sensory conduction. CK mildly raised (470 U/L). Neurofilament light chain 88 pg/mL (reference below 15). Genetic panel negative (C9orf72, SOD1, TARDBP, FUS and 28 others). MRI shows corticospinal tract changes and a motor band sign.
- Prognosis as communicated: median survival two to four years from onset, wide range. Feeding tube, night ventilation and communication decisions are better made early.

## Current status (September 2026)

- ALSFRS-R 32/48, declining about 0.6 points per month.
- Grip: right 3/5 with pinch lasting only seconds; left 4/5 and weakening. Uses a spoon in the left hand. Handwriting illegible after about ten minutes. Needs help with buttons, zips and shoelaces in the morning.
- Speech intelligible but effortful by late afternoon. Reading rate drops from 165 wpm at 9 AM to 118 wpm at 4 PM; sentence intelligibility from 98% to 91%.
- Swallowing: coughs on thin liquids; solids and thickened liquids fine. Meals take 35 to 40 minutes. Weight down from 86 kg to 77.5 kg. Calorie supplement started.
- Breathing: FVC 76% sitting, 61% supine. Sleeps on two pillows.
- Cognition: reduced verbal fluency and executive function; memory, language and visuospatial scores normal.
- Mobility: two falls in three months, both after 6 PM, on the stairs or at dusk. 10 m walk in 14.2 s with a cane. Wears a right ankle-foot orthosis at school but not at home.
- Medications: riluzole 50 mg twice daily since July 2026 (tolerated). Edaravone declined for now.

## Daily life

- Still teaches four classes a day. Has not taken up the stool or microphone the school offered.
- Drives an automatic with his left foot; has not told his insurer.
- Alone at home on non-teaching days and from the end of school until 4:30 PM.
- Has declined a stairlift "for now". Stopped eating in the staff room and stopped the end-of-day recap.

## Goals

- Stay in a classroom in June 2027.
- Keep cooking Sunday family meals, even if it takes all afternoon.
- Be "reachable and useful" while alone in the afternoons.
- Attend his daughter's graduation in two years without a wheelchair.
- Be remembered by his children as their dad, not as a patient.

## Reluctances

- Voice banking ("it feels like giving up").
- Stairlift.
- Asking for classroom accommodations.

## Care team

Dr. Priya Raman (family physician), Dr. Marcus Oyelaran (plastic and hand surgery), Daniela Ferreira (physiotherapist), Dr. Hannah Weiss-Okafor (neurologist), Dr. Thanh Nguyen (neuroradiology), a regional ALS clinic every three months, plus speech-language pathology, dietitian, occupational therapy, respiratory, social work and ALS Canada.

## Wearables track prompt

Design a device or tool that helps Alex keep one thing that matters to him as his abilities change. The organizers highlight his afternoon weakness, needing to be heard in class, being alone until 4:30 PM, his falls on the stairs, and the risk that assistive devices go unused when nobody asks the user what they want. The MLH hardware lab is open all weekend.

## Wearables rubric (out of 100)

- Clinical grounding: 20
- Design and function: 30, including whether a prototype or demonstration supports it
- Usability in daily life: 20, including comfort, adapting as the condition progresses, and day-to-day use
- Feasibility: 15
- Communication: 15

Each criterion has four levels. Judges score each project and name their top three; combined rankings pick two winners per track. There is also $1,000 for the top team overall.

## Design implications for our project

- Goal we center on: staying in a classroom in June 2027. Target moments are walking around the room (between desks and the board) and standing at the board, both of which get harder as weakness and fatigue build through the afternoon.
- Intent: counteract the gait and balance problem rather than cure it, so Alex can keep walking and standing while teaching with a much lower fall risk.
- His falls come from motor weakness (right foot drop, fatigue) with normal sensory conduction, not a sensory or vestibular deficit. Tactile cues alone are weakly grounded for ALS, which is why the concept pairs cues with active correction.
- Active correction precedent: TU Delft's GyBAR, a backpack-like control moment gyroscope that applies corrective moments to the trunk (Lemus et al., Scientific Reports 2020, DOI 10.1038/s41598-020-66760-w). Tested on healthy and chronic stroke participants, not ALS, so present it as a promising direction, not proven for Alex.
- Risk is time-dependent: weakness and speech worsen through the afternoon, and both falls were after 6 PM, on stairs or at dusk. Time-of-day trends belong in the data and the reports.
- Form factor stays a backpack. Keep it as light as possible and put no pressure on the chest, given his weight loss (86 to 77.5 kg) and reduced FVC (76% sitting, 61% supine). Closures and controls must not need fine finger control (no small buttons, zips or clasps).
- He resists visible assistive devices and classroom accommodations. The device should look like a normal backpack and stay discreet in front of students, and the pitch should show we designed around what he wants.
- The ALS clinic sees him every three months. Continuous between-visit data (sway, gait changes, time-of-day patterns) summarized for the physio and neurologist is the clinical value of the Gemini reports.
- ElevenLabs is for spoken cues only. Voice banking is a stated reluctance, so never clone his voice or frame the audio as voice banking.
- Relevant dataset: Gait in Neurodegenerative Disease (PhysioNet), foot-force and stride data including ALS, open download. Could inform thresholds or the stretch sway classifier.
