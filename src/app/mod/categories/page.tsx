import { ChevronRight, FolderTree } from "lucide-react";
import type { Metadata } from "next";

import { ActionButton } from "@/components/mod/action-button";
import { deleteCategory } from "@/components/mod/actions";
import { CategoryForm } from "@/components/mod/category-form";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { countLabel } from "@/lib/labels";
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

  if (error) return <p role="alert" className="text-body text-danger">Could not load categories. Please reload.</p>;

  return (
    <div className="grid gap-8">
      <section aria-labelledby="new-category">
        <Card>
          <h2 id="new-category" className="mb-4 text-heading font-semibold tracking-tight">
            New category
          </h2>
          <CategoryForm />
        </Card>
      </section>

      <section aria-labelledby="all-categories" className="grid gap-3">
        <h2 id="all-categories" className="text-heading font-semibold tracking-tight">
          All categories
        </h2>
        {categories.length === 0 ? (
          <EmptyState icon={<FolderTree />} title="No categories yet">
            Create the first one above so members can file their questions.
          </EmptyState>
        ) : (
        <ul className="grid gap-3">
          {categories.map((category, index) => (
            <li key={category.id} style={stagger(index)} className="animate-fade-up">
              <Card padding="none">
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-2 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                    <ChevronRight
                      aria-hidden
                      strokeWidth={1.75}
                      className="size-4 shrink-0 text-muted transition-transform duration-150 group-open:rotate-90"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small font-medium">{category.name}</span>
                      <span className="block truncate text-meta text-muted">
                        /{category.slug} · {countLabel(category.threads[0]?.count ?? 0, "thread")}
                      </span>
                    </span>
                  </summary>
                  <div className="grid gap-4 border-t border-border p-4">
                    <CategoryForm category={category} />
                    {isSuperadmin && (
                      <div className="border-t border-border pt-4">
                        <ActionButton
                          action={deleteCategory}
                          fields={{ categoryId: category.id }}
                          label="Delete category"
                          variant="danger"
                          confirm={`Delete "${category.name}"? This only works if it has no threads.`}
                        />
                      </div>
                    )}
                  </div>
                </details>
              </Card>
            </li>
          ))}
        </ul>
        )}
      </section>
    </div>
  );
}
