// Maps a decay_score (0.0 to 1.0) to visual properties
export function decayToVisual(score) {
  const s = Math.max(0, Math.min(1, score));

  // Radius: 8px (faded) to 24px (bright)
  const radius = 8 + (s * 16);

  // Opacity: 0.25 (faded) to 1.0 (bright)
  const opacity = 0.25 + (s * 0.75);

  // Colour: cool grey (#6b7280) -> teal (#2dd4bf) -> amber (#f59e0b)
  let colour;
  if (s < 0.3) {
    // grey to teal
    const t = s / 0.3;
    colour = interpolateColour('#6b7280', '#2dd4bf', t);
  } else if (s < 0.7) {
    // teal to gold
    const t = (s - 0.3) / 0.4;
    colour = interpolateColour('#2dd4bf', '#f59e0b', t);
  } else {
    // gold to warm amber
    const t = (s - 0.7) / 0.3;
    colour = interpolateColour('#f59e0b', '#fbbf24', t);
  }

  return { radius, opacity, colour };
}

function interpolateColour(hex1, hex2, t) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 128, g: 128, b: 128 };
}
