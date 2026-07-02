const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const cssPath = path.join(ROOT, 'css', 'style.css');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

const css = fs.readFileSync(cssPath, 'utf-8');

// 测试 1：非编辑模式下卡片仍保持 overflow: hidden，避免内层内容意外外露
const baseCardRule = css.match(/\.home-list-card\s*\{[^}]+\}/);
assert(baseCardRule && /overflow:\s*hidden/.test(baseCardRule[0]),
  '非编辑模式 .home-list-card 仍设置 overflow: hidden');

// 测试 2：编辑模式下卡片 overflow 改为 visible，使左侧删除角标不被截断
const editingCardRule = css.match(/\.home-list-editing\s+\.home-list-card\s*\{[^}]+\}/);
assert(editingCardRule && /overflow:\s*visible/.test(editingCardRule[0]),
  '编辑模式 .home-list-editing .home-list-card 设置 overflow: visible');

// 测试 3：删除角标在编辑模式下显示，并绝对定位在卡片左侧
const deleteRule = css.match(/\.home-list-card-delete\s*\{[^}]+\}/);
assert(deleteRule && /position:\s*absolute/.test(deleteRule[0]),
  '.home-list-card-delete 使用 absolute 定位');
const editingDeleteRule = css.match(/\.home-list-editing\s+\.home-list-card-delete\s*\{[^}]+\}/);
assert(editingDeleteRule && /display:\s*flex/.test(editingDeleteRule[0]),
  '编辑模式 .home-list-card-delete 显示为 flex');

console.log('\n🎉 所有测试通过');
