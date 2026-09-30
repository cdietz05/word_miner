// The critters' pictures, as SVG. Every critter belongs to an evolution
// line, and the drawing follows it: a baby is round, stubby and big-eyed; the
// middle form is sleeker, with sharper eyes; the final form is big, armoured
// and fierce. The bodies vary the way a creature collection should - round
// babies, four-legged beasts (fox, cat, lion, stag, armadillo), swimmers, a
// sea serpent, a bat, dragons, birds and a rock golem - and each is dressed
// in its type's colours and gear: flames, fins, crystals, leaves, lightning,
// ice, shadow, feathers.
//
// Every creature is drawn on a 200 x 200 grid, facing left, standing on the
// ground at y = 180. A body is drawn in two passes - every part's outline as
// one thick dark stroke, then the fills on top - so its parts merge into a
// single clean silhouette instead of each carrying its own seam.
//
// Pure: returns SVG markup, so the tests can check it without a browser.

const INK = '#141019';
const CLAW = '#f3ead6';
const OUTLINE = 8;

// Each type's colours: body, light, dark, belly, a glowing accent, the gear.
export const PALETTES = {
  grass: { body: '#3f9e4c', light: '#7fd477', dark: '#1d5a2a', belly: '#d6ecaa', glow: '#c8ff5a', gear: '#2b7a3a', gear2: '#a8e063' },
  fire: { body: '#e0512c', light: '#ff8a4f', dark: '#7f1f12', belly: '#ffd09a', glow: '#ffd23f', gear: '#ff8a1f', gear2: '#ffd23f' },
  water: { body: '#2a7fd4', light: '#62b4ff', dark: '#123a74', belly: '#c6e9ff', glow: '#5ff2e0', gear: '#1fbac4', gear2: '#9ef6ff' },
  stone: { body: '#7a7064', light: '#aba192', dark: '#3a3530', belly: '#d6ccbc', glow: '#6fe3ff', gear: '#56c8e0', gear2: '#b8f2ff' },
  spark: { body: '#f2c01a', light: '#ffe262', dark: '#8f6604', belly: '#fff2b8', glow: '#ffffff', gear: '#2c2c3c', gear2: '#fff27a' },
  frost: { body: '#58a8d8', light: '#a0dcf6', dark: '#1f5378', belly: '#eefaff', glow: '#e8fcff', gear: '#c8f0ff', gear2: '#ffffff' },
  shadow: { body: '#553a98', light: '#8460cc', dark: '#22154a', belly: '#b09ae4', glow: '#ff4f9a', gear: '#2e1f5c', gear2: '#ff8ac0' },
  sky: { body: '#e6edf8', light: '#ffffff', dark: '#93a8cc', belly: '#ffffff', glow: '#ffc93f', gear: '#7fbcff', gear2: '#ffe27a' },
};

function r1(n)
{
  return Math.round(n * 10) / 10;
}

function pts(points)
{
  return points.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L ');
}

export function poly(points)
{
  return `M ${pts(points)} Z`;
}

// A smooth curve through [points] (Catmull-Rom, as cubic Beziers).
export function smoothPath(points, closed = true)
{
  const n = points.length;
  let d = `M ${r1(points[0][0])} ${r1(points[0][1])}`;
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++)
  {
    const p0 = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[closed ? (i + 1) % n : i + 1];
    const p3 = points[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${r1(c1[0])} ${r1(c1[1])}, ${r1(c2[0])} ${r1(c2[1])}, ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return closed ? `${d} Z` : d;
}

function ellipse(cx, cy, rx, ry)
{
  return `M ${r1(cx - rx)} ${r1(cy)} A ${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx + rx)} ${r1(cy)} A ${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx - rx)} ${r1(cy)} Z`;
}

// Mirrors points across x = [cx].
function mirror(points, cx = 100)
{
  return points.map(([x, y]) => [2 * cx - x, y]);
}

function translate(points, dx, dy)
{
  return points.map(([x, y]) => [x + dx, y + dy]);
}

// --- a drawing, built up in layers --------------------------------------------

class Drawing
{
  constructor(palette, uid, silhouette)
  {
    this.p = palette;
    this.uid = uid;
    this.silhouette = silhouette;
    this.layers = [];
    this.skin = silhouette ? '#1b1d29' : `url(#body-${uid})`;
  }

  fill(color)
  {
    return this.silhouette ? '#1b1d29' : color;
  }

  // Shapes merged under one outline, drawn in order.
  body(shapes)
  {
    this.layers.push({ kind: 'body', shapes });
  }

  // A part with its own outline.
  part(d, color, width = OUTLINE - 3)
  {
    this.layers.push({ kind: 'part', d, color, width });
  }

  // Detail with no outline of its own: markings, eyes, teeth. Skipped for a
  // silhouette.
  detail(markup)
  {
    if (!this.silhouette)
    {
      this.layers.push({ kind: 'detail', markup });
    }
  }

  render()
  {
    return this.layers.map((layer) =>
    {
      if (layer.kind === 'body')
      {
        const outlines = layer.shapes.map((shape) => `<path d="${shape.d}" fill="none" stroke="${INK}" stroke-width="${OUTLINE}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
        const fills = layer.shapes.map((shape) => `<path d="${shape.d}" fill="${shape.color === 'skin' ? this.skin : this.fill(shape.color)}"/>`).join('');
        return outlines + fills;
      }
      if (layer.kind === 'part')
      {
        const color = layer.color === 'skin' ? this.skin : this.fill(layer.color);
        return `<path d="${layer.d}" fill="${color}" stroke="${INK}" stroke-width="${layer.width}" stroke-linejoin="round" stroke-linecap="round"/>`;
      }
      return layer.markup;
    }).join('');
  }
}

// --- faces ----------------------------------------------------------------------

// A baby's face, front on: big round eyes with two shines, rosy cheeks, a
// smile.
function cuteFace(draw, cx, eyeY, spread, mouth = 'smile')
{
  const p = draw.p;
  const parts = [];
  for (const side of [-1, 1])
  {
    const x = cx + side * spread;
    parts.push(`<ellipse cx="${r1(x)}" cy="${r1(eyeY)}" rx="9.5" ry="11" fill="${INK}"/>`);
    parts.push(`<circle cx="${r1(x + 3)}" cy="${r1(eyeY - 4)}" r="3.8" fill="#ffffff"/>`);
    parts.push(`<circle cx="${r1(x - 3)}" cy="${r1(eyeY + 4)}" r="1.8" fill="#ffffff" opacity="0.85"/>`);
    parts.push(`<ellipse cx="${r1(x + side * 12)}" cy="${r1(eyeY + 15)}" rx="7.5" ry="4.5" fill="#ff7a8a" opacity="0.5"/>`);
  }
  const my = eyeY + 16;
  if (mouth === 'open')
  {
    parts.push(`<path d="M ${cx - 8} ${r1(my - 1)} Q ${cx} ${r1(my + 13)} ${cx + 8} ${r1(my - 1)} Z" fill="#5a1f2a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`);
    parts.push(`<ellipse cx="${cx}" cy="${r1(my + 6)}" rx="4" ry="2.6" fill="#ff8fa3"/>`);
  }
  else
  {
    parts.push(`<path d="M ${cx - 7} ${r1(my)} Q ${cx - 3.5} ${r1(my + 5)} ${cx} ${r1(my)} Q ${cx + 3.5} ${r1(my + 5)} ${cx + 7} ${r1(my)}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  draw.detail(parts.join(''));
  void p;
}

// A side-on eye looking left, with a glowing iris and a slit pupil. [mood]
// 0 is bright and open (a middle form), 1 narrowed under a hard brow (a
// final form).
function sideEye(draw, x, y, mood = 1, size = 1)
{
  const p = draw.p;
  const s = size;
  const front = x - 7 * s;
  const back = x + 10 * s;
  const top = mood ? y - 7 * s : y - 10 * s;
  const shape = `M ${r1(front)} ${r1(y + 2 * s)} Q ${r1(x)} ${r1(top)} ${r1(back)} ${r1(y - 4 * s)} Q ${r1(x + 1)} ${r1(y + 7 * s)} ${r1(front)} ${r1(y + 2 * s)} Z`;
  const clip = `eye-${draw.uid}-${Math.round(x)}-${Math.round(y)}`;
  draw.detail(`<clipPath id="${clip}"><path d="${shape}"/></clipPath>
    <path d="${shape}" fill="#fffdf2"/>
    <g clip-path="url(#${clip})">
      <circle cx="${r1(x)}" cy="${r1(y - 0.5)}" r="${r1(5.4 * s)}" fill="${p.glow}"/>
      <ellipse cx="${r1(x)}" cy="${r1(y - 0.5)}" rx="${r1(1.5 * s)}" ry="${r1(4.8 * s)}" fill="${INK}"/>
      <circle cx="${r1(x - 2)}" cy="${r1(y - 2.5 * s)}" r="${r1(1.5 * s)}" fill="#ffffff"/>
    </g>
    <path d="${shape}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    ${mood ? `<path d="M ${r1(front - 2)} ${r1(y - 3 * s)} L ${r1(back + 1)} ${r1(y - 11 * s)}" stroke="${INK}" stroke-width="${r1(4 * s)}" stroke-linecap="round"/>` : ''}`);
}

// A front-on fierce face: narrowed glowing eyes, a frown, fangs.
function fierceFrontFace(draw, cx, eyeY, spread)
{
  const p = draw.p;
  const parts = [];
  for (const side of [-1, 1])
  {
    const inner = [cx + side * spread * 0.35, eyeY + 2];
    const outer = [cx + side * spread * 1.3, eyeY - 5];
    const mid = (inner[0] + outer[0]) / 2;
    const shape = `M ${r1(inner[0])} ${r1(inner[1])} Q ${r1(mid)} ${r1(eyeY - 10)} ${r1(outer[0])} ${r1(outer[1])} Q ${r1(mid)} ${r1(eyeY + 7)} ${r1(inner[0])} ${r1(inner[1])} Z`;
    parts.push(`<path d="${shape}" fill="${p.glow}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`);
    parts.push(`<ellipse cx="${r1(mid)}" cy="${r1(eyeY - 1)}" rx="1.6" ry="4.2" fill="${INK}"/>`);
    parts.push(`<path d="M ${r1(inner[0] - side * 2)} ${r1(eyeY - 5)} L ${r1(outer[0] + side * 2)} ${r1(eyeY - 13)}" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`);
  }
  const my = eyeY + 16;
  parts.push(`<path d="M ${cx - 11} ${r1(my)} L ${cx + 11} ${r1(my)}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
  for (const side of [-1, 1])
  {
    parts.push(`<path d="M ${r1(cx + side * 8)} ${r1(my)} L ${r1(cx + side * 5.5)} ${r1(my + 7)} L ${r1(cx + side * 3)} ${r1(my)} Z" fill="#ffffff" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`);
  }
  draw.detail(parts.join(''));
}

function claws(draw, x, y, count = 3)
{
  const spread = count === 3 ? [-5, 0, 5] : [-3, 3];
  draw.detail(spread.map((dx) => `<path d="M ${r1(x + dx - 2.4)} ${r1(y - 3)} L ${r1(x + dx - 3.5)} ${r1(y + 4)} L ${r1(x + dx + 1.8)} ${r1(y - 2)} Z" fill="${CLAW}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`).join(''));
}

function fang(draw, x, y, size = 1)
{
  draw.detail(`<path d="M ${r1(x - 3 * size)} ${r1(y)} L ${r1(x)} ${r1(y + 8 * size)} L ${r1(x + 3 * size)} ${r1(y)} Z" fill="#ffffff" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`);
}

// Glowing chevrons on a flank, the mark of a middle or final form.
function stripes(draw, points, width = 3.5)
{
  const p = draw.p;
  draw.detail(points.map(([x, y, h = 24]) => `<path d="M ${x} ${y} L ${x - 8} ${y + h / 2} L ${x - 2} ${y + h}" fill="none" stroke="${p.glow}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-${draw.uid})"/>`).join(''));
}

// --- type gear --------------------------------------------------------------------

// A row of the type's spikes along a back, head end first.
function spines(draw, type, points, scale = 1)
{
  const p = draw.p;
  points.forEach(([x, y], i) =>
  {
    const s = scale * (i === 0 || i === points.length - 1 ? 0.8 : 1.1);
    switch (type)
    {
      case 'fire':
        draw.part(poly([[x - 8, y + 3], [x - 3, y - 22 * s], [x + 1, y - 9], [x + 6, y - 18 * s], [x + 9, y + 3]]), i % 2 ? p.gear2 : p.gear);
        break;
      case 'frost':
        draw.part(poly([[x - 6, y + 3], [x + 3, y - 26 * s], [x + 7, y + 3]]), p.gear);
        break;
      case 'stone':
        draw.part(poly([[x - 8, y + 3], [x - 5, y - 15 * s], [x + 2, y - 22 * s], [x + 8, y + 3]]), p.gear);
        break;
      case 'spark':
        draw.part(poly([[x - 5, y + 3], [x + 2, y - 11 * s], [x - 2, y - 11 * s], [x + 7, y - 26 * s], [x + 4, y - 13 * s], [x + 9, y - 13 * s], [x + 4, y + 3]]), p.gear2);
        break;
      case 'grass':
        draw.part(`M ${r1(x - 7)} ${r1(y + 3)} Q ${r1(x - 7)} ${r1(y - 18 * s)} ${r1(x + 11)} ${r1(y - 24 * s)} Q ${r1(x + 7)} ${r1(y - 9)} ${r1(x + 8)} ${r1(y + 3)} Z`, i % 2 ? p.gear2 : p.gear);
        break;
      case 'shadow':
        draw.part(poly([[x - 5, y + 3], [x + 4, y - 20 * s], [x + 6, y + 3]]), p.gear);
        break;
      case 'sky':
        draw.part(`M ${r1(x - 7)} ${r1(y + 3)} Q ${r1(x + 2)} ${r1(y - 22 * s)} ${r1(x + 20)} ${r1(y - 18 * s)} Q ${r1(x + 9)} ${r1(y - 7)} ${r1(x + 9)} ${r1(y + 3)} Z`, i % 2 ? p.gear : p.light);
        break;
      default:
        break;
    }
  });
}

// A single bold feature at [x, y] - a tail tip, a crest.
function tip(draw, type, x, y, scale = 1)
{
  const p = draw.p;
  const s = scale;
  switch (type)
  {
    case 'fire':
      draw.part(poly([[x - 10 * s, y + 12 * s], [x - 13 * s, y - 6 * s], [x - 4 * s, y + 2 * s], [x, y - 24 * s], [x + 6 * s, y - 2 * s], [x + 13 * s, y - 13 * s], [x + 11 * s, y + 11 * s]]), p.gear);
      draw.part(poly([[x - 5 * s, y + 10 * s], [x - 1 * s, y - 8 * s], [x + 5 * s, y + 10 * s]]), p.gear2, 0);
      break;
    case 'water':
      draw.part(poly([[x - 6 * s, y + 8 * s], [x - 16 * s, y - 14 * s], [x + 2 * s, y - 2 * s], [x + 16 * s, y - 16 * s], [x + 6 * s, y + 10 * s]]), p.gear);
      break;
    case 'grass':
      draw.part(`M ${r1(x - 7 * s)} ${r1(y + 8 * s)} Q ${r1(x - 15 * s)} ${r1(y - 14 * s)} ${r1(x + 7 * s)} ${r1(y - 28 * s)} Q ${r1(x + 13 * s)} ${r1(y - 6 * s)} ${r1(x + 7 * s)} ${r1(y + 8 * s)} Z`, p.gear);
      break;
    case 'stone':
      draw.part(poly([[x - 11 * s, y + 8 * s], [x - 8 * s, y - 10 * s], [x + 2 * s, y - 20 * s], [x + 13 * s, y - 6 * s], [x + 9 * s, y + 10 * s]]), p.gear);
      break;
    case 'spark':
      draw.part(poly([[x - 6 * s, y + 8 * s], [x + 4 * s, y - 6 * s], [x - 3 * s, y - 6 * s], [x + 10 * s, y - 28 * s], [x + 8 * s, y - 10 * s], [x + 14 * s, y - 10 * s], [x + 2 * s, y + 10 * s]]), p.gear2);
      break;
    case 'frost':
      draw.part(poly([[x - 7 * s, y + 8 * s], [x + 2 * s, y - 28 * s], [x + 8 * s, y + 8 * s]]), p.gear);
      break;
    case 'shadow':
      draw.part(`M ${r1(x)} ${r1(y - 20 * s)} Q ${r1(x + 16 * s)} ${r1(y - 4 * s)} ${r1(x + 4 * s)} ${r1(y + 8 * s)} L ${r1(x)} ${r1(y + 4 * s)} L ${r1(x - 4 * s)} ${r1(y + 8 * s)} Q ${r1(x - 16 * s)} ${r1(y - 4 * s)} ${r1(x)} ${r1(y - 20 * s)} Z`, p.glow);
      break;
    case 'sky':
      draw.part(`M ${r1(x - 6 * s)} ${r1(y + 8 * s)} Q ${r1(x - 4 * s)} ${r1(y - 20 * s)} ${r1(x + 20 * s)} ${r1(y - 26 * s)} Q ${r1(x + 8 * s)} ${r1(y - 4 * s)} ${r1(x + 6 * s)} ${r1(y + 10 * s)} Z`, p.gear);
      break;
    default:
      break;
  }
}

// --- the babies: round, stubby, big-eyed ------------------------------------------

function baby(draw, type)
{
  const p = draw.p;
  const cx = 100;
  const cy = 128;
  const shapes = [];
  let bodyD;

  if (type === 'shadow')
  {
    // A little ghost: round on top, trailing off into wisps.
    bodyD = smoothPath([[100, 78], [140, 96], [148, 130], [140, 162], [128, 176], [118, 164], [106, 180], [94, 166], [82, 178], [70, 164], [58, 148], [54, 118], [62, 94]]);
  }
  else if (type === 'sky')
  {
    // A cloud puff.
    const bumps = [];
    for (let i = 0; i < 14; i++)
    {
      const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? 48 : 42;
      bumps.push([cx + Math.cos(a) * rr * 1.05, cy + Math.sin(a) * rr * 0.9]);
    }
    bodyD = smoothPath(bumps);
  }
  else if (type === 'stone')
  {
    // A rounded rock with facets.
    bodyD = smoothPath([[100, 84], [132, 90], [148, 116], [146, 150], [124, 168], [80, 168], [56, 150], [54, 116], [70, 92]]);
  }
  else
  {
    bodyD = smoothPath([[100, 82], [134, 90], [148, 122], [140, 156], [118, 170], [82, 170], [60, 156], [52, 122], [66, 90]]);
  }

  // Ears, for the ones that have them.
  if (type === 'fire')
  {
    for (const side of [-1, 1])
    {
      shapes.push({ d: poly([[cx + side * 18, 94], [cx + side * 40, 58], [cx + side * 44, 102]]), color: p.body });
    }
  }
  else if (type === 'spark')
  {
    for (const side of [-1, 1])
    {
      shapes.push({ d: ellipse(cx + side * 34, 90, 15, 15), color: p.body });
    }
  }
  else if (type === 'frost')
  {
    // Little flippers.
    for (const side of [-1, 1])
    {
      shapes.push({ d: smoothPath([[cx + side * 44, 118], [cx + side * 60, 140], [cx + side * 50, 148], [cx + side * 40, 134]]), color: p.dark });
    }
  }
  // Feet.
  if (type !== 'shadow')
  {
    for (const side of [-1, 1])
    {
      shapes.push({ d: ellipse(cx + side * 20, 172, 14, 9), color: p.dark });
    }
  }
  shapes.push({ d: bodyD, color: 'skin' });
  draw.body(shapes);

  // Belly.
  if (type !== 'sky' && type !== 'shadow')
  {
    draw.detail(`<ellipse cx="${cx}" cy="148" rx="30" ry="20" fill="${p.belly}" opacity="0.85"/>`);
  }
  if (type === 'spark')
  {
    draw.detail(`<circle cx="66" cy="90" r="7" fill="${p.dark}"/><circle cx="134" cy="90" r="7" fill="${p.dark}"/>`);
  }
  if (type === 'fire')
  {
    draw.detail(`<path d="${poly([[80, 92], [64, 70], [74, 98]])}" fill="${p.belly}"/><path d="${poly([[120, 92], [136, 70], [126, 98]])}" fill="${p.belly}"/>`);
  }

  // The type's feature on top.
  switch (type)
  {
    case 'grass':
      draw.part(`M 100 84 Q 98 70 100 64`, 'none', 4);
      draw.part(`M 100 66 Q 76 44 66 64 Q 84 74 100 66 Z`, p.gear);
      draw.part(`M 100 66 Q 124 44 134 64 Q 116 74 100 66 Z`, p.gear2);
      break;
    case 'fire':
      draw.part(poly([[86, 86], [84, 64], [94, 74], [100, 50], [106, 72], [116, 62], [114, 86]]), p.gear);
      draw.part(poly([[94, 86], [98, 68], [104, 86]]), p.gear2, 0);
      break;
    case 'water':
      draw.part(`M 88 86 Q 90 56 120 52 Q 106 70 112 86 Z`, p.gear);
      tip(draw, 'water', 150, 150, 0.8);
      break;
    case 'stone':
      draw.part(poly([[92, 88], [96, 64], [102, 56], [108, 70], [110, 88]]), p.gear);
      break;
    case 'spark':
      draw.part(poly([[78, 84], [72, 66], [78, 66], [70, 46], [84, 64], [78, 64], [86, 82]]), p.gear2);
      draw.part(poly([[122, 84], [128, 66], [122, 66], [130, 46], [116, 64], [122, 64], [114, 82]]), p.gear2);
      break;
    case 'frost':
      draw.part(poly([[86, 86], [90, 66], [96, 80], [100, 58], [104, 80], [110, 66], [114, 86]]), p.gear);
      draw.detail(`<ellipse cx="100" cy="146" rx="32" ry="22" fill="#ffffff" opacity="0.95"/>`);
      draw.detail(`<path d="M 94 122 L 106 122 L 100 130 Z" fill="${p.glow === '#e8fcff' ? '#ffb84a' : p.glow}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`);
      break;
    case 'shadow':
      draw.detail(`<path d="M 94 90 A 10 10 0 1 0 107 105 A 8 8 0 1 1 94 90 Z" fill="${p.gear2}"/>`);
      break;
    case 'sky':
      for (const side of [-1, 1])
      {
        draw.part(`M ${100 + side * 44} 124 Q ${100 + side * 70} 96 ${100 + side * 72} 118 Q ${100 + side * 62} 124 ${100 + side * 70} 136 Q ${100 + side * 56} 140 ${100 + side * 46} 138 Z`, p.gear);
      }
      break;
    default:
      break;
  }
  cuteFace(draw, cx, type === 'frost' ? 108 : 114, 20, type === 'fire' || type === 'water' ? 'open' : 'smile');
}

// --- beasts: fox, cat, lion, stag, and the armadillo --------------------------------

// A four-legged beast, side on, facing left. [build] shapes it; [fierce]
// narrows its eye under a brow and bares a fang.
function beast(draw, type, build, fierce)
{
  const p = draw.p;
  const big = build === 'lion' || build === 'stag' || build === 'dragon';
  const lift = build === 'stag' ? 16 : 0;
  const up = (points) => translate(points, 0, -lift);

  // Far legs, behind and darker.
  const legW = big ? 18 : 14;
  draw.body([
    { d: smoothPath([[86, 124 - lift], [86 + legW, 124 - lift], [92 + legW * 0.4, 152], [90 + legW * 0.2, 176], [80, 177], [84, 150]]), color: p.dark },
    { d: smoothPath([[146, 118 - lift], [160 + legW * 0.3, 124 - lift], [166, 150], [158, 176], [146, 177], [150, 150]]), color: p.dark },
  ]);

  // The tail, behind the rump.
  if (build === 'fox')
  {
    draw.body([{ d: smoothPath([[158, 100], [186, 88], [208, 58], [208, 30], [196, 36], [184, 64], [160, 88]]), color: 'skin' }]);
    draw.detail(`<path d="${smoothPath([[196, 36], [208, 30], [209, 50], [202, 44]])}" fill="${p.belly}"/>`);
  }
  else if (build === 'cat' || build === 'lion' || build === 'dragon')
  {
    const tailPoints = build === 'dragon'
      ? [[158, 108], [188, 118], [206, 96], [210, 70]]
      : [[158, 100], [186, 104], [198, 80], [204, 56]];
    const d = `M ${pts(tailPoints)}`;
    draw.detail('');
    draw.part(smoothPath(tailPoints, false), 'none', big ? 18 : 14);
    draw.layers.push({ kind: 'detail', markup: `<path d="${smoothPath(tailPoints, false)}" fill="none" stroke="${draw.silhouette ? '#1b1d29' : p.body}" stroke-width="${big ? 11 : 8}" stroke-linecap="round"/>` });
    void d;
    const end = tailPoints[tailPoints.length - 1];
    tip(draw, build === 'lion' && type !== 'fire' && type !== 'spark' ? 'shadow' : type, end[0], end[1] - 4, big ? 1.1 : 0.85);
  }
  else if (build === 'stag')
  {
    draw.body([{ d: smoothPath([[156, 84], [176, 78], [180, 92], [160, 98]]), color: 'skin' }]);
  }

  // Wings for a dragon, raised behind.
  if (build === 'dragon')
  {
    dragonWing(draw, type, [96, 86], 1.6, p.dark);
  }

  // Body, legs, neck.
  const torso = big
    ? up([[52, 102], [78, 80], [116, 86], [152, 78], [174, 96], [170, 124], [144, 136], [100, 140], [70, 136], [48, 120]])
    : up([[56, 104], [80, 88], [116, 92], [150, 86], [168, 100], [164, 122], [142, 132], [100, 134], [72, 130], [54, 118]]);
  const neck = big
    ? up([[40, 70], [72, 58], [92, 92], [58, 114], [38, 96]])
    : up([[46, 76], [70, 66], [88, 94], [60, 112], [44, 94]]);
  const frontLeg = smoothPath([[62, 120 - lift], [60 + legW + 4, 124 - lift], [60 + legW + 2, 152], [60 + legW, 176], [60, 177], [64, 150]]);
  const hindLeg = smoothPath([[136, 104 - lift], [172, 104 - lift], [176, 134], [166, 150], [160, 176], [142, 177], [150, 148], [138, 128]]);
  draw.body([
    { d: smoothPath(neck), color: 'skin' },
    { d: smoothPath(torso), color: 'skin' },
    { d: hindLeg, color: 'skin' },
    { d: frontLeg, color: 'skin' },
  ]);
  draw.detail(`<path d="${smoothPath(up(big ? [[62, 124], [100, 134], [146, 130], [120, 138], [88, 140], [62, 134]] : [[64, 120], [96, 130], [136, 128], [120, 134], [90, 136], [66, 130]]))}" fill="${p.belly}" opacity="0.8"/>`);
  claws(draw, 60 + legW / 2, 177);
  claws(draw, 151, 177);

  // A lion's mane, behind the head.
  if (build === 'lion')
  {
    const mane = [];
    const count = 17;
    for (let i = 0; i < count; i++)
    {
      const a = (i / count) * Math.PI * 2;
      const rr = i % 2 ? 36 : 58;
      mane.push([56 + Math.cos(a) * rr, 68 + Math.sin(a) * rr * 0.92]);
    }
    draw.part(poly(mane), type === 'fire' ? p.gear : type === 'spark' ? p.gear2 : p.dark);
    const inner = mane.map(([x, y]) => [56 + (x - 56) * 0.68, 68 + (y - 68) * 0.68]);
    draw.part(poly(inner), type === 'fire' ? p.gear2 : type === 'spark' ? p.gear : p.body, 0);
  }

  // Ears, then the head.
  const head = headShape(build, lift);
  const ears = earShapes(build, lift);
  draw.body([...ears.map((d) => ({ d, color: 'skin' })), { d: head, color: 'skin' }]);
  if (build === 'fox' || build === 'cat')
  {
    draw.detail(`<path d="${earShapes(build, lift, true)[0]}" fill="${p.dark}"/>`);
  }

  // Antlers for a stag: branching thorn-vines with leaves.
  if (build === 'stag')
  {
    antlers(draw, type, lift);
  }
  if (build === 'dragon')
  {
    draw.part(`M ${r1(52)} ${r1(48)} Q ${r1(74)} ${r1(22)} ${r1(96)} ${r1(20)} Q ${r1(78)} ${r1(34)} ${r1(66)} ${r1(54)} Z`, p.gear);
    draw.part(`M ${r1(40)} ${r1(50)} Q ${r1(54)} ${r1(26)} ${r1(74)} ${r1(18)} Q ${r1(60)} ${r1(34)} ${r1(52)} ${r1(54)} Z`, p.gear);
  }

  // Face.
  const eye = eyeSpot(build, lift);
  sideEye(draw, eye[0], eye[1], fierce ? 1 : 0, big ? 1.1 : 1);
  const snout = snoutTip(build, lift);
  draw.detail(`<ellipse cx="${r1(snout[0] + 3)}" cy="${r1(snout[1])}" rx="3.5" ry="2.5" fill="${INK}"/>`);
  draw.detail(`<path d="M ${r1(snout[0] + 5)} ${r1(snout[1] + 8)} Q ${r1(snout[0] + 18)} ${r1(snout[1] + 12)} ${r1(snout[0] + 32)} ${r1(snout[1] + 7)}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
  if (fierce)
  {
    fang(draw, snout[0] + 14, snout[1] + 9, big ? 1.2 : 1);
  }

  // Type gear on the back, and glowing stripes on a fierce one.
  const back = big
    ? up([[80, 80], [100, 82], [120, 84], [140, 80], [158, 80]])
    : up([[84, 88], [104, 90], [124, 90], [144, 86]]);
  if (build !== 'lion' || type === 'stone' || type === 'frost')
  {
    spines(draw, type, fierce ? back : back.slice(1, 3), fierce ? 1.1 : 0.8);
  }
  if (fierce)
  {
    stripes(draw, up(big ? [[118, 94, 28], [132, 92, 28], [146, 90, 28]] : [[114, 98], [128, 96], [142, 94]]));
  }
}

function headShape(build, lift)
{
  const shapes = {
    fox: [[40, 52], [62, 50], [74, 64], [70, 80], [50, 88], [28, 88], [10, 82], [6, 74], [20, 66], [30, 56]],
    cat: [[40, 50], [64, 48], [76, 62], [72, 80], [52, 88], [34, 88], [22, 82], [20, 72], [26, 60]],
    lion: [[38, 44], [66, 42], [80, 58], [78, 82], [58, 94], [30, 94], [12, 86], [8, 72], [20, 58]],
    stag: [[42, 54], [62, 50], [72, 62], [68, 78], [48, 84], [22, 84], [6, 78], [4, 70], [20, 62]],
    dragon: [[40, 48], [66, 46], [80, 60], [76, 80], [56, 90], [26, 92], [2, 84], [-2, 72], [18, 64], [28, 54]],
  };
  return smoothPath(translate(shapes[build], 0, -lift));
}

function earShapes(build, lift, inner = false)
{
  const ears = {
    fox: inner ? [[[52, 56], [58, 24], [68, 58]]] : [[[46, 58], [58, 12], [74, 60]], [[62, 58], [76, 20], [82, 64]]],
    cat: inner ? [[[52, 54], [55, 32], [64, 56]]] : [[[46, 56], [54, 26], [68, 58]], [[60, 54], [70, 30], [78, 60]]],
    lion: [],
    stag: [[[58, 56], [80, 44], [72, 62]]],
    dragon: [],
  };
  return ears[build].map((shape) => poly(translate(shape, 0, -lift)));
}

function eyeSpot(build, lift)
{
  const spots = { fox: [36, 66], cat: [40, 66], lion: [36, 64], stag: [34, 66], dragon: [30, 66] };
  const [x, y] = spots[build];
  return [x, y - lift];
}

function snoutTip(build, lift)
{
  const tips = { fox: [6, 74], cat: [20, 72], lion: [8, 74], stag: [4, 71], dragon: [-2, 74] };
  const [x, y] = tips[build];
  return [x, y - lift];
}

function antlers(draw, type, lift)
{
  const p = draw.p;
  const base = [52, 48 - lift];
  const branch = (points, width) =>
  {
    draw.part(smoothPath(points, false), 'none', width + 6);
    draw.layers.push({ kind: 'detail', markup: `<path d="${smoothPath(points, false)}" fill="none" stroke="${draw.silhouette ? '#1b1d29' : '#8a6a42'}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>` });
  };
  branch([base, [48, 22 - lift], [36, 2 - lift], [26, -8 - lift]], 7);
  branch([[47, 26 - lift], [60, 8 - lift], [64, -8 - lift]], 5);
  branch([[40, 12 - lift], [28, 16 - lift], [16, 10 - lift]], 5);
  branch([[62, 48 - lift], [72, 26 - lift], [86, 12 - lift]], 6);
  branch([[72, 28 - lift], [84, 32 - lift], [96, 26 - lift]], 4);
  if (type === 'grass')
  {
    for (const [x, y] of [[26, -8], [64, -8], [16, 10], [86, 12], [96, 26]])
    {
      draw.part(`M ${x} ${y - lift} Q ${x - 8} ${y - 14 - lift} ${x + 2} ${y - 18 - lift} Q ${x + 8} ${y - 8 - lift} ${x} ${y - lift} Z`, p.gear2, 3);
    }
  }
}

function dragonWing(draw, type, [x, y], scale, color)
{
  const s = scale;
  const p = draw.p;
  if (type === 'sky')
  {
    for (let i = 0; i < 3; i++)
    {
      const reach = (70 - i * 12) * s;
      const drop = i * 14;
      draw.part(`M ${r1(x)} ${r1(y + drop)} Q ${r1(x + reach * 0.3)} ${r1(y - 60 * s + drop)} ${r1(x + reach)} ${r1(y - 56 * s + drop)} Q ${r1(x + reach * 0.6)} ${r1(y - 28 * s + drop)} ${r1(x + 10)} ${r1(y + 18 + drop)} Z`, i === 1 ? p.gear : p.body);
    }
    return;
  }
  const shape = [[x, y + 10], [x + 18 * s, y - 50 * s], [x + 70 * s, y - 70 * s], [x + 62 * s, y - 44 * s], [x + 78 * s, y - 30 * s], [x + 58 * s, y - 20 * s], [x + 68 * s, y - 4 * s], [x + 40 * s, y + 4 * s], [x + 20, y + 18]];
  draw.part(poly(shape), color);
  draw.detail(`<path d="M ${r1(x + 18 * s)} ${r1(y - 50 * s)} L ${r1(x + 62 * s)} ${r1(y - 44 * s)} M ${r1(x + 18 * s)} ${r1(y - 50 * s)} L ${r1(x + 58 * s)} ${r1(y - 20 * s)} M ${r1(x + 18 * s)} ${r1(y - 50 * s)} L ${r1(x + 40 * s)} ${r1(y + 4 * s)}" stroke="${INK}" stroke-width="2.5" opacity="0.55"/>`);
}

// An armadillo: low, rolled into banded armour, a small head poking out.
function armadillo(draw, type)
{
  const p = draw.p;
  draw.body([
    { d: ellipse(78, 170, 13, 9), color: p.dark },
    { d: ellipse(140, 170, 13, 9), color: p.dark },
    { d: smoothPath([[150, 150], [176, 156], [186, 170], [172, 172], [154, 164]]), color: 'skin' },
    { d: smoothPath([[64, 132], [44, 124], [26, 132], [20, 146], [30, 158], [56, 160], [72, 152]]), color: 'skin' },
    { d: poly([[40, 128], [44, 104], [56, 126]]), color: 'skin' },
    { d: smoothPath([[58, 162], [60, 110], [84, 86], [120, 80], [154, 92], [172, 124], [170, 164]]), color: 'skin' },
  ]);
  // The armour bands.
  for (const x of [82, 104, 126, 148])
  {
    draw.detail(`<path d="M ${x} ${x === 82 ? 94 : 84 + Math.abs(x - 115) * 0.2} Q ${x + 8} 128 ${x + 2} 164" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`);
  }
  draw.detail(`<path d="M 70 112 Q 110 70 160 104" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.35"/>`);
  spines(draw, type, [[96, 84], [120, 80], [144, 88]], 0.8);
  sideEye(draw, 40, 140, 0);
  draw.detail(`<ellipse cx="23" cy="146" rx="3" ry="2.2" fill="${INK}"/>`);
}

// --- swimmers: the seal and the leaping fish ---------------------------------------------

function seal(draw, type, fierce)
{
  const p = draw.p;
  draw.body([
    { d: smoothPath([[150, 150], [186, 140], [204, 150], [192, 166], [170, 168]]), color: p.dark },
    { d: smoothPath([[40, 118], [60, 92], [96, 102], [140, 128], [170, 150], [168, 172], [110, 178], [60, 174], [36, 150]]), color: 'skin' },
    { d: smoothPath([[70, 140], [96, 146], [100, 176], [80, 180], [66, 160]]), color: p.dark },
    { d: smoothPath([[30, 70], [58, 62], [76, 80], [74, 104], [52, 116], [28, 112], [12, 98], [14, 80]]), color: 'skin' },
  ]);
  draw.detail(`<path d="${smoothPath([[48, 150], [100, 160], [150, 162], [110, 176], [60, 172]])}" fill="${p.belly}" opacity="0.85"/>`);
  sideEye(draw, 34, 84, fierce ? 1 : 0);
  draw.detail(`<ellipse cx="14" cy="92" rx="3.5" ry="2.5" fill="${INK}"/>`);
  draw.detail(`<path d="M 18 102 Q 30 106 40 100" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
  if (type === 'frost')
  {
    // Ice tusks and a frosty crest.
    draw.part(poly([[22, 102], [26, 124], [30, 102]]), p.gear, 3);
    draw.part(poly([[34, 102], [38, 122], [42, 101]]), p.gear, 3);
    spines(draw, type, [[64, 90], [86, 98], [108, 108]], 0.8);
  }
  else
  {
    spines(draw, type, [[70, 92], [100, 104]], 0.8);
  }
}

function fish(draw, type)
{
  const p = draw.p;
  // Splash beneath.
  draw.part(smoothPath([[40, 176], [70, 160], [90, 176], [120, 158], [150, 176], [180, 162], [196, 178]], false), 'none', 0);
  draw.detail(`<path d="M 30 178 Q 60 150 84 172 Q 104 146 128 172 Q 152 150 190 176" fill="${p.gear2}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" opacity="0.9"/>`);
  draw.body([
    { d: poly([[150, 108], [196, 74], [188, 110], [200, 146], [152, 124]]), color: p.gear },
    { d: smoothPath([[18, 112], [52, 84], [100, 76], [146, 96], [160, 116], [140, 136], [96, 146], [52, 140], [22, 126]]), color: 'skin' },
  ]);
  draw.part(`M 72 84 Q 84 42 128 40 Q 110 62 112 84 Z`, p.gear);
  draw.part(`M 84 138 Q 88 162 110 170 Q 104 152 108 140 Z`, p.gear);
  draw.detail(`<path d="${smoothPath([[26, 124], [70, 136], [120, 136], [96, 144], [50, 140]])}" fill="${p.belly}" opacity="0.85"/>`);
  for (const x of [58, 66])
  {
    draw.detail(`<path d="M ${x} 100 Q ${x - 4} 110 ${x} 120" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>`);
  }
  sideEye(draw, 38, 104, 0);
  draw.detail(`<path d="M 20 118 Q 28 122 38 118" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
  stripes(draw, [[112, 96, 20], [126, 98, 20]], 3);
  void type;
}

// --- the sea serpent ------------------------------------------------------------------

function serpent(draw, type, legendary)
{
  const p = draw.p;
  // The coil on the ground, then the neck rising into the head.
  const coil = [[60, 168], [100, 150], [150, 152], [182, 168], [150, 184], [96, 184]];
  draw.body([{ d: smoothPath(coil), color: 'skin' }]);
  const neck = [[150, 160], [168, 128], [150, 98], [104, 88], [80, 64], [84, 40]];
  draw.part(smoothPath(neck, false), 'none', 36);
  draw.layers.push({ kind: 'detail', markup: `<path d="${smoothPath(neck, false)}" fill="none" stroke="${draw.silhouette ? '#1b1d29' : `url(#body-${draw.uid})`}" stroke-width="28" stroke-linecap="round"/>` });
  // Belly scales down the neck's inner curve.
  draw.detail([[160, 142], [160, 122], [148, 104], [128, 96], [104, 90], [90, 76]].map(([x, y]) => `<path d="M ${x - 7} ${y} Q ${x} ${y + 5} ${x + 7} ${y}" fill="none" stroke="${p.belly}" stroke-width="3" stroke-linecap="round"/>`).join(''));
  // Fins along the back.
  spines(draw, type === 'water' ? 'water' : type, [[176, 128], [166, 104], [140, 88], [114, 80]], legendary ? 1.2 : 1);
  if (type === 'water')
  {
    draw.part(`M 150 96 Q 170 60 206 58 Q 186 80 186 104 Z`, p.gear);
  }
  // The head: long and draconic, facing left.
  draw.body([{ d: smoothPath([[62, 28], [92, 22], [110, 38], [104, 58], [80, 64], [44, 62], [18, 58], [14, 46], [34, 36]]), color: 'skin' }]);
  // Horns or fins on the head.
  draw.part(`M 86 26 Q 104 2 130 -4 Q 112 12 104 34 Z`, p.gear);
  draw.part(`M 74 24 Q 84 4 104 -10 Q 90 10 86 28 Z`, p.gear2);
  if (legendary)
  {
    draw.part(poly([[56, 26], [54, 6], [64, 18], [70, 0], [76, 18], [86, 6], [84, 26]]), '#ffd23f', 3);
  }
  sideEye(draw, 48, 42, 1, 1.1);
  draw.detail(`<ellipse cx="19" cy="48" rx="3" ry="2.2" fill="${INK}"/>`);
  draw.detail(`<path d="M 18 56 L 60 56" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
  fang(draw, 30, 56, 1.1);
  fang(draw, 44, 56, 0.9);
  stripes(draw, [[118, 150, 18], [134, 150, 18]], 3);
}

// --- the bat --------------------------------------------------------------------------

function bat(draw, type)
{
  const p = draw.p;
  for (const side of [-1, 1])
  {
    const shape = [[100 + side * 20, 110], [100 + side * 60, 62], [100 + side * 98, 78], [100 + side * 84, 98], [100 + side * 98, 118], [100 + side * 76, 124], [100 + side * 84, 146], [100 + side * 52, 136], [100 + side * 30, 150]];
    draw.part(poly(shape), p.dark);
    draw.detail(`<path d="M ${100 + side * 24} 116 L ${100 + side * 84} 98 M ${100 + side * 24} 116 L ${100 + side * 76} 124 M ${100 + side * 24} 116 L ${100 + side * 52} 136" stroke="${INK}" stroke-width="2.5" opacity="0.55"/>`);
  }
  draw.body([
    { d: poly([[76, 96], [70, 48], [96, 86]]), color: 'skin' },
    { d: poly([[124, 96], [130, 48], [104, 86]]), color: 'skin' },
    { d: smoothPath([[100, 78], [130, 92], [136, 124], [124, 152], [100, 162], [76, 152], [64, 124], [70, 92]]), color: 'skin' },
    { d: ellipse(88, 168, 7, 8), color: p.dark },
    { d: ellipse(112, 168, 7, 8), color: p.dark },
  ]);
  draw.detail(`<path d="${poly([[78, 90], [74, 58], [90, 86]])}" fill="${p.gear2}" opacity="0.7"/><path d="${poly([[122, 90], [126, 58], [110, 86]])}" fill="${p.gear2}" opacity="0.7"/>`);
  draw.detail(`<ellipse cx="100" cy="136" rx="20" ry="18" fill="${p.belly}" opacity="0.8"/>`);
  // Big glowing eyes and little fangs: cool, not yet mean.
  for (const side of [-1, 1])
  {
    draw.detail(`<ellipse cx="${100 + side * 13}" cy="106" rx="8" ry="9" fill="${p.glow}" stroke="${INK}" stroke-width="2.5"/><ellipse cx="${100 + side * 13}" cy="107" rx="2" ry="6" fill="${INK}"/><circle cx="${100 + side * 13 + 2}" cy="103" r="1.8" fill="#ffffff"/>`);
  }
  draw.detail(`<path d="M 92 122 Q 100 126 108 122" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
  fang(draw, 95, 122, 0.8);
  fang(draw, 105, 122, 0.8);
  void type;
}

// --- birds: the small one and the raptor ------------------------------------------------

function bird(draw, type, raptor)
{
  const p = draw.p;
  const s = raptor ? 1.15 : 0.9;
  const ox = raptor ? 0 : 14;
  const oy = raptor ? 0 : 22;
  const T = (points) => points.map(([x, y]) => [ox + x * s, oy + y * s - (raptor ? 20 : 0)]);
  // Far wing, raised.
  draw.part(smoothPath(T([[100, 92], [120, 36], [160, 6], [196, 0], [178, 30], [190, 40], [168, 58], [176, 70], [142, 84]])), p.dark);
  // Tail feathers.
  draw.body([
    { d: poly(T([[132, 118], [182, 136], [176, 146], [188, 156], [140, 142]])), color: p.gear },
    { d: smoothPath(T([[60, 84], [96, 78], [134, 100], [148, 126], [126, 146], [90, 148], [62, 130], [52, 106]])), color: 'skin' },
    { d: smoothPath(T([[40, 60], [62, 48], [80, 58], [84, 82], [70, 96], [48, 96], [34, 84]])), color: 'skin' },
  ]);
  // Legs and talons.
  for (const x of [88, 108])
  {
    const [lx, ly] = T([[x, 144]])[0];
    draw.part(`M ${r1(lx)} ${r1(ly)} L ${r1(lx - 2)} 176`, 'none', 7);
    draw.layers.push({ kind: 'detail', markup: `<path d="M ${r1(lx)} ${r1(ly)} L ${r1(lx - 2)} 176" stroke="${draw.silhouette ? '#1b1d29' : '#f2b233'}" stroke-width="4" stroke-linecap="round"/>` });
    claws(draw, lx - 2, 178);
  }
  draw.detail(`<path d="${smoothPath(T([[64, 98], [96, 104], [128, 126], [110, 142], [80, 140], [62, 124]]))}" fill="${p.belly}" opacity="0.85"/>`);
  // Near wing, raised and spread.
  draw.part(smoothPath(T([[96, 96], [104, 44], [132, 12], [168, 0], [152, 28], [170, 32], [148, 52], [160, 60], [128, 76], [120, 100]])), raptor ? p.gear : p.light);
  draw.detail(`<path d="${smoothPath(T([[104, 90], [112, 52], [132, 26]]), false)}" fill="none" stroke="${INK}" stroke-width="2" opacity="0.4"/>`);
  // Beak.
  const beak = raptor
    ? T([[40, 64], [14, 66], [6, 78], [18, 74], [38, 78]])
    : T([[40, 66], [22, 70], [40, 76]]);
  draw.part(poly(beak), '#f2b233', 4);
  // Crest.
  draw.part(smoothPath(T([[60, 50], [70, 22], [90, 14], [80, 34], [100, 30], [80, 50]])), raptor ? p.gear2 : p.gear);
  const [ex, ey] = T([[56, 66]])[0];
  sideEye(draw, ex, ey, raptor ? 1 : 0, raptor ? 1.1 : 0.95);
  if (raptor)
  {
    stripes(draw, T([[120, 104, 20], [132, 108, 20]]), 3);
  }
  void type;
}

// --- the golem ---------------------------------------------------------------------------

function golem(draw, type, legendary)
{
  const p = draw.p;
  draw.body([
    // Legs.
    { d: poly([[70, 146], [96, 146], [98, 178], [66, 178]]), color: p.dark },
    { d: poly([[104, 146], [130, 146], [134, 178], [102, 178]]), color: p.dark },
    // Arms reaching to the ground, with big fists.
    { d: poly([[22, 70], [52, 64], [44, 136], [14, 132]]), color: 'skin' },
    { d: poly([[178, 70], [148, 64], [156, 136], [186, 132]]), color: 'skin' },
    { d: smoothPath([[4, 134], [46, 128], [50, 160], [30, 178], [2, 168]]), color: p.dark },
    { d: smoothPath([[196, 134], [154, 128], [150, 160], [170, 178], [198, 168]]), color: p.dark },
    // Torso: a great slab, broad at the shoulders.
    { d: poly([[44, 66], [100, 52], [156, 66], [150, 124], [128, 152], [72, 152], [50, 124]]), color: 'skin' },
    // The small head, sunk between the shoulders.
    { d: poly([[80, 50], [100, 36], [120, 50], [118, 76], [82, 76]]), color: 'skin' },
  ]);
  // Cracks glowing through the rock.
  draw.detail(`<path d="M 70 92 L 84 104 L 78 118 L 92 132 M 130 88 L 118 102 L 126 114 M 100 116 L 104 138" fill="none" stroke="${p.glow}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-${draw.uid})"/>`);
  draw.detail(`<path d="M 50 70 L 100 58 L 150 70" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.3"/>`);
  // Crystals growing from the shoulders.
  const crystals = legendary
    ? [[[22, 70], [8, 26], [38, 66]], [[38, 66], [40, 14], [56, 62]], [[178, 70], [192, 26], [162, 66]], [[162, 66], [160, 14], [144, 62]]]
    : [[[24, 70], [14, 36], [42, 66]], [[176, 70], [186, 36], [158, 66]]];
  for (const shape of crystals)
  {
    draw.part(poly(shape), p.gear);
    draw.detail(`<path d="M ${shape[0][0] + 4} ${shape[0][1] - 4} L ${shape[1][0]} ${shape[1][1] + 8}" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`);
  }
  if (legendary)
  {
    draw.part(poly([[84, 38], [82, 22], [92, 32], [100, 16], [108, 32], [118, 22], [116, 38]]), '#ffd23f', 3);
  }
  fierceFrontFace(draw, 100, 60, 12);
  void type;
}

// --- which body each critter gets ----------------------------------------------------------

// Each critter's body plan, by id - chosen, not random, so every line
// reads as one creature growing up.
export const BODY_PLANS = {
  budlet: ['baby'], leafpup: ['beast', 'fox', false], thornox: ['beast', 'stag', true],
  emberkit: ['baby'], flarecat: ['beast', 'cat', false], infernyx: ['beast', 'lion', true],
  splashy: ['baby'], tidefin: ['fish'], tidalisk: ['serpent', false],
  pebblo: ['baby'], rocklet: ['armadillo'], gravlox: ['golem', false],
  zippy: ['baby'], voltfox: ['beast', 'fox', false], thunderjaw: ['beast', 'lion', true],
  frostpip: ['baby'], chillpup: ['seal', false], frostfang: ['beast', 'dragon', true],
  glimmer: ['baby'], duskbat: ['bat'], shadewing: ['beast', 'dragon', true],
  cloudlet: ['baby'], breezy: ['bird', false], stormhawk: ['bird', true],
  boulderon: ['golem', true], glacior: ['serpent', true],
};

function drawPlan(draw, critter)
{
  const [plan, a, b] = BODY_PLANS[critter.id] ?? ['baby'];
  switch (plan)
  {
    case 'beast':
      return beast(draw, critter.type, a, b);
    case 'armadillo':
      return armadillo(draw, critter.type);
    case 'seal':
      return seal(draw, critter.type, a);
    case 'fish':
      return fish(draw, critter.type);
    case 'serpent':
      return serpent(draw, critter.type, a);
    case 'bat':
      return bat(draw, critter.type);
    case 'bird':
      return bird(draw, critter.type, a);
    case 'golem':
      return golem(draw, critter.type, a);
    default:
      return baby(draw, critter.type);
  }
}

// --- the picture ------------------------------------------------------------------

// The critter as an SVG image. [uid] keeps its gradient, clip and filter ids
// apart from any other critter on the page; [silhouette] draws the shape
// alone, for one not caught yet.
export function creatureSvg(critter, { uid = critter.id, silhouette = false } = {})
{
  const palette = PALETTES[critter.type];
  const draw = new Drawing(palette, uid, silhouette);
  drawPlan(draw, critter);
  const powerful = critter.stage === 3 || critter.rarity === 'legendary';

  const aura = powerful && !silhouette ? `<ellipse cx="100" cy="100" rx="112" ry="100" fill="url(#aura-${uid})"/>` : '';
  const defs = silhouette ? '' : `
    <defs>
      <linearGradient id="body-${uid}" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="${palette.light}"/>
        <stop offset="0.5" stop-color="${palette.body}"/>
        <stop offset="1" stop-color="${palette.dark}"/>
      </linearGradient>
      <radialGradient id="aura-${uid}">
        <stop offset="0.25" stop-color="${palette.glow}" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${palette.glow}" stop-opacity="0"/>
      </radialGradient>
      <filter id="glow-${uid}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;
  const shadow = '<ellipse cx="100" cy="180" rx="78" ry="7" fill="rgba(0,0,0,0.25)"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 260 230" role="img" aria-label="${silhouette ? 'An unknown critter' : critter.name}">${defs}${aura}${shadow}${draw.render()}</svg>`;
}
