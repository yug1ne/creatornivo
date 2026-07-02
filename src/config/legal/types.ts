export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  list?: string[];
  subsections?: {
    title: string;
    paragraphs?: string[];
    list?: string[];
  }[];
}