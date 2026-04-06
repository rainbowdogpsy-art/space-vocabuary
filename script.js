/**
 * 太空單字探險家 v13.0 - 16-bit 旗艦版大腦
 * 專為「彩虹狗狗老師」開發
 */

// --- [1] Firebase 初始化 ---
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

// --- [2] 全域變數與 16-bit 像素頭像 ---
let WORDS = [], PETS = [], state = {}, wordPool = [], curQ = null, dailyC = 0, revList = [], revIdx = 0;

const AVATARS = {
    M: [
        // LV 1-10: 16-bit 藍色新手
        `<svg viewBox="0 0 12 12" class="avatar-svg">
            <path d="M2 1h8v4H2z" fill="#0044bb"/> <path d="M2 1h8v1H2z M1 2h1v2H1z" fill="#00f2fe"/> 
            <path d="M3 4h6v6H3z" fill="#fbc3a8"/> <path d="M3 7h6v3H3z" fill="#e8a88a"/>
            <path d="M4 5h1v1H4z M7 5h1v1H7z" fill="#000"/> <path d="M2 9h8v3H2z" fill="#000088"/>
         </svg>`,
        // LV 11-35: 戰鬥護目鏡
        `<svg viewBox="0 0 12 12" class="avatar-svg">
            <path d="M2 1h8v4H2z" fill="#0044bb"/> <path d="M3 4h6v6H3z" fill="#fbc3a8"/>
            <path d="M2 5h8v2H2z" fill="#ff00de" opacity="0.6"/> <path d="M4 5h4v1H4z" fill="#fff" opacity="0.8"/>
            <path d="M2 9h8v3H2z" fill="#333"/>
         </svg>`,
        // LV 36+: 黃金聖甲
        `<svg viewBox="0 0 12 12" class="avatar-svg">
            <path d="M1 1h10v10H1z" fill="#ffd700"/> <path d="M2 2h8v8H2z" fill="#ff9900"/>
            <path d="M4 4h4v4H4z" fill="#fbc3a8"/> <path d="M5 5h2v1H5z" fill="#000"/>
            <path d="M5 9h2v1H5z" fill="#00f2fe"/>
         </svg>`
    ],
    F: [
        // LV 1-10: 16-bit 粉色少女
        `<svg viewBox="0 0 12 12" class="avatar-svg">
            <path d="M1 1h10v6H1z" fill="#cc4477"/> <path d="M2 1h8v1H2z" fill="#ffbbdd"/>
            <path d="M3 4h6v6H3z" fill="#fbc3a8"/> <path d="M4 5h1v2H4z M7 5h1v2H7z" fill="#000"/>
            <path d="M2 9h8v3H2z" fill="#ffcc00"/>
         </svg>`,
        // LV 11-35: 魔法耳機
        `<svg viewBox="0 0 12 12" class="avatar-svg">
            <path d="M1 1h10v6H1z" fill="#cc4477"/> <path d="M0 5h2v4H0z M10 5h2v4H10z" fill="#00f2fe"/>
            <path d="M3 4h6v6H3z" fill="#fbc3a8"/> <path d="M2 9h8v3H2z" fill="#ff00de"/>
         </svg>`,
        // LV 36+: 虹光女皇
        `<svg viewBox="0 0 12 12" class="avatar-svg">
            <circle cx="6" cy="6" r="5.5" fill="#ffd700" opacity="0.3"/>
            <path d="M3 3h6v8H3z" fill="#fbc3a8"/> <path d="M2 2h8v2H2z" fill="#ff00de"/>
            <path d="M5 5h2v1H5z" fill="#000"/> <path d="M3 10h6v2H3z" fill="#ff77aa"/>
         </svg>`
    ]
};

// --- [3] 導航與介面 (掛載至 Window 確保 HTML 可用) ---

window.showScreen = function(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
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
        <h3 style="color:var(--neon); font-size:12px;">🛰️ 角色設定</h3>
        <p style="font-size:10px;">切換形象：</p>
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <button class="btn-opt ${state.gen==='M'?'active':''}" onclick="setGender('M')">男生形象</button>
            <button class="btn-opt ${state.gen==='F'?'active':''}" onclick="setGender('F')">女生形象</button>
        </div>
        <input type="text" id="name-in" style="background:#000; border:2px solid #fff; color:#fff; padding:12px; width:80%; text-align:center; font-family:'Press Start 2P';" value="${state.name}">
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

// --- [4] 遊戲邏輯 ---

window.startMode = function(m) {
    if (!WORDS.length) return alert("資料庫同步中...");
    state.mode = m; state.egg = 0;
    showScreen('scr-game');
    nextQ();
};

window.startDaily = function() {
    if (state.lastD === new Date().toLocaleDateString()) return alert("今天挑戰過了喔！");
    startMode("daily"); dailyC = 0;
};

window.nextQ = function() {
    if (wordPool.length === 0) wordPool = [...WORDS].sort(() => Math.random() - 0.5);
    curQ = wordPool.pop();
    const isS = state.mode === 'spelling';
    const gScr = document.getElementById('scr-game');

    // 16-bit 史萊姆精靈
    const monsterSprite = `
        <svg viewBox="0 0 16 16" width="100" height="100">
            <path d="M4 14h8v1H4z M3 13h10v1H3z" fill="#440044"/>
            <path d="M2 7h12v5H2z M3 6h10v1H3z" fill="#880088"/>
            <path d="M4 5h3v1H4z M9 5h3v1H9z" fill="#aa00aa"/>
            <path d="M4 8h3v3H4z M9 8h3v3H9z" fill="#fff"/>
            <path d="M5 9h1v1H5z M10 9h1v1H10z" fill="#000"/>
        </svg>`;

    gScr.innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 退出</button></div>
        <div class="arena">
            <div id="monster-sprite" style="animation: float 3s infinite ease-in-out;">${monsterSprite}</div>
            <h2 id="display-q" style="font-size:12px; margin-top:20px;">${isS ? '❓❓❓' : curQ.w}</h2>
        </div>
        <div id="mcq-box" style="display:${isS ? 'none' : 'flex'}; flex-direction:column;"></div>
        <div id="spell-box" style="display:${isS ? 'block' : 'none'};">
            <p style="color:var(--accent); font-size:10px; margin-bottom:10px;">${curQ.m}</p>
            <input type="text" id="spell-in" autocomplete="off" placeholder="TYPE HERE...">
        </div>
    `;

    if (!isS) {
        let opts = [curQ.m];
        while (opts.length < 4) {
            let r = WORDS[Math.floor(Math.random() * WORDS.length)].m;
            if (!opts.includes(r)) opts.push(r);
        }
        opts.sort(() => Math.random() - 0.5).forEach(o => {
            const b = document.createElement('button');
            b.className = 'btn-opt'; b.innerText = o; b.onclick = () => check(o);
            document.getElementById('mcq-box').appendChild(b);
        });
    } else {
        const inp = document.getElementById('spell-in');
        inp.onkeydown = (e) => { if (e.key === 'Enter') check(); };
        speak(curQ.w); setTimeout(() => inp.focus(), 400);
    }
};

window.check = function(ans) {
    const isS = state.mode === 'spelling';
    const cor = isS ? curQ.w.toLowerCase() : curQ.m;
    const inp = (isS ? document.getElementById('spell-in').value : ans).toLowerCase().trim();
    if (inp === cor) {
        state.exp += 30; state.egg++;
        if (state.mode === 'daily' && ++dailyC >= 15) {
            state.exp += 100; state.lastD = new Date().toLocaleDateString();
            alert("🎉 任務達成！獲得獎勵 100 EXP"); return toHome();
        }
        if (state.egg >= 10) {
            const ridx = Math.floor(Math.random() * PETS.length);
            state.pets.push(ridx); state.egg = 0;
            alert("🐣 發現新夥伴：" + PETS[ridx].n);
        }
    } else { state.egg = 0; alert("❌ 答案是: " + (isS ? curQ.w : curQ.m)); }
    if (state.exp >= (state.lv * 100)) { state.lv++; alert("🆙 等級提升！探險裝備進化！"); }
    saveGame(); nextQ();
};

// --- [5] 百科與廣播 ---

window.showStoryList = function() {
    showScreen('scr-story-list');
    const container = document.getElementById('scr-story-list');
    container.innerHTML = `<div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 返回</button></div><h3 style="color:var(--accent); font-size:12px;">📖 星際冒險百科</h3><div id="story-list" class="lib-list"></div>`;
    const list = document.getElementById('story-list');
    if (!state.pets || state.pets.length === 0) { list.innerHTML = "<p style='padding:20px; font-size:8px; color:#666; text-align:center;'>尚無夥伴紀錄。</p>"; return; }
    [...new Set(state.pets)].sort((a,b)=>a-b).forEach(idx => {
        const p = PETS[idx];
        const div = document.createElement('div');
        div.className = 'pet-card';
        div.onclick = () => readStory(idx);
        div.innerHTML = `<div class="pet-img-box">${p.s}</div><div class="pet-info"><h4 style="font-size:10px; margin:0;">${p.n}</h4><p style="font-size:7px; color:#aaa; margin:5px 0 0 0;">${p.b}</p></div>`;
        list.appendChild(div);
    });
};

function readStory(idx) {
    const p = PETS[idx];
    showScreen('scr-story-read');
    document.getElementById('scr-story-read').innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="showStoryList()">⬅️ 返回</button></div>
        <div class="avatar-box" style="margin: 0 auto 10px;">${p.s}</div>
        <h3 style="color:var(--neon); font-size:12px;">${p.n}</h3>
        <div class="story-box" style="font-size:9px;">${p.story}</div>
        <button class="btn-opt" style="margin-top:15px;" onclick="showStoryList()">讀完了！</button>
    `;
}

window.startReview = function() {
    if (!WORDS.length) return alert("載入中...");
    revList = [...WORDS].sort(() => 0.5 - Math.random()).slice(0, 10);
    revIdx = 0; showScreen('scr-review'); renderRev();
};

function renderRev() {
    const itm = revList[revIdx];
    document.getElementById('scr-review').innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 退出</button></div>
        <div style="background:rgba(0,0,0,0.5); padding:20px; border:4px double var(--neon); margin:20px 0;">
            <h1 style="color:var(--neon); font-size:18px; margin:0;">${itm.w}</h1>
            <p style="margin-top:10px; font-size:12px;">${itm.m}</p>
        </div>
        <button class="btn-opt" onclick="nextReviewWord()">${revIdx === 9 ? '完成廣播領取 50 EXP' : '下一個 (Next)'}</button>
    `;
    speak(itm.w);
}

window.nextReviewWord = function() { if (revIdx < 9) { revIdx++; renderRev(); } else { state.exp += 50; alert("✨ 獎勵 50 EXP！"); toHome(); saveGame(); } };

window.showLeaderboard = function() {
    showScreen('scr-rank');
    const rs = document.getElementById('rank-list');
    rs.innerHTML = "接收訊號中...";
    db.ref('leaderboard').orderByChild('l').limitToLast(15).once('value', s => {
        const dArr = []; s.forEach(c => { dArr.push(c.val()); }); dArr.reverse();
        rs.innerHTML = dArr.map((d,i) => `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #333; font-size:8px;"><span>${i+1}. ${d.n}</span><span>LV ${d.l}</span></div>`).join("");
    });
};

// --- [6] 系統維護 ---

function updateUI() {
    const el = (id) => document.getElementById(id);
    if (el('lv')) el('lv').innerText = state.lv;
    if (el('exp-fill')) el('exp-fill').style.width = (state.exp % 100) + "%";
    if (el('egg-val')) el('egg-val').innerText = state.egg;
    if (el('display-name')) el('display-name').innerText = state.name;
    let tier = state.lv >= 36 ? 2 : (state.lv >= 11 ? 1 : 0);
    if (el('player-avatar')) el('player-avatar').innerHTML = AVATARS[state.gen || 'M'][tier];
}

function saveGame() {
    localStorage.setItem("space_master_v130", JSON.stringify(state));
    if (db) db.ref('leaderboard/' + state.id).update({ n: state.name, l: state.lv, g: state.gen, t: Date.now() });
}

async function init() {
    console.log("🚀 探險家系統載入中...");
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        WORDS = data.words; PETS = data.pets;
        const s = localStorage.getItem("space_master_v130");
        if (s) state = JSON.parse(s);
        else state = { id: Date.now().toString(), lv: 1, exp: 0, egg: 0, pets: [], name: "探險家", gen: "M", mastered: [], lastD: "" };
        updateUI();
        console.log("✅ 系統啟動成功！");
    } catch (e) { console.error("系統故障:", e); alert("🛰️ 訊號遺失！請確認 data.json 已上傳。"); }
}

function speak(t){ window.speechSynthesis.cancel(); const m=new SpeechSynthesisUtterance(t); m.lang='en-US'; m.rate=0.85; window.speechSynthesis.speak(m); }

window.onload = init;
