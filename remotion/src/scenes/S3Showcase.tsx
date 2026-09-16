import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { Frame } from "../components/Frame";
import { Kicker } from "../components/Type";
import { display, body } from "../fonts";

const Callout: React.FC<{ text: string; delay: number; top: number; left?: number; right?: number }> = ({
  text,
  delay,
  top,
  left,
  right,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 20, stiffness: 160 } });
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        right,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 24px",
        borderRadius: 999,
        background: "rgba(10,16,28,0.82)",
        border: `1px solid rgba(47,107,255,0.45)`,
        boxShadow: "0 24px 60px -20px rgba(0,0,0,0.9)",
        fontFamily: body,
        fontSize: 24,
        color: C.cream,
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [left !== undefined ? -40 : 40, 0])}px)`,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 99, background: C.emerald }} />
      {text}
    </div>
  );
};

export const S3Showcase: React.FC<{
  shot: string;
  title: string;
  kicker: string;
  callouts: { text: string; top: number; left?: number; right?: number }[];
}> = ({ shot, title, kicker, callouts }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f - 4, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 96 }}>
        <Kicker text={kicker} delay={2} />
        <div
          style={{
            fontFamily: display,
            fontSize: 62,
            fontWeight: 700,
            letterSpacing: -2,
            color: C.cream,
            marginTop: 20,
            whiteSpace: "pre-line",
            lineHeight: 1.1,
            opacity: t,
            transform: `translateY(${interpolate(t, [0, 1], [30, 0])}px)`,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ position: "absolute", left: 300, top: 320 }}>
        <Frame shot={shot} width={1500} zoom={[1.02, 1.1]} pan={[0, 0, -20, -60]} delay={8} />
      </div>
      {callouts.map((c, i) => (
        <Callout key={i} {...c} delay={30 + i * 14} />
      ))}
    </AbsoluteFill>
  );
};
