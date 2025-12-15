# 美术资源放置与命名（本项目约定）

把贴图放到项目根目录的 `images/` 目录下（与 `game.js` 同级）。

## 普通宝石（7 种颜色）

路径：`images/gems/`

文件名（PNG，建议透明底正方形）：
- `gem_red.png`    （GemType.RED = 0）
- `gem_blue.png`   （GemType.BLUE = 1）
- `gem_green.png`  （GemType.GREEN = 2）
- `gem_yellow.png` （GemType.YELLOW = 3）
- `gem_purple.png` （GemType.PURPLE = 4）
- `gem_orange.png` （GemType.ORANGE = 5）
- `gem_white.png`  （GemType.WHITE = 6）

推荐尺寸：128x128 或 256x256（会在运行时按格子大小等比缩放）。

## 怪物（当前只有一个：devil）

路径：`images/monsters/`

文件名：
- `devil.png`

建议：透明底 PNG。代码会保留原有的发光/受击闪白效果，并且会用当前节拍颜色做轻微染色（可在 `js/main.js -> renderDevil()` 里关闭）。
