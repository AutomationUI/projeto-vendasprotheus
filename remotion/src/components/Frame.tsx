import { Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C } from "../theme";

type Props = {
  shot: string;
  /** [startScale, endScale] */
  zoom?: [number, number];
  /** pan in px [x0,y0]->[x1,y1] */
  pan?: [number, number, number, number];
  width?: number;
  rotate?: number;
  delay?: number;
  style?: React.CSSProperties;
};

export const Frame: React.FC<Props> = ({
  shot,
  zoom = [1.04, 1.12],
  pan = [0, 0, 0, -40],
  width = 1440,
  rotate = 0,
  delay = 0,
  style,
}) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inSpring = spring({ frame: f - delay, fps, config: { damping: 200 } });
  const scale = interpolate(f, [0, durationInFrames], zoom, { extrapolateRight: "clamp" });
  const x = interpolate(f, [0, durationInFrames], [pan[0], pan[2]]);
  const y = interpolate(f, [0, durationInFrames], [pan[1], pan[3]]);
  const rise = interpolate(inSpring, [0, 1], [70, 0]);
  const blur = interpolate(inSpring, [0, 1], [14, 0]);

  return (
    <div
      style={{
        width,
        borderRadius: 16,
        overflow: "hidden",
        background: C.navy,
        border: `1px solid ${C.line}`,
        boxShadow: "0 60px 120px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03)",
        opacity: inSpring,
        transform: `translateY(${rise}px) rotate(${rotate}deg)`,
        filter: `blur(${blur}px)`,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.04)",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 99, background: "#FF5F57" }} />
        <div style={{ width: 10, height: 10, borderRadius: 99, background: "#FEBC2E" }} />
        <div style={{ width: 10, height: 10, borderRadius: 99, background: "#28C840" }} />
        <div
          style={{
            marginLeft: 14,
            fontSize: 13,
            color: "rgba(245,247,251,0.4)",
            fontFamily: "monospace",
          }}
        >
          vendas-protheus.app
        </div>
      </div>
      <div style={{ position: "relative", aspectRatio: "1600 / 900", overflow: "hidden" }}>
        <Img
          src={staticFile(`shots/${shot}.png`)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            transform: `scale(${scale}) translate(${x}px, ${y}px)`,
          }}
        />
      </div>
    </div>
  );
};
