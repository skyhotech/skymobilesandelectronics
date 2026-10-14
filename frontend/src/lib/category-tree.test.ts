import { describe, expect, it } from "vitest";
import { treeRows, isDescendant } from "./category-tree";

const nodes = [
  { id: 1, name: "Root", parent: null },
  { id: 3, name: "Leaf", parent: 2 },
  { id: 2, name: "Child", parent: 1 },
];
describe("category tree", () => {
  it("orders arbitrary-depth branches and preserves breadcrumbs", () => {
    expect(treeRows(nodes).map((row) => [row.node.id, row.depth, row.path])).toEqual([
      [1, 0, "Root"],
      [2, 1, "Root → Child"],
      [3, 2, "Root → Child → Leaf"],
    ]);
  });
  it("detects descendant drop targets", () => {
    expect(isDescendant(nodes, 3, 1)).toBe(true);
    expect(isDescendant(nodes, 1, 3)).toBe(false);
    expect(isDescendant(nodes, 2, 2)).toBe(true);
  });
});
