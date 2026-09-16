import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { C } from "../theme";

export const Bg: React.FC<{ tint?: string }> = ({ tint = C.blue }) => {
  const f = useCurrentFrame();
  const drift = Math.sin(f / 120) * 60;
  const drift2 = Math.cos(f / 90) * 80;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${C.bg} 0%, ${C.bg2} 55%, ${C.bg} 100%)` }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "70px 70px",
          maskImage: "radial-gradient(ellipse at 50% 45%, black 10%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, black 10%, transparent 72%)",
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          left: -300 + drift,
          top: -600 + drift2 * 0.4,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${tint}55 0%, transparent 62%)`,
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          right: -280 - drift,
          bottom: -520 + drift,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.emerald}33 0%, transparent 62%)`,
          filter: "blur(20px)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: interpolate(f % 240, [0, 120, 240], [0.05, 0.1, 0.05]),
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 4px)",
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};
