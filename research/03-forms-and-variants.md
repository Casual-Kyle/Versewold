# Starter forms and useful variants

The six bundled JSON templates exercise different structural requirements. Definitions live under `Versewold/src/domain/forms/templates/`; the editor contains no branches for named forms.

| Template ID            | Layout                             | Sound or repetition                                              | Main modeling lesson                                       |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `free-verse`           | No fixed stanza or line count      | No prescribed rhyme or meter                                     | Absence of a constraint is meaningful.                     |
| `standard-habbie`      | Repeatable six-line stanza         | AAABAB; typically four iambs in lines 1, 2, 3, 5 and two in 4, 6 | Mixed line lengths and stanza-scoped rhyme.                |
| `shakespearean-sonnet` | Teaching layout 4 + 4 + 4 + 2      | ABAB CDCD EFEF GG; conventional iambic pentameter                | Poem-scoped rhyme and flexible printing layout.            |
| `haiku-575`            | Three lines                        | 5/7/5 English syllable exercise                                  | A named adaptation, not a universal definition.            |
| `villanelle`           | Five tercets and a quatrain        | Two rhyme groups and two refrains                                | Refrain identity differs from rhyme identity.              |
| `sestina`              | Six sestets and a three-line envoi | Rotating end-words, not mandatory rhyme                          | Word identity, permutation, and internal word constraints. |

## Standard Habbie

The Scottish Poetry Library identifies the form with the combined four-beat/two-beat movement in its commentary on W. N. Herbert's poem. Burns's _To a Mouse_ provides a primary example. The familiar base pattern 8/8/8/4/8/4 is a starting expectation, with endings and performance producing variation. Do not validate it as six rigid syllable counts. [Scottish Poetry Library: form commentary](https://www.scottishpoetrylibrary.org.uk/poem/rabbie-rabbie-burning-bright/), [primary example](https://www.scottishpoetrylibrary.org.uk/poem/mouse/)

## Shakespearean sonnet

The supplied template chooses the English rhyme arrangement. A Petrarchan variant should receive a separate ID and its own octave/sestet pattern. A volta is a rhetorical turn; line counts alone cannot determine whether one succeeds. The four visual blocks are pedagogical and need not match every manuscript's spacing. [Academy of American Poets: sonnet](https://poets.org/glossary/sonnet)

## Haiku

The practice template deliberately names its 5–7–5 English adaptation. Japanese morae and English syllables differ, and contemporary English haiku can use other lengths. A future `haiku-contemporary-en` template should emphasize observation, juxtaposition, and seasonal context without mandatory counts. [The Haiku Foundation: syllable count](https://thehaikufoundation.org/some-thoughts-on-line-and-syllable-count-in-english-language-haiku/)

## Villanelle

The encoded refrain positions are A1 at lines 1, 6, 12, 18 and A2 at 3, 9, 15, 19. Their rhyme group is always A. The template does not invent a mandatory meter. Repeated text should stay editable because deliberate refrain variation is a legitimate choice. [Academy of American Poets: villanelle](https://poets.org/glossary/villanelle)

## Sestina

The six-line permutations are ABCDEF, FAEBDC, CFDABE, ECBFAD, DEACFB, BDFECA. The selected envoi variant ends E/C/A while placing B/D/F internally. Other envoi arrangements need their own documented variants; one pairing should not be presented as universal. [Academy of American Poets: sestina](https://poets.org/glossary/sestina)

## Sensible next additions

A ballad practice variant would exercise a repeatable four-line structure, typically four/three/four/three stresses and ABCB rhyme. A blank-verse variant would exercise an unrhymed meter target. A Petrarchan sonnet would exercise alternative fixed layouts. Confirm the particular tradition and variant before assigning hard constraints. [Poetry Foundation: ballad](https://www.poetryfoundation.org/education/glossary/ballad), [sonnet variants](https://www.poetryfoundation.org/education/glossary/Sonnet)

Longer term, pantoum chains, ghazal couplet-level constraints, Welsh sound systems, and quantitative forms deserve dedicated research. The present schema does not claim full support for those traditions. A form name is not a sufficient linguistic specification.

## Examples and rights

Keep links and original summaries now. Do not import modern poem texts simply because they appear on an educational site. Before bundling an example, verify the poem text, edition, translation, and relevant rights separately. The starter contains no copied example poems.
