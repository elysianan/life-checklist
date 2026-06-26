/**
 * Recommendations 模块单元测试
 * 用法：node test/recommendations-test.cjs
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const store = {};
const sandbox = {
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  },
  console, Date, Math, JSON, Object, Array, parseInt, parseFloat, isNaN,
  setTimeout, clearTimeout, AbortController: global.AbortController, fetch: global.fetch,
  __done: (p, f) => { console.log(`\n结果: ${p} 通过 / ${f} 失败`); if (f > 0) process.exitCode = 1; }
};

const root = path.join(__dirname, '..');
const files = ['js/data.js', 'js/storage.js', 'js/settings.js', 'js/aiService.js', 'js/recommendations.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

const today = new Date();
const T = today.toISOString().split('T')[0];
const SEED_LISTS = [
  { id: 'travel', emoji: '🌍', title: '环游世界', description: '', color: '#007AFF', category: '旅行',
    tasks: [
      { id: 'a', text: '看极光', completed: true, completedDate: T, note: '', priority: 'medium' },
      { id: 'b', text: '去巴黎', completed: true, completedDate: T, note: '', priority: 'medium' },
      { id: 'c', text: '潜水', completed: false, completedDate: '', note: '', priority: 'medium' }
    ] },
  { id: 'skills', emoji: '🎯', title: '技能解锁', description: '', color: '#FF9500', category: '成长',
    tasks: [
      { id: 'd', text: '学吉他', completed: true, completedDate: T, note: '', priority: 'medium' }
    ] }
];

code += `
;(async function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  localStorage.clear();
  StorageManager.setLists(${JSON.stringify(SEED_LISTS)});
  StorageManager.setAddedTemplates([]);
  StorageManager.setStreakData({currentStreak:5,longestStreak:9,lastCheckDate:new Date().toDateString(),todayChecked:true});

  // ---- Task 1：数据聚合 ----
  const ctx = RecommendationEngine._aggregateUserContext();
  assert('_aggregateUserContext 返回对象', ctx && typeof ctx==='object');
  assert('旅行分类完成数为 2', ctx.completedByCategory['旅行']===2);
  assert('成长分类完成数为 1', ctx.completedByCategory['成长']===1);
  assert('总完成数为 3', ctx.totalCompleted===3);

  // ---- Task 2：规则打分 ----
  const scored = RecommendationEngine._scoreTemplates(ctx);
  assert('_scoreTemplates 返回数组', Array.isArray(scored) && scored.length > 0);
  assert('已添加模板被过滤', !scored.some(s => s.template.id === 'travel'));
  assert('Top 1 是旅行相关模板',
    scored[0].template.category === '旅行' ||
    RecommendationEngine.RELATED_CATEGORIES['旅行'].includes(scored[0].template.category));

  // ---- Task 3：推荐理由 ----
  const reason = RecommendationEngine._buildReason(scored[0].template, ctx);
  assert('_buildReason 返回非空字符串', typeof reason === 'string' && reason.length > 0);
  assert('理由包含分类名', reason.includes(scored[0].template.category) || reason.includes('最近'));

  // ---- Task 4：完整推荐生成 ----
  const recs = await RecommendationEngine.getRecommendations({ limit: 3 });
  assert('getRecommendations 返回 items 数组', Array.isArray(recs.items) && recs.items.length === 3);
  assert('每项含 templateId、reason、source', recs.items.every(i => i.templateId && i.reason && i.source));
  assert('缓存已写入', localStorage.getItem('life_checklist_recommendations_cache') !== null);

  // ---- Task 5：AI 推荐理由润色降级 ----
  const polished = await AIService.generateRecommendationReason('测试理由', { title: '测试', category: '旅行' }, ctx);
  assert('未配置 AI 时返回 rule', polished.source === 'rule');
  assert('未配置 AI 时返回原理由', polished.text === '测试理由');

  // ---- Task 6：dismiss 后 forceRefresh 不再出现 ----
  {
    const initialItems = recs.items;
    RecommendationEngine.dismissRecommendation(initialItems[0].templateId);
    const afterDismiss = await RecommendationEngine.getRecommendations({ limit: 3, forceRefresh: true });
    assert('dismiss 后 forceRefresh 结果不含该模板', !afterDismiss.items.some(i => i.templateId === initialItems[0].templateId));
  }

  __done(passed, failed);
})();
`;

vm.runInNewContext(code, sandbox, { filename: 'recommendations-test-bundle.js' });
