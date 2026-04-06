/* 太空大腦 v14.4 - 32-bit 最終穩定版 */

// --- [1] Firebase & 基礎資料 ---
const firebaseConfig = {
    apiKey: "AIzaSyBdEDFM_zllcQM8aILmfM5cvo_Rm3ouf90",
    authDomain: "space-voc.firebaseapp.com",
    projectId: "space-voc",
    databaseURL: "https://space-voc-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let WORDS = [], PETS = [], state = {}, wordPool = [], curQ = null, dailyC = 0, revList = [], revIdx = 0;

// 32-bit 高解析玩家頭像
const AVATARS = {
    M: [
        `<svg viewBox="0 0 32 32"><path d="M6 4h20v4H6z" fill="#0044bb"/><path d="M4 8h24v16H4z" fill="#fbc3a8"/><path d="M8 12h4v4H8z M20 12h4v4H20z" fill="#000"/><path d="M12 13h1v1H12z M24 13h1v1H24z" fill="#fff" opacity="0.6"/><path d="M6 24h20v8H6z" fill="#000088"/></svg>`,
        `<svg viewBox="0 0 32 32"><path d="M6 4h20v4H6z" fill="#0044bb"/><path d="M4 8h24v16H4z" fill="#fbc3a8"/><path d="M4 10h24v6H4z" fill="#ff00de" opacity="0.4"/><path d="M8 24h16v8H8z" fill="#333"/></svg>`,
        `<svg viewBox="0 0 32 32"><path d="M2 2h28v28H2z" fill="#ffd700"/><path d="M6 6h20v20H6z" fill="#ff9900"/><path d="M10 10h12v12H10z" fill="#fbc3a8"/></svg>`
    ],
    F: [
        `<svg viewBox="0 0 32 32"><path d="M2 2h28v18H2z" fill="#cc4477"/><path d="M4 8h24v18H4z" fill="#fbc3a8"/><path d="M8 12h4v4H8z M20 12h4v4H20z" fill="#000"/><path d="M4 26h24v6H4z" fill="#ffcc00"/></svg>`,
        `<svg viewBox="0 0 32 32"><path d="M2 2h28v18H2z" fill="#cc4477"/><path d="M0 12h4v8H0z M28 12h4v8H28z" fill="#00f2fe"/><path d="M4 8h24v18H4z" fill="#fbc3a8"/></svg>`,
        `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#ffd700" opacity="0.3"/><path d="M8 6h16v20H8z" fill="#fbc3a8"/><path d="M4 4h24v4H4z" fill="#ff00de"/></svg>`
    ]
};

// --- [2] 介面與導航功能 ---

window.showScreen = function(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const t = document.getElementById(id);
    if(t) t.classList.add('active');
};

window.toHome = function() {
    window.speechSynthesis.cancel();
    window.showScreen('scr-menu');
    updateUI();
};

window.showSettings = function() {
    const setScr = document.getElementById('scr-settings');
    setScr.innerHTML = `
        <div style="text-align:left;"><button class="btn-mode" style="padding:5px 15px;" onclick="window.toHome()">🏠 返回</button></div>
        <h3 style="color:var(--neon); margin:20px 0;">🛰️ 角色設定</h3>
        <div class="menu-grid">
            <button class="btn-mode ${state.gen==='M'?'active':''}" onclick="window.setGender('M')">男生形象</button>
            <button class="btn-mode ${state.gen==='F'?'active':''}" onclick="window.setGender('F')">女生形象</button>
        </div>
        <input type="text" id="name-in" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid #555; color:#fff; padding:15px; border-radius:12px; box-sizing:border-box; text-align:center; margin:15px 0;" value="${state.name}">
        <button class="btn-mode" style="width:100%; border-color:var(--neon);" onclick="window.saveSettings()">確認同步</button>
    `;
    window.showScreen('scr-settings');
};

window.setGender = function(g) { state.gen = g; window.showSettings(); updateUI(); };
window.saveSettings = function() { state.name = document.getElementById('name-in').value || "探險家"; saveGame(); window.toHome(); };

// --- [3] 星際廣播系統 (修正 ReferenceError) ---

window.renderRev = function() {
    const itm = revList[revIdx];
    const revScr = document.getElementById('scr-review');
    revScr.innerHTML = `
        <div style="text-align:left;"><button class="btn-mode" style="padding:5px 15px;" onclick="window.toHome()">🏠 退出</button></div>
        <p style="text-align:center; color:#888; font-size:0.8em; margin-bottom:10px;">頻道進度: ${revIdx + 1} / 10</p>
        <div style="background:rgba(0,0,0,0.4); padding:30px; border-radius:20px; border:1px solid var(--neon); margin:15px 0; text-align:center;">
            <h1 style="color:var(--neon); margin:0; font-size:2.3em;">${itm.w}</h1>
            <p style="margin-top:15px; font-size:1.3em; color:#fff;">${itm.m}</p>
        </div>
        <button class="btn-mode" style="width:100%;" onclick="window.nextReviewWord()">${revIdx === 9 ? '完成廣播領取經驗' : '下一個 (Next)'}</button>
    `;
    window.speak(itm.w);
};

window.startReview = function() {
    if(!WORDS.length) return alert("資料載入中...");
    revList = [...WORDS].sort(() => 0.5 - Math.random()).slice(0, 10);
    revIdx = 0; 
    window.showScreen('scr-review'); 
    window.renderRev(); 
};

window.nextReviewWord = function() { 
    if (revIdx < 9) { revIdx++; window.renderRev(); } 
    else { state.exp += 50; alert("✨ 廣播獎勵 50 EXP！"); window.toHome(); saveGame(); } 
};

// --- [4] 遊戲邏輯 (故事循序解鎖) ---

window.startMode = function(m) {
    if(!WORDS.length) return alert("資料載入中...");
    state.mode = m; state.egg = 0; window.showScreen('scr-game'); nextQ();
};

window.startDaily = function() {
    if (state.lastD === new Date().toLocaleDateString()) return alert("今天挑戰過了喔！");
    window.startMode("daily"); dailyC = 0;
};

window.check = function(ans) {
    const isS = state.mode === 'spelling';
    const cor = isS ? curQ.w.toLowerCase() : curQ.m;
    const inp = (isS ? document.getElementById('spell-in').value : ans).toLowerCase().trim();

    if(inp === cor) {
        state.exp += 30; state.egg++;
        // 循序解鎖邏輯
        if(state.egg >= 10) {
            const nextIdx = state.pets.length; 
            if (nextIdx < PETS.length) {
                state.pets.push(nextIdx);
                alert("🐣 發現新夥伴：" + PETS[nextIdx].n);
            } else { alert("✨ 已收集全體夥伴！"); }
            state.egg = 0;
        }
        if(state.mode === 'daily' && ++dailyC >= 15) {
            state.exp += 100; state.lastD = new Date().toLocaleDateString();
            alert("🎉 任務達成！"); return window.toHome();
        }
    } else { state.egg = 0; alert("❌ 答案是: " + (isS ? curQ.w : curQ.m)); }
    if(state.exp >= (state.lv * 100)) { state.lv++; alert("🆙 等級提升！"); }
    saveGame(); nextQ();
};

window.showStoryList = function() {
    window.showScreen('scr-story-list');
    const container = document.getElementById('scr-story-list');
    container.innerHTML = `<div style="text-align:left;"><button class="btn-mode" style="padding:5px 15px;" onclick="window.toHome()">🏠 返回</button></div><h3 style="color:var(--accent); margin:15px 0;">📖 冒險故事百科</h3><div id="story-list" style="display:flex; flex-direction:column; gap:10px;"></div>`;
    const list = document.getElementById('story-list');
    if (!state.pets || state.pets.length === 0) {
        list.innerHTML = "<p style='padding:40px; color:#666; text-align:center;'>尚未收集夥伴。</p>";
        return;
    }
    state.pets.forEach(idx => {
        const p = PETS[idx];
        const div = document.createElement('div');
        div.style = "background:rgba(255,255,255,0.05); border-radius:15px; padding:15px; display:flex; align-items:center; gap:15px; cursor:pointer; border:1px solid #333;";
        div.onclick = () => readStory(idx);
        div.innerHTML = `<div style="width:40px; height:40px; flex-shrink:0;">${p.s}</div><div><div style="font-weight:bold; color:var(--neon);">${p.n}</div><div style="font-size:0.7em; color:#888;">${p.b}</div></div>`;
        list.appendChild(div);
    });
};

function readStory(idx) {
    const p = PETS[idx];
    window.showScreen('scr-story-read');
    document.getElementById('scr-story-read').innerHTML = `
        <div style="text-align:left;"><button class="btn-mode" style="padding:5px 15px;" onclick="window.showStoryList()">⬅️ 返回</button></div>
        <div style="width:100px; height:100px; margin:20px auto;">${p.s}</div>
        <h3 style="color:var(--neon); text-align:center;">${p.n}</h3>
        <div style="background:rgba(0,0,0,0.4); padding:20px; border-radius:15px; line-height:1.6; font-size:0.95em; margin-top:15px;">${p.story}</div>
        <button class="btn-mode" style="width:100%; margin-top:20px;" onclick="window.showStoryList()">我讀完了</button>
    `;
}

window.showLeaderboard = function() {
    window.showScreen('scr-rank');
    const rs = document.getElementById('rank-list');
    rs.innerHTML = "同步中...";
    db.ref('leaderboard').orderByChild('l').limitToLast(15).once('value', s => {
        const dArr = []; s.forEach(c => dArr.push(c.val())); dArr.reverse();
        rs.innerHTML = dArr.map((d,i) => `<div style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid #222; font-size:0.85em;"><span>${i+1}. ${d.n}</span><span>LV ${d.l}</span></div>`).join("");
    });
};

// --- [5] 系統核心與載入 ---

function updateUI() {
    const el = (id) => document.getElementById(id);
    if(el('lv')) el('lv').innerText = state.lv;
    if(el('exp-fill')) el('exp-fill').style.width = (state.exp % 100) + "%";
    if(el('egg-val')) el('egg-val').innerText = state.egg;
    if(el('display-name')) el('display-name').innerText = state.name;
    let tier = state.lv >= 36 ? 2 : (state.lv >= 11 ? 1 : 0);
    const avBox = el('player-avatar');
    if(avBox) avBox.innerHTML = AVATARS[state.gen || 'M'][tier];
}

function nextQ() {
    if (wordPool.length === 0) wordPool = [...WORDS].sort(() => Math.random() - 0.5);
    curQ = wordPool.pop();
    const isS = state.mode === 'spelling';
    const gScr = document.getElementById('scr-game');
    gScr.innerHTML = `
        <div style="text-align:left;"><button class="btn-mode" style="padding:5px 15px;" onclick="window.toHome()">🏠 退出</button></div>
        <div style="text-align:center; padding:20px;">
            <div style="font-size:3.5em; animation: float 3s infinite ease-in-out;">👾</div>
            <h2 style="color:var(--neon); font-size:1.8em; margin:15px 0;">${isS ? '❓❓❓' : curQ.w}</h2>
        </div>
        <div id="mcq-box" style="display:${isS ? 'none' : 'grid'}; grid-template-columns:1fr; gap:8px;"></div>
        <div id="spell-box" style="display:${isS ? 'block' : 'none'}; text-align:center;">
            <p style="color:var(--accent); font-weight:bold; margin-bottom:15px;">${curQ.m}</p>
            <input type="text" id="spell-in" autocomplete="off" style="width:100%; background:rgba(0,0,0,0.5); border:2px solid var(--neon); color:#fff; padding:15px; border-radius:12px; font-size:1.5em; text-align:center; box-sizing:border-box;">
        </div>
    `;
    if(!isS) {
        let opts = [curQ.m];
        while(opts.length<4){ let r=WORDS[Math.floor(Math.random()*WORDS.length)].m; if(!opts.includes(r))opts.push(r); }
        opts.sort(()=>Math.random()-0.5).forEach(o => {
            const b = document.createElement('button'); b.className = 'btn-mode'; b.innerText = o; b.onclick = () => window.check(o);
            document.getElementById('mcq-box').appendChild(b);
        });
    } else {
        const inp = document.getElementById('spell-in');
        inp.onkeydown = (e) => { if(e.key==='Enter') window.check(); };
        window.speak(curQ.w); setTimeout(()=>inp.focus(), 400);
    }
}

function saveGame() {
    localStorage.setItem("space_master_v144", JSON.stringify(state));
    if(db) db.ref('leaderboard/' + state.id).update({ n: state.name, l: state.lv, g: state.gen });
}

async function init() {
    try {
        const r = await fetch('data.json');
        const data = await r.json();
        WORDS = data.words; PETS = data.pets;
        const s = localStorage.getItem("space_master_v144");
        if(s) state = JSON.parse(s);
        else state = { id: Date.now().toString(), lv: 1, exp: 0, egg: 0, pets: [], name: "探險家", gen: "M", mastered: [], lastD: "" };
        updateUI();
    } catch (e) { console.error(e); }
}

window.speak = function(t){ window.speechSynthesis.cancel(); const m=new SpeechSynthesisUtterance(t); m.lang='en-US'; m.rate=0.85; window.speechSynthesis.speak(m); };
window.onload = init;
