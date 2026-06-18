# 分享与同步 · 详细设计

> 原型见 `docs/prototype-share-sync.html`。本文为实施前详细设计，未完成前不动 `src/`。

## 1. 需求要点（确认版）

| 项 | 决策 |
|---|---|
| 分享码 | 用户级，注册时自动生成 8 位，设置页可重置（旧码失效） |
| 公开机制 | 双重控制：码是门票 + 内容标记公开才可见 |
| 公开粒度 | 目录、题目、试卷都可标记公开；目录公开 = 整棵子树默认公开，子项可"强制关闭" |
| 公开题目 | 自动进广场页（复用 `/explore`） |
| 公开主页 | `/u/<分享码>` 展示该用户公开的题库（目录+题目）+ 试卷 |
| 同步语义 | 复制独立副本，可再编辑、再分享 |
| 同步范围 | 全部 / 指定目录（整棵子树）/ 单张试卷 |
| 同步冲突 | 跳过已存在（同名目录、同题干题目） |
| 同步入口 | 导航栏"同步他人题库"按钮 → 输码 → 跳转 `/u/CODE` |
| 试卷同步 | 试卷 + 内含题目一起复制为独立副本 |

## 2. 数据模型变更

### 2.1 User 新增字段

```prisma
model User {
  // 既有字段...
  shareCode     String   @unique // 8 位分享码，注册时生成
  shareCodeSetAt DateTime @default(now()) // 重置时间，用于失效判断
}
```

- `shareCode` 唯一，注册时由 `lib/auth.ts` 的注册逻辑生成
- 字符集：`ABCDEFGHJKMNPQRSTUVWXYZ23456789`（去除 0/O/1/I/L 等易混淆字符，32 字符集）
- 长度 8 位，组合数 32^8 ≈ 1.1 万亿，碰撞概率可忽略；插入冲突时重试 3 次

### 2.2 Topic 新增字段

```prisma
model Topic {
  // 既有字段...
  visibility String @default("private") // private | public | force_off
}
```

- `private`：私有（默认）
- `public`：公开，整棵子树默认公开
- `force_off`：强制关闭，覆盖祖先的 public

**为什么 Topic 不用三态 `private|public|inherited`？**

`inherited`（继承）是计算态，不必存。默认 `private` 即表示"未单独公开，跟随祖先"。存三态会引入 `inherited` 和 `private` 语义重叠（都是"不主动公开"），徒增复杂度。实际只需两个主动值：`public`（我公开）+ `force_off`（我强制关），其余情况视为继承祖先。

### 2.3 Question 字段调整

现有 `visibility: "private" | "public"`。**保持不变**，语义微调：

- `public`：主动公开（进广场，凭码可见）
- `private`：未主动公开。是否对码可见，取决于所属 Topic 的可见性传播

**新增字段：**

```prisma
model Question {
  // 既有字段...
  forceHidden Boolean @default(false) // 父目录公开但此题强制隐藏
}
```

- `forceHidden = true`：即使所属 Topic 公开，此题也不对码可见、不进广场
- `forceHidden = false`：跟随 Topic 可见性

**为什么不复用 `visibility`？**

`visibility` 表达"题目主动公开"（不依赖目录，单题也能进广场），`forceHidden` 表达"被父目录公开但被此项否决"。两者正交，组合表达 4 态：

| visibility | forceHidden | 含义 |
|---|---|---|
| private | false | 私有（默认） |
| private | true | 私有 + 强制隐藏（冗余，等价 private false） |
| public | false | 主动公开（进广场，凭码可见） |
| public | true | 主动公开但被强制隐藏（矛盾态，应避免） |

实际有效三态：private、public、（继承 + forceHidden 例外）。UI 层保证不会出现 `public + forceHidden` 矛盾态。

### 2.4 TestPaper 字段

现有 `isPublic: Boolean`，**保持不变**。语义清晰，无需调整。

### 2.5 新增 SyncRecord（同步记录，可选）

```prisma
model SyncRecord {
  id          String   @id @default(cuid())
  fromUserId  String // 来源用户
  toUserId    String // 同步到的用户
  scope       String // all | topic | paper
  scopeRefId  String? // topic 或 paper 的 id（scope=all 时为 null）
  status      String   @default("pending") // pending | running | done | failed
  error       String?  @db.Text // 失败原因
  createdCount Int    @default(0) // 新建题数
  skippedCount Int    @default(0) // 跳过题数
  newTopicCount Int   @default(0)
  newPaperCount Int   @default(0)
  createdAt   DateTime @default(now())
  finishedAt  DateTime? // 完成时间

  fromUser User @relation("SyncFrom", fields: [fromUserId], references: [id])
  toUser   User @relation("SyncTo", fields: [toUserId], references: [id])

  @@index([toUserId, createdAt])
  @@index([fromUserId])
}
```

用于"我的同步记录"页（原型第 10 屏）。第一版可不做，先跑通主流程。

## 3. 可见性算法

### 3.1 计算某个 Topic 是否对码可见

```ts
// 输入：topicId，输出：是否对凭码访问者可见
async function isTopicVisibleToCode(topicId: string): Promise<boolean> {
  const chain = await getTopicChain(topicId); // 从当前节点到根的路径
  // 从根向下传播
  let visible = false;
  for (const node of chain) { // 根 → 当前
    if (node.visibility === "force_off") return false; // 任一祖先 force_off，整棵不可见
    if (node.visibility === "public") visible = true;
  }
  return visible;
}
```

规则：

- 任一祖先（含自己）`force_off` → 不可见
- 否则，任一祖先（含自己）`public` → 可见
- 否则 → 不可见（全私有）

### 3.2 计算某道 Question 是否对码可见

```ts
async function isQuestionVisibleToCode(question: Question): Promise<boolean> {
  if (question.forceHidden) return false;
  if (question.visibility === "public") return true; // 主动公开
  if (question.topicId) return await isTopicVisibleToCode(question.topicId);
  return false; // 无 topic 且非主动公开
}
```

### 3.3 计算某道 Question 是否进广场

```ts
async function isInExplore(question: Question): Promise<boolean> {
  if (question.forceHidden || question.isDelisted) return false;
  // 主动公开 → 进广场
  if (question.visibility === "public") return true;
  // 目录公开（继承）→ 也进广场
  if (question.topicId) return await isTopicVisibleToCode(question.topicId);
  return false;
}
```

**决议**：目录公开的题也进广场。最大程度曝光公开内容，降低理解门槛。

### 3.4 列出某用户公开主页可见内容

```ts
async function getPublicProfile(shareCode: string) {
  const user = await prisma.user.findUnique({ where: { shareCode } });
  if (!user) return null;

  // 1. 公开的 Topic（含子树传播后的所有可见 topic）
  const allTopics = await prisma.topic.findMany({ where: { userId: user.id } });
  const visibleTopicIds = new Set<string>();
  for (const t of allTopics) {
    if (await isTopicVisibleToCode(t.id)) visibleTopicIds.add(t.id);
  }

  // 2. 可见的 Question
  const questions = await prisma.question.findMany({
    where: {
      ownerId: user.id,
      deletedAt: null,
      isDelisted: false,
      NOT: { forceHidden: true },
      OR: [
        { visibility: "public" }, // 主动公开
        { topicId: { in: [...visibleTopicIds] } }, // 继承自公开目录
      ],
    },
  });

  // 3. 公开试卷
  const papers = await prisma.testPaper.findMany({
    where: { userId: user.id, isPublic: true },
  });

  return { user, visibleTopicIds, questions, papers };
}
```

## 4. API 设计

### 4.1 分享码相关

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/me/share-code` | 查看我的分享码 | 登录 |
| POST | `/api/me/share-code/reset` | 重新生成（旧码失效） | 登录 |

### 4.2 公开设置

| 方法 | 路径 | 说明 |
|---|---|---|
| PATCH | `/api/topics/[id]` | 已存在，扩展支持 `visibility` 字段 |
| PATCH | `/api/questions/[id]` | 已存在，扩展支持 `forceHidden` 字段 |
| PATCH | `/api/papers/[id]` | 已存在，扩展支持 `isPublic` 字段 |
| POST | `/api/topics/batch-visibility` | 一键公开/关闭：`{ topicIds: [], visibility: "public"|"private" }` |
| POST | `/api/questions/batch-visibility` | 一键公开/关闭 |

### 4.3 公开主页

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/u/[code]` | 获取该用户公开主页内容（目录树 + 题目列表 + 试卷列表） |

返回结构：

```ts
{
  user: { name: string, bio?: string },
  stats: { topicCount: number, questionCount: number, paperCount: number },
  topics: Array<{ id, parentId, name, sortOrder, questionCount }>,
  questions: Array<{ id, topicId, title, direction, difficulty, tags, viewCount, likeCount, cloneCount }>,
  papers: Array<{ id, title, description, timeLimit, questionCount }>,
}
```

### 4.4 同步

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/sync/topics` | 同步选中的目录（整棵子树） |
| POST | `/api/sync/all` | 同步该用户全部公开内容 |
| POST | `/api/sync/paper/[id]` | 同步单张试卷 |

**`/api/sync/topics` 请求体：**

```ts
{
  fromUserId: string, // 通过 code 解析得到
  topicIds: string[], // 要同步的根目录
}
```

**同步 API 响应（异步模式）：**

同步操作通过 SyncRecord 跟踪进度，后端异步执行，前端轮询状态。

```ts
// 提交同步请求 → 202
{
  ok: true,
  syncRecordId: string, // 轮询此 id
  status: "pending" | "running" | "done" | "failed",
}
```

**`GET /api/sync/status?id=SYNC_RECORD_ID`：**

```ts
// 轮询响应
{
  ok: true,
  status: "pending" | "running" | "done" | "failed",
  progress?: {
    createdTopics: number,
    createdQuestions: number,
    skippedQuestions: number,
    createdTopicMap: { [fromTopicId: string]: string },
  },
  error?: string, // status=failed 时
}
```

SyncRecord 生命周期：
1. `pending`：请求已接受，排队等待执行
2. `running`：正在执行同步
3. `done`：同步完成，`progress` 字段包含最终统计
4. `failed`：同步失败，`error` 字段包含错误信息

## 5. 同步算法

### 5.1 同步目录（整棵子树）

```ts
async function syncTopics(fromUserId: string, topicIds: string[], toUserId: string) {
  // 1. 收集所有要同步的 topic（选中节点 + 子孙）
  const allFromTopics = await collectSubtree(topicIds); // BFS

  // 2. 过滤掉对码不可见的 topic（防止伪造 id 越权）
  const visibleTopics = allFromTopics.filter(t => isTopicVisibleToCode(t.id));

  // 3. 收集这些 topic 下的可见题目
  const fromQuestions = await prisma.question.findMany({
    where: {
      ownerId: fromUserId,
      topicId: { in: visibleTopics.map(t => t.id) },
      deletedAt: null,
      forceHidden: false,
    },
  });
  // 进一步过滤：题本身 visibility=public OR topic 可见（已在 visibleTopics 内）

  // 4. 在 toUser 库内创建目录副本，保留树形结构
  //    id 映射：fromId → newId
  const topicMap = new Map<string, string>();
  // 按层级顺序创建（父先建），同名目录跳过
  for (const t of sortByDepth(visibleTopics)) {
    // 冲突检测：toUser 下同父同名
    const existing = await prisma.topic.findFirst({
      where: { userId: toUserId, parentId: topicMap.get(t.parentId) ?? null, name: t.name },
    });
    if (existing) {
      topicMap.set(t.id, existing.id);
      continue;
    }
    const created = await prisma.topic.create({
      data: {
        userId: toUserId,
        parentId: t.parentId ? topicMap.get(t.parentId) ?? null : null,
        name: t.name,
        sortOrder: t.sortOrder,
        visibility: "private", // 同步过来的副本默认私有
      },
    });
    topicMap.set(t.id, created.id);
  }

  // 5. 创建题目副本，同题干跳过
  let createdQ = 0, skippedQ = 0;
  for (const q of fromQuestions) {
    // 冲突检测：toUser 下同题干（title + body 完全一致）
    const dup = await prisma.question.findFirst({
      where: { ownerId: toUserId, title: q.title, body: q.body, deletedAt: null },
    });
    if (dup) { skippedQ++; continue; }

    await prisma.question.create({
      data: {
        ownerId: toUserId,
        topicId: topicMap.get(q.topicId) ?? null,
        direction: q.direction,
        difficulty: q.difficulty,
        title: q.title,
        body: q.body,
        referenceAnswer: q.referenceAnswer,
        detailedAnswer: q.detailedAnswer,
        answerGeneratedByAi: q.answerGeneratedByAi,
        tags: q.tags,
        visibility: "private",
        forceHidden: false,
        sourceId: q.id,
      },
    });
    await prisma.question.update({
      where: { id: q.id },
      data: { cloneCount: { increment: 1 } },
    });
    createdQ++;
  }

  return { createdTopics: ..., createdQuestions: createdQ, skippedQuestions: skippedQ, topicMap };
}
```

### 5.2 同步试卷

```ts
async function syncPaper(fromPaperId: string, toUserId: string) {
  const paper = await prisma.testPaper.findFirst({
    where: { id: fromPaperId, isPublic: true },
    include: { items: { include: { question: true } } },
  });
  if (!paper) throw new Error("试卷不存在或未公开");

  // 同名试卷冲突：跳过整张
  const dup = await prisma.testPaper.findFirst({
    where: { userId: toUserId, title: paper.title },
  });
  if (dup) return { ok: false, reason: "同名试卷已存在", skipped: true };

  // 复制试卷 + 题目（题目按 syncTopics 同款逻辑：同题干跳过并复用）
  return await prisma.$transaction(async (tx) => {
    const newPaper = await tx.testPaper.create({
      data: {
        userId: toUserId,
        title: paper.title,
        description: paper.description,
        timeLimit: paper.timeLimit,
        isPublic: false, // 副本默认私有
      },
    });

    for (const item of paper.items) {
      const q = item.question;
      // 题目副本：同题干跳过
      let localQ = await tx.question.findFirst({
        where: { ownerId: toUserId, title: q.title, body: q.body, deletedAt: null },
      });
      if (!localQ) {
        localQ = await tx.question.create({
          data: {
            ownerId: toUserId,
            topicId: null,
            direction: q.direction,
            difficulty: q.difficulty,
            title: q.title,
            body: q.body,
            referenceAnswer: q.referenceAnswer,
            detailedAnswer: q.detailedAnswer,
            answerGeneratedByAi: q.answerGeneratedByAi,
            tags: q.tags,
            visibility: "private",
            sourceId: q.id,
          },
        });
        await tx.question.update({
          where: { id: q.id },
          data: { cloneCount: { increment: 1 } },
        });
      }
      await tx.testPaperItem.create({
        data: {
          paperId: newPaper.id,
          questionId: localQ.id,
          sortOrder: item.sortOrder,
        },
      });
    }

    return { ok: true, paperId: newPaper.id, questionCount: paper.items.length };
  });
}
```

### 5.3 同步全部

`/api/sync/all`：取该用户所有公开 Topic 的根节点 + 所有公开试卷，调 `syncTopics` + 逐张 `syncPaper`。

## 6. 状态流转

### 6.1 公开状态切换

```
Topic:  private ⇄ public ⇄ force_off
                ↑_________|  (force_off 不能直接转 public？可以，UI 提供三选项)
```

实际 UI 提供"设为公开 / 强制关闭 / 私有"三按钮，任意切换。

### 6.2 同步流程状态

```
[输入码] → [校验码存在] → [加载公开主页]
                              ↓
                   [选择目录/试卷]
                              ↓
                   [提交同步请求]
                              ↓
                   [服务端执行：复制目录 → 复制题目 → 跳过冲突]
                              ↓
                   [返回统计结果] → [跳转我的题库]
```

## 7. 异常处理

| 场景 | 处理 |
|---|---|
| 码不存在 | `/u/CODE` 返回 404，提示"分享码无效" |
| 码已被重置 | 同上（旧码从 DB 删除/覆盖） |
| 同步时源内容被删 | 跳过该项，记入 skipped |
| 同步时网络中断 | 同步操作是事务性的，要么全成功要么全回滚 |
| 越权访问（伪造 fromUserId） | 服务端不信任前端传的 fromUserId，必须通过 shareCode 反查；topicId/paperId 必须校验属于该 fromUserId 且可见 |
| 同名目录冲突 | 跳过创建，复用现有目录，下属题目挂到现有目录下 |
| 同题干冲突 | 跳过创建，不挂到任何目录（题已存在） |
| 同名试卷冲突 | 整张跳过 |

## 8. 测试方案

### 8.1 单元测试（vitest）

**可见性算法**

- `isTopicVisibleToCode`：
  - 全私有 → false
  - 根 public → true
  - 根 public，子 force_off → 子 false，孙 false
  - 根 private，子 public → 子 true
  - 根 force_off → 整棵 false

- `isQuestionVisibleToCode`：
  - visibility=public → true
  - visibility=private，topic private → false
  - visibility=private，topic public → true
  - forceHidden=true → false（无论其他）

- `isInExplore`：
  - visibility=public, forceHidden=false → true
  - visibility=public, forceHidden=true → false
  - visibility=private（即使 topic public）→ false

**同步算法**

- 同步目录：源 3 目录 5 题，目标空 → 创建 3 目录 5 题
- 同步目录：目标已有同名目录 → 跳过目录，题目挂到现有目录
- 同步目录：目标已有同题干题 → 跳过该题
- 同步试卷：源 3 题，目标空 → 创建 1 试卷 3 题
- 同步试卷：目标已有同名试卷 → 整张跳过
- 同步试卷：目标已有同题干题 → 题目跳过，试卷内引用本地已有题
- 越权：传别人的 topicId（不在 fromUser 公开范围）→ 跳过该 topic

### 8.2 集成测试

- 注册新用户 → 自动生成 shareCode（8 位、字符集正确）
- 重置 shareCode → 旧码 404，新码可用
- 一键公开根目录 → 子目录继承公开 → 凭码可见
- 根目录公开 + 子目录 force_off → 凭码只可见非 force_off 部分
- 同步选中目录 → 副本出现在自己库，sourceId 指向源，cloneCount +1
- 同步全部 → 所有公开内容过来

### 8.3 手工验证

部署后用两个账号（A、B）端到端跑：

1. A 注册 → 拿到 shareCode
2. A 建目录树 → 设根目录公开 → 子目录 force_off
3. B 输 A 的码 → 看到 A 的公开主页 → 目录树显示正确（force_off 部分不显示）
4. B 勾选目录同步 → 自己库出现副本 → 再同步一次 → 冲突跳过
5. A 重置码 → B 用旧码访问 → 404

## 9. 实施步骤

按依赖顺序，每步可独立测试：

1. **Schema 变更**：User.shareCode、Topic.visibility、Question.forceHidden、SyncRecord（可选）
   - `prisma db push`，写迁移脚本回填已有 User 的 shareCode
2. **lib/share-code.ts**：生成、校验、重置逻辑
3. **注册流程接入**：注册时自动生成 shareCode
4. **lib/visibility.ts**：可见性算法（isTopicVisibleToCode 等）
5. **API：分享码**（GET/reset）
6. **API：批量公开**（topics/questions batch-visibility）
7. **API：公开主页** `/api/u/[code]`
8. **API：同步**（topics / all / paper）
9. **页面：设置页分享码区**
10. **页面：题库管理页公开控件 + 一键公开按钮**
11. **页面：`/u/[code]` 公开主页**
12. **页面：导航栏同步入口 + 输码弹窗**
13. **页面：同步进度 + 完成**
14. **测试**：单元 + 集成 + 手工
15. **部署**：scp 源码 + `prisma db push` + `pm2 restart`

每步完成后跑测试，确保不破坏现有功能。

## 10. 已确认

1. **广场是否包含目录公开的题？** ✅ 是。目录公开的题也进广场，`isInExplore` 增加 Topic 可见性传播逻辑。
2. **同步进度页是否做？** ✅ 做。同步走异步模式：提交返回 202 + syncRecordId，前端轮询 `GET /api/sync/status`。
3. **SyncRecord 同步记录页是否做？** ✅ 做。在设置页增加"我的同步记录"入口，列表展示历史同步记录。
4. **重置码的频率限制？** ✅ 一天一次。`POST /api/me/share-code/reset` 检查 `shareCodeSetAt`，距上次重置不足 24 小时则拒绝。
