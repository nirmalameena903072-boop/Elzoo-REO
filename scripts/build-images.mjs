/**
 * Builds public/dishes/*.webp + public/brand/*.svg from source photography.
 * Run: node scripts/build-images.mjs
 * Sources live in image-search/ (curated by hand, one per dish).
 */
import sharp from "sharp";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = "image-search";
const OUT = "public/dishes";
const WIDTHS = [1400, 800, 400];

/** slug -> { file, crop } — crop is sharp gravity/resize strategy */
const MAP = {
  "dahi-ke-kebab": { file: "dahi-ke-kebab-hung-curd-kebab-plate-2.jpg", mode: "crop", pos: "centre" },
  "paneer-tikka": { file: "paneer-tikka-skewers-dark-food-photo-3.jpg", mode: "plain" },
  "veg-spring-roll": { file: "vegetable-spring-rolls-fried-plate-3.jpg", mode: "crop", pos: "centre" },
  "mushroom-galouti": { file: "mushroom-galouti-kebab-lucknowi-patty-1.jpg", mode: "crop", pos: "south" },
  "chicken-malai-tikka": { file: "chicken-malai-tikka-white-kebab-plate-da-2.jpg", mode: "crop", pos: "centre" },
  "fish-amritsari": { file: "fish-amritsari-fried-fish-pakora-lemon-2.jpg", mode: "crop", pos: "centre" },
  "tandoori-aloo": { file: "grilled-potato-skewers-tandoori-chaat-ma-3.jpg", mode: "crop", pos: "centre" },
  "paneer-malai-tikka": { file: "paneer-tikka-skewers-dark-food-photo-1.jpg", mode: "plain" },
  "tandoori-chicken-half": { file: "tandoori-chicken-legs-burnt-orange-plate-2.jpg", mode: "crop", pos: "centre" },
  "mutton-seekh-kebab": { file: "mutton-seekh-kebab-grill-dark-photo-1.webp", mode: "plain" },
  "dal-makhani": { file: "dal-makhani-bowl-dark-background-food-ph-1.jpg", mode: "crop", pos: "centre" },
  "malai-kofta": { file: "malai-kofta-curry-bowl-dark-background-1.jpg", mode: "crop", pos: "centre" },
  "paneer-butter-masala": { file: "paneer-butter-masala-bowl-dark-slate-bac-2.jpg", mode: "crop", pos: "centre" },
  "kadhai-mushroom": { file: "kadhai-mushroom-indian-curry-dark-bowl-2.jpg", mode: "crop", pos: "centre" },
  "butter-chicken": { file: "butter-chicken-curry-dark-moody-food-pho-1.jpg", mode: "plain" },
  "laal-maas": { file: "laal-maas-rajasthani-mutton-curry-dark-1.jpg", mode: "crop", pos: "centre" },
  "tandoori-roti": { file: "tandoori-roti-plain-indian-bread-rustic-3.jpg", mode: "crop", pos: "centre" },
  "butter-naan": { file: "stack-of-naan-roti-flatbread-dark-table--3.jpg", mode: "crop", pos: "centre" },
  "laccha-paratha": { file: "laccha-paratha-layered-flatbread-plate-1.jpg", mode: "crop", pos: "centre" },
  "jeera-rice": { file: "jeera-rice-saffron-pulao-basmati-bowl-da-3.jpg", mode: "crop", pos: "centre" },
  "saffron-pulao": { file: "saffron-pulao-yellow-rice-bowl-indian-1.jpg", mode: "crop", pos: "centre" },
  "chicken-biryani": { file: "chicken-biryani-handi-dark-background-un-3.jpg", mode: "plain" },
  "gulab-jamun": { file: "gulab-jamun-bowl-dark-background-2.jpg", mode: "crop", pos: "centre" },
  "shahi-tukda": { file: "shahi-tukda-indian-dessert-rabri-bread-3.jpg", mode: "crop", pos: "centre" },
  "masala-chai": { file: "masala-chai-kulhad-clay-cup-dark-2.jpg", mode: "plain" },
  "sweet-lassi": { file: "sweet-lassi-glass-indian-dark-background-1.jpg", mode: "crop", pos: "centre" },
  "nimbu-pudina-soda": { file: "lime-mint-soda-glass-ice-dark-background-2.jpg", mode: "plain" },
  "interior": { file: "indian-restaurant-interior-warm-lighting-1.jpg", mode: "plain" },
  "chef": { file: "chef-kitchen-pass-plating-dark-restauran-2.jpg", mode: "plain" },
};

/** Dishes whose source is shot on white/bright ground get toned down so they sit in the dark UI. */
const DARKEN = new Set(["mushroom-galouti", "tandoori-aloo", "tandoori-roti", "saffron-pulao", "dahi-ke-kebab", "veg-spring-roll"]);

async function main() {
  await mkdir(OUT, { recursive: true });
  const files = new Set(await readdir(SRC));
  const report = [];
  for (const [slug, cfg] of Object.entries(MAP)) {
    if (!files.has(cfg.file)) {
      report.push(`MISSING ${slug} <- ${cfg.file}`);
      continue;
    }
    const input = path.join(SRC, cfg.file);
    const meta = await sharp(input).metadata();
    let base = sharp(input, { failOn: "none" }).rotate();
    if (cfg.mode === "crop") {
      base = base.resize(1400, 933, { fit: "cover", position: cfg.pos ?? "centre" });
    } else {
      base = base.resize({ width: 1400, withoutEnlargement: true });
    }
    if (DARKEN.has(slug)) {
      base = base.modulate({ brightness: 0.97, saturation: 1.06 }).linear(1.03, -4).gamma(1.04);
    } else {
      base = base.modulate({ brightness: 1.01, saturation: 1.04 });
    }
    for (const w of WIDTHS) {
      const buf = await base.clone().resize({ width: w, withoutEnlargement: w > (meta.width ?? 1400) }).webp({ quality: 82, effort: 5 }).toBuffer();
      await writeFile(path.join(OUT, `${slug}-${w}.webp`), buf);
    }
    report.push(`ok ${slug} ${meta.width}x${meta.height}`);
  }
  console.log(report.join("\n"));
}
main().catch((e) => { console.error(e); process.exit(1); });
