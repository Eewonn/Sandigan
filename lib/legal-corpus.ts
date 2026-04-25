import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type LegalSource = {
  id: string;
  lawName: string;
  section: string;
  title: string;
  url?: string;
  updatedAt: string;
  text: string;
  tags: string[];
};

function loadCorpus(): LegalSource[] {
  const dir = path.join(process.cwd(), "corpus");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data, content } = matter(raw);
    return {
      id: data.id as string,
      lawName: data.lawName as string,
      section: data.section as string,
      title: data.title as string,
      url: data.url as string | undefined,
      updatedAt: data.updatedAt as string,
      text: content.trim(),
      tags: (data.tags as string[]) ?? [],
    };
  });
}

// Loaded once at module initialization; cached for the lifetime of the process.
export const LEGAL_CORPUS: LegalSource[] = loadCorpus();
