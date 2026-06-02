// 模型返回的 JSON 容错解析：去掉 ```json 围栏、截取第一个 { 或 [ 到其匹配的结尾，再 parse。
// 解析失败返回 null，由各流水线模块自行降级，绝不抛错中断整批。

export function parseJsonLoose<T>(raw: string): T | null {
  if (!raw) return null;
  let s = raw.trim();

  // 去掉 markdown 代码围栏 ```json ... ``` 或 ``` ... ```
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();

  // 截取第一个 { 或 [ 到与之匹配的结尾，丢弃模型可能多写的前后说明文字
  const start = s.search(/[{[]/);
  if (start === -1) return null;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  try {
    return JSON.parse(s.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
