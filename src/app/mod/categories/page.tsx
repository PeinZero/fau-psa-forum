import type { Metadata } from "next";

import { ActionButton } from "@/components/mod/action-button";
import { deleteCategory } from "@/components/mod/actions";
import { CategoryForm } from "@/components/mod/category-form";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, sort_order, threads(count)")
    .order("sort_order")
    .order("name");
  const isSuperadmin = viewer?.role === "superadmin";

  if (error) return <p role="alert">Could not load categories. Please reload.</p>;

  return (
    <div className="grid gap-6">
      <section aria-labelledby="new-category" className="rounded-md border border-border p-4">
        <h2 id="new-category" className="mb-3 text-lg font-semibold">
          New category
        </h2>
        <CategoryForm />
      </section>

      <ul className="grid gap-4">
        {categories.map((category) => (
          <li key={category.id} className="rounded-md border border-border p-4">
            <details>
              <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3">
                <span className="font-medium">{category.name}</span>
                <span className="text-sm text-muted">
                  /{category.slug} · {category.threads[0]?.count ?? 0} threads
                </span>
              </summary>
              <div className="mt-3 grid gap-4">
                <CategoryForm category={category} />
                {isSuperadmin && (
                  <ActionButton
                    action={deleteCategory}
                    fields={{ categoryId: category.id }}
                    label="Delete category"
                    tone="danger"
                    confirm={`Delete "${category.name}"? This only works if it has no threads.`}
                  />
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
