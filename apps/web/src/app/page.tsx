import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight mb-4">DevCreator AI</h1>
        <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
          Connect your content. Teach it who you are.
          <br />
          Let AI figure out what to say next.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Get started
        </Link>
      </div>
    </main>
  );
}
