# Alternative Ideas: Writing and Upper Body

Standalone alternatives to the backpack, in case we pivot. All target Alex Chen (see `PATIENT_CASE.md`) and the Wearables track. Each idea lists lab hardware, rubric fit, sponsor prize fit and a 23-hour scope.

Case facts these build on: right grip 3/5 with a pinch lasting only seconds, left grip 4/5 and weakening, handwriting illegible after about ten minutes, faded whiteboard writing was his very first symptom, he eats with a spoon in his left hand, needs help with buttons, zips and shoelaces in the morning, and wants to stay in a classroom in June 2027. Speech becomes effortful by late afternoon, so voice-only controls are weak later in the day. He resists visible accommodations.

Rubric reminder (out of 100): clinical grounding 20, design and function 30 (prototype or demo counts), usability in daily life 20 (comfort, adapting to progression, daily use), feasibility 15, communication 15.

---

## Writing

### W1. Gesture Board: write on the board with whole-arm movement, no grip

A wrist or forearm band with an accelerometer turns large arm movements into strokes on a projected digital whiteboard. In limb-onset ALS the fingers usually weaken before the shoulder, so moving the work from the fingers to the shoulder and elbow buys time. Gemini turns rough strokes into clean text, arrows and simple biology diagrams (a cell, a pathway) so the result looks neat even when the movement is shaky.

- Hardware from the lab: Grove 3 Axis Digital Accelerometer, Raspberry Pi 4B or Arduino, a laptop and projector or TV. Optional Logitech webcam to track a bright marker cap instead of using the accelerometer. Source: a Velcro strap.
- Rubric fit: strong design and function (live demo at the table), strong usability (no grip, works as the fingers fail, discreet, he stays standing at the board). Clinical grounding is moderate: distal-before-proximal weakness in limb-onset ALS is the rationale, but there is no direct study.
- Sponsor fit: Gemini (stroke and diagram cleanup), Tiger Data (stroke speed and size over weeks as a fatigue and progression signal), Vultr (hosting the board), Bambu (wrist housing), domain.
- Adapting to progression: sensitivity and stroke scaling increase as range of motion drops. When arm movement gets too weak, the same board takes input from W2.
- 23-hour scope. MVP: accelerometer to 2D cursor with a pen-down gesture, drawn on a web canvas, with a Gemini "clean up" button. Stretch: shape and text recognition, saved boards per lesson, webcam tracking. Risk: accelerometer-only position tracking drifts, so use tilt angle as the cursor (like a joystick), not double-integrated position.

### W2. Board Assistant: speak or pick, and the board writes for you

Short phrases or keywords, spoken or picked from his lesson plan, become structured board content. "Mitosis, four phases" puts a labeled diagram and key terms on the screen. Gemini prepares each lesson's board ahead of time from his notes, so in class he only advances or tweaks it.

- Hardware from the lab: a laptop and projector, a phone or Grove Sound Sensor for audio, Grove Buttons or the Grove Thumb Joystick as large next/back controls. A JBL Go 3 can play audio.
- Rubric fit: strong usability for the classroom goal, and it reduces fatigue, so his limited energy goes to teaching instead of writing. Design and function is a solid software demo but has less hardware. Clinical grounding: handwriting loss and afternoon speech fatigue are both in the case.
- Sponsor fit: ElevenLabs Speech to Text for dictation and text to speech to read board content aloud, Gemini (lesson prep and diagram generation), Tiger Data (usage and speech-rate trends), Vultr, domain.
- Adapting to progression: speech degrades by afternoon, so the input moves from speaking to the big buttons, then to a single-switch scan. Preparing ahead means less live input is needed over time.
- 23-hour scope. MVP: lesson notes in, Gemini-generated board slides out, voice or button navigation, and a dictated line inserted live. Stretch: an adaptive input mode based on measured speech clarity. Risk: speech recognition on dysarthric speech; reduce the risk with keyword matching against the lesson's vocabulary.

### W3. Pen That Learns: a 3D-printed grip cuff plus a fatigue-sensing marker

A Bambu-printed marker holder with a forearm cuff, built on the occupational therapy idea of a universal cuff, so the marker is held by the strap and not the pinch. An accelerometer in the holder measures stroke speed, tremor and pressure-like patterns, and warns when his writing quality is about to drop, suggesting he switch to digital (W1/W2) before it becomes illegible in front of students.

- Hardware from the lab: Grove 3 Axis Digital Accelerometer, Arduino, Grove Buzzer or a phone for the warning. Bambu for the cuff. Source: elastic or Velcro straps, a lithium coin cell or a thin cable.
- Rubric fit: very strong feasibility and usability (cheap, discreet, normal-looking, no learning curve). Clinical grounding is strong for the cuff (standard OT adaptive equipment) and moderate for fatigue sensing. Design and function is weaker unless the sensing demo is convincing.
- Sponsor fit: Bambu (the cuff is the hero), Tiger Data (stroke metrics over weeks, fatigue by time of day), Gemini (weekly OT report), domain.
- Adapting to progression: print new cuff sizes and shapes as grip changes, from a light-assist grip to a full forearm cuff to a mount on the arm support in U1.
- 23-hour scope. MVP: printed cuff, accelerometer streaming stroke metrics to a dashboard, a simple fatigue threshold. Stretch: a model trained on fresh vs fatigued writing. Risk: it is low-tech, so the pitch needs the data story to score on design.

### W4. Live Clean Copy: a webcam that turns messy writing into clean text

A webcam watches the board or paper. As his handwriting degrades, Gemini vision reads it and projects a clean typed copy beside it in real time. He keeps writing his own way, and students still get a legible version. It also works for grading and feedback on paper.

- Hardware from the lab: Logitech Webcam, laptop, projector or TV. No wearable parts, so it is the least physical option.
- Rubric fit: strong usability (no change to how he teaches, invisible accommodation, which fits his reluctance). Design and function is a compelling live demo. Weak for the Wearables track itself, since it is not worn; it fits better as a quality-of-life tool.
- Sponsor fit: Gemini vision (core), ElevenLabs (read the clean copy aloud), Tiger Data (legibility score over time as a progression metric), Vultr, domain.
- Adapting to progression: when writing stops working, the same screen switches to W2 input.
- 23-hour scope. MVP: periodic webcam frames, Gemini transcription, a clean-copy web view. Stretch: diagram recognition, a legibility trend chart. Risk: latency and glare on the whiteboard; capture on demand with a button instead of continuously.

---

## Upper body

### U1. Lift Assist: an adjustable, gravity-balancing arm support for the board

A shoulder and upper-arm support with elastic bands (or springs) that offsets the arm's weight so he can raise it to the board and hold it there. This builds on mobile and dynamic arm supports, which occupational therapists use for neuromuscular weakness. A servo-driven tensioner adjusts the support level, and an accelerometer detects arm elevation and how long he holds it, so the support can increase over the afternoon and over months.

- Hardware from the lab: Grove Servo with the Grove Motor/Servo Driver Board (tensioner), Grove 3 Axis Digital Accelerometer, Arduino or Raspberry Pi 4B. Bambu for the shoulder bracket, hinge and spool. Source: resistance bands or bungee cord, a strap.
- Rubric fit: strong clinical grounding (arm supports are an established approach for proximal weakness; cite one in the pitch). Strong design and function (a physical prototype that visibly lightens the arm). Usability: comfort and discretion matter, so it must fit under a cardigan or look like a sports brace.
- Sponsor fit: Bambu (the mechanism is mostly printed), Tiger Data (elevation time and support level over time), Gemini (physio report on arm fatigue), ElevenLabs (spoken cue to rest), Vultr, domain.
- Adapting to progression: this is the main pitch. Support goes up with fatigue during the day and with decline across months, with the physio setting limits from the dashboard.
- 23-hour scope. MVP: printed shoulder bracket with bands and a servo spool that changes tension when the accelerometer detects a raised arm. Stretch: automatic support curves by time of day, a dashboard. Risk: Grove servos are weak, so the bands carry the load and the servo only shifts the anchor point. Test on a teammate with a weighted sleeve.

### U2. Grip Glove: a cable-driven glove that closes the hand for him

A glove with cables along the fingers. A servo pulls them to close the hand around a marker, spoon or cup handle, and releases on command. He triggers it with a small wrist flick (accelerometer), a touch sensor or a tap on the phone. The idea is similar to commercial grip-assist gloves, though evidence in ALS specifically is limited.

- Hardware from the lab: Grove Servo with the Grove Motor/Servo Driver Board, Grove 3 Axis Digital Accelerometer or Grove Touch Sensor, Arduino. Bambu for the finger guides and a wrist-mounted servo housing. Source: a work glove, fishing line or braided cord.
- Rubric fit: very strong design and function (a dramatic demo of holding a marker with no pinch strength), and it covers several goals: writing, eating with the left hand, cooking Sunday dinner. Usability is the risk: comfort, putting it on with weak hands, and grip force must be limited for safety.
- Sponsor fit: Bambu (guides and housing), Tiger Data (grip events and duration), Gemini (OT report), ElevenLabs (spoken confirmation of grip and release), Vultr, domain.
- Adapting to progression: grip force and hold time increase as his own strength drops; the trigger switches from wrist flick to touch to phone as arm control changes.
- 23-hour scope. MVP: one servo closing two or three fingers around a marker on a wrist flick. Stretch: per-finger cables, adjustable force profiles, the dashboard. Risk: Grove servo torque is low, so pick light objects for the demo and keep a mechanical lock that holds the grip without power.

### U3. Morning Dress Kit: adaptive dressing tools with a guided routine

A set of printed tools for the morning tasks he needs help with: a magnetic button hook, a zipper pull ring, a sock aid and a shoelace alternative (elastic laces with printed lock clips). A phone routine guides each step with large buttons and spoken prompts, and logs how long each task takes, which is a simple daily measure of hand function.

- Hardware from the lab: mostly Bambu prints. Optional Grove Touch Sensor or Grove Buttons as a big "done" button on a dresser station, Arduino.
- Rubric fit: strong usability and feasibility (directly addresses a stated need, cheap, he can use it alone before Jordan leaves at 7 AM). Strong clinical grounding (standard OT dressing aids). Weaker design and function on the tech side, and not a single wearable.
- Sponsor fit: Bambu (core), ElevenLabs (spoken routine), Tiger Data (task-time trends as a hand-function signal), Gemini (weekly summary for OT), domain.
- Adapting to progression: tools move from assistive (button hook) to substitutes (magnetic closures, elastic laces) as grip declines, and the routine reorders tasks by difficulty.
- 23-hour scope. MVP: three printed tools plus a routine app with timing. Stretch: the dresser station, OT dashboard. Risk: judges may see it as low-tech, so lead with the data and the "dressing independently" story.

---

## Comparison

| Idea | Wearable? | Lab-parts fit | Demo strength | Clinical grounding | Adaptation story | Sponsor coverage | Build risk |
|---|---|---|---|---|---|---|---|
| W1 Gesture Board | Yes (wrist) | Good | High | Moderate | Good | Gemini, Tiger, Vultr, Bambu | Medium |
| W2 Board Assistant | No | Good | Medium | Good | Strong | ElevenLabs, Gemini, Tiger, Vultr | Low |
| W3 Pen That Learns | Yes (hand) | Good | Medium | Strong (cuff) | Good | Bambu, Tiger, Gemini | Low |
| W4 Live Clean Copy | No | Good | High | Moderate | Good | Gemini, ElevenLabs, Tiger, Vultr | Low |
| U1 Lift Assist | Yes (shoulder) | Good | High | Strong | Strong | Bambu, Tiger, Gemini, ElevenLabs | Medium |
| U2 Grip Glove | Yes (hand) | Fair (servo torque) | Very high | Moderate | Strong | Bambu, Tiger, Gemini, ElevenLabs | High |
| U3 Morning Dress Kit | Partly | Good | Low to medium | Strong | Good | Bambu, ElevenLabs, Tiger | Low |

## Combinations worth considering

- W1 + W3: a printed cuff that holds either a real marker or the gesture sensor, so one wrist device covers both the physical and the digital board.
- U1 + W1: the arm support lightens the arm and its accelerometer doubles as the gesture input for the digital board. Strongest classroom story.
- W2 + W4: a fully software "classroom board" that needs no new skills, as a low-risk fallback.
