const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const storagePath = path.join(ROOT, 'js', 'storage.js');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

const store = new Map();

const localStorageMock = {
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
  removeItem(key) { store.delete(key); }
};

const sandbox = {
  assert,
  console,
  window: { localStorage: localStorageMock },
  localStorage: localStorageMock,
  DEFAULT_LIFE_EXPECTANCY: 80,
  DEFAULT_RETIRE_AGE: 60,
  DEFAULT_LISTS: [],
  ACHIEVEMENTS: [],
  TimelineEngine: { migrate: (x) => x }
};

vm.createContext(sandbox);

let storageCode = fs.readFileSync(storagePath, 'utf-8');
storageCode += `
;(function(){
  assert(StorageManager.getCustomQuote() === null, '自定义格言默认空');
  StorageManager.setCustomQuote({ text: '测试格言', author: '测试作者' });
  const q = StorageManager.getCustomQuote();
  assert(q && q.text === '测试格言' && q.author === '测试作者', '自定义格言可保存');
  StorageManager.clearCustomQuote();
  assert(StorageManager.getCustomQuote() === null, '自定义格言可清空');
})();
`;

vm.runInContext(storageCode, sandbox, { filename: 'storage.js' });

console.log('\n🎉 所有测试通过');
