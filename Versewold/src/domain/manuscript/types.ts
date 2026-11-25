export interface ManuscriptSettings {
  paper: 'letter' | 'a4' | 'a5' | 'custom';
  orientation: 'portrait' | 'landscape';
  customWidthMm: number;
  customHeightMm: number;
  margins: { top: number; bottom: number; left: number; right: number };
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  titleSize: number;
  titlePage: boolean;
  titleWordCount: boolean;
  countTitles: boolean;
  titleDate: 'none' | 'today' | 'revised';
  showPoemAuthor: boolean;
  poemDate: 'none' | 'composed' | 'revised';
  poemSignature: boolean;
  sectionPages: boolean;
  poemNewPage: boolean;
  pageNumbers: boolean;
}

export interface ManuscriptLine {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  weight: 'normal' | 'bold';
  align: 'left' | 'center' | 'right';
  role: 'body' | 'heading' | 'metadata' | 'signature' | 'footer';
}
export interface ManuscriptPage {
  id: string;
  kind: 'title' | 'section' | 'text';
  label: string;
  lines: ManuscriptLine[];
  documentId?: string;
}
export type MeasureText = (text: string, size: number, weight: 'normal' | 'bold') => number;
