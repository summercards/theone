# 第一阶段：UI交互视效优化（主页按钮Q弹化）

## 1. 扩充 canvas_utils.js
增加基于时间的物理弹簧缩放函数 `getBounceScale`，以及通用中心点缩放绘制方法 `drawWithCenterScale`。

## 2. 改造 page_home.js
- 引入新的工具函数。
- 将点击事件从单一的 `touchend` 升级为 `touchstart` + `touchend` 组合，以支持“按下”状态的视觉反馈。
- 使用 `drawWithCenterScale` 包裹现有的按钮绘制逻辑。
- 移除粗糙的帧动画 `clickAnimationFrame`，改用时间戳驱动真实的物理回弹动画。
