/**
 * AsciiForge — Procedural ASCII Art & Scene Generator
 * 
 * Generates richly detailed ASCII art scenes, landscapes, and patterns
 * using procedural generation. Creates unique compositions through
 * layered rendering of terrain, sky, weather, and architectural elements.
 * 
 * @module AsciiForge
 */

/**
 * Deterministic pseudo-random number generator (mulberry32).
 * @param {number} seed - Integer seed
 * @returns {function(): number} Returns values in [0,1)
 * @example
 * const rng = prng(42);
 * rng(); // 0.664... (deterministic)
 */
function prng(seed) {
  if (typeof seed !== 'number') throw new TypeError('Seed must be a number');
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a procedural landscape scene as ASCII art.
 * Creates layered compositions with sky, terrain, vegetation, and structures.
 * 
 * @param {Object} [opts] - Generation options
 * @param {number} [opts.width=60] - Scene width in characters (10-120)
 * @param {number} [opts.height=20] - Scene height in characters (5-40)
 * @param {number} [opts.seed] - Random seed for reproducibility
 * @param {string} [opts.biome='forest'] - Biome: forest, desert, arctic, ocean, mountain, cave
 * @returns {{art: string, biome: string, seed: number, features: string[]}}
 * @example
 * const scene = landscape({ biome: 'mountain', seed: 42 });
 * console.log(scene.art);
 */
function landscape(opts = {}) {
  const width = Math.max(10, Math.min(120, opts.width || 60));
  const height = Math.max(5, Math.min(40, opts.height || 20));
  const seed = opts.seed || Date.now();
  const biome = opts.biome || 'forest';
  const rng_ = prng(seed);
  const r = () => rng_();
  const features = [];

  const grid = Array.from({ length: height }, () => new Array(width).fill(' '));
  const set = (x, y, ch) => { if (x >= 0 && x < width && y >= 0 && y < height) grid[y][x] = ch; };
  const skyLine = Math.floor(height * 0.3);
  const groundLine = Math.floor(height * 0.55);

  const biomes = {
    forest: { sky: ['.', '·', ' ', ' ', ' '], ground: [',', '.', '\'', '"'], tree: ['🌲', 'Y', 'T', '♣'], accent: '~' },
    desert: { sky: [' ', ' ', '·', ' ', ' '], ground: ['~', '.', '·', ','], tree: ['|', 'ψ', '†'], accent: '≈' },
    arctic: { sky: ['*', '·', '.', ' ', ' '], ground: ['▪', '·', '.', '░'], tree: ['▲', 'A', '^'], accent: '≡' },
    ocean:  { sky: [' ', '·', ' ', ' ', ' '], ground: ['≈', '~', '∽', '∼'], tree: ['⚓', '⛵'], accent: '≈' },
    mountain:{ sky: ['·', '.', ' ', ' ', ' '], ground: ['^', '.', '\'', ','], tree: ['▲', 'Λ', 'A'], accent: '/' },
    cave:   { sky: ['▓', '▒', '░', '█', '▓'], ground: ['▒', '░', '·', '.'], tree: ['¦', '|', ':'], accent: '▓' }
  };
  const b = biomes[biome] || biomes.forest;

  // Sky
  for (let y = 0; y < skyLine; y++)
    for (let x = 0; x < width; x++)
      set(x, y, b.sky[Math.floor(r() * b.sky.length)]);

  // Stars/sun/moon
  if (biome !== 'cave') {
    if (r() > 0.5) {
      const sx = Math.floor(r() * (width - 4)) + 2;
      set(sx, 1, '('); set(sx + 1, 1, 'O'); set(sx + 2, 1, ')');
      features.push('sun');
    } else {
      const mx = Math.floor(r() * (width - 3)) + 1;
      set(mx, 1, ')'); set(mx + 1, 0, '`');
      features.push('moon');
    }
    // Clouds
    const numClouds = Math.floor(r() * 3) + 1;
    for (let c = 0; c < numClouds; c++) {
      const cx = Math.floor(r() * (width - 12));
      const cy = Math.floor(r() * (skyLine - 1)) + 1;
      const cloudParts = ['._', '(  ', '  )', '_.'];
      for (let i = 0; i < cloudParts.length; i++) {
        for (let j = 0; j < cloudParts[i].length; j++) set(cx + i * 2 + j, cy, cloudParts[i][j]);
      }
    }
    features.push(`${numClouds} cloud(s)`);
  }

  // Horizon terrain using simple midpoint displacement
  const terrain = new Array(width).fill(groundLine);
  terrain[0] = groundLine + Math.floor(r() * 3) - 1;
  terrain[width - 1] = groundLine + Math.floor(r() * 3) - 1;
  function subdivide(l, ri, roughness) {
    if (ri - l < 2) return;
    const mid = Math.floor((l + ri) / 2);
    terrain[mid] = Math.floor((terrain[l] + terrain[ri]) / 2 + (r() - 0.5) * roughness);
    terrain[mid] = Math.max(skyLine + 1, Math.min(height - 3, terrain[mid]));
    subdivide(l, mid, roughness * 0.6);
    subdivide(mid, ri, roughness * 0.6);
  }
  subdivide(0, width - 1, biome === 'mountain' ? 8 : 4);

  // Fill ground
  for (let x = 0; x < width; x++) {
    for (let y = terrain[x]; y < height; y++) {
      set(x, y, b.ground[Math.floor(r() * b.ground.length)]);
    }
    if (terrain[x] > 0) set(x, terrain[x] - 1, biome === 'mountain' ? '^' : '_');
  }
  features.push('procedural terrain');

  // Trees/vegetation
  const numTrees = Math.floor(r() * 8) + 3;
  for (let t = 0; t < numTrees; t++) {
    const tx = Math.floor(r() * (width - 2)) + 1;
    const ty = terrain[tx] - 1;
    if (ty > skyLine && ty < height) {
      const tree = b.tree[Math.floor(r() * b.tree.length)];
      set(tx, ty, tree);
      if (r() > 0.5) set(tx, ty - 1, tree === 'Y' ? 'o' : '^');
    }
  }
  features.push(`${numTrees} trees`);

  // Special features per biome
  if (biome === 'ocean') {
    for (let x = 0; x < width; x++) {
      if (r() > 0.7) set(x, groundLine + 1, '~');
      if (r() > 0.9) set(x, groundLine + 2, '≈');
    }
    features.push('waves');
  }
  if (biome === 'cave') {
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < width; x++)
        if (r() > 0.3) set(x, y, '█');
    features.push('stalactites');
  }

  // Border
  const top = '╔' + '═'.repeat(width) + '╗';
  const bottom = '╚' + '═'.repeat(width) + '╝';
  const art = [top, ...grid.map(row => '║' + row.join('') + '║'), bottom].join('\n');
  return { art, biome, seed, features };
}

/**
 * Generates geometric ASCII patterns (tessellations, spirals, mazes).
 * 
 * @param {string} [type='diamond'] - Pattern: diamond, spiral, maze, checker, wave, zigzag
 * @param {number} [size=15] - Pattern size (5-50)
 * @param {number} [seed] - Random seed
 * @returns {{art: string, type: string, size: number}}
 * @example
 * const p = pattern('spiral', 12);
 * console.log(p.art);
 */
function pattern(type = 'diamond', size = 15, seed) {
  if (typeof size !== 'number' || size < 5) size = 5;
  if (size > 50) size = 50;
  const rng_ = prng(seed || 42);
  const r = () => rng_();
  const grid = Array.from({ length: size }, () => new Array(size).fill(' '));
  const set = (x, y, ch) => { if (x >= 0 && x < size && y >= 0 && y < size) grid[y][x] = ch; };

  const patterns = {
    diamond() {
      const mid = Math.floor(size / 2);
      const chars = ['◆', '◇', '●', '○', '■', '□'];
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const d = Math.abs(x - mid) + Math.abs(y - mid);
          if (d <= mid) set(x, y, chars[d % chars.length]);
        }
    },
    spiral() {
      let x = Math.floor(size / 2), y = x, dx = 1, dy = 0, steps = 1, count = 0;
      const chars = ['·', '○', '●', '◉', '◎'];
      for (let i = 0; i < size * size && x >= 0 && x < size && y >= 0 && y < size; i++) {
        set(x, y, chars[Math.floor(i / 3) % chars.length]);
        x += dx; y += dy; count++;
        if (count >= steps) {
          count = 0;
          [dx, dy] = [-dy, dx]; // turn left
          if (dy === 0) steps++;
        }
      }
    },
    maze() {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          if (y === 0 || y === size - 1 || x === 0 || x === size - 1) set(x, y, '█');
          else if (y % 2 === 0 && x % 2 === 0) set(x, y, '█');
          else if (y % 2 === 0 && r() > 0.5) set(x, y, '█');
          else if (x % 2 === 0 && r() > 0.5) set(x, y, '█');
          else set(x, y, r() > 0.8 ? '·' : ' ');
        }
    },
    checker() {
      const a = '▓', b_ = '░';
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
          set(x, y, (x + y) % 2 === 0 ? a : b_);
    },
    wave() {
      for (let y = 0; y < size; y++) {
        const offset = Math.floor(Math.sin(y * 0.8) * 3 + size / 2);
        for (let x = 0; x < size; x++) {
          const d = Math.abs(x - offset);
          if (d < 2) set(x, y, '█');
          else if (d < 4) set(x, y, '▓');
          else if (d < 6) set(x, y, '░');
        }
      }
    },
    zigzag() {
      for (let y = 0; y < size; y++) {
        const phase = y % 4;
        for (let x = 0; x < size; x++) {
          const v = (x + (phase < 2 ? phase : 4 - phase)) % 4;
          set(x, y, ['/', '\\', '/', '\\'][v]);
        }
      }
    }
  };

  if (patterns[type]) patterns[type]();
  else patterns.diamond();

  const art = grid.map(row => row.join('')).join('\n');
  return { art, type, size };
}

/**
 * Generates ASCII art text banners with different fonts.
 * 
 * @param {string} text - Text to render (A-Z, 0-9, spaces)
 * @param {string} [font='block'] - Font: block, shadow, thin
 * @returns {{art: string, text: string, font: string}}
 * @example
 * const b = banner('HELLO', 'block');
 * console.log(b.art);
 */
function banner(text, font = 'block') {
  if (typeof text !== 'string') throw new TypeError('Text must be a string');
  text = text.toUpperCase().slice(0, 20);
  
  const fonts = {
    block: {
      A: ['█▀█','█▀█','▀ ▀'], B: ['█▀▄','█▀▄','▀▀ '], C: ['█▀▀','█  ','▀▀▀'],
      D: ['█▀▄','█ █','▀▀ '], E: ['█▀▀','█▀▀','▀▀▀'], F: ['█▀▀','█▀ ','▀  '],
      G: ['█▀▀','█ █','▀▀▀'], H: ['█ █','█▀█','▀ ▀'], I: ['▀█▀',' █ ','▀▀▀'],
      J: ['  █','  █','▀▀ '], K: ['█▀▄','█▀▄','▀ ▀'], L: ['█  ','█  ','▀▀▀'],
      M: ['█▄█','█ █','▀ ▀'], N: ['█▀█','█ █','▀ ▀'], O: ['█▀█','█ █','▀▀▀'],
      P: ['█▀█','█▀ ','▀  '], Q: ['█▀█','█ █',' ▀▀'], R: ['█▀▄','█▀▄','▀ ▀'],
      S: ['█▀▀','▀▀█','▀▀▀'], T: ['▀█▀',' █ ',' ▀ '], U: ['█ █','█ █','▀▀▀'],
      V: ['█ █','█ █',' ▀ '], W: ['█ █','█▄█','▀ ▀'], X: ['▀▄▀',' █ ','▀ ▀'],
      Y: ['█ █',' █ ',' ▀ '], Z: ['▀▀█',' █ ','▀▀▀'],
      ' ': ['   ','   ','   '],
      0: ['█▀█','█ █','▀▀▀'], 1: [' █ ',' █ ','▀▀▀'], 2: ['▀▀█','█▀▀','▀▀▀'],
      3: ['▀▀█',' ▀█','▀▀▀'], 4: ['█ █','▀▀█','  ▀'], 5: ['█▀▀','▀▀█','▀▀▀'],
      6: ['█▀▀','█▀█','▀▀▀'], 7: ['▀▀█','  █','  ▀'], 8: ['█▀█','█▀█','▀▀▀'],
      9: ['█▀█','▀▀█','▀▀▀']
    }
  };
  const f = fonts[font] || fonts.block;
  const lines = ['', '', ''];
  for (const ch of text) {
    const glyph = f[ch] || f[' '];
    for (let i = 0; i < 3; i++) lines[i] += glyph[i] + ' ';
  }
  return { art: lines.join('\n'), text, font };
}

/**
 * Composes a full scene by combining landscape, banner, and pattern.
 * @param {Object} [opts] - Composition options
 * @param {string} [opts.title='WORLD'] - Banner title
 * @param {string} [opts.biome='forest'] - Biome for landscape
 * @param {number} [opts.seed] - Random seed
 * @returns {{art: string, components: string[]}}
 * @example
 * const scene = compose({ title: 'WILD', biome: 'mountain', seed: 7 });
 * console.log(scene.art);
 */
function compose(opts = {}) {
  const title = opts.title || 'WORLD';
  const b = banner(title);
  const scene = landscape({ biome: opts.biome || 'forest', seed: opts.seed, width: 50, height: 14 });
  const pat = pattern('diamond', 9, opts.seed);
  const parts = [b.art, '', scene.art, '', '── Pattern ──', pat.art];
  return { art: parts.join('\n'), components: ['banner', 'landscape', 'pattern'] };
}

// === SHOWCASE ===
console.log('╔════════════════════════════════════════╗');
console.log('║  AsciiForge — Procedural Art Engine    ║');
console.log('╚════════════════════════════════════════╝\n');

const b = banner('FORGE');
console.log(b.art);
console.log('');

const biomeList = ['forest', 'mountain', 'desert', 'arctic', 'ocean', 'cave'];
for (const biome of biomeList.slice(0, 3)) {
  const s = landscape({ biome, seed: 42, width: 50, height: 12 });
  console.log(`── ${biome.toUpperCase()} (seed:42) ──`);
  console.log(s.art);
  console.log(`Features: ${s.features.join(', ')}\n`);
}

console.log('── Patterns ──');
for (const type of ['spiral', 'diamond', 'wave']) {
  const p = pattern(type, 11, 99);
  console.log(`[${type}]`);
  console.log(p.art);
  console.log('');
}

module.exports = { landscape, pattern, banner, compose, prng };
