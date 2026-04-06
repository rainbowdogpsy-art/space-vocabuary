// --- [1] Firebase 初始化 (請確認金鑰正確) ---
const firebaseConfig = {
  apiKey: "AIzaSyBdEDFM_zllcQM8aILmfM5cvo_Rm3ouf90",
  authDomain: "space-voc.firebaseapp.com",
  projectId: "space-voc",
  storageBucket: "space-voc.firebasestorage.app",
  messagingSenderId: "951077212797",
  appId: "1:951077212797:web:c6a37bf911870277585714",
  measurementId: "G-DTRDP4LMCG",
  databaseURL: "https://space-voc-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- [2] 全域變數與日系像素頭像 ---
let WORDS = [], PETS = [], state = {}, wordPool = [], curQ = null, dailyC = 0, revList = [], revIdx = 0;

const AVATARS = {
:root {
    --bg: #0d1117;
    --neon: #00f2fe;
    --accent: #ff00de;
    --window-bg: rgba(20, 20, 45, 0.9);
    --pixel-border: #ffffff;
}

/* 引入字體並套用 */
body {
    margin: 0;
    background: var(--bg);
    color: white;
    font-family: 'Press Start 2P', cursive; /* 像素專用字體 */
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    overflow: hidden;
    background-image: 
        radial-gradient(circle at center, #1b2735 0%, #090a0f 100%),
        repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px); /* 模擬掃描線 */
}

/* 遊戲主容器：加上厚重的 16-bit 窗格感 */
#game-container {
    width: 95%;
    max-width: 440px;
    background: var(--window-bg);
    border: 4px solid var(--pixel-border);
    border-radius: 4px;
    padding: 20px;
    position: relative;
    box-shadow: 
        10px 10px 0px rgba(0,0,0,0.5), /* 復古硬陰影 */
        inset 0 0 20px rgba(0, 242, 254, 0.2);
}

/* 狀態列美化 */
.header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
    border-bottom: 4px double var(--neon);
    padding-bottom: 10px;
}

.avatar-box {
    width: 70px;
    height: 70px;
    background: #000;
    border: 3px solid #fff;
    image-rendering: pixelated;
    box-shadow: 4px 4px 0px #444;
}

/* 16-bit 立體按鈕樣式 */
.btn-mode, .btn-opt {
    background: #2a2a5a;
    border: 4px solid #000;
    border-top-color: #5a5a9a; /* 頂部亮邊，營造立體感 */
    border-left-color: #5a5a9a;
    color: #fff;
    padding: 15px;
    cursor: pointer;
    font-size: 10px; /* 像素字體通常要小一點 */
    line-height: 1.5;
    margin-bottom: 10px;
    transition: transform 0.1s;
    box-shadow: 4px 4px 0px #000;
}

.btn-mode:active, .btn-opt:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0px #000;
}

.btn-mode h3 { margin: 0 0 5px 0; color: var(--neon); font-size: 12px; }
.btn-mode p { margin: 0; font-size: 8px; color: #aaa; }

/* 經驗值條：16-bit 漸層感 */
.exp-bg {
    width: 100%;
    height: 12px;
    background: #000;
    border: 2px solid #fff;
}

#exp-fill {
    height: 100%;
    background: linear-gradient(to right, #0044ff, #00f2fe);
    width: 0%;
}

/* 讓 SVG 銳利化 */
svg {
    image-rendering: pixelated;
}


// --- [3] 核心功能 (宣告在最外層，確保 HTML 點得到) ---

window.showScreen = function(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
};

window.toHome = function() {
    window.speechSynthesis.cancel();
    showScreen('scr-menu');
    updateUI();
};

window.showSettings = function() {
    const setScr = document.getElementById('scr-settings');
    setScr.innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 返回</button></div>
        <h3 style="color:var(--neon);">探險家終端</h3>
        <p>形象設定：</p>
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <button class="btn-opt ${state.gen==='M'?'active':''}" onclick="setGender('M')">男生形象</button>
            <button class="btn-opt ${state.gen==='F'?'active':''}" onclick="setGender('F')">女生形象</button>
        </div>
        <input type="text" id="name-in" style="background:#000; border:1px solid #444; color:#fff; padding:15px; border-radius:12px; width:80%; text-align:center;" value="${state.name}">
        <button class="btn-opt" style="margin-top:15px; border-color:var(--neon);" onclick="saveSettings()">確認同步</button>
    `;
    showScreen('scr-settings');
};

window.setGender = function(g) { state.gen = g; showSettings(); updateUI(); };

window.saveSettings = function() {
    state.name = document.getElementById('name-in').value || "探險家";
    saveGame();
    toHome();
};

window.startMode = function(m) {
    if(!WORDS.length) return alert("資料庫載入中，請稍候...");
    state.mode = m; state.egg = 0; showScreen('scr-game'); nextQ();
};

window.startDaily = function() {
    if(state.lastD === new Date().toLocaleDateString()) return alert("今天挑戰過了喔！");
    startMode("daily"); dailyC = 0;
};

// --- [4] 冒險百科與廣播 ---

window.showStoryList = function() {
    showScreen('scr-story-list');
    const container = document.getElementById('scr-story-list');
    container.innerHTML = `<div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 返回</button></div><h3 style="color:var(--accent);">📖 星際冒險百科</h3><div id="story-list" class="lib-list"></div>`;
    const list = document.getElementById('story-list');
    if (!state.pets || state.pets.length === 0) { list.innerHTML = "<p style='padding:20px; color:#666;'>尚未解鎖夥伴。</p>"; return; }
    [...new Set(state.pets)].sort((a,b)=>a-b).forEach(idx => {
        const p = PETS[idx];
        const div = document.createElement('div');
        div.className = 'pet-card';
        div.onclick = () => readStory(idx);
        div.innerHTML = `<div class="pet-img-box">${p.s}</div><div class="pet-info"><h4>${p.n}</h4><p>${p.b}</p></div>`;
        list.appendChild(div);
    });
};

function readStory(idx) {
    const p = PETS[idx];
    const readScr = document.getElementById('scr-story-read');
    readScr.innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="showStoryList()">⬅️ 返回</button></div>
        <div class="avatar-box" style="margin: 0 auto 10px; width: 70px; height: 70px; border-color:var(--accent);">${p.s}</div>
        <h3 style="color:var(--neon);">${p.n}</h3>
        <div style="color:var(--neon); font-size:0.8em; margin-bottom:10px; font-weight:bold;">人設：${p.b}</div>
        <div class="story-box">${p.story}</div>
        <button class="btn-opt" style="margin-top:15px;" onclick="showStoryList()">我讀完了！</button>
    `;
    showScreen('scr-story-read');
}

window.startReview = function() {
    if(!WORDS.length) return alert("資料載入中...");
    revList = [...WORDS].sort(() => 0.5 - Math.random()).slice(0, 10);
    revIdx = 0; showScreen('scr-review'); renderRev();
};

function renderRev() {
    const itm = revList[revIdx];
    document.getElementById('scr-review').innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 返回</button></div>
        <div style="background:rgba(0,0,0,0.4); padding:25px; border-radius:20px; border:1px solid var(--neon); margin:15px 0;">
            <h1 style="color:var(--neon); margin:0;">${itm.w}</h1>
            <p style="margin-top:10px;">${itm.m}</p>
        </div>
        <button class="btn-opt" onclick="nextReviewWord()">${revIdx === 9 ? '完成領取 50 EXP' : '下一個'}</button>
    `;
    speak(itm.w);
}

window.nextReviewWord = function() { if(revIdx < 9) { revIdx++; renderRev(); } else { state.exp += 50; alert("✨ 廣播獎勵 50 EXP！"); toHome(); saveGame(); } };

// --- [5] 遊戲核心與 UI ---

function updateUI() {
    const el = (id) => document.getElementById(id);
    if(el('lv')) el('lv').innerText = state.lv;
    if(el('exp-fill')) el('exp-fill').style.width = (state.exp % 100) + "%";
    if(el('egg-val')) el('egg-val').innerText = state.egg;
    if(el('display-name')) el('display-name').innerText = state.name;
    let tier = state.lv >= 36 ? 2 : (state.lv >= 11 ? 1 : 0);
    if(el('player-avatar')) el('player-avatar').innerHTML = AVATARS[state.gen || 'M'][tier];
    const ts = ["實習生","拾荒者","搜索官","通訊員","拓荒者","單字神"];
    if(el('display-title')) el('display-title').innerText = ts[Math.min(Math.floor(state.lv/10), 5)];
}

function nextQ() {
    if (wordPool.length === 0) wordPool = [...WORDS].sort(() => Math.random() - 0.5);
    curQ = wordPool.pop();
    const isS = state.mode === 'spelling';
    const gScr = document.getElementById('scr-game');
    gScr.innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 退出</button></div>
        <div class="arena"><div id="monster">👾</div><h2 id="display-q">${isS?'❓❓❓':curQ.w}</h2></div>
        <div id="mcq-box" style="display:${isS?'none':'flex'}; flex-direction:column;"></div>
        <div id="spell-box" style="display:${isS?'block':'none'};">
            <p style="color:var(--accent); font-weight:bold;">${curQ.m}</p>
            <input type="text" id="spell-in" autocomplete="off" placeholder="請拼寫...">
        </div>
    `;
    if(!isS) {
        let opts = [curQ.m];
        while(opts.length<4){ let r = WORDS[Math.floor(Math.random()*WORDS.length)].m; if(!opts.includes(r)) opts.push(r); }
        opts.sort(()=>Math.random()-0.5).forEach(o => {
            const b = document.createElement('button'); b.className = 'btn-opt'; b.innerText = o; b.onclick = () => check(o);
            document.getElementById('mcq-box').appendChild(b);
        });
    } else {
        const inp = document.getElementById('spell-in');
        inp.onkeydown = (e) => { if(e.key==='Enter') check(); };
        speak(curQ.w); setTimeout(() => inp.focus(), 400);
    }
}

function check(ans) {
    const isS = state.mode === 'spelling';
    const cor = isS ? curQ.w.toLowerCase() : curQ.m;
    const inp = (isS ? document.getElementById('spell-in').value : ans).toLowerCase().trim();
    if(inp === cor) {
        state.exp += 30; state.egg++;
        if(state.mode==='daily' && ++dailyC>=15) { state.exp+=100; state.lastD = new Date().toLocaleDateString(); alert("🎉 每日挑戰完成！"); return toHome(); }
        if(state.egg >= 10) { const ridx = Math.floor(Math.random()*PETS.length); state.pets.push(ridx); state.egg=0; alert("🐣 孵化成功："+PETS[ridx].n); }
    } else { state.egg = 0; alert("❌ 答案是: "+(isS?curQ.w:curQ.m)); }
    if(state.exp >= (state.lv*100)) { state.lv++; alert("🆙 等級提升！裝備進化！"); }
    saveGame(); nextQ();
}

window.showLeaderboard = function() {
    showScreen('scr-rank');
    const rankScr = document.getElementById('scr-rank');
    rankScr.innerHTML = `<div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 返回</button></div><h3>🏆 榮譽榜</h3><div id="rank-list" class="lib-list">接收中...</div>`;
    db.ref('leaderboard').orderByChild('l').limitToLast(20).once('value', s => {
        const dArr = []; s.forEach(c => { dArr.push(c.val()); }); dArr.reverse();
        document.getElementById('rank-list').innerHTML = dArr.map((d,i) => `<div class="rank-item"><span>${i+1}. ${d.n}</span><span>LV ${d.l}</span></div>`).join("");
    });
};

// --- [6] 儲存與載入 ---

function saveGame() {
    localStorage.setItem("space_master_v121", JSON.stringify(state));
    if(db) db.ref('leaderboard/' + state.id).update({ n: state.name, l: state.lv, m: (state.mastered?state.mastered.length:0), g: state.gen });
}

async function init() {
    try {
        const response = await fetch('data.json');
        if(!response.ok) throw new Error();
        const data = await response.json();
        WORDS = data.words; PETS = data.pets;
        const s = localStorage.getItem("space_master_v121");
        if(s) state = JSON.parse(s);
        else state = { id: Date.now().toString(), lv: 1, exp: 0, egg: 0, pets: [], name: "探險家", gen: "M", mastered: [], lastD: "" };
        updateUI();
        console.log("系統啟動成功！");
    } catch (e) {
        alert("🛰️ 讀取 data.json 失敗！請確保檔案已上傳至 GitHub。");
    }
}

function speak(t){ window.speechSynthesis.cancel(); const m=new SpeechSynthesisUtterance(t); m.lang='en-US'; m.rate=0.85; window.speechSynthesis.speak(m); }
window.onload = init;
