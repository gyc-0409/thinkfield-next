/**
 * 导入两本展示书（文学 + 理学），含讨论、思考、习题、解答与多层续写。
 *
 * 用法（在项目根目录）：
 *   node --env-file=.env.production scripts/seed-demo-books.mjs
 *   node --env-file=.env.local scripts/seed-demo-books.mjs
 *
 * 可选环境变量：
 *   SEED_AUTHOR=GYC   # 内容作者用户名（需已存在）
 */
import pg from 'pg';

const { Pool } = pg;

const AUTHOR = process.env.SEED_AUTHOR || 'GYC';
const LIT_ID = 'book-demo-literature';
const SCI_ID = 'book-demo-science';

if (!process.env.DATABASE_URL) {
  console.error('缺少 DATABASE_URL。请使用: node --env-file=.env.production scripts/seed-demo-books.mjs');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

function cutAfter(text, marker) {
  const idx = text.indexOf(marker);
  if (idx < 0) throw new Error(`找不到截断标记: ${marker}`);
  return idx + marker.length;
}

// ---------- 文学书内容 ----------
const litTree = [
  {
    id: 'n-lit-ch1',
    title: '第1章 叙事与视角',
    children: [
      { id: 'n-lit-1-1', title: '1.1 第一人称的限度', children: [] },
      { id: 'n-lit-1-2', title: '1.2 细节如何推动情感', children: [] },
    ],
  },
  {
    id: 'n-lit-ch2',
    title: '第2章 修辞与节奏',
    children: [
      { id: 'n-lit-2-1', title: '2.1 比喻的分寸', children: [] },
      { id: 'n-lit-2-2', title: '2.2 短句与长句', children: [] },
    ],
  },
];

const litQThought = `许多读者默认“我”讲述就更可信，但第一人称同样可能自我美化、选择性遗忘。细读时更应追问：叙述者知道什么、隐瞒什么、在哪一处突然改口。真实感往往来自限制，而不是来自人称本身。把“我”当成可靠证人，常会错过文本故意留下的缝隙。`;

const litQThought2 = `补充一点：有时作者会让第一人称故意“说错”，再用后文细节拆穿。这时不可靠叙述本身就是主题的一部分，讨论“真不真实”不如讨论“为何要让读者上当一次”。`;

const litExTitle = '分析文中“雨停了，巷子却更湿”一句的表达效果';
const litExContent = `结合上下文，说明作者为何不写“雨很大”或“巷子很湿”，而写“雨停了，巷子却更湿”。请从感觉、时间关系、情感余韵三方面作答，并尽量引用可观察的文本细节。答案请写完整；若你发现主答仍有未完成的论断，可用续写从关键句截断处补足。`;

const litAnswer = `这句话的力量首先来自“停”与“更湿”的反差。雨停通常意味着结束与轻松，但“却更湿”把结束改写成残留：水不会立刻消失，它渗进石缝、挂在檐角、黏在鞋底。读者因此感到时间被拉长——事情表面上过去了，身体与环境仍停留在刚才。

其次，它写的是可验证的生活经验，而不是抽象抒情。巷子在雨后确实常更潮，空气闷，墙上的水痕更清楚。作者把经验压成短句，让情绪藏在事实里，避免直接说“我很难过”或“余悸未消”。

最后，这句还改变了阅读节奏。前半“雨停了”收束，后半“巷子却更湿”再打开，像音乐里的终止后又起的弱音。情感不是高潮式爆发，而是退潮后的回声，更耐读。`;

const litCont1 = `若把这句放回全段，还会发现它在结构上承担“转场”。前面若写人在檐下等待、谈话中断或分别在即，雨停本可成为“可以走了”的信号；“巷子却更湿”则留住人物，暗示外在条件允许离开，内心或关系却仍滞留。湿意因此不仅是气象，也是未完成的情绪状态。

这样一来，句子就不只是修辞漂亮，而是叙事功能句：它推迟情节的下一步，让读者在“该结束而未结束”的缝隙里停留。续写至此，是把主答的“余韵”具体化为“情节上的停顿”，避免只谈感受、不谈文本作用。`;

const litCont2 = `也需警惕过度象征化。若上下文并无等待、分别或内疚等情节支撑，“湿”就应优先读作精确的感官描写；硬上升为情感寓言会削弱散文的具体性。更好的细读顺序或许是：先确认感官与反差，再问它是否刚好咬合人物处境。解释必须可被原文约束，续写的意义正在于把主答推到“可证伪”的边界上，而不是一路加戏。`;

const litOverall = '先抓住反差与余韵，再追问句子在叙事中的功能，最后用原文约束防止过度解读。';

// ---------- 理学书内容 ----------
const sciTree = [
  {
    id: 'n-sci-ch1',
    title: '第1章 极限与连续',
    children: [
      { id: 'n-sci-1-1', title: '1.1 极限的 ε-δ 语言', children: [] },
      { id: 'n-sci-1-2', title: '1.2 连续与间断', children: [] },
    ],
  },
  {
    id: 'n-sci-ch2',
    title: '第2章 导数与应用',
    children: [
      { id: 'n-sci-2-1', title: '2.1 导数的定义', children: [] },
      { id: 'n-sci-2-2', title: '2.2 中值定理初识', children: [] },
    ],
  },
];

const sciQThought = `“越来越近”无法排除振荡或伪装收敛的情况。$\\varepsilon$-$\\delta$ 的价值在于把“多近算近”变成可检验的全称—存在量词结构：$\\forall\\varepsilon>0,\\exists\\delta>0$，使证明与反驳都有公共语言。没有这套语言，很多看似正确的直观其实无法被证实或证伪。`;

const sciExTitle = '由定义证明 $f(x)=x^2$ 在 $x=1$ 处可导，并求 $f\'(1)$';
const sciExContent = `用导数定义
$$f'(a)=\\lim_{h\\to 0}\\frac{f(a+h)-f(a)}{h}$$
证明 $f(x)=x^2$ 在 $a=1$ 可导，求出导数值，并简要说明每一步在“消掉不确定型”时做了什么。完成本题后，可用续写补上 $\\varepsilon$-$\\delta$ 严格表述与几何解释。`;

const sciAnswer = `由定义，
$$
f'(1)=\\lim_{h\\to 0}\\frac{(1+h)^2-1^2}{h}=\\lim_{h\\to 0}\\frac{1+2h+h^2-1}{h}=\\lim_{h\\to 0}\\frac{2h+h^2}{h}.
$$
当 $h\\neq 0$ 时可约去 $h$，得
$$
\\lim_{h\\to 0}(2+h)=2.
$$
因此 $f$ 在 $x=1$ 可导，且 $f'(1)=2$。

说明：最初分子分母同趋于 $0$，属于 $\\frac{0}{0}$ 型；展开后出现公因子 $h$，约分后极限变为多项式极限，这是定义法计算的基本模式。`;

const sciCont1 = `若课程要求用 $\\varepsilon$-$\\delta$ 表述，可写：对任意 $\\varepsilon>0$，取 $\\delta=\\varepsilon$，则当 $0<|h|<\\delta$ 时，
$$
|(2+h)-2|=|h|<\\delta=\\varepsilon.
$$
故 $\\lim_{h\\to 0}(2+h)=2$，从而导数极限存在。这一步把“约分后显然”升级为可检查的证明语言，避免只停留在形式计算。`;

const sciCont2 = `几何上，$y=x^2$ 在 $x=1$ 处的切线斜率为 $2$，切线方程为 $y-1=2(x-1)$。更一般地，同一方法可得 $(x^2)'=2x$，并与幂函数法则一致。续写的意义在于：主答完成“会算”，续写完成“会证、会解释、会推广”，把一道计算题变成可迁移的方法模板。`;

const sciOverall = '先完成定义法计算，再补严格证明与几何迁移，体现续写如何抬高解答完整度。';

async function ensureAuthor(client) {
  const { rowCount } = await client.query('SELECT 1 FROM users WHERE username = $1', [AUTHOR]);
  if (rowCount === 0) {
    throw new Error(
      `用户 ${AUTHOR} 不存在。请先注册该账号，或设置 SEED_AUTHOR=已有用户名 后再运行。`
    );
  }
}

async function clearDemo(client) {
  const ids = [LIT_ID, SCI_ID];
  await client.query(
    `DELETE FROM comment_threads WHERE question_id IN (SELECT id FROM questions WHERE book_id = ANY($1::text[]))`,
    [ids]
  );
  await client.query('DELETE FROM questions WHERE book_id = ANY($1::text[])', [ids]);
  await client.query('DELETE FROM exercises WHERE book_id = ANY($1::text[])', [ids]);
  await client.query('DELETE FROM books WHERE id = ANY($1::text[])', [ids]);
}

async function insertBook(client, book) {
  await client.query(
    `INSERT INTO books (
      id, title, author, edition, publisher, isbn, translator, publish_year,
      hidden, type, tree
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10)`,
    [
      book.id,
      book.title,
      book.author,
      book.edition,
      book.publisher,
      book.isbn,
      book.translator || '',
      book.publishYear || '',
      book.type,
      JSON.stringify(book.tree),
    ]
  );
}

async function insertQuestion(client, q) {
  const thought0 = {
    id: `${q.id}-thought-0`,
    author: AUTHOR,
    content: q.thought,
    views: 0,
    likes: 0,
    liked_by: [],
    viewed_by: [],
    created_at: new Date().toISOString(),
  };
  const thoughts = [thought0];
  if (q.extraThought) {
    thoughts.push({
      id: `${q.id}-thought-1`,
      author: AUTHOR,
      content: q.extraThought,
      views: 0,
      likes: 0,
      liked_by: [],
      viewed_by: [],
      created_at: new Date().toISOString(),
    });
  }

  await client.query(
    `INSERT INTO questions (
      id, book_id, node_id, chapter, section, title, author, thought, location, type,
      unlocked, views, likes, viewed_by, liked_by, comments, thoughts, page_range
    ) VALUES ($1,$2,$3,0,0,$4,$5,$6,$7,$8,false,0,0,'[]','[]','[]',$9,$10)`,
    [
      q.id,
      q.bookId,
      q.nodeId,
      q.title,
      AUTHOR,
      q.thought,
      q.location || '',
      'question',
      JSON.stringify(thoughts),
      q.pageRange || null,
    ]
  );

  if (q.threadComment) {
    await client.query(
      `INSERT INTO comment_threads (id, question_id, thought_id, parent_id, author, content, quote_text, quote_start, quote_end)
       VALUES ($1,$2,$3,NULL,$4,$5,'',0,0)`,
      [`ct-demo-${q.id}`, q.id, thought0.id, AUTHOR, q.threadComment]
    );
  }
}

async function insertExerciseWithAnswer(client, ex) {
  const start1 = cutAfter(ex.answerContent, ex.cutMarker1);
  const cont1 = {
    id: `${ex.id}-cont-1`,
    start: start1,
    content: ex.cont1,
    motivation: ex.motivation1,
    author: AUTHOR,
    continuations: [],
    createdAt: new Date().toISOString(),
  };

  // 第二层续写：截在第一层续写的标记处
  const start2 = cutAfter(ex.cont1, ex.cutMarker2);
  cont1.continuations = [
    {
      id: `${ex.id}-cont-2`,
      start: start2,
      content: ex.cont2,
      motivation: ex.motivation2,
      author: AUTHOR,
      continuations: [],
      createdAt: new Date().toISOString(),
    },
  ];

  const answer = {
    id: `${ex.id}-ans-1`,
    author: AUTHOR,
    overallThought: ex.overallThought,
    content: ex.answerContent,
    continuations: [cont1],
    views: 0,
    likes: 0,
    liked_by: [],
    createdAt: new Date().toISOString(),
  };

  await client.query(
    `INSERT INTO exercises (id, book_id, node_id, chapter, section, title, content, author, answers)
     VALUES ($1,$2,$3,0,0,$4,$5,$6,$7)`,
    [
      ex.id,
      ex.bookId,
      ex.nodeId,
      ex.title,
      ex.content,
      AUTHOR,
      JSON.stringify([answer]),
    ]
  );
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureAuthor(client);
    await clearDemo(client);

    await insertBook(client, {
      id: LIT_ID,
      title: '展示用·现代散文细读',
      author: '思辨场示例',
      edition: '演示第1版',
      publisher: '思辨场演示出版社',
      isbn: 'DEMO-LIT-001',
      publishYear: '2026',
      type: 'literature',
      tree: litTree,
    });

    await insertBook(client, {
      id: SCI_ID,
      title: '展示用·微积分讲义选段',
      author: '思辨场示例',
      edition: '演示第1版',
      publisher: '思辨场演示出版社',
      isbn: 'DEMO-SCI-001',
      publishYear: '2026',
      type: 'science',
      tree: sciTree,
    });

    await insertQuestion(client, {
      id: `${LIT_ID}-q1`,
      bookId: LIT_ID,
      nodeId: 'n-lit-1-1',
      title: '第一人称是否必然更“真实”？',
      thought: litQThought,
      extraThought: litQThought2,
      location: '第1章 / 约第12页',
      pageRange: '10-14',
      threadComment: '很同意“真实感来自限制”。想追问：如果叙述者事后才知道真相，第一人称的“当时不知”会怎样改变读者的信任？',
    });

    await insertQuestion(client, {
      id: `${SCI_ID}-q1`,
      bookId: SCI_ID,
      nodeId: 'n-sci-1-1',
      title: '为什么直观的“无限接近”不够用？',
      thought: sciQThought,
      location: '第1章定理1.1 附近',
      pageRange: '3-8',
      threadComment: '能否举一个“看起来越来越近、但按定义并不收敛”的例子？例如振荡型。',
    });

    await insertExerciseWithAnswer(client, {
      id: 'exer-demo-lit-1',
      bookId: LIT_ID,
      nodeId: 'n-lit-1-2',
      title: litExTitle,
      content: litExContent,
      answerContent: litAnswer,
      overallThought: litOverall,
      cutMarker1: '更耐读。',
      cont1: litCont1,
      motivation1: '主答已说明反差与余韵，但未说明该句如何推动叙事；从“更耐读。”截断，补上结构功能。',
      cutMarker2: '不谈文本作用。',
      cont2: litCont2,
      motivation2: '上一续写可能把“湿”象征化过度；继续截断，讨论解释的边界，体现续写的纠偏价值。',
    });

    await insertExerciseWithAnswer(client, {
      id: 'exer-demo-sci-1',
      bookId: SCI_ID,
      nodeId: 'n-sci-2-1',
      title: sciExTitle,
      content: sciExContent,
      answerContent: sciAnswer,
      overallThought: sciOverall,
      cutMarker1: '基本模式。',
      cont1: sciCont1,
      motivation1: '计算已完成，但严格性不足；从“基本模式。”截断，补 ε-δ 证明。',
      cutMarker2: '形式计算。',
      cont2: sciCont2,
      motivation2: '证明补完后，再补几何意义与推广，展示续写如何把题做“完整”。',
    });

    await client.query('COMMIT');
    console.log('展示书导入成功。');
    console.log(`  文学: ${LIT_ID} 《展示用·现代散文细读》`);
    console.log(`  理学: ${SCI_ID} 《展示用·微积分讲义选段》`);
    console.log(`  作者用户名: ${AUTHOR}`);
    console.log('请到首页刷新查看；两本书均为公开（hidden=false）。');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('导入失败:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
