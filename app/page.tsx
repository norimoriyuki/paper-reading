import Link from "next/link";
import { getPapers } from "@/lib/papers";

export default function Home() {
  const papers = getPapers();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <h1 className="text-xl font-semibold tracking-tight">
            論文読み with MoriX
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            3D深層学習中心に
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {papers.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">
            <code className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-sm">
              content/papers/
            </code>
            に .md ファイルを追加するとここに表示されます。
          </p>
        ) : (
          <ul className="space-y-4">
            {papers.map((paper) => (
              <li key={paper.slug}>
                <Link
                  href={`/papers/${paper.slug}`}
                  className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm"
                >
                  <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
                    {paper.meta.title}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {paper.meta.oneLiner}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                    <span>{paper.meta.year}</span>
                    <span>·</span>
                    <span>{paper.meta.venue}</span>
                    {paper.meta.readAt && (
                      <>
                        <span>·</span>
                        <span>読んだ日: {paper.meta.readAt}</span>
                      </>
                    )}
                    {paper.meta.editor && (
                      <>
                        <span>·</span>
                        <span>制作者: {paper.meta.editor}</span>
                      </>
                    )}
                    {paper.meta.tags?.length > 0 && (
                      <>
                        <span>·</span>
                        {paper.meta.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
