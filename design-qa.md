# Design QA — motion revision

## Comparison target

- Source visual truth: `/var/folders/2t/p7wv0nhn1zl5qfwk2l9lhx7r0000gn/T/codex-clipboard-e10a8214-a2d3-466d-86d2-e23150276b25.png`
- Implementation: `previews/static/kettlebell-bot-rive-512.png`
- Combined full-view evidence: `previews/comparisons/reference-vs-rive-neutral-normalized.png`
- Source pixels: 298 × 318 at 1× density
- Implementation pixels: 512 × 512 at 1× density
- Normalized review canvas: 298 × 318 for each side; the implementation was centered at 275 × 275 so the visible character height matches the source crop
- State: neutral / first frame of `01_idle`

## Findings

No actionable P0, P1, or P2 mismatch remains.

- Fonts and typography: not applicable; neither source nor implementation contains text.
- Spacing and layout rhythm: the normalized comparison preserves the source's centered, compact silhouette and balanced interior handle gap. The implementation keeps slightly cleaner symmetry and intentionally removes the source raster's soft fringe.
- Colors and visual tokens: the charcoal body and off-white eyes match the source's high-contrast two-color treatment. The asset remains transparent and uses no background color.
- Image quality and asset fidelity: the implementation is native Bézier vector artwork with crisp edges, no embedded raster, compression, transparency halo, or masking artifact.
- Copy and content: not applicable; the character has no text.
- Interaction and motion: the semantic states remain distinct. Thinking and working use eye parallax and near/far-eye scaling; waiting and blocked reduce energy; acknowledge and done have readable anticipation and settle. The handle/body silhouette remains connected throughout.

## Focused evidence

- Motion filmstrips: `previews/comparisons/motion-v3-thinking-filmstrip.png`, `motion-v3-working-filmstrip.png`, `motion-v3-waiting-filmstrip.png`, `motion-v3-blocked-filmstrip.png`, and `motion-v3-done-filmstrip.png`
- Small-size states: `previews/states/thinking-turn-left-32.png`, `thinking-turn-right-32.png`, `working-turn-right-32.png`, and `working-turn-left-32.png`
- No additional crop was needed: the only focal details are the handle/body relationship and two eyes, and both remain legible in the full-view and 32 px evidence.

## Comparison history

1. Initial motion critique found that the new depth treatment was readable but several eye/handle width changes lacked companion height changes. Companion scale tracks were added to preserve volume and reduce one-axis deformation.
2. The second motion critique confirmed the revised form turns remained coherent and loop-safe. The neutral full-view comparison initially looked oversized because the 512 × 512 implementation and 298 × 318 source used different subject-to-canvas ratios; the comparison was normalized before judgment.
3. Post-normalization comparison shows no material silhouette, alignment, palette, or small-size fidelity regression. Runtime lint reports 0 errors and 0 warnings.

## Follow-up polish

- P3: current Rive lint includes five informational one-axis scale heuristics on internal transform objects. These are intentional perspective cues, have companion motion elsewhere in the hierarchy, and are not visible defects.

## Implementation checklist

- [x] Preserve the original neutral silhouette and two-color palette
- [x] Add independent gaze, eyelid, and near/far-eye acting
- [x] Add coordinated body compression and handle follow-through
- [x] Verify seamless persistent loops and one-shot returns
- [x] Verify the semantic state machine and 24–32 px legibility
- [x] Run two post-revision motion critique passes

final result: passed
