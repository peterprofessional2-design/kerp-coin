// ========== GOOGLE CLIENT ID (ЗАМЕНИТЕ НА СВОЙ) ==========
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
// ========================================================

let data = JSON.parse(localStorage.getItem("kerp")) || {};
if (!data.version || data.version !== 9) {
    localStorage.clear();
    data = {};
}
data.version = 9;

// Основные ресурсы
data.energy = Number(data.energy) || 0;
data.totalTaps = Number(data.totalTaps) || 0;
data.kerpBalance = Number(data.kerpBalance) || 0;
data.power = Number(data.power) || 1;
data.auto = Number(data.auto) || 0;
data.crit = Number(data.crit) || 0;
data.maxTapEnergy = Number(data.maxTapEnergy) || 50;
data.tapEnergy = Math.min(Number(data.tapEnergy) || data.maxTapEnergy, data.maxTapEnergy);
data.regen = 1;
data.prestigeMultiplier = Number(data.prestigeMultiplier) || 1.0;
data.totalPrestigeTaps = Number(data.totalPrestigeTaps) || 0;
data.soundEnabled = data.soundEnabled !== undefined ? data.soundEnabled : true;
data.autosaveEnabled = data.autosaveEnabled !== undefined ? data.autosaveEnabled : true;

// Google авторизация
data.userId = data.userId || null;
data.userName = data.userName || null;
data.userEmail = data.userEmail || null;
data.userPicture = data.userPicture || null;

// Рефералы
data.refCode = data.refCode || generateRefCode();
data.referredBy = data.referredBy || null;
data.referrals = data.referrals || [];
data.refEarned = data.refEarned || 0;

// TON кошелёк
data.walletAddress = data.walletAddress || null;

// Таймеры
data.lastDaily = Number(data.lastDaily) || 0;
data.lastUpgrade = Number(data.lastUpgrade) || 0;
data.lastEnergyUpgrade = Number(data.lastEnergyUpgrade) || 0;

data.level = Math.floor(data.totalTaps / 5000) + 1;

function generateRefCode() {
    return 'ref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

// Глобальный лидерборд
let globalLeaderboard = JSON.parse(localStorage.getItem("kerp_leaderboard")) || [];

function updateLeaderboard() {
    if (!data.userId) return;
    let existing = globalLeaderboard.find(p => p.id === data.userId);
    if (existing) {
        existing.taps = data.totalTaps;
        existing.level = data.level;
        existing.prestige = data.prestigeMultiplier;
        existing.name = data.userName;
        existing.kerpBalance = data.kerpBalance;
        existing.refCode = data.refCode;
        existing.refEarned = data.refEarned;
        existing.referrals = data.referrals;
        existing.lastUpdate = Date.now();
    } else {
        globalLeaderboard.push({
            id: data.userId,
            name: data.userName,
            taps: data.totalTaps,
            level: data.level,
            prestige: data.prestigeMultiplier,
            kerpBalance: data.kerpBalance,
            refCode: data.refCode,
            refEarned: data.refEarned,
            referrals: data.referrals,
            lastUpdate: Date.now()
        });
    }
    globalLeaderboard.sort((a,b) => b.taps - a.taps);
    if (globalLeaderboard.length > 50) globalLeaderboard = globalLeaderboard.slice(0,50);
    localStorage.setItem("kerp_leaderboard", JSON.stringify(globalLeaderboard));
}

function displayLeaderboard() {
    let container = document.getElementById("topTapsList");
    if (!container) return;
    if (globalLeaderboard.length === 0) {
        container.innerHTML = "Нет игроков. Авторизуйтесь через Google!";
        return;
    }
    let html = "";
    globalLeaderboard.forEach((player, idx) => {
        let cls = "", medal = "";
        if (idx === 0) { cls = "top1"; medal = "👑 "; }
        else if (idx === 1) { cls = "top2"; medal = "🥈 "; }
        else if (idx === 2) { cls = "top3"; medal = "🥉 "; }
        html += `<div class="${cls}">${medal}#${idx+1} ${player.name.substring(0,20)} | 👆 ${player.taps.toLocaleString()} taps | 🪙 ${Math.floor(player.kerpBalance)} KERP</div>`;
    });
    container.innerHTML = html;
}

function updatePlayerInfo() {
    let div = document.getElementById("playerInfo");
    if (!div) return;
    if (data.userId) {
        let rank = getPlayerRank();
        div.innerHTML = `✅ Авторизован: <strong>${data.userName}</strong><br>🏆 Рейтинг: #${rank}<br>👆 Тапов: ${data.totalTaps.toLocaleString()}<br>🪙 KERP: ${Math.floor(data.kerpBalance)}`;
    } else {
        div.innerHTML = `🔐 Не авторизован<br><span style="font-size:12px">Войдите через Google в настройках</span>`;
    }
}

function getPlayerRank() {
    let idx = globalLeaderboard.findIndex(p => p.id === data.userId);
    return idx === -1 ? "?" : (idx+1);
}

// Реферальная логика
function handleReferralOnLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref && !data.referredBy && !data.userId) {
        localStorage.setItem('pendingRef', ref);
        toast('🎁 Вас пригласили! Войдите через Google, чтобы получить 1000 KERP бонус!');
    }
}

function applyReferralBonus() {
    const pendingRef = localStorage.getItem('pendingRef');
    if (pendingRef && !data.referredBy) {
        let inviter = globalLeaderboard.find(p => p.refCode === pendingRef);
        if (inviter) {
            data.referredBy = pendingRef;
            data.kerpBalance += 1000;
            toast('🎉 +1000 KERP за принятие приглашения!');
            let inviterData = globalLeaderboard.find(p => p.id === inviter.id);
            if (inviterData) {
                inviterData.refEarned = (inviterData.refEarned || 0) + 500;
                inviterData.kerpBalance = (inviterData.kerpBalance || 0) + 500;
                updateLeaderboard();
            }
        }
        localStorage.removeItem('pendingRef');
        save();
        update();
    }
}

// Добавление KERP (фиксированная сумма за тап 0.00001, умножается на престиж)
function addKerp(baseAmount) {
    let gain = baseAmount * data.prestigeMultiplier;
    data.kerpBalance += gain;
    if (data.referredBy) {
        let inviter = globalLeaderboard.find(p => p.refCode === data.referredBy);
        if (inviter) {
            let refBonus = gain * 0.1;
            inviter.refEarned = (inviter.refEarned || 0) + refBonus;
            inviter.kerpBalance = (inviter.kerpBalance || 0) + refBonus;
            updateLeaderboard();
        }
    }
    updateKerpDisplay();
}

function updateKerpDisplay() {
    document.getElementById("kerpBalance").innerText = data.kerpBalance.toFixed(5);
}

// Сохранение
function save() {
    localStorage.setItem("kerp", JSON.stringify(data));
    if (data.userId) {
        updateLeaderboard();
        displayLeaderboard();
    }
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

// Стоимости
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
    document.getElementById("powerCost").innerHTML = `💰 Cost: ${powerCost()}`;
    document.getElementById("autoCost").innerHTML = `💰 Cost: ${autoCost()}`;
    document.getElementById("critCost").innerHTML = `💰 Cost: ${critCost()}`;
    document.getElementById("tapUpgradeCost").innerHTML = `💰 Cost: ${tapUpgradeCost()}`;
    document.getElementById("autoUpgradeCost").innerHTML = `💰 Cost: ${autoUpgradeCost()}`;
    document.getElementById("critUpgradeCost").innerHTML = `💰 Cost: ${critUpgradeCost()}`;
    document.getElementById("statsText").innerHTML = `
        🏆 Уровень: ${data.level}<br>
        ⚡ Энергия: ${Math.floor(data.energy)}<br>
        🔥 Сила: ${data.power}<br>
        ⚡ Авто: ${data.auto}/сек<br>
        💥 Крит: ${data.crit}%<br>
        👆 Всего тапов: ${data.totalTaps.toLocaleString()}<br>
        🔋 Макс. энергия: ${data.maxTapEnergy}<br>
        🔋 Текущая: ${Math.floor(data.tapEnergy)} / ${data.maxTapEnergy}<br>
        ✨ Бонус престижа: x${data.prestigeMultiplier.toFixed(2)}<br>
        🌟 Всего за престиж: ${data.totalPrestigeTaps.toLocaleString()}<br>
        🪙 KERP: ${data.kerpBalance.toFixed(5)}
    `;
    let need = 1000000;
    let prog = Math.min(100, data.totalTaps/need*100);
    document.getElementById("prestigeProgress").innerHTML = `📊 Прогресс: ${Math.floor(data.totalTaps).toLocaleString()} / 1,000,000 (${Math.floor(prog)}%)`;
    document.getElementById("prestigeReward").innerHTML = `🎁 Следующий престиж: x${(data.prestigeMultiplier+0.1).toFixed(2)}`;
    document.getElementById("tapBarFill").style.width = (data.tapEnergy/data.maxTapEnergy*100)+"%";
    document.getElementById("tapEnergyText").innerHTML = `${Math.floor(data.tapEnergy)} / ${data.maxTapEnergy}`;
    let diff = 86400000 - (Date.now() - data.lastDaily);
    if (diff <= 0) document.getElementById("dailyTimer").innerText = "🎁 ГОТОВО";
    else {
        let h = Math.floor(diff/3600000);
        let m = Math.floor((diff%3600000)/60000);
        document.getElementById("dailyTimer").innerText = `⏳ ${h}ч ${m}м`;
    }
    let autosaveBtn = document.getElementById("autosaveStatus");
    if (autosaveBtn) {
        autosaveBtn.innerHTML = data.autosaveEnabled ? "✅ ВКЛ" : "⭕ ВЫКЛ";
        autosaveBtn.style.background = data.autosaveEnabled ? "#0a0" : "#666";
    }
    let soundBtn = document.getElementById("toggleSoundBtn");
    if (soundBtn) soundBtn.innerHTML = data.soundEnabled ? "🔊 ВКЛ" : "🔇 ВЫКЛ";
    updatePlayerInfo();
    displayLeaderboard();
    updateKerpDisplay();
    updateReferralUI();
    if (data.walletAddress && document.getElementById("kerp-balance-amount")) {
        document.getElementById("kerp-balance-amount").innerText = data.kerpBalance.toFixed(5);
    }
}

// ТАП
document.getElementById("tapButton").onclick = () => {
    if (data.tapEnergy <= 0) { toast("⚠ НЕТ ЭНЕРГИИ"); return; }
    data.tapEnergy--;
    let gain = data.power;
    let isCrit = false;
    if (Math.random() < data.crit/100) { gain *= 3; isCrit = true; }
    gain = getMultipliedGain(gain);
    data.energy += gain;
    data.totalTaps++;
    // KERP за тап: 0.00001 (базовое значение) умножается на престиж
    const KERP_PER_TAP = 0.00001;
    let kerpEarn = KERP_PER_TAP * data.prestigeMultiplier;
    addKerp(kerpEarn);
    if (isCrit) toast("💥 КРИТ! +" + kerpEarn.toFixed(8) + " KERP");
    playSound();
    let effect = document.createElement("div");
    effect.className = "tapEffect";
    effect.innerText = `+${gain}⚡ +${kerpEarn.toFixed(8)}🪙`;
    effect.style.left = (Math.random()*120+40)+"px";
    effect.style.top = (Math.random()*120+40)+"px";
    document.getElementById("tapButton").appendChild(effect);
    setTimeout(() => effect.remove(), 700);
    updateUI();
    save();
};

// АВТО
setInterval(() => {
    let autoGain = getMultipliedGain(data.auto);
    data.energy += autoGain;
    data.tapEnergy += data.regen;
    if (data.tapEnergy > data.maxTapEnergy) data.tapEnergy = data.maxTapEnergy;
    if (data.auto > 0) {
        let kerpAuto = 0.00001 * data.auto * data.prestigeMultiplier / 10; // авто даёт меньше
        addKerp(kerpAuto);
    }
    updateUI();
    save();
}, 1000);

setInterval(() => { if (data.autosaveEnabled) save(); }, 10000);

function canUpgrade() { return (Date.now() - data.lastUpgrade) >= 1800000; }
function setCooldown() { data.lastUpgrade = Date.now(); }

// Обработчики кнопок (код не меняется, только вызовы)
document.getElementById("buyPower").onclick = () => {
    if (!canUpgrade()) { toast("⏳ ПОДОЖДИТЕ 30 МИНУТ"); return; }
    let cost = powerCost();
    if (data.energy >= cost) { data.energy -= cost; data.power++; setCooldown(); toast("🔥 СИЛА УВЕЛИЧЕНА"); playSound(); }
    else toast("❌ НУЖНО " + cost);
    updateUI(); save();
};
document.getElementById("buyAuto").onclick = () => {
    if (!canUpgrade()) { toast("⏳ ПОДОЖДИТЕ 30 МИНУТ"); return; }
    let cost = autoCost();
    if (data.energy >= cost) { data.energy -= cost; data.auto++; setCooldown(); toast("⚡ АВТО УЛУЧШЕНО"); playSound(); }
    else toast("❌ НУЖНО " + cost);
    updateUI(); save();
};
document.getElementById("buyCrit").onclick = () => {
    if (!canUpgrade()) { toast("⏳ ПОДОЖДИТЕ 30 МИНУТ"); return; }
    let cost = critCost();
    if (data.energy >= cost) { data.energy -= cost; data.crit++; setCooldown(); toast("💥 ШАНС КРИТА УВЕЛИЧЕН"); playSound(); }
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
    if (data.energy >= cost) { data.energy -= cost; data.crit += 5; toast("💥 +5% ШАНСА КРИТА"); playSound(); }
    else toast("❌ НУЖНО " + cost);
    updateUI(); save();
};
document.getElementById("upCore").onclick = () => {
    let now = Date.now();
    if (now - data.lastEnergyUpgrade < 3600000) { toast("⏳ ТОЛЬКО РАЗ В ЧАС"); return; }
    let cost = 1000000;
    if (data.energy >= cost) { data.energy -= cost; data.maxTapEnergy += 10; data.tapEnergy += 10; data.lastEnergyUpgrade = now; toast("🔋 +10 МАКС. ЭНЕРГИИ"); playSound(); }
    else toast("❌ НУЖНО 1000000");
    updateUI(); save();
};
document.getElementById("prestigeBtn").onclick = () => {
    if (data.totalTaps < 1000000) { toast("❌ НУЖНО 1,000,000 ТАПОВ"); return; }
    if (!confirm(`🌟 ПРЕСТИЖ!\nТекущий бонус: x${data.prestigeMultiplier.toFixed(2)}\nНовый: x${(data.prestigeMultiplier+0.1).toFixed(2)}\nПродолжить?`)) return;
    data.prestigeMultiplier += 0.1;
    data.totalPrestigeTaps += data.totalTaps;
    data.energy = 0; data.totalTaps = 0; data.power = 1; data.auto = 0; data.crit = 0;
    data.maxTapEnergy = 50; data.tapEnergy = 50;
    data.lastDaily = 0; data.lastUpgrade = 0; data.lastEnergyUpgrade = 0;
    toast(`✨ ПРЕСТИЖ! x${(data.prestigeMultiplier-0.1).toFixed(2)} → x${data.prestigeMultiplier.toFixed(2)}`);
    playSound();
    updateUI(); save();
};
document.getElementById("dailyBtn").onclick = () => {
    let now = Date.now();
    if (now - data.lastDaily > 86400000) {
        let rewardEnergy = getMultipliedGain(50000 + data.level*5000);
        let rewardKerp = (1000 + data.level*100) * data.prestigeMultiplier;
        data.energy += rewardEnergy;
        addKerp(rewardKerp);
        data.lastDaily = now;
        toast(`🎁 ЕЖЕДНЕВНЫЙ БОНУС: +${rewardEnergy}⚡ +${rewardKerp.toFixed(5)}🪙`);
        playSound();
    } else toast("⏳ ЕЩЁ НЕ ГОТОВО");
    updateUI(); save();
};

// Настройки
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
            if (imported.version && imported.prestigeMultiplier !== undefined) {
                data = imported;
                toast("📥 СОХРАНЕНИЕ ЗАГРУЖЕНО! ОБНОВЛЕНИЕ...");
                setTimeout(() => location.reload(), 1000);
            } else toast("❌ НЕВЕРНЫЙ ФАЙЛ");
        } catch(err) { toast("❌ ФАЙЛ ПОВРЕЖДЁН"); }
    };
    reader.readAsText(file);
};
document.getElementById("autosaveStatus").onclick = () => {
    data.autosaveEnabled = !data.autosaveEnabled;
    toast(data.autosaveEnabled ? "✅ АВТОСОХРАНЕНИЕ ВКЛ" : "⭕ АВТОСОХРАНЕНИЕ ВЫКЛ");
    updateUI(); save();
};
document.getElementById("softResetBtn").onclick = () => {
    if (confirm("⚠ МЯГКИЙ СБРОС - сбросить прогресс, но оставить бонус престижа и рефералов?")) {
        data.energy = 0; data.totalTaps = 0; data.power = 1; data.auto = 0; data.crit = 0;
        data.maxTapEnergy = 50; data.tapEnergy = 50; data.lastDaily = 0; data.lastUpgrade = 0; data.lastEnergyUpgrade = 0;
        toast("⚠ МЯГКИЙ СБРОС ВЫПОЛНЕН");
        playSound();
        updateUI(); save();
    }
};
document.getElementById("hardResetBtn").onclick = () => {
    if (confirm("💀 ЖЁСТКИЙ СБРОС - удалить ВСЁ (включая престиж, рефералов, KERP, авторизацию)?")) {
        if (confirm("ВЫ УВЕРЕНЫ? ВСЁ БУДЕТ ПОТЕРЯНО!")) {
            localStorage.clear();
            location.reload();
        }
    }
};

// Реферальный UI
function updateReferralUI() {
    let refLinkInput = document.getElementById("refLink");
    if (refLinkInput) {
        let url = `${window.location.origin}${window.location.pathname}?ref=${data.refCode}`;
        refLinkInput.value = url;
    }
    document.getElementById("refCount").innerText = data.referrals.length;
    document.getElementById("refEarned").innerText = data.refEarned.toFixed(5);
    let refListDiv = document.getElementById("refList");
    if (refListDiv) {
        if (data.referrals.length === 0) refListDiv.innerHTML = "<em>Пока никого нет</em>";
        else {
            let html = "<ul>";
            data.referrals.forEach(refId => {
                let p = globalLeaderboard.find(x => x.id === refId);
                let name = p ? p.name : refId.slice(0,8);
                html += `<li>${name}</li>`;
            });
            html += "</ul>";
            refListDiv.innerHTML = html;
        }
    }
}
document.getElementById("copyRefBtn")?.addEventListener("click", () => {
    let inp = document.getElementById("refLink");
    inp.select();
    document.execCommand("copy");
    toast("📋 Реферальная ссылка скопирована!");
});

// GOOGLE LOGIN
function initGoogleSignIn() {
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
        if (window.google && window.google.accounts) {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredential
            });
            window.google.accounts.id.renderButton(
                document.getElementById("google-signin-button"),
                { theme: "outline", size: "large", width: 250 }
            );
        } else {
            console.error("Google script loaded but no accounts");
        }
    };
    document.body.appendChild(script);
}

function handleGoogleCredential(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        data.userId = payload.sub;
        data.userName = payload.name;
        data.userEmail = payload.email;
        data.userPicture = payload.picture;
        toast(`✅ Добро пожаловать, ${data.userName}!`);
        applyReferralBonus();
        updateLeaderboard();
        displayLeaderboard();
        updatePlayerInfo();
        updateReferralUI();
        updateUI();
        save();
    } catch(e) {
        console.error(e);
        toast("❌ Ошибка входа через Google");
    }
}

// TON CONNECT (исправленная версия)
function initTonConnect() {
    if (window.tonConnectUI) return;
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js';
    script.async = true;
    script.onload = () => {
        if (window.TonConnectUI) {
            window.tonConnectUI = new window.TonConnectUI.TonConnectUI({
                manifestUrl: 'https://raw.githubusercontent.com/ton-connect/demo-dapp/main/public/tonconnect-manifest.json',
                buttonRootId: 'ton-connect-wallet'
            });
            window.tonConnectUI.onStatusChange((wallet) => {
                if (wallet) {
                    document.getElementById('ton-wallet-status').innerHTML = `<div>✅ Кошелёк: ${wallet.account.address.slice(0,6)}...${wallet.account.address.slice(-4)}</div>`;
                    document.getElementById('kerp-balance').style.display = 'block';
                    data.walletAddress = wallet.account.address;
                    save();
                    if (document.getElementById('kerp-balance-amount')) {
                        document.getElementById('kerp-balance-amount').innerText = data.kerpBalance.toFixed(5);
                    }
                } else {
                    document.getElementById('ton-wallet-status').innerHTML = `<button id="ton-connect-wallet">Подключить TON кошелёк</button>`;
                    document.getElementById('kerp-balance').style.display = 'none';
                    data.walletAddress = null;
                    save();
                    initTonConnect();
                }
            });
        } else {
            console.error("TonConnectUI not loaded");
        }
    };
    document.body.appendChild(script);
}

function openTab(id) {
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

window.onload = () => {
    handleReferralOnLoad();
    updateUI();
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 306935697198-e0t1ih0mmr2s6pah1n7nfs6du5m8ks7e.apps.googleusercontent.com) {
        initGoogleSignIn();
    } else {
        document.getElementById("google-signin-button").innerHTML = '<span style="color:#aaa;">Настройте Google Client ID в script.js</span>';
    }
    initTonConnect();
};