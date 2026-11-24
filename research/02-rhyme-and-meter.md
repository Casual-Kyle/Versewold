# Rhyme and meter: an engine model

## Keep four relationships separate

1. A **rhyme group** relates sounds: A lines should rhyme with other A lines in the declared scope.
2. A **refrain** relates text: a previously introduced line returns.
3. An **end-word group** relates word identities: sestina rotations reuse words even when they do not rhyme.
4. A **meter rule** describes an expected rhythm or syllable constraint independently of all three.

The schema implements these as separate fields. This prevents the common mistake of treating a villanelle's A1 and A2 as different rhyme sounds, or treating a sestina's end-word letters as a rhyme scheme. [Villanelle](https://poets.org/glossary/villanelle), [Sestina](https://poets.org/glossary/sestina)

## Proposed phonetic rhyme comparison

For full end rhyme, a useful starting point is the vowel of the last stressed syllable and the phones that follow it. Spelling alone is insufficient; internal rhyme and approximate rhyme need separate treatment. [Poetry Foundation: rhyme](https://www.poetryfoundation.org/education/glossary/rhyme)

Proposed algorithm, not yet implemented:

1. Tokenize the final lexical word without discarding meaningful apostrophes.
2. Obtain every plausible pronunciation candidate.
3. For each candidate, identify the last primary or secondary stressed vowel.
4. Build a comparison key from that vowel through the word's end; remove stress digits for basic sound comparison while retaining the original stress in the result.
5. If no stressed vowel exists, expose a clearly marked unstressed-tail fallback.
6. Compare all candidate pairs; report ambiguity instead of silently choosing a convenient pronunciation.

Hand-authored demonstration: `N AY1 T` and `L AY1 T` yield `AY T`, so `night/light` rhyme under this policy. `love/move` should not be accepted merely because of the final spelling. Identical words can share a rhyme key while also receiving an identity observation. These examples illustrate the proposed policy; they are not results from a running dictionary engine.

`rhymeScope: "stanza"` resets group identities for each stanza. `rhymeScope: "poem"` preserves them across the work. A repeated Habbie stanza can introduce new A and B sounds; a villanelle keeps its two sounds across all nineteen lines. Unrhymed lines omit `rhyme`; do not assign every unrhymed line to one fake X group.

Approximate-rhyme policies should eventually distinguish vowel resemblance, coda resemblance, and dialect-dependent matches. An explainable comparison is preferable to an unexplained score.

## Meter is a pattern, not a syllable total

Meter describes patterned stress in English accentual-syllabic verse. Other traditions can organize verse around syllables, stresses alone, or syllable quantity. A ten-syllable line is not automatically iambic pentameter. [Poetry Foundation: meter](https://www.poetryfoundation.org/education/glossary/meter)

| Foot    | Starter notation | Basic movement                   |
| ------- | ---------------- | -------------------------------- |
| Iamb    | `u/`             | unstressed, stressed             |
| Trochee | `/u`             | stressed, unstressed             |
| Anapest | `uu/`            | unstressed, unstressed, stressed |
| Dactyl  | `/uu`            | stressed, unstressed, unstressed |
| Spondee | `//`             | stressed, stressed               |
| Pyrrhic | `uu`             | unstressed, unstressed           |

`u` means unstressed, `/` stressed, and `x` either. `feet` is the number of repetitions. The notation is the application's serialization choice; it should not be confused with ARPAbet's stress digits. [Poetry Foundation: foot](https://www.poetryfoundation.org/education/glossary/foot)

```json
{
  "system": "accentual-syllabic",
  "pattern": "u/",
  "feet": 5,
  "strength": "conventional"
}
```

The extended template schema represents accentual-syllabic, syllabic, accentual, quantitative, moraic, and free systems separately. Stress beats, syllable counts, mora counts, and quantity sequences have their own fields and display labels. Optional Strict feedback now compares English syllable estimates to the base counts; automatic language-specific scansion remains future work.

Lexical stress and metrical prominence must remain distinct. A future scansion engine should consider alternate pronunciations, phrase context, stress promotion or demotion, inversion, elision, and extra unstressed endings. Return candidate scans with explanations and allow author corrections. Do not mark a poem incorrect because a dictionary's first pronunciation fails a rigid pattern.

## Strength and feedback

`required` identifies a constraint of the selected template variant, `conventional` an expected practice with flexibility, and `optional` an informative target. Even required constraints are guidance: the app must preserve and permit the poet's deviation.

The current app checks stanza, line, and declared word counts against the selected teaching layout. Strict additionally uses [words/syllable](https://github.com/words/syllable), pinned at 5.0.1, for offline English spelling-based syllable estimates. Estimates are labeled approximate, explainable per word, and are not pronunciation, rhyme, or stress validation. Numeric tokens, links/code, unsupported scripts, and non-English form languages remain unchecked. Scots, names, elision, and dialect can change the intended pronunciation; dictionary alternatives and writer overrides are future work. Dependency notices accompany the application. Shakespearean guidance uses fourteen sequential formal targets independent of printed blank-line divisions.
