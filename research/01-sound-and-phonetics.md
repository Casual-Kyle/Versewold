# Sound and phonetics

## Model speech sounds, not letters

A phoneme is a contrastive unit of speech. A grapheme is a written unit. The letter sequence `ph` can represent /f/; a letter can participate in several pronunciations. The engine should therefore attach sound observations to pronunciation candidates rather than infer that matching spelling means matching sound. Oregon State's teaching material explicitly treats consonance and assonance as sound effects. [Oregon State University](https://liberalarts.oregonstate.edu/wlf/what-are-assonance-and-consonance)

For a useful English syllable model, distinguish onset, nucleus, and coda: material before the vowel, the syllabic center, and material after it. This is an engineering simplification; syllabic consonants and dialect variation need care. A pronunciation dictionary usually supplies a phone sequence, not reliable syllable boundaries. Do not invent exact syllabification from a flat phone list.

## The sound devices to distinguish

| Concept      | What repeats                                          | App consequence                                                        |
| ------------ | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Consonance   | Consonant sounds within nearby words                  | Look for consonant identities or sequences; position can differ.       |
| Assonance    | Vowel sounds within nearby words                      | Compare vowels, with stress and distance as optional filters.          |
| Alliteration | Initial sounds, commonly at prominent word beginnings | Compare word or stressed-syllable onsets, rather than every consonant. |
| End rhyme    | Ending sound correspondence                           | Use the end of a line and an appropriate stressed-vowel anchor.        |

Consonance does not require identical vowels. For example, `bed` and `bad` can share consonantal material. These categories can overlap, so future analysis results should be separate observations rather than one mutually exclusive label. [Poetry Foundation: consonance](https://www.poetryfoundation.org/education/glossary/consonance), [Oregon State University](https://liberalarts.oregonstate.edu/wlf/what-are-assonance-and-consonance)

## Proposed initial dictionary: CMUdict

CMUdict is an appropriate offline starting point for US English. Its own README acknowledges errors and omissions. Keep the dictionary behind a provider interface so Scots, British English, names, dialects, and other languages can receive appropriate resources later. [Maintainer README](https://raw.githubusercontent.com/cmusphinx/cmudict/master/README)

CMUdict's base phone inventory includes these groups:

| Group      | ARPAbet phones                               |
| ---------- | -------------------------------------------- |
| Vowels     | AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW |
| Stops      | B D G K P T                                  |
| Affricates | CH JH                                        |
| Fricatives | DH F S SH TH V Z ZH                          |
| Nasals     | M N NG                                       |
| Liquids    | L R                                          |
| Semivowels | W Y                                          |
| Aspirate   | HH                                           |

These are the categories provided by the dictionary, not a complete theory of phonetics. [Maintainer phone inventory](https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.phones)

Vowel tokens carry a stress digit: `0` unstressed, `1` primary, `2` secondary. Thus a CMU-style representation such as `K AE1 T` contains one vowel nucleus. Counting vowel tokens estimates dictionary syllable count, not contextual poetic performance. Preserve secondary stress as a distinct value; do not erase it when importing. [CMUdict reader documentation](https://www.nltk.org/api/nltk.corpus.reader.cmudict.html), [Maintainer symbols](https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.symbols)

## A proposed pronunciation record

```json
{
  "word": "example",
  "language": "en-US",
  "source": "cmudict",
  "sourceRevision": "<pinned upstream commit>",
  "variants": [
    {
      "id": "dictionary-variant-1",
      "phones": ["IH0", "G", "Z", "AE1", "M", "P", "AH0", "L"],
      "syllables": 3,
      "lexicalStress": [0, 1, 0]
    }
  ],
  "selectedVariantId": null
}
```

This is a proposed future analysis record, not an implemented persistence format. Do not collapse multiple pronunciations into one. `read`, for example, needs context or author selection. Unknown words must return `unknown`, never a fabricated definitive count. Regional pronunciation and poetic elision should be supported by local overrides.

## Integration and attribution

Before importing the full dictionary, pin an upstream revision, retain its license, include the notice in distributed artifacts, and record provenance. The license permits redistribution subject to preserving its notices and disclaimer; the full text remains authoritative. No dictionary has been downloaded into or bundled with this starter. [CMUdict license](https://raw.githubusercontent.com/cmusphinx/cmudict/master/LICENSE)
