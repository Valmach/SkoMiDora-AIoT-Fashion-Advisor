/**
 * SkoMiDora Conservative Wardrobe Schema Repair v3
 *
 * DRY RUN:
 *   node scripts/repair-wardrobe-schema-safe.js
 *
 * ONE DOCUMENT DRY RUN:
 *   node scripts/repair-wardrobe-schema-safe.js --doc=DOCUMENT_ID
 *
 * APPLY ALL:
 *   node scripts/repair-wardrobe-schema-safe.js \
 *     --apply \
 *     --confirm=WARDROBE_SCHEMA_V3
 *
 * IMPORTANT:
 * - Deletes NO existing fields.
 * - Uses confidence-gated metadata promotion.
 * - Uses controlled wardrobe taxonomy.
 * - Backs up every changed document.
 */

const fs = require('fs');
const admin = require('firebase-admin');

module.exports = {};

/*
 * ---------------------------------------------------------
 * FIREBASE STUDIO CREDENTIAL HANDLING
 * ---------------------------------------------------------
 */

const credentialPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (
  credentialPath &&
  !fs.existsSync(credentialPath)
) {
  console.warn(
    `Ignoring missing GOOGLE_APPLICATION_CREDENTIALS: ${credentialPath}`,
  );

  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

/*
 * ---------------------------------------------------------
 * CONFIGURATION
 * ---------------------------------------------------------
 */

const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  'styleai-footwear';

const COLLECTION =
  'publicWardrobeItems';

const BACKUP_COLLECTION =
  'migrationBackups_conservativeWardrobeV3_20260715';

const APPLY_REQUESTED =
  process.argv.includes('--apply');

const confirmArg =
  process.argv.find(arg =>
    arg.startsWith('--confirm='),
  );

const CONFIRM_VALUE =
  confirmArg
    ? confirmArg.substring('--confirm='.length)
    : null;

const APPLY =
  APPLY_REQUESTED &&
  CONFIRM_VALUE === 'WARDROBE_SCHEMA_V3';

const docArg =
  process.argv.find(arg =>
    arg.startsWith('--doc='),
  );

const TARGET_DOC_ID =
  docArg
    ? docArg.substring('--doc='.length).trim()
    : null;

const confidenceArg =
  process.argv.find(arg =>
    arg.startsWith('--min-confidence='),
  );

const parsedConfidence =
  confidenceArg
    ? Number(
        confidenceArg.substring(
          '--min-confidence='.length,
        ),
      )
    : 0.85;

const MIN_METADATA_CONFIDENCE =
  Number.isFinite(parsedConfidence)
    ? Math.max(
        0,
        Math.min(
          1,
          parsedConfidence,
        ),
      )
    : 0.85;

const RUN_ID =
  new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

if (
  APPLY_REQUESTED &&
  !APPLY
) {
  console.error('');
  console.error(
    'APPLY BLOCKED.',
  );

  console.error(
    'Use --confirm=WARDROBE_SCHEMA_V3 with --apply.',
  );

  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: PROJECT_ID,
  });
}

const db =
  admin.firestore();

const FieldValue =
  admin.firestore.FieldValue;

/*
 * ---------------------------------------------------------
 * BASIC HELPERS
 * ---------------------------------------------------------
 */

function cleanString(value) {
  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned || null;
}

function isUnknown(value) {
  const cleaned =
    cleanString(value);

  if (!cleaned) {
    return true;
  }

  return [
    'unknown',
    'unresolved',
    'none',
    'null',
    'n/a',
    'na',
    'undefined',
  ].includes(
    cleaned.toLowerCase(),
  );
}

function firstKnown(...values) {
  for (
    const value of values
  ) {
    const cleaned =
      cleanString(value);

    if (
      cleaned &&
      !isUnknown(cleaned)
    ) {
      return cleaned;
    }
  }

  return null;
}

function normalizeKey(value) {
  const cleaned =
    cleanString(value);

  return cleaned
    ? cleaned
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

function sameValue(a, b) {
  const left =
    normalizeKey(a);

  const right =
    normalizeKey(b);

  return Boolean(
    left &&
    right &&
    left === right,
  );
}

function uniqueStrings(values) {
  const seen =
    new Set();

  const result = [];

  for (
    const value of values
  ) {
    const cleaned =
      cleanString(value);

    if (!cleaned) {
      continue;
    }

    const key =
      normalizeKey(cleaned);

    if (
      !key ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push(
      cleaned,
    );
  }

  return result;
}

function asPlainObject(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
    ? value
    : {};
}

function valuesEqual(a, b) {
  return (
    JSON.stringify(a) ===
    JSON.stringify(b)
  );
}

function setIfChanged(
  patch,
  field,
  oldValue,
  newValue,
) {
  if (
    newValue !== undefined &&
    !valuesEqual(
      oldValue,
      newValue,
    )
  ) {
    patch[field] =
      newValue;

    return true;
  }

  return false;
}

function metadataConfidence(
  data,
  aiMetadata,
) {
  const candidates = [
    data.metadataConfidence,
    aiMetadata.metadataConfidence,
    aiMetadata.confidence,
  ];

  for (
    const candidate of candidates
  ) {
    if (
      typeof candidate === 'number' &&
      Number.isFinite(candidate)
    ) {
      return Math.max(
        0,
        Math.min(
          1,
          candidate,
        ),
      );
    }
  }

  return 0;
}

/*
 * ---------------------------------------------------------
 * TAXONOMY
 * ---------------------------------------------------------
 */

const TAXONOMY_RULES = [
  /*
   * Sleepwear before generic Bottom/Dress.
   */
  {
    itemType: 'Pajama Set',
    category:
      'Sleepwear & Loungewear',
    patterns: [
      /\bpajama\s+set\b/i,
      /\bpyjama\s+set\b/i,
    ],
  },
  {

    itemType: 'Sleepwear',
    category:
      'Sleepwear & Loungewear',
    patterns: [
      /\bpajamas?\b/i,
      /\bpyjamas?\b/i,
      /\bsleepwear\b/i,
      /\bnightgown\b/i,
    ],
  },
  {
    itemType:
      'Heels',
    category:
      'Footwear',
    patterns: [
      /\bheels?\b/i,
    ],
  },
  {
    itemType: 'Robe',
    category:
      'Sleepwear & Loungewear',
    patterns: [
      /\brobe\b/i,
    ],
  },

  /*
   * Jumpsuits before Dresses.
   */
  {
    itemType: 'Jumpsuit',
    category:
      'Jumpsuits & Rompers',
    patterns: [
      /\bjumpsuit\b/i,
    ],
  },
  {
    itemType: 'Romper',
    category:
      'Jumpsuits & Rompers',
    patterns: [
      /\bromper\b/i,
      /\bplaysuit\b/i,
    ],
  },

  /*
   * Tops.
   */
  {
    itemType:
      'Sleeveless Top',
    category:
      'Tops',
    patterns: [
      /\btank\s+top\b/i,
      /\bsleeveless\s+top\b/i,
    ],
  },
  {
    itemType:
      'Bodysuit',
    category:
      'Tops',
    patterns: [
      /\bbody\s*suit\b/i,
      /\bbodysuit\b/i,
      /\bknit\s+body\b/i,
    ],
  },
  {
    itemType:
      'Camisole',
    category:
      'Tops',
    patterns: [
      /\bcamisole\b/i,
      /\bcami\b/i,
    ],
  },
  {
    itemType:
      'Blouse',
    category:
      'Tops',
    patterns: [
      /\bblouse\b/i,
    ],
  },
  {
    itemType:
      'Crop Top',
    category:
      'Tops',
    patterns: [
      /\bcrop(?:ped)?\s+top\b/i,
    ],
  },
  {
    itemType:
      'T-Shirt',
    category:
      'Tops',
    patterns: [
      /\bt[\s-]?shirt\b/i,
      /\btee\b/i,
    ],
  },
  {
    itemType:
      'Shirt',
    category:
      'Tops',
    patterns: [
      /\bshirt\b/i,
    ],
  },

  /*
   * Knitwear.
   */
  {
    itemType:
      'Cardigan',
    category:
      'Knitwear',
    patterns: [
      /\bcardigan\b/i,
    ],
  },
  {
    itemType:
      'Sweater',
    category:
      'Knitwear',
    patterns: [
      /\bsweater\b/i,
      /\bjumper\b/i,
      /\bpullover\b/i,
    ],
  },

  /*
   * Outerwear.
   */
  {
    itemType:
      'Trench Coat',
    category:
      'Outerwear',
    patterns: [
      /\btrench\s+coat\b/i,
    ],
  },
  {
    itemType:
      'Blazer',
    category:
      'Outerwear',
    patterns: [
      /\bblazer\b/i,
    ],
  },
  {
    itemType:
      'Jacket',
    category:
      'Outerwear',
    patterns: [
      /\bjacket\b/i,
    ],
  },
  {
    itemType:
      'Coat',
    category:
      'Outerwear',
    patterns: [
      /\bcoat\b/i,
    ],
  },

  /*
   * Dresses.
   */
  {
    itemType:
      'Maxi Dress',
    category:
      'Dresses',
    patterns: [
      /\bmaxi\s+dress\b/i,
    ],
  },
  {
    itemType:
      'Midi Dress',
    category:
      'Dresses',
    patterns: [
      /\bmidi\s+dress\b/i,
    ],
  },
  {
    itemType:
      'Mini Dress',
    category:
      'Dresses',
    patterns: [
      /\bmini\s+dress\b/i,
    ],
  },
  {
    itemType:
      'Slip Dress',
    category:
      'Dresses',
    patterns: [
      /\bslip\s+dress\b/i,
    ],
  },
  {
    itemType:
      'Gown',
    category:
      'Dresses',
    patterns: [
      /\bgown\b/i,
    ],
  },
  {
    itemType:
      'Dress',
    category:
      'Dresses',
    patterns: [
      /\bdress\b/i,
    ],
  },

  /*
   * Bottoms.
   */
  {
    itemType:
      'Trousers',
    category:
      'Bottoms',
    patterns: [
      /\btrousers?\b/i,
      /\bwide[\s-]?leg\s+pants?\b/i,
      /\bflare\s+pants?\b/i,
    ],
  },
  {
    itemType:
      'Jeans',
    category:
      'Bottoms',
    patterns: [
      /\bjeans?\b/i,
    ],
  },
  {
    itemType:
      'Skirt',
    category:
      'Bottoms',
    patterns: [
      /\bskirt\b/i,
    ],
  },
  {
    itemType:
      'Shorts',
    category:
      'Bottoms',
    patterns: [
      /\bshorts\b/i,
    ],
  },
  {
    itemType:
      'Leggings',
    category:
      'Bottoms',
    patterns: [
      /\bleggings\b/i,
    ],
  },

  /*
   * Footwear — specific before generic.
   */
  {
    itemType:
      'Ankle Boots',
    category:
      'Footwear',
    patterns: [
      /\bankle\s+boots?\b/i,
    ],
  },
  {
    itemType:
      'Booties',
    category:
      'Footwear',
    patterns: [
      /\bbooties?\b/i,
      /\bbootie\b/i,
    ],
  },
  {
    itemType:
      'Boots',
    category:
      'Footwear',
    patterns: [
      /\bboots?\b/i,
    ],
  },
  {
    itemType:
      'Stilettos',
    category:
      'Footwear',
    patterns: [
      /\bstiletto(?:s)?\b/i,
    ],
  },
  {
    itemType:
      'Pumps',
    category:
      'Footwear',
    patterns: [
      /\bpumps?\b/i,
    ],
  },
  {
    itemType:
      'Mules',
    category:
      'Footwear',
    patterns: [
      /\bmules?\b/i,
    ],
  },
  {
    itemType:
      'Sandals',
    category:
      'Footwear',
    patterns: [
      /\bsandals?\b/i,
    ],
  },
  {
    itemType:
      'Loafers',
    category:
      'Footwear',
    patterns: [
      /\bloafers?\b/i,
    ],
  },
  {
    itemType:
      'Flats',
    category:
      'Footwear',
    patterns: [
      /\bflats?\b/i,
      /\bballet\s+shoe\b/i,
    ],
  },
  {
    itemType:
      'Slippers',
    category:
      'Footwear',
    patterns: [
      /\bslippers?\b/i,
    ],
  },
  {
    itemType:
      'Trainers',
    category:
      'Footwear',
    patterns: [
      /\btrainers?\b/i,
      /\brunning\s+shoes?\b/i,
    ],
  },
  {
    itemType:
      'Sneakers',
    category:
      'Footwear',
    patterns: [
      /\bsneakers?\b/i,
    ],
  },
  {
    itemType:
      'Heels',
    category:
      'Footwear',
    patterns: [
      /\bhigh\s+heels?\b/i,
      /\bheeled\s+sandals?\b/i,
    ],
  },

  /*
   * Jewelry.
   */
  {
    itemType:
      'Earrings',
    category:
      'Jewelry',
    patterns: [
      /\bearrings?\b/i,
    ],
  },
  {
    itemType:
      'Ring',
    category:
      'Jewelry',
    patterns: [
      /\bring\b/i,
    ],
  },
  {
    itemType:
      'Necklace',
    category:
      'Jewelry',
    patterns: [
      /\bnecklace\b/i,
    ],
  },
  {
    itemType:
      'Bracelet',
    category:
      'Jewelry',
    patterns: [
      /\bbracelet\b/i,
    ],
  },

  /*
   * Accessories.
   */
  {
    itemType:
      'Watch',
    category:
      'Accessories',
    patterns: [
      /\bwatch\b/i,
    ],
  },
  {
    itemType:
      'Eyewear',
    category:
      'Accessories',
    patterns: [
      /\beyewear\b/i,
      /\bsunglasses?\b/i,
    ],
  },

  /*
   * Handbags.
   */
  {
    itemType:
      'Tote',
    category:
      'Handbags',
    patterns: [
      /\btote\b/i,
    ],
  },
  {
    itemType:
      'Clutch',
    category:
      'Handbags',
    patterns: [
      /\bclutch\b/i,
    ],
  },
  {
    itemType:
      'Shoulder Bag',
    category:
      'Handbags',
    patterns: [
      /\bshoulder\s+bag\b/i,
    ],
  },
  {
    itemType:
      'Handbag',
    category:
      'Handbags',
    patterns: [
      /\bhandbag\b/i,
      /\bpurse\b/i,
    ],
  },
];

/*
 * Exact aliases from already-classified itemType values.
 */

const ITEM_TYPE_ALIASES =
  new Map([
    ['trainer', ['Trainers', 'Footwear']],
    ['trainers', ['Trainers', 'Footwear']],
    ['sneaker', ['Sneakers', 'Footwear']],
    ['sneakers', ['Sneakers', 'Footwear']],
    ['shoe', ['Shoes', 'Footwear']],
    ['shoes', ['Shoes', 'Footwear']],

    ['ankle boot', ['Ankle Boots', 'Footwear']],
    ['ankle boots', ['Ankle Boots', 'Footwear']],
    ['boot', ['Boots', 'Footwear']],
    ['boots', ['Boots', 'Footwear']],
    ['bootie', ['Booties', 'Footwear']],
    ['booties', ['Booties', 'Footwear']],
    ['stiletto', ['Stilettos', 'Footwear']],
    ['stilettos', ['Stilettos', 'Footwear']],
    ['pump', ['Pumps', 'Footwear']],
    ['pumps', ['Pumps', 'Footwear']],
    ['mule', ['Mules', 'Footwear']],
    ['mules', ['Mules', 'Footwear']],
    ['sandal', ['Sandals', 'Footwear']],
    ['sandals', ['Sandals', 'Footwear']],
    ['loafer', ['Loafers', 'Footwear']],
    ['loafers', ['Loafers', 'Footwear']],
    ['flat', ['Flats', 'Footwear']],
    ['flats', ['Flats', 'Footwear']],
    ['slipper', ['Slippers', 'Footwear']],
    ['slippers', ['Slippers', 'Footwear']],

    ['tank top', ['Sleeveless Top', 'Tops']],
    ['sleeveless top', ['Sleeveless Top', 'Tops']],
    ['body suit', ['Bodysuit', 'Tops']],
    ['bodysuit', ['Bodysuit', 'Tops']],
    ['top', ['Top', 'Tops']],
    ['blouse', ['Blouse', 'Tops']],
    ['shirt', ['Shirt', 'Tops']],

    ['bottom', ['Bottom', 'Bottoms']],
    ['trousers', ['Trousers', 'Bottoms']],
    ['pants', ['Trousers', 'Bottoms']],
    ['skirt', ['Skirt', 'Bottoms']],
    ['jeans', ['Jeans', 'Bottoms']],
    ['shorts', ['Shorts', 'Bottoms']],

    ['dress', ['Dress', 'Dresses']],
    ['maxi dress', ['Maxi Dress', 'Dresses']],
    ['midi dress', ['Midi Dress', 'Dresses']],
    ['mini dress', ['Mini Dress', 'Dresses']],
    ['slip dress', ['Slip Dress', 'Dresses']],

    ['jumpsuit', ['Jumpsuit', 'Jumpsuits & Rompers']],
    ['romper', ['Romper', 'Jumpsuits & Rompers']],

    ['outerwear', ['Outerwear', 'Outerwear']],
    ['trench coat', ['Trench Coat', 'Outerwear']],
    ['coat', ['Coat', 'Outerwear']],
    ['jacket', ['Jacket', 'Outerwear']],
    ['blazer', ['Blazer', 'Outerwear']],

    ['sweater', ['Sweater', 'Knitwear']],
    ['cardigan', ['Cardigan', 'Knitwear']],

    ['pajama set', ['Pajama Set', 'Sleepwear & Loungewear']],
    ['pyjama set', ['Pajama Set', 'Sleepwear & Loungewear']],
    ['sleepwear', ['Sleepwear', 'Sleepwear & Loungewear']],

    ['earrings', ['Earrings', 'Jewelry']],
    ['ring', ['Ring', 'Jewelry']],
    ['watch', ['Watch', 'Accessories']],
    ['eyewear', ['Eyewear', 'Accessories']],
  ]);

  function identityText(data) {
    return (
      firstKnown(
        data.name,
        data.itemName,
        data.displayName,
        data.title,
        data.aiFriendlyName,
      ) || ''
    );
  }

function detectTaxonomy(data) {
  const text =
    identityText(data);

  /*
   * Strongest evidence:
   * explicit product wording in name/title.
   */

  for (
    const rule of TAXONOMY_RULES
  ) {
    if (
      rule.patterns.some(
        pattern =>
          pattern.test(text),
      )
    ) {
      return {
        itemType:
          rule.itemType,

        category:
          rule.category,

        confidence:
          0.99,

        source:
          'product-name',
      };
    }
  }

  /*
   * Second strongest:
   * exact existing itemType alias.
   */

  const existingType =
    firstKnown(
      data.itemType,
      data.Type,
      data.type,
    );

  const alias =
    ITEM_TYPE_ALIASES.get(
      normalizeKey(existingType),
    );

  if (alias) {
    return {
      itemType:
        alias[0],

      category:
        alias[1],

      confidence:
        0.96,

      source:
        'existing-item-type',
    };
  }

  return null;
}

/*
 * ---------------------------------------------------------
 * MATERIAL NORMALIZATION
 * ---------------------------------------------------------
 */

const MATERIAL_RULES = [
  ['Nappa Leather', /\bnappa\s+leather\b/i],
  ['Patent Leather', /\bpatent\s+leather\b/i],
  ['Calfskin', /\bcalfskin\b/i],
  ['Goatskin', /\bgoatskin\b/i],
  ['Leather', /\bleather\b/i],
  ['Suede', /\bsuede\b/i],

  ['Silk', /\bsilk\b(?!-like)/i],
  ['Cotton', /\bcotton\b/i],
  ['Cashmere', /\bcashmere\b/i],
  ['Wool', /\bwool\b/i],
  ['Linen', /\blinen\b/i],
  ['Denim', /\bdenim\b/i],

  ['Polyester', /\bpolyester\b/i],
  ['Nylon', /\bnylon\b/i],
  ['Elastane', /\belastane\b/i],
  ['Spandex', /\bspandex\b/i],
  ['Viscose', /\bviscose\b/i],
  ['Rayon', /\brayon\b/i],
  ['Lycra', /\blycra\b/i],

  ['TPU', /\btpu\b/i],
  ['Rubber', /\brubber\b/i],

  ['Satin', /\bsatin\b/i],
  ['Velvet', /\bvelvet\b/i],
  ['Lace', /\blace\b(?![\s-]*up\b)/i],
  ['Chiffon', /\bchiffon\b/i],
  ['Organza', /\borganza\b/i],

  ['Acrylic', /\bacrylic\b/i],
  ['Polyurethane', /\bpolyurethane\b/i],
  ['Recycled Bloom', /\brecycled\s+bloom\b/i],
];

function looksPollutedMaterial(
  value,
) {
  const cleaned =
    cleanString(value);

  if (!cleaned) {
    return false;
  }

  const wordCount =
    cleaned
      .split(/\s+/)
      .filter(Boolean)
      .length;

  return (
    cleaned.length > 100 ||
    wordCount > 14
  );
}

function collectRawMaterials(
  data,
) {
  const raw = [];

  function collect(value) {
    if (
      Array.isArray(value)
    ) {
      value.forEach(
        collect,
      );

      return;
    }

    const cleaned =
      cleanString(value);

    if (cleaned) {
      raw.push(
        cleaned,
      );
    }
  }

  collect(data.materials);
  collect(data.material);
  collect(data.generalMaterial);

  return uniqueStrings(
    raw,
  );
}

function scoreMaterials(
  data,
) {
  const scores =
    new Map();

  function addMatches(
    text,
    weight,
  ) {
    const cleaned =
      cleanString(text);

    if (!cleaned) {
      return;
    }

    for (
      const [
        material,
        pattern,
      ] of MATERIAL_RULES
    ) {
      if (
        pattern.test(cleaned)
      ) {
        scores.set(
          material,
          (
            scores.get(
              material,
            ) || 0
          ) + weight,
        );
      }
    }
  }

  /*
   * Product identity is strongest.
   */

  addMatches(
    identityText(data),
    3,
  );

  const raw =
    collectRawMaterials(
      data,
    );

  /*
   * Short structured material values are trusted.
   * Long product-description paragraphs are NOT
   * promoted to canonical material fields.
   */

  for (
    const value of raw
  ) {
    if (
      !looksPollutedMaterial(
        value,
      )
    ) {
      addMatches(
        value,
        2,
      );
    }
  }

  const materials =
    Array
      .from(
        scores.entries(),
      )
      .filter(
        ([, score]) =>
          score >= 2,
      )
      .sort(
        (a, b) =>
          b[1] - a[1],
      )
      .map(
        ([material]) =>
          material,
      );

  /*
   * Remove generic Leather when a more
   * specific leather type is present.
   */

  const specificLeather =
    [
      'Nappa Leather',
      'Patent Leather',
      'Calfskin',
      'Goatskin',
    ].some(
      material =>
        materials.includes(
          material,
        ),
    );

  const cleaned =
    specificLeather
      ? materials.filter(
          material =>
            material !==
            'Leather',
        )
      : materials;

  return {
    materials:
      uniqueStrings(
        cleaned,
      ),

    original:
      raw,

    pollutionDetected:
      raw.some(
        looksPollutedMaterial,
      ),
  };
}

/*
 * ---------------------------------------------------------
 * BRAND / DESIGNER CONFIDENCE GATING
 * ---------------------------------------------------------
 */

const RETAILER_NAMES =
  new Set([
    'farfetch',
    'mytheresa',
    'net a porter',
    'net-a-porter',
    'nordstrom',
    'saks',
    'saks fifth avenue',
    'neiman marcus',
    'bergdorf goodman',
    'amazon',
    'walmart',
    'ebay',
  ]);

function isRetailer(value) {
  return RETAILER_NAMES.has(
    normalizeKey(value),
  );
}

function repairIdentityMetadata(
  data,
  patch,
  aiMetadata,
  reviewFlags,
) {
  const confidence =
    metadataConfidence(
      data,
      aiMetadata,
    );

  const existingBrand =
    firstKnown(
      data.brand,
    );

  const brandName =
    firstKnown(
      data.brandName,
    );

  const detectedBrand =
    firstKnown(
      data.detectedBrand,
      aiMetadata.detectedBrand,
    );

  /*
   * Promote brandName ONLY when canonical brand
   * is missing and metadata confidence is high.
   */

  if (
    !existingBrand &&
    brandName &&
    confidence >=
      MIN_METADATA_CONFIDENCE
  ) {
    patch.brand =
      brandName;
  }

  /*
   * Never automatically promote detectedBrand.
   * Preserve as AI candidate.
   */

  if (detectedBrand) {
    aiMetadata.detectedBrand =
      detectedBrand;
  }

  const existingDesigner =
    firstKnown(
      data.designer,
    );

  const designerName =
    firstKnown(
      data.designerName,
    );

  const detectedDesigner =
    firstKnown(
      data.detectedDesigner,
      aiMetadata.detectedDesigner,
    );

  if (
    detectedDesigner
  ) {
    aiMetadata.detectedDesigner =
      detectedDesigner;
  }

  /*
   * Promote designerName only with high confidence
   * and never when candidate is a known retailer.
   */

  if (
    !existingDesigner &&
    designerName &&
    confidence >=
      MIN_METADATA_CONFIDENCE &&
    !isRetailer(
      designerName,
    )
  ) {
    patch.designer =
      designerName;
  }

  /*
   * Existing suspicious designer values are flagged
   * for review but NOT deleted or overwritten.
   */

  if (
    existingDesigner &&
    isRetailer(
      existingDesigner,
    )
  ) {
    reviewFlags.push(
      'designer-appears-to-be-retailer',
    );
  }

  const resolved =
    aiMetadata
      .brandDesignerResolved ??
    data
      .brandDesignerResolved;

  if (
    existingBrand &&
    existingDesigner &&
    sameValue(
      existingBrand,
      existingDesigner,
    ) &&
    resolved === false
  ) {
    reviewFlags.push(
      'brand-designer-identical-but-unresolved',
    );
  }

  if (
    existingBrand &&
    detectedBrand &&
    !sameValue(
      existingBrand,
      detectedBrand,
    )
  ) {
    reviewFlags.push(
      'brand-conflicts-with-ai-detection',
    );
  }

  if (
    existingDesigner &&
    detectedDesigner &&
    !sameValue(
      existingDesigner,
      detectedDesigner,
    )
  ) {
    reviewFlags.push(
      'designer-conflicts-with-ai-detection',
    );
  }

  const candidates =
    asPlainObject(
      aiMetadata.candidates,
    );

  if (brandName) {
    candidates.brandName =
      brandName;
  }

  if (detectedBrand) {
    candidates.detectedBrand =
      detectedBrand;
  }

  if (
    firstKnown(
      data.label,
    )
  ) {
    candidates.label =
      firstKnown(
        data.label,
      );
  }

  if (designerName) {
    candidates.designerName =
      designerName;
  }

  if (detectedDesigner) {
    candidates.detectedDesigner =
      detectedDesigner;
  }

  aiMetadata.candidates =
    candidates;

  aiMetadata.metadataConfidenceUsed =
    confidence;

  aiMetadata.minimumPromotionConfidence =
    MIN_METADATA_CONFIDENCE;
}

/*
 * ---------------------------------------------------------
 * BUILD SAFE PATCH
 * ---------------------------------------------------------
 */

function buildRepair(
  data,
) {
  const patch = {};

  const reasons = [];

  const reviewFlags = [];

  /*
   * Preserve and extend existing AI metadata.
   */

  const existingAiMetadata =
    asPlainObject(
      data.aiMetadata,
    );

  const aiMetadata = {
    ...existingAiMetadata,
  };

  /*
   * Canonical name:
   * only create name when missing.
   */

  if (
    !firstKnown(
      data.name,
    )
  ) {
    const fallbackName =
      firstKnown(
        data.itemName,
        data.displayName,
        data.title,
        data.aiFriendlyName,
      );

    if (fallbackName) {
      patch.name =
        fallbackName;

      reasons.push(
        'canonical-name-added',
      );
    }
  }

  /*
   * Country:
   * copy Country -> country.
   * Do not delete Country.
   */

  if (
    !firstKnown(
      data.country,
    ) &&
    firstKnown(
      data.Country,
    )
  ) {
    patch.country =
      firstKnown(
        data.Country,
      );

    reasons.push(
      'country-normalized',
    );
  }

  /*
   * Controlled taxonomy.
   */

  const taxonomy =
    detectTaxonomy(
      data,
    );

  if (
    taxonomy &&
    taxonomy.confidence >=
      0.95
  ) {
    if (
      !sameValue(
        data.itemType,
        taxonomy.itemType,
      )
    ) {
      patch.itemType =
        taxonomy.itemType;

      reasons.push(
        `item-type:${taxonomy.source}`,
      );
    }

    if (
      !sameValue(
        data.category,
        taxonomy.category,
      )
    ) {
      patch.category =
        taxonomy.category;

      reasons.push(
        `category:${taxonomy.source}`,
      );
    }
  }

  /*
   * Materials.
   */

  const materialResult =
    scoreMaterials(
      data,
    );

  if (
    materialResult
      .pollutionDetected
  ) {
    aiMetadata.originalMaterials =
      materialResult.original;

    reviewFlags.push(
      'material-pollution-detected',
    );
  }

  if (
    materialResult
      .materials
      .length > 0 &&
    !valuesEqual(
      Array.isArray(
        data.materials,
      )
        ? data.materials
        : [],
      materialResult.materials,
    )
  ) {
    patch.materials =
      materialResult.materials;

    reasons.push(
      'materials-normalized',
    );
  }

  /*
   * Brand/designer confidence gating.
   */

  repairIdentityMetadata(
    data,
    patch,
    aiMetadata,
    reviewFlags,
  );

  /*
   * Deduplicate arrays only.
   * No values are invented or deleted semantically.
   */

  const arrayFields = [
    'season',
    'weatherSuitability',
    'eventCategory',
    'styleKeywords',
    'tags',
  ];

  for (
    const field of
    arrayFields
  ) {
    if (
      Array.isArray(
        data[field],
      )
    ) {
      const cleaned =
        uniqueStrings(
          data[field],
        );

      if (
        !valuesEqual(
          data[field],
          cleaned,
        )
      ) {
        patch[field] =
          cleaned;

        reasons.push(
          `${field}-deduplicated`,
        );
      }
    }
  }

  /*
   * Review flags are advisory.
   */

  const existingReviewFlags =
    Array.isArray(
      existingAiMetadata.reviewFlags,
    )
      ? existingAiMetadata.reviewFlags
      : [];

  aiMetadata.reviewFlags =
    uniqueStrings([
      ...existingReviewFlags,
      ...reviewFlags,
    ]);

  aiMetadata.schemaNormalized =
    true;

  aiMetadata.schemaVersion =
    3;


  /*
   * Write aiMetadata only when it changed.
   */

  if (
    !valuesEqual(
      existingAiMetadata,
      aiMetadata,
    )
  ) {
    patch.aiMetadata =
      aiMetadata;
  }

  const changedFields =
    Object.keys(
      patch,
    );

  if (
    changedFields.length >
    0
  ) {
    patch.updatedAt =
      FieldValue
        .serverTimestamp();
  }

  return {
    patch,

    changedFields,

    reasons:
      uniqueStrings(
        reasons,
      ),

    reviewFlags:
      uniqueStrings(
        reviewFlags,
      ),

    taxonomy,

    materialResult,
  };
}

/*
 * ---------------------------------------------------------
 * LOAD DOCUMENTS
 * ---------------------------------------------------------
 */

async function loadDocuments() {
  if (TARGET_DOC_ID) {
    const ref =
      db
        .collection(
          COLLECTION,
        )
        .doc(
          TARGET_DOC_ID,
        );

    const snapshot =
      await ref.get();

    if (!snapshot.exists) {
      throw new Error(
        `Document not found: ${TARGET_DOC_ID}`,
      );
    }

    return [
      snapshot,
    ];
  }

  const snapshot =
    await db
      .collection(
        COLLECTION,
      )
      .get();

  return snapshot.docs;
}

/*
 * ---------------------------------------------------------
 * MAIN
 * ---------------------------------------------------------
 */

async function main() {
  console.log('');
  console.log(
    '=================================================',
  );
  console.log(
    'SkoMiDora Conservative Wardrobe Repair v3',
  );
  console.log(
    '=================================================',
  );

  console.log(
    `Project: ${PROJECT_ID}`,
  );

  console.log(
    `Collection: ${COLLECTION}`,
  );

  console.log(
    `Mode: ${
      APPLY
        ? 'APPLY'
        : 'DRY RUN'
    }`,
  );

  console.log(
    `Minimum metadata confidence: ${MIN_METADATA_CONFIDENCE}`,
  );

  console.log(
    `Run ID: ${RUN_ID}`,
  );

  if (
    TARGET_DOC_ID
  ) {
    console.log(
      `Target document: ${TARGET_DOC_ID}`,
    );
  }

  console.log('');

  const documents =
    await loadDocuments();

  console.log(
    `Documents found: ${documents.length}`,
  );

  const repairs = [];

  let unchanged =
    0;

  for (
    const snapshot of
    documents
  ) {
    const data =
      snapshot.data();

    const repair =
      buildRepair(
        data,
      );

    if (
      repair
        .changedFields
        .length === 0
    ) {
      unchanged += 1;
      continue;
    }

    repairs.push({
      snapshot,
      data,
      repair,
    });

    console.log('');
    console.log(
      '---------------------------------------------',
    );

    console.log(
      `Document: ${snapshot.id}`,
    );

    console.log(
      `Name: ${
        firstKnown(
          data.name,
          data.itemName,
          data.displayName,
          data.title,
        ) ||
        '(unnamed)'
      }`,
    );

    if (
      repair.taxonomy
    ) {
      console.log(
        `Taxonomy: ${repair.taxonomy.category} / ${repair.taxonomy.itemType}`,
      );

      console.log(
        `Taxonomy confidence: ${repair.taxonomy.confidence}`,
      );

      console.log(
        `Taxonomy source: ${repair.taxonomy.source}`,
      );
    }

    if (
      repair
        .materialResult
        .materials
        .length > 0
    ) {
      console.log(
        `Materials: ${repair.materialResult.materials.join(', ')}`,
      );
    }

    console.log(
      `Changed fields: ${repair.changedFields.join(', ')}`,
    );

    if (
      repair.reasons.length >
      0
    ) {
      console.log(
        `Reasons: ${repair.reasons.join(', ')}`,
      );
    }

    if (
      repair.reviewFlags.length >
      0
    ) {
      console.log(
        `Review flags: ${repair.reviewFlags.join(', ')}`,
      );
    }
  }

  console.log('');
  console.log(
    `Documents requiring repair: ${repairs.length}`,
  );

  console.log(
    `Documents unchanged: ${unchanged}`,
  );

  /*
   * -------------------------------------------------------
   * DRY RUN
   * -------------------------------------------------------
   */

  if (!APPLY) {
    console.log('');
    console.log(
      '=================================================',
    );

    console.log(
      'DRY RUN COMPLETE — FIRESTORE WAS NOT CHANGED',
    );

    console.log(
      '=================================================',
    );

    console.log('');
    console.log(
      'This migration deletes NO fields.',
    );

    console.log(
      'Brand/designer promotion is confidence-gated.',
    );

    console.log(
      'Ambiguous metadata is stored as AI candidates or review flags.',
    );

    console.log('');
    console.log(
      'Apply command after review:',
    );

    console.log(
      'node scripts/repair-wardrobe-schema-safe.js --apply --confirm=WARDROBE_SCHEMA_V3',
    );

    return;
  }

  /*
   * -------------------------------------------------------
   * APPLY
   * -------------------------------------------------------
   */

  if (
    repairs.length === 0
  ) {
    console.log(
      'No documents require repair.',
    );

    return;
  }

  /*
   * Two writes per document:
   * 1 backup
   * 1 update
   *
   * 200 documents = 400 operations.
   */

  const BATCH_SIZE =
    200;

  let processed =
    0;

  for (
    let index = 0;
    index <
      repairs.length;
    index +=
      BATCH_SIZE
  ) {
    const group =
      repairs.slice(
        index,
        index +
          BATCH_SIZE,
      );

    const batch =
      db.batch();

    for (
      const entry of
      group
    ) {
      const backupRef =
        db
          .collection(
            BACKUP_COLLECTION,
          )
          .doc(
            `${RUN_ID}__${entry.snapshot.id}`,
          );

      batch.set(
        backupRef,
        {
          runId:
            RUN_ID,

          migration:
            'conservative-wardrobe-schema-v3',

          sourceCollection:
            COLLECTION,

          sourceDocumentId:
            entry.snapshot.id,

          originalData:
            entry.data,

          changedFields:
            entry
              .repair
              .changedFields,

          reasons:
            entry
              .repair
              .reasons,

          reviewFlags:
            entry
              .repair
              .reviewFlags,

          backedUpAt:
            FieldValue
              .serverTimestamp(),
        },
      );

      /*
       * UPDATE ONLY.
       *
       * No deletes.
       * No merge:false.
       */

      batch.update(
        entry.snapshot.ref,
        entry.repair.patch,
      );
    }

    await batch.commit();

    processed +=
      group.length;

    console.log(
      `Processed ${processed}/${repairs.length}`,
    );
  }

  console.log('');
  console.log(
    '=================================================',
  );

  console.log(
    'CONSERVATIVE WARDROBE REPAIR COMPLETE',
  );

  console.log(
    '=================================================',
  );

  console.log(
    `Documents repaired: ${processed}`,
  );

  console.log(
    `Backup collection: ${BACKUP_COLLECTION}`,
  );

  console.log(
    `Run ID: ${RUN_ID}`,
  );
}

main().catch(
  error => {
    console.error('');

    console.error(
      'REPAIR FAILED:',
      error,
    );

    process.exit(1);
  },
);