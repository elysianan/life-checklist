const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const htmlPath = path.join(ROOT, 'index.html');
const appPath = path.join(ROOT, 'js', 'app.js');
const cssPath = path.join(ROOT, 'css', 'style.css');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

const html = fs.readFileSync(htmlPath, 'utf-8');
const appCode = fs.readFileSync(appPath, 'utf-8');
const css = fs.readFileSync(cssPath, 'utf-8');

// 测试 1：首页统计概览只保留总清单和已完成
assert(
  html.includes('id="lists-total"') && html.includes('总清单'),
  'index.html 保留「总清单」统计列'
);
assert(
  html.includes('id="lists-completed"') && html.includes('已完成'),
  'index.html 保留「已完成」统计列'
);
assert(
  !html.includes('id="lists-tasks"') && !html.includes('总任务'),
  'index.html 已删除「总任务」统计列'
);

// 测试 2：updateListsOverview 函数体内不再计算总任务
const updateListsOverviewMatch = appCode.match(/function\s+updateListsOverview\s*\(\)\s*\{([\s\S]*?)\n\}/);
assert(
  updateListsOverviewMatch,
  'js/app.js 中存在 updateListsOverview 函数'
);
const updateListsOverviewBody = updateListsOverviewMatch[1];
assert(
  !/totalTasks/.test(updateListsOverviewBody),
  'updateListsOverview 函数体内不再计算 totalTasks'
);
assert(
  !/lists-tasks/.test(updateListsOverviewBody),
  'updateListsOverview 函数体内不再访问 lists-tasks 元素'
);

// 测试 3：两列布局样式正确
const itemRule = css.match(/\.lists-overview-item\s*\{[^}]+\}/);
assert(
  itemRule && /flex:\s*1/.test(itemRule[0]) && /text-align:\s*center/.test(itemRule[0]),
  'css/style.css 中 .lists-overview-item 设置 flex:1 与居中'
);

console.log('\n🎉 所有测试通过');
