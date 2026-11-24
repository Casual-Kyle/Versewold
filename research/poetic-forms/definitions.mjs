/** Curated original summaries and explicitly chosen teaching layouts.
 * Source titles map one-to-one to inventory.json; the generator fails on gaps.
 * Guided entries deliberately leave unsupported rules in prose. A free layout
 * means no machine layout is supplied, not that the tradition has no rules.
 */
const free = () => ({ kind: "free", rhymeScope: "poem", stanzas: [] });
const lines = (count) => Array.from({ length: count }, () => ({}));
const syllabic = (counts) =>
  counts.map((syllables) => ({
    meter: { system: "syllabic", syllables, strength: "conventional" },
  }));
const moraic = (counts) =>
  counts.map((morae) => ({
    meter: { system: "moraic", morae, strength: "conventional" },
  }));
const iamb = (feet) => ({
  system: "accentual-syllabic",
  pattern: "u/",
  feet,
  strength: "conventional",
});
const beats = (count) => ({
  system: "accentual",
  beats: count,
  strength: "conventional",
});
const rhymed = (scheme, meters = []) =>
  [...scheme].map((rhyme, index) => ({
    ...(rhyme === "_" ? {} : { rhyme }),
    ...(meters[index] ? { meter: meters[index] } : {}),
  }));
const block = (label, content) => ({
  label,
  lines: typeof content === "number" ? lines(content) : content,
});
const fixed = (...stanzas) => ({ kind: "fixed", rhymeScope: "poem", stanzas });
const repeat = (
  content,
  label = "Repeatable stanza",
  rhymeScope = "stanza",
) => ({ kind: "repeating", rhymeScope, stanzas: [block(label, content)] });
const one = (content, label = "Poem") => fixed(block(label, content));
const ref = (id, role) => ({ id, role });
const entry = (title, language, origin, summary, notes, options = {}) => ({
  title,
  language,
  origin,
  summary,
  notes,
  kind: "form",
  ...options,
  structure: options.structure ?? free(),
});
const concept = (title, summary, notes, options = {}) =>
  entry(title, "und", "Cross-tradition terminology", summary, notes, {
    kind: "concept",
    status: "reference",
    ...options,
  });
const tradition = (title, language, origin, summary, notes, options = {}) =>
  entry(title, language, origin, summary, notes, {
    kind: "tradition",
    ...options,
  });
const technique = (title, summary, notes, options = {}) =>
  entry(title, "und", "Used in multiple literary traditions", summary, notes, {
    kind: "technique",
    ...options,
  });

export const definitions = [
  concept(
    "Poetry",
    "The literary art of shaping language through sound, rhythm, image, and line.",
    [
      "This is the parent subject, not one fixed form. Choose a particular form or begin with free verse.",
    ],
    { kind: "reference" },
  ),
  tradition(
    "Acehnese poetry",
    "ace",
    "Aceh, Indonesia",
    "Acehnese-language verse shaped by oral recitation, rhyme, community memory, and song.",
    [
      "This umbrella covers several genres. Select a particular Acehnese form and performance model before imposing counts or rhyme positions.",
    ],
  ),
  technique(
    "Acrostic",
    "Let the beginnings of your lines reveal a second word or message.",
    [
      "Choose the hidden text first, then write one line for each letter or unit. Telestichs use endings; double acrostics use both. The hidden-text relationship needs manual checking.",
    ],
    { aliases: ["acrostich", "telestich", "double acrostic"] },
  ),
  entry(
    "Ainggyin",
    "my",
    "Myanmar · Burmese rural song",
    "A sung Burmese verse tradition associated with group singing and agricultural life.",
    [
      "The surveyed full article describes flexible composition and an opening address to dear friends. Attend to rural voice, singing, and the particular Yarpyae or Thondaunt tradition before choosing a model.",
    ],
    {
      limitations: [
        "Guidance only; no generic Burmese syllable or rhyme rule is invented.",
      ],
    },
  ),
  entry(
    "Anacreontics",
    "grc",
    "Ancient Greek lyric and later adaptations",
    "Light lyric verse associated with Anacreon, often treating pleasure, love, or wine.",
    [
      "Classical Anacreontic meter and later poems on Anacreontic themes are different specifications. Choose a period and model before treating meter as compulsory.",
    ],
    { aliases: ["Anacreontic verse"] },
  ),
  technique(
    "Antilabe",
    "Share one metrical verse line between two or more dramatic speakers.",
    [
      "Indent the continuation to show that the voices complete one underlying line. The editor currently counts physical lines, so dramatic line sharing requires manual review.",
    ],
  ),
  concept(
    "Antistrophe",
    "The answering movement in an ancient Greek choral ode.",
    [
      "It responds to the strophe and normally corresponds metrically to it. It is a section of a larger composition, not a universal standalone stanza.",
    ],
  ),
  entry(
    "Arlabecca",
    "oc",
    "Medieval Occitan lyric",
    "A historically attested Occitan lyric genre whose precise classification remains uncertain.",
    [
      "The surviving terminology has been interpreted in different ways. Study a particular attested work instead of assuming a modern fixed rhyme scheme.",
    ],
    {
      limitations: [
        "Historical definition requires specialist corroboration before a structural template is prescribed.",
      ],
    },
  ),
  entry(
    "Asefru",
    "kab",
    "Kabylia · Kabyle literature",
    "A compact Kabyle poem commonly described as three 7–5–7 tercets.",
    [
      "The surveyed article gives AAB AAB AAB across the three tercets. This layout is provisional because the source itself lacks adequate citation.",
    ],
    {
      structure: fixed(
        ...Array.from({ length: 3 }, (_, i) =>
          block(
            `Tercet ${i + 1}`,
            syllabic([7, 5, 7]).map((line, j) => ({
              ...line,
              rhyme: "AAB"[j],
            })),
          ),
        ),
      ),
      status: "guided",
      limitations: [
        "Counts and rhyme are a surveyed description awaiting a stronger source.",
      ],
    },
  ),
  entry(
    "Balbale",
    "sux",
    "Ancient Sumer",
    "Sumerian songs marked by changing repetitions and, in some examples, dialogue.",
    [
      "Ancient compositions bearing this label do not yield one securely unified modern stanza pattern. Use variation and recurring phrases as an exploratory guide.",
    ],
  ),
  entry(
    "Ballad",
    "en",
    "European narrative song · English-language practice variant",
    "Tell a story in quatrains with a four-beat/three-beat movement.",
    [
      "This common practice variant uses four, three, four, three stresses; the second and fourth lines rhyme. Ballads as a whole have other stanza, rhyme, and musical arrangements.",
    ],
    {
      name: "Ballad · common quatrain",
      structure: repeat(
        rhymed("_A_A", [beats(4), beats(3), beats(4), beats(3)]),
      ),
      primarySources: [
        {
          title: "Poetry Foundation — Ballad",
          url: "https://www.poetryfoundation.org/education/glossary/ballad",
        },
      ],
    },
  ),
  entry(
    "Balliol rhyme",
    "en",
    "Balliol College, Oxford",
    "A comic self-portrait in four lines and two rhyming couplets.",
    [
      "Write in the voice of the named subject. The surveyed pattern is AABB with four stresses per line; character and comic detail matter more than mechanical smoothness.",
    ],
    {
      structure: one(
        rhymed(
          "AABB",
          Array.from({ length: 4 }, () => beats(4)),
        ),
      ),
    },
  ),
  tradition(
    "Balwo",
    "so",
    "Somalia and Djibouti",
    "A Somali song-and-poetry style often centered on love and longing.",
    [
      "The musical and oral setting is integral. No single line count or English stress pattern is assigned to the genre.",
    ],
  ),
  technique(
    "Bitextual work",
    "Use the same words to sustain two distinct readings or narratives.",
    [
      "Build ambiguity in vocabulary and sentence structure. This is not simply writing in two languages, and it is distinct from reading a poem backwards.",
    ],
    { aliases: ["bi-textual poetry", "slesa", "śleṣa"] },
  ),
  entry(
    "Blank verse",
    "en",
    "English-language metrical verse",
    "Write unrhymed lines with an underlying iambic pentameter.",
    [
      "There is no required end-rhyme or stanza length. Each displayed unit is one repeatable line; line-by-line repetition does not require blank lines between lines.",
    ],
    {
      structure: repeat([{ meter: iamb(5) }], "Repeatable metrical line"),
      continuous: true,
      primarySources: [
        {
          title: "Harvard — Guide to poetic terms",
          url: "https://poetry.harvard.edu/guide-poetic-terms",
        },
      ],
    },
  ),
  entry(
    "Book rhyme",
    "en",
    "Book ownership and inscription traditions",
    "A brief verse inscription that names an owner or playfully guards a book.",
    [
      "Choose a concise address to a reader, borrower, or would-be thief. No mandatory stanza, meter, or rhyme is prescribed by the genre.",
    ],
  ),
  tradition(
    "Bosinada",
    "lmo",
    "Lombardy · popular satirical performance",
    "A Lombard popular poem made for topical satire and public recitation.",
    [
      "Choose a particular dialect and model. The singing or reciting context matters; the label alone does not determine a universal stanza.",
    ],
    { aliases: ["bosinata", "bosinade"] },
  ),
  technique(
    "Bouts-Rimés",
    "Compose a poem from a supplied list of rhyming end-words in a fixed order.",
    [
      "Choose the end-word list first, then fit original lines around it. The list determines the length and rhyme plan; this template does not substitute a canned list.",
    ],
    { language: "fr", aliases: ["bouts rimes", "rhymed ends"] },
  ),
  entry(
    "Bref double",
    "fr",
    "French form · Turco example variant",
    "Fourteen lines arranged as three quatrains and a couplet, mixing rhyme with unrhymed lines.",
    [
      "This variant follows AXBC XAXC BXXC AB, where X means no assigned rhyme. Other authorities describe different arrangements; line lengths are kept broadly consistent without one mandatory meter.",
    ],
    {
      structure: fixed(
        block("Quatrain 1", rhymed("A_BC")),
        block("Quatrain 2", rhymed("_A_C")),
        block("Quatrain 3", rhymed("B__C")),
        block("Couplet", rhymed("AB")),
      ),
      limitations: [
        "One explicitly selected variant; disagreement about the rhyme scheme is documented in the source.",
      ],
    },
  ),
  tradition(
    "Buraanbur",
    "so",
    "Somali oral poetry",
    "A Somali verse-and-performance tradition strongly associated with women, celebration, and community.",
    [
      "Recitation, rhythm, dance, and occasion are part of the tradition. A specialist Somali metrical model is needed before adding automatic sound constraints.",
    ],
  ),
  tradition(
    "Büttenrede",
    "de",
    "German carnival traditions",
    "A comic carnival speech, often in rhyme and local dialect.",
    [
      "Shape a performed satirical address rather than assuming a single stanza form. Delivery and audience response guide its pacing.",
    ],
    { aliases: ["Buttenrede", "carnival speech"] },
  ),
  concept(
    "Cadence (poetry)",
    "The inflection and movement of a spoken line, especially as it falls or resolves.",
    [
      "Cadence is an aspect of delivery and rhythm, not a standalone poem with a fixed number of lines.",
    ],
    { name: "Cadence" },
  ),
  entry(
    "Cantiga de amor",
    "gl",
    "Medieval Galician-Portuguese lyric",
    "A courtly love song voiced through longing, service, and emotional distance.",
    [
      "Refrains are common, but individual songs use different stanza arrangements. Choose an attested song as a structural model.",
    ],
    { aliases: ["cantiga d’amor"] },
  ),
  tradition(
    "Cantigas de escárnio e maldizer",
    "gl",
    "Medieval Galician-Portuguese satire",
    "Satirical songs that turn insult, insinuation, or direct accusation into verse.",
    [
      "These are related genres, not one universal meter. Study how indirect escárnio differs from more explicit maldizer before selecting a stanza.",
    ],
    { aliases: ["cantigas de escarnio", "cantigas de maldizer"] },
  ),
  concept(
    "Canto",
    "A large division in a long poem, comparable to a chapter.",
    [
      "A canto can contain many stanza forms. The term does not prescribe its own line count or rhyme scheme.",
    ],
  ),
  tradition(
    "Carmen (verse)",
    "la",
    "Ancient Roman ritual and verse",
    "A Latin term encompassing verse and, in ritual contexts, spells, prayers, or formulaic utterances.",
    [
      "Use a specific surviving carmen and period as your model. The historical label does not justify one generic quantitative pattern.",
    ],
    { name: "Carmen" },
  ),
  entry(
    "Chant royal",
    "fr",
    "Medieval France · five-line envoi variant",
    "Five eleven-line stanzas return to the same refrain, followed by a shorter envoi.",
    [
      "The chosen stanza scheme is ABABCCDDEDE, with the final E line repeated verbatim. The selected envoi is DDEDE; a seven-line envoi is another variant. Repeated rhyme words outside the refrain require manual review.",
    ],
    {
      structure: fixed(
        ...Array.from({ length: 5 }, (_, i) =>
          block(
            `Stanza ${i + 1}`,
            rhymed("ABABCCDDEDE").map((line, j) => ({
              ...line,
              ...(j === 10
                ? { refrain: ref("R", i === 0 ? "define" : "repeat") }
                : {}),
            })),
          ),
        ),
        block(
          "Five-line envoi",
          rhymed("DDEDE").map((line, j) => ({
            ...line,
            ...(j === 4 ? { refrain: ref("R", "repeat") } : {}),
          })),
        ),
      ),
      limitations: [
        "Layout and refrain positions are modeled; lexical rhyme-word reuse is not automatically checked.",
      ],
    },
  ),
  entry(
    "Cinquain",
    "und",
    "Five-line stanza family",
    "A five-line poem or stanza, with many more specific variants.",
    [
      "This general template prescribes only five lines. The familiar American 2–4–6–8–2 syllable arrangement is a particular variant, not the definition of every cinquain.",
    ],
    {
      structure: one(5),
      aliases: ["five-line poem"],
      primarySources: [
        {
          title: "Academy of American Poets — Cinquain",
          url: "https://poets.org/glossary/cinquain",
        },
      ],
    },
  ),
  concept(
    "Cipai",
    "A named tune pattern governing a particular Chinese ci lyric.",
    [
      "Each cipai has its own line lengths, tonal pattern, rhyme placements, and sometimes variants. A named tune is needed before a usable structural template can be created.",
    ],
    {
      language: "zh",
      origin: "Classical Chinese ci poetry",
      aliases: ["ci tune pattern", "詞牌", "词牌"],
    },
  ),
  tradition(
    "City Lament",
    "sux",
    "Ancient Near Eastern lament traditions",
    "A lament that gives voice to the loss, destruction, or abandonment of a city.",
    [
      "Consider communal voice, places, ritual mourning, and a city’s before-and-after. Different works have different structures; no universal stanza count is imposed.",
    ],
  ),
  entry(
    "Clerihew",
    "en",
    "English comic biography",
    "Give a person a mischievous four-line biography in AABB rhyme.",
    [
      "Name or identify the subject early. Uneven lengths and deliberately awkward rhymes can contribute to the joke; regular meter is not required.",
    ],
    {
      structure: one(rhymed("AABB")),
      primarySources: [
        {
          title: "Academy of American Poets — Clerihew",
          url: "https://poets.org/glossary/Clerihew",
        },
      ],
    },
  ),
  entry(
    "Cobla esparsa",
    "oc",
    "Occitan troubadour lyric",
    "A single self-contained stanza that can stand alone or answer another poet.",
    [
      "Choose a particular cobla’s line and rhyme design; the genre requires a standalone stanza but not one universal number of lines.",
    ],
    { aliases: ["cobla exchange"] },
  ),
  entry(
    "Conversation poem",
    "en",
    "English Romantic poetry",
    "An intimate, reflective address that grows from a particular scene or occasion.",
    [
      "Use a clearly imagined listener and allow observation to lead into thought. The genre is not simply alternating dialogue and does not require one fixed layout.",
    ],
  ),
  entry(
    "Copla (poetry)",
    "es",
    "Spanish and Latin American stanza traditions",
    "A short popular stanza with several established metrical and rhyme variants.",
    [
      "Romance-style coplas often use eight-syllable lines with even-line assonance; seguidilla and redondilla patterns differ. Choose a variant before assigning sound constraints.",
    ],
    {
      name: "Copla",
      structure: repeat(
        syllabic([8, 8, 8, 8]),
        "Octosyllabic practice variant",
      ),
      status: "guided",
      limitations: [
        "The displayed counts choose one common variant; assonance and alternative copla meters remain in the notes.",
      ],
    },
  ),
  entry(
    "Couplet",
    "und",
    "Two-line verse unit",
    "Two adjacent lines that can balance, answer, complete, or unsettle each other.",
    [
      "Couplets can be rhymed or unrhymed and can be closed or enjambed. This general template does not impose a particular meter.",
    ],
    {
      structure: one(2),
      aliases: ["distich"],
      primarySources: [
        {
          title: "Academy of American Poets — Couplet",
          url: "https://poets.org/glossary/couplet",
        },
      ],
    },
  ),
  technique(
    "Cumulative song",
    "Build each successive verse by adding material while returning to what came before.",
    [
      "Plan the growth and the recurring sequence. Total length is author-selected; a fixed four-verse example would not define the whole technique.",
    ],
  ),
  technique(
    "Cumulative tale",
    "Let a repeated action or phrase accumulate as a story moves forward.",
    [
      "Choose an escalating sequence and a deliberate ending. This narrative technique can appear in prose or song as well as verse.",
    ],
  ),
  entry(
    "Demi-sonnet",
    "en",
    "Modern short-form practice",
    "A seven-line miniature that often turns toward an aphoristic close.",
    [
      "Vary the line lengths deliberately. The final internal full or approximate rhyme described in the surveyed source is not an end-rhyme label.",
    ],
    {
      structure: one(7),
      limitations: ["Internal-rhyme placement requires manual review."],
    },
  ),
  entry(
    "Dialogue sonnet",
    "und",
    "Italian sonnet tradition and later adaptations",
    "Let a sonnet unfold as a conversation between distinct voices.",
    [
      "Choose an underlying sonnet variant separately. Speakers may divide a line, so physical line count can differ from metrical line count.",
    ],
    {
      structure: one(14, "Fourteen-line teaching canvas"),
      status: "guided",
      limitations: [
        "This is a visual line-count scaffold; shared lines and the chosen sonnet’s rhyme plan need manual handling.",
      ],
    },
  ),
  entry(
    "Dinggedicht",
    "de",
    "German-language object poetry",
    "Attend closely to a thing until its particular presence shapes the poem’s language.",
    [
      "Describe or evoke the object rather than merely explaining a personal feeling about it. The form is defined by attention and approach, not a universal meter.",
    ],
    { aliases: ["thing poem", "object poem"] },
  ),
  entry(
    "Dodoitsu",
    "ja",
    "Japanese song-derived poetry",
    "A four-phrase Japanese form with a conventional 7–7–7–5 mora movement.",
    [
      "Love, work, and humor are common subjects. These are Japanese mora targets, not English syllable counts; printed line arrangements can vary.",
    ],
    {
      structure: one(moraic([7, 7, 7, 5]), "Four-phrase teaching layout"),
      limitations: [
        "Mora targets are displayed only; language-aware counting is not implemented.",
      ],
    },
  ),
  tradition(
    "Đường luật",
    "vi",
    "Vietnamese regulated verse with Tang antecedents",
    "A family of regulated forms coordinating line length, tone, rhyme, parallelism, and composition.",
    [
      "The familiar seven-syllable octave is only one variant; five-syllable forms and quatrains also occur. A full template needs a specified variant and Vietnamese tonal constraints.",
    ],
    { aliases: ["Duong luat", "tho duong luat", "regulated Tang verse"] },
  ),
  entry(
    "Égyin",
    "my",
    "Burmese court poetry",
    "A royal address celebrating the ancestry and standing of a young prince or princess.",
    [
      "Distinguish the historical praise-song tradition from an ordinary child’s lullaby. The present record does not prescribe an unverified rhyme lattice.",
    ],
    { aliases: ["egyin", "eigyin"] },
  ),
  concept(
    "Elegiac",
    "A term that can indicate a mournful mode or the use of classical elegiac couplets.",
    [
      "An elegy and an elegiac metrical pattern are not interchangeable definitions. Choose the specific genre or meter you intend.",
    ],
  ),
  entry(
    "Elegiac couplet",
    "grc",
    "Greek and Latin quantitative verse",
    "Pair a dactylic hexameter with a dactylic pentameter.",
    [
      "The displayed quantity sequences are base models: − marks long, u short, and x anceps. Classical substitutions and the pentameter’s central division require specialist scansion.",
    ],
    {
      structure: repeat(
        [
          {
            meter: {
              system: "quantitative",
              quantityPattern: "-uu-uu-uu-uu-uu-x",
              strength: "conventional",
            },
          },
          {
            meter: {
              system: "quantitative",
              quantityPattern: "-uu-uu--uu-uu-",
              strength: "conventional",
            },
          },
        ],
        "Quantitative couplet",
      ),
      limitations: [
        "Quantity is not English stress. Base sequences omit alternatives and explicit caesura positions.",
      ],
    },
  ),
  entry(
    "Elegy",
    "und",
    "Many poetic traditions",
    "Write through loss, mourning, or serious reflection without requiring one inherited stanza.",
    [
      "Choose a subject and speaking situation before a pattern. Modern elegies need not use classical elegiac couplets.",
    ],
  ),
  entry(
    "Elevenie",
    "de",
    "German Elfchen teaching form",
    "Eleven words unfold over five lines in a 1–2–3–4–1 arrangement.",
    [
      "Each line’s thematic instruction can vary between teaching versions. Word count, rather than syllable count, shapes this particular template.",
    ],
    {
      structure: one([1, 2, 3, 4, 1].map((wordCount) => ({ wordCount }))),
      aliases: ["Elfchen", "eleven-word poem"],
    },
  ),
  tradition(
    "Elogium (literary genre)",
    "la",
    "Ancient Roman commemorative writing",
    "An honorific inscription or concise literary memorial for a person who has died.",
    [
      "Historical examples use different meters or prose. Naming, public identity, and commemoration are more stable than a single verse design.",
    ],
    { name: "Elogium" },
  ),
  concept(
    "Emi Omo Eso",
    "A Yoruba warrior ethical code associated with the Eso Ikoyi tradition.",
    [
      "The category includes this cultural topic, but the article does not establish a standalone metrical poem form. It is retained for research completeness without a compose action.",
    ],
    { language: "yo", origin: "Yoruba cultural history", kind: "reference" },
  ),
  concept(
    "Epode",
    "A concluding movement of a choral ode; also a term used for certain paired-line forms.",
    [
      "The term has multiple historical senses. Select the specific choral or epodic model before creating a structural writing template.",
    ],
    { language: "grc", origin: "Ancient Greek and Latin verse" },
  ),
  tradition(
    "Fonnkèr",
    "rcf",
    "Réunion Creole poetry and performance",
    "Give voice to an inward emotional state through spoken, written, or sung Creole poetry.",
    [
      "Natural speech movement and performance can shape the work. Avoid replacing this living tradition with an invented fixed rhyme scheme.",
    ],
    { aliases: ["Fonnker"] },
  ),
  entry(
    "Free verse",
    "en",
    "Many traditions",
    "A flexible poem shaped by deliberate rhythm, image, and line rather than a fixed inherited pattern.",
    [
      "Open form still involves choices about sound, pacing, and line breaks. No rhyme or stanza count is automatically required.",
    ],
    { reuse: "free-verse", aliases: ["open form"] },
  ),
  tradition(
    "Gasa (poetry)",
    "ko",
    "Korean song and verse",
    "An extended Korean sung or recited form organized through patterned phrase movement.",
    [
      "Historical rhythmic units and performance matter. Descriptions of four-unit phrasing should not be flattened into one universal English syllable total.",
    ],
    { name: "Gasa", aliases: ["kasa"] },
  ),
  entry(
    "Glose",
    "es",
    "Spanish glosa and later adaptations",
    "Answer a borrowed quatrain in stanzas that return its lines in sequence.",
    [
      "A common design places four ten-line stanzas after a quoted quatrain, each ending with the corresponding borrowed line. Supply and credit your source text before writing; its reuse is not automatically checked.",
    ],
    {
      aliases: ["glosa", "gloss"],
      structure: fixed(
        block(
          "Borrowed epigraph · four source lines",
          lines(4).map((line, i) => ({
            ...line,
            refrain: ref(`Q${i + 1}`, "define"),
          })),
        ),
        ...Array.from({ length: 4 }, (_, i) =>
          block(
            `Answering stanza ${i + 1}`,
            lines(10).map((line, j) => ({
              ...line,
              ...(j === 9 ? { refrain: ref(`Q${i + 1}`, "repeat") } : {}),
            })),
          ),
        ),
      ),
      status: "guided",
      limitations: [
        "This particular layout includes the four-line epigraph in addition to forty new lines. Rhyme and source-text reuse need manual review.",
      ],
    },
  ),
  entry(
    "Gogyōshi",
    "ja",
    "Modern Japanese five-line poetry",
    "A titled poem of five lines with an open rhythm.",
    [
      "This template selects the contemporary unrestricted form. The earlier syllabic model is a different historical variant. Remember to give the poem a title.",
    ],
    { structure: one(5), aliases: ["Gogyoshi"] },
  ),
  technique(
    "Golden shovel",
    "End each line with the next word of a chosen source passage.",
    [
      "Keep the borrowed words in their original order while making a new poem. Identify and credit the source. The number of source words determines the number of lines.",
    ],
    {
      origin: "Terrance Hayes · contemporary American poetry",
      language: "en",
      aliases: ["golden-shovel poem"],
    },
  ),
  entry(
    "Haiku",
    "ja",
    "Japanese haiku and international adaptations",
    "Focus a brief poem through a moment, juxtaposition, and often a seasonal reference.",
    [
      "Traditional Japanese 5–7–5 counts morae, not English syllables. Contemporary work and printed line arrangements vary; use the separately labeled 5–7–5 practice template for that English exercise.",
    ],
    {
      aliases: ["hokku", "haijin"],
      variants: ["haiku-575"],
      primarySources: [
        {
          title: "The Haiku Foundation — Line and syllable count",
          url: "https://thehaikufoundation.org/some-thoughts-on-line-and-syllable-count-in-english-language-haiku/",
        },
      ],
    },
  ),
  tradition(
    "Hainteny",
    "mg",
    "Merina and wider Malagasy oral literature",
    "Work through metaphor, allusion, proverbs, and the exchange of verbal insight.",
    [
      "The oral and social setting is part of the practice. Do not infer a universal line count from a translated example.",
    ],
  ),
  entry(
    "Hayren",
    "hy",
    "Armenian folk and literary poetry",
    "A quatrain commonly described as four fifteen-syllable lines.",
    [
      "Each line is conventionally divided 7 + 8. The internal division and Armenian performance require manual review; subject matter may range beyond love.",
    ],
    {
      structure: one(syllabic([15, 15, 15, 15])),
      limitations: [
        "Only whole-line syllable targets are serialized; 7 + 8 divisions remain descriptive.",
      ],
    },
  ),
  concept(
    "Hemistich",
    "A half-line or major portion of a metrical line, often marked by a caesura.",
    [
      "Definitions and uses differ across languages. Two visible half-lines do not necessarily constitute a two-line poem.",
    ],
  ),
];

// Linked-line identities expand to ordinary declarative refrain definitions.
function linkedStanzas(patterns, schemes = []) {
  const defined = new Set();
  return fixed(
    ...patterns.map((pattern, stanzaIndex) =>
      block(
        `Stanza ${stanzaIndex + 1}`,
        pattern.map((id, index) => {
          const role = defined.has(id) ? "repeat" : "define";
          defined.add(id);
          return {
            refrain: ref(id, role),
            ...(schemes[stanzaIndex]
              ? { rhyme: schemes[stanzaIndex][index] }
              : {}),
          };
        }),
      ),
    ),
  );
}

definitions.push(
  entry(
    "Heroic couplet",
    "en",
    "English narrative and satirical verse",
    "Two rhyming iambic pentameter lines form a poised, often pointed unit.",
    [
      "This repeatable couplet uses five iambic feet per line. Enjambment and metrical substitutions remain possible; closure is a stylistic choice.",
    ],
    {
      structure: repeat(rhymed("AA", [iamb(5), iamb(5)]), "Heroic couplet"),
      primarySources: [
        {
          title: "Harvard — Guide to poetic terms",
          url: "https://poetry.harvard.edu/guide-poetic-terms",
        },
      ],
    },
  ),
  entry(
    "Hudibrastic",
    "en",
    "English mock-heroic and satirical verse",
    "Rhyming tetrameter couplets make room for comic or deliberately strained endings.",
    [
      "AA BB couplets and an underlying iambic four-beat line are the model. Feminine and surprising rhymes often form part of the satire.",
    ],
    {
      structure: repeat(rhymed("AA", [iamb(4), iamb(4)]), "Satirical couplet"),
      aliases: ["hudibrastics"],
    },
  ),
  concept(
    "Humdrum and Harum-Scarum",
    "Robert Bridges’s essay on free verse and poetic constraint.",
    [
      "This is a critical essay, not a poem form. It remains searchable as a research reference.",
    ],
    {
      kind: "reference",
      language: "en",
      origin: "Robert Bridges · 1922 criticism",
    },
  ),
  tradition(
    "Ibitekerezo",
    "rw",
    "Rwandan royal oral literature",
    "Epic heroic narratives carrying histories of dynasties and public memory.",
    [
      "Select and study an attested performance before assigning verse constraints. This is a culturally specific oral tradition, not a generic heroic couplet exercise.",
    ],
  ),
  tradition(
    "Ìjálá",
    "yo",
    "Yoruba hunters’ praise and chant traditions",
    "A performed verbal art associated with hunters, Ogun, and praise.",
    [
      "Voice, occasion, and relationship to oríkì matter. A regular English syllable scheme would not adequately specify this tradition.",
    ],
    { aliases: ["Ijala", "Ìjálá chant"] },
  ),
  tradition(
    "Izibongo",
    "zu",
    "Southern African praise-poetry traditions",
    "Public oral poetry that can celebrate, characterize, or criticize its subjects.",
    [
      "Praise is not the only function of izibongo. Study language, performance, and context rather than substituting one universal stanza.",
    ],
    { aliases: ["praise poetry"] },
  ),
  tradition(
    "Jangnama",
    "mul",
    "Persian-influenced South and Central Asian literatures",
    "An epic or heroic poetic account often concerned with battles and conflict.",
    [
      "Usage varies by language and period. Choose a particular literary model before specifying meter or stanza structure.",
    ],
    { aliases: ["jang nama", "jangnamah"] },
  ),
  tradition(
    "Javanese poetry",
    "jv",
    "Java · sung literary traditions",
    "A family of sung poetic systems including large, middle, and macapat forms.",
    [
      "Individual meters govern line counts, syllables, and ending vowels. The umbrella label is not one template; specific macapat and other patterns need separate research.",
    ],
    { aliases: ["tembang", "sekar", "macapat"] },
  ),
  entry(
    "Kagyin",
    "my",
    "Burmese martial song",
    "A performed martial poem associated with shield dance and collective spirit.",
    [
      "Study its sung movement and a particular composition. The surveyed evidence does not support a single universal line-count prescription.",
    ],
  ),
  tradition(
    "Kanshi (poetry)",
    "zh",
    "Chinese-language poetry composed in Japan",
    "Chinese poetic forms written or received in a Japanese literary setting.",
    [
      "Kanshi includes several forms. Select the Chinese metrical and tonal pattern first rather than treating all kanshi as a haiku-like count.",
    ],
    { name: "Kanshi", aliases: ["漢詩"] },
  ),
  tradition(
    "Kantan Chamorrita",
    "ch",
    "Chamoru traditions of the Mariana Islands",
    "An improvised sung exchange that answers, challenges, or develops another voice.",
    [
      "The dialogic and musical context is essential. Study a specific performance and its linguistic rhyme practices before assigning fixed rules.",
    ],
    { aliases: ["Kantan Chamorrita", "Chamorrita"] },
  ),
  tradition(
    "Kidung",
    "jv",
    "Old and Middle Javanese literary song",
    "Narrative poetry using Javanese meters rather than the Sanskrit-derived kakawin system.",
    [
      "Historical romance and Panji narratives are important contexts. A particular metrical pattern is needed before creating a strict template.",
    ],
  ),
  technique(
    "Kishōtenketsu",
    "Develop a subject through introduction, development, a turn, and connection or resolution.",
    [
      "These are rhetorical movements rather than four mandatory physical lines. The structure can organize poetry and other narratives; conflict is neither required nor forbidden.",
    ],
    {
      origin: "East Asian narrative and rhetorical traditions",
      aliases: ["Kishotenketsu", "ki sho ten ketsu"],
    },
  ),
  entry(
    "Kural (poetic form)",
    "ta",
    "Classical Tamil veṇpā prosody",
    "A compact Tamil couplet with four metrical feet followed by three.",
    [
      "Cīr are metrical units and must not be simplified into four and three ordinary whitespace words. Veṇpā rules govern the permitted units, joins, and final foot.",
    ],
    {
      name: "Kural",
      structure: one(2, "Four-foot line and three-foot line"),
      status: "guided",
      aliases: ["kural venpa", "kuṟaḷ", "cīr"],
      limitations: [
        "Only the two-line canvas is represented; Tamil prosody needs a dedicated constraint model.",
      ],
    },
  ),
  entry(
    "Landay (poetry)",
    "ps",
    "Pashto oral poetry · Afghanistan",
    "A short, forceful couplet with a conventional nine-syllable line followed by thirteen.",
    [
      "Themes can include love, separation, war, and homeland. Pashto rhythm and performance are not assessed by an English pronunciation model.",
    ],
    { name: "Landay", structure: one(syllabic([9, 13])) },
  ),
  entry(
    "Lanterne (poem)",
    "en",
    "Modern visual syllabic practice",
    "Five lines make a small lantern shape with counts 1–2–3–4–1.",
    [
      "Each line can carry a compact image. Centered typesetting is a presentation choice and is not applied to the Markdown source automatically.",
    ],
    {
      name: "Lanterne",
      structure: one(syllabic([1, 2, 3, 4, 1])),
      aliases: ["lantern poem"],
    },
  ),
  entry(
    "Limerick (poetry)",
    "en",
    "English-language comic verse",
    "Five bouncing lines return to an AABBA rhyme.",
    [
      "Lines 1, 2, and 5 conventionally carry three strong beats; 3 and 4 carry two. Upbeats and unstressed endings vary, so a single rigid syllable total is not imposed.",
    ],
    {
      name: "Limerick",
      structure: one(
        rhymed("AABBA", [beats(3), beats(3), beats(2), beats(2), beats(3)]),
      ),
      primarySources: [
        {
          title: "Academy of American Poets — Limerick",
          url: "https://poets.org/glossary/limerick",
        },
      ],
    },
  ),
  entry(
    "Lục bát",
    "vi",
    "Vietnamese vernacular verse",
    "Alternating six- and eight-syllable lines connect through internal rhyme and tonal pattern.",
    [
      "The six-syllable line ending rhymes with syllable six of the following eight-syllable line; that line’s ending links onward. Bằng/trắc tone positions and Vietnamese syllables need language-aware review.",
    ],
    {
      structure: repeat(syllabic([6, 8]), "Six–eight pair"),
      status: "guided",
      aliases: ["luc bat", "six eight"],
      limitations: [
        "Line lengths are modeled; cross-pair internal-rhyme chains and tonal rules are described, not validated.",
      ],
    },
  ),
  entry(
    "Lutherstrophe",
    "de",
    "Occitan, Minnesang, and German hymn traditions",
    "A seven-line song stanza combining alternating rhyme with a couplet and closing line.",
    [
      "This teaching variant uses ABABCCB. The last line can instead remain unrhymed; historical syllable lengths and iambic endings vary between songs.",
    ],
    {
      structure: repeat(rhymed("ABABCCB"), "Seven-line rhyme variant"),
      limitations: [
        "Select the exact hymn or lyric before assigning line lengths.",
      ],
    },
  ),
  entry(
    "Mawgun",
    "my",
    "Burmese commemorative poetry",
    "Record an event so that its significance can endure.",
    [
      "Identify the event, perspective, and commemorative purpose. A specific Burmese composition is needed to establish its sound and rhyme design.",
    ],
  ),
  tradition(
    "Modernist poetry",
    "mul",
    "International literary modernisms",
    "A collection of movements that reconsider poetic voice, form, perception, and tradition.",
    [
      "Modernism is a historical and artistic grouping, not one meter. Formal and open verse both occur within it.",
    ],
  ),
  entry(
    "Monostich",
    "und",
    "Single-line poetry",
    "Give one line the weight and completeness of a whole poem.",
    [
      "A title may add another dimension without becoming a second body line. No universal meter or end rhyme is required.",
    ],
    { structure: one(1) },
  ),
  tradition(
    "Muwashshah",
    "ar",
    "Al-Andalus · Arabic and Hebrew strophic song",
    "A strophic lyric intertwining changing sections, returning material, and a final kharja.",
    [
      "Arabic and Hebrew examples and musical traditions differ. Select a particular model before fixing the divisions, metrical scheme, and rhyme pattern.",
    ],
    { aliases: ["muwaššaḥ", "muwashshaha", "muwashahat"] },
  ),
  entry(
    "Octonary",
    "und",
    "Eight-line verse unit",
    "An eight-line section or poem, including historical song and psalm arrangements.",
    [
      "The line count alone does not dictate meter or rhyme. Specific French octonaire song patterns require a separate named variant.",
    ],
    { structure: one(8), aliases: ["octonaire"] },
  ),
  entry(
    "Ode",
    "und",
    "Greek origins and later international lyric traditions",
    "Address or contemplate a subject with sustained lyric attention.",
    [
      "Pindaric, Horatian, and irregular odes organize their movements differently. Choose a subtype before imposing a stanza pattern.",
    ],
  ),
  tradition(
    "Oríkì",
    "yo",
    "Yoruba praise and naming traditions",
    "Poetic naming and characterization that evoke persons, lineages, places, or powers.",
    [
      "Listen to a particular tradition and performance. Praise, identity, allusion, and cultural knowledge are not captured by one fixed line count.",
    ],
    { aliases: ["Oriki", "oriki praise"] },
  ),
  entry(
    "Palinode",
    "und",
    "Greek origins and later recantation poems",
    "Return to an earlier claim and retract, revise, or transform it.",
    [
      "Let the earlier position and the new response remain legible. Palinode describes the relationship between statements, not a fixed meter.",
    ],
    { aliases: ["palinody", "recantation poem"] },
  ),
  entry(
    "Pantoum",
    "en",
    "French and English adaptations of Malay linked pantun",
    "Returning lines change their meaning as they move through interwoven quatrains.",
    [
      "This selected four-stanza version repeats lines 2 and 4 as lines 1 and 3 of the next stanza, then closes with opening lines 3 and 1. Longer and differently closed versions also occur; rhyme is not compulsory in every modern adaptation.",
    ],
    {
      name: "Pantoum · four-stanza practice",
      structure: linkedStanzas([
        ["L1", "L2", "L3", "L4"],
        ["L2", "L5", "L4", "L6"],
        ["L5", "L7", "L6", "L8"],
        ["L7", "L3", "L8", "L1"],
      ]),
      aliases: ["linked quatrains"],
      primarySources: [
        {
          title: "Poetry Archive — Pantoum",
          url: "https://poetryarchive.org/glossary/pantoum/",
        },
      ],
    },
  ),
  entry(
    "Paradelle",
    "en",
    "Billy Collins · modern invented form",
    "Repeated lines become a word bank that later stanzas rearrange.",
    [
      "Four six-line stanzas form the canvas. In the first three, line 2 repeats 1 and line 4 repeats 3; lines 5–6 rearrange the source words. The final stanza reuses the poem’s earlier vocabulary. The supposed medieval origin was part of Collins’s parody.",
    ],
    {
      structure: fixed(
        ...Array.from({ length: 3 }, (_, i) =>
          block(`Source stanza ${i + 1}`, [
            { refrain: ref(`S${i + 1}A`, "define") },
            { refrain: ref(`S${i + 1}A`, "repeat") },
            { refrain: ref(`S${i + 1}B`, "define") },
            { refrain: ref(`S${i + 1}B`, "repeat") },
            {},
            {},
          ]),
        ),
        block("Final rearrangement", 6),
      ),
      status: "guided",
      limitations: [
        "The core word-multiset constraints are not serialized or checked automatically.",
      ],
    },
  ),
  entry(
    "Pathya Vat",
    "km",
    "Khmer verse and recitation",
    "Quatrains of four-syllable lines connect through both local and cross-stanza rhyme.",
    [
      "Within a stanza, lines 2 and 3 rhyme. In a longer poem, the previous stanza’s last line supplies their rhyme. Performance styles vary.",
    ],
    {
      structure: repeat(syllabic([4, 4, 4, 4]), "Four-syllable quatrain"),
      status: "guided",
      limitations: [
        "The inter-stanza link is described rather than replaced with an incorrect end-rhyme-only scheme.",
      ],
    },
  ),
  concept(
    "Pentameter",
    "A metrical designation involving five feet, with different meanings in different prosodies.",
    [
      "English iambic pentameter uses stress; classical quantitative pentameter uses syllable quantity and a particular divided design. The term alone is not a complete poem template.",
    ],
  ),
  entry(
    "Pentina",
    "en",
    "Leigh Harrison · modern sestina-related form",
    "Five end-words rotate through five quintains and a two-line envoi.",
    [
      "End-word orders are ABCDE / EADBC / CEBAD / DCAEB / BDECA. This envoi variant places A and B within its first line ending C, then D inside the second ending E.",
    ],
    {
      structure: fixed(
        ...["ABCDE", "EADBC", "CEBAD", "DCAEB", "BDECA"].map((scheme, i) =>
          block(
            `Quintain ${i + 1}`,
            [...scheme].map((endWord) => ({ endWord })),
          ),
        ),
        block("Two-line envoi · one pairing variant", [
          { endWord: "C", containsEndWords: ["A", "B"] },
          { endWord: "E", containsEndWords: ["D"] },
        ]),
      ),
      limitations: [
        "The source’s prose contains a second/third-line typo; its two-line diagram is used here. Meter is not imposed without stronger specification.",
      ],
    },
  ),
  technique(
    "Persona poetry",
    "Let an invented or adopted speaker carry the poem’s perspective.",
    [
      "Distinguish the speaker from the author. Choose diction, knowledge, and circumstances that make the voice coherent; no single meter is inherent.",
    ],
    { aliases: ["persona poem", "dramatic monologue"] },
  ),
  concept(
    "Poetic closure",
    "The sense of ending created by a poem’s structure, sound, or subject.",
    [
      "Closure may complete a pattern, alter it, or deliberately resist finality. It is a craft concept, not a fixed stanza form.",
    ],
  ),
  concept(
    "Poetic Meter and Poetic Form",
    "Paul Fussell’s critical reference book on prosody and form.",
    [
      "This category member is a book. It is retained as a reading reference, not converted into a writing template.",
    ],
    {
      kind: "reference",
      language: "en",
      origin: "Paul Fussell · literary criticism",
    },
  ),
  entry(
    "Pyo",
    "my",
    "Burmese classical narrative verse",
    "A major Burmese verse tradition used for sustained narrative and literary adaptation.",
    [
      "Study a particular pyo’s syllables and linked rhyme before prescribing a generic layout. The current record provides a guided writing space only.",
    ],
  ),
  technique(
    "Quaternion (poetry)",
    "Organize a theme into four related parts.",
    [
      "The four parts are thematic movements, not necessarily four lines or four equal stanzas. Choose the subjects and relationships before selecting a meter.",
    ],
    { name: "Quaternion" },
  ),
  entry(
    "Quatorzain",
    "und",
    "Fourteen-line poetry",
    "A fourteen-line poem whose design need not follow a recognized sonnet pattern.",
    [
      "This canvas fixes the number of lines without inventing a rhyme scheme. The historical relationship between quatorzain and sonnet terminology is not uniform.",
    ],
    { structure: one(14), aliases: ["fourteen-line poem"] },
  ),
  entry(
    "Quintain (poetry)",
    "und",
    "Five-line verse unit",
    "A general five-line unit rather than one particular rhyme or syllable scheme.",
    [
      "A tanka, limerick, or specific cinquain adds rules beyond this general designation.",
    ],
    { name: "Quintain", structure: one(5), aliases: ["pentastich", "quintet"] },
  ),
  entry(
    "Quintilla (poetry)",
    "es",
    "Spanish stanza · ABAAB variant",
    "Five octosyllabic lines use two rhymes and a balanced closing movement.",
    [
      "This template selects ABAAB. Other accepted schemes differ; avoid three identical consecutive rhymes and a final rhyming couplet. Spanish poetic counting includes conventions beyond English syllable counting.",
    ],
    {
      name: "Quintilla · ABAAB",
      structure: repeat(
        rhymed("ABAAB").map((line) => ({
          ...line,
          meter: { system: "syllabic", syllables: 8, strength: "conventional" },
        })),
      ),
    },
  ),
  entry(
    "Ragale",
    "kn",
    "Kannada prosody",
    "A Kannada metrical family organized through patterned mātrā groups.",
    [
      "Lalita, Mandānila, and Utsāha ragale are distinct variants. A line’s weight groups should not be flattened into a fixed count of English syllables.",
    ],
    { aliases: ["Ragaḷe", "ragala"] },
  ),
  technique(
    "Retrograde verse",
    "Construct lines that remain viable when read backwards word by word.",
    [
      "Check grammar, meter, and sense in both directions. This differs from reversing only the order of complete lines.",
    ],
  ),
  technique(
    "Reversible poem",
    "Let a backward reading reveal a second perspective or meaning.",
    [
      "Choose what reverses: line order, words, or another unit. The app preserves your lineation but does not automatically verify the second reading.",
    ],
    { aliases: ["reverso", "reverse poem", "palindrome poem"] },
  ),
  entry(
    "Rhyme royal",
    "en",
    "English and Scots literary stanza",
    "A seven-line ABABBCC stanza, conventionally in iambic pentameter.",
    [
      "The final couplet can sharpen or settle the stanza’s argument. Meter and syntax allow expressive variation.",
    ],
    {
      structure: repeat(
        rhymed(
          "ABABBCC",
          Array.from({ length: 7 }, () => iamb(5)),
        ),
      ),
      aliases: ["rime royal", "rime royale"],
      primarySources: [
        {
          title: "Poetry Foundation — Rhyme royal",
          url: "https://www.poetryfoundation.org/education/glossary/rhyme-royal-rime-royale",
        },
      ],
    },
  ),
  entry(
    "Rondel (poem)",
    "fr",
    "French lyric · thirteen-line variant",
    "Two rhymes and returning opening lines weave through three stanzas.",
    [
      "This variant uses ABBA / ABAB / ABBAA. The opening two lines return as lines 7–8, and line 1 returns at line 13. A fourteen-line version repeats both at the end; other historical designs exist.",
    ],
    {
      name: "Rondel · thirteen-line variant",
      structure: linkedStanzas(
        [
          ["R1", "R2", "L3", "L4"],
          ["L5", "L6", "R1", "R2"],
          ["L9", "L10", "L11", "L12", "R1"],
        ],
        ["ABBA", "ABAB", "ABBAA"],
      ),
    },
  ),
  entry(
    "Roundel (poetry)",
    "en",
    "Swinburne’s English roundel",
    "Nine full lines and two shorter refrains form an eleven-line whole.",
    [
      "The pattern is ABA plus refrain / BAB / ABA plus refrain. The refrain repeats the opening fragment of line 1 and rhymes with B. Unlike a rondel, it is not a thirteen-line form.",
    ],
    {
      name: "Roundel",
      structure: fixed(
        block(
          "Opening with short refrain",
          rhymed("ABAB").map((line, i) => ({
            ...line,
            ...(i === 3 ? { refrain: ref("R", "define") } : {}),
          })),
        ),
        block("Middle tercet", rhymed("BAB")),
        block(
          "Closing with short refrain",
          rhymed("ABAB").map((line, i) => ({
            ...line,
            ...(i === 3 ? { refrain: ref("R", "repeat") } : {}),
          })),
        ),
      ),
      limitations: [
        "The refrain’s relationship to the opening fragment needs manual review; it is not a whole-line repeat of line 1.",
      ],
    },
  ),
  tradition(
    "Rune poem",
    "mul",
    "Germanic runic mnemonic traditions",
    "Use an alphabet sequence to carry compact names, images, and cultural associations.",
    [
      "Select a particular runic alphabet and historical tradition. Different alphabets have different lengths, and surviving rune poems have different verse patterns.",
    ],
  ),
  tradition(
    "Sentimental ballad",
    "en",
    "Popular song traditions",
    "A song-centered lyric shaped around an emotional or intimate subject.",
    [
      "The musical genre does not require the traditional literary ballad quatrain. Choose a song structure deliberately rather than inheriting ABCB automatically.",
    ],
  ),
  tradition(
    "Sesotho poetry",
    "st",
    "Basotho oral and written literature",
    "Poetry in Sesotho, encompassing both longstanding oral practices and written forms.",
    [
      "The language or tradition is not itself a single form. Use a particular poet, performance, or genre to establish the intended structure.",
    ],
  ),
  entry(
    "Sestet",
    "und",
    "Six-line verse unit",
    "A six-line stanza or complete poem with room for many rhyme patterns.",
    [
      "A sonnet’s closing sestet is a particular use of the unit. This general canvas imposes neither one rhyme order nor a universal meter.",
    ],
    { structure: one(6) },
  ),
  entry(
    "Sestina",
    "en",
    "Occitan origins and later international adaptations",
    "Six end-words rotate through six sestets and meet again in an envoi.",
    [
      "Use the existing six-stanza permutation and the documented envoi pairing. End-word identities are distinct from phonetic rhyme.",
    ],
    { reuse: "sestina", aliases: ["sestine", "sextine", "sextain"] },
  ),
  entry(
    "Shadorma",
    "und",
    "Modern circulating syllabic form · historical origin uncertain",
    "A six-line syllabic sequence moves through 3–5–3–3–7–5.",
    [
      "One stanza can stand alone, or several can form a series. The frequently repeated Spanish-origin claim needs stronger historical evidence.",
    ],
    {
      structure: repeat(syllabic([3, 5, 3, 3, 7, 5])),
      limitations: [
        "The syllable pattern is usable as a practice definition; provenance remains uncertain.",
      ],
    },
  ),
  tradition(
    "Shahr Ashob",
    "ur",
    "Persian, Urdu, and related urban lament traditions",
    "Write through a city’s upheaval and the social changes felt by its inhabitants.",
    [
      "Historical examples and stanza arrangements vary. Descriptions of one five-line pattern should not be generalized to every shahr ashob.",
    ],
    { aliases: ["Shahr-i Ashob", "Shahrashub", "Shahar-i Ashub"] },
  ),
  entry(
    "Shairi",
    "ka",
    "Georgian verse · Rustavelian quatrain",
    "Four sixteen-syllable lines share a rhyme and an internal eight-plus-eight division.",
    [
      "Different high and low shairi organize the halves differently. Georgian stress should not be equated with strong English iambs.",
    ],
    {
      structure: one(
        rhymed("AAAA").map((line) => ({
          ...line,
          meter: {
            system: "syllabic",
            syllables: 16,
            strength: "conventional",
          },
        })),
      ),
      aliases: ["Rustavelian quatrain"],
      limitations: [
        "The internal division and subtype rhythms remain descriptive.",
      ],
    },
  ),
  tradition(
    "Sigweya",
    "luo",
    "Luo spoken praise and commemoration",
    "A solo spoken performance that characterizes and honors a person or community.",
    [
      "Funerals are an important setting, but performances also address living people at other occasions. No universal stanza count is established here.",
    ],
  ),
  entry(
    "Silva (poetry)",
    "es",
    "Spanish literary verse",
    "Let seven- and eleven-syllable lines vary in order and extent.",
    [
      "Line order, rhyme distribution, and total length are not fixed. Choose each line’s target deliberately; this template does not impose a false alternating pattern.",
    ],
    { name: "Silva" },
  ),
  entry(
    "Simple 4-line",
    "en",
    "Popular verse and song practice",
    "A repeatable quatrain connects its second and fourth lines by rhyme.",
    [
      "ABCB is a conventional description; this template leaves the odd lines unconstrained rather than requiring them to differ. No particular meter is imposed.",
    ],
    {
      structure: repeat(rhymed("_A_A")),
      aliases: ["simple four-line", "ABCB quatrain"],
    },
  ),
  tradition(
    "Sisindiran",
    "su",
    "Sundanese allusive verse",
    "An outer image or cover prepares an inner meaning through sound correspondence.",
    [
      "Paparikan and other related types differ. Choose the precise type before treating four octosyllabic lines as universal.",
    ],
    { aliases: ["susualan", "paparikan", "cangkang eusi"] },
  ),
  tradition(
    "Skolion",
    "grc",
    "Ancient Greek banquet song",
    "An occasional song that can answer or cap the contribution of another singer.",
    [
      "Improvisation, wit, and the shared performance shape the composition. A particular ancient metrical model is needed for quantitative constraints.",
    ],
    { aliases: ["scolion", "skolia", "scolia"] },
  ),
  technique(
    "Slavic antithesis",
    "Pose possible explanations, reject them, then reveal what the scene really means.",
    [
      "Use the question–negation–revelation movement to delay recognition. These are rhetorical parts, not three mandatory physical lines.",
    ],
    { origin: "South Slavic epic traditions" },
  ),
  entry(
    "Song thất lục bát",
    "vi",
    "Vietnamese verse",
    "A seven-seven-six-eight unit links its lines through tone and internal rhyme.",
    [
      "The two seven-syllable lines precede a lục bát pair. Rhyme can land inside a line, and bằng/trắc positions are essential to a complete native specification.",
    ],
    {
      structure: repeat(syllabic([7, 7, 6, 8])),
      status: "guided",
      aliases: ["song that luc bat", "double seven six eight"],
      limitations: [
        "Line lengths are modeled; internal rhyme, tonal positions, and cross-stanza connections require manual review.",
      ],
    },
  ),
  entry(
    "Sonnet",
    "und",
    "Sicilian origins and international sonnet traditions",
    "A fourteen-line lyric tradition with several established rhyme and rhetorical designs.",
    [
      "Choose a named subtype for a complete scheme: Shakespearean, Petrarchan, Spenserian, and other variants differ. The general canvas deliberately does not impose the English pattern on all sonnets.",
    ],
    {
      structure: one(14),
      status: "guided",
      primarySources: [
        {
          title: "Academy of American Poets — Sonnet",
          url: "https://poets.org/glossary/sonnet",
        },
      ],
      variants: ["shakespearean-sonnet"],
    },
  ),
  concept(
    "Stanza",
    "A grouping of verse lines marked by spacing, pattern, or another organizing relationship.",
    [
      "A stanza is a structural unit that can take many forms. Its name alone supplies no mandatory number of lines.",
    ],
  ),
  concept(
    "Stichic",
    "Verse that proceeds line after line without stanza divisions.",
    [
      "The term describes arrangement and continuity, not one specific meter or total length. Blank verse is often stichic.",
    ],
  ),
  technique(
    "Stichomythia",
    "Exchange brief lines between dramatic speakers to sharpen pace and opposition.",
    [
      "Single-line turns are typical, while half-line and two-line variants also exist. Speaker turns and metrical lines need separate representation.",
    ],
  ),
  concept(
    "Strophe",
    "A movement of a choral ode or, more broadly, a grouped division of verse.",
    [
      "In a Greek choral design it precedes the antistrophe and epode. The term does not identify one universally repeatable stanza pattern.",
    ],
  ),
  technique(
    "Synchysis",
    "Interweave or scatter sentence elements to make their relationships felt.",
    [
      "Plan how corresponding words cross or interrupt each other. This rhetorical technique does not prescribe a poem’s stanza count or meter.",
    ],
  ),
  entry(
    "Tail rhyme",
    "en",
    "Medieval French and English stanza families",
    "Shorter returning lines form tails among longer lines.",
    [
      "Tail rhyme is a construction principle with several patterns. The separately available Standard Habbie is one subtype; no single eight-line scheme defines the whole family.",
    ],
  ),
  entry(
    "Tanaga",
    "tl",
    "Philippine Tagalog verse",
    "A compact quatrain of seven-syllable lines.",
    [
      "Rhyme arrangements vary, including monorhyme and paired or alternating rhymes. This general count template does not silently choose one for all tanaga.",
    ],
    { structure: one(syllabic([7, 7, 7, 7])) },
  ),
  entry(
    "Tanka in English",
    "en",
    "English-language adaptations of Japanese tanka",
    "A five-line lyric that can turn between image and personal response.",
    [
      "English-language tanka need not use 5–7–5–7–7 English syllables. Japanese mora counts and English syllables are not equivalent.",
    ],
    {
      structure: one(5),
      aliases: ["English tanka"],
      primarySources: [
        {
          title: "Poetry Archive — Tanka",
          url: "https://poetryarchive.org/glossary/tanka/",
        },
      ],
    },
  ),
  entry(
    "Tercet",
    "und",
    "Three-line verse unit",
    "A three-line stanza or short poem with no single compulsory sound pattern.",
    [
      "Terza rima, haiku practice, and other three-line designs add their own constraints. This generic canvas prescribes only line count.",
    ],
    { structure: one(3), aliases: ["triplet"] },
  ),
  entry(
    "Terzanelle",
    "en",
    "Modern villanelle and terza-rima hybrid",
    "Five tercets and a quatrain pass their middle lines forward as refrains.",
    [
      "This selected closing arrangement is fA1FA2. Earlier middle lines recur as the next stanza’s third line; opening lines 1 and 3 return in the final quatrain. An alternate final-couplet arrangement also exists.",
    ],
    {
      structure: linkedStanzas(
        [
          ["A1", "B1", "A2"],
          ["B2", "C1", "B1"],
          ["C2", "D1", "C1"],
          ["D2", "E1", "D1"],
          ["E2", "F1", "E1"],
          ["F2", "A1", "F1", "A2"],
        ],
        ["ABA", "BCB", "CDC", "DED", "EFE", "FAFA"],
      ),
    },
  ),
  entry(
    "Tetractys",
    "en",
    "Ray Stebbing · modern syllabic poetry",
    "Five lines grow through 1–2–3–4 syllables before a ten-syllable close.",
    [
      "This entry uses the poetry section of the source, not the geometric or mystical figure bearing the same name. Its total is twenty syllables.",
    ],
    {
      name: "Tetractys · syllabic poem",
      structure: one(syllabic([1, 2, 3, 4, 10])),
    },
  ),
  tradition(
    "Thai poetry",
    "th",
    "Thai literary and oral traditions",
    "A range of systems including khlong, chan, kap, klon, and rai.",
    [
      "Different types coordinate syllables, tones, rhyme positions, or quantity. Select a specific Thai form before turning the family into a structural template.",
    ],
    { aliases: ["khlong", "chan", "kap", "klon", "rai"] },
  ),
  entry(
    "Thanbauk (poetic form)",
    "my",
    "Burmese epigrammatic verse",
    "Three four-syllable lines carry a descending internal-rhyme chain.",
    [
      "The rhyme falls on syllable 4 of line 1, syllable 3 of line 2, and syllable 2 of line 3. These are internal positions, not three identical end rhymes.",
    ],
    {
      name: "Thanbauk",
      structure: one(
        syllabic([4, 4, 4]).map((line, i) => ({
          ...line,
          internalRhymes: [{ group: "A", syllable: 4 - i }],
        })),
      ),
      aliases: ["thanbauk", "thanbauk epigram"],
      limitations: [
        "Internal-rhyme targets are serialized and displayed; phonetic matching is not implemented.",
      ],
    },
  ),
  concept(
    "Tornada (Occitan literary term)",
    "A shorter closing stanza used to send, dedicate, or turn a lyric.",
    [
      "Its size and sound pattern depend on the larger poem. Related terms include envoi, congedo, and finda; this entry does not impose a universal three-line ending.",
    ],
    {
      name: "Tornada",
      language: "oc",
      origin: "Occitan troubadour lyric",
      aliases: ["congedo", "finda", "envoi"],
    },
  ),
  entry(
    "Trova (poetry)",
    "pt",
    "Portuguese and Brazilian popular verse",
    "A concise four-line poem in seven-syllable lines, with a rhyme connection at least between lines 2 and 4.",
    [
      "Other rhyme arrangements can occur. Portuguese poetic syllable conventions, including the treatment of final stress, need native-language review.",
    ],
    {
      name: "Trova",
      structure: one(
        rhymed("_A_A").map((line) => ({
          ...line,
          meter: { system: "syllabic", syllables: 7, strength: "conventional" },
        })),
      ),
    },
  ),
  entry(
    "Tuyugh",
    "chg",
    "Classical Turkic poetry · Central Asia",
    "A classical Turkic lyric form associated with poets writing in Chaghatay.",
    [
      "The surveyed article identifies the tradition but does not supply a reliable complete rule set. Verify a source on its meter and wordplay before imposing constraints.",
    ],
    {
      aliases: ["tuyug", "tuyuk"],
      limitations: [
        "Source coverage is too thin for a strict stanza and meter prescription.",
      ],
    },
  ),
  tradition(
    "Tweede Asem",
    "af",
    "Afrikaans literary history",
    "The “Second Breath” phase of Afrikaans poetry and its changing subjects.",
    [
      "This denotes a literary period and grouping rather than a single writing form. It remains a searchable historical reference.",
    ],
    { status: "reference", aliases: ["Twintigers", "Second Breath"] },
  ),
  concept(
    "Ubwiiru",
    "A sacred royal code encompassing ritual knowledge, songs, and customary practice.",
    [
      "The category contains this cultural topic, but it does not define one standalone poem template. It is retained as a contextual reference.",
    ],
    {
      language: "rw",
      origin: "Rwandan royal traditions",
      kind: "reference",
      aliases: ["ubwiru"],
    },
  ),
  technique(
    "Verbless poetry",
    "Shape a poem without verbs and explore what images can imply on their own.",
    [
      "Nouns, modifiers, and juxtaposition can suggest movement without explicit verbs. Grammatical checking is language-specific and currently manual.",
    ],
    { aliases: ["verbless poem"] },
  ),
  entry(
    "Vers libre",
    "fr",
    "French free verse and related open-form traditions",
    "Open verse shaped without a single mandatory inherited meter or rhyme pattern.",
    [
      "The category entry redirects to free verse. It is retained with its own searchable name and source mapping; it does not create a second set of fixed constraints.",
    ],
    { aliases: ["free verse", "vers-libre"] },
  ),
  entry(
    "Verso sciolto",
    "it",
    "Italian unrhymed hendecasyllables",
    "Italian eleven-syllable verse without a required end-rhyme scheme.",
    [
      "Italian hendecasyllables involve stress placement and poetic counting conventions beyond the number eleven. Do not substitute English iambic pentameter.",
    ],
    {
      structure: repeat(syllabic([11]), "Repeatable hendecasyllabic line"),
      continuous: true,
      aliases: ["versi sciolti"],
      limitations: [
        "The syllable target is displayed; Italian accent placement is not automatically checked.",
      ],
    },
  ),
  entry(
    "Villanelle",
    "en",
    "French fixed form and later adaptations",
    "Two refrains return through five tercets and a closing quatrain.",
    [
      "The existing template separates refrain identity from the two rhyme groups. It does not impose an unsupported mandatory meter.",
    ],
    { reuse: "villanelle", aliases: ["villanesque"] },
  ),
  tradition(
    "Waka (poetry)",
    "ja",
    "Classical Japanese poetry",
    "A historical family of Japanese verse forms, later often associated with tanka.",
    [
      "Waka encompasses more than one historical form. A specific type is needed before prescribing mora counts or a five-line layout.",
    ],
    { name: "Waka", aliases: ["yamato uta", "和歌"] },
  ),
  entry(
    "Yadu (poetry)",
    "my",
    "Burmese seasonal lyric · five-syllable ending variant",
    "Five-line stanzas combine short lines, a seasonal reference, and climbing internal rhyme.",
    [
      "The first four lines have four syllables; the last can have 5, 7, 9, or 11. This variant selects 5 and allows up to three stanzas. Internal A and B chains descend 4–3–2; the final two lines rhyme at their ends.",
    ],
    {
      name: "Yadu · five-syllable ending",
      structure: {
        ...repeat(
          syllabic([4, 4, 4, 4, 5]).map((line, i) => ({
            ...line,
            ...(i >= 3 ? { rhyme: "C" } : {}),
            internalRhymes: [
              ...(i < 3 ? [{ group: "A", syllable: 4 - i }] : []),
              ...(i >= 2 ? [{ group: "B", syllable: 6 - i }] : []),
            ],
          })),
        ),
        maxStanzas: 3,
      },
      aliases: ["ya du", "yatu"],
      limitations: [
        "Rhyme positions are targets; seasonal meaning and actual sound matches remain manual.",
      ],
    },
  ),
  entry(
    "Yagan (poetic form)",
    "my",
    "Burmese satirical praise poetry",
    "Praise a subject by sharply disparaging what is set against it.",
    [
      "The rhetorical contrast is central. Do not assume every yagan follows one stanza count merely because it has relationships with yadu and other Burmese forms.",
    ],
    { name: "Yagan" },
  ),
  tradition(
    "Yemenite Jewish poetry",
    "he",
    "Yemenite Jewish devotional and social performance",
    "Poetic texts live within distinctive sung, rhythmic, and communal practices.",
    [
      "Language, occasion, and men’s and women’s performance traditions differ. Choose a specific genre and melody rather than one generic stanza.",
    ],
  ),
  tradition(
    "Zajal",
    "ar",
    "Andalusi roots and living colloquial Arabic traditions",
    "Strophic, often improvised oral poetry that can unfold as a sung exchange.",
    [
      "Regional practices and metrical traditions vary. Musical delivery, dialect, and answering voices are part of the specification.",
    ],
    { aliases: ["zajjal", "زجل"] },
  ),
);

export {
  entry,
  tradition,
  technique,
  concept,
  free,
  lines,
  syllabic,
  moraic,
  iamb,
  beats,
  rhymed,
  block,
  fixed,
  repeat,
  one,
  ref,
};
