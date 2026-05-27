// ========== КОНФИГУРАЦИЯ ==========
const TELEGRAM_BOT_NAME = 'kerpcoin_bot';

// Supabase (твои данные)
const SUPABASE_URL = 'https://dgkbwsryeuayjmwhgskz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GO6ZcJPyOHeKPD4UkWs-RQ_MeYF0OGA';

let supabase = null;
let useSupabase = false;

async function initSupabase() {
    try {
        const supabaseModule = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.js');
        const { createClient } = supabaseModule;
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        useSupabase = true;
        console.log('✅ Supabase connected');
        await loadGlobalLeaderboard();
    } catch(e) {
        console.error('Supabase error:', e);
        useSupabase = false;
    }
}

// ========== ДАННЫЕ ==========
let data = JSON.parse(localStorage.getItem("kerp")) || {};

if (!data.version || data.version !== 16) {
    if (!data.userId) {
        localStorage.clear();
        data = {};
    }
}
data.version = 16;

data.energy = Number(data.energy) || 0;
data.totalTaps = Number(data.totalTaps) || 0;
data.power = Number(data.power) || 1;
data.auto = Number(data.auto) || 0;
data.crit = Number(data.crit) || 0;
data.maxTapEnergy = Number(data.maxTapEnergy) || 50;
data.tapEnergy = Math.min(Number(data.tapEnergy) || data.maxTapEnergy, data.maxTapEnergy);
data.regen = 1;
data.prestigeMultiplier = Number(data.prestigeMultiplier) || 1.0;
data.totalPrestigeTaps = Number(data.totalPrestigeTaps) || 0;
data.soundEnabled = data.soundEnabled !== undefined ? data.soundEnabled : true;

data.userId = data.userId || null;
data.userName = data.userName || null;
data.refCode = data.refCode || generateRefCode();

data.lastDaily = Number(data.lastDaily) || 0;
data.lastUpgrade = Number(data.lastUpgrade) || 0;
data.lastEnergyUpgrade = Number(data.lastEnergyUpgrade) || 0;

data.level = Math.floor(data.totalTaps / 5000) + 1;

function generateRefCode() {
    return 'ref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

// ========== ТОП ИГРОКОВ ==========
let globalLeaderboard = [];

async function loadGlobalLeaderboard() {
    console.log('Loading leaderboard...');
    if (!useSupabase) return;
    try {
        const { data: players, error } = await supabase
            .from('players')
            .select('user_id, user_name, total_taps, level, prestige_multiplier')
            .order('total_taps', { ascending: false })
            .limit(50);
        if (error) throw error;
        globalLeaderboard = players || [];
        console.log('Loaded players:', globalLeaderboard.length);
        displayLeaderboard();
    } catch(e) {
        console.error('Load error:', e);
        document.getElementById("topTapsList").innerHTML = '<div class="leaderboard-item">Ошибка загрузки топа</div>';
    }
}

async function saveToCloud() {
    if (!useSupabase || !data.userId) return;
    try {
        const { error } = await supabase
            .from('players')
            .upsert({
                user_id: data.userId,
                user_name: data.userName,
                total_taps: data.totalTaps,
                level: data.level,
                prestige_multiplier: data.prestigeMultiplier,
                last_update: new Date().toISOString()
            });
        if (error) throw error;
        console.log('Saved to cloud');
        await loadGlobalLeaderboard();
    } catch(e) {
        console.error('Cloud save error:', e);
    }
}

function displayLeaderboard() {
    let container = document.getElementById("topTapsList");
    if (!container) return;
    
    if (!useSupabase) {
        container.innerHTML = '<div class="leaderboard-item">⏳ Подключение к облаку...</div>';
        return;
    }
    
    if (globalLeaderboard.length === 0) {
        container.innerHTML = '<div class="leaderboard-item">😴 Пока никого нет. Войди первым!</div>';
        return;
    }
    
    let html = "";
    globalLeaderboard.forEach((player, idx) => {
        let medal = idx === 0 ? "👑 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : "";
        html += `<div class="leaderboard-item">${medal}#${idx+1} ${player.user_name?.substring(0, 15)} | ${player.total_taps?.toLocaleString()} тапов</div>`;
    });
    container.innerHTML = html;
}

function updatePlayerInfo() {
    let div = document.getElementById("playerInfo");
    if (!div) return;
    if (data.userId) {
        div.innerHTML = `✅ <strong>${data.userName}</strong><br>👆 ${data.totalTaps.toLocaleString()} тапов ✨ x${data.prestigeMultiplier.toFixed(2)}`;
    } else {
        div.innerHTML = `🔐 Не авторизован<br>Нажми кнопку ниже, чтобы войти через Telegram!`;
    }
}

function save() {
    localStorage.setItem("kerp", JSON.stringify(data));
    if (data.userId) saveToCloud();
}

function toast(text) {
    let el = document.getElementById("toast");
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

// ========== ФОРМУЛЫ ==========
function powerCost() { return Math.floor(500 + data.power * 150); }
function autoCost() { return Math.floor(1000 + data.auto * 300); }
function critCost() { return Math.floor(2000 + data.crit * 500); }
function tapUpgradeCost() { return Math.floor(50000 + Math.floor(data.power/10)*25000); }
function autoUpgradeCost() { return Math.floor(80000 + Math.floor(data.auto/5)*40000); }
function critUpgradeCost() { return Math.floor(120000 + Math.floor(data.crit/5)*60000); }
function getMultipliedGain(base) { return Math.floor(base * data.prestigeMultiplier); }

function updateUI() {
    data.level = Math.floor(data.totalTaps / 5000) + 1;
    if (data.tapEnergy > data.maxTapEnergy) data.tapEnergy = data.maxTapEnergy;
    
    document.getElementById("energy").innerText = Math.floor(data.energy);
    document.getElementById("powerText").innerText = data.power;
    document.getElementById("autoText").innerText = data.auto;
    document.getElementById("critText").innerText = data.crit;
    document.getElementById("totalTapText").innerText = data.totalTaps.toLocaleString();
    document.getElementById("levelText").innerText = data.level;
    document.getElementById("prestigeMultiplier").innerText = data.prestigeMultiplier.toFixed(2);
    document.getElementById("powerCost").innerHTML = `💰 ${powerCost()}`;
    document.getElementById("autoCost").innerHTML = `💰 ${autoCost()}`;
    document.getElementById("critCost").innerHTML = `💰 ${critCost()}`;
    document.getElementById("tapUpgradeCost").innerHTML = `💰 ${tapUpgradeCost()}`;
    document.getElementById("autoUpgradeCost").innerHTML = `💰 ${autoUpgradeCost()}`;
    document.getElementById("critUpgradeCost").innerHTML = `💰 ${critUpgradeCost()}`;
    
    document.getElementById("statsText").innerHTML = `
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
    document.getElementById("prestigeProgress").innerHTML = `${data.totalTaps.toLocaleString()} / 1,000,000 (${Math.floor(prog)}%)`;
    document.getElementById("prestigeProgressFill").style.width = prog + "%";
    document.getElementById("prestigeReward").innerHTML = `🎁 Следующий престиж: x${(data.prestigeMultiplier+0.1).toFixed(2)}`;
    document.getElementById("tapBarFill").style.width = (data.tapEnergy/data.maxTapEnergy*100)+"%";
    document.getElementById("tapEnergyText").innerHTML = `${Math.floor(data.tapEnergy)} / ${data.maxTapEnergy}`;
    
    let diff = 86400000 - (Date.now() - data.lastDaily);
    if (diff <= 0) document.getElementById("dailyTimer").innerHTML = "🎁 ГОТОВО";
    else {
        let h = Math.floor(diff/3600000);
        let m = Math.floor((diff%3600000)/60000);
        document.getElementById("dailyTimer").innerHTML = `⏳ ${h}ч ${m}м`;
    }
    
    let soundBtn = document.getElementById("toggleSoundBtn");
    if (soundBtn) soundBtn.innerHTML = data.soundEnabled ? "🔊 ВКЛ" : "🔇 ВЫКЛ";
    
    updatePlayerInfo();
    updateReferralUI();
}

// ========== ТАП ==========
document.getElementById("tapButton").onclick = () => {
    if (data.tapEnergy <= 0) { toast("⚠ НЕТ ЭНЕРГИИ"); return; }
    data.tapEnergy--;
    let gain = data.power;
    let isCrit = false;
    if (Math.random() < data.crit/100) { gain *= 3; isCrit = true; }
    gain = getMultipliedGain(gain);
    data.energy += gain;
    data.totalTaps++;
    if (isCrit) toast("💥 КРИТ!");
    playSound();
    let effect = document.createElement("div");
    effect.className = "tapEffect";
    effect.innerText = `+${gain}⚡`;
    effect.style.left = (Math.random() * 150 + 50) + "px";
    effect.style.top = (Math.random() * 150 + 50) + "px";
    document.getElementById("tapButton").appendChild(effect);
    setTimeout(() => effect.remove(), 600);
    updateUI();
    save();
};

setInterval(() => {
    let autoGain = getMultipliedGain(data.auto);
    data.energy += autoGain;
    data.tapEnergy += data.regen;
    if (data.tapEnergy > data.maxTapEnergy) data.tapEnergy = data.maxTapEnergy;
    updateUI();
    save();
}, 1000);

function canUpgrade() { return (Date.now() - data.lastUpgrade) >= 1800000; }
function setCooldown() { data.lastUpgrade = Date.now(); }

// ========== КНОПКИ ==========
document.getElementById("buyPower").onclick = () => {
    if (!canUpgrade()) { toast("⏳ ПОДОЖДИ 30 МИНУТ"); return; }
    let cost = powerCost();
    if (data.energy >= cost) { data.energy -= cost; data.power++; setCooldown(); toast("🔥 СИЛА +1"); playSound(); }
    else toast("❌ НУЖНО " + cost);
    updateUI(); save();
};
document.getElementById("buyAuto").onclick = () => {
    if (!canUpgrade()) { toast("⏳ ПОДОЖДИ 30 МИНУТ"); return; }
    let cost = autoCost();
    if (data.energy >= cost) { data.energy -= cost; data.auto++; setCooldown(); toast("⚡ АВТО +1"); playSound(); }
    else toast("❌ НУЖНО " + cost);
    updateUI(); save();
};
document.getElementById("buyCrit").onclick = () => {
    if (!canUpgrade()) { toast("⏳ ПОДОЖДИ 30 МИНУТ"); return; }
    let cost = critCost();
    if (data.energy >= cost) { data.energy -= cost; data.crit++; setCooldown(); toast("💥 КРИТ +1%"); playSound(); }
    else toast("❌ НУЖНО " + cost);
    updateUI(); save();
};
document.getElementById("upTap").onclick = () => {
    let cost = tapUpgradeCost();
    if (data.energy >= cost) { data.energy -= cost; data.power += 5; toast("🔥 +5 СИЛЫ"); playSound(); }
    else toast("❌ НУЖНО " + cost);
    updateUI(); save();
};
document.getElementById("upAuto").onclick = () => {
    let cost = autoUpgradeCost();
    if (data.energy >= cost) { data.energy -= cost; data.auto += 5; toast("⚡ +5 АВТО"); playSound(); }
    else toast("❌ НУЖНО " + cost);
    updateUI(); save();
};
document.getElementById("upCrit").onclick = () => {
    let cost = critUpgradeCost();
    if (data.energy >= cost) { data.energy -= cost; data.crit += 5; toast("💥 +5% КРИТА"); playSound(); }
    else toast("❌ НУЖНО " + cost);
    updateUI(); save();
};
document.getElementById("upCore").onclick = () => {
    let now = Date.now();
    if (now - data.lastEnergyUpgrade < 3600000) { toast("⏳ ТОЛЬКО РАЗ В ЧАС"); return; }
    let cost = 1000000;
    if (data.energy >= cost) { data.energy -= cost; data.maxTapEnergy += 10; data.tapEnergy += 10; data.lastEnergyUpgrade = now; toast("🔋 +10 МАКС. ЭНЕРГИИ"); playSound(); }
    else toast("❌ НУЖНО 1,000,000");
    updateUI(); save();
};
document.getElementById("prestigeBtn").onclick = () => {
    if (data.totalTaps < 1000000) { toast("❌ НУЖНО 1,000,000 ТАПОВ"); return; }
    if (!confirm(`🌟 ПРЕСТИЖ!\nТекущий бонус: x${data.prestigeMultiplier.toFixed(2)}\nНовый: x${(data.prestigeMultiplier+0.1).toFixed(2)}`)) return;
    data.prestigeMultiplier += 0.1;
    data.totalPrestigeTaps += data.totalTaps;
    data.energy = 0; data.totalTaps = 0; data.power = 1; data.auto = 0; data.crit = 0;
    data.maxTapEnergy = 50; data.tapEnergy = 50;
    data.lastDaily = 0; data.lastUpgrade = 0; data.lastEnergyUpgrade = 0;
    toast(`✨ ПРЕСТИЖ! x${data.prestigeMultiplier.toFixed(2)}`);
    playSound();
    updateUI(); save();
};
document.getElementById("dailyBtn").onclick = () => {
    let now = Date.now();
    if (now - data.lastDaily > 86400000) {
        let rewardEnergy = getMultipliedGain(50000 + data.level * 5000);
        data.energy += rewardEnergy;
        data.lastDaily = now;
        toast(`🎁 +${rewardEnergy} ⚡`);
        playSound();
    } else toast("⏳ ЕЩЁ НЕ ГОТОВО");
    updateUI(); save();
};

// ========== НАСТРОЙКИ ==========
document.getElementById("toggleSoundBtn").onclick = () => {
    data.soundEnabled = !data.soundEnabled;
    toast(data.soundEnabled ? "🔊 ЗВУК ВКЛ" : "🔇 ЗВУК ВЫКЛ");
    updateUI(); save();
};
document.getElementById("exportBtn").onclick = () => {
    let str = JSON.stringify(data);
    let blob = new Blob([str], {type:"application/json"});
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `kerp_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("💾 СОХРАНЕНИЕ ЭКСПОРТИРОВАНО");
};
document.getElementById("importBtn").onclick = () => document.getElementById("importFile").click();
document.getElementById("importFile").onchange = (e) => {
    let file = e.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = (ev) => {
        try {
            let imported = JSON.parse(ev.target.result);
            if (imported.version) {
                data = imported;
                toast("📥 СОХРАНЕНИЕ ЗАГРУЖЕНО");
                setTimeout(() => location.reload(), 1000);
            } else toast("❌ НЕВЕРНЫЙ ФАЙЛ");
        } catch(err) { toast("❌ ФАЙЛ ПОВРЕЖДЁН"); }
    };
    reader.readAsText(file);
};
document.getElementById("softResetBtn").onclick = () => {
    if (confirm("⚠ МЯГКИЙ СБРОС?")) {
        data.energy = 0; data.totalTaps = 0; data.power = 1; data.auto = 0; data.crit = 0;
        data.maxTapEnergy = 50; data.tapEnergy = 50; data.lastDaily = 0; data.lastUpgrade = 0; data.lastEnergyUpgrade = 0;
        toast("⚠ МЯГКИЙ СБРОС");
        playSound();
        updateUI(); save();
    }
};
document.getElementById("hardResetBtn").onclick = () => {
    if (confirm("💀 ЖЁСТКИЙ СБРОС - удалить ВСЁ?")) {
        if (confirm("ВЫ УВЕРЕНЫ?")) {
            localStorage.clear();
            location.reload();
        }
    }
};
document.getElementById("tonWalletBtn").onclick = () => toast("🚀 TON кошелёк скоро!");

// ========== РЕФЕРАЛЫ ==========
function updateReferralUI() {
    let refLinkInput = document.getElementById("refLink");
    if (refLinkInput) {
        let url = `${window.location.origin}${window.location.pathname}?ref=${data.refCode}`;
        refLinkInput.value = url;
    }
    document.getElementById("refCount").innerText = data.referrals?.length || 0;
}
document.getElementById("copyRefBtn")?.addEventListener("click", () => {
    let inp = document.getElementById("refLink");
    inp.select();
    document.execCommand("copy");
    toast("📋 Реферальная ссылка скопирована!");
});

// ========== TELEGRAM LOGIN (НАСТОЯЩИЙ ВИДЖЕТ) ==========
function initTelegramLogin() {
    const container = document.getElementById("telegram-login-container");
    if (!container) return;
    container.innerHTML = '';
    
    // Настоящий Telegram виджет
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_NAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-userpic', 'true');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    container.appendChild(script);
    
    console.log('Telegram widget initialized');
}

window.onTelegramAuth = async function(user) {
    console.log('Telegram auth:', user);
    if (user && user.id) {
        const newUserId = `telegram_${user.id}`;
        const newUserName = `${user.first_name} ${user.last_name || ''}`.trim();
        
        // Проверяем, есть ли уже в облаке
        let existingPlayer = null;
        if (useSupabase) {
            const { data } = await supabase
                .from('players')
                .select('*')
                .eq('user_id', newUserId)
                .single();
            existingPlayer = data;
        }
        
        data.userId = newUserId;
        data.userName = newUserName;
        
        if (existingPlayer) {
            // Загружаем сохранённый прогресс
            data.totalTaps = existingPlayer.total_taps;
            data.level = existingPlayer.level;
            data.prestigeMultiplier = existingPlayer.prestige_multiplier;
            toast(`✅ С возвращением, ${data.userName}! Прогресс загружен из облака.`);
        } else {
            toast(`✅ Добро пожаловать, ${data.userName}!`);
        }
        
        save();
        updateUI();
        if (useSupabase) await saveToCloud();
    } else {
        toast("❌ Ошибка входа через Telegram");
    }
};

function openTab(id) {
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

// ========== ЗАПУСК ==========
window.onload = async () => {
    await initSupabase();
    updateUI();
    initTelegramLogin();
};
