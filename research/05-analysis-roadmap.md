# Proposed analysis pipeline

This is a development roadmap, not a description of features already shipped. The present foundation only knows template expectations and draft layout.

## Suggested boundaries

```text
Markdown body + selected form + language + author overrides
    → source-preserving tokenization
    → pronunciation candidates from an offline provider
    → syllable and lexical-stress observations
    → line-level rhyme and rhythm candidates
    → form-constraint comparisons
    → explainable suggestions, with uncertainty
```

The token stream should retain offsets into the original Markdown. Heading syntax, emphasis markers, code fences, and links must be parsed before performing sound analysis; analyzing Markdown punctuation as speech would produce misleading results. Preserve the author's source when presenting a plain reading layer.

Keep the linguistic core independent of Vue. A native Rust module is a suitable future home for dictionary indexing and CPU-heavy comparisons; a typed interface can keep the frontend lightweight. Pure algorithms and fixture tests can be implemented before the full dictionary is bundled.

## Implementation sequence

1. **Dictionary importer.** Pin a CMUdict revision, retain variants and provenance, validate phone inventory, include notices, and build a reproducible offline index. [CMUdict repository](https://github.com/cmusphinx/cmudict)
2. **Syllable observations.** Count vowel-bearing phone tokens for each pronunciation; present ranges for ambiguity. Unknown and estimated values must stay visibly distinct.
3. **Manual overrides.** Store author-selected pronunciations and line-specific elisions in project JSON, with text offsets or stable anchors. Revalidate offsets after edits. Never insert analysis metadata into the poem's prose without a deliberate export choice.
4. **Rhyme comparison.** Implement exact-tail comparisons and scope first; introduce approximate and dialect-aware comparisons afterward.
5. **Scansion candidates.** Compare multiple stress sequences against metrical targets with explicit costs for permitted substitutions. Dictionary stress is evidence, not a complete scan.
6. **Sound devices.** Find nearby consonance, assonance, and alliteration using phonemes and optional prominence filters.
7. **Teaching presentation.** Explain observations with vocabulary, not a poem-quality score. Let the writer hide each annotation independently.

## Acceptance cases worth preserving

| Case                                          | Expected treatment                                                    |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `night/light`                                 | A full-rhyme candidate in an appropriate pronunciation model.         |
| `love/move`                                   | Matching spelling alone must not establish rhyme.                     |
| `read` without tense context                  | Retain multiple pronunciation candidates.                             |
| A proper name absent from the dictionary      | Unknown, with author override available.                              |
| Scots vocabulary in a Burns stanza            | US English dictionary limitations explicitly visible.                 |
| One extra unstressed ending in an iambic line | A candidate variation, not an automatic rejection.                    |
| 10 syllables without alternating prominence   | Do not call it verified iambic pentameter.                            |
| Villanelle A1 and A2                          | Separate text identities in one rhyme group.                          |
| Sestina end-word rotation                     | Validate word identity independently of rhyme.                        |
| Japanese haiku                                | Do not equate morae and English syllables.                            |
| External Markdown edit                        | Preserve disk changes; do not overwrite from a stale in-memory draft. |

These are product acceptance criteria inferred from the research, not guarantees that one dictionary or algorithm will satisfy every case. Source background: [rhyme](https://www.poetryfoundation.org/education/glossary/rhyme), [meter](https://www.poetryfoundation.org/education/glossary/meter), [haiku nuance](https://thehaikufoundation.org/some-thoughts-on-line-and-syllable-count-in-english-language-haiku/).

## Open design questions

- Which dialects should be available first, and how does the writer declare their intended pronunciation?
- How should variants be ranked without silently manipulating a scan to fit a template?
- Should a project freeze its form definitions when created, or track updates explicitly?
- How should printing layout differ from structural units such as a sonnet's quatrains?
- Which conventions need stanza-level or poem-level strengths beyond per-line meter targets?
- How should repeatable units and future quantitative systems migrate into version 2?

No external service is required for this pipeline. Any future online dictionary lookup should be an explicit feature with clear behavior; this starter performs no writing-content network requests.
