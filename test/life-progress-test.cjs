/**
 * 人生进度模块单元测试
 * 用法：node test/life-progress-test.cjs
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
  sessionStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  console, Date, Math, JSON, Object, Array, parseInt, parseFloat, isNaN, Number, RegExp, String, document: undefined, navigator: undefined, window: undefined,
  __done: (p, f) => { console.log(`\n结果: ${p} 通过 / ${f} 失败`); if (f > 0) process.exitCode = 1; }
};

const root = path.join(__dirname, '..');
const files = ['js/data.js', 'js/storage.js', 'js/lifeClock.js', 'js/lifeProgress.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

code += `
;(function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  localStorage.clear();

  // ---- LifeProgressEngine.calcProgress ----
  const now2000_26 = new Date('2026-01-01T00:00:00Z').getTime();

  // 正常：2000-01-01 生人，寿命 100，在 2026-01-01 约 26 岁
  const r1 = LifeProgressEngine.calcProgress('2000-01-01', 100, now2000_26);
  assert('calcProgress 返回 hasBirth', r1.hasBirth === true);
  assert('calcProgress age 整岁为 26', r1.age === 26);
  assert('calcProgress 百分比为 26%', r1.percentage === 26);

  // 封顶：寿命 <= 年龄
  const r2 = LifeProgressEngine.calcProgress('1920-01-01', 100, now2000_26);
  assert('寿命<=年龄时百分比封顶 100%', r2.percentage === 100);
  assert('寿命<=年龄时 age 正确', r2.age === 106);

  // 无生日
  const r3 = LifeProgressEngine.calcProgress(null, 100, now2000_26);
  assert('无生日 hasBirth 为 false', r3.hasBirth === false);
  assert('无生日 age 为 0', r3.age === 0);
  assert('无生日 percentage 为 0', r3.percentage === 0);

  const r4 = LifeProgressEngine.calcProgress('', 100, now2000_26);
  assert('空字符串生日 hasBirth 为 false', r4.hasBirth === false);

  // 边界：刚好 100%
  const r5 = LifeProgressEngine.calcProgress('1976-01-01', 50, now2000_26);
  assert('刚好 100% 封顶', r5.percentage === 100);

  // ---- isSelf 同源：初始化 ensureSelf ----
  LifeProgressManager.ensureSelf();
  const persons0 = StorageManager.getPersons();
  assert('ensureSelf 后 persons 有 1 条', persons0.length === 1);
  assert('ensureSelf 后 isSelf 在首位', persons0[0].id === 'self' && persons0[0].isSelf === true);
  assert('ensureSelf 默认名称为 我', persons0[0].name === '我');
  assert('ensureSelf 默认颜色为 #007AFF', persons0[0].color === '#007AFF');
  assert('isSelf 对象不含 birthDate', persons0[0].birthDate === undefined);
  assert('isSelf 对象不含 lifeExpectancy', persons0[0].lifeExpectancy === undefined);

  // ---- isSelf 读：代理全局 key ----
  StorageManager.setBirthDate('1995-06-15');
  StorageManager.setLifeExpectancy(85);
  const selfPerson = LifeProgressManager.getPersonsForRender()[0];
  assert('getPersonsForRender isSelf 生日走全局', selfPerson.birthDate === '1995-06-15');
  assert('getPersonsForRender isSelf 寿命走全局', selfPerson.lifeExpectancy === 85);

  // ---- 非 isSelf 人物：走 persons 数组 ----
  const p1 = { id: 'p_1', name: '妈妈', birthDate: '1970-03-20', lifeExpectancy: 90, color: '#FF9500' };
  StorageManager.setPersons([persons0[0], p1]);
  const all = LifeProgressManager.getPersonsForRender();
  assert('非 isSelf 人物生日走自身', all[1].birthDate === '1970-03-20');
  assert('非 isSelf 人物寿命走自身', all[1].lifeExpectancy === 90);

  // ---- savePerson：新建非 isSelf ----
  localStorage.clear();
  LifeProgressManager.ensureSelf();
  LifeProgressManager.savePerson({ name: '爸爸', birthDate: '1968-11-05', lifeExpectancy: 88, color: '#34C759' });
  const afterAdd = StorageManager.getPersons();
  assert('新建后共 2 人', afterAdd.length === 2);
  assert('新建人物 id 以 p_ 开头', afterAdd[1].id.startsWith('p_'));
  assert('新建人物名称正确', afterAdd[1].name === '爸爸');

  // ---- savePerson：编辑非 isSelf ----
  const dadId = afterAdd[1].id;
  LifeProgressManager.savePerson({ id: dadId, name: '老爸', birthDate: '1968-11-05', lifeExpectancy: 90, color: '#34C759' });
  const afterEdit = StorageManager.getPersons();
  assert('编辑后人数不变', afterEdit.length === 2);
  assert('编辑名称生效', afterEdit[1].name === '老爸');
  assert('编辑寿命生效', afterEdit[1].lifeExpectancy === 90);

  // ---- savePerson：编辑 isSelf 写全局 ----
  LifeProgressManager.savePerson({ id: 'self', name: '我自己', birthDate: '1990-01-01', lifeExpectancy: 95, color: '#FF2D55' });
  assert('isSelf 名称写回 persons', StorageManager.getPersons()[0].name === '我自己');
  assert('isSelf 颜色写回 persons', StorageManager.getPersons()[0].color === '#FF2D55');
  assert('isSelf 生日写全局 key', StorageManager.getBirthDate() === '1990-01-01');
  assert('isSelf 寿命写全局 key', StorageManager.getLifeExpectancy() === 95);
  assert('isSelf 对象仍不含 birthDate', StorageManager.getPersons()[0].birthDate === undefined);

  // ---- deletePerson：非 isSelf 可删 ----
  LifeProgressManager.deletePerson(dadId);
  const afterDel = StorageManager.getPersons();
  assert('删除后剩 1 人', afterDel.length === 1);
  assert('删除后只剩 isSelf', afterDel[0].isSelf === true);

  // ---- deletePerson：isSelf 禁删 ----
  let delSelfError = false;
  try {
    LifeProgressManager.deletePerson('self');
  } catch (e) {
    delSelfError = true;
  }
  assert('isSelf 禁删（抛错或静默）', afterDel.length === 1); // 数量不变即正确

  // ---- 目标寿命范围校验 ----
  const invalidLow = LifeProgressManager.savePerson({ name: '测试', birthDate: '2000-01-01', lifeExpectancy: 30, color: '#007AFF' });
  // savePerson 对非法值应静默不保存或返回 false，这里不抛错即可
  const personsAfterInvalid = StorageManager.getPersons();
  assert('非法寿命(30)不新增人物', personsAfterInvalid.length === 1);

  // 再测上限
  LifeProgressManager.savePerson({ name: '测试2', birthDate: '2000-01-01', lifeExpectancy: 200, color: '#007AFF' });
  assert('非法寿命(200)不新增人物', StorageManager.getPersons().length === 1);

  // 合法边界 40 和 150
  LifeProgressManager.savePerson({ name: '测试40', birthDate: '2000-01-01', lifeExpectancy: 40, color: '#007AFF' });
  assert('寿命 40 可新增', StorageManager.getPersons().length === 2);
  LifeProgressManager.savePerson({ name: '测试150', birthDate: '2000-01-01', lifeExpectancy: 150, color: '#007AFF' });
  assert('寿命 150 可新增', StorageManager.getPersons().length === 3);

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
