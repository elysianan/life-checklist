/**
 * Node 版单元测试运行器（与 report-test.html 断言保持一致）
 * 用法：node test/report-test.cjs
 * 原理：mock localStorage，用 vm 在同一作用域内加载浏览器全局脚本后跑断言。
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// 模拟浏览器 localStorage
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
const files = ['js/data.js', 'js/storage.js', 'js/settings.js', 'js/aiService.js', 'js/report.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

// 准备 mock 数据（完成日期为今天，使用本地日期避免时区偏差）
const today = new Date();
const T = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
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

// 断言代码必须与被测脚本在同一 vm 作用域内执行（const 不跨 runInContext 共享）
code += `
;(async function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  localStorage.clear();
  StorageManager.setLists(${JSON.stringify(SEED_LISTS)});
  StorageManager.setStreakData({currentStreak:5,longestStreak:9,lastCheckDate:new Date().toDateString(),todayChecked:true});
  StorageManager.setBirthDate('1998-01-01');

  // ---- Task 1：数据聚合 ----
  const r = ReportManager.aggregateReportData('all');
  assert('aggregateReportData 返回对象', r && typeof r==='object');
  assert('全部时段完成数为 3', r.totalCompleted===3);
  assert('hasData 为 true', r.hasData===true);
  assert('最活跃分类是环游世界(2件)', r.topCategory && r.topCategory.title==='环游世界' && r.topCategory.count===2);
  assert('byCategory 按 count 降序', r.byCategory[0].count>=r.byCategory[1].count);
  assert('streak 透传正确', r.streak.current===5 && r.streak.longest===9);
  assert('lifeProgress 含年龄', typeof r.lifeProgress.age==='number' && r.lifeProgress.age>0);
  const rMonth = ReportManager.aggregateReportData('month');
  assert('本月完成数为 3', rMonth.totalCompleted===3);

  // ---- Task 2：规则引擎 ----
  const narrative = AIService.callRuleEngine(r);
  assert('callRuleEngine 返回 source=rule', narrative.source==='rule');
  assert('生成 4 段文案', Array.isArray(narrative.paragraphs) && narrative.paragraphs.length===4);
  assert('每段非空字符串', narrative.paragraphs.every(p=>typeof p==='string' && p.length>0));
  assert('文案包含完成数字', narrative.paragraphs[0].includes('3'));

  // ---- Task 3：AI 配置 ----
  SettingsManager.setAIConfig({ provider:'deepseek', apiKey:'sk-test', enabled:true });
  const cfg = SettingsManager.getAIConfig();
  assert('AI 配置已保存 provider', cfg.provider==='deepseek');
  assert('AI 配置带 baseURL', cfg.baseURL.includes('deepseek'));
  assert('AI 配置 enabled', cfg.enabled===true);
  SettingsManager.setAIConfig({ enabled:false, apiKey:'' });

  // ---- Task 4：混合入口 ----
  const n = await AIService.generateNarrative(r);
  assert('未启用时降级为规则引擎', n.source==='rule');
  assert('buildPrompt 含完成数', AIService.buildPrompt(r).includes(String(r.totalCompleted)));

  // ---- Task 6：报告卡片渲染（纯函数）----
  const html6 = ReportManager._buildCardHTML(r, n);
  assert('卡片含完成事项', html6.includes('完成事项'));
  assert('卡片含分类洞察', html6.includes('分类洞察'));
  assert('卡片含时段标签', html6.includes(r.periodLabel));
  assert('纯文本含标题', ReportManager._plainText(r, n).includes('我的人生报告'));

  __done(passed, failed);
})();
`;

vm.runInNewContext(code, sandbox, { filename: 'report-test-bundle.js' });
