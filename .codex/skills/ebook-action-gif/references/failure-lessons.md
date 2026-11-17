# Ebook GIF failure lessons

## Reference crop errors

The ebook pages do not always place the action heading, description, and figures on the same local page. Page numbering must be checked against the actual rendered page image. A crop that contains prose instead of the target figure is especially dangerous: an image model may still produce a plausible pose sheet, but the end pose and joint angle will be invented.

Before generation, inspect each crop as an image and label it with the figure number. For the hanging bent-leg raise, the correct pair is Figure 74 as the low start and Figure 75 as the pelvis-height end; a text-page crop was previously mistaken for the end reference.

## Fixed-angle actions

Prompts such as “keep 135°” are not sufficient by themselves. Image generation may change the knee angle between frames, particularly when the hip position changes. Use all of the following:

- describe the angle as an open obtuse thigh–shin angle and show the exact reference;
- say that the bent leg is a rigid two-segment template;
- prohibit the 90° L shape, straightening, and heel-to-hip tucking;
- inspect the contact sheet at several frames, not only the first and last;
- if the angle still drifts, prefer a deterministic geometric transformation or regenerate rather than accepting the result.

## Forward-only sheet versus GIF playback

The local GIF helper already generates frames 0–15 and then frames 14–1 in reverse. A pose sheet must contain only the forward transition. A sheet that contains start → peak → start will be played back as start → peak → start → peak → start, producing a visibly wrong or duplicated action.

## Sequence fidelity

The ebook description can contain a phase change that is not represented by the two obvious anchor images. For example, frog raises require bent-knee lifting, extension at the top, and a straight-leg descent close to the floor. Encode those phases in the prompt and inspect the middle and descent frames; do not interpolate only between two still images.

## Validation checklist

1. Confirm frame 1 and frame 16 match the user-confirmed ebook figures.
2. Confirm the motion is monotonic in the forward sheet.
3. Confirm fixed joint angles remain visually constant across early, middle, and final frames.
4. Confirm no text, captions, grids, ghost limbs, or sudden jumps.
5. Confirm the assembled GIF has 30 frames and the expected output dimensions.
6. Confirm the catalog action, page range, and asset path agree.
