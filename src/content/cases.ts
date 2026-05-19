export type CaseItem = {
  slug: string;
  title: string;
  hero: string;
  sections: string[];
};
export type Manifest = {
  home: { hero: string | null; sections: string[] };
  cases: CaseItem[];
};
import data from './manifest.json';
export default data as Manifest;
