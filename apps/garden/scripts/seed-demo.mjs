#!/usr/bin/env node
/**
 * Fill a garden with a demo layout, to see what the 3D walk makes of it.
 *
 * Creates beds with shapes, plants and long-running occupations, all prefixed
 * "Démo" so `--clean` can remove exactly what it added and nothing else.
 *
 *   node apps/garden/scripts/seed-demo.mjs --api http://localhost:8090 \
 *        --email you@example.com --password '...' [--register] [--clean]
 *
 * Credentials can also come from SEED_EMAIL / SEED_PASSWORD.
 */

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const next = process.argv[i + 1];
  if (next && !next.startsWith('--')) {
    args.set(arg.slice(2), next);
    i++;
  } else {
    args.set(arg.slice(2), true);
  }
}

const API = args.get('api') ?? process.env.SEED_API ?? 'http://localhost:8090';
const EMAIL = args.get('email') ?? process.env.SEED_EMAIL;
const PASSWORD = args.get('password') ?? process.env.SEED_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('Missing --email / --password (or SEED_EMAIL / SEED_PASSWORD).');
  process.exit(1);
}

const PREFIX = 'Démo';
const FOREVER = { starts_on: '2020-01-01', ends_on: '2060-12-31' };
const YEAR = new Date().getFullYear();

let cookie = '';

async function call(method, path, body) {
  const options = { method, headers: { 'Content-Type': 'application/json', Cookie: cookie } };
  if (body !== undefined) options.body = JSON.stringify(body);
  const response = await fetch(`${API}${path}`, options);
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${path} → ${response.status} ${text}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/** A rectangle on the normalised plan, from its top-left corner and size. */
const rect = (x, y, w, h) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

/** A small square centred on a point: where a single tree stands. */
const spot = (x, y, size = 0.05) => rect(x - size / 2, y - size / 2, size, size);

// --- The demo garden ----------------------------------------------------------
// Trees around the edge, vegetables in the middle, a hedge of lavender at the
// bottom. Coordinates are plan fractions; with a 25 m wide plan a 0.05 square
// is 1.25 m, which is about right for a tree's foot.

const TREES = [
  { name: 'Chêne', latin: 'Quercus robur', family: 'Fagaceae', at: [0.08, 0.1], size: 0.08 },
  { name: 'Tilleul', latin: 'Tilia cordata', family: 'Malvaceae', at: [0.3, 0.08] },
  { name: 'Catalpa', latin: 'Catalpa bignonioides', family: 'Bignoniaceae', at: [0.55, 0.08] },
  {
    name: 'Liquidambar',
    latin: 'Liquidambar styraciflua',
    family: 'Altingiaceae',
    at: [0.8, 0.08],
  },
  { name: 'Érable pourpre', latin: 'Acer platanoides', family: 'Sapindaceae', at: [0.92, 0.35] },
  { name: 'Bouleau', latin: 'Betula pendula', family: 'Betulaceae', at: [0.92, 0.62] },
  { name: 'Magnolia', latin: 'Magnolia soulangeana', family: 'Magnoliaceae', at: [0.08, 0.45] },
  { name: 'Saule pleureur', latin: 'Salix babylonica', family: 'Salicaceae', at: [0.08, 0.8] },
  { name: 'Pin', latin: 'Pinus sylvestris', family: 'Pinaceae', at: [0.92, 0.9] },
  { name: 'Pommier', latin: 'Malus domestica', family: 'Rosaceae', at: [0.3, 0.93] },
  { name: 'Cerisier', latin: 'Prunus avium', family: 'Rosaceae', at: [0.7, 0.93] },
];

const tomatoPhases = [
  { kind: 'planting', starts_on: `${YEAR}-05-01`, ends_on: `${YEAR}-05-20` },
  { kind: 'growth', starts_on: `${YEAR}-05-21`, ends_on: `${YEAR}-07-15` },
  { kind: 'flowering', starts_on: `${YEAR}-07-16`, ends_on: `${YEAR}-08-10` },
  { kind: 'harvest', starts_on: `${YEAR}-08-11`, ends_on: `${YEAR}-10-31` },
];

const BEDS = [
  {
    name: 'Massif de rosiers',
    kind: 'bed',
    shape: rect(0.22, 0.28, 0.22, 0.1),
    plant: { name: 'Rosier', latin: 'Rosa gallica', family: 'Rosaceae', spacing: 80 },
    when: FOREVER,
  },
  {
    name: 'Tomates',
    kind: 'bed',
    shape: rect(0.5, 0.28, 0.26, 0.1),
    plant: { name: 'Tomate', latin: 'Solanum lycopersicum', family: 'Solanaceae', spacing: 50 },
    when: { starts_on: `${YEAR}-05-01`, ends_on: `${YEAR}-10-31`, phases: tomatoPhases },
  },
  {
    name: 'Salades',
    kind: 'bed',
    shape: rect(0.22, 0.46, 0.22, 0.1),
    plant: { name: 'Laitue', latin: 'Lactuca sativa', family: 'Asteraceae', spacing: 30 },
    when: { starts_on: `${YEAR}-04-01`, ends_on: `${YEAR}-11-30` },
  },
  {
    name: 'Courges',
    kind: 'bed',
    shape: rect(0.5, 0.46, 0.26, 0.1),
    plant: { name: 'Potiron', latin: 'Cucurbita maxima', family: 'Cucurbitaceae', spacing: 100 },
    when: { starts_on: `${YEAR}-05-15`, ends_on: `${YEAR}-10-31` },
  },
  {
    name: 'Fraisiers',
    kind: 'bed',
    shape: rect(0.22, 0.64, 0.22, 0.1),
    plant: { name: 'Fraisier', latin: 'Fragaria × ananassa', family: 'Rosaceae', spacing: 30 },
    when: FOREVER,
  },
  {
    name: 'Serre',
    kind: 'greenhouse',
    shape: rect(0.5, 0.64, 0.14, 0.1),
    plant: { name: 'Poivron', latin: 'Capsicum annuum', family: 'Solanaceae', spacing: 45 },
    when: { starts_on: `${YEAR}-04-15`, ends_on: `${YEAR}-11-15` },
  },
  {
    name: 'Pot de basilic',
    kind: 'pot',
    shape: spot(0.71, 0.69, 0.04),
    plant: { name: 'Basilic', latin: 'Ocimum basilicum', family: 'Lamiaceae', spacing: 20 },
    when: { starts_on: `${YEAR}-05-01`, ends_on: `${YEAR}-10-15` },
  },
  {
    name: 'Haie de lavande',
    kind: 'row',
    shape: rect(0.22, 0.82, 0.54, 0.035),
    plant: { name: 'Lavande', latin: 'Lavandula angustifolia', family: 'Lamiaceae', spacing: 45 },
    when: FOREVER,
  },
  {
    name: 'Rang de poireaux',
    kind: 'row',
    shape: rect(0.5, 0.58, 0.26, 0.03),
    plant: { name: 'Poireau', latin: 'Allium porrum', family: 'Amaryllidaceae', spacing: 15 },
    when: { starts_on: `${YEAR}-06-01`, ends_on: `${YEAR + 1}-02-28` },
  },
  {
    name: 'Tournesols',
    kind: 'row',
    shape: rect(0.22, 0.58, 0.22, 0.03),
    plant: { name: 'Tournesol', latin: 'Helianthus annuus', family: 'Asteraceae', spacing: 40 },
    when: { starts_on: `${YEAR}-05-01`, ends_on: `${YEAR}-10-15` },
  },
];

// --- Run --------------------------------------------------------------------

async function main() {
  if (args.get('register')) {
    try {
      await call('POST', '/auth/register', { email: EMAIL, password: PASSWORD });
      console.log(`Registered ${EMAIL}`);
    } catch (error) {
      console.log(`Register skipped: ${error.message.split('\n')[0]}`);
    }
  }
  await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  console.log(`Logged in as ${EMAIL} on ${API}`);

  const garden = await call('GET', '/api/garden');
  const isDemo = (record) => record.name.startsWith(`${PREFIX} `);

  if (args.get('clean')) {
    const demoBedIds = new Set(garden.beds.filter(isDemo).map((b) => b.id));
    for (const o of garden.occupations) {
      if (demoBedIds.has(o.bed_id)) await call('DELETE', `/api/garden/occupations/${o.id}`);
    }
    for (const id of demoBedIds) await call('DELETE', `/api/garden/beds/${id}`);
    for (const p of garden.plants.filter(isDemo))
      await call('DELETE', `/api/garden/plants/${p.id}`);
    console.log(`Removed ${demoBedIds.size} demo beds and their plants.`);
    return;
  }

  if (garden.beds.some(isDemo)) {
    console.log('Demo beds already present — run with --clean first to start over.');
    return;
  }

  const plantIds = new Map();
  const plantId = async (plant) => {
    const key = plant.name;
    if (plantIds.has(key)) return plantIds.get(key);
    const created = await call('POST', '/api/garden/plants', {
      name: `${PREFIX} ${plant.name}`,
      latin_name: plant.latin,
      family: plant.family,
      spacing_cm: plant.spacing ?? null,
    });
    plantIds.set(key, created.id);
    return created.id;
  };

  let order = 100;
  const plantBed = async (bedInput, plant, when) => {
    const bed = await call('POST', '/api/garden/beds', { ...bedInput, sort_order: order++ });
    await call('POST', '/api/garden/occupations', {
      plant_id: await plantId(plant),
      bed_id: bed.id,
      starts_on: when.starts_on,
      ends_on: when.ends_on,
      phases: when.phases ?? [],
    });
    console.log(`  ${bedInput.name} ← ${plant.name}`);
  };

  for (const tree of TREES) {
    await plantBed(
      {
        name: `${PREFIX} ${tree.name}`,
        kind: 'row',
        shape: spot(tree.at[0], tree.at[1], tree.size),
      },
      { name: tree.name, latin: tree.latin, family: tree.family, spacing: 400 },
      FOREVER,
    );
  }
  for (const bed of BEDS) {
    await plantBed(
      { name: `${PREFIX} ${bed.name}`, kind: bed.kind, shape: bed.shape },
      bed.plant,
      bed.when,
    );
  }

  console.log(`Done: ${TREES.length + BEDS.length} beds planted. Open the BALADE 3D tab.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
