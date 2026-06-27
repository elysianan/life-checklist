/**
 * GoalBreakdown 模块单元测试
 * 用法：node test/goal-breakdown-test.cjs
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
const files = ['js/data.js', 'js/storage.js', 'js/settings.js', 'js/aiService.js', 'js/goalBreakdown.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

code += `
;(async function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  localStorage.clear();

  // ---- classifyGoal ----
  assert('「一年读完50本书」归为阅读', GoalBreakdownEngine.classifyGoal('一年读完50本书').category === '阅读');
  assert('「学游泳」归为成长', GoalBreakdownEngine.classifyGoal('我想学游泳').category === '成长');
  assert('「随便写点啥」无匹配', GoalBreakdownEngine.classifyGoal('随便写点啥') === null);

  // ---- buildLocalRoadmap ----
  const readingRoadmap = GoalBreakdownEngine.buildLocalRoadmap('一年读完50本书', '1年');
  assert('阅读类返回3阶段', readingRoadmap.phases.length === 3);
  assert('每阶段任务非空', readingRoadmap.phases.every(p => p.tasks.length >= 2 && p.tasks.length <= 4));
  assert('来源为 rule', readingRoadmap.source === 'rule');
  assert('阅读类 emoji 为 📚', readingRoadmap.emoji === '📚');

  const customRoadmap = GoalBreakdownEngine.buildLocalRoadmap('成为太阳系最靓的仔', '1年');
  assert('未命中关键词 category 为自定义', customRoadmap.category === '自定义');
  assert('未命中关键词 emoji 为 🎯', customRoadmap.emoji === '🎯');

  // ---- timeLabel 推算 ----
  assert('1年时间标签正确',
    readingRoadmap.phases[0].timeLabel === '第1-3个月' &&
    readingRoadmap.phases[1].timeLabel === '第4-8个月' &&
    readingRoadmap.phases[2].timeLabel === '第9-12个月');

  const threeMonth = GoalBreakdownEngine.buildLocalRoadmap('三个月练出腹肌', '3个月');
  assert('3个月时间标签正确',
    threeMonth.phases[0].timeLabel === '第1个月' &&
    threeMonth.phases[1].timeLabel === '第2个月' &&
    threeMonth.phases[2].timeLabel === '第3个月');

  // ---- createListFromRoadmap ----
  StorageManager.initializeData();
  const beforeLists = StorageManager.getLists().length;
  const newList = GoalBreakdownEngine.createListFromRoadmap(readingRoadmap);
  const afterLists = StorageManager.getLists().length;
  assert('清单数量 +1', afterLists === beforeLists + 1);
  assert('清单标题为原目标', newList.title === '一年读完50本书');
  assert('任务 id 全部唯一', new Set(newList.tasks.map(t => t.id)).size === newList.tasks.length);
  assert('任务 text 带阶段前缀', newList.tasks.every(t => /^阶段[123]·/.test(t.text)));
  assert('清单 category 合法', ['旅行','阅读','成长','美食','影视','音乐','挑战','人生','情感','体验','自定义'].includes(newList.category));

  // ---- AI 降级 ----
  const noKeyRoadmap = await GoalBreakdownEngine.generateRoadmap('成为插画师', '1年');
  assert('未配置 Key 时返回 rule', noKeyRoadmap.source === 'rule');
  assert('未配置 Key 时标记降级', noKeyRoadmap.degraded === true);

  // ---- _parseRoadmapJSON ----
  const validJSON = JSON.stringify({
    goal: '测试', duration: '1年', category: '阅读', emoji: '📚',
    phases: [
      { title: '阶段一', timeLabel: '第1-3个月', tasks: ['任务1'] },
      { title: '阶段二', timeLabel: '第4-8个月', tasks: ['任务2'] },
      { title: '阶段三', timeLabel: '第9-12个月', tasks: ['任务3'] }
    ]
  });
  const parsed = AIService._parseRoadmapJSON(validJSON);
  assert('合法 JSON 解析成功', parsed.goal === '测试');

  let threw = false;
  try { AIService._parseRoadmapJSON('{"goal":"坏数据"}'); } catch (e) { threw = true; }
  assert('缺 phases 抛错', threw);

  let unknownCat = AIService._parseRoadmapJSON(JSON.stringify({
    goal: '测试', duration: '1年', category: '外星人分类', emoji: '😂',
    phases: [
      { title: '阶段一', timeLabel: '', tasks: ['任务1'] },
      { title: '阶段二', timeLabel: '', tasks: ['任务2'] },
      { title: '阶段三', timeLabel: '', tasks: ['任务3'] }
    ]
  }));
  assert('未知 category 规整为自定义', unknownCat.category === '自定义');

  __done(passed, failed);
})();
`;

vm.runInNewContext(code, sandbox, { filename: 'goal-breakdown-test-bundle.js' });
