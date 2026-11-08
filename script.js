/* =====================================================================
   1. 音效管理器（支援自訂音檔，缺少的函式已補齊防呆）
   ===================================================================== */
const SoundManager = {
  enabled: true,

  audioFiles: {
    alarm: new Audio('/sounds/alarm.mp3'),
  },

  init() {
    if (this.audioFiles && this.audioFiles.alarm) {
      this.audioFiles.alarm.volume = 1.0;
    }
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
        list.push({ id: 'play_tape', label: '將錄音帶放入台面的錄音機中按下播放', action: 'play_tape' });
      }

      list.push({ id: 'back_bath_center', label: '退回浴室中央', action: 'bathroom_door' });
      return list;
    }
  },

  careful_drain: {
    location: '【 浴室洗手台 】',
    time: '07:02',
    text: () => {
      return `你屏住呼吸，小心翼翼地用鑷子撥開長髮。\n在排水管卡槽處，夾出了一把帶水垢的【黃銅小鑰匙】！\n鑰匙柄上刻著鏡櫃的標記。你將它緊緊握在手心。`;
    },
    onEnter: () => {
      GameState.flags.hasKey = true;
      GameState.inventory.key = ItemData.key;
    },
    choices: () => [{ id: 'back_sink', label: '繼續留在洗手台前', action: 'sink_area' }]
  },

  try_wipe_mirror_hand: {
    location: '【 浴室鏡面 】',
    time: '07:02',
    text: () => {
      return `你試圖用手掌擦拭鏡子，但潮濕的霧氣很快又重新凝結。\n鏡面深處隱隱約約有血紅色的筆劃在跳動，但光靠濕冷的手掌根本擦不乾淨。\n你可能需要一條乾燥的毛巾。`;
    },
    choices: () => [{ id: 'back_sink', label: '回到洗手台', action: 'sink_area' }]
  },

  wipe_mirror: {
    location: '【 浴室鏡面 】',
    time: '07:03',
    text: () => {
      return `你拿出那條乾燥潔白的毛巾，用力抹去鏡面上的厚厚霧氣。\n\n水氣被吸乾的瞬間，鏡面上赫然顯現出數道從鏡面內部抓刻出的血紅指甲印與凌亂字跡：\n\n「林子衡，那天晚上我在浴缸裡滑倒昏迷時...」\n「你就在門外，你聽見了水聲，但你只是戴上耳機吞下藥片。」\n「你任由水漫過我的頭頂。」\n\n鏡子裡的倒影不是別人，正是你那張慘白、布滿淚痕與罪孽的面孔。`;
    },
    onEnter: () => {
      GameState.flags.wipedMirror = true;
      increaseTruth(20);
    },
    choices: () => [{ id: 'back_sink', label: '壓抑住劇烈的心跳，回到洗手台', action: 'sink_area' }]
  },

  unlock_cabinet: {
    location: '【 浴室鏡櫃內部 】',
    time: '07:03',
    text: () => {
      return `黃銅鑰匙順利插進鎖孔，「喀嗒」一聲，鏡櫃彈開了。\n\n櫃子裡整齊疊放著一條乾燥的【乾淨白毛巾】。\n毛巾下方，壓著一捲手寫標籤為「2025.11.07 雨夜」的【卡式錄音帶】。\n洗手台角落正好擺著一台老舊的卡帶播放機。`;
    },
    onEnter: () => {
      GameState.flags.cabinetUnlocked = true;
      GameState.flags.hasTowel = true;
      GameState.flags.hasTape = true;
      GameState.inventory.towel = ItemData.towel;
      GameState.inventory.tape = ItemData.tape;
    },
    choices: () => [{ id: 'back_sink', label: '關上櫃門，留在洗手台', action: 'sink_area' }]
  },

  play_tape: {
    location: '【 播放錄音帶 】',
    time: '07:03',
    text: () => {
      return `按下播放鍵，磁帶發出「喀嚓」轉動聲，伴隨著嘈雜的暴雨聲響：\n\n『錄音：...林子衡！開門啊！我們好好談談好嗎？你不要每次吵架就反鎖房間！』\n『（重重的敲門聲，夾雜著急促的喘息）』\n『錄音：...算了。我去洗個澡。你冷靜一下吧。』\n『（水龍頭放水的嘩嘩聲... 幾分鐘後，傳來一聲劇烈的滑倒重擊巨響「咚！」伴隨水花四濺）』\n『錄音：...救... 咕嚕... 子... 衡...（虛弱的水聲與微弱的指甲抓撓磁磚聲）』\n『錄音：...（水流滿溢漫出浴缸的持續滴落聲，整整維持了四十分鐘，直到錄音結束）』\n\n錄音機停了。\n你的眼淚砸在手背上，冰涼徹骨。那不是都市傳說，那是你逃避了一年的謀殺——因冷漠與懦弱而鑄成的不作為之罪。`;
    },
    onEnter: () => {
      GameState.flags.playedTape = true;
      increaseTruth(20);
    },
    choices: () => [
      { id: 'back_sink', label: '放下錄音機，回到洗手台', action: 'sink_area' },
      { id: 'go_tub_direct', label: '走向那座注滿水的浴缸', action: 'bathtub_area' }
    ]
  },

  bathtub_area: {
    location: '【 浴缸前 】',
    time: '07:04',
    text: () => {
      let desc = `你站在深褐色的白瓷浴缸旁。\n水面平靜得像一面黑色的鏡子，倒映著你模糊不清的身影。\n深冷的水面下，似乎沉著什麼沉甸甸的東西。\n水塞的鐵鏈正垂在浴缸的外沿。`;
      if (GameState.flags.drainedTub) {
        desc = `浴缸內深黑的冰水已經全部排乾。\n在乾涸的水漬正中央，靜靜躺著一本浸濕的速寫本與一張泛黃的照片。`;
      }
      return desc;
    },
    choices: () => {
      const list = [];
      if (!GameState.flags.drainedTub) {
        list.push({
          id: 'fatal_rip_curtain',
          label: '猛然伸手，粗暴扯開整面浴簾！',
          action: 'fatal_rip_curtain',
          isFatal: true,
          traumaText: '【創傷記憶】浴簾扯開的瞬間，一雙毫無血色的浮腫雙手猛然從黑水裡破水而出，狠狠卡住你的脖頸將你硬拖進無底的冰水！你驚恐地縮回雙手狂退數步，大口喘息，絕不再去盲目扯它！'
        });
        list.push({ id: 'pull_chain', label: '伸手拉起浴缸外沿垂掛的排水鐵鏈，拔開排水塞', action: 'pull_chain' });
      } else {
        list.push({ id: 'examine_photo', label: '走進浴缸，撿起底部的照片與速寫本', action: 'examine_photo' });

        if (GameState.truth >= 70) {
          list.push({
            id: 'true_confession',
            label: '【浴逝・釋懷】將白毛巾輕輕蓋在照片上，跪在浴缸前真誠懺悔與道別',
            action: 'ending_true'
          });
        }
        list.push({
          id: 'drown_choice',
          label: '【沉溺】躺進冰冷的浴缸中，閉上雙眼迎接無盡的自責',
          action: 'ending_drown'
        });
      }
      list.push({ id: 'back_bath_door', label: '退回浴室門口', action: 'bathroom_door' });
      return list;
    }
  },

  pull_chain: {
    location: '【 浴缸排水 】',
    time: '07:04',
    text: () => {
      return `「嘩啦啦——」\n\n你用盡力氣拉起排水鐵鏈，水塞被拔出。\n深黑冰冷的水流開始化作巨大的漩渦，伴隨著刺耳的嗚咽聲向排水孔奔流。\n水位急劇下降。\n水面下沒有水鬼，沒有怪物的骨骸。\n只有一本封皮泡爛的速寫本，以及一張被水浸透的拍立得照片。\n\n水流排乾了，滴水聲也隨之變得微弱。`;
    },
    onEnter: () => {
      GameState.flags.drainedTub = true;
      increaseTruth(20);
    },
    choices: () => [{ id: 'stay_tub', label: '凝視排水後的浴缸底部', action: 'bathtub_area' }]
  },

  examine_photo: {
    location: '【 浴缸深處的遺物 】',
    time: '07:05',
    text: () => {
      return `你顫抖著伸出雙手，從冰涼的磁磚上撿起那張照片。\n\n照片裡，語萱站在向日葵花田前，笑得那樣溫柔。\n速寫本的第一頁，是她手繪的你們未來的家。\n最後一頁，是她那晚在浴缸前留下的最後草稿：\n\n「子衡，我知道你生病了，我知道你活在痛苦的枷鎖裡。\n我從未怪過你反鎖的門，我只是遺憾... 我沒能陪你一起看見明天的朝陽。」\n\n字跡被淚水模糊。你所有的藉口、所有的防禦機制，在這一刻被徹底擊得粉碎。`;
    },
    onEnter: () => {
      GameState.flags.inspectedPhoto = true;
      GameState.inventory.photo = ItemData.photo;
      increaseTruth(10);
    },
    choices: () => [{ id: 'stay_tub', label: '深吸一口氣，做出你最後的決定', action: 'bathtub_area' }]
  }
};

/* =====================================================================
   4. 死亡文本與結局資料
   ===================================================================== */
const Deaths = {
  fatal_init_toilet: {
    title: '【 死因：受詛之地 】',
    desc: '你急匆匆衝進廁所擰開水龍頭洗臉，噴湧而出的卻是冰冷發黑的腥臭不明液體！還來不及做出反應，鏡子深處迸發出無數雙冰冷的手，纏繞住了全身，將你整個人拖進了溢滿黑水的洗手台深處...\n\n死因：毫無防備地闖入了受詛之地。'
  },
  fatal_init_rush: {
    title: '【 死因：門外虛空 】',
    desc: '你二話不說拿起背包就打開門，外面卻彷彿虛空一般一片漆黑。剛想關上門，身後突然一股推力，將你一把推入萬丈深淵。你在無盡的下墜中逐漸閉上眼，停止呼吸，身體變得冰冷，意識開始出走...\n\n死因：意外墜落門外的虛空。'
  },
  fatal_init_slow: {
    title: '【 死因：融於地面 】',
    desc: '「反正都要來不及了，不如就慢慢準備，到時候再買自由座就好了。」你這麼想著，慢悠悠地下床，卻驚見地面化作無數眼睛，踩在上面還黏膩膩的。剛想邁出腳步就發現動彈不得，身體從腳跟開始緩慢溶解，與地面融合，直到一根髮絲都不留...\n\n死因：和受汙染的地板融為一體。'
  },
  fatal_mirror_cloth: {
    title: '【 死因：鏡面絞殺 】',
    desc: '黑布扯下的剎那，鏡中沒有你的倒影，只有一隻從水銀後探出的腐爛手臂！它猛然掐住你的氣管，將你的脖子狠狠扯斷在鏡框邊緣...\n\n死因：你直視了最不敢面對的罪孽，被幻覺撕碎。'
  },
  fatal_drink_fridge: {
    title: '【 死因：毒水窒息 】',
    desc: '冰涼的水流滑入喉嚨，瞬間化作黏稠發臭的黑血與毛髮！粗糙的髮絲在胃裡瘋狂生長，刺穿了你的內臟與食道，你咳著血沫倒在血泊中...\n\n死因：吞飲了被死意腐化的毒液。'
  },
  fatal_drain_pull: {
    title: '【 死因：放血沉溺 】',
    desc: '纏在長髮裡的生鏽刮鬍刀片深深割開了你的腕動脈！噴湧的動脈血引來了水管深處的貪婪黑影，無數股濕髮像水蛇般死死將你拖向排水管道...\n\n死因：魯莽碰觸了死者的傷痛。'
  },
  fatal_rip_curtain: {
    title: '【 死因：深淵溺斃 】',
    desc: '浴簾被扯落的瞬間，無窮無盡的冰冷海水從浴缸中席捲而出！一具浮腫蒼白的身軀死死抱住了你，將你拖入不見天日的無底寒淵，肺部被冰水徹底撕裂...\n\n死因：以恐懼與粗暴侵犯了往生者的安寧。'
  }
};

const Endings = {
  escape: {
    tag: 'ENDING A —— 逃避之囚',
    title: '【 永 無 止 境 的 牢 籠 】',
    desc: `你用盡全身力氣撞開了玄關的鐵門，跌跌撞撞地逃到了無人的街道上。\n\n然而，外面的天空依然是死寂的深灰，路上空無一人。\n每當你停下腳步，耳邊依然準時響起清脆的「滴... 答... 滴... 答...」。\n你永遠逃不出這間公寓，因為這座浴室根本不在現實裡——它就建在你那座因逃避而徹底崩潰的腦海深處。\n\n你的一生，將永遠在 07:00 與愧疚的追逐中度過。`
  },
  drown: {
    tag: 'ENDING B —— 沉溺自戮',
    title: '【 永 恆 的 冰 水 墓 穴 】',
    desc: `你爬進了冰冷刺骨的浴缸，將身體完全浸泡在水漬與回憶之中。\n\n「這樣... 我們就扯平了吧？」你痛苦地閉上雙眼。\n你放棄了解救自己，選擇將靈魂永遠獻祭給這座潮濕的浴室。\n水流再次慢慢淹沒了你的口鼻，帶走最後一絲溫熱。\n07:00 的鬧鐘，將永遠不再停歇地敲擊這具空殼。`
  },
  true: {
    tag: 'TRUE ENDING —— 浴逝・破曉釋懷',
    title: '【 浴 逝 ・ 晨 光 初 霽 】',
    desc: `你沒有逃，也沒有選擇盲目尋死。\n你跪在浴缸前，將那條柔軟潔白的毛巾覆蓋在她的遺物上。\n\n「對不起，語萱... 我懦弱地逃了一整年，把自己的過錯偽裝成厲鬼來折磨自己。」\n「但我現在記起來了，我也會好好活下去... 連同妳的那份。」\n\n話音落下的瞬間，浴室裡那刺鼻的鐵鏽味與冷霧如同晨霜般悄然散去。\n水龍頭「喀」的一聲，徹底關緊了。\n\n高窗外，早晨 07:06 的第一道金色朝陽灑進了浴室，照亮了乾淨的白瓷與那張燦爛的向日葵照片。\n\n浴室已成「浴逝」。逝者已矣，生者如斯。\n你站起身，推開房門，走向了真正迎來陽光的清晨。`
  }
};

/* =====================================================================
   5. 流程控制、打字機與事件監聽（雙向相容與全域防呆）
   ===================================================================== */
let typewriterTimer = null;
let isTypewriting = false;
let currentFullText = '';

// 雙向相容選擇器：不管是新版還是舊版 ID 都能抓到，絕不為 null
const elTitleScreen = document.getElementById('title-screen');
const elPlayArea = document.getElementById('play-area') || document.getElementById('game-screen');
const elStartBtn = document.getElementById('start-game-btn');
const elHudTitle = document.getElementById('hud-title');
const elHudLoop = document.getElementById('hud-loop') || document.getElementById('hud-deaths');
const elAudioBtn = document.getElementById('audio-toggle-btn');
const elRestartBtn = document.getElementById('restart-btn');
const elSceneLoc = document.getElementById('scene-location');
const elSceneTime = document.getElementById('scene-time');
const elDialogBox = document.getElementById('dialog-box') || document.getElementById('text-viewport');
const elTypeText = document.getElementById('typewriter-text') || document.getElementById('typewriter-output');
const elCursor = document.getElementById('terminal-cursor') || document.getElementById('cursor');
const elChoices = document.getElementById('choices-container') || document.getElementById('choices-wrapper');
const elTraumaBox = document.getElementById('trauma-box');
const elItemsList = document.getElementById('items-list');

const elDeathOverlay = document.getElementById('death-overlay') || document.getElementById('death-screen');
const elDeathReason = document.getElementById('death-reason') || document.getElementById('death-desc');
const elDeathFlash = document.getElementById('death-flash');
const elEndingOverlay = document.getElementById('ending-overlay');
const elEndingTag = document.getElementById('ending-tag');
const elEndingTitle = document.getElementById('ending-title');
const elEndingDesc = document.getElementById('ending-desc');
const elEndingRestart = document.getElementById('ending-restart-btn');
const elItemModal = document.getElementById('item-modal');
const elModalTitle = document.getElementById('modal-item-title');
const elModalDesc = document.getElementById('modal-item-desc');
const elModalClose = document.getElementById('modal-close-btn');

const elConfirmModal = document.getElementById('confirm-modal');
const elConfirmCancel = document.getElementById('confirm-cancel-btn');
const elConfirmOk = document.getElementById('confirm-ok-btn');

// 初始化事件監聽（帶有元素存在判定，杜絕報錯）
if (elStartBtn) {
  elStartBtn.addEventListener('click', () => {
    SoundManager.init();
    SoundManager.playGameStart();
    
    GameState.started = true;
    if (elTitleScreen) elTitleScreen.style.display = 'none';
    if (elPlayArea) {
      elPlayArea.style.display = 'flex';
      elPlayArea.classList.add('active');
    }
    renderScene('bedroom_wake');
  });
}

if (elAudioBtn) {
  elAudioBtn.addEventListener('click', () => {
    SoundManager.init();
    const state = SoundManager.toggle();
    elAudioBtn.textContent = state ? '[ 聲音: 開 ]' : '[ 聲音: 關 ]';
  });
}

if (elRestartBtn) {
  elRestartBtn.addEventListener('click', () => {
    SoundManager.playTypeTick();
    if (elConfirmModal) elConfirmModal.style.display = 'flex';
  });
}

if (elConfirmCancel) {
  elConfirmCancel.addEventListener('click', () => {
    SoundManager.playTypeTick();
    if (elConfirmModal) elConfirmModal.style.display = 'none';
  });
}

if (elConfirmOk) {
  elConfirmOk.addEventListener('click', () => {
    SoundManager.playTypeTick();
    if (elConfirmModal) elConfirmModal.style.display = 'none';
    fullReset();
  });
}

if (elDialogBox) elDialogBox.addEventListener('click', skipTypewriter);
if (elDeathOverlay) elDeathOverlay.addEventListener('click', awakenFromDeath);

if (elEndingRestart) {
  elEndingRestart.addEventListener('click', () => {
    if (elEndingOverlay) elEndingOverlay.style.display = 'none';
    fullReset();
  });
}

if (elModalClose) {
  elModalClose.addEventListener('click', () => {
    if (elItemModal) elItemModal.style.display = 'none';
  });
}

function increaseTruth(delta) {
  GameState.truth = Math.min(100, GameState.truth + delta);
  if (GameState.truth >= 70 && !GameState.mutated) {
    GameState.mutated = true;
    triggerTruthMutation();
  }
}

function triggerTruthMutation() {
  SoundManager.playGlitchBurst();
  SoundManager.playHeartbeat();
  
  document.body.classList.add('truth-high');
  document.body.classList.add('corrupted');
  if (elHudTitle) {
    elHudTitle.textContent = '浴䶮';
    elHudTitle.classList.add('mutated');
    elHudTitle.classList.add('corrupted');

    setTimeout(() => {
      elHudTitle.textContent = '浴逝';
    }, 400);
  }
}

function renderScene(sceneId) {
  const scene = Scenes[sceneId];
  if (!scene) return;

  GameState.currentSceneId = sceneId;
  if (elSceneLoc) elSceneLoc.textContent = scene.location;
  if (elSceneTime) elSceneTime.textContent = scene.time;
  if (elTraumaBox) elTraumaBox.style.display = 'none';

  if (scene.onEnter) {
    scene.onEnter();
  }

  updateInventoryBar();
  updateHud();

  const text = typeof scene.text === 'function' ? scene.text() : scene.text;
  startTypewriter(text, () => {
    renderChoices(scene);
  });
}

function startTypewriter(text, onComplete) {
  if (typewriterTimer) clearInterval(typewriterTimer);
  isTypewriting = true;
  currentFullText = text;
  if (elTypeText) elTypeText.textContent = '';
  if (elChoices) elChoices.innerHTML = '';
  if (elCursor) elCursor.style.display = 'inline-block';

  let i = 0;
  const speed = 22;

  typewriterTimer = setInterval(() => {
    if (i < text.length) {
      if (elTypeText) elTypeText.textContent += text.charAt(i);

      try {
        if (i % 3 === 0 && text.charAt(i).trim()) {
          SoundManager.playTypeTick();
        }
      } catch (err) {}

      i++;
    } else {
      finishTypewriter(onComplete);
    }
  }, speed);
}

function skipTypewriter() {
  if (!isTypewriting) return;
  if (typewriterTimer) clearInterval(typewriterTimer);
  if (elTypeText) elTypeText.textContent = currentFullText;
  finishTypewriter(() => {
    const scene = Scenes[GameState.currentSceneId];
    renderChoices(scene);
  });
}

function finishTypewriter(callback) {
  if (typewriterTimer) clearInterval(typewriterTimer);
  isTypewriting = false;
  if (elCursor) elCursor.style.display = 'inline-block';
  if (callback) callback();
}

function renderChoices(scene) {
  if (!elChoices) return;
  elChoices.innerHTML = '';
  const choices = typeof scene.choices === 'function' ? scene.choices() : scene.choices;
  if (!choices || choices.length === 0) return;

  choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn pixel-choice-btn';

    const isTrauma = GameState.traumaSet.has(choice.id);

    if (isTrauma) {
      btn.classList.add('trauma-struck');
      btn.classList.add('traumatized');
      btn.innerHTML = `
        <span class="choice-prefix">[!]</span>
        <span class="choice-label">${choice.label}</span>
        <span class="trauma-badge">[ 創傷記憶 ]</span>
      `;
      btn.addEventListener('click', () => {
        triggerTraumaRecoil(choice.traumaText || '【創傷】那股令人窒息的痛楚浮上心頭，你下意識地縮回了手，絕對不要再去送死。');
      });
    } else {
      btn.innerHTML = `
        <span class="choice-prefix">[${idx + 1}]</span>
        <span class="choice-label">${choice.label}</span>
      `;
      btn.addEventListener('click', () => {
        handleChoiceClick(choice);
      });
    }

    elChoices.appendChild(btn);
  });
}

function handleChoiceClick(choice) {
  SoundManager.playTypeTick();

  if (choice.isFatal) {
    triggerDeath(choice.id, choice.action);
    return;
  }

  if (choice.action === 'ending_escape') {
    showEnding('escape');
    return;
  }
  if (choice.action === 'ending_drown') {
    showEnding('drown');
    return;
  }
  if (choice.action === 'ending_true') {
    showEnding('true');
    return;
  }

  renderScene(choice.action);
}

function triggerTraumaRecoil(text) {
  SoundManager.playHeartbeat();
  if (elTraumaBox) {
    elTraumaBox.textContent = text;
    elTraumaBox.style.display = 'block';
    elTraumaBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else if (elTypeText) {
    elTypeText.innerHTML += `\n\n<span style="color: #c92a2a;">${text}</span>`;
  }
}

function triggerDeath(choiceId, deathKey) {
  GameState.isDead = true;
  GameState.deaths++;
  GameState.traumaSet.add(choiceId);

  SoundManager.playDeathSound();

  const deathInfo = Deaths[deathKey] || {
    title: '【 你 死 了 】',
    desc: '意識被深冷的水流無情吞噬。'
  };

  if (elDeathReason) elDeathReason.textContent = deathInfo.desc;

  if (elDeathFlash) {
    elDeathFlash.style.opacity = '1';
    setTimeout(() => {
      elDeathFlash.style.transition = 'opacity 0.6s ease';
      elDeathFlash.style.opacity = '0';
    }, 100);
  }

  if (elDeathOverlay) {
    elDeathOverlay.style.display = 'flex';
    elDeathOverlay.classList.remove('hidden');
    elDeathOverlay.classList.add('active');
  }
}

function awakenFromDeath() {
  GameState.isDead = false;
  if (elDeathOverlay) {
    elDeathOverlay.style.display = 'none';
    elDeathOverlay.classList.add('hidden');
    elDeathOverlay.classList.remove('active');
  }

  SoundManager.playAwakenChime();
  SoundManager.playHeartbeat();

  updateHud();
  renderScene('bedroom_wake');
}

function updateHud() {
  if (elHudLoop) {
    if (GameState.deaths > 0) {
      elHudLoop.classList.add('visible');
      elHudLoop.classList.remove('hidden');
      elHudLoop.textContent = `輪迴 / 死亡次數：${GameState.deaths}`;
    } else {
      elHudLoop.classList.remove('visible');
      elHudLoop.classList.add('hidden');
    }
  }

  if (GameState.truth >= 70 && !GameState.mutated) {
    triggerTruthMutation();
  }
}

function updateInventoryBar() {
  if (!elItemsList) return;
  const keys = Object.keys(GameState.inventory);
  elItemsList.innerHTML = '';
  if (keys.length === 0) {
    elItemsList.innerHTML = '<span style="color:#555; font-size:0.85rem;">[ 隨身物品：空 ]</span>';
    return;
  }
  keys.forEach(k => {
    const item = GameState.inventory[k];
    const chip = document.createElement('span');
    chip.className = 'item-chip';
    chip.textContent = `[ ${item.name} ]`;
    chip.title = '點擊查看線索';
    chip.addEventListener('click', () => {
      showItemModal(item);
    });
    elItemsList.appendChild(chip);
  });
}

function showItemModal(item) {
  SoundManager.playTypeTick();
  if (elModalTitle) elModalTitle.textContent = item.name;
  if (elModalDesc) elModalDesc.textContent = item.desc;
  if (elItemModal) elItemModal.style.display = 'flex';
}

function showEnding(type) {
  GameState.isEnding = true;
  const end = Endings[type];
  if (elEndingTag) elEndingTag.textContent = end.tag;
  if (elEndingTitle) elEndingTitle.textContent = end.title;
  if (elEndingDesc) elEndingDesc.textContent = end.desc;

  if (elEndingTitle) {
    if (type === 'true') {
      elEndingTitle.style.color = '#77ffaa';
      if (elEndingRestart) elEndingRestart.textContent = '[ 迎向新生的晨曦 ]';
      SoundManager.playAwakenChime();
    } else {
      elEndingTitle.style.color = '#ff4455';
      if (elEndingRestart) elEndingRestart.textContent = '[ 再次墜入輪迴 ]';
      SoundManager.playDeathSound();
    }
  }

  if (elEndingOverlay) elEndingOverlay.style.display = 'flex';
}

function fullReset() {
  GameState.started = false;
  GameState.deaths = 0;
  GameState.truth = 0;
  GameState.mutated = false;
  GameState.currentSceneId = 'bedroom_wake';
  GameState.traumaSet.clear();
  GameState.inventory = {};
  GameState.isDead = false;
  GameState.isEnding = false;
  GameState.flags = {
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
  };

  document.body.classList.remove('truth-high');
  document.body.classList.remove('corrupted');
  if (elHudTitle) {
    elHudTitle.textContent = '浴室';
    elHudTitle.classList.remove('mutated');
    elHudTitle.classList.remove('corrupted');
  }
  if (elHudLoop) {
    elHudLoop.classList.remove('visible');
    elHudLoop.classList.add('hidden');
  }

  if (elPlayArea) elPlayArea.style.display = 'none';
  if (elTitleScreen) elTitleScreen.style.display = 'flex';
}
