import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { Words } from "../components/Type";
import { display, body } from "../fonts";

const items = [
  { t: "Aprovações", d: "Alçadas por valor e desconto, com trilha de auditoria." },
  { t: "Integração ERP", d: "Sincronismo bidirecional com o Protheus." },
  { t: "Produção", d: "Acompanhamento de lotes em tempo real." },
  { t: "Representantes", d: "Carteira, metas e comissões por região." },
  { t: "Relatórios", d: "Dashboards analíticos e exportação em PDF." },
  { t: "Segurança", d: "Perfis, permissões granulares e 2FA." },
];

const Card: React.FC<{ t: string; d: string; delay: number; i: number }> = ({ t, d, delay, i }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 22, stiffness: 130 } });
  return (
    <div
      style={{
        padding: "34px 32px",
        borderRadius: 18,
        background: "rgba(255,255,255,0.035)",
        border: `1px solid ${C.line}`,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [46, 0])}px) scale(${interpolate(s, [0, 1], [0.96, 1])})`,
      }}
    >
      <div
        style={{
          fontFamily: body,
          fontSize: 15,
          letterSpacing: 3,
          color: i % 2 ? C.emerald : C.blueSoft,
          marginBottom: 14,
        }}
      >
        0{i + 1}
      </div>
      <div style={{ fontFamily: display, fontSize: 32, fontWeight: 700, color: C.cream, letterSpacing: -1 }}>{t}</div>
      <div style={{ fontFamily: body, fontSize: 21, color: C.muted, marginTop: 10, lineHeight: 1.4 }}>{d}</div>
    </div>
  );
};

export const S5Grid: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", padding: "0 130px" }}>
    <Words text="Tudo o que a operação comercial precisa." size={56} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 60 }}>
      {items.map((it, i) => (
        <Card key={i} {...it} i={i} delay={14 + i * 6} />
      ))}
    </div>
  </AbsoluteFill>
);
