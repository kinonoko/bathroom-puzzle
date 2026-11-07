/**
 * 《浴室 / 浴逝》- 核心引擎
 * 內含：狀態機、LocalStorage 記憶繼承、SHA-256 密碼防窺、動態劇本渲染
 */

// ==========================================
// 一、 遊戲全局狀態 (State)
// ==========================================
let gameState = {
  loopCount: 1,           // 輪迴次數
  truthScore: 0,          // 真相值 (0 ~ 100)
  isCorrupted: false,     // 是否已異化成「浴逝」
  traumaFlags: {},        // 記錄踩雷死法（使其劃線）
  unlockedClues: {},      // 已獲取的關鍵線索
  currentNode: "ROOM_MAIN"// 當前所在節點
};

// ==========================================
// 二、 劇本與節點資料庫（依需求填入文本）
// ==========================================
const storyData = {
  // ── 核心集線點：主角房間中央 ──
  "ROOM_MAIN": {
    getText: () => {
      if (gameState.truthScore >= 70) {
        return `【請填入：真相值70%以上的感知描寫，例如：空氣中的甜腥腐敗味濃烈到令人作嘔，被子下方的暗色痕跡已經蔓延到床單邊緣。】`;
      } else if (gameState.loopCount > 1) {
        return `【請填入：第2輪以上的甦醒描寫，例如：猛然吸氣坐起，後頸傳來沉悶鈍痛。牆上時鐘的秒針在 12 的位置瘋狂抽搐，時間依舊停在 07:00。】`;
      }
      return `鬧鐘發出尖銳蜂鳴。頭痛欲裂，像是有鏽蝕的鐵片在太陽穴刮擦。\n上午九點有非常重要的面試，絕對不能遲到。\n房間空氣異常冰冷，瀰漫著一股說不上來的沉悶怪味。`;
    },
    choices: [
      {
        id: "GO_BATHROOM",
        text: "走向浴室洗臉整理儀容",
        target: "NODE_BATHROOM"
      },
      {
        id: "CHECK_DESK",
        text: "檢查書桌上的面試資料與公事包",
        target: "NODE_DESK"
      },
      {
        id: "RUSH_DOOR",
        text: "穿上外套，直接轉動玄關門把出門",
        isTraumaProne: true, // 踩雷死法標記
        target: "DEATH_DOOR_RUSH",
        traumaWarning: "手指剛碰到門把，刺骨的極寒瞬間凍結神經，心臟深處湧起劇烈的窒息恐慌——潛意識在尖叫：不要開門！"
      }
    ]
  },

  // ── 探索節點：書桌 ──
  "NODE_DESK": {
    getText: () => {
      if (gameState.unlockedClues["DESK_UNLOCKED"]) {
        return `書桌抽屜已經敞開。\n裡面放著泛黃的備忘錄與一張被血跡浸透一半的診斷證明。`;
      }
      return `【請填入：書桌日常描寫，例如：桌上整齊擺放著履歷表與喝空的黑咖啡罐。最下層的抽屜掛著一個四位數密碼鎖。】`;
    },
    puzzle: {
      active: () => !gameState.unlockedClues["DESK_UNLOCKED"],
      prompt: "抽屜密碼鎖提示：【我停止呼吸的那一刻（預設格式如 0123）】",
      // 預設密碼 "0123" 的 SHA-256 雜湊值
      targetHash: "2620c3a2f3922c229f3d9b05763cbba268df1507f354f9a888b14aa8e8073ea6",
      onSuccess: () => {
        gameState.unlockedClues["DESK_UNLOCKED"] = true;
        addTruth(35); // 增加真相值
        return "喀嗒一聲，密碼鎖彈開。你在抽屜深處看見了一份死亡推定報告，時間停留在深夜 01:23……";
      }
    },
    choices: [
      {
        text: "轉身返回房間中央",
        target: "ROOM_MAIN"
      }
    ]
  },

  // ── 探索節點：浴室 ──
  "NODE_BATHROOM": {
    getText: () => {
      if (gameState.truthScore >= 70) {
        return `浴室鏡面上的水霧已被完全擦乾。\n然而鏡子裡沒有站著的人影——倒影的角度筆直映向冰冷的磁磚地面，那裡正躺著一具後腦凝固在黑紅血泊裡的軀殼。那就是你。`;
      }
      return `【請填入：浴室初次描寫，例如：水龍頭滴著水，抽風機嗡嗡作響。鏡子上一片厚重的白霧，伸手抹開卻依然模糊一片。】`;
    },
    choices: [
      {
        id: "LOOK_MIRROR",
        text: "用力擦拭鏡面，試圖看清自己的臉",
        target: "ACTION_MIRROR"
      },
      {
        id: "CHECK_FLOOR",
        text: "視線往下，查看浴缸邊緣的地磚",
        target: "ACTION_FLOOR"
      },
      {
        text: "退出浴室，回房間中央",
        target: "ROOM_MAIN"
      }
    ]
  },

  // ── 浴室動作：擦鏡子 ──
  "ACTION_MIRROR": {
    getText: () => {
      addTruth(20);
      return `你抓起毛巾狠狠擦拭玻璃。\n鏡面光滑透亮，清晰映出了你身後的置物架、牙刷與敞開的門——\n唯獨鏡子正前方，原本該站著你的位置，空無一物。\n就好像你只是一團透明的空氣。`;
    },
    choices: [{ text: "呼吸急促地退後一步", target: "NODE_BATHROOM" }]
  },

  // ── 浴室動作：看地板（直面死因） ──
  "ACTION_FLOOR": {
    getText: () => {
      if (gameState.truthScore < 50) {
        // 真相值未達標時，潛意識防禦觸發死亡
        return "DEATH_SLIP_TRIGGER";
      }
      addTruth(40);
      return `浴缸邊緣有一道清晰的鈍器撞擊凹痕，暗紅色的乾涸血跡一路蜿蜒到門檻。\n你終於記起來了——昨晚洗澡時因嚴重低血糖引發暈眩，後腦狠狠砸在了門檻上……`;
    },
    choices: [{ text: "顫抖著直起身體", target: "NODE_BATHROOM" }]
  },

  // ── 踩雷死法：強行開門 ──
  "DEATH_DOOR_RUSH": {
    isDeath: true,
    reason: "當你的手碰到玄關金屬鎖時，極度的刺骨冰寒直接貫穿心臟。門縫下方滲出濃稠黑霧，無數低語在腦海爆發，你全身神經痙攣休克倒地。"
  },

  // ── 踩雷死法：過早低頭被恐慌吞噬 ──
  "DEATH_SLIP_TRIGGER": {
    isDeath: true,
    reason: "視線接觸到地磚的一瞬間，後腦爆發撕裂般的劇痛。溫熱的液體似乎正從枕骨汩汩湧出，眼前瞬間被血色吞沒，你倒在地上窒息而死。"
  }
};

// ==========================================
// 三、 系統核心邏輯
// ==========================================

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  loadGame();
  renderNode(gameState.currentNode);

  // 綁定按鈕監聽
  document.getElementById("submit-btn").addEventListener("click", handlePuzzleSubmit);
  document.getElementById("wake-up-btn").addEventListener("click", respawnFromDeath);
  document.getElementById("puzzle-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handlePuzzleSubmit();
  });
});

// 渲染節點
function renderNode(nodeId) {
  gameState.currentNode = nodeId;
  const node = storyData[nodeId];

  // 判斷是否為即死事件
  if (node.isDeath || node.getText() === "DEATH_SLIP_TRIGGER") {
    const deathReason = node.isDeath ? node.reason : storyData["DEATH_SLIP_TRIGGER"].reason;
    triggerDeath(deathReason, nodeId);
    return;
  }

  // 渲染文本
  const storyBox = document.getElementById("story-text");
  storyBox.innerHTML = `<p>${node.getText().replace(/\n/g, "</p><p>")}</p>`;

  // 處理謎題輸入框
  const inputContainer = document.getElementById("input-container");
  const inputFeedback = document.getElementById("input-feedback");
  inputFeedback.textContent = "";

  if (node.puzzle && node.puzzle.active()) {
    inputContainer.classList.remove("hidden");
    document.getElementById("input-prompt").textContent = node.puzzle.prompt;
    document.getElementById("puzzle-input").value = "";
  } else {
    inputContainer.classList.add("hidden");
  }

  // 渲染選項按鈕
  const choicesContainer = document.getElementById("choices-container");
  choicesContainer.innerHTML = "";

  node.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "btn";

    // 檢查是否為已被劃線的創傷選項
    const isTraumatized = gameState.traumaFlags[choice.id];

    if (isTraumatized) {
      btn.classList.add("disabled-trauma");
      btn.textContent = `~~ ${choice.text} ~~`;
      btn.addEventListener("click", () => {
        storyBox.innerHTML += `<p style="color: var(--accent-red); margin-top: 10px;">${choice.traumaWarning || "身體殘留著劇烈的恐懼記憶，潛意識拒絕再次靠近。"}</p>`;
      });
    } else {
      btn.textContent = choice.text;
      btn.addEventListener("click", () => {
        if (choice.isTraumaProne) {
          gameState.traumaFlags[choice.id] = true;
        }
        renderNode(choice.target);
      });
    }

    choicesContainer.appendChild(btn);
  });

  saveGame();
}

// 密碼雜湊比對 (SHA-256)
async function handlePuzzleSubmit() {
  const node = storyData[gameState.currentNode];
  if (!node.puzzle) return;

  const inputVal = document.getElementById("puzzle-input").value.trim();
  const feedback = document.getElementById("input-feedback");

  // 使用原生 Web Crypto API 計算 SHA-256
  const hash = await sha256(inputVal);

  if (hash === node.puzzle.targetHash) {
    const successMsg = node.puzzle.onSuccess();
    feedback.style.color = "var(--accent-cyan)";
    feedback.textContent = "驗證成功。";
    document.getElementById("story-text").innerHTML += `<p style="color: var(--accent-cyan);">${successMsg}</p>`;
    document.getElementById("input-container").classList.add("hidden");
    renderNode(gameState.currentNode); // 重新刷新當前節點狀態
  } else {
    feedback.style.color = "var(--accent-red)";
    feedback.textContent = "代碼錯誤，毫無反應。";
  }
}

// 增加真相值並觸發標題異化
function addTruth(val) {
  gameState.truthScore = Math.min(100, gameState.truthScore + val);
  document.getElementById("truth-meter").textContent = `${gameState.truthScore}%`;

  if (gameState.truthScore >= 70 && !gameState.isCorrupted) {
    gameState.isCorrupted = true;
    document.body.classList.add("corrupted");

    const titleEl = document.getElementById("game-title");
    titleEl.textContent = "浴 逝";
    titleEl.classList.add("corrupted");

    document.getElementById("tab-title").textContent = "浴逝 - 遺留之日";
  }
}

// 死亡觸發
function triggerDeath(reason, failedNodeId) {
  const deathScreen = document.getElementById("death-screen");
  document.getElementById("death-reason").textContent = reason;
  deathScreen.classList.remove("hidden");
}

// 甦醒重返循環
function respawnFromDeath() {
  gameState.loopCount += 1;
  document.getElementById("loop-count").textContent = gameState.loopCount;
  document.getElementById("death-screen").classList.add("hidden");

  // 重置回房間起點
  renderNode("ROOM_MAIN");
}

// SHA-256 計算函式
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 本地存檔（進度繼承）
function saveGame() {
  localStorage.setItem("BATHROOM_ESCAPE_DATA", JSON.stringify(gameState));
}

function loadGame() {
  const saved = localStorage.getItem("BATHROOM_ESCAPE_DATA");
  if (saved) {
    gameState = Object.assign(gameState, JSON.parse(saved));
    document.getElementById("loop-count").textContent = gameState.loopCount;
    document.getElementById("truth-meter").textContent = `${gameState.truthScore}%`;
    if (gameState.isCorrupted) {
      document.body.classList.add("corrupted");
      document.getElementById("game-title").textContent = "浴 逝";
      document.getElementById("game-title").classList.add("corrupted");
      document.getElementById("tab-title").textContent = "浴逝 - 遺留之日";
    }
  }
}
