// Generates game sprites via Vercel AI Gateway (imagen-4-fast).
// Idempotent: skips files that already exist in public/sprites, so it can be
// re-run after free-tier rate limits interrupt a batch.
//
//   npx tsx --env-file=.env.local scripts/generate-assets.mts

import { generateImage } from 'ai';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'public', 'sprites');
const STYLE =
  'flat vector sticker style, bold dark outlines, vibrant colors, cute goofy cartoon, single subject centered, plain white background, no text';

const ASSETS: Record<string, string> = {
  // ---- trains (side view, facing right, for side-scroller feel) ----
  'train-handcar': `Tiny wooden railway handcar with a see-saw pump lever and two exhausted cartoon stick figures pumping it, side view facing right, ${STYLE}`,
  'train-rusty': `Old rusty brown steam locomotive held together with visible bolts and patches, puffing a small smoke cloud, side view facing right, ${STYLE}`,
  'train-diesel': `Tough blue-grey diesel locomotive with sunglasses painted on the front and a mullet-like exhaust stack, side view facing right, ${STYLE}`,
  'train-thomas': `Cheerful blue tank engine with a slightly unsettling smiling face on its front, red accents, side view facing right, ${STYLE}`,
  'train-voltline': `Sleek green electric train with lightning bolt decals and a pantograph sparking slightly, side view facing right, ${STYLE}`,
  'train-bullet': `Black bullet-shaped express train with angry eyebrows and red accents painted on the nose, side view facing right, ${STYLE}`,
  'train-alfax': `White Japanese ALFA-X shinkansen bullet train with an extremely long aerodynamic nose and blue stripe, side view facing right, ${STYLE}`,
  'train-cyber': `Futuristic black cyberpunk maglev train with glowing cyan neon trim and no wheels, hovering above the rail, side view facing right, ${STYLE}`,
  'train-doomtrain': `Demonic dark red locomotive engulfed in flames with glowing orange portal headlight and small horns, side view facing right, ${STYLE}`,
  // ---- bear units ----
  'unit-bear': `Standard grumpy brown bear standing on railway tracks with arms crossed, ${STYLE}`,
  'unit-armoredBear': `Brown bear wearing welded steel armor plates and a metal helmet, standing defiantly, ${STYLE}`,
  'unit-explosiveBear': `Round brown bear wearing a vest of red C4 explosive sticks with a blinking timer, nervous grin, ${STYLE}`,
  'unit-honeyZone': `Big golden honey flood spilling from a giant tipped-over honey pot across railway tracks, gooey drips, ${STYLE}`,
  'unit-polarMinefield': `Chubby polar bear sitting innocently in snow among half-buried round black naval mines, ${STYLE}`,
  'unit-droneSwarm': `Three small quadcopter drones with tiny bear faces painted on them and little machine guns, flying in formation, ${STYLE}`,
  'unit-lavaWhale': `Whale with cracked volcanic rock skin, glowing lava seams and lava dripping from its mouth, beached on railway tracks, ${STYLE}`,
  'unit-jellyMonolith': `Tall ominous rectangular monolith of translucent purple jelly with faint bear silhouettes suspended inside, ${STYLE}`,
  'unit-steelCube': `Massive polished steel cube blocking railway tracks with an angry bear face engraved on its front, ${STYLE}`,
  'unit-acidCube': `Huge cube of bubbling translucent green acid with a bear paw imprint, dripping and corroding the rails beneath, ${STYLE}`,
  'unit-megaUrsa': `Colossal towering white polar bear boss with glowing blue eyes and battle scars, looming over tiny railway tracks, epic, ${STYLE}`,
  'unit-beeSwarm': `Dense angry swarm of cartoon bees forming an arrow shape, a few wearing tiny bear-ear headbands, ${STYLE}`,
  'unit-bearpult': `Wooden medieval catapult loaded with a thrilled brown bear ready to launch, another bear pulling the lever, ${STYLE}`,
  'unit-glueRiver': `Thick white glue flooding across railway tracks from a giant tipped glue bottle, super sticky strands, ${STYLE}`,
  'unit-gooseDetail': `Squad of three menacing white geese wearing tiny tactical sunglasses, honking aggressively, ${STYLE}`,
  'unit-mirrorMaze': `Cluster of tall funhouse mirrors arranged across railway tracks reflecting confused bear faces, ${STYLE}`,
  'unit-bearNado': `Spinning tornado full of flailing cartoon bears, debris flying, ${STYLE}`,
  // ---- train mods/upgrades ----
  'mod-cowcatcher': `Giant heavy metal wedge-shaped cowcatcher plow attachment with rivets, ${STYLE}`,
  'mod-hull': `Stack of thick riveted steel armor plates, ${STYLE}`,
  'mod-reactive': `Angled armor plate with small orange explosion bursting harmlessly off its surface, ${STYLE}`,
  'mod-teflon': `Shiny butter-yellow non-stick coating being sprayed from an industrial spray can onto a metal panel, ${STYLE}`,
  'mod-nitro': `Pair of strapped-on red rocket boosters with blue flames, ${STYLE}`,
  'mod-snacks': `Wicker picnic basket mounted on a small launching catapult, sandwiches mid-air, ${STYLE}`,
  'mod-spikes': `Row of menacing chrome spikes mounted on a metal bar, ${STYLE}`,
  'mod-fridge': `Open refrigerator packed full of pink salmon fish, ${STYLE}`,
  'mod-plushie': `Cute caboose train car shaped like a soft teddy bear plushie, ${STYLE}`,
  'mod-mirror': `Array of round mirrors mounted on a metal frame reflecting light beams, ${STYLE}`,
  'mod-oil': `Metal barrel spraying slippery black oil slick behind it, ${STYLE}`,
  'mod-turboDiesel': `Oversized chrome turbocharger engine part with exhaust flames, ${STYLE}`,
  'mod-maglev': `Glowing blue magnetic levitation rail kit with floating magnet hovering above it, ${STYLE}`,
  'mod-laser': `Roof-mounted sci-fi laser turret firing a thin red beam, ${STYLE}`,
  'mod-heatTiles': `Stack of hexagonal ceramic heat shield tiles glowing faintly orange at the edges, ${STYLE}`,
  'mod-nanobots': `Swarm of tiny cute robots holding miniature wrenches and welding torches, ${STYLE}`,
  'mod-jammer': `Radio jammer antenna dish broadcasting musical notes, ${STYLE}`,
  'mod-sweeper': `Cute round robot vacuum cleaner happily eating a black naval mine, ${STYLE}`,
  'mod-acidwax': `Open tin of glowing protective wax with a brush, acid drops bouncing off a waxed surface, ${STYLE}`,
  'mod-horn': `Big brass horn trumpet with visible sound waves coming out, ${STYLE}`,
  'mod-karaoke': `Loudspeaker tower with a microphone and music notes blasting out, ${STYLE}`,
  'mod-bribe': `Small cannon shooting a stream of gold coins, ${STYLE}`,
  'mod-forcefield': `Glowing translucent blue energy bubble shield dome, ${STYLE}`,
  'mod-gooseSpray': `Aerosol spray can with a crossed-out angry goose symbol on the label, ${STYLE}`,
  // ---- app icon ----
  'icon': `Cartoon brown bear head wearing a blue train conductor cap, round badge icon, ${STYLE}`,
  // ---- title hero ----
  'title-hero': `A red cartoon train and a big brown bear facing each other on railway tracks, flat vector sticker style, bold dark outlines, vibrant colors, plain white background, no text`,
};

mkdirSync(OUT_DIR, { recursive: true });

let generated = 0;
let skipped = 0;
let failed = 0;

for (const [id, prompt] of Object.entries(ASSETS)) {
  const file = join(OUT_DIR, `${id}.png`);
  if (existsSync(file)) {
    skipped++;
    continue;
  }
  try {
    const { image } = await generateImage({
      model: 'google/imagen-4.0-fast-generate-001',
      prompt,
      aspectRatio: '1:1',
    });
    writeFileSync(file, Buffer.from(image.uint8Array));
    // Downscale to keep the repo small; sprites render at ~64-160px.
    execSync(`sips -Z 256 "${file}" --out "${file}"`, { stdio: 'ignore' });
    generated++;
    console.log(`✓ ${id}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${id}: ${String((error as Error)?.message).slice(0, 120).replace(/\n/g, ' ')}`);
  }
}

console.log(`\ndone — generated ${generated}, skipped ${skipped}, failed ${failed}`);
if (failed > 0) console.log('re-run this script to retry failed sprites (rate limits reset over time)');
