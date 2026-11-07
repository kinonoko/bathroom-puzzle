/* 全黑極簡像素排版 */
:root {
  --bg-color: #000000;
  --text-main: #e0e0e0;
  --text-dim: #555555;
  --accent-red: #c92a2a;
  --font-pixel: "DotGothic16", monospace, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
}

body {
  background-color: var(--bg-color);
  color: var(--text-main);
  font-family: var(--font-pixel);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-x: hidden;
}

/* 氛圍暗角，隨真相質變 */
#vignette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.95);
  transition: box-shadow 1.5s ease;
  z-index: 50;
}

body.corrupted #vignette-overlay {
  box-shadow: inset 0 0 180px rgba(180, 20, 20, 0.6);
}

/* 畫面切換容器 */
.screen-view {
  display: none;
  width: 100%;
  max-width: 780px;
  min-height: 80vh;
  padding: 40px 24px;
  position: relative;
  z-index: 10;
}

.screen-view.active {
  display: flex;
  flex-direction: column;
}

/* 1. 封面畫面 */
#title-screen {
  justify-content: center;
  align-items: center;
  text-align: center;
}

.main-pixel-title {
  font-size: 4rem;
  letter-spacing: 0.8rem;
  margin-bottom: 50px;
  color: #fff;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
}

/* 2. 主遊戲頂部 HUD */
.game-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 1px dashed #222;
  padding-bottom: 12px;
}

.hud-title {
  font-size: 1.4rem;
  letter-spacing: 0.2rem;
  color: #fff;
  transition: all 0.5s ease;
}

.hud-title.corrupted {
  color: var(--accent-red);
  text-shadow: 0 0 10px rgba(201, 42, 42, 0.8);
  letter-spacing: 0.35rem;
}

.hud-deaths {
  font-size: 1rem;
  color: var(--text-dim);
}

/* 3. 打字機文字區域 */
.text-viewport {
  min-height: 220px;
  line-height: 2.1;
  font-size: 1.25rem;
  letter-spacing: 0.05rem;
  margin-bottom: 30px;
  cursor: pointer; /* 點擊可快進文字 */
}

#typewriter-output {
  display: inline;
  white-space: pre-wrap;
}

.blinking-cursor {
  display: inline-block;
  color: #fff;
  animation: blink 0.8s infinite;
  font-weight: bold;
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

/* 4. 密碼輸入框 */
.puzzle-box {
  margin-bottom: 24px;
  padding: 14px 0;
  border-top: 1px solid #1a1a1a;
  border-bottom: 1px solid #1a1a1a;
}

.puzzle-prompt {
  font-size: 1.05rem;
  color: #888;
  margin-bottom: 10px;
}

.input-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.prompt-arrow {
  color: #fff;
  font-size: 1.2rem;
}

#puzzle-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid #444;
  color: #fff;
  font-family: var(--font-pixel);
  font-size: 1.2rem;
  padding: 4px 8px;
  flex: 1;
  outline: none;
}

#puzzle-input:focus {
  border-color: #fff;
}

.puzzle-error {
  color: var(--accent-red);
  font-size: 0.95rem;
  margin-top: 8px;
  min-height: 1.2rem;
}

/* 5. 選項清單（極簡文字風格） */
.choices-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: auto;
}

.pixel-choice-btn,
.pixel-link-btn {
  background: transparent;
  border: none;
  color: #999;
  font-family: var(--font-pixel);
  font-size: 1.15rem;
  text-align: left;
  cursor: pointer;
  padding: 6px 0;
  letter-spacing: 0.05rem;
  transition: all 0.15s ease;
}

.pixel-choice-btn:hover,
.pixel-link-btn:hover {
  color: #ffffff;
  padding-left: 10px;
}

/* 踩雷劃線選項 */
.pixel-choice-btn.traumatized {
  text-decoration: line-through;
  color: #333333;
}

.pixel-choice-btn.traumatized:hover {
  color: var(--accent-red);
  padding-left: 0;
}

/* 6. 死亡全黑過場 */
#death-screen {
  justify-content: center;
  align-items: center;
  text-align: center;
}

.death-header {
  font-size: 2rem;
  color: var(--accent-red);
  letter-spacing: 0.4rem;
  margin-bottom: 24px;
}

.death-desc {
  font-size: 1.1rem;
  line-height: 1.9;
  color: #888;
  max-width: 540px;
  margin-bottom: 40px;
  white-space: pre-wrap;
}

.hidden {
  display: none !important;
}
