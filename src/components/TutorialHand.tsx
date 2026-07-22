/**
 * First-visit "grab and dial me" cue for the bias slider: a small engraved hand
 * that rocks above the knob, then dismisses with a genie-suck on first interaction.
 * Rendered inside a `position:relative` wrapper around a slider `<input>` so
 * `left: {bias}%` maps onto the track. Purely presentational — HomeApp owns the
 * phase machine and the seen/dismiss logic.
 */
export type TutorialPhase = "swivel" | "resting" | "following" | "leaving" | "gone";

interface TutorialHandProps {
  /** Current bias 0–100; positions the hand over the knob. */
  bias: number;
  phase: TutorialPhase;
  /** Fingertip-to-knob distance in px — 18 inline, 26 floating. Drives `--gap`
   *  so the single `genie` keyframe can serve both controls. */
  gap: number;
}

export default function TutorialHand({ bias, phase, gap }: TutorialHandProps) {
  // Rock through BOTH swivel and resting on the element's own clock. The keyframe
  // is finite/decaying and `forwards` (ends at 0°), so holding it through resting
  // costs no motion — and each hand (inline vs. the later-mounting floating one)
  // runs its own 5s from its own mount, settling independently rather than in
  // lockstep. Stripping the animation at 'resting' would halt both together.
  const swivelAnim =
    phase === "swivel" || phase === "resting" ? "swivel 5s ease-in-out forwards" : undefined;
  // Follow-through: during the 250ms follow the pivot trails the knob with eased
  // lag, reading as momentum. Applied while following and leaving.
  const followTransition =
    phase === "following" || phase === "leaving"
      ? "left .22s cubic-bezier(.2,.7,.2,1)"
      : undefined;
  const genieAnim = phase === "leaving" ? "genie .6s ease-in forwards" : undefined;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: `${bias}%`,
        top: "50%",
        width: 0,
        height: 0,
        transformOrigin: "center",
        pointerEvents: "none",
        zIndex: 8,
        transition: followTransition,
        animation: swivelAnim,
      }}
    >
      <div
        style={
          {
            position: "absolute",
            left: 0,
            top: 0,
            "--gap": `${gap}px`,
            transform: "translate(-50%, calc(-100% - var(--gap)))",
            transformOrigin: "bottom center",
            lineHeight: 0,
            animation: genieAnim,
          } as React.CSSProperties
        }
      >
        <img
          src="/hand-tutorial.png"
          width={32}
          alt=""
          style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.22))" }}
        />
      </div>
    </div>
  );
}
