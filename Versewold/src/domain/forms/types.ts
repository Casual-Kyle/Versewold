export interface MeterRule {
  system: 'accentual-syllabic' | 'syllabic' | 'accentual' | 'quantitative' | 'moraic' | 'free';
  /** u = unstressed, / = stressed, x = either; an expectation, never inferred scansion. */
  pattern?: string;
  feet?: number;
  syllables?: number;
  beats?: number;
  morae?: number;
  /** Quantitative notation: - long, u short, x anceps; never English stress. */
  quantityPattern?: string;
  strength: 'required' | 'conventional' | 'optional';
}

export interface FormLine {
  wordCount?: number;
  internalRhymes?: { group: string; syllable: number }[];
  rhyme?: string;
  meter?: MeterRule;
  refrain?: { id: string; role: 'define' | 'repeat' };
  endWord?: string;
  containsEndWords?: string[];
}

export interface PoetryForm {
  schemaVersion: 1;
  id: string;
  name: string;
  language: string;
  origin: string;
  summary: string;
  tags: string[];
  notes: string[];
  sources: { title: string; url: string }[];
  /** Optional additions preserve compatibility with existing version 1 custom files. */
  catalog?: {
    kind: 'form' | 'tradition' | 'technique' | 'concept' | 'reference';
    status: 'structured' | 'guided' | 'reference';
    aliases: string[];
    researchedOn: string;
    sourcePageId?: number;
    sourceRevisionId?: number;
    limitations: string[];
    /** Optional links to available, more specific writing variants. */
    variants?: string[];
  };
  structure: {
    kind: 'fixed' | 'repeating' | 'free';
    rhymeScope: 'poem' | 'stanza';
    /** A line unit repeats continuously; it does not require one-line stanzas. */
    unit?: 'stanza' | 'line';
    /** Fixed line sequence may cross visual stanza breaks (e.g. a sonnet). */
    lineMapping?: 'stanza' | 'poem';
    maxStanzas?: number;
    stanzas: { label: string; lines: FormLine[] }[];
  };
}
