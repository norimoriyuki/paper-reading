import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeUnwrapImages from "rehype-unwrap-images";
import { getPaperBySlug, getAllSlugs } from "@/lib/papers";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function PaperPage({ params }: Props) {
  const { slug } = await params;
  const paper = getPaperBySlug(slug);
  if (!paper) notFound();

  const { meta, content } = paper;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            ← 一覧に戻る
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {meta.title}
          </h1>
          <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {meta.authors?.join(", ")} · {meta.year} · {meta.venue}
          </div>
          {meta.url && (
            <a
              href={meta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              論文リンク（PDFなど）
            </a>
          )}
          {meta.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {meta.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {meta.oneLiner && (
            <p className="mt-4 text-zinc-600 dark:text-zinc-300 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4">
              {meta.oneLiner}
            </p>
          )}
        </div>

        <div className="prose prose-zinc dark:prose-invert mt-8 max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeUnwrapImages, rehypeKatex]}
            components={{
              h1: ({ children }) => (
                <h2 className="mt-8 mb-4 text-xl font-semibold">{children}</h2>
              ),
              h2: ({ children }) => (
                <h3 className="mt-6 mb-3 text-lg font-medium">{children}</h3>
              ),
              p: ({ children }) => <p className="mb-3 leading-7">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>
              ),
              li: ({ children }) => <li className="leading-7">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {children}
                </strong>
              ),
              img: ({ src, alt }) => (
                <figure className="my-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={alt ?? ""}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700"
                  />
                  {alt && (
                    <figcaption className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      {alt}
                    </figcaption>
                  )}
                </figure>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
