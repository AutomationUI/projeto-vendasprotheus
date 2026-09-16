import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C } from "../theme";
import { Words, Kicker } from "../components/Type";
import { display, body } from "../fonts";

const Logo: React.FC<{ delay: number }> = ({ delay }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: s }}>
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: 20,
          background: `linear-gradient(140deg, ${C.blue}, #1B3FB8)`,
          boxShadow: `0 20px 60px -10px ${C.blue}99`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${interpolate(s, [0, 1], [0.5, 1])}) rotate(${interpolate(s, [0, 1], [-25, 0])}deg)`,
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L4.5 13.5H11L10 22L19 10H12.5L13 2Z" fill="white" />
        </svg>
      </div>
      <div style={{ fontFamily: display, fontSize: 46, fontWeight: 700, letterSpacing: -1, color: C.cream }}>
        Vendas <span style={{ fontFamily: body, fontWeight: 400, color: "rgba(245,247,251,0.5)" }}>Protheus</span>
      </div>
    </div>
  );
};

export const S1Hook: React.FC = () => {
  const f = useCurrentFrame();
  const push = interpolate(f, [0, 130], [1.08, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center" }}>
      <div style={{ paddingLeft: 150, transform: `scale(${push})`, transformOrigin: "left center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
          <Logo delay={0} />
          <Words
            text="O comercial da sua indústria"
            size={78}
            delay={14}
            maxWidth={1250}
          />
          <Words
            text="não deveria depender de planilhas."
            size={78}
            delay={26}
            accentWords={[4]}
            accentColor={C.blueSoft}
            maxWidth={1250}
          />
          <Kicker text="Portal de vendas integrado ao ERP Protheus" delay={62} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
