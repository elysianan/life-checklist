# Task 5 报告：自定义模式 — 修复拖动排序

## 实现内容

按任务简报要求，仅修改 `js/app.js` 中的 `DragSortManager`：

- `_onTouchStart`：移除 `if (AppState.isEditing) return;` 检查，使自定义编辑模式下长按可触发拖动；新增 `e.target.closest('.home-list-card-delete')` 判断，避免点击删除角标时误触发拖动。
- `_onMouseDown`：同步移除编辑模式限制，并添加相同的删除角标保护。

未改动其它拖动逻辑（`_startDrag`、`_enterDragState`、`_onMove`、`_onEnd` 等保持原样）。

## 测试结果

### 单元测试

运行全部 `.cjs` 单元测试，结果如下：

| 测试文件 | 结果 |
| --- | --- |
| recommendations-test.cjs | 15 通过 / 0 失败 |
| goal-breakdown-test.cjs | 22 通过 / 0 失败 |
| life-clock-test.cjs | 18 通过 / 0 失败 |
| life-progress-test.cjs | 38 通过 / 0 失败 |
| report-test.cjs | 21 通过 / 0 失败 |
| settings-test.cjs | 4 通过 / 0 失败 |
| datepicker-test.cjs | 7 通过 / 0 失败 |
| home-quick-create-test.cjs | 通过 |
| timeline-test.cjs | 29 通过 / 0 失败 |
| datepicker-active-test.cjs | 4 通过 / 0 失败 |
| storage-test.cjs | 通过 |
| home-stats-overview-test.cjs | 通过 |

全部通过，无回归。

### 浏览器验证

使用 Playwright 在 Chromium 中打开 `index.html`，验证以下场景：

1. **编辑模式长按可拖动**：点击首页右上角「自定义」进入编辑模式，长按第一张清单卡片约 600ms 后，原卡片获得 `home-list-card-dragging` 类，并生成 `home-list-card-ghost` 幽灵元素。
2. **拖动换位**：将卡片向下拖动约 150px 后松开，卡片落位到新位置。
3. **顺序持久化**：退出编辑模式后，卡片顺序保持为拖动后的结果。
4. **删除角标不误触发**：重新进入编辑模式，直接点击卡片右上角删除按钮，未生成 ghost 元素，未进入拖动状态。

验证脚本：`test-screenshots/verify-task5-drag.cjs`（已删除临时文件，未提交）。

## 文件变更

- `js/app.js`：修改 `DragSortManager._onTouchStart` 和 `_onMouseDown`。

## Self-review

- 改动范围严格限定在任务要求的两处事件处理函数内，未影响其它拖动逻辑。
- 删除角标通过 `e.target.closest('.home-list-card-delete')` 提前 return，避免与卡片的点击/长按事件冲突。
- 全部现有单元测试通过，未引入回归。
- 浏览器端到端验证覆盖任务简报中的三项验收点。

## 问题或顾虑

无。
