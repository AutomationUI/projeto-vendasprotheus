import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { Frame } from "../components/Frame";
import { display, body } from "../fonts";

const Bullet: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        fontFamily: body,
        fontSize: 27,
        color: "rgba(245,247,251,0.78)",
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [-26, 0])}px)`,
      }}
    >
      <span
        style={{
          marginTop: 10,
          width: 9,
          height: 9,
          borderRadius: 99,
          background: C.emerald,
          boxShadow: `0 0 16px ${C.emerald}`,
          flexShrink: 0,
        }}
      />
      {text}
    </div>
  );
};

export const S4Split: React.FC<{
  shot: string;
  title: string;
  bullets: string[];
  side?: "left" | "right";
  accent?: string;
}> = ({ shot, title, bullets, side = "right", accent = C.blue }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f, fps, config: { damping: 200 } });
  const textCol = (
    <div style={{ width: 620, display: "flex", flexDirection: "column", gap: 26 }}>
      <div
        style={{
          fontFamily: display,
          fontSize: 58,
          fontWeight: 700,
          letterSpacing: -2,
          lineHeight: 1.08,
          whiteSpace: "pre-line",
          color: C.cream,
          opacity: t,
          transform: `translateY(${interpolate(t, [0, 1], [34, 0])}px)`,
        }}
      >
        {title}
      </div>
      <div style={{ height: 4, width: interpolate(t, [0, 1], [0, 90]), background: accent, borderRadius: 4 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>
        {bullets.map((b, i) => (
          <Bullet key={i} text={b} delay={12 + i * 8} />
        ))}
      </div>
    </div>
  );

  const shotCol = (
    <div style={{ marginTop: 30 }}>
      <Frame
        shot={shot}
        width={1180}
        zoom={[1.05, 1.14]}
        pan={[0, 0, side === "right" ? -40 : 40, -50]}
        rotate={side === "right" ? -1.2 : 1.2}
        delay={6}
      />
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 90,
        padding: side === "right" ? "0 0 0 130px" : "0 130px 0 0",
        justifyContent: "space-between",
      }}
    >
      {side === "right" ? (
        <>
          {textCol}
          <div style={{ marginRight: -220 }}>{shotCol}</div>
        </>
      ) : (
        <>
          <div style={{ marginLeft: -220 }}>{shotCol}</div>
          {textCol}
        </>
      )}
    </AbsoluteFill>
  );
};
