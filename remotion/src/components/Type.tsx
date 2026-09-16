import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";

export const Words: React.FC<{
  text: string;
  size?: number;
  weight?: number;
  delay?: number;
  stagger?: number;
  color?: string;
  accentWords?: number[];
  accentColor?: string;
  lineHeight?: number;
  maxWidth?: number;
  letterSpacing?: number;
}> = ({
  text,
  size = 92,
  weight = 700,
  delay = 0,
  stagger = 3,
  color = C.cream,
  accentWords = [],
  accentColor = C.blueSoft,
  lineHeight = 1.05,
  maxWidth,
  letterSpacing = -2,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: `0 ${size * 0.24}px`,
        maxWidth,
        fontFamily: display,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        letterSpacing,
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: f - delay - i * stagger, fps, config: { damping: 200 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: accentWords.includes(i) ? accentColor : color,
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [42, 0])}px)`,
              filter: `blur(${interpolate(s, [0, 1], [10, 0])}px)`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Kicker: React.FC<{ text: string; delay?: number; color?: string }> = ({
  text,
  delay = 0,
  color = C.blue,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        fontFamily: body,
        fontSize: 20,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: C.cream,
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [-24, 0])}px)`,
      }}
    >
      <span style={{ width: interpolate(s, [0, 1], [0, 44]), height: 3, background: color, borderRadius: 4 }} />
      {text}
    </div>
  );
};

export const Sub: React.FC<{ text: string; delay?: number; size?: number; maxWidth?: number }> = ({
  text,
  delay = 0,
  size = 30,
  maxWidth = 760,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 200 } });
  return (
    <p
      style={{
        fontFamily: body,
        fontSize: size,
        lineHeight: 1.45,
        color: C.muted,
        maxWidth,
        margin: 0,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`,
      }}
    >
      {text}
    </p>
  );
};
