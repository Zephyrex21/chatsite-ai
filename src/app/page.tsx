export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">ChatSite</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Foundation phase complete. The scraping service, chat service, and claymorphic UI land in
          the phases that follow — see{' '}
          <code className="rounded bg-neutral-100 px-1 py-0.5">README.md</code> for the roadmap.
        </p>
      </div>
    </main>
  );
}
