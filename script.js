/* =====================================================================
   1. 音效管理器（支援自訂音檔，缺少的函式已補齊防呆）
   ===================================================================== */
const SoundManager = {
  enabled: true,

  audioFiles: {
    type: new Audio('sound/type.mp3'),
    alarm: new Audio('sound/alarm.mp3'),
    death: new Audio('sound/death.mp3'),
  },

  init() {
    if (this.audioFiles.alarm) this.audioFiles.alarm.volume = 1.0;
    if (this.audioFiles.death) this.audioFiles.death.volume = 0.6;
    if (this.audioFiles.type) this.audioFiles.type.volume = 1.0;
  },

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  },

  play(name) {
    if (!this.enabled || !this.audioFiles) return;
    try {
      const sound = this.audioFiles[name];
      if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
      }
    } catch (err) {}
  },

  // 補齊所有在程式碼中被呼叫到的音效函式，保證永不報錯
  playGameStart()   { this.play('alarm'); },
  playTypeTick()    { this.play('type'); },
  playWaterDrip()   { this.play('drip'); },
  playDeathSound()  { this.play('death'); },
  playHeartbeat()   { this.play('heartbeat'); },
  playAwakenChime() { this.play('awaken'); },
  playGlitchBurst() { this.play('glitch'); }
};

/* =====================================================================
   2. 遊戲狀態與物品定義
   ===================================================================== */
const GameState = {
  started: false,
  deaths: 0,
  truth: 0,
  mutated: false,
  currentSceneId: 'bedroom_wake',
  traumaSet: new Set(),
  inventory: {},
  isDead: false,
  isEnding: false,

  flags: {
    readPrescription: false,
    readMirrorNote: false,
    checkedFridge: false,
    hasKey: false,
    cabinetUnlocked: false,
    hasTowel: false,
    hasTape: false,
    wipedMirror: false,
    playedTape: false,
    drainedTub: false,
    inspectedPhoto: false
  }
};

const ItemData = {
  prescription: {
    name: '精神科藥瓶',
    desc: '一瓶強效創傷後應激鎮靜劑。處方標籤印著：患者「林子衡」。\n備註寫著：【請務必準時服用，勿沉溺於過去幻覺】。劑量已被翻倍服用。'
  },
  key: {
    name: '黃銅小鑰匙',
    desc: '一把被水鏽蝕的細小黃銅鑰匙。上面刻著浴室洗手台鏡櫃的編號。'
  },
  towel: {
    name: '乾淨的白毛巾',
    desc: '折疊整齊的乾燥白毛巾，散發著淡淡的薰衣草洗衣粉香味。那曾是她最喜歡的味道。'
  },
  tape: {
    name: '卡式錄音帶',
    desc: '標籤手寫著「2025.11.07 雨夜」。一年前那個暴風雨之夜，錄音機意外錄下的聲音。'
  },
  photo: {
    name: '浸濕的拍立得照片',
    desc: '照片裡是笑容燦爛的少女「語萱」。背面寫著：「子衡，即使這世界下著大雨，我也希望能看到你真正的微笑。」'
  }
};

/* =====================================================================
   3. 劇情場景圖與階梯式甦醒文本
   ===================================================================== */
const Scenes = {
  bedroom_wake: {
    location: '【 臥室 】',
    time: '07:00',
    text: () => {
      if (GameState.deaths === 0) {
        return `後腦傳出像是被鈍器重擊的劇痛，視線逐漸聚焦。艱難地舉起冰涼僵硬的手關掉還在鳴響的鬧鐘，看到大大的7:00，整個人立刻嚇得彈起身。\n\n再不出門就要趕不上高鐵了！！！`;
      } else if (GameState.deaths === 1) {
        return `「哈...哈...」你忍不住大喘著粗氣試圖平復呼吸，全身彷彿還定格在方才的可怕遭遇中，止不住的顫抖。\n\n「是惡夢嗎...？」你僥倖地想著。\n\n定睛一看時間依舊定格在 7:00 。不，這肯定有什麼不對勁。`;
      } else if (GameState.deaths < 4) {
        return `「呼——哈——！」你再次從床頭猛地驚醒，手心滿是冷汗。\n\n鬧鐘指針依然冰冷地指著 07:00。\n無論是深淵、黑水還是被地磚吞噬的痛楚... 那些絕不是單純的惡夢。這棟公寓，正用某種未知的方式將你囚禁在此。`;
      } else if (GameState.deaths < 7) {
        return `又一次醒來。每一次死亡的窒息與絞痛，都化作實質的幻痛刻進了骨髓。\n\n你抱著頭蜷縮在床頭，指尖不受控制地抽搐。\n07:00... 又是 07:00。精神逐漸在清醒與瘋狂的邊緣磨損，外頭的水滴聲彷彿正一滴一滴敲打著你的神經。`;
      } else {
        return `「...」\n\n你麻木地睜開眼睛，甚至連驚呼或喘息都已經不再產生。\n指針死死停在 07:00。死亡已經無法再讓你感到意外，你只是平靜地看著天花板，在無盡的絕望輪迴中，默默等待著某種轉機。`;
      }
    },
    choices: () => {
      if (GameState.deaths === 0) {
        return [
          { id: 'init_toilet', label: '去廁所洗漱', action: 'fatal_init_toilet', isFatal: true },
          { id: 'init_rush', label: '抓起背包就衝出門', action: 'fatal_init_rush', isFatal: true },
          { id: 'init_slow', label: '慢慢地做準備', action: 'fatal_init_slow', isFatal: true }
        ];
      }
      const list = [];
      if (!GameState.flags.readPrescription) {
        list.push({ id: 'examine_bedside', label: '查看床頭櫃上的藥瓶與日曆', action: 'examine_bedside' });
      }
      list.push({ id: 'go_corridor', label: '順著地上的濕漉水痕走向走廊', action: 'corridor' });
      list.push({ id: 'try_front_door', label: '嘗試走向玄關，逃離這間公寓', action: 'front_door' });
      return list;
    }
  },

  examine_bedside: {
    location: '【 臥室床頭櫃 】',
    time: '07:00',
    text: () => {
      return `床頭櫃上散落著幾樣物品：\n\n一瓶空了一半的「重度創傷解離鎮靜劑」，名字寫著「林子衡」。\n旁邊的手撕日曆停在一年前的今天，被紅筆重重圈了起來，邊緣凌亂地寫著一句話：\n\n「是我的錯... 如果那天晚上我沒有鎖上房門，她就不會...」\n\n你握著藥瓶的手不住發抖。記憶的屏障開始出現裂縫。`;
    },
    onEnter: () => {
      if (!GameState.flags.readPrescription) {
        GameState.flags.readPrescription = true;
        GameState.inventory.prescription = ItemData.prescription;
        increaseTruth(15);
      }
    },
    choices: () => [
      { id: 'back_bedroom', label: '退回臥室中央', action: 'bedroom_wake' },
      { id: 'go_corridor', label: '順著水痕前往走廊', action: 'corridor' }
    ]
  },

  corridor: {
    location: '【 走廊與客廳 】',
    time: '07:01',
    text: () => {
      return `走廊的地板積著一層薄薄的冷水，每踩一步都會發出微弱的黏稠水聲。\n右手邊是客廳的舊冰箱，發出低沉的嗡鳴。\n走廊正中央的穿衣鏡上，覆蓋著一塊厚重的黑布。\n走廊的盡頭，浴室的門半掩著，濃稠刺鼻的寒氣與金屬味正從門縫裡不斷溢出。`;
    },
    choices: () => {
      const list = [
        {
          id: 'fatal_mirror_cloth',
          label: '揭開黑布，凝視鏡子',
          action: 'fatal_mirror_cloth',
          isFatal: true,
          traumaText: '【創傷記憶】你的手指剛碰觸到黑布，那張沒有五官、浮腫發紫的臉龐猛地在腦海中炸開！冰冷的水灌滿咽喉的窒息感讓你劇烈乾嘔，你驚恐地後退甩手，絕不敢再掀開它！'
        }
      ];

      if (!GameState.flags.readMirrorNote) {
        list.push({ id: 'examine_mirror_frame', label: '仔細檢查鏡框周圍的紙條', action: 'examine_mirror_frame' });
      }

      list.push({
        id: 'fatal_drink_fridge',
        label: '打開冰箱，喝下一杯發黃的自來水解渴',
        action: 'fatal_drink_fridge',
        isFatal: true,
        traumaText: '【創傷記憶】胃部瞬間絞痛，喉嚨彷彿被帶刺的黑髮割爛。記憶深處那股吞下發臭死水與黑血的劇痛讓你死死按住腹部，你絕對不要再喝那杯水。'
      });

      if (!GameState.flags.checkedFridge) {
        list.push({ id: 'check_fridge_note', label: '檢查冰箱門上貼著的便利貼', action: 'check_fridge_note' });
      }

      list.push({ id: 'enter_bathroom', label: '深吸一口氣，推開浴室的門', action: 'bathroom_door' });
      list.push({ id: 'back_bedroom', label: '退回臥室', action: 'bedroom_wake' });
      return list;
    }
  },

  examine_mirror_frame: {
    location: '【 走廊鏡框 】',
    time: '07:01',
    text: () => {
      return `黑布的邊緣貼著泛黃的膠帶，上面是一張你自己筆跡的字條：\n\n「不要把布拿開。鏡子裡那具行屍走肉不是你，那只是害死她的兇手。」\n\n字條下方黏著一張發霉的處方籤存根：「重度憂鬱症與幻聽治療方案」。\n你腦海中閃過一聲悽厲的哭喊，但隨即被水滴聲掩蓋。`;
    },
    onEnter: () => {
      if (!GameState.flags.readMirrorNote) {
        GameState.flags.readMirrorNote = true;
        increaseTruth(15);
      }
    },
    choices: () => [{ id: 'back_corridor', label: '回到走廊', action: 'corridor' }]
  },

  check_fridge_note: {
    location: '【 客廳舊冰箱 】',
    time: '07:01',
    text: () => {
      return `冰箱冷藏室裡空無一物，只有幾隻死去的飛蛾與一盒融化發黑的櫻桃雪糕。\n門上貼著一張便條：\n\n「子衡，今天是你答應帶我去看海的日子。如果你今天又把房門反鎖，我就真的不知道該怎麼辦了...」\n落款是娟秀的字跡：「語萱」。\n\n這名字像重錘砸在心頭，你感到胃部一陣冰涼翻騰。`;
    },
    onEnter: () => {
      if (!GameState.flags.checkedFridge) {
        GameState.flags.checkedFridge = true;
        increaseTruth(10);
      }
    },
    choices: () => [{ id: 'back_corridor', label: '回到走廊', action: 'corridor' }]
  },

  front_door: {
    location: '【 玄關大門 】',
    time: '07:01',
    text: () => {
      if (GameState.truth < 70) {
        return `玄關鐵門被三道沉重的鐵鍊死死纏繞，鎖孔全被暗紅色的乾涸凝塊封死。\n門縫底下，冰冷的冷水正源源不絕地向室內倒灌。\n\n「你想逃到哪裡去？」\n身後空蕩蕩的走廊彷彿傳來一聲幽幽的呢喃。\n你轉身看著走廊，水流深處只有那間半掩的浴室。你無路可逃。`;
      } else {
        return `你看著這扇被鐵鍊封死的門。\n現在的你已經逐漸看清——這不是被封死的門，而是你封閉了一整年的心智。\n門外不是生路，唯有走進那間浴室，直面這場惡夢的核心，這一切才會真正結束。`;
      }
    },
    choices: () => [
      { id: 'force_escape', label: '不管一切，瘋狂撞擊鐵門試圖逃出公寓', action: 'ending_escape' },
      { id: 'back_corridor_from_door', label: '轉身回到走廊，走向浴室', action: 'corridor' }
    ]
  },

  bathroom_door: {
    location: '【 浴室門口 】',
    time: '07:02',
    text: () => {
      return `你推開了半掩的木門。鉸鏈發出刺耳的尖叫。\n\n浴室裡白霧蒸騰，但那不是溫暖的熱氣，而是刺骨冰冷的白色死寂寒霧。\n地磚上覆蓋著一層黏滑的黑色污垢與幾縷長髮。\n中央的白瓷浴缸被半透明的浴簾遮蔽著，裡面注滿了深不見底的暗色水流。\n水龍頭「滴... 答...」有節奏地敲擊著浴缸內壁。`;
    },
    choices: () => [
      { id: 'check_sink', label: '靠近洗手台與鏡櫃', action: 'sink_area' },
      { id: 'approach_bathtub', label: '走向浴缸，凝視那道半透明浴簾', action: 'bathtub_area' },
      { id: 'back_corridor_from_bath', label: '退回走廊喘口氣', action: 'corridor' }
    ]
  },

  sink_area: {
    location: '【 浴室洗手台 】',
    time: '07:02',
    text: () => {
      let desc = `洗手台上凝結著厚重水霧，鏡子一片白茫茫。\n水槽的排水孔深處，隱隱卡著一團糾纏的黑色長髮。`;
      if (GameState.flags.cabinetUnlocked) {
        desc += `\n上方的鏡櫃已經打開，裡面放著那捲錄音帶。`;
      } else {
        desc += `\n上方帶鏡子的儲物櫃上了小鎖，鎖孔呈現黃銅色。`;
      }
      return desc;
    },
    choices: () => {
      const list = [
        {
          id: 'fatal_drain_pull',
          label: '伸手用力去扯排水孔裡卡住的長髮',
          action: 'fatal_drain_pull',
          isFatal: true,
          traumaText: '【創傷記憶】長髮深處藏著剃刀與尖銳鐵絲！指尖被割裂、鮮血如泉湧，而那團黑髮像有生命般反纏住手腕將你拖向排水深處... 你的雙手劇烈發抖，絕不再碰那團黑髮。'
        }
      ];

      if (!GameState.flags.hasKey) {
        list.push({ id: 'careful_drain', label: '用旁邊的小鑷子小心夾取排水孔裡的異物', action: 'careful_drain' });
      }

      if (GameState.flags.hasTowel && !GameState.flags.wipedMirror) {
        list.push({ id: 'wipe_mirror', label: '用乾毛巾擦拭起霧的鏡子', action: 'wipe_mirror' });
      } else if (!GameState.flags.wipedMirror) {
        list.push({ id: 'try_wipe_mirror_hand', label: '用手掌抹去鏡面上的霧氣', action: 'try_wipe_mirror_hand' });
      }

      if (GameState.flags.hasKey && !GameState.flags.cabinetUnlocked) {
        list.push({ id: 'unlock_cabinet', label: '用黃銅鑰匙打開洗手台鏡櫃', action: 'unlock_cabinet' });
      }

      if (GameState.flags.hasTape && !GameState.flags.playedTape) {
        list.
