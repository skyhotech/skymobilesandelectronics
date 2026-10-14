import type { HomepageCategory } from "@/lib/categories";
import type { ReactNode } from "react";

export function CategoryBrowseTree({ categories }: { categories: HomepageCategory[] }) {
  const children = new Map<number | null, HomepageCategory[]>();
  for (const node of categories) {
    if (!children.has(node.parent)) children.set(node.parent, []);
    children.get(node.parent)!.push(node);
  }
  function branch(parent: number, depth: number): ReactNode {
    if (depth > 12 || !children.has(parent)) return null;
    return (
      <ul>
        {children.get(parent)!.map((node) => (
          <li key={node.id}>
            <a href={`#category-${node.id}`}>{node.name}</a>
            {branch(node.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <nav className="category-browse-tree" aria-label="Category hierarchy">
      {(children.get(null) || []).map((root) =>
        children.has(root.id) ? (
          <details key={root.id}>
            <summary>{root.name}</summary>
            <a href={`#category-${root.id}`}>Explore {root.name}</a>
            {branch(root.id, 1)}
          </details>
        ) : (
          <a key={root.id} href={`#category-${root.id}`}>
            {root.name}
          </a>
        ),
      )}
    </nav>
  );
}
