// visualizer.js — renders self.free as a 2D SVG grid inline in VS Code
({
  id: "MaxRectPacker.free",
  name: "Free Rect Viewer",
  characterize({ expression }) {
    return expression.endsWith(".free");
  },
  render({ value }) {
    const scale = 0.02;
    const rects = value;
    const svgRects = rects.map((r, i) =>
      `<rect x="${r.x*scale}" y="${r.z*scale}" width="${r.w*scale}" height="${r.d*scale}"
             fill="rgba(29,158,117,0.15)" stroke="#1d9e75" stroke-width="1">
        <title>${r.w}×${r.d} at (${r.x},${r.z})</title>
      </rect>`
    ).join("\n");
    return {
      kind: { svg: true },
      text: `<svg viewBox="0 0 ${2352*scale} ${12031*scale}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#111827"/>
        ${svgRects}
      </svg>`
    };
  }
})