// ========== ДАННЫЕ ==========
let currentUser = null;
let data = null;

function loadUserData(userId) {
    const saved = localStorage.getItem(`karp_${userId}`);
    if (saved) {
        return JSON.parse(saved);
    } else {
        return {
            energy: 0,
            totalTaps: 0,
            power: 1,
            auto: 0,
            crit: 0,
            maxTapEnergy: 50,
            tapEnergy: 50,
            regen: 1,
            prestigeMultiplier: 1.0,
            totalPrestigeTaps: 0,
            soundEnabled: true,
            lastDaily: 0,
            lastPowerBuy: 0,
            lastAutoBuy: 0,
            lastCritBuy: 0,
            lastTapUpgrade: 0,
            lastAutoUpgrade: 0,
            lastCritUpgrade: 0,
            lastEnergyUpgrade: 0
        };
    }
}

function saveUserData() {
    if (!currentUser) return;
    localStorage.setItem(`karp_${currentUser.id}`, JSON.stringify(data));
}

// ========== ТАЙМЕРЫ ==========
function getRemaining(lastTime, cooldownMinutes = 30) {
    const remaining = (lastTime + cooldownMinutes * 60000) - Date.now();
    return remaining > 0 ? remaining : 0;
}

function formatTime(ms) {
    if (ms <= 0) return null;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

let timerInterval = null;

function startTimers() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        updateAllTimers();
    }, 1000);
}

function updateAllTimers() {
    if (!data) return;
    
    updateTimerUI('buyPower', getRemaining(data.lastPowerBuy), 'powerTimer', 'КУПИТЬ');
    updateTimerUI('buyAuto', getRemaining(data.lastAutoBuy), 'autoTimer', 'КУПИТЬ');
    updateTimerUI('buyCrit', getRemaining(data.lastCritBuy), 'critTimer', 'КУПИТЬ');
    updateTimerUI('upTap', getRemaining(data.lastTapUpgrade), 'tapUpgradeTimer', 'УЛУЧШИТЬ');
    updateTimerUI('upAuto', getRemaining(data.lastAutoUpgrade), 'autoUpgradeTimer', 'УЛУЧШИТЬ');
    updateTimerUI('upCrit', getRemaining(data.lastCritUpgrade), 'critUpgradeTimer', 'УЛУЧШИТЬ');
    updateTimerUI('upCore', getRemaining(data.lastEnergyUpgrade, 60), 'coreTimer', 'УЛУЧШИТЬ');
}

function updateTimerUI(buttonId, remaining, timerSpanId, originalText) {
    const btn = document.getElementById(buttonId);
    const timerSpan = document.getElementById(timerSpanId);
    if (!btn) return;
    
    if (remaining > 0) {
        btn.disabled = true;
        const timeStr = formatTime(remaining);
        btn.innerHTML = `⏳ ${timeStr}`;
        if (timerSpan) timerSpan.innerHTML = `⏳ Доступно через ${timeStr}`;
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (timerSpan) timerSpan.innerHTML = '';
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function toast(text) {
    let el = document.getElementById('toast');
    el.innerText = text;
    el.style.opacity = 1;
    setTimeout(() => el.style.opacity = 0, 1700);
}

function playSound() {
    if (!data.soundEnabled) return;
    try {
        let ctx = new (window.AudioContext || window.webkitAudioContext)();
        let osc = ctx.createOscillator();
        let gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.1;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
        osc.stop(ctx.currentTime + 0.3);
        setTimeout(() => ctx.close(), 400);
    } catch(e) {}
}

function getMultipliedGain(base) {
    return Math.floor(base * data.prestigeMultiplier);
}

function powerCost() { return Math.floor(500 + data.power * 150); }
function autoCost() { return Math.floor(1000 + data.auto * 300); }
function critCost() { return Math.floor(2000 + data.crit * 500); }
function tapUpgradeCost() { return Math.floor(50000 + Math.floor(data.power/10)*25000); }
function autoUpgradeCost() { return Math.floor(80000 + Math.floor(data.auto/5)*40000); }
function critUpgradeCost() { return Math.floor(120000 + Math.floor(data.crit/5)*60000); }

function updateUI() {
    if (!data) return;
    
    data.level = Math.floor(data.totalTaps / 5000) + 1;
    if (data.tapEnergy > data.maxTapEnergy) data.tapEnergy = data.maxTapEnergy;
    
    document.getElementById('energy').innerText = Math.floor(data.energy);
    document.getElementById('powerText').innerText = data.power;
    document.getElementById('autoText').innerText = data.auto;
    document.getElementById('critText').innerText = data.crit;
    document.getElementById('totalTapText').innerText = data.totalTaps.toLocaleString();
    document.getElementById('levelText').innerText = data.level;
    document.getElementById('prestigeMultiplier').innerText = data.prestigeMultiplier.toFixed(2);
    document.getElementById('powerCost').innerHTML = `💰 ${powerCost()}`;
    document.getElementById('autoCost').innerHTML = `💰 ${autoCost()}`;
    document.getElementById('critCost').innerHTML = `💰 ${critCost()}`;
    document.getElementById('tapUpgradeCost').innerHTML = `💰 ${tapUpgradeCost()}`;
    document.getElementById('autoUpgradeCost').innerHTML = `💰 ${autoUpgradeCost()}`;
    document.getElementById('critUpgradeCost').innerHTML = `💰 ${critUpgradeCost()}`;
    
    document.getElementById('statsText').innerHTML = `
        🏆 Уровень: ${data.level}<br>
        ⚡ Энергия: ${Math.floor(data.energy)}<br>
        🔥 Сила: ${data.power}<br>
        ⚡ Авто: ${data.auto}/сек<br>
        💥 Крит: ${data.crit}%<br>
        👆 Тапов: ${data.totalTaps.toLocaleString()}<br>
        🔋 Макс. энергия: ${data.maxTapEnergy}<br>
        ✨ Престиж: x${data.prestigeMultiplier.toFixed(2)}
    `;
    
    let need = 1000000;
    let prog = Math.min(100, (data.totalTaps / need) * 100);
    document.getElementById('prestigeProgress').innerHTML = `${data.totalTaps.toLocaleString()} / 1,000,000 (${Math.floor(prog)}%)`;
    document.getElementById('prestigeProgressFill').style.width = prog + '%';
    document.getElementById('prestigeReward').innerHTML = `🎁 Следующий престиж: x${(data.prestigeMultiplier+0.1).toFixed(2)}`;
    document.getElementById('tapBarFill').style.width = (data.tapEnergy/data.maxTapEnergy*100)+'%';
    document.getElementById('tapEnergyText').innerHTML = `${Math.floor(data.tapEnergy)} / ${data.maxTapEnergy}`;
    
    let diff = 86400000 - (Date.now() - data.lastDaily);
    if (diff <= 0) document.getElementById('dailyTimer').innerHTML = '🎁 ГОТОВО';
    else {
        let h = Math.floor(diff/3600000);
        let m = Math.floor((diff%3600000)/60000);
        document.getElementById('dailyTimer').innerHTML = `⏳ ${h}ч ${m}м`;
    }
    
    let soundBtn = document.getElementById('toggleSoundBtn');
    if (soundBtn) soundBtn.innerHTML = data.soundEnabled ? '🔊 ВКЛ' : '🔇 ВЫКЛ';
    
    saveUserData();
}

// ========== ТАП ==========
document.getElementById('tapButton').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру (вкладка Настройки)'); return; }
    if (data.tapEnergy <= 0) { toast('⚠️ НЕТ ЭНЕРГИИ'); return; }
    data.tapEnergy--;
    let gain = data.power;
    let isCrit = false;
    if (Math.random() < data.crit/100) { gain *= 3; isCrit = true; }
    gain = getMultipliedGain(gain);
    data.energy += gain;
    data.totalTaps++;
    if (isCrit) toast('💥 КРИТ!');
    playSound();
    
    let effect = document.createElement('div');
    effect.className = 'tapEffect';
    effect.innerText = `+${gain}⚡`;
    effect.style.left = (Math.random() * 150 + 50) + 'px';
    effect.style.top = (Math.random() * 150 + 50) + 'px';
    document.getElementById('tapButton').appendChild(effect);
    setTimeout(() => effect.remove(), 600);
    updateUI();
};

// ========== АВТО ==========
setInterval(() => {
    if (!data) return;
    let autoGain = getMultipliedGain(data.auto);
    data.energy += autoGain;
    data.tapEnergy += data.regen;
    if (data.tapEnergy > data.maxTapEnergy) data.tapEnergy = data.maxTapEnergy;
    updateUI();
}, 1000);

// ========== МАГАЗИН ==========
document.getElementById('buyPower').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    let remaining = getRemaining(data.lastPowerBuy);
    if (remaining > 0) { toast(`⏳ Подожди ${formatTime(remaining)}`); return; }
    let cost = powerCost();
    if (data.energy >= cost) {
        data.energy -= cost;
        data.power++;
        data.lastPowerBuy = Date.now();
        toast('🔥 СИЛА +1');
        playSound();
        updateUI();
        updateAllTimers();
    } else toast('❌ НУЖНО ' + cost);
};

document.getElementById('buyAuto').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    let remaining = getRemaining(data.lastAutoBuy);
    if (remaining > 0) { toast(`⏳ Подожди ${formatTime(remaining)}`); return; }
    let cost = autoCost();
    if (data.energy >= cost) {
        data.energy -= cost;
        data.auto++;
        data.lastAutoBuy = Date.now();
        toast('⚡ АВТО +1');
        playSound();
        updateUI();
        updateAllTimers();
    } else toast('❌ НУЖНО ' + cost);
};

document.getElementById('buyCrit').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    let remaining = getRemaining(data.lastCritBuy);
    if (remaining > 0) { toast(`⏳ Подожди ${formatTime(remaining)}`); return; }
    let cost = critCost();
    if (data.energy >= cost) {
        data.energy -= cost;
        data.crit++;
        data.lastCritBuy = Date.now();
        toast('💥 КРИТ +1%');
        playSound();
        updateUI();
        updateAllTimers();
    } else toast('❌ НУЖНО ' + cost);
};

// ========== УЛУЧШЕНИЯ ==========
document.getElementById('upTap').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    let remaining = getRemaining(data.lastTapUpgrade);
    if (remaining > 0) { toast(`⏳ Подожди ${formatTime(remaining)}`); return; }
    let cost = tapUpgradeCost();
    if (data.energy >= cost) {
        data.energy -= cost;
        data.power += 5;
        data.lastTapUpgrade = Date.now();
        toast('🔥 +5 СИЛЫ');
        playSound();
        updateUI();
        updateAllTimers();
    } else toast('❌ НУЖНО ' + cost);
};

document.getElementById('upAuto').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    let remaining = getRemaining(data.lastAutoUpgrade);
    if (remaining > 0) { toast(`⏳ Подожди ${formatTime(remaining)}`); return; }
    let cost = autoUpgradeCost();
    if (data.energy >= cost) {
        data.energy -= cost;
        data.auto += 5;
        data.lastAutoUpgrade = Date.now();
        toast('⚡ +5 АВТО');
        playSound();
        updateUI();
        updateAllTimers();
    } else toast('❌ НУЖНО ' + cost);
};

document.getElementById('upCrit').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    let remaining = getRemaining(data.lastCritUpgrade);
    if (remaining > 0) { toast(`⏳ Подожди ${formatTime(remaining)}`); return; }
    let cost = critUpgradeCost();
    if (data.energy >= cost) {
        data.energy -= cost;
        data.crit += 5;
        data.lastCritUpgrade = Date.now();
        toast('💥 +5% КРИТА');
        playSound();
        updateUI();
        updateAllTimers();
    } else toast('❌ НУЖНО ' + cost);
};

document.getElementById('upCore').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    let remaining = getRemaining(data.lastEnergyUpgrade, 60);
    if (remaining > 0) { toast(`⏳ Подожди ${formatTime(remaining)}`); return; }
    if (data.energy >= 1000000) {
        data.energy -= 1000000;
        data.maxTapEnergy += 10;
        data.tapEnergy += 10;
        data.lastEnergyUpgrade = Date.now();
        toast('🔋 +10 МАКС. ЭНЕРГИИ');
        playSound();
        updateUI();
        updateAllTimers();
    } else toast('❌ НУЖНО 1,000,000');
};

// ========== ПРЕСТИЖ ==========
document.getElementById('prestigeBtn').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    if (data.totalTaps < 1000000) { toast('❌ НУЖНО 1,000,000 ТАПОВ'); return; }
    if (!confirm(`🌟 ПРЕСТИЖ!\nТекущий бонус: x${data.prestigeMultiplier.toFixed(2)}\nНовый: x${(data.prestigeMultiplier+0.1).toFixed(2)}`)) return;
    data.prestigeMultiplier += 0.1;
    data.totalPrestigeTaps += data.totalTaps;
    data.energy = 0; data.totalTaps = 0; data.power = 1; data.auto = 0; data.crit = 0;
    data.maxTapEnergy = 50; data.tapEnergy = 50;
    data.lastDaily = 0; data.lastPowerBuy = 0; data.lastAutoBuy = 0; data.lastCritBuy = 0;
    data.lastTapUpgrade = 0; data.lastAutoUpgrade = 0; data.lastCritUpgrade = 0; data.lastEnergyUpgrade = 0;
    toast(`✨ ПРЕСТИЖ! x${data.prestigeMultiplier.toFixed(2)}`);
    playSound();
    updateUI();
    updateAllTimers();
};

// ========== ЕЖЕДНЕВКА ==========
document.getElementById('dailyBtn').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    let now = Date.now();
    if (now - data.lastDaily > 86400000) {
        let rewardEnergy = 50000 + data.level * 5000;
        rewardEnergy = Math.floor(rewardEnergy * data.prestigeMultiplier);
        data.energy += rewardEnergy;
        data.lastDaily = now;
        toast(`🎁 +${rewardEnergy} ⚡`);
        playSound();
        updateUI();
    } else {
        let remaining = 86400000 - (now - data.lastDaily);
        let hours = Math.floor(remaining / 3600000);
        let minutes = Math.floor((remaining % 3600000) / 60000);
        toast(`⏳ Через ${hours}ч ${minutes}м`);
    }
};

// ========== НАСТРОЙКИ ==========
document.getElementById('toggleSoundBtn').onclick = () => {
    if (!data) return;
    data.soundEnabled = !data.soundEnabled;
    toast(data.soundEnabled ? '🔊 ЗВУК ВКЛ' : '🔇 ЗВУК ВЫКЛ');
    updateUI();
};

document.getElementById('exportBtn').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    let blob = new Blob([JSON.stringify(data)], {type:'application/json'});
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `karp_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('💾 СОХРАНЕНИЕ ЭКСПОРТИРОВАНО');
};

document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
document.getElementById('importFile').onchange = (e) => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    let file = e.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = (ev) => {
        try {
            let imported = JSON.parse(ev.target.result);
            if (imported.power !== undefined) {
                data = imported;
                toast('📥 СОХРАНЕНИЕ ЗАГРУЖЕНО');
                updateUI();
                updateAllTimers();
            } else toast('❌ НЕВЕРНЫЙ ФАЙЛ');
        } catch(err) { toast('❌ ФАЙЛ ПОВРЕЖДЁН'); }
    };
    reader.readAsText(file);
};

document.getElementById('softResetBtn').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    if (confirm('⚠ МЯГКИЙ СБРОС? Сбросить прогресс, но оставить престиж?')) {
        data.energy = 0; data.totalTaps = 0; data.power = 1; data.auto = 0; data.crit = 0;
        data.maxTapEnergy = 50; data.tapEnergy = 50;
        data.lastDaily = 0; data.lastPowerBuy = 0; data.lastAutoBuy = 0; data.lastCritBuy = 0;
        data.lastTapUpgrade = 0; data.lastAutoUpgrade = 0; data.lastCritUpgrade = 0; data.lastEnergyUpgrade = 0;
        toast('⚠ МЯГКИЙ СБРОС');
        playSound();
        updateUI();
        updateAllTimers();
    }
};

document.getElementById('hardResetBtn').onclick = () => {
    if (!currentUser) { toast('⚠️ Войдите в игру'); return; }
    if (confirm('💀 ЖЁСТКИЙ СБРОС - удалить ВСЁ?')) {
        if (confirm('ВЫ УВЕРЕНЫ?')) {
            localStorage.removeItem(`karp_${currentUser.id}`);
            location.reload();
        }
    }
};

document.getElementById('tonSoonBtn').onclick = () => toast('⏳ TON кошелёк скоро');

// ========== ВХОД ==========
function login() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim();
    if (!name) {
        toast('❌ Введите никнейм');
        return;
    }
    
    // Создаём пользователя
    currentUser = {
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: name
    };
    
    data = loadUserData(currentUser.id);
    data.userName = name;
    saveUserData();
    
    updateUI();
    startTimers();
    
    document.getElementById('userInfo').innerHTML = `✅ <strong>${name}</strong><br><button id="logoutBtnMain" style="background:#ff4444;">Выйти</button>`;
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('logoutBtnMain').onclick = () => {
        if (confirm('Выйти из аккаунта?')) {
            localStorage.removeItem(`karp_${currentUser.id}`);
            location.reload();
        }
    };
    
    document.getElementById('loginBtn').style.display = 'none';
    nameInput.style.display = 'none';
    
    toast(`✅ Добро пожаловать, ${name}!`);
}

document.getElementById('loginBtn').onclick = login;
document.getElementById('logoutBtn').onclick = () => {
    if (confirm('Выйти из аккаунта?')) {
        if (currentUser) localStorage.removeItem(`karp_${currentUser.id}`);
        location.reload();
    }
};

function openTab(id) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ========== ЗАПУСК ==========
window.onload = () => {
    // Проверяем, есть ли уже сохранённый пользователь
    let foundUser = null;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('karp_user_')) {
            foundUser = key.replace('karp_', '');
            break;
        }
    }
    
    if (foundUser) {
        currentUser = { id: foundUser };
        data = loadUserData(foundUser);
        updateUI();
        startTimers();
        
        const name = data.userName || 'Игрок';
        document.getElementById('userInfo').innerHTML = `✅ <strong>${name}</strong><br><button id="logoutBtnAuto" style="background:#ff4444;">Выйти</button>`;
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('logoutBtnAuto').onclick = () => {
            localStorage.removeItem(`karp_${foundUser}`);
            location.reload();
        };
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('playerName').style.display = 'none';
    }
};