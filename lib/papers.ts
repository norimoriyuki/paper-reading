import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content", "papers");

export type PaperMeta = {
  title: string;
  authors: string[];
  year: number;
  venue: string;
  url?: string;
  tags: string[];
  readAt: string;
  oneLiner: string;
  editor?: string;
};

export type Paper = {
  slug: string;
  meta: PaperMeta;
  content: string;
};

function getSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md") && !/^README\.md$/i.test(f))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getPapers(): Paper[] {
  const slugs = getSlugs();
  return slugs
    .map((slug) => getPaperBySlug(slug))
    .filter((p): p is Paper => p !== null)
    .sort((a, b) => (b.meta.readAt || "").localeCompare(a.meta.readAt || ""));
}

export function getPaperBySlug(slug: string): Paper | null {
  const fullPath = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;
  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);
  const meta = data as PaperMeta;
  if (!meta?.title) return null;
  return { slug, meta, content };
}

export function getAllSlugs(): string[] {
  return getSlugs();
}
