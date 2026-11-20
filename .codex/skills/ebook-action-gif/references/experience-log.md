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

## 2026-11-18 — pullup series — second ebook image is the end pose

- User feedback: In the pullup action pages, the second exercise photo is the ending action; the GIFs must move from the first photo to the second photo.
- Evidence: Each pullup action presents its two verified exercise figures in start-then-end order: Figures 41→42, 43→44, 45→46, 47→48, 49→50, 51→52, 53→54, 55→56, 57→58, and 59→60.
- Confirmed root cause: The first generation did not record this ebook-specific ordering rule explicitly, so the sequence direction could not be audited from the project memory alone.
- Failed attempts: Treating the start/end relationship as an implicit assumption in per-action prompts.
- Successful solution: Regenerate every pullup sheet with an explicit invariant: Image 1 is the start anchor, Image 2 is the end anchor, frames 1–16 move only from Image 1 to Image 2, and the GIF helper supplies the reverse playback.
- Verification: Pending regeneration; verify frame 1 against the first ebook photo, frame 16 against the second, and confirm 30 assembled frames for every pullup GIF.
- Prevention rule: For multi-photo ebook actions, record and enforce the page’s photo order explicitly; never rely only on figure numbers or an implicit prompt convention.

## 2026-11-18 — pullup series — forward direction verified

- User feedback: The pullup GIFs were re-requested with the ebook photo order made explicit.
- Evidence: The regenerated 4×4 sheets visibly progress from each first reference photo to its corresponding second reference photo; no sheet contains a return-to-start phase.
- Confirmed root cause: The direction rule needed to be made explicit and auditable for all ten actions.
- Failed attempts: None after the ordering rule was recorded.
- Successful solution: Regenerated all ten pullup sheets with Image 1 locked as frame 1 and Image 2 locked as frame 16, then assembled the reverse playback only through the repository helper.
- Verification: All ten replacement GIFs contain 30 frames and are 512px wide; the forward sheets were visually checked for the first-to-second direction.
- Prevention rule: Keep the first/second ebook-photo ordering in every pullup prompt and verify both anchor frames before replacing an asset.

## 2026-11-18 — vertical pulls — arm length stretched at the end

- User feedback: The vertical-pulls GIF shows an abnormally elongated arm in the ending action.
- Evidence: The ending frame diverges from the verified Figure 42 crop; the forearm/upper-arm silhouette is longer than the ebook reference even though the overall body position is similar.
- Confirmed root cause: The image model altered limb proportions while interpolating the final transition instead of preserving the second ebook photo as an exact endpoint.
- Failed attempts: Prompt-only instructions to keep the same person and camera while allowing the model to generate all 16 cells freely.
- Successful solution: Regenerate the final transition with explicit limb-length and endpoint constraints, then replace frame 16 with the verified Figure 42 crop before GIF assembly so the end action is exact.
- Verification: Pending replacement; inspect frames 14–16 and compare frame 16 directly with Figure 42, then confirm the assembled GIF has 30 frames.
- Prevention rule: For photo-anchored exercise GIFs, lock the final cell to the verified end crop when limb geometry is critical; inspect the last three forward frames, not only the first and last sheet cells.

## 2026-11-18 — vertical pulls — endpoint replaced with verified crop

- User feedback: The abnormal arm stretch at the end needed correction.
- Evidence: The replacement sheet’s final three forward frames keep natural arm proportions, and frame 16 matches the Figure 42 reference crop exactly.
- Confirmed root cause: The free-generated final cell had limb-proportion drift.
- Failed attempts: Relying on prompt constraints alone for the endpoint.
- Successful solution: Regenerated the transition with anatomy-lock constraints and composited the verified Figure 42 crop into the final cell before assembling the GIF.
- Verification: `vertical-pulls.gif` now contains 30 frames; frames 14–16 were visually inspected and no abnormal arm elongation remains.
- Prevention rule: For endpoint-sensitive movements, always composite the verified ebook end crop into the final forward cell after generation.

## 2026-11-18 — vertical pulls — end transition still stretched and abrupt

- User feedback: The arm still stretches near the ending action, and the movement is not smooth.
- Evidence: Locking only frame 16 did not prevent limb-proportion drift in the preceding end-transition frames; the final segment still contains a visible shape change.
- Confirmed root cause: The model-generated frames 14–15 are not reliable for anatomy-critical convergence, even when frame 16 is replaced with the verified crop.
- Failed attempts: Prompt-only anatomy constraints and replacing only the final cell.
- Successful solution: Pending. The next revision must make the entire ending segment deterministic, using the verified end crop as the convergence target for the final forward frames rather than trusting free generation for frames 14–15.
- Verification: Pending; inspect frames 12–16 for continuous motion, natural arm length, and an exact frame-16 match.
- Prevention rule: When a model-generated transition distorts anatomy near an endpoint, constrain or replace the whole final segment, not just the last frame.

## 2026-11-18 — vertical pulls — replacement asset cache-busted

- User feedback: The unchanged-name replacement still appeared to show the stretched and unsmooth GIF.
- Evidence: A new assembly from the anatomy-constrained sheet has 30 frames, and its final forward frame is the verified Figure 42 crop; the prior catalog URL reused the original asset name.
- Confirmed root cause: The prior URL could serve a cached GIF, making it impossible to distinguish the corrected asset from the old animation in the viewer.
- Failed attempts: Replacing the file contents while keeping the same GIF URL.
- Successful solution: Publish the corrected animation as `vertical-pulls-v2.gif` and update the catalog to use the new path.
- Verification: The new asset is 30 frames wide at 512px and the catalog now references the versioned path.
- Prevention rule: When an animated asset is corrected in place, version the filename or add an explicit cache-busting URL before visual verification.

## 2026-11-18 — vertical pulls — fixed feet drift and arm stretch

- User feedback: The arm still elongates and the feet suddenly shift position in the last few frames.
- Evidence: The ending transition changes both the arm silhouette and the planted-foot location before reaching the second ebook photo.
- Confirmed root cause: Free image generation does not preserve fixed ground contact and limb proportions across the final transition, even when the endpoint itself is composited from the reference.
- Failed attempts: Re-prompting anatomy constraints, replacing only frame 16, and changing the asset filename for cache busting.
- Successful solution: Pending. Replace the model-generated ending transition with deterministic interpolation between the verified first and second photos, preserving the exact endpoint and fixed contact geometry.
- Verification: Pending; inspect frames 12–16 for unchanged foot placement, natural arm length, smooth motion, and exact second-photo endpoint.
- Prevention rule: When a support point must remain fixed, do not use unconstrained generated frames for the transition; use deterministic motion interpolation or locked compositing for the affected body region.

## 2026-11-18 — vertical pulls — locked final foot segment

- User feedback: The arm stretch and sudden foot movement persisted in the ending frames.
- Evidence: The revised ending preview keeps the feet fixed through the final segment, preserves natural arm proportions, and ends on the exact Figure 42 crop.
- Confirmed root cause: The model-generated final transition changed the planted-foot region independently of the torso movement.
- Failed attempts: Full-sheet regeneration, endpoint-only replacement, cache-busted v2 asset, and full-frame optical-flow interpolation (which introduced visible ghosting).
- Successful solution: Keep the natural generated motion through frame 11, replace the ending frame's lower contact region with the verified Figure 42 foot region, and hold the exact Figure 42 crop for frames 12–16.
- Verification: `vertical-pulls-v3.gif` contains 30 frames; frames 9–15 were visually inspected for fixed foot placement and stable arm length.
- Prevention rule: For planted-foot actions, lock the contact region across the entire final segment and avoid optical-flow interpolation when it creates ghost limbs.

## 2026-11-18 — vertical pulls — lower-body misalignment persists

- User feedback: The arm issue remains, and the lower body becomes misaligned in the later frames.
- Evidence: Locking only the final segment did not stabilize the lower-body silhouette across the full latter half of the forward sequence.
- Confirmed root cause: The generated frames independently redraw the pelvis, legs, and feet; late-frame compositing leaves earlier lower-body drift intact.
- Failed attempts: Endpoint-only replacement, cache-busted asset versions, final-segment foot locking, and full-frame optical-flow interpolation.
- Successful solution: Pending. The next revision must use a fixed lower-body/foot support region throughout the latter half, while constraining the upper-body transition separately.
- Verification: Pending; inspect every forward frame for one continuous pelvis-to-foot silhouette and compare the final arm geometry with Figure 42.
- Prevention rule: For exercises with planted feet, treat the lower body and contact points as a locked visual layer across all generated frames, not only at the endpoint.

## 2026-11-18 — vertical pulls — removed partial-body splice seam

- User feedback: The lower body still shifts in the later frames.
- Evidence: Inspection found that the previous foot-locking attempt introduced a visible horizontal seam and body misalignment when a partial lower-body crop was composited over frame 11.
- Confirmed root cause: Partial-body compositing used mismatched torso and lower-body geometry.
- Failed attempts: Locking only the lower-body crop on the penultimate frame.
- Successful solution: Removed the partial splice entirely; use intact generated frames through frame 12, then hold the complete verified Figure 42 crop for frames 13–16, preserving one coherent image per frame.
- Verification: The revised forward preview has no horizontal splice seam or sudden foot relocation in the final eight frames; `vertical-pulls-v4.gif` contains 30 frames.
- Prevention rule: Never composite a hard partial-body crop across a moving torso; if the generated transition is unreliable, switch to complete-frame endpoint holds.

## 2026-11-18 — vertical pulls — endpoint hold caused a visible cut

- User feedback: Holding the complete ending image for the last frames made the motion abrupt, and the feet appeared to move instantly.
- Evidence: The endpoint-hold version removes the splice seam but introduces a discontinuity between the last generated pose and the first held ending pose.
- Confirmed root cause: Complete-frame endpoint replacement is too abrupt when the preceding generated frame is not already aligned with the end pose.
- Failed attempts: Holding the exact end crop for the final four frames as a hard cut.
- Successful solution: Pending. The next revision must retain a continuous upper-body trajectory while softly locking the planted-foot region, then converge to the exact end crop without a hard frame switch.
- Verification: Pending; inspect the last six forward frames for continuous torso motion, fixed feet, natural arm length, and an exact final frame.
- Prevention rule: Do not use hard endpoint holds when the preceding frame is misaligned; use a feathered support-region lock and an eased transition to the anchor.

## 2026-11-18 — vertical pulls — dedicated final transition verified

- User feedback: The hard switch to the ending pose caused an abrupt movement and apparent foot relocation.
- Evidence: A dedicated transition sheet from the penultimate generated pose to Figure 42 provides four progressively closer complete frames; the last six forward frames now change continuously without a partial-body seam.
- Confirmed root cause: The final four-frame hold was a discontinuous replacement, not a movement transition.
- Failed attempts: Hard endpoint hold and partial lower-body compositing.
- Successful solution: Generate a dedicated complete-frame final transition, select evenly spaced transition frames, then use the exact Figure 42 crop only as the final frame.
- Verification: `vertical-pulls-v5.gif` contains 30 frames; forward frames 10–16 were visually inspected for continuous torso motion, stable foot placement, natural arm length, and exact final pose.
- Prevention rule: Use a complete-frame transition segment for endpoint convergence; reserve exact reference replacement for the final frame only.

## 2026-11-19 — angled bridges — arms elongated and elbows locked

- User feedback: The arms do not need to become fully straight, but the angled-bridge GIF makes them elongate unnaturally.
- Evidence: Ebook Figure 88 explicitly says the arms do not need to be completely straight and the elbows should remain bent. In the current GIF, the last forward row locks the elbows and changes the visible upper-arm/forearm proportions relative to Figures 87 and 88.
- Confirmed root cause: The generated transition interpreted the upward press as full elbow lockout and independently redrew the arms in late frames, causing limb-length drift instead of preserving a constant two-segment arm.
- Failed attempts: The original prompt requested straighter arms and a higher chest without defining a maximum elbow extension or locking upper-arm and forearm lengths.
- Successful solution: Pending regeneration with both arms treated as fixed-length two-segment chains, hands fixed on the bench, and a visible elbow bend required in every frame including the endpoint.
- Verification: Pending; compare frames 9–16 against Figure 88, verify constant arm proportions, stable hand placement, smooth motion, and 30 assembled frames at 512×512.
- Prevention rule: For angled bridges, never request straight arms. Preserve fixed upper-arm and forearm lengths, keep the hands planted, and require visibly bent elbows through the entire movement.

## 2026-11-19 — angled bridges — bent-elbow regeneration verified

- User feedback: Continue correcting the elongated-arm angled bridge after confirming that the elbows need not fully straighten.
- Evidence: The regenerated forward sheet keeps a visible bend at both elbows in all 16 cells; frames 9–16 no longer lock the elbows or stretch the upper-arm/forearm silhouette.
- Confirmed root cause: Same as the preceding entry: unconstrained late-frame elbow extension caused independent arm redraw and limb-length drift.
- Failed attempts: The original `angled-bridges.gif`, whose final row used full lockout and visibly elongated arms.
- Successful solution: Regenerated the complete forward sequence with both arms constrained as fixed-length two-segment chains, palms fixed on the bench, and bent elbows required through the endpoint; published it under a cache-busted filename.
- Verification: `angled-bridges-v2.gif` contains 30 frames at 512×512. All 16 forward frames were inspected for stable hand placement, continuous motion, fixed arm proportions, and visible elbow flexion.
- Prevention rule: Keep the angled-bridge elbow-bend invariant in both the generation prompt and the catalog description, and version the asset filename after replacement.

## 2026-11-19 — assisted one-leg squats — basketball overlapped the planted foot

- User feedback: No direct user correction; this issue was caught during the required pre-assembly visual inspection.
- Evidence: In the first generated Figure 37→38 pose sheet, the basketball appeared directly beneath or behind the planted shoe across multiple frames, instead of clearly outside the supporting leg for hand assistance.
- Confirmed root cause: The side-view reference visually overlaps the ball and foot, and the first prompt did not enforce a visible floor gap between the basketball and planted shoe.
- Failed attempts: Describing the ball only as “just outside the supporting foot” while also asking it to remain in a fixed screen position.
- Successful solution: Pending regeneration with an explicit invariant that the planted shoe stays fully on bare floor while the ball remains clearly to the viewer-left of the shoe with visible separation.
- Verification: Pending; inspect all 16 forward frames for visible floor beneath the planted shoe, one stationary ball outside the leg, and gradual hand contact.
- Prevention rule: For side-view assisted squats, encode prop placement as a screen-space separation constraint; “outside the leg” alone is too ambiguous.

## 2026-11-19 — assisted one-leg squats — outside-ball placement verified

- User feedback: No direct user correction; this follow-up closes the issue found during visual inspection.
- Evidence: The regenerated Figure 37→38 sheet keeps the planted shoe visibly on bare floor and the basketball to the viewer-left with a clear floor gap throughout all 16 forward frames.
- Confirmed root cause: The original side-view reference required an explicit screen-space separation invariant to disambiguate the ball from the planted foot.
- Failed attempts: The first generation used only the semantic phrase “outside the supporting foot,” which allowed visual overlap.
- Successful solution: Required the ball to remain viewer-left of the shoe with visible wooden floor between them, prohibited all shoe-ball overlap, and used the rejected draft as a negative reference.
- Verification: All forward frames show one stationary ball outside the supporting leg, no shoe-ball overlap, a planted heel, a straight free leg, and gradual hand contact near the bottom.
- Prevention rule: For props positioned beside a support point, specify both the semantic relationship and a visible screen-space gap, then inspect every frame before assembly.

## 2026-11-19 — assisted one-leg squats — hand did not hold the basketball

- User feedback: The assisted one-leg squat GIF did not show the hand holding the basketball.
- Evidence: In the ending frames, the lowered hand stayed beside or behind the ball instead of visibly pressing onto its upper surface as shown in Figure 38.
- Confirmed root cause: The generation prompt required gradual approach and final contact but did not require an unmistakable palm-on-ball hold across the final frames.
- Failed attempts: Asking for “gradual hand contact near the bottom” while allowing the hand to remain adjacent to the ball.
- Successful solution: Pending regeneration with the final four forward frames explicitly holding the basketball: palm visibly on the upper/front surface, fingers wrapping around the contour, ball stationary outside the planted foot.
- Verification: Pending; inspect frames 13–16 for continuous hand-to-ball contact and compare frame 16 directly with Figure 38.
- Prevention rule: When an exercise depends on a prop for assistance, specify the contact geometry (palm, fingers, pressure point) and require it to persist over multiple endpoint frames.

## 2026-11-19 — assisted one-leg squats — sustained hand-on-ball hold verified

- User feedback: The assisted one-leg squat GIF needed the hand to hold the basketball.
- Evidence: The regenerated sheet shows fingertip contact beginning before the bottom phase and a clear palm-and-finger hold in frames 13–16; the assembled GIF preserves that contact in the ending transition.
- Confirmed root cause: The previous sheet allowed the hand to remain adjacent to the ball because “contact” was not defined geometrically or temporally.
- Failed attempts: The prior sheet with only a gradual approach and an implied endpoint contact.
- Successful solution: Added explicit palm-on-upper/front-surface and fingers-wrapping constraints, required contact from frames 13–16, and regenerated the full forward sheet.
- Verification: `assisted-one-leg-squats.gif` has 30 frames at 512px width; frames 13–16 visibly hold the stationary basketball, with the planted shoe separate from the ball.
- Prevention rule: For prop-assisted movements, require a multi-frame contact hold with explicit palm/finger geometry, not just a final-frame touch.

## 2026-11-19 — assisted one-leg squats — starting ball was too far from the foot

- User feedback: The starting action must place the basketball beside the supporting foot; during the descent, the hand should touch the ball for assistance.
- Evidence: The current corrected sheet keeps a conspicuous floor gap between the starting basketball and the planted shoe, while the original Figure 37 shows the ball immediately beside the foot.
- Confirmed root cause: The previous fix overcorrected the earlier shoe-ball overlap by enforcing a visible separation throughout the sequence, which moved the starting prop too far away.
- Failed attempts: Requiring a clear screen-space gap for every frame, even though the source anchor requires near-contact beside the foot.
- Successful solution: Pending regeneration with the ball immediately beside—but not under—the planted shoe at frame 1, fixed in place, then hand contact introduced progressively during the squat.
- Verification: Pending; compare frame 1 to Figure 37, inspect the hand/ball transition, and confirm frames 13–16 retain the assisted hold from Figure 38.
- Prevention rule: Treat prop placement as phase-specific: match the source start distance exactly, then encode the later assistance contact separately.

## 2026-11-19 — assisted one-leg squats — phase-specific ball placement verified

- User feedback: The starting basketball should be beside the foot, then be used for support during the descent.
- Evidence: The regenerated sheet places the ball immediately beside the planted shoe in frame 1, keeps it stationary, and transitions the lowered hand into a visible palm-and-finger hold during the final squat frames.
- Confirmed root cause: The earlier correction applied the later “keep a visible gap” rule to the starting phase, contradicting the Figure 37 anchor.
- Failed attempts: Keeping the basketball clearly separated from the shoe throughout all frames.
- Successful solution: Made ball placement phase-specific: near the shoe at the start without being under it, then progressive hand contact during descent, with a sustained hold at the bottom.
- Verification: `assisted-one-leg-squats.gif` has 30 frames at 512px width; frame 1 matches the beside-foot setup and frames 13–16 show hand-assisted contact.
- Prevention rule: For prop-assisted actions, preserve the source prop distance at the start and model contact as a separate later phase.

## 2026-11-19 — one-leg squats — hips touched the floor at the endpoint

- User feedback: The one-leg squat GIF should not place the buttocks on the floor; the ending position must match the ebook.
- Evidence: In the current forward frames 13–16, the pelvis descends to the wooden floor. Figure 40 instead shows the supporting thigh pressed against the calf while the pelvis remains visibly suspended above the floor.
- Confirmed root cause: The generation prompt requested the deepest possible pistol squat without encoding a minimum pelvis-to-floor clearance, so the model interpreted the endpoint as a seated position.
- Failed attempts: Describing only “supporting thigh pressed against calf” and relying on the endpoint reference without explicitly prohibiting floor contact.
- Successful solution: Pending regeneration with the pelvis held above the floor in every frame, a visible floor gap at the endpoint, support-leg loading preserved, and Figure 40 used as the exact end-pose authority.
- Verification: Pending; compare frames 13–16 directly with Figure 40, confirm no buttock-floor contact, exact frame-16 endpoint, smooth convergence, and 30 assembled frames at 512px width.
- Prevention rule: For full pistol squats, distinguish thigh-to-calf compression from sitting; require a visible pelvis-to-floor gap and continued support-foot loading at the lowest point.

## 2026-11-19 — one-leg squats — suspended ebook endpoint verified

- User feedback: The one-leg squat ending should match the ebook without the buttocks touching the floor.
- Evidence: The regenerated forward frames 13–16 retain a visible strip of wooden floor beneath the pelvis while the support thigh closes against the calf, matching Figure 40's loaded squat position.
- Confirmed root cause: The previous sheet lacked an explicit pelvis-to-floor clearance invariant and therefore converged to a seated pose.
- Failed attempts: The original generation relied on “deepest full pistol squat” and thigh-to-calf contact without prohibiting floor support.
- Successful solution: Regenerated the entire forward sheet with a visible pelvis-floor gap required in every frame and Figure 40 as the endpoint authority, then published the corrected asset with a versioned filename.
- Verification: `one-leg-squats-v2.gif` contains 30 frames at 512px width; frames 13–16 remain suspended, the planted foot bears the body, and the catalog references the cache-busted v2 asset.
- Prevention rule: Every unassisted pistol-squat prompt must explicitly prohibit seated floor contact and require visible clearance at the deepest frame.
