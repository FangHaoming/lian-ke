---
name: ebook-action-gif
description: Generate or revise exercise-action GIFs from ebook descriptions and reference figures, preserving exact start/end poses, joint-angle constraints, smooth motion, and an append-only project experience log.
---

# Ebook Action GIF

Use this skill when an exercise GIF must be created or corrected from an ebook page, especially when the user specifies a joint angle, locked joint, start/end figure, or a movement sequence.

## Automatic experience loop

This project skill learns from user corrections by maintaining [references/experience-log.md](references/experience-log.md).

- At the start of every GIF task, search the experience log for the action name, figure numbers, joint-angle wording, and the reported symptom. Reuse relevant fixes before generating anything.
- When the user points out a problem, treat it as a required learning event. Before the next regeneration, append one structured entry to the log with: symptom, affected action, evidence, confirmed root cause, attempted fixes that failed, successful solution, and verification result.
- Record only confirmed observations. If the cause is still a hypothesis, label it as such and resolve it before promoting it to a general rule.
- After a solution works, add a short prevention rule to the same entry. If the same class of problem occurs twice, promote the prevention rule into the main workflow above; do not leave it only as a historical note.
- Keep the log append-only: correct a factual error by adding a follow-up entry rather than erasing the original failure. Do not record secrets, personal data, or unrelated project issues.

## Non-negotiable workflow

1. Establish the source of truth before generating frames.
   - Locate the ebook action description and every referenced figure number.
   - Map each figure to the actual local page image; do not infer the page from a contact sheet or guessed offsets.
   - Crop each reference figure and visually inspect the crop. A wrong crop containing text or the wrong figure can make the generator invent the end pose.
   - Record the semantic sequence separately from the two anchor poses: e.g. “bent start → lift → extend at top → straight-leg descent”.

2. Translate joint constraints into explicit frame invariants.
   - If the ebook says a knee is 90° or 135°, state whether that is the visible thigh–shin angle and require it in every frame.
   - “Locked” means the joint geometry does not change; only the permitted joint or body segment may move.
   - For a fixed-angle bent-leg movement, treat the thigh-plus-shin shape as a rigid template rotated or translated from the hip. Never allow a model to freely redraw the knee in each frame.
   - Use the ebook reference figure as the visual angle authority. Do not accept “approximately correct” output when the user asks for a fixed angle.

3. Generate only the forward pose sequence.
   - The repository helper `scripts/make-pushup-gif.sh` slices a 4×4 sheet into 16 frames and appends the reverse frames itself.
   - Therefore frame 1 must be the user-confirmed start pose and frame 16 must be the user-confirmed end pose. Never put a return-to-start sequence inside the generated sheet, or the GIF will contain a duplicated/incorrect motion.
   - Keep intermediate poses monotonic and evenly spaced. Do not ask the image model for a complete “up and down” cycle when the assembler already adds the reverse.

4. Inspect before replacing the asset.
   - View the full 4×4 sheet, checking frame 1, frame 16, and the transition around the highest point.
   - For fixed-angle actions, compare the knee silhouette across early, middle, and final frames. If the angle drifts, regenerate or use a deterministic rigid-segment transformation; do not claim the angle is locked merely because the prompt said so.
   - Confirm the generated sheet contains no text, page captions, grid artifacts, duplicated poses, ghost limbs, or abrupt teleportation.
   - Build the GIF with `bash scripts/make-pushup-gif.sh <sheet.png> public/action-guides/<name>.gif` and verify the result has 30 frames at 512px output width.

## Ebook-specific lessons

See [references/failure-lessons.md](references/failure-lessons.md) for the observed failure modes and their fixes. The most important one is to verify the actual figure crop: in the leg-raise work, using a text page as the supposed end reference caused repeated attempts to miss the intended 135° pose.

The chronological record of user feedback and verified solutions lives in [references/experience-log.md](references/experience-log.md). Read the relevant entries before generation and append to it after every correction.

## Project integration

- Add or update the matching entry in `src/lib/action-guide-catalog.js` with the ebook page range, Chinese action name, description, and `action-guides/<name>.gif` path.
- Keep one GIF per action; do not reuse a neighboring action’s GIF just because the start pose looks similar.
- The source viewer’s existing intersection logic selects the guide from the visible page range, clears it outside the range, and selects it again when the user scrolls back. Catalog page ranges must therefore be accurate and non-overlapping enough to identify the intended action.
- Run targeted static checks (`git diff --check`, catalog import, GIF frame count). Do not run a frontend build unless the user explicitly requests one.
- Do not push or publish the changes unless the user explicitly asks.
