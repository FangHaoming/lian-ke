# Ebook GIF experience log

This is an append-only project memory. Each entry records a user-observed failure and a verified prevention rule. Read relevant entries before generating or revising an action GIF.

## Entry format

Use this format for every new correction:

```md
## YYYY-MM-DD — [action] — [short symptom]

- User feedback: …
- Evidence: …
- Confirmed root cause: …
- Failed attempts: …
- Successful solution: …
- Verification: …
- Prevention rule: …
```

## 2026-11-17 — hanging bent-leg raise — knee angle drifted

- User feedback: The knee angle was still not fixed at 135° during the GIF.
- Evidence: The generated contact sheets changed the thigh–shin relationship between low and high poses; one attempt also returned to the low pose inside the forward sheet.
- Confirmed root cause: The image model was redrawing the knee in each frame, and one generation requested a complete up/down cycle even though the GIF assembler already adds the reverse.
- Failed attempts: Repeating “keep 135°” in the prompt without a rigid-shape constraint; accepting a plausible-looking sheet after checking only the first and last frames.
- Successful solution: Treat the bent thigh-plus-shin as a rigid template, allow only hip movement, prohibit the 90° L shape, generate only start→end forward frames, and inspect the whole 4×4 sheet before assembly.
- Verification: The forward sheet is monotonic from Figure 74 to Figure 75; the assembled GIF has 30 frames.
- Prevention rule: For a locked angle, never trust prompt wording alone. Inspect several middle frames and regenerate or use deterministic geometry when the joint silhouette changes.

## 2026-11-17 — hanging bent-leg raise — wrong end reference

- User feedback: The GIF did not match the ebook’s start/end images or fixed 135° position.
- Evidence: The supposed end crop showed prose instead of Figure 75. The correct Figure 75 crop is on the top image of local page 0240; the start Figure 74 crop is on local page 0239.
- Confirmed root cause: The page-to-figure mapping was guessed from nearby pages, so the generator had no valid end-pose reference.
- Failed attempts: Multiple generations using the text-page crop, even with increasingly strict angle prompts.
- Successful solution: Inspect every crop visually, replace the end reference with the verified Figure 75 crop, then regenerate the forward-only pose sheet.
- Verification: The new sheet begins with Figure 74 and ends with Figure 75; no prose or captions are present in the reference crop.
- Prevention rule: A reference crop is invalid until its image content and figure number are visually confirmed. Never proceed with a text-page crop as an action anchor.

## 2026-11-17 — GIF assembly — duplicated motion

- User feedback: The action sequence was not the intended start-to-end movement.
- Evidence: The pose sheet itself contained start→peak→start, while `scripts/make-pushup-gif.sh` appends frames 14→1 for reverse playback.
- Confirmed root cause: The forward sheet and the assembler both encoded the return movement.
- Successful solution: Generate exactly 16 forward frames from the user-confirmed start to end; let the assembler provide the reverse half.
- Verification: Frame 1 and frame 16 match the requested anchors, and the output reports 30 GIF frames.
- Prevention rule: Never ask the pose generator for a full cycle when using the repository GIF helper.

## 2026-11-17 — flat frog raise — missing phase change

- User feedback: The GIF did not follow the ebook’s bent → straight → low straight-leg sequence.
- Evidence: The ebook requires bent-knee lifting, full extension at the top, and a straight-leg descent to 2–5 cm above the floor.
- Confirmed root cause: Interpolating only between a bent start and vertical end omitted the straight-leg descent phase.
- Successful solution: Add Figure 67 (vertical straight), Figure 68 (descending straight), and Figure 69 (low straight) as phase anchors; encode the phase change explicitly.
- Verification: The contact sheet shows bent lift, extension, vertical hold, straight descent, and low endpoint.
- Prevention rule: When the description names a phase transition, use an anchor or explicit frame constraint for that phase instead of two-point interpolation.

## 2026-11-17 — hanging frog raise — straight-leg descent verified

- User feedback: The legs must remain straight while lowering after the top extension.
- Evidence: The inspected 4×4 sheet shows bent-knee lift in frames 1–8, straight horizontal legs in frames 9–12, and straight-leg descent to the fully extended hang in frames 13–16.
- Confirmed root cause: The previous two-anchor generation did not preserve the ebook’s phase change during the descent.
- Successful solution: Added verified Figure 76, Figure 77, and Figure 78 phase anchors and generated a forward-only bent → extend → straight descent sequence.
- Verification: The assembled `hanging-frog-raise.gif` contains 30 frames at 512px width; no knee bend appears after the extension phase.
- Prevention rule: For frog raises, always include separate peak-extension and straight-descent anchors before assembling the reverse GIF.

## 2026-11-17 — hanging frog raise — extension transition too abrupt

- User feedback: The transition from bent legs to straight legs happened almost instantly and was not smooth.
- Evidence: The original 16-frame forward sheet compressed the knee-extension phase into only a few frames.
- Confirmed root cause: The phase-change segment was under-sampled even though the bent lift and straight descent were present.
- Successful solution: Generated a dedicated 16-frame Figure 75→Figure 76 extension transition and spliced it between the bent-lift and straight-descent segments.
- Verification: The replacement GIF has 46 frames at 512px width, with a visibly longer, evenly stepped extension phase.
- Prevention rule: Allocate a dedicated multi-frame transition segment whenever an exercise changes from bent to locked-straight legs.

## 2026-11-17 — hanging frog raise — transition zoomed

- User feedback: The image suddenly zoomed when the legs approached full extension.
- Evidence: The inserted transition sheet used a larger subject scale than the master action sheet, although both had the same nominal pixel dimensions.
- Confirmed root cause: The transition was generated with a different camera-distance/composition scale and was spliced without a framing match.
- Successful solution: Regenerated the transition while using the master pose sheet as the camera-and-scale reference, then rebuilt the composite GIF.
- Verification: The replacement remains 46 frames at 512px width and the transition background/subject framing matches the surrounding frames.
- Prevention rule: Any separately generated transition sheet must inherit the master sheet’s camera, crop, and subject scale before assembly.

## 2026-11-17 — flat knee raise — fixed 90° knee angle

- User feedback: The knees must remain at 90° throughout.
- Evidence: The corrected contact sheet keeps shins parallel to the floor while only the thigh/hip position changes.
- Confirmed root cause: The first generation allowed knee-angle drift during the hip movement.
- Successful solution: State 90° as a per-frame invariant, preserve the shins’ orientation, and inspect the complete contact sheet.
- Verification: The replacement GIF has 30 frames and the pose sheet shows the 90° knee shape across the movement.
- Prevention rule: For every fixed-angle action, describe the joint geometry and the permitted moving segment, not just the target degree value.

## 2026-11-17 — hanging frog raise — knees bend during descent

- User feedback: During the leg-lowering phase, both legs must remain straight.
- Evidence: The ebook description for Figure 76→77 says to extend both legs at the top and keep them fully extended while lowering; Figure 78 shows the fully extended hanging finish.
- Confirmed root cause: The existing GIF did not encode the straight-leg descent as a separate forward phase, so the generator could return to a bent-knee pose while lowering.
- Failed attempts: Treating the action as a two-anchor bent-start to horizontal-end interpolation.
- Successful solution: Use Figure 74 as the bent start, Figure 76 as the straight horizontal transition, Figure 77 as the straight-leg descent, and Figure 78 as the fully extended end; generate only the forward sequence and let the GIF helper add the reverse.
- Verification: The replacement must show bent lift → extension at the top → straight-leg descent → fully extended hanging finish, with no knee bend after extension.
- Prevention rule: Any ebook action that explicitly changes joint state at the peak must include separate anchors for the transition and the descent, not only start and peak images.
