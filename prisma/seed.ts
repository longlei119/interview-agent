import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedQuestion {
  category: string;
  difficulty: string;
  title: string;
  body: string;
  referenceAnswer: string;
  tags: string;
}

const questions: SeedQuestion[] = [
  // ===== 前端 =====
  {
    category: "前端",
    difficulty: "简单",
    title: "说说 var、let、const 的区别",
    body: "请从作用域、变量提升、可变性等角度说明 JavaScript 中 var、let、const 三者的区别。",
    referenceAnswer:
      "var 是函数作用域，存在变量提升（声明被提升、值为 undefined），可重复声明。let/const 是块级作用域，存在暂时性死区（TDZ），同一作用域不可重复声明。const 声明时必须初始化且不可重新赋值（但对象/数组的内部属性仍可变）。实践中优先用 const，需要重新赋值时用 let，避免使用 var。",
    tags: "JavaScript,基础,作用域",
  },
  {
    category: "前端",
    difficulty: "中等",
    title: "浏览器从输入 URL 到页面渲染发生了什么",
    body: "请尽可能完整地描述在浏览器地址栏输入一个 URL 回车后，到页面完整呈现，中间经历了哪些关键步骤。",
    referenceAnswer:
      "1) URL 解析；2) DNS 解析获取 IP（浏览器缓存→系统→路由器→运营商 DNS）；3) 建立 TCP 连接（三次握手），HTTPS 还有 TLS 握手；4) 发送 HTTP 请求；5) 服务器处理并返回响应；6) 浏览器解析 HTML 构建 DOM 树，解析 CSS 构建 CSSOM，合成 Render Tree；7) 布局 Layout（计算几何位置）→ 绘制 Paint → 合成 Composite；8) 执行 JS（可能阻塞解析）；9) 资源加载（图片、字体等）。可延伸谈重排重绘、关键渲染路径优化、缓存策略。",
    tags: "浏览器,网络,渲染",
  },
  {
    category: "前端",
    difficulty: "中等",
    title: "React 中 useEffect 的依赖数组有什么作用？常见坑有哪些",
    body: "解释 useEffect 第二个参数（依赖数组）的作用，以及不正确使用会导致什么问题。",
    referenceAnswer:
      "依赖数组决定 effect 何时重新执行：空数组只在挂载/卸载时运行；有依赖项时，依赖变化才重新运行；不传则每次渲染都运行。常见坑：1) 遗漏依赖导致闭包拿到旧值（stale closure）；2) 把对象/函数作为依赖导致每次都变、effect 反复执行（可用 useCallback/useMemo 或把定义移入 effect）；3) 在 effect 里 setState 又把该 state 作为依赖造成死循环；4) 忘记清理副作用（返回 cleanup 函数）导致内存泄漏或重复订阅。",
    tags: "React,Hooks",
  },
  // ===== 后端 =====
  {
    category: "后端",
    difficulty: "中等",
    title: "数据库索引的原理与使用注意事项",
    body: "请解释数据库索引为什么能加速查询，以及在使用索引时需要注意什么。",
    referenceAnswer:
      "索引（多为 B+ 树）通过有序结构把全表扫描 O(n) 降为 O(log n) 的查找。B+ 树叶子节点形成有序链表，利于范围查询；非叶子节点只存索引、叶子存数据（或主键），减少 IO。注意事项：1) 索引会占空间并降低写入性能；2) 最左前缀原则（联合索引）；3) 在区分度高的列上建索引；4) 避免在索引列上做函数运算/隐式类型转换导致索引失效；5) 覆盖索引可避免回表；6) 不是越多越好。",
    tags: "数据库,索引,性能",
  },
  {
    category: "后端",
    difficulty: "中等",
    title: "HTTP 状态码 401 和 403 的区别",
    body: "说明 401 Unauthorized 与 403 Forbidden 的语义区别和典型使用场景。",
    referenceAnswer:
      "401 表示「未认证」——请求缺少有效的身份凭证（未登录或 token 失效），客户端应先完成认证再重试，响应通常带 WWW-Authenticate 头。403 表示「已认证但无权限」——服务器知道你是谁，但你没有访问该资源的权限，重复请求也没用。简记：401 是「你是谁？请先登录」，403 是「我知道你是谁，但你不能进」。",
    tags: "HTTP,网络,鉴权",
  },
  {
    category: "后端",
    difficulty: "困难",
    title: "如何设计一个高并发下的分布式限流方案",
    body: "在分布式系统中需要对接口做限流（如每用户每秒 N 次），请谈谈你的设计思路。",
    referenceAnswer:
      "常见算法：固定窗口、滑动窗口、漏桶、令牌桶（最常用，允许突发）。分布式实现：1) 用 Redis 集中计数，借助 INCR+EXPIRE 实现固定窗口，或用 Lua 脚本保证原子性实现滑动窗口/令牌桶；2) 也可用 Redis-Cell 模块或 Sentinel/网关层（如 Nginx、API Gateway）限流；3) 考虑限流维度（用户/IP/接口）、热点 key、时钟问题、Redis 单点与性能。进阶：本地限流+分布式限流结合（多级），降级与熔断配合。",
    tags: "分布式,限流,高并发",
  },
  // ===== 算法 =====
  {
    category: "算法",
    difficulty: "简单",
    title: "如何判断一个链表是否有环",
    body: "给定一个单链表，设计算法判断其中是否存在环，并说明时间和空间复杂度。",
    referenceAnswer:
      "快慢指针（Floyd 判圈）：slow 每次走一步，fast 每次走两步，若存在环二者必相遇，若 fast 到达 null 则无环。时间 O(n)，空间 O(1)。进阶：相遇后将一个指针放回头部，两指针同速前进，再次相遇点即为环入口。另一种思路是用哈希表记录访问过的节点，空间 O(n)。",
    tags: "链表,双指针",
  },
  {
    category: "算法",
    difficulty: "中等",
    title: "讲讲快速排序的思想与复杂度",
    body: "描述快速排序的核心思想、平均/最坏时间复杂度，以及如何优化最坏情况。",
    referenceAnswer:
      "核心是分治：选一个基准 pivot，把数组分成「小于 pivot」和「大于 pivot」两部分（partition），再递归排序两部分。平均时间 O(n log n)，最坏 O(n²)（如已排序数组且固定取首元素为 pivot）。空间 O(log n)（递归栈）。优化：随机选 pivot 或三数取中避免最坏情况；小数组切换插入排序；三路划分处理大量重复元素。快排不稳定。",
    tags: "排序,分治",
  },
  {
    category: "算法",
    difficulty: "中等",
    title: "用两个栈实现一个队列",
    body: "请用两个栈实现队列的 push（入队）和 pop（出队）操作，并分析复杂度。",
    referenceAnswer:
      "用 inStack 负责入队，outStack 负责出队。push 直接压入 inStack。pop/peek 时若 outStack 为空，则把 inStack 元素全部弹出并压入 outStack（顺序反转），再从 outStack 弹出。每个元素至多被移动一次，均摊时间复杂度 O(1)。关键点：只有 outStack 空时才从 inStack 倒灌，否则会打乱顺序。",
    tags: "栈,队列,设计",
  },
  // ===== 行为面试 =====
  {
    category: "行为",
    difficulty: "简单",
    title: "请做一个简短的自我介绍",
    body: "用 1-2 分钟介绍你自己，包括技术背景、擅长领域和近期的项目经历。",
    referenceAnswer:
      "建议结构：1) 一句话定位（如「我是有 3 年经验的前端工程师」）；2) 技术栈与擅长方向；3) 最近一个有代表性的项目（你的角色、用到的技术、解决的核心问题、结果/数据）；4) 一句话表达对该岗位的兴趣。控制时长、突出与岗位匹配的亮点，避免流水账。",
    tags: "行为,自我介绍",
  },
  {
    category: "行为",
    difficulty: "中等",
    title: "讲一次你解决线上故障/重大 bug 的经历",
    body: "请用 STAR 法则描述一次你定位并解决线上问题的经历。",
    referenceAnswer:
      "用 STAR：Situation（背景：什么系统、什么影响）、Task（你的职责/目标）、Action（如何排查：看监控/日志、复现、定位根因、临时止血+根治、回归验证）、Result（结果：恢复时长、影响范围、后续改进如告警/预案）。要点：体现冷静的排查思路、数据支撑、复盘改进意识，而不是只说「最后修好了」。",
    tags: "行为,STAR,故障处理",
  },
];

async function main() {
  console.log("开始写入种子题库...");
  // 幂等：先清空题库再插入（不影响用户/记录表）
  await prisma.question.deleteMany();
  for (const q of questions) {
    await prisma.question.create({ data: q });
  }
  console.log(`已写入 ${questions.length} 道题目。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
