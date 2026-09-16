import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { Words } from "../components/Type";
import { display, body } from "../fonts";

const stats = [
  { v: 70, suf: "%", label: "menos tempo digitando pedido" },
  { v: 100, suf: "%", label: "sincronizado com o Protheus" },
  { v: 24, suf: "/7", label: "pedidos e orçamentos no campo" },
];

const Stat: React.FC<{ v: number; suf: string; label: string; delay: number }> = ({ v, suf, label, delay }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 18, stiffness: 90 } });
  const count = Math.round(interpolate(s, [0, 1], [0, v]));
  return (
    <div
      style={{
        flex: 1,
        padding: "40px 38px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.035)",
        border: `1px solid ${C.line}`,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`,
      }}
    >
      <div style={{ fontFamily: display, fontSize: 96, fontWeight: 800, letterSpacing: -4, color: C.cream }}>
        {count}
        <span style={{ color: C.emerald }}>{suf}</span>
      </div>
      <div style={{ fontFamily: body, fontSize: 22, color: C.muted, marginTop: 10, lineHeight: 1.35 }}>{label}</div>
    </div>
  );
};

export const S2Stats: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", padding: "0 150px" }}>
    <Words text="Um único portal. Do lead ao faturamento." size={62} accentWords={[2, 3, 4, 5]} accentColor={C.cream} />
    <div style={{ display: "flex", gap: 28, marginTop: 70 }}>
      {stats.map((s, i) => (
        <Stat key={i} {...s} delay={16 + i * 9} />
      ))}
    </div>
  </AbsoluteFill>
);
