const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, AlignmentType, Bookmark, InternalHyperlink } = require("docx");
const fs = require("fs");
const data1 = require("./data.js");
const { classify, classifySubcategory, CATEGORIES, SECTIONS } = require("./categorize.js");

const rawData = data1;
const data = rawData.map((d, i) => {
  const category = classify(d);
  return { ...d, id: i + 1, category, subcategory: classifySubcategory(d, category) };
});

const grouped = CATEGORIES.map((cat) => ({
  category: cat,
  items: data.filter((d) => d.category === cat),
})).filter((g) => g.items.length > 0);

// Preserve each category's stable bookmark index (position in the filtered `grouped` array)
// while iterating by section, so anchors stay correct regardless of section headers inserted.
const categoryIndex = new Map(grouped.map((g, i) => [g.category, i]));
const sectionedGroups = SECTIONS.map((s) => ({
  title: s.title,
  groups: s.categories
    .filter((cat) => categoryIndex.has(cat))
    .map((cat) => ({ ...grouped[categoryIndex.get(cat)], gi: categoryIndex.get(cat) })),
})).filter((s) => s.groups.length > 0);

function shortSubject(s, maxlen = 70) {
  const s2 = s.replace(/\s+/g, " ").trim();
  if (s2.length <= maxlen) return s2;
  return s2.slice(0, maxlen).replace(/\s+\S*$/, "") + "…";
}

const DIVIDER = "────────────────────────────────────────────────";

function dividerPara() {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [new TextRun({ text: DIVIDER, color: "999999" })],
  });
}

function bodyParagraphs(text) {
  return text.split("\n").map((line) => {
    if (line.trim() === "") {
      return new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] });
    }
    return new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: line, font: "Consolas", size: 20 })],
    });
  });
}

const children = [];

children.push(
  new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { before: 2000, after: 200 },
    children: [new TextRun({ text: "AI Image & Video Prompt Compendium" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "Consolidated from multiple source documents · Organized by type & topic", italics: true, size: 24 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: `${data.length} prompts across ${grouped.length} categories — each entry keeps a permanent Archive # regardless of grouping`, size: 22, color: "555555" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({
      text: "Note: every prompt from the source is included. Where a prompt named real, identifiable public figures or specific copyrighted characters/franchises, those names have been replaced with \"[public figure redacted]\" or \"[redacted IP]\" — flagged inline within the relevant entries.",
      size: 20, color: "888888", italics: true,
    })],
  }),
  new Paragraph({ children: [new PageBreak()] })
);

children.push(
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 120 },
    children: [new TextRun({ text: "Table of Contents" })],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({
      text: "Every link below jumps directly to that section or entry.",
      italics: true, size: 20, color: "888888",
    })],
  }),
  new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: "Quick jump — categories", bold: true, size: 22 })],
  })
);

sectionedGroups.forEach((section) => {
  children.push(
    new Paragraph({
      spacing: { before: 140, after: 60 },
      children: [new TextRun({ text: section.title.toUpperCase(), bold: true, size: 20, color: "666666" })],
    })
  );
  section.groups.forEach((group) => {
    children.push(
      new Paragraph({
        indent: { left: 200 },
        spacing: { after: 60 },
        children: [
          new InternalHyperlink({
            anchor: `cat-${group.gi}`,
            children: [new TextRun({ text: `${group.category}`, style: "Hyperlink" })],
          }),
          new TextRun({ text: `  (${group.items.length})`, color: "888888", size: 20 }),
        ],
      })
    );
  });
});

children.push(
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text: "Full contents", bold: true, size: 22 })],
  })
);

sectionedGroups.forEach((section) => {
  children.push(
    new Paragraph({
      spacing: { before: 220, after: 100 },
      children: [new TextRun({ text: section.title.toUpperCase(), bold: true, size: 24, color: "555555" })],
    })
  );
  section.groups.forEach((group) => {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new InternalHyperlink({
            anchor: `cat-${group.gi}`,
            children: [new TextRun({ text: group.category, style: "Hyperlink", bold: true })],
          }),
          new TextRun({ text: `  (${group.items.length})`, color: "888888", size: 20 }),
        ],
      })
    );
    group.items.forEach((item) => {
      children.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 20 },
          children: [
            new InternalHyperlink({
              anchor: `entry-${item.id}`,
              children: [new TextRun({
                text: `#${item.id} — ${shortSubject(item.subject)}`,
                style: "Hyperlink", size: 20,
              })],
            }),
            ...(item.subcategory ? [new TextRun({ text: `  [${item.subcategory}]`, color: "999999", size: 18, italics: true })] : []),
          ],
        })
      );
    });
  });
});

children.push(
  new Paragraph({ children: [new PageBreak()] })
);

const redactions = [
  {
    where: "Prompt list entry — style modifier reference list (Grok Imagine)",
    what: "Two real, named political figures",
    replacement: "[public figure redacted] (used twice, once per figure)",
    why: "The prompt was a template for generating a realistic fabricated candid photo depicting two real, identifiable public figures in a fabricated private scenario. Claude does not reproduce prompts designed to generate realistic fake imagery of real people, regardless of stated intent.",
  },
  {
    where: "\"[redacted IP]\" propaganda poster prompt",
    what: "A specific copyrighted video-game character's name",
    replacement: "[redacted IP]",
    why: "The prompt named a specific trademarked/copyrighted character verbatim as the subject of a generated poster. Using the name as written risks generating infringing character likeness.",
  },
  {
    where: "\"[redacted IP] warship over dark-side citadel\" prompt",
    what: "A specific franchise's named warship class and temple order",
    replacement: "[redacted IP] (used twice: warship type, temple type)",
    why: "The prompt named a specific franchise's copyrighted vehicle and location terms verbatim, which risks generating that franchise's protected IP directly.",
  },
  {
    where: "Cyberpunk anime woman portrait prompt (Grok Imagine)",
    what: "Three specific copyrighted anime titles, plus the directors/studios named as style anchors for two of them, plus a named character from a third title",
    replacement: "[redacted IP] (used four times)",
    why: "The prompt used exact named anime properties and their creators as direct style anchors, which is a more targeted IP-reproduction risk than a general \"in the style of\" artist reference.",
  },
  {
    where: "\"Detailed octane render of a diorama\" prompt (Stable Diffusion collection)",
    what: "Named fantasy-franchise characters and setting used as literal subjects (a location, a monster, and a wizard character from one franchise, plus a fantasy video game title)",
    replacement: "[redacted IP] (named fantasy-franchise characters/settings)",
    why: "The prompt requested specific copyrighted characters and a copyrighted location by name as the literal subject of a diorama render, not as a style/genre reference.",
  },
  {
    where: "\"Studio photography of a fantasy claymation diorama\" prompt (Stable Diffusion collection)",
    what: "A specific copyrighted film's name, used as the literal subject",
    replacement: "[redacted IP]",
    why: "The prompt requested a diorama of a specific named copyrighted film's setting/characters as its literal subject.",
  },
  {
    where: "\"World map of Las Vegas\" prompt (Stable Diffusion collection)",
    what: "A specific copyrighted video-game character's name",
    replacement: "[redacted IP]",
    why: "The prompt named a specific trademarked character as a style/thematic anchor for the map.",
  },
  {
    where: "\"Minimalist comics\" portrait prompt (Stable Diffusion collection)",
    what: "A specific copyrighted comic-book character's name, used as the literal subject",
    replacement: "[redacted IP]",
    why: "The prompt named a specific trademarked/copyrighted character verbatim as the subject of the portrait.",
  },
  {
    where: "\"Stunning portrait\" prompt (Stable Diffusion collection)",
    what: "A specific copyrighted comic-book character's name, used as the literal subject",
    replacement: "[redacted IP]",
    why: "The prompt named a specific trademarked/copyrighted character verbatim as the subject of the portrait.",
  },
  {
    where: "\"Hero champions\" prompt (Stable Diffusion collection)",
    what: "A specific copyrighted video-game character and franchise name, used as the literal subject",
    replacement: "[redacted IP]",
    why: "The prompt named a specific trademarked character and game franchise verbatim as the subject.",
  },
  {
    where: "Two \"Illustration by Martin Handford\" prompts (Stable Diffusion collection)",
    what: "A specific copyrighted children's-book character's name, used as the literal subject (two separate prompts)",
    replacement: "[redacted IP] (used twice)",
    why: "The prompts named a specific trademarked/copyrighted character verbatim as the subject of each scene.",
  },
  {
    where: "\"Simple cyberpunk graphics user interface\" prompt (Stable Diffusion collection)",
    what: "A specific copyrighted anime title, used as an exact style anchor",
    replacement: "[redacted IP]",
    why: "The prompt named a specific copyrighted anime property verbatim as the exact style to replicate, distinct from a general genre/aesthetic reference.",
  },
  {
    where: "\"Female leader in orange robes...circular room in space station\" prompt (Midjourney archive, D the Designer) — appears 3 times (two image variants, one video variant)",
    what: "A specific copyrighted franchise name, used as the primary and essentially sole style anchor for a specific recognizable scene/character composition",
    replacement: "[redacted IP] (used 3 times)",
    why: "Unlike other entries that list several classic film titles side-by-side as general genre/cinematography influence, this prompt uses the franchise name as the near-total style descriptor bolted directly onto a specific character/scene composition, reading as a request to recreate a specific recognizable franchise scene rather than a broad genre-aesthetic reference. Other Midjourney-archive entries that list the same franchise name only as one of several genre-reference titles (e.g. \"On the set of John Carter and Star Wars and Dune and Gladiator\") or as a negative-prompt term to avoid (\"no Star Wars style clutter\") were left unredacted, consistent with how genre/style references are treated elsewhere in this compendium.",
  },
];

children.push(
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
    children: [new TextRun({ text: "Redaction Log" })],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({
      text: "This page lists every change made to the source prompts. Nothing was removed — only specific real names and specific copyrighted-property names were replaced with generic placeholders.",
      italics: true,
    })],
  })
);

redactions.forEach((r, i) => {
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 40 },
      children: [new TextRun({ text: `${i + 1}. ${r.where}`, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new TextRun({ text: "Redacted: ", bold: true }),
        new TextRun({ text: r.what }),
      ],
    }),
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new TextRun({ text: "Replaced with: ", bold: true }),
        new TextRun({ text: r.replacement }),
      ],
    }),
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new TextRun({ text: "Why: ", bold: true }),
        new TextRun({ text: r.why }),
      ],
    })
  );
});

children.push(
  new Paragraph({ children: [new PageBreak()] })
);

sectionedGroups.forEach((section) => {
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 200 },
      children: [new TextRun({ text: section.title })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({
        text: `${section.groups.reduce((n, g) => n + g.items.length, 0)} prompts across ${section.groups.length} categories in this section`,
        size: 22, color: "888888", italics: true,
      })],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  section.groups.forEach((group) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 60 },
        children: [new Bookmark({ id: `cat-${group.gi}`, children: [new TextRun({ text: group.category })] })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({
          text: `${group.items.length} prompt${group.items.length === 1 ? "" : "s"} in this category`,
          italics: true, size: 20, color: "888888",
        })],
      })
    );

    const hasSubcats = group.items.some((item) => item.subcategory);
    if (!hasSubcats) {
      renderItems(group.items);
    } else {
      const bySubcat = new Map();
      group.items.forEach((item) => {
        const key = item.subcategory || "(unsorted)";
        if (!bySubcat.has(key)) bySubcat.set(key, []);
        bySubcat.get(key).push(item);
      });
      [...bySubcat.keys()].sort().forEach((subcat) => {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 120, after: 100 },
            children: [new TextRun({ text: subcat === "(unsorted)" ? "Unsorted" : subcat })],
          })
        );
        renderItems(bySubcat.get(subcat));
      });
    }

    function renderItems(items) {
    items.forEach((item) => {
      const metaParas = [
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 80 },
          children: [new Bookmark({
            id: `entry-${item.id}`,
            children: [new TextRun({ text: `Archive #${item.id} — ${shortSubject(item.subject)}` })],
        })],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "Model / Tool: ", bold: true }),
          new TextRun({ text: item.model }),
        ],
      }),
    ];
    if (item.attribution) {
      metaParas.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: "Attribution: ", bold: true }),
            new TextRun({ text: item.attribution }),
          ],
        })
      );
    }
    if (item.subcategory) {
      metaParas.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: "Style: ", bold: true }),
            new TextRun({ text: item.subcategory }),
          ],
        })
      );
    }
    metaParas.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: "Subject: ", bold: true }),
          new TextRun({ text: item.subject }),
        ],
      })
    );
    children.push(
      ...metaParas,
      dividerPara(),
      ...bodyParagraphs(item.text),
      dividerPara(),
      new Paragraph({ children: [new PageBreak()] })
    );
    });
    }
  });
});

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/mnt/user-data/outputs/AI_Prompt_Compendium.docx", buf);
  console.log("done. entries:", data.length, "categories:", grouped.length);
});
