// --- [1] Firebase 設定 (請確保金鑰正確) ---
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

// --- [2] 全域變數 ---
let WORDS = [], PETS = [], state = {}, wordPool = [], curQ = null, dailyC = 0, revList = [], revIdx = 0;
const AVATARS = {
    M: ['<svg viewBox="0 0 10 10" class="avatar-svg"><path d="M3 2h4v5H3z" fill="#00f2fe"/><path d="M4 3h1v1H4zm1 0h1v1H5z" fill="#000"/></svg>','<svg viewBox="0 0 10 10" class="avatar-svg"><path d="M3 2h4v5H3z" fill="#00f2fe"/><rect x="2" y="3" width="6" height="2" fill="#ff00de" opacity="0.6"/></svg>','<svg viewBox="0 0 10 10" class="avatar-svg"><path d="M3 1h4v7H3z" fill="#ffd700"/><circle cx="5" cy="5" r="4" fill="none" stroke="#00f2fe" stroke-width="0.5"/></svg>'],
    F: ['<svg viewBox="0 0 10 10" class="avatar-svg"><path d="M3 2h4v5H3z" fill="#ff77aa"/><path d="M2 2h6v2H2z" fill="#333"/></svg>','<svg viewBox="0 0 10 10" class="avatar-svg"><path d="M3 2h4v5H3z" fill="#ff77aa"/><path d="M2 1h6v3H2z" fill="#ff00de" opacity="0.4"/></svg>','<svg viewBox="0 0 10 10" class="avatar-svg"><path d="M3 1h4v7H3z" fill="#ffd700"/><path d="M2 1h6v2H2z" fill="#ff00de"/></svg>']
};

// --- [3] 導航與介面功能 (宣告在最外層，確保 HTML 點得到) ---

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
}

function toHome() {
    window.speechSynthesis.cancel();
    showScreen('scr-menu');
    updateUI();
}

function showSettings() {
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
}

function setGender(g) { state.gen = g; showSettings(); updateUI(); }

function saveSettings() {
    const val = document.getElementById('name-in').value;
    state.name = val || "探險家";
    saveGame();
    toHome();
}

function updateUI() {
    const el = (id) => document.getElementById(id);
    if(el('lv')) el('lv').innerText = state.lv;
    if(el('exp-fill')) el('exp-fill').style.width = (state.exp % 100) + "%";
    if(el('egg-val')) el('egg-val').innerText = state.egg;
    if(el('display-name')) el('display-name').innerText = state.name;
    const ts = ["實習生","拾荒者","搜索官","通訊員","拓荒者","單字神"];
    if(el('display-title')) el('display-title').innerText = ts[Math.min(Math.floor(state.lv/10), 5)];
    let tier = state.lv >= 36 ? 2 : (state.lv >= 11 ? 1 : 0);
    if(el('player-avatar')) el('player-avatar').innerHTML = AVATARS[state.gen || 'M'][tier];
}

// --- [4] 冒險百科與廣播 ---

function showStoryList() {
    if(!PETS.length) return alert("資料讀取中...");
    showScreen('scr-story-list');
    const container = document.getElementById('scr-story-list');
    container.innerHTML = `<div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 返回</button></div><h3 style="color:var(--accent);">📖 星際冒險百科</h3><div id="story-list" class="lib-list"></div>`;
    const list = document.getElementById('story-list');
    if (!state.pets.length) { list.innerHTML = "<p style='padding:20px; color:#666;'>尚未解鎖夥伴。</p>"; return; }
    [...new Set(state.pets)].sort((a,b)=>a-b).forEach(idx => {
        const p = PETS[idx];
        const div = document.createElement('div');
        div.className = 'pet-card';
        div.onclick = () => readStory(idx);
        div.innerHTML = `<div class="pet-img-box">${p.s}</div><div class="pet-info"><h4>${p.n}</h4><p>${p.b}</p></div>`;
        list.appendChild(div);
    });
}

function readStory(idx) {
    const p = PETS[idx];
    const readScr = document.getElementById('scr-story-read');
    readScr.innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="showStoryList()">⬅️ 返回</button></div>
        <div class="avatar-box" style="margin: 0 auto 10px; width: 70px; height: 70px; border-color:var(--accent);">${p.s}</div>
        <h3 style="color:var(--neon);">${p.n}</h3>
        <div style="color:var(--neon); font-size:0.8em; margin-bottom:10px; font-weight:bold;">人設：${p.b}</div>
        <div class="story-box">${p.story}</div>
        <button class="btn-opt" style="margin-top:15px;" onclick="showStoryList()">讀完了！</button>
    `;
    showScreen('scr-story-read');
}

function startReview() {
    if(!WORDS.length) return alert("資料讀取中...");
    revList = [...WORDS].sort(() => 0.5 - Math.random()).slice(0, 10);
    revIdx = 0;
    showScreen('scr-review');
    renderRev();
}

function renderRev() {
    const itm = revList[revIdx];
    document.getElementById('scr-review').innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 返回</button></div>
        <p style="color:var(--neon);">廣播進度: ${revIdx+1} / 10</p>
        <div style="background:rgba(0,0,0,0.4); padding:25px; border-radius:20px; border:1px solid var(--neon); margin:15px 0;">
            <h1 style="color:var(--neon); margin:0;">${itm.w}</h1>
            <p style="margin-top:10px; font-size:1.2em;">${itm.m}</p>
        </div>
        <button class="btn-opt" onclick="nextReviewWord()">${revIdx === 9 ? '完成廣播領取 50 EXP' : '下一個 (Next)'}</button>
    `;
    speak(itm.w);
}

function nextReviewWord() {
    if(revIdx < 9) { revIdx++; renderRev(); }
    else { state.exp += 50; alert("✨ 廣播獎勵 50 EXP！"); toHome(); saveGame(); }
}

// --- [5] 遊戲核心邏輯 ---

function startMode(m) {
    if(!WORDS.length) return alert("資料尚未載入...");
    state.mode = m; state.egg = 0; 
    showScreen('scr-game'); 
    nextQ();
}

function startDaily() {
    if(state.lastD === new Date().toLocaleDateString()) return alert("今天挑戰過了喔！");
    startMode("daily");
    dailyC = 0;
}

function nextQ() {
    if (wordPool.length === 0) wordPool = [...WORDS].sort(() => Math.random() - 0.5);
    curQ = wordPool.pop();
    const isS = state.mode === 'spelling';
    const gScr = document.getElementById('scr-game');
    gScr.innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 退出</button></div>
        <div id="hatch-hint" style="color:var(--neon); font-size:0.8em; margin-bottom:5px;">${isS?'🎧 聽音拼字':'⚔️ 連擊挑戰'}</div>
        <div class="arena"><div id="monster">👾</div><h2 id="display-q">${isS?'❓❓❓':curQ.w}</h2></div>
        <div id="mcq-box" style="display:${isS?'none':'flex'}; flex-direction:column;"></div>
        <div id="spell-box" style="display:${isS?'block':'none'};">
            <p style="color:var(--accent); font-weight:bold;">${curQ.m}</p>
            <input type="text" id="spell-in" autocomplete="off" placeholder="請拼寫...">
        </div>
    `;
    if(!isS) {
        let opts = [curQ.m];
        while(opts.length<4){ 
            let r = WORDS[Math.floor(Math.random()*WORDS.length)].m; 
            if(!opts.includes(r)) opts.push(r);
        }
        opts.sort(()=>Math.random()-0.5);
        opts.forEach(o => {
            const b = document.createElement('button');
            b.className = 'btn-opt'; b.innerText = o; b.onclick = () => check(o);
            document.getElementById('mcq-box').appendChild(b);
        });
    } else {
        const inp = document.getElementById('spell-in');
        inp.onkeydown = (e) => { if(e.key==='Enter') check(); };
        speak(curQ.w);
        setTimeout(() => inp.focus(), 400);
    }
    updateUI();
}

function check(ans) {
    const isS = state.mode === 'spelling';
    const cor = isS ? curQ.w.toLowerCase() : curQ.m;
    const inp = (isS ? document.getElementById('spell-in').value : ans).toLowerCase().trim();
    if(inp === cor) {
        state.exp += 30; state.egg++;
        if(!state.mastered.includes(curQ.w)) state.mastered.push(curQ.w);
        if(state.mode==='daily' && ++dailyC>=15) {
            state.exp+=100; state.lastD = new Date().toLocaleDateString();
            alert("🎉 每日挑戰完成！"); return toHome();
        }
        if(state.egg >= 10) {
            const ridx = Math.floor(Math.random()*PETS.length);
            state.pets.push(ridx); state.egg=0;
            alert("🐣 孵化成功："+PETS[ridx].n);
        }
    } else {
        state.egg = 0; alert("❌ 答案: "+(isS?curQ.w:curQ.m));
    }
    if(state.exp >= (state.lv*100)) { state.lv++; alert("🆙 等級提升！"); }
    saveGame(); nextQ();
}

function showLeaderboard() {
    showScreen('scr-rank');
    const rankScr = document.getElementById('scr-rank');
    rankScr.innerHTML = `<div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 返回</button></div><h3>🏆 全校榮譽榜</h3><div id="rank-list" class="lib-list">接收中...</div>`;
    db.ref('leaderboard').orderByChild('l').limitToLast(20).once('value', s => {
        const dArr = []; s.forEach(c => { dArr.push(c.val()); }); dArr.reverse();
        document.getElementById('rank-list').innerHTML = dArr.map((d,i) => `<div class="rank-item"><span>${i+1}. ${d.n}</span><span>LV ${d.l}</span></div>`).join("");
    });
}

// --- [6] 系統初始化 ---

function saveGame() {
    localStorage.setItem("space_master_v120", JSON.stringify(state));
    if(db) db.ref('leaderboard/' + state.id).update({ n: state.name, l: state.lv, m: state.mastered.length, g: state.gen });
}

async function init() {
    try {
        const response = await fetch('data.json');
        if(!response.ok) throw new Error("HTTP error "+response.status);
        const data = await response.json();
        WORDS = data.words;
        PETS = data.pets;
        
        const s = localStorage.getItem("space_master_v120");
        if(s) state = JSON.parse(s);
        else state = { id: Date.now().toString(), lv: 1, exp: 0, egg: 0, pets: [], name: "探險家", gen: "M", mastered: [], lastD: "" };
        
        updateUI();
        checkDailyStatus();
        console.log("太空系統啟動成功！載入單字數：", WORDS.length);
    } catch (e) {
        console.error("系統故障：", e);
        alert("🛰️ 訊號中斷！請確認 data.json 是否存在且路徑正確。");
    }
}

function checkDailyStatus() {
    const today = new Date().toLocaleDateString();
    if(state.lastD === today) {
        const btn = document.getElementById('btn-daily');
        if(btn) { btn.style.opacity = "0.5"; document.getElementById('daily-status').innerText = "今日已達成。"; }
    }
}

function speak(t){ window.speechSynthesis.cancel(); const m=new SpeechSynthesisUtterance(t); m.lang='en-US'; m.rate=0.85; window.speechSynthesis.speak(m); }

window.onload = init;
