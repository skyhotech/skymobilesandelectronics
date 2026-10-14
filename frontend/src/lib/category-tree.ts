export type TreeNode = { id: number; parent?: number | null; name: string; display_order?: number };

export function treeRows<T extends TreeNode>(nodes: T[]) {
  const children = new Map<number | null, T[]>();
  for (const node of nodes) {
    const parent = node.parent ?? null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(node);
  }
  for (const siblings of children.values())
    siblings.sort(
      (a, b) =>
        (a.display_order || 0) - (b.display_order || 0) ||
        a.name.localeCompare(b.name) ||
        a.id - b.id,
    );
  const rows: { node: T; depth: number; path: string }[] = [];
  const seen = new Set<number>();
  function visit(parent: number | null, depth: number, names: string[]) {
    for (const node of children.get(parent) || []) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      rows.push({ node, depth, path: [...names, node.name].join(" → ") });
      visit(node.id, depth + 1, [...names, node.name]);
    }
  }
  visit(null, 0, []);
  return rows;
}

export function isDescendant(nodes: TreeNode[], candidate: number, ancestor: number): boolean {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<number>();
  let current: number | null | undefined = candidate;
  while (current != null && !seen.has(current)) {
    if (current === ancestor) return true;
    seen.add(current);
    current = byId.get(current)?.parent;
  }
  return false;
}
