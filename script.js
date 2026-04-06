/* 太空大腦 v13.5 */
window.updateUI = function() {
    const el = (id) => document.getElementById(id);
    if(el('lv')) el('lv').innerText = state.lv;
    if(el('exp-fill')) el('exp-fill').style.width = (state.exp % 100) + "%";
    if(el('egg-val')) el('egg-val').innerText = state.egg;
    if(el('display-name')) el('display-name').innerText = state.name;
    
    let tier = state.lv >= 36 ? 2 : (state.lv >= 11 ? 1 : 0);
    const avBox = el('player-avatar');
    if(avBox) avBox.innerHTML = AVATARS[state.gen || 'M'][tier];
    
    const ts = ["實習生","拾荒者","搜索官","通訊員","拓荒者","單字神"];
    if(el('display-title')) el('display-title').innerText = ts[Math.min(Math.floor(state.lv/10), 5)];
};

window.showScreen = function(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none'; // 強制隱藏
    });
    const target = document.getElementById(id);
    if(target) {
        target.classList.add('active');
        target.style.display = 'block'; // 強制顯示
    }
    // 切換畫面時回到容器頂部
    document.getElementById('screens').scrollTop = 0;
};

// 角色設定畫面渲染 (修正重疊問題)
window.showSettings = function() {
    const setScr = document.getElementById('scr-settings');
    setScr.innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 返回</button></div>
        <h3 style="color:var(--neon); font-size:12px; margin-bottom:15px;">🛰️ 角色設置</h3>
        <div style="display:flex; gap:10px; margin-bottom:20px;">
            <button class="btn-opt ${state.gen==='M'?'active':''}" onclick="setGender('M')" style="flex:1;">男生</button>
            <button class="btn-opt ${state.gen==='F'?'active':''}" onclick="setGender('F')" style="flex:1;">女生</button>
        </div>
        <p style="font-size:8px; margin-bottom:10px;">更改名稱：</p>
        <input type="text" id="name-in" style="width:100%; background:#000; border:2px solid #fff; color:#fff; padding:12px; font-family:'Press Start 2P'; font-size:10px; box-sizing:border-box;" value="${state.name}">
        <button class="btn-opt" style="margin-top:20px; border-color:var(--neon);" onclick="saveSettings()">確認同步</button>
    `;
    showScreen('scr-settings');
};

// 戰鬥渲染優化
window.nextQ = function() {
    if (wordPool.length === 0) wordPool = [...WORDS].sort(() => Math.random() - 0.5);
    curQ = wordPool.pop();
    const isS = state.mode === 'spelling';
    const gScr = document.getElementById('scr-game');

    const monsterSprite = `<svg viewBox="0 0 16 16"><path d="M4 14h8v1H4z" fill="#440044"/><path d="M2 7h12v5H2z" fill="#880088"/><path d="M4 8h3v3H4z M9 8h3v3H9z" fill="#fff"/><path d="M5 9h1v1H5z M10 9h1v1H10z" fill="#000"/></svg>`;

    gScr.innerHTML = `
        <div style="text-align:left;"><button class="back-btn" onclick="toHome()">🏠 退出</button></div>
        <div class="arena">
            <div id="monster-sprite" style="animation: float 3s infinite ease-in-out;">${monsterSprite}</div>
            <h2 id="display-q" style="font-size:14px; margin-top:15px; color:var(--neon);">${isS ? '❓❓❓' : curQ.w}</h2>
        </div>
        <div id="mcq-box"></div>
        <div id="spell-box" style="display:${isS ? 'block' : 'none'};">
            <p style="color:var(--accent); font-size:10px; margin-bottom:10px;">${curQ.m}</p>
            <input type="text" id="spell-in" autocomplete="off" style="width:100%; background:#000; border:2px solid var(--neon); color:var(--neon); padding:12px; font-family:'Press Start 2P'; font-size:12px; text-align:center; box-sizing:border-box;">
        </div>
    `;

    if(!isS) {
        let opts = [curQ.m];
        while(opts.length<4){ let r=WORDS[Math.floor(Math.random()*WORDS.length)].m; if(!opts.includes(r))opts.push(r); }
        opts.sort(()=>Math.random()-0.5).forEach(o => {
            const b = document.createElement('button'); b.className = 'btn-opt'; b.innerText = o; b.onclick = () => check(o);
            document.getElementById('mcq-box').appendChild(b);
        });
    } else {
        const inp = document.getElementById('spell-in');
        inp.onkeydown = (e) => { if(e.key==='Enter') check(); };
        speak(curQ.w); setTimeout(()=>inp.focus(), 400);
    }
    updateUI();
};
