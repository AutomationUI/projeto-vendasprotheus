import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { Bg } from "./components/Bg";
import { S1Hook } from "./scenes/S1Hook";
import { S2Stats } from "./scenes/S2Stats";
import { S3Showcase } from "./scenes/S3Showcase";
import { S4Split } from "./scenes/S4Split";
import { S5Grid } from "./scenes/S5Grid";
import { S6Close } from "./scenes/S6Close";
import { C } from "./theme";

const T = 22;

export const MainVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <Bg />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={130}>
        <S1Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-bottom" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />

      <TransitionSeries.Sequence durationInFrames={110}>
        <S2Stats />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />

      <TransitionSeries.Sequence durationInFrames={150}>
        <S3Showcase
          shot="dashboard"
          kicker="Dashboard executivo"
          title={"Sua meta, sua carteira e seu\nfaturamento na primeira tela."}
          callouts={[
            { text: "KPIs em tempo real", top: 250, right: 120 },
            { text: "Evolução de vendas com forecasting I.A.", top: 640, right: 120 },
            { text: "Ranking por região e categoria", top: 830, right: 120 },
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 16 })}
      />

      <TransitionSeries.Sequence durationInFrames={140}>
        <S4Split
          shot="pedidos"
          title={"Pedidos digitados uma vez.\nGravados direto no ERP."}
          bullets={[
            "Catálogo com preço, estoque e tabela vigente",
            "Status, filtros e busca instantânea",
            "Envio automático ao Protheus, sem retrabalho",
          ]}
          side="right"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />

      <TransitionSeries.Sequence durationInFrames={140}>
        <S4Split
          shot="orcamentos"
          title={"Do orçamento ao pedido\nem um clique."}
          bullets={[
            "Layouts de proposta prontos para o cliente",
            "Envio por e-mail e WhatsApp com rastreio",
            "Aprovação digital pelo próprio cliente",
          ]}
          side="left"
          accent={C.emerald}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />

      <TransitionSeries.Sequence durationInFrames={140}>
        <S3Showcase
          shot="producao"
          kicker="Chão de fábrica conectado"
          title={"O comercial enxerga a produção\nem tempo real."}
          callouts={[
            { text: "Lotes e OPs atualizados via WebSocket", top: 250, right: 120 },
            { text: "Prazos confiáveis para o cliente", top: 700, right: 120 },
          ]}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 16 })}
      />

      <TransitionSeries.Sequence durationInFrames={140}>
        <S5Grid />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-bottom" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />

      <TransitionSeries.Sequence durationInFrames={130}>
        <S6Close />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
