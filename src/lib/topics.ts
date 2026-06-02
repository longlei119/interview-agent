// 话题树辅助：把扁平话题列表构造成树、收集某节点的所有子孙 id。
// 用于「我的题库」左侧树渲染和按节点（含子孙）筛选题目。

export interface TopicNode {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  children: TopicNode[];
}

interface FlatTopic {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
}

// 扁平列表 → 树（按 sortOrder 再按名称排序）
export function buildTopicTree(flat: FlatTopic[]): TopicNode[] {
  const map = new Map<string, TopicNode>();
  for (const t of flat) {
    map.set(t.id, { ...t, children: [] });
  }
  const roots: TopicNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: TopicNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

// 收集某节点及其所有子孙的 id（用于「含子孙」筛选）
export function collectSubtreeIds(flat: FlatTopic[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const t of flat) {
    if (t.parentId) {
      const arr = childrenOf.get(t.parentId) ?? [];
      arr.push(t.id);
      childrenOf.set(t.parentId, arr);
    }
  }
  const result: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    result.push(id);
    const kids = childrenOf.get(id);
    if (kids) stack.push(...kids);
  }
  return result;
}

// 找从根到指定节点的路径（用于面包屑「后端 / AI面试 / RAG系统」）
export function findTopicPath(flat: FlatTopic[], targetId: string): FlatTopic[] {
  const byId = new Map(flat.map((t) => [t.id, t]));
  const path: FlatTopic[] = [];
  let cur = byId.get(targetId);
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

// 树 → 扁平下拉选项，label 带层级路径（如「AI面试 / RAG系统」），用于建/改题归类。
export function flattenForSelect(
  roots: TopicNode[]
): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  const walk = (nodes: TopicNode[], prefix: string) => {
    for (const n of nodes) {
      const label = prefix ? `${prefix} / ${n.name}` : n.name;
      out.push({ id: n.id, label });
      walk(n.children, label);
    }
  };
  walk(roots, "");
  return out;
}
