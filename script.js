const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Canvas boyut
canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.9;
canvas.style.position = 'absolute';
canvas.style.left = '50%';
canvas.style.top = '50%';
canvas.style.transform = 'translate(-50%, -50%)';

//             AI
canvas.style.webkitTransform = 'translate(-50%, -50%)'; // Safari için
canvas.style.mozTransform = 'translate(-50%, -50%)'; // Firefox için
canvas.style.msTransform = 'translate(-50%, -50%)'; // IE için

// Tarayıcı prefix'lerini kontrol et
const prefixes = ['', 'webkit', 'moz', 'ms', 'o'];
let requestAnimationFrame = window.requestAnimationFrame;
let cancelAnimationFrame = window.cancelAnimationFrame;

// Prefix'leri kontrol et ve uygun olanı seç
for (let i = 0; i < prefixes.length; i++) {
    if (window[prefixes[i] + 'RequestAnimationFrame']) {
        requestAnimationFrame = window[prefixes[i] + 'RequestAnimationFrame'];
        cancelAnimationFrame = window[prefixes[i] + 'CancelAnimationFrame'];
        break;
    }
} //         AI

// Fallback
if (!requestAnimationFrame) {
    requestAnimationFrame = function(callback) {
        return setTimeout(callback, 1000 / 60);
    };
    cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };
}

// font çek
function loadFonts() {
    if (document.fonts && document.fonts.ready) {
        return document.fonts.ready;
    }
    return Promise.resolve();
}

// font wait
async function startGame() {
    try {
        await loadFonts();
        if (isSoundOn) {
            mainMusic.play();
        }
        gameLoop();
    } catch (error) {
        console.error('Font yüklenirken hata oluştu:', error);
        if (isSoundOn) {
            mainMusic.play();
        }
        gameLoop(); // hata olsa bile oyunu başlat
    }
}

// Load images
const rocketWithoutFire = new Image();
const rocketWithFire = new Image();
const backgroundImage = new Image();
const petrolImage = new Image();
const speedImage = new Image();
const starImage = new Image();
const asteroidImage = new Image();

// Görsel yükleme sistemi
let loadedImages = 0;
const totalImages = 7;

// Asteroid 
let asteroidY = 0;
let asteroidFalling = false;
let gameStarted = false;

function handleImageLoad() {
    loadedImages++;
    if (loadedImages === totalImages) {
        // Tüm görseller yüklendiğinde oyunu başlat
        startGame();
    }
}

// Her görsele onload ve onerror event'leri ekle        //               AI
[rocketWithoutFire, rocketWithFire, backgroundImage, petrolImage, speedImage, starImage, asteroidImage].forEach(img => {
    img.onload = handleImageLoad;
    img.onerror = () => {
        console.error('Görsel yüklenemedi:', img.src);
        handleImageLoad(); // Hata durumunda da sayacı artır
    };
}); //              AI       aldığım bir yükleme hatasını çözmeye çalışırken bu şekilde sorunu buldum ve çözdüm

rocketWithoutFire.src = "assets/rocket/rocket_WO_fire.png";
rocketWithFire.src = "assets/rocket/rocketWithFire.png";
backgroundImage.src = "assets/backgrounds/01.png";
petrolImage.src = "assets/stats/petrol.png";
speedImage.src = "assets/stats/speed.png";
starImage.src = "assets/stats/star.png";
asteroidImage.src = "assets/stats/astreoidFirst.png";

// Background 
const backgrounds = [
    "assets/backgrounds/01.png",
    "assets/backgrounds/02.png",
    "assets/backgrounds/03.png",
    "assets/backgrounds/04.png",
    "assets/backgrounds/05.png",
    "assets/backgrounds/06.png",
    "assets/backgrounds/07.png",
    "assets/backgrounds/08.png",
    "assets/backgrounds/09.png"
];

function changeBackgroundRandomly() {
    // anlık background
    const currentBackground = backgroundImage.src.split('/').pop();
    const availableBackgrounds = backgrounds.filter(bg => !bg.includes(currentBackground));
    //  random background 
    const randomIndex = Math.floor(Math.random() * availableBackgrounds.length);
    backgroundImage.src = availableBackgrounds[randomIndex];
}

// Black hole 
const blackHoleImages = [
    "assets/blackHole/karadelik02.png",
    "assets/blackHole/karadelik03.png",
    "assets/blackHole/karadelik04.png"
];
const blackHoleImage = new Image();
let blackHole = null;
const BLACK_HOLE_SIZE = 100;
let lastBlackHoleSpawn = 0;
let currentBlackHoleImage = null;
let blackHoleLoaded = false; // Karadelik resminin yüklenip yüklenmediğini kontrol et  //blackhle hatası düzeldi
let lastPetrolSpawn = 0; // Petrol varili için son spawn zamanı

// Oyun durumu
let gameOver = false;
let waitingForRestart = false;
let showInstructions = true;
let showMainMenu = true;
let showSettings = false;
let showControls = false;
let countdown = 0;
let lastTime = 0;
let isPaused = false;
let isSoundOn = true;
let isFullscreen = false;

// Yakıt ve hız değişkenleri
const MAX_FUEL = 200; //belki değiştirilebilir -?- 250???
let currentFuel = MAX_FUEL;
let currentSpeed = 0;

// Puan sistemi
let score = 0;
let timeScore = 0; // Zamana bağlı puan
let bonusScore = 0; // Bonus puanlar (karadelik-takla)
let highScore = localStorage.getItem('highScore') || 0;

class ScoreAnimation {
    constructor(x, y, score) {
        this.x = x;
        this.y = y;
        this.score = score;
        this.life = 60; // 60 frame  -?- 
        this.alpha = 1;
        //puan sağüst
        this.topRightX = canvas.width - 60;
        this.topRightY = 35;
    }

    update() {
        this.y -= 1;
        this.life--;
        this.alpha = this.life / 60; // solma 
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = "#00ff00"; //  puan yeşili
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        // Roketin üzerindeki animasyon
        ctx.fillText(`+${this.score}`, this.x, this.y);
        // Sağüst
        ctx.textAlign = "right";
        ctx.fillText(`+${this.score}`, this.topRightX, this.topRightY);
        ctx.restore();
    }
}

// fuel
let fuel = [];
const PETROL_SIZE = 60;

function spawnFuel() {
    if (!gameStarted) return;
    const x = Math.random() * (canvas.width - PETROL_SIZE);
    const y = Math.random() * (canvas.height - PETROL_SIZE);
    fuel.push({ x, y });
}

// Rastgele fuel
setInterval(() => {
    if (!gameOver && !isPaused && gameStarted) {
        spawnFuel();
    }
}, Math.random() * 8000 + 7000); // 7-15 saniye arası -?-

function checkPetrolCollision() {
    for (let i = fuel.length - 1; i >= 0; i--) {
        const barrel = fuel[i];
        // Dairesel çarpışma kontrolü                                               // AI
        const dx = ship.x - (barrel.x + PETROL_SIZE / 2);
        const dy = ship.y - (barrel.y + PETROL_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (ship.width + PETROL_SIZE) / 2;
        // AI
        if (distance < minDistance) {
            // Yakıtı doldur  (%70 şuanlık daha verimli değiştirilebilir -?-)
            const missingFuel = MAX_FUEL - currentFuel;
            currentFuel += missingFuel * 0.7;
            // fuel kaldır
            fuel.splice(i, 1);
        }
    }
}
// AI               
function isInViewport(x, y, width, height) {
    return x + width >= 0 && x <= canvas.width &&
        y + height >= 0 && y <= canvas.height;
}
// AI yaşadığım bir sorunu çözmeye çalışırken bu şekilde yardım aldım
function drawfuel() {
    fuel.forEach(barrel => {
        if (isInViewport(barrel.x, barrel.y, PETROL_SIZE, PETROL_SIZE)) {
            ctx.drawImage(petrolImage, barrel.x, barrel.y, PETROL_SIZE, PETROL_SIZE);
        }
    });
}

function spawnBlackHole() {
    const x = Math.random() * (canvas.width - BLACK_HOLE_SIZE);
    const y = Math.random() * (canvas.height - BLACK_HOLE_SIZE);
    // Random black hole
    const randomIndex = Math.floor(Math.random() * blackHoleImages.length);


    currentBlackHoleImage = new Image();
    currentBlackHoleImage.onload = function() {
        blackHoleImage.src = this.src;
        blackHole = { x, y };
        blackHoleLoaded = true;
        lastBlackHoleSpawn = Date.now();
    };
    currentBlackHoleImage.onerror = function() {
        console.error('Karadelik resmi yüklenemedi');
        blackHole = null;
        blackHoleLoaded = false;
    };
    currentBlackHoleImage.src = blackHoleImages[randomIndex];
}

function drawBlackHole() {
    if (!blackHole || !blackHoleLoaded) return;

    try {
        if (isInViewport(blackHole.x, blackHole.y, BLACK_HOLE_SIZE, BLACK_HOLE_SIZE)) {
            ctx.drawImage(blackHoleImage, blackHole.x, blackHole.y, BLACK_HOLE_SIZE, BLACK_HOLE_SIZE);
        }
    } catch (error) {
        console.error('Karadelik çizilirken hata:', error);
        blackHole = null;
        blackHoleLoaded = false;
    }
    // AI try catch bloğu aldığım hatayı çözmek ve bulmak için aı tarafından yazılmıştır.
}

function checkBlackHoleCollision() {
    if (!blackHole || !blackHoleLoaded) return;

    try {
        const dx = ship.x - (blackHole.x + BLACK_HOLE_SIZE / 2); //dairesel
        const dy = ship.y - (blackHole.y + BLACK_HOLE_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (ship.width + BLACK_HOLE_SIZE) / 2;

        if (distance < minDistance) {
            //  karadeliğe girilirse tüm fuel kaldırılır.
            fuel = [];
            changeBackgroundRandomly();
            bonusScore += 1000;
            scoreAnimations.push(new ScoreAnimation(ship.x, ship.y - 50, 1000));
            blackHole = null;
            blackHoleLoaded = false;
        }
    } catch (error) {
        console.error('Karadelik çarpışma kontrolünde hata:', error);
        blackHole = null;
        blackHoleLoaded = false;
    }
}

function drawInstructions() {
    if (!showInstructions) return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Oyun Kontrolleri", canvas.width / 2, canvas.height / 2 - 200);

    ctx.font = "24px Arial";
    const instructions = [
        "W tuşu: Roketi hareket ettirir ve yakıt tüketir",
        "A tuşu: Roketi sola döndürür",
        "D tuşu: Roketi sağa döndürür",
        "",
        "Oyun Hedefleri:",
        "- Petrol varillerini toplayarak yakıtınızı doldurun.",
        "- Karadeliklere dokunarak arka planı değiştirin ve puan kazanın.",
        "- Ekran sınırlarına çarpmamaya dikkat edin.",
        "",
        "Başlamak için SPACE tuşuna basın"
    ];

    instructions.forEach((text, index) => {
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 100 + (index * 40));
    });
}

const ship = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    thrust: 0.07,
    rotationSpeed: 0.05,
    gravity: 0.030,
    width: 0,
    height: 0
};

function adjustRocketSize() {
    ship.width = canvas.width * 0.072;
    ship.height = canvas.height * 0.065;
}

adjustRocketSize();

const keys = {
    w: false,
    a: false,
    d: false
};


let keyPressStartTime = {
    a: 0,
    d: 0,
    escape: 0
};

const ESC_LONG_PRESS_DURATION = 1000; // 1 saniye gerek kalmadı ama eklenebilir kalsın

let bonusPointsAdded = {
    a: { first: false, second: false },
    d: { first: false, second: false }
};

document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
        if (showInstructions) {
            showInstructions = false;
            resetGame();
        } else if (waitingForRestart) {
            resetGame();
        } else if (!gameOver) { // Oyun devam ediyorsa duraklat
            isPaused = !isPaused;
        }
        return;
    }

    if (e.key === "Escape") {
        if (keyPressStartTime.escape === 0) {
            keyPressStartTime.escape = Date.now();
        }

        // ESC tuşuna uzun basıldığında ve tam ekrandaysa gerek kalmadı

        if (isFullscreen && Date.now() - keyPressStartTime.escape >= ESC_LONG_PRESS_DURATION) {
            toggleFullscreen();
            keyPressStartTime.escape = 0;
        }
        return;
    }

    if (isPaused) return; // Pause durumunda diğer tuşları engelle

    if (e.key === "w") {
        keys.w = true;
        if (isSoundOn && currentFuel > 0) {
            rocketSound.currentTime = 0;
            rocketSound.play();
        }
    }
    if (e.key === "a") {
        keys.a = true;
        if (keyPressStartTime.a === 0) {
            keyPressStartTime.a = Date.now();
            bonusPointsAdded.a = { first: false, second: false };
        }
    }
    if (e.key === "d") {
        keys.d = true;
        if (keyPressStartTime.d === 0) {
            keyPressStartTime.d = Date.now();
            bonusPointsAdded.d = { first: false, second: false };
        }
    }
});

document.addEventListener("keyup", (e) => {
    if (e.key === "Escape") {
        keyPressStartTime.escape = 0;
    }
    if (e.key === "w") {
        keys.w = false;
        if (isSoundOn) {
            rocketSound.pause();
        }
    }
    if (e.key === "a") {
        keys.a = false;
        keyPressStartTime.a = 0;
        bonusPointsAdded.a = { first: false, second: false };
    }
    if (e.key === "d") {
        keys.d = false;
        keyPressStartTime.d = 0;
        bonusPointsAdded.d = { first: false, second: false };
    }
});

function checkKeyPressBonus() {
    const currentTime = Date.now();

    // Sol tuş takla kontrolü
    if (keys.a && !keys.d) {
        const pressDuration = currentTime - keyPressStartTime.a;

        if (pressDuration >= 870 && !bonusPointsAdded.a.first) {
            bonusScore += 200;
            bonusPointsAdded.a.first = true;
            scoreAnimations.push(new ScoreAnimation(ship.x, ship.y - 50, 200));
        }

        if (pressDuration >= 1740 && !bonusPointsAdded.a.second) {
            bonusScore += 200;
            bonusPointsAdded.a.second = true;
            scoreAnimations.push(new ScoreAnimation(ship.x, ship.y - 50, 200));
        }
    }

    // Sağ tuş takla kontrolü
    if (keys.d && !keys.a) {
        const pressDuration = currentTime - keyPressStartTime.d;

        if (pressDuration >= 870 && !bonusPointsAdded.d.first) {
            bonusScore += 200;
            bonusPointsAdded.d.first = true;
            scoreAnimations.push(new ScoreAnimation(ship.x, ship.y - 50, 200));
        }

        if (pressDuration >= 1740 && !bonusPointsAdded.d.second) {
            bonusScore += 200;
            bonusPointsAdded.d.second = true;
            scoreAnimations.push(new ScoreAnimation(ship.x, ship.y - 50, 200));
        }
    }
}

function drawHUD() {
    // Göstergelerin konumlarını canvas boyutlarına göre hesapla
    const margin = canvas.width * 0.017;
    const barWidth = canvas.width * 0.12;
    const barHeight = canvas.height * 0.025;
    const iconSize = canvas.width * 0.035;
    const spacing = canvas.height * 0.025;

    // Yakıt göstergesi
    // Yakıt çerçevesi
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, barWidth, barHeight);

    // Yakıt doluluk oranı
    const fuelWidth = (currentFuel / MAX_FUEL) * barWidth;
    ctx.fillStyle = "red";
    ctx.fillRect(margin, margin, fuelWidth, barHeight);

    // fuel ikonu
    ctx.drawImage(petrolImage, margin + barWidth + margin / 2, margin - iconSize / 4, iconSize, iconSize);

    // Hız göstergesi
    // Roketin anlık hızını hesapla
    const currentVelocity = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    const maxSpeed = 15;

    // Hız çerçevesi
    ctx.strokeRect(margin, margin + barHeight + spacing, barWidth, barHeight);
    const speedWidth = (currentVelocity / maxSpeed) * barWidth;
    ctx.fillStyle = "blue";
    ctx.fillRect(margin, margin + barHeight + spacing, speedWidth, barHeight);

    // Hız ikonu
    ctx.drawImage(speedImage, margin + barWidth + margin / 2, margin + barHeight + spacing - iconSize / 4, iconSize, iconSize);
}

function update() {
    if (gameOver || showInstructions || isPaused) {
        if (isPaused) {
            lastBlackHoleSpawn = Date.now();
            lastPetrolSpawn = Date.now();
        }
        return;
    }

    // sayaç
    if (countdown > 0) {
        const currentTime = Date.now();
        if (currentTime - lastTime >= 1000) {
            countdown--;
            lastTime = currentTime;
        }
        return;
    }

    // ilk w kontrolü
    if (keys.w && !gameStarted) {
        gameStarted = true;
        asteroidFalling = true;
        lastScoreUpdate = Date.now(); // Süre sayacını başlat
    }

    // asteroid 
    if (asteroidFalling) {
        asteroidY += 2;
    }


    if (gameStarted) {

        checkKeyPressBonus();

        // karadelik spawnı
        const currentTime = Date.now();
        if (!blackHole && !blackHoleLoaded && currentTime - lastBlackHoleSpawn > Math.random() * 20000 + 10000) {
            spawnBlackHole();
        }

        if (keys.a) ship.angle -= ship.rotationSpeed;
        if (keys.d) ship.angle += ship.rotationSpeed;

        if (keys.w && currentFuel > 0) {
            currentFuel -= 0.2;
            const speedMultiplier = 1 + ((MAX_FUEL - currentFuel) / MAX_FUEL);
            ship.vx += Math.cos(ship.angle) * ship.thrust * speedMultiplier;
            ship.vy += Math.sin(ship.angle) * ship.thrust * speedMultiplier;
        }

        ship.vy += ship.gravity;
        ship.x += ship.vx;
        ship.y += ship.vy;
    } else {

        ship.y = canvas.height - 150;
        lastScoreUpdate = Date.now(); // Süre sayacını sıfırla
    }

    // çarpışma kontrolü
    checkPetrolCollision();

    checkBlackHoleCollision();

    // Kenarlara çarpma kontrolü
    if (ship.x < 0 || ship.x > canvas.width || ship.y < 0 || ship.y > canvas.height) {
        gameOver = true;
        waitingForRestart = true;
    }
}

function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    const currentImage = (keys.w && currentFuel > 0) ? rocketWithFire : rocketWithoutFire;

    ctx.drawImage(
        currentImage, -ship.width / 2, -ship.height / 2,
        ship.width,
        ship.height
    );

    ctx.restore();
}

// Gradient 
function createGradient(ctx, startY, endY) {
    try {
        const gradient = ctx.createLinearGradient(0, startY, 0, endY);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.4, '#FFD700');
        gradient.addColorStop(0.5, '#FFA500');
        gradient.addColorStop(0.7, '#FFA500');
        gradient.addColorStop(0.85, '#FF0000');
        gradient.addColorStop(1, '#FFFFFF');
        return gradient;
    } catch (error) {
        console.error('Gradient oluşturulurken hata:', error);
        return '#FFD700';
    }
}

// drawBorders 
function drawBorders() {
    try {
        // Üst, sol ve sağ kenarlar için normal çizgi
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Alt kısım için bombeli çizgi
        ctx.beginPath();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;

        // Çizginin başlangıç ve bitiş noktaları
        const startX = 0;
        const endX = canvas.width;
        const startY = canvas.height;
        const endY = canvas.height;

        // bombenin şeklini
        const controlX = canvas.width / 2;
        const controlY = canvas.height - 50;

        // Gradient oluştur
        const gradient = createGradient(ctx, canvas.height - 50, canvas.height);

        // Önce doldurma yap
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.lineTo(startX, startY);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Sonra bombeli çizgiyi çiz
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        ctx.stroke();
    } catch (error) {
        console.error('Kenarlar çizilirken hata:', error);
    }
}

function updateScore() {
    if (!gameOver && !showInstructions && countdown === 0 && !isPaused && gameStarted) {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastScoreUpdate;

        if (timeDiff >= 10) {
            const pointsToAdd = Math.floor(timeDiff / 10);
            timeScore += pointsToAdd;
            lastScoreUpdate = currentTime;

            score = timeScore + bonusScore;

            if (score > highScore) {
                highScore = score;
                localStorage.setItem('highScore', highScore);
            }
        }
    } else if (isPaused) {
        // Pause durumunda lastScoreUpdate'i güncelle
        lastScoreUpdate = Date.now();
    }
}

function drawScore() {
    // Puanı sağ üste 
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`${score}`, canvas.width - 60, 35);

    // Yıldız resmini 
    const starSize = 50;
    ctx.drawImage(starImage, canvas.width - 50, 1, starSize, starSize);
}

function drawGameOver() {
    if (!gameOver) return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Oyun Bitti!", canvas.width / 2, canvas.height / 2 - 80);

    // Puan ve High Score gösterimi
    ctx.font = "32px Arial";
    ctx.fillText(`Puan: ${score}`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText(`En Yüksek Puan: ${highScore}`, canvas.width / 2, canvas.height / 2 + 20);

    // Ana menüye dön butonu
    const menuButton = {
        x: canvas.width / 2 - 100,
        y: canvas.height / 2 + 80,
        width: 200,
        height: 50,
        text: "ANA MENÜ",
        color: "#4CAF50",
        hoverColor: "#45a049"
    };

    const isHovered = isMouseOverButton(menuButton, mouseX, mouseY);
    drawButton(menuButton, isHovered);

    if (waitingForRestart) {
        ctx.font = "24px Arial";
        ctx.fillText("Tekrar başlamak için SPACE tuşuna basın", canvas.width / 2, canvas.height / 2 + 160);
    }
}

function drawCountdown() {
    if (countdown <= 0) return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2);
}

function updateScoreAnimations() {
    for (let i = scoreAnimations.length - 1; i >= 0; i--) {
        scoreAnimations[i].update();
        if (scoreAnimations[i].life <= 0) {
            scoreAnimations.splice(i, 1);
        }
    }
}

function drawScoreAnimations() {
    scoreAnimations.forEach(animation => animation.draw(ctx));
}

// Pause ekranını güncelle
function drawPauseScreen() {
    if (!isPaused) return;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2 - 80);
    ctx.font = "24px Arial";
    ctx.fillText("Devam etmek için SPACE tuşuna basın", canvas.width / 2, canvas.height / 2 - 20);

    const continueButton = {
        x: canvas.width / 2 - 150,
        y: canvas.height / 2 + 40,
        width: 300,
        height: 50,
        text: "DEVAM ET",
        color: "#4CAF50",
        hoverColor: "#45a049"
    };


    const settingsButton = {
        x: canvas.width / 2 - 150,
        y: canvas.height / 2 + 100,
        width: 300,
        height: 50,
        text: "AYARLAR",
        color: "#2196F3",
        hoverColor: "#1976D2"
    };


    const menuButton = {
        x: canvas.width / 2 - 150,
        y: canvas.height / 2 + 160,
        width: 300,
        height: 50,
        text: "ANA MENÜ",
        color: "#f44336",
        hoverColor: "#d32f2f"
    };

    const continueHovered = isMouseOverButton(continueButton, mouseX, mouseY);
    const settingsHovered = isMouseOverButton(settingsButton, mouseX, mouseY);
    const menuHovered = isMouseOverButton(menuButton, mouseX, mouseY);

    drawButton(continueButton, continueHovered);
    drawButton(settingsButton, settingsHovered);
    drawButton(menuButton, menuHovered);
}

// Ana menü butonları
const menuButtons = {
    play: {
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        text: "OYNA",
        color: "#4CAF50",
        hoverColor: "#45a049"
    },
    settings: {
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        text: "AYARLAR",
        color: "#2196F3",
        hoverColor: "#1976D2"
    },
    controls: {
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        text: "KONTROLLER",
        color: "#FF9800",
        hoverColor: "#F57C00"
    }
};


function updateButtonPositions() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const spacing = 70;

    menuButtons.play.x = centerX - menuButtons.play.width / 2;
    menuButtons.play.y = centerY - spacing;

    menuButtons.settings.x = centerX - menuButtons.settings.width / 2;
    menuButtons.settings.y = centerY;

    menuButtons.controls.x = centerX - menuButtons.controls.width / 2;
    menuButtons.controls.y = centerY + spacing;
}

// Buton çizme fonksiyonu
function drawButton(button, isHovered) {
    ctx.save();

    // Buton arka planı
    ctx.fillStyle = isHovered ? button.hoverColor : button.color;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    // Yuvarlak köşeli buton
    const radius = 10;
    ctx.beginPath();
    ctx.moveTo(button.x + radius, button.y);
    ctx.lineTo(button.x + button.width - radius, button.y);
    ctx.quadraticCurveTo(button.x + button.width, button.y, button.x + button.width, button.y + radius);
    ctx.lineTo(button.x + button.width, button.y + button.height - radius);
    ctx.quadraticCurveTo(button.x + button.width, button.y + button.height, button.x + button.width - radius, button.y + button.height);
    ctx.lineTo(button.x + radius, button.y + button.height);
    ctx.quadraticCurveTo(button.x, button.y + button.height, button.x, button.y + button.height - radius);
    ctx.lineTo(button.x, button.y + radius);
    ctx.quadraticCurveTo(button.x, button.y, button.x + radius, button.y);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Buton metni
    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);

    ctx.restore();
}

// Ana menüyü çiz
function drawMainMenu() {
    // Yarı saydam siyah arka plan
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Oyun başlığı
    ctx.fillStyle = "white";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("FUELS RUN OUT", canvas.width / 2, canvas.height / 4);

    // Butonları çiz
    updateButtonPositions();
    for (const button of Object.values(menuButtons)) {
        const isHovered = isMouseOverButton(button, mouseX, mouseY);
        drawButton(button, isHovered);
    }
}

// Ses efekti için
const gameSound = new Audio("assets/sounds/game.mp3");
gameSound.loop = true;

// Ana müzik için
const mainMusic = new Audio("assets/musicsandEffects/mainmusic.mp3");
mainMusic.loop = true;

// Roket sesi için
const rocketSound = new Audio("assets/musicsandEffects/rocketactive.mp3");
rocketSound.loop = true;
rocketSound.volume = 0.3; // Roket sesinin seviyesini %30'a düşür -?-

// Ses açma/kapama fonksiyonu
let volume = 1.0; // Ses seviyesi 0-1

function toggleSound() {
    isSoundOn = !isSoundOn;
    if (isSoundOn) {
        gameSound.volume = volume;
        mainMusic.volume = volume;
        rocketSound.volume = volume;
        gameSound.play();
        mainMusic.play();
    } else {
        gameSound.pause();
        mainMusic.pause();
        rocketSound.pause();
    }
}

// Ses seviyesini ayarla
function setVolume(newVolume) {
    volume = Math.max(0, Math.min(1, newVolume));
    if (isSoundOn) {
        gameSound.volume = volume;
        mainMusic.volume = volume;
        rocketSound.volume = volume;
    }
}

// Tam ekran fonksiyonu
function toggleFullscreen() {
    if (!document.fullscreenElement &&
        !document.mozFullScreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement) {
        // Tam ekrana geç                                                //         AI
        if (canvas.requestFullscreen) {
            canvas.requestFullscreen();
        } else if (canvas.mozRequestFullScreen) { // Firefox
            canvas.mozRequestFullScreen();
        } else if (canvas.webkitRequestFullscreen) { // Chrome, Safari
            canvas.webkitRequestFullscreen();
        } else if (canvas.msRequestFullscreen) { // IE11
            canvas.msRequestFullscreen();
        }
        isFullscreen = true;
    } else {
        // Tam ekrandan çık
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE11
            document.msExitFullscreen();
        }
        isFullscreen = false;
    }
} //              AI                                         

// Tam ekran değişikliğini dinle (tüm tarayıcılar için)  AI
document.addEventListener('fullscreenchange', updateFullscreenState);
document.addEventListener('mozfullscreenchange', updateFullscreenState);
document.addEventListener('webkitfullscreenchange', updateFullscreenState);
document.addEventListener('msfullscreenchange', updateFullscreenState);

// Tam ekran durumunu güncelle
function updateFullscreenState() {
    isFullscreen = !!(document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement);
}

// Ayarlar menüsünü çiz
function drawSettings() {
    // Yarı saydam siyah arka plan
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Başlık
    ctx.fillStyle = "white";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("AYARLAR", canvas.width / 2, canvas.height / 4);

    // Ses ayarı butonu
    const soundButton = {
        x: canvas.width / 2 - 150,
        y: canvas.height / 2 - 100,
        width: 300,
        height: 50,
        text: isSoundOn ? "SES: AÇIK" : "SES: KAPALI",
        color: isSoundOn ? "#4CAF50" : "#f44336",
        hoverColor: isSoundOn ? "#45a049" : "#d32f2f"
    };

    // Ses seviyesi slider'ı
    const sliderX = canvas.width / 2 - 150;
    const sliderY = canvas.height / 2 - 20;
    const sliderWidth = 300;
    const sliderHeight = 40;

    // Slider arka planı
    ctx.fillStyle = "#444";
    ctx.fillRect(sliderX, sliderY + sliderHeight / 2 - 2, sliderWidth, 4);

    // Slider doluluk çubuğu
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(sliderX, sliderY + sliderHeight / 2 - 2, sliderWidth * volume, 4);

    // Slider başlığı
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Ses Seviyesi", sliderX, sliderY - 10);

    // Slider değeri
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(volume * 100)}%`, sliderX + sliderWidth, sliderY - 10);

    // Slider kontrol noktası
    const knobX = sliderX + sliderWidth * volume;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(knobX, sliderY + sliderHeight / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4CAF50";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tam ekran butonu
    const fullscreenButton = {
        x: canvas.width / 2 - 150,
        y: canvas.height / 2 + 50,
        width: 300,
        height: 50,
        text: isFullscreen ? "TAM EKRAN: AÇIK" : "TAM EKRAN: KAPALI",
        color: isFullscreen ? "#4CAF50" : "#f44336",
        hoverColor: isFullscreen ? "#45a049" : "#d32f2f"
    };

    // Geri butonu
    const backButton = {
        x: canvas.width / 2 - 100,
        y: canvas.height - 100,
        width: 200,
        height: 50,
        text: "GERİ",
        color: "#f44336",
        hoverColor: "#d32f2f"
    };

    // Butonları çiz
    const soundHovered = isMouseOverButton(soundButton, mouseX, mouseY);
    const fullscreenHovered = isMouseOverButton(fullscreenButton, mouseX, mouseY);
    const backHovered = isMouseOverButton(backButton, mouseX, mouseY);

    drawButton(soundButton, soundHovered);
    drawButton(fullscreenButton, fullscreenHovered);
    drawButton(backButton, backHovered);
}

// Kontroller menüsünü çiz
function drawControls() {
    // Yarı saydam siyah arka plan
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Başlık
    ctx.fillStyle = "white";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("KONTROLLER", canvas.width / 2, canvas.height / 4);

    // Kontrol açıklamaları
    ctx.font = "24px Arial";
    const controls = [
        "W tuşu: Roketi hareket ettirir ve yakıt tüketir.",
        "A tuşu: Roketi sola döndürür.",
        "D tuşu: Roketi sağa döndürür.",
        "SPACE tuşu: Oyunu duraklatır.",
        "",
        "Oyun Hedefleri:",
        "- Petrol varillerini toplayarak yakıtınızı doldurun.",
        "- Karadeliklere dokunarak arka planı değiştirin.",
        "- Ekran sınırlarına çarpmamaya dikkat edin."
    ];

    controls.forEach((text, index) => {
        ctx.fillText(text, canvas.width / 2, canvas.height / 3 + (index * 40));
    });

    // Geri butonu
    const backButton = {
        x: canvas.width / 2 - 100,
        y: canvas.height - 100,
        width: 200,
        height: 50,
        text: "GERİ",
        color: "#f44336",
        hoverColor: "#d32f2f"
    };

    const isHovered = isMouseOverButton(backButton, mouseX, mouseY);
    drawButton(backButton, isHovered);
}

// Mouse pozisyonunu takip et
let mouseX = 0;
let mouseY = 0;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
});

// Mouse tıklamasını kontrol et
canvas.addEventListener('click', (e) => {
    // Mouse pozisyonunu canvas koordinatlarına çevir
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (gameOver) {
        // Ana menüye dön butonu kontrolü
        const menuButton = {
            x: canvas.width / 2 - 100,
            y: canvas.height / 2 + 80,
            width: 200,
            height: 50
        };

        if (isMouseOverButton(menuButton, mouseX, mouseY)) {
            gameOver = false;
            waitingForRestart = false;
            showMainMenu = true;
            if (isSoundOn) gameSound.play();
        }
    } else if (showMainMenu) {
        // Ana menü butonları
        if (isMouseOverButton(menuButtons.play, mouseX, mouseY)) {
            showMainMenu = false;
            showInstructions = false;
            resetGame();
            if (isSoundOn) gameSound.play();
        } else if (isMouseOverButton(menuButtons.settings, mouseX, mouseY)) {
            showSettings = true;
            showMainMenu = false;
        } else if (isMouseOverButton(menuButtons.controls, mouseX, mouseY)) {
            showControls = true;
            showMainMenu = false;
        }
    } else if (showSettings) {
        // Ayarlar menüsü butonları
        const soundButton = {
            x: canvas.width / 2 - 150,
            y: canvas.height / 2 - 100,
            width: 300,
            height: 50
        };

        const sliderX = canvas.width / 2 - 150;
        const sliderY = canvas.height / 2 - 20;
        const sliderWidth = 300;
        const sliderHeight = 40;

        const fullscreenButton = {
            x: canvas.width / 2 - 150,
            y: canvas.height / 2 + 50,
            width: 300,
            height: 50
        };

        const backButton = {
            x: canvas.width / 2 - 100,
            y: canvas.height - 100,
            width: 200,
            height: 50
        };

        if (isMouseOverButton(soundButton, mouseX, mouseY)) {
            toggleSound();
        } else if (mouseX >= sliderX && mouseX <= sliderX + sliderWidth &&
            mouseY >= sliderY - 10 && mouseY <= sliderY + sliderHeight + 10) {
            const newVolume = (mouseX - sliderX) / sliderWidth;
            setVolume(newVolume);
        } else if (isMouseOverButton(fullscreenButton, mouseX, mouseY)) {
            toggleFullscreen();
        } else if (isMouseOverButton(backButton, mouseX, mouseY)) {
            showSettings = false;
            if (isPaused) {} else {
                showMainMenu = true;
            }
        }
    } else if (showControls) {
        // Geri butonu kontrolü
        const backButton = {
            x: canvas.width / 2 - 100,
            y: canvas.height - 100,
            width: 200,
            height: 50
        };

        if (isMouseOverButton(backButton, mouseX, mouseY)) {
            showControls = false;
            showMainMenu = true;
        }
    } else if (isPaused) {
        // Pause ekranı butonları
        const continueButton = {
            x: canvas.width / 2 - 150,
            y: canvas.height / 2 + 40,
            width: 300,
            height: 50
        };

        const settingsButton = {
            x: canvas.width / 2 - 150,
            y: canvas.height / 2 + 100,
            width: 300,
            height: 50
        };

        const menuButton = {
            x: canvas.width / 2 - 150,
            y: canvas.height / 2 + 160,
            width: 300,
            height: 50
        };

        if (isMouseOverButton(continueButton, mouseX, mouseY)) {
            isPaused = false;
        } else if (isMouseOverButton(settingsButton, mouseX, mouseY)) {
            showSettings = true;
        } else if (isMouseOverButton(menuButton, mouseX, mouseY)) {
            isPaused = false;
            showMainMenu = true;
            if (isSoundOn) gameSound.play();
        }
    }
});

// Mouse sürükleme olayını dinle
canvas.addEventListener('mousemove', (e) => {
    if (showSettings && e.buttons === 1) { // Sol mouse tuşu basılı
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const sliderX = canvas.width / 2 - 150;
        const sliderY = canvas.height / 2 - 20;
        const sliderWidth = 300;
        const sliderHeight = 40;

        if (mouseX >= sliderX && mouseX <= sliderX + sliderWidth &&
            mouseY >= sliderY - 10 && mouseY <= sliderY + sliderHeight + 10) {
            const newVolume = (mouseX - sliderX) / sliderWidth;
            setVolume(newVolume);
        }
    }
});

// Mouse butonun üzerinde mi kontrol et
function isMouseOverButton(button, mouseX, mouseY) {
    return mouseX >= button.x &&
        mouseX <= button.x + button.width &&
        mouseY >= button.y &&
        mouseY <= button.y + button.height;
}

function drawAsteroid() {
    if (!asteroidFalling) {
        ctx.drawImage(asteroidImage, canvas.width / 2 - 50, canvas.height - 100, 100, 100);
    } else {
        ctx.drawImage(asteroidImage, canvas.width / 2 - 50, asteroidY, 100, 100);
    }
}

function gameLoop() {
    // Arka plan resmini çiz
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

    if (showMainMenu) {
        drawMainMenu();
    } else if (showSettings) {
        drawSettings();
    } else if (showControls) {
        drawControls();
    } else if (showInstructions) {
        drawInstructions();
    } else {
        updateScore();
        drawfuel();
        drawBlackHole();
        drawAsteroid();
        update();
        drawShip();
        drawHUD();
        drawScore();
        drawGameOver();
        drawCountdown();
        updateScoreAnimations();
        drawScoreAnimations();
        drawBorders();
        drawPauseScreen();
    }

    requestAnimationFrame(gameLoop);
}

// Oyun elemanlarını yeniden konumlandır
function repositionGameElements() {
    ship.x = Math.min(ship.x, canvas.width - ship.width / 2);
    ship.y = Math.min(ship.y, canvas.height - ship.height / 2);

    fuel = fuel.filter(barrel => {
        return barrel.x >= 0 && barrel.x <= canvas.width - PETROL_SIZE &&
            barrel.y >= 0 && barrel.y <= canvas.height - PETROL_SIZE;
    });

    if (blackHole) {
        blackHole.x = Math.min(blackHole.x, canvas.width - BLACK_HOLE_SIZE);
        blackHole.y = Math.min(blackHole.y, canvas.height - BLACK_HOLE_SIZE);
    }
}

// Pencere boyutu değiştiğinde canvas'ı yeniden boyutlandır
window.addEventListener('resize', () => {
    try {
        canvas.width = window.innerWidth * 0.9;
        canvas.height = window.innerHeight * 0.9;
        // Roket boyutlarını güncelle
        adjustRocketSize();
        // Oyun elemanlarını yeniden konumlandır
        repositionGameElements();
        // Butonları güncelle
        updateButtonPositions();
    } catch (error) {
        console.error('Boyutlandırma hatası:', error);
    }
});

function resetGame() {
    ship.x = canvas.width / 2;
    ship.y = canvas.height - 150;
    ship.angle = -Math.PI / 2;
    ship.vx = 0;
    ship.vy = 0;
    gameOver = false;
    waitingForRestart = false;
    isPaused = false;
    currentFuel = MAX_FUEL;
    currentSpeed = 0;
    fuel = [];
    blackHole = null;
    blackHoleLoaded = false;
    lastBlackHoleSpawn = Date.now();
    lastPetrolSpawn = Date.now();
    score = 0;
    timeScore = 0;
    bonusScore = 0;
    gameStartTime = Date.now();
    lastScoreUpdate = Date.now();
    scoreAnimations = [];
    keyPressStartTime = { a: 0, d: 0, escape: 0 };
    bonusPointsAdded = {
        a: { first: false, second: false },
        d: { first: false, second: false }
    };

    // Reset asteroid 
    asteroidY = canvas.height - 100;
    asteroidFalling = false;
    gameStarted = false;

    //  sesleri başlat
    if (isSoundOn) {
        gameSound.currentTime = 0;
        gameSound.play();
        mainMusic.currentTime = 0;
        mainMusic.play();
        rocketSound.pause();
    }
}