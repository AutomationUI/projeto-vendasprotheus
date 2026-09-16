import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";

export const S6Close: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 110 } });
  const s2 = spring({ frame: f - 18, fps, config: { damping: 200 } });
  const s3 = spring({ frame: f - 34, fps, config: { damping: 200 } });
  const line = spring({ frame: f - 50, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: s }}>
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 24,
            background: `linear-gradient(140deg, ${C.blue}, #1B3FB8)`,
            boxShadow: `0 30px 90px -12px ${C.blue}aa`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${interpolate(s, [0, 1], [0.4, 1])})`,
          }}
        >
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L4.5 13.5H11L10 22L19 10H12.5L13 2Z" fill="white" />
          </svg>
        </div>
        <div style={{ fontFamily: display, fontSize: 68, fontWeight: 700, letterSpacing: -2, color: C.cream }}>
          Vendas <span style={{ fontFamily: body, fontWeight: 300, color: "rgba(245,247,251,0.5)" }}>Protheus</span>
        </div>
      </div>

      <div
        style={{
          fontFamily: display,
          fontSize: 44,
          fontWeight: 600,
          color: C.cream,
          marginTop: 54,
          opacity: s2,
          transform: `translateY(${interpolate(s2, [0, 1], [26, 0])}px)`,
          textAlign: "center",
        }}
      >
        Venda mais. Digite menos.
      </div>
      <div
        style={{
          fontFamily: body,
          fontSize: 26,
          color: C.muted,
          marginTop: 18,
          opacity: s3,
        }}
      >
        Portal comercial integrado ao ERP Protheus · v2.0
      </div>
      <div
        style={{
          marginTop: 52,
          height: 3,
          width: interpolate(line, [0, 1], [0, 420]),
          background: `linear-gradient(90deg, transparent, ${C.blue}, ${C.emerald}, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
