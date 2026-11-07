/**
 * 《浴室 / 浴逝》- 極簡像素文字引擎
 */

let gameState = {
  loopCount: 0,           // 輪迴次數（0 表示還沒死過）
  truthScore: 0,          // 真相值（底層計算，不顯露在面板）
  isCorrupted: false,     // 是否異化成「浴逝」
  traumaFlags: {},        // 踩雷選項標記
  unlockedClues: {},      // 已解鎖線索
  currentNode: "ROOM_MAIN"
};

// 打字機全域控制
let typewriterInterval = null;
let currentFullText = "";
let isTyping = false;

// ==========================================
// 故事文本庫（等你寫好填入）
// ==========================================
const storyData = {
  // ── 核心起點：房間中央 ──
  "ROOM_MAIN": {
    getText: () => {
      if (gameState.truthScore >= 70) {
        return "【請填入：真相值70%的腐爛異象描寫，例如：整個空間泛著濃重的死灰，被窩深處滲出的深色液體已經滴落到地磚上……】";
      } else if (gameState.loopCount > 0) {
        return "【請填入：第2輪以上醒來的描寫，例如：猛然吸入一口冰冷空氣。後頸像被鈍鐵敲碎一樣劇痛。鬧鐘在響，時間依然咬死在 07:00。】";
      }
      // 第一次開局純粹日常
      return "【請填入：第1輪最開頭的日常描寫，例如：鬧鐘發出尖銳蜂鳴。上午九點有重要的面試，絕對不能遲到。四肢感覺有些冰涼僵硬，該起床了。】";
    },
    choices: [
      {
        id: "GOTO_BATHROOM",
        text: "> 走進浴室，扭開水龍頭洗把臉",
        target: "NODE_BATHROOM"
      },
      {
        id: "GOTO_DESK",
        text: "> 查看書桌上的面試資料與公事包",
        target: "NODE_DESK"
      },
      {
        id: "RUSH_DOOR",
        text: "> 穿上外套，直接轉動玄關門把出門",
        isTraumaProne: true, // 踩雷死法
        target: "DEATH_DOOR",
        traumaWarning: "手指剛碰到門把，脊椎深處爆發一陣鑽心的極寒，潛意識在大聲慘叫：不要出去！"
      }
    ]
  },

  // ── 探索：書桌 ──
  "NODE_DESK": {
    getText: () => {
      if (gameState.unlockedClues["DESK_UNLOCKED"]) {
        return "抽屜已經打開了。\n裡面放著泛黃的備忘錄與一張被暗色污漬浸透的單據。";
      }
      return "【請填入：書桌日常描寫，例如：桌上放著整齊的履歷。最下層的抽屜掛著一個四位數密碼鎖。】";
    },
    puzzle: {
      active: () => !gameState.unlockedClues["DESK_UNLOCKED"],
      prompt: "抽屜密碼鎖提示：【我停止呼吸的時間（例如 0247）】",
      targetAnswer: "0247", // 可改為你想設定的數字
      onSuccess: () => {
        gameState.unlockedClues["DESK_UNLOCKED"] = true;
        addTruth(35);
        return "喀嗒。密碼鎖應聲解開。裡面是一份醫院的急診死亡判定單，時間清清楚楚記錄在深夜 02:47……";
      }
    },
    choices: [
      { text: "> 轉身回到房間中央", target: "ROOM_MAIN" }
    ]
  },

  // ── 探索：浴室 ──
  "NODE_BATHROOM": {
    getText: () => {
      if (gameState.truthScore >= 70) {
        return "浴室鏡面上的白霧被徹底擦乾。\n鏡子裡沒有站著的活人——倒影直直對準著地面，那裡正躺著一具後腦凝固在血泊裡的軀殼。";
      }
      return "【請填入：浴室第1次進去的描寫，例如：抽風機嗡嗡低鳴，水龍頭滴著水。鏡子上一片厚重的白霧，什麼都照不出來。】";
    },
    choices: [
      {
        id: "WIPE_MIRROR",
        text: "> 拿起毛巾，擦掉鏡子上的水霧",
        target: "ACTION_MIRROR"
      },
      {
        id: "CHECK_FLOOR",
        text: "> 視線往下，看向浴缸邊緣的地板",
        target: "ACTION_FLOOR"
      },
      { text: "> 離開浴室，回到房間中央", target: "ROOM_MAIN" }
    ]
  },

  // ── 動作：擦鏡子 ──
  "ACTION_MIRROR": {
    getText: () => {
      addTruth(20);
      return "毛巾擦過鏡面，玻璃光滑透亮。\n鏡中映出了身後的浴室門、毛巾架、天花板——\n唯獨鏡子正前方，原本該站著你的位置，空無一物。\n就好像你根本不存在。";
    },
    choices: [{ text: "> 慌張地後退一步", target: "NODE_BATHROOM" }]
  },

  // ── 動作：看地板（觸發真相） ──
  "ACTION_FLOOR": {
    getText: () => {
      if (gameState.truthScore < 50) {
        return "DEATH_SLIP"; // 真相值不夠，潛意識防禦觸發死亡
      }
      addTruth(40);
      return "浴缸邊緣有一道清晰凹痕，暗紅乾涸的血跡一路拖曳到門檻。\n昨晚洗澡時因嚴重低血糖引發暈眩，後腦狠狠砸在了門檻上……你全都想起來了。";
    },
    choices: [{ text: "> 顫抖著扶住牆壁", target: "NODE_BATHROOM" }]
  },

  // ── 踩雷死法描寫 ──
  "DEATH_DOOR": {
    isDeath: true,
    reason: "【請填入：玄關猝死描寫，例如：手剛握上門把，刺骨的極寒直接凍穿心臟。門縫下方湧出無數黑手將你拖倒在地，頸椎應聲折斷。】"
  },
  "DEATH_SLIP": {
    isDeath: true,
    reason: "視線掃向地磚的一瞬間，後腦爆發撕裂般的劇痛。溫熱黏稠的液體從後腦勺噴湧而出，眼前瞬間歸於黑暗。"
  }
};

// ==========================================
// 系統核心流程
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  // 封面「開始遊戲」按鈕
  document.getElementById("start-game-btn").addEventListener("click", () => {
    switchScreen("game-screen");
    renderNode("ROOM_MAIN");
  });

  // 點擊文本框跳過打字機動畫
  document.getElementById("text-viewport").addEventListener("click", skipTypewriter);

  // 甦醒按鈕
  document.getElementById("respawn-btn").addEventListener("click", respawn);

  // 謎題輸入
  document.getElementById("puzzle-submit-btn").addEventListener("click", handlePuzzleSubmit);
  document.getElementById("puzzle-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handlePuzzleSubmit();
  });
});

// 切換三大畫面
function switchScreen(screenId) {
  document.querySelectorAll(".screen-view").forEach(el => el.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
}

// 渲染節點
function renderNode(nodeId) {
  gameState.currentNode = nodeId;
  const node = storyData[nodeId];

  // 死亡判定
  if (node.isDeath || node.getText() === "DEATH_SLIP") {
    const deathReason = node.isDeath ? node.reason : storyData["DEATH_SLIP"].reason;
    triggerDeath(deathReason);
    return;
  }

  // 執行動字機跑字
  const text = node.getText();
  startTypewriter(text);

  // 處理謎題框
  const puzzleBox = document.getElementById("puzzle-box");
  document.getElementById("puzzle-error").textContent = "";
  if (node.puzzle && node.puzzle.active()) {
    puzzleBox.classList.remove("hidden");
    document.getElementById("puzzle-prompt").textContent = node.puzzle.prompt;
    document.getElementById("puzzle-input").value = "";
  } else {
    puzzleBox.classList.add("hidden");
  }

  // 渲染文字選項
  renderChoices(node.choices || []);
}

// 選項渲染（含踩雷劃線與創傷提醒）
function renderChoices(choices) {
  const container = document.getElementById("choices-wrapper");
  container.innerHTML = "";

  choices.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "pixel-choice-btn";

    const isTraumatized = gameState.traumaFlags[c.id];

    if (isTraumatized) {
      btn.classList.add("traumatized");
      btn.textContent = `~~ ${c.text} ~~`;
      btn.addEventListener("click", () => {
        const output = document.getElementById("typewriter-output");
        output.innerHTML += `\n\n<span style="color: var(--accent-red);">${c.traumaWarning || "身體抗拒著這段記憶，潛意識尖叫著阻止你。"}</span>`;
      });
    } else {
      btn.textContent = c.text;
      btn.addEventListener("click", () => {
        if (c.isTraumaProne) {
          gameState.traumaFlags[c.id] = true;
        }
        renderNode(c.target);
      });
    }

    container.appendChild(btn);
  });
}

// 打字機引擎
function startTypewriter(text) {
  clearInterval(typewriterInterval);
  isTyping = true;
  currentFullText = text;
  const output = document.getElementById("typewriter-output");
  output.textContent = "";

  let i = 0;
  typewriterInterval = setInterval(() => {
    if (i < text.length) {
      output.textContent += text.charAt(i);
      i++;
    } else {
      clearInterval(typewriterInterval);
      isTyping = false;
    }
  }, 28); // 打字速度（毫秒）
}

function skipTypewriter() {
  if (isTyping) {
    clearInterval(typewriterInterval);
    document.getElementById("typewriter-output").textContent = currentFullText;
    isTyping = false;
  }
}

// 密碼驗證
function handlePuzzleSubmit() {
  const node = storyData[gameState.currentNode];
  if (!node.puzzle) return;

  const val = document.getElementById("puzzle-input").value.trim();
  const errBox = document.getElementById("puzzle-error");

  if (val === node.puzzle.targetAnswer) {
    const successText = node.puzzle.onSuccess();
    errBox.textContent = "";
    document.getElementById("puzzle-box").classList.add("hidden");
    startTypewriter(successText);
    renderChoices(node.choices || []);
  } else {
    errBox.textContent = "毫無反應。這似乎不是正確的時間。";
  }
}

// 真相值累加與標題質變
function addTruth(val) {
  gameState.truthScore = Math.min(100, gameState.truthScore + val);

  if (gameState.truthScore >= 70 && !gameState.isCorrupted) {
    gameState.isCorrupted = true;
    document.body.classList.add("corrupted");

    const hudTitle = document.getElementById("hud-title");
    hudTitle.textContent = "浴 逝";
    hudTitle.classList.add("corrupted");

    document.getElementById("tab-title").textContent = "浴逝";
  }
}

// 觸發死亡
function triggerDeath(reason) {
  switchScreen("death-screen");
  document.getElementById("death-desc").textContent = reason;
}

// 甦醒（第 1 次死後，右上角才解鎖輪迴計數）
function respawn() {
  gameState.loopCount += 1;

  // 第一次死亡後，才把右上角死亡計數秀出來！
  const deathHud = document.getElementById("hud-deaths");
  deathHud.classList.remove("hidden");
  document.getElementById("death-counter").textContent = gameState.loopCount;

  switchScreen("game-screen");
  renderNode("ROOM_MAIN");
}
