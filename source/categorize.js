// Shared category classifier for both the docx and HTML builds.
// Rules are checked in order; first match wins. Keep order deliberate.

// Categories are grouped into two top-level sections purely for navigation/display —
// the classify() rules and category assignment are completely unaffected by this grouping.
const SECTIONS = [
  {
    title: "Styles & Art Techniques",
    categories: [
      "Art Styles",
      "Graphic Design & Typography Systems",
      "Anime, Manga & Stylized Illustration",
      "Animation Styles",
      "Retrofuturism, Cassette Futurism & Used-Future Sci-Fi",
      "Reference Lists (Artists & Style Names)",
    ],
  },
  {
    title: "Subjects, Projects & Systems",
    categories: [
      "Structured / JSON & System Prompts",
      "GPT Workflows & Story Frameworks",
      "Reusable Templates (Placeholder Frameworks)",
      "Star Trek Fan Film — Andorians & Original Species",
      "Video & Camera-Motion Prompts",
      "Real-Person-Likeness Character Portraits",
      "Biomechanical, Cyborg & Body-Horror",
      "Fantasy, Mythic & Dark-Fantasy Editorial",
      "Fashion, Couture & Editorial Portraits",
      "Horror & Cosmic Horror",
      "Posters, Propaganda & Graphic Design",
      "Space, Astronauts & Sci-Fi Environments",
      "Product, Object & Tech Renders",
      "Characters, Creatures & Scene Art (General)",
    ],
  },
];

const CATEGORIES = SECTIONS.flatMap((s) => s.categories);

const REAL_PEOPLE = [
  "rhea seehorn", "christopher lloyd", "winona ryder", "margot robbie",
  "sadie sink", "jamie clayton", "frances mcdormand", "gwendolyn christie",
  "karl marx", "philip k. dick", "hillary clinton", "krysten ritter",
];

function has(text, ...needles) {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n));
}

function isPlaceholderTemplate(text) {
  const cleaned = text.replace(/\[redacted ip\]/gi, "").replace(/\[public figure redacted\]/gi, "");
  return /\[[A-Za-z][A-Za-z0-9_ ]{1,30}\]/.test(cleaned) || /\{[A-Za-z][A-Za-z0-9_ ]{1,30}\}/.test(cleaned);
}

function isJsonOrSystem(text, model) {
  const t = text.trim();
  if (t.startsWith("{") && t.includes('":')) return true;
  if (/<role>|<mission>|<instruction>|<crucial constraints|<step \d|<final output/i.test(text)) return true;
  if (/^system_prompt/i.test(t)) return true;
  if (/(^|\n)\s*system prompt\s*:/i.test(text)) return true;
  if (/^(role:\s*)?you are (a|an|the)\b/i.test(t)) return true;
  if (/WHIMSICAL PERSONIFICATION ILLUSTRATION SYSTEM/i.test(text)) return true;
  if (/You are a visual director|You are an award-winning trailer director/i.test(text)) return true;
  if (/Universal Cynical Vandalism Overlay/i.test(text)) return true;
  if (/^(universal )?negative prompt\s*:/i.test(t)) return true;
  if (/^steps:\s*\d+,\s*sampler:/i.test(t)) return true;
  return false;
}

function isGptWorkflow(text) {
  const t = text.toLowerCase();
  const hasCharacterSheet = t.includes("character sheet");
  const hasStoryStructure = /beat 1|beat 2|script planner|story engine|scriptwriting|character-first/.test(t);
  return hasCharacterSheet && hasStoryStructure;
}

function isGraphicDesignSystem(text) {
  const t = text.toLowerCase();
  if (t.includes("text perspective embedding")) return true;
  if (t.includes("badge system") && t.includes("series number")) return true;
  if (t.includes("fixed structure") && (t.includes("variable elements") || t.includes("template set"))) return true;
  if ((t.includes("kerning") || t.includes("grid system") || t.includes("typography system")) && t.includes("layout")) return true;
  if (text.includes("固定结构") && text.includes("可变元素")) return true;
  if (text.includes("pixel discipline")) return true;
  if (text.includes("景深排版") || text.includes("进行时档案") || text.includes("文字透视嵌入") || text.includes("一色识人")) return true;
  return false;
}

function isReferenceList(model, subject, text) {
  if (/^Reference list/i.test(model)) return true;
  if (/reference list/i.test(subject)) return true;
  if (/^60s-70s industrial space program/i.test(text)) return true;
  if (/^Vintage Sci Fi Artists/i.test(text)) return true;
  return false;
}

function isVideoMotion(model, subject, text) {
  if (/kling|seedance|hailuo|runway|grok\.com text-to-video/i.test(model)) return true;
  if (/\bfpv\b|flythrough|tracking shot|crane-down|camera:|shot \d,|\d+(\.\d+)?\s*[–-]\s*\d+(\.\d+)?\s*s\b|second by second/i.test(text)) return true;
  if (/storyboard|keyframe|contact sheet/i.test(text) && /camera/i.test(text)) return true;
  if (/handheld|camcorder|documentary footage/i.test(text) && /rolling shutter|autofocus|compression artifacts|motion blur|lens breathing/i.test(text)) return true;
  return false;
}

function isRealPersonLikeness(text) {
  const t = text.toLowerCase();
  return REAL_PEOPLE.some((p) => t.includes(p));
}

function isRetrofuturism(text) {
  if (has(text, "nostromo", "cassette futur", "used future", "retrofutur", "cassette futurist")) return true;
  const t = text.toLowerCase();
  const classicFilms = ["blade runner", "the terminator (1984)", "aliens (1986)", "outland (1981)", "thief (1981)", "space: 1999", "alien (1979)"];
  const hits = classicFilms.filter((f) => t.includes(f)).length;
  return hits >= 2;
}

function isBiomechanical(text) {
  return has(text, "biomechanical", "cyborg", "cybernetic", "vacuum-sealed", "exoskeleton", "h.r. giger", "hr giger", " giger ", "android", "bio-mechanical");
}

function isFantasy(text) {
  if (/\bmage\b/i.test(text)) return true;
  if (/\boni\b/i.test(text)) return true;
  return has(text, "wizard", "sorceress", "tiefling", "grimoire", "dark angel", "gothic", "fantasy art", "dark fantasy", "mythological", "folklore", "elves", "elven", "balrog", "titan", "dragon");
}

function isFashion(text) {
  return has(text, "couture", "fashion model", "editorial illustration", "headdress", "gown", "burlesque", "office dress", "jewelry that replaces");
}

function isAnime(text) {
  return has(text, "anime", "manga", "ghibli", "studio ghibli");
}

function isAnimationStyle(text) {
  return has(
    text,
    "cel animation", "cel-animation", "cel shading",
    "stop motion", "stop-motion", "claymation",
    "hand-drawn animation", "hand drawn animation", "hand-painted animation", "hand painted animation",
    "traditional animation", "traditional 2d animation", "2d animation",
    "animated on ones", "animated on twos", "principles of animation",
    "rotoscop", "frame-by-frame", "frame by frame",
    "disney animation", "pixar", "dreamworks", "don bluth"
  );
}

function isHorror(text) {
  return has(text, "horror", "lovecraft", "cosmic horror", "zombie", "cursed", "nightmare", "grotesque", "cthulhu", "disturbing", "creepy");
}

function isArtStyle(text) {
  // Two explicit tags, both deliberate/editorial rather than fragile keyword-guessing:
  //  - the "stripped" tag: a prompt reposted from an existing entry with its subject removed
  //  - the plain "[art style]" tag: a prompt freshly authored with no subject at all
  return text.includes("[art style only — subject stripped]") || text.includes("[art style]");
}

function isTrekFanFilm(text) {
  return has(text, "sensory stalks", "andorian", "star trek", "starfleet", "trek fan film", "vulcan ears", "romulan", "klingon", "starship enterprise");
}

function isPoster(text) {
  return has(text, "poster", "propaganda", "graphic design", "typographic", "constructivist", "page layout");
}

function isSpace(text) {
  return has(text, "astronaut", "space station", "spaceship", "starship", "orbit", "nebula", "galaxy", " alien ", "alien planet", "cosmic", "interstellar", "spacecraft");
}

function isProduct(text) {
  return has(text, "knolling", "product photograph", "vinyl record", "keyboard", "computer", "cassette tape", "diorama", "render of a", "octane render of a");
}

// ---- Subcategories: an optional second level of grouping *within* a category, for finer
// browsing/search once a category has many entries. Only categories listed here get
// subcategories — everything else just gets subcategory: null. Rules are checked in order,
// first match wins, same pattern as the top-level classifier.
const SUBCATEGORY_RULES = {
  "Art Styles": [
    { name: "1970s-80s Retro Film & Print", test: (t) => /\b19?70s\b|\b19?80s\b|kodachrome|halation|vintage print|retrofutur|analog film grain/i.test(t) },
    { name: "Manga & Anime", test: (t) => /\bmanga\b|\banime\b|\bshojo\b|\bshōjo\b|\bshonen\b|\bchibi\b/i.test(t) },
    { name: "Cel Animation & Traditional Animation", test: (t) => /cel animation|cel shading|traditional animation|hand-drawn animation/i.test(t) },
    { name: "Watercolor & Traditional Paint", test: (t) => /watercolor|watercolour|\bgouache\b|oil paint|oil on canvas|acrylic paint/i.test(t) },
    { name: "Ink & Linework", test: (t) => /ink linework|line art|pen and ink|ink wash|hatching|cross.?hatch/i.test(t) },
    { name: "Photorealism", test: (t) => /photoreal|hyperreal|photographic realism/i.test(t) },
    { name: "Pixel & 8-bit", test: (t) => /pixel art|8-bit|16-bit|pixelated/i.test(t) },
    { name: "Pop Art & Op Art", test: (t) => /pop art|op[\s-]art/i.test(t) },
    { name: "Collage & Mixed Media", test: (t) => /collage|mixed media|paper cutout|cut.?paper/i.test(t) },
    { name: "Digital & Concept Art", test: (t) => /concept art|digital painting|matte painting/i.test(t) },
  ],
};

function classifySubcategory(entry, category) {
  const rules = SUBCATEGORY_RULES[category];
  if (!rules) return null;
  const combined = `${entry.subject}\n${entry.text}`;
  for (const rule of rules) {
    if (rule.test(combined)) return rule.name;
  }
  return "Other / Unsorted Style";
}

function classify(entry) {
  const { model, subject, text } = entry;
  const combined = `${subject}\n${text}`;

  if (isJsonOrSystem(text, model)) return "Structured / JSON & System Prompts";
  if (isArtStyle(combined)) return "Art Styles";
  if (isGptWorkflow(combined)) return "GPT Workflows & Story Frameworks";
  if (isGraphicDesignSystem(combined)) return "Graphic Design & Typography Systems";
  if (isTrekFanFilm(combined)) return "Star Trek Fan Film — Andorians & Original Species";
  if (isVideoMotion(model, subject, text)) return "Video & Camera-Motion Prompts";
  if (isPlaceholderTemplate(text)) return "Reusable Templates (Placeholder Frameworks)";
  if (isReferenceList(model, subject, text)) return "Reference Lists (Artists & Style Names)";
  if (isRealPersonLikeness(combined)) return "Real-Person-Likeness Character Portraits";
  if (isRetrofuturism(combined)) return "Retrofuturism, Cassette Futurism & Used-Future Sci-Fi";
  if (isBiomechanical(combined)) return "Biomechanical, Cyborg & Body-Horror";
  if (isFantasy(combined)) return "Fantasy, Mythic & Dark-Fantasy Editorial";
  if (isFashion(combined)) return "Fashion, Couture & Editorial Portraits";
  if (isAnime(combined)) return "Anime, Manga & Stylized Illustration";
  if (isAnimationStyle(combined)) return "Animation Styles";
  if (isHorror(combined)) return "Horror & Cosmic Horror";
  if (isPoster(combined)) return "Posters, Propaganda & Graphic Design";
  if (isSpace(combined)) return "Space, Astronauts & Sci-Fi Environments";
  if (isProduct(combined)) return "Product, Object & Tech Renders";
  return "Characters, Creatures & Scene Art (General)";
}

module.exports = { classify, classifySubcategory, CATEGORIES, SECTIONS };
