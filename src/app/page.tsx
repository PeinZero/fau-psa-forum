export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to the FAU PSA Forum
        </h1>
        <p className="text-muted">
          Moderator-curated threads for Pakistani students, graduates, postgrads
          and residents around FAU Erlangen-Nürnberg: residence permit and visa
          questions, course reviews, and first steps in Erlangen and Nuremberg.
        </p>
      </section>

      <section aria-labelledby="threads-heading" className="flex flex-col gap-2">
        <h2 id="threads-heading" className="text-xl font-semibold">
          Latest threads
        </h2>
        <p className="text-muted">Threads are coming soon.</p>
      </section>
    </div>
  );
}
