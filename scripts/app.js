import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { visibleNoti } from "./noti.js";
import { loadQuestions, getNextQuestion, questions } from "./question.js";
import { restartWithNewTrack, playLoseSound, playWinSound, stopAllSounds, initAudio } from "./audio.js";
import { saveGameRes, app } from "./firebase.js";

const auth = getAuth(app);

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is logged in:", user.uid);
    } else {
        console.log("No user is logged in.");
    }
});

// hide question board
document.getElementById("board").style.display = "none";

const roadImgs = document.querySelectorAll("#road>img");
const player = document.getElementById("player");
const scoreText = document.getElementById("score");
const highScoreText = document.getElementById("highscore");
const board = document.getElementById("board");

// Question elements
const questionElement = document.getElementById("question");
const optionsElements = document.querySelectorAll(".option");
const timeLeftElement = document.getElementById("time-left");
const currentQuestionElement = document.getElementById("current-question");
const totalQuestionsElement = document.getElementById("total-questions");
const nextButton = document.getElementById("next-btn");

// Calculate play time
let gameStartTime = Date.now();

// #region ROAD
let roadImgWidth = roadImgs[0].getBoundingClientRect().width;
let roadSpeed = 120;
let roadPos = Array.from(roadImgs).map((img, index) => index * roadImgWidth);

// INIT ROADS POSITION
for (let i = 0; i < roadImgs.length; i++) {
    roadImgs[i].style.left = `${roadPos[i]}px`;
}

let roadLoop = setInterval(function () {
    for (let i = 0; i < roadImgs.length; i++) {
        // MOVE ROAD IMGS
        roadPos[i] -= roadSpeed;
        roadImgs[i].style.left = `${roadPos[i]}px`;

        // INFINITE LOOP
        if (roadPos[i] <= -roadImgWidth) 
            roadPos[i] += roadImgWidth * roadImgs.length;
    }
}, roadSpeed); 
// #endregion

// #region PLAYER

// #region RUN ANIM
const totalSprintFrames = 8;
const sprintFrameWait = 80;
let curFrame = 0; 
let runAnimInterval;

function startRunAnim() {
    if (runAnimInterval) 
        clearInterval(runAnimInterval);
    
    runAnimInterval = setInterval(() => {
        curFrame = (curFrame + 1) % totalSprintFrames; 
        player.querySelector('img').src = `./assets/player_sprint/run00${curFrame}.png`; 
    }, sprintFrameWait);
}
startRunAnim()

// #endregion

// #region JUMP ANIM
const totalJumpFrames = 7;
const jumpFrameWait = 100;
let isJumping = false;
let isGrounded = true;
let jumpHeight = 250; 
let originalPos = player.offsetTop; 
let jumpTimer = null;
let landingTimer = null;

function jump() {
    if (isJumping || !isGrounded || isQuestionActive) return; 

    isJumping = true;
    isGrounded = false; 
    let curFrame = 0;
    
    originalPos = player.offsetTop;
    
    if (runAnimInterval) {
        clearInterval(runAnimInterval);
        runAnimInterval = null;
    }
    
    // Make jump faster and more responsive
    player.style.transition = 'top 0.25s cubic-bezier(0.1, 0, 0.3, 1)';
    player.style.top = `${originalPos - jumpHeight}px`; 

    // Anim
    const jumpInterval = setInterval(() => {
        if (curFrame < totalJumpFrames) {
            player.querySelector('img').src = `./assets/player_jump/jump00${curFrame}.png`; 
            curFrame++;
        } 
        else {
            clearInterval(jumpInterval);
            prepareLanding();
        }
    }, jumpFrameWait);
    
    jumpTimer = setTimeout(() => {
        if (jumpTimer) {
            clearTimeout(jumpTimer);
            jumpTimer = null;
            prepareLanding();
        }
    }, 250); // Shorter jump time
}

function prepareLanding() {
    if (!isJumping || landingTimer) return;
    
    player.style.transition = 'top 0.25s cubic-bezier(0.7, 0, 0.9, 1)';
    player.style.top = `${originalPos}px`;
    
    landingTimer = setTimeout(() => {
        isJumping = false;
        isGrounded = true;
        landingTimer = null;
        
        startRunAnim();
    }, 250); // Shorter landing time
}

// Listen when press SPACE
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (isQuestionActive) return; 
        jump();
    }

    if (e.code === 'Escape') 
        togglePause();
});

// #endregion

// #region SCORE

let score = 0;
let highScore = localStorage.getItem('highScore') || 0; 

function updateScore() {
    scoreText.textContent = `Điểm: ${score}`;
    highScoreText.textContent = `Kỉ lục: ${highScore}`;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore); 
    }
}

updateScore();

// #endregion

// #region OBSTACLES

const obstacles = [];
let obstacleSpeed = 10; 
let minObstacleInterval = 1800; 
let maxObstacleInterval = 3500; 
let lastObstacleTime = 0;
let gameOver = false;
let obstacleInterval;

function createObstacle() {
    if (gameOver || isQuestionActive || isPaused) return;
    
    const now = Date.now();
    if (now - lastObstacleTime < minObstacleInterval) return;
    
    // Check if there's an obstacle too close to the right edge
    const lastObstacle = obstacles[obstacles.length - 1];
    if (lastObstacle && window.innerWidth - lastObstacle.position < 300) {
        // Don't create a new obstacle if the last one is too close to the edge
        setTimeout(createObstacle, 500);
        return;
    }
    
    // Random stone
    const randomStoneNumber = Math.floor(Math.random() * 160) + 1;
    const stoneImgSrc = `./assets/stones/stone (${randomStoneNumber}).png`;
    
    // Create obstacle
    const obstacle = document.createElement('div');
    obstacle.className = 'obstacle';
    // random width
    obstacle.style.width = Math.floor(Math.random() * (120 - 70 + 1)) + 70 + 'px';
    
    // Create image 
    const img = document.createElement('img');
    img.src = stoneImgSrc;
    
    obstacle.appendChild(img);
    document.body.appendChild(obstacle);
    
    const obstacleRect = obstacle.getBoundingClientRect();
    obstacles.push({
        element: obstacle,
        position: window.innerWidth,
        width: obstacleRect.width,
        height: obstacleRect.height,
        passed: false
    });
    
    lastObstacleTime = now;
    
    const nextObstacleDelay = Math.random() * (maxObstacleInterval - minObstacleInterval) + minObstacleInterval;
    setTimeout(createObstacle, nextObstacleDelay);
}

function updateObstacles() {
    if (gameOver || isQuestionActive || isPaused) return;
    
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        obstacle.position -= obstacleSpeed;
        obstacle.element.style.left = `${obstacle.position}px`;
        
        // Check if obstacle is off-screen
        if (obstacle.position < -obstacle.width) {
            obstacle.element.remove();
            obstacles.splice(i, 1);
            i--;
            continue;
        }
        
        // Check if player passed obstacle
        const playerRect = player.getBoundingClientRect();
        if (!obstacle.passed && obstacle.position + obstacle.width < playerRect.left) {
            obstacle.passed = true;
            // Show question when player passes an obstacle
            showQuestion();
        }
        
        // Check collision 
        if (checkCollision(obstacle)) {
            handleGameOver();
            break;
        }
    }
    
    // Draw hitboxes for debugging
    if (window.debugMode) {
        drawHitboxes();
    }
}

// limits
const HITBOX_OFFSETS = {
    player: {
        running: {
            left: 200,
            right: 230,
            top: 150,
            bottom: 20
        },
        jumping: {
            left: 200,
            right: 230,
            top: 150,
            bottom: 300
        }
    },
    obstacle: {
        left: 15,
        right: 15,
        top: 10,
        bottom: 10
    }
};

function checkCollision(obstacle) {
    const playerRect = player.getBoundingClientRect();
    const obstacleRect = obstacle.element.getBoundingClientRect();
 
    const offsets = isJumping ? HITBOX_OFFSETS.player.jumping : HITBOX_OFFSETS.player.running;
    
    if (isJumping) {
        const playerTop = player.offsetTop;
        const jumpThreshold = originalPos - jumpHeight + 120;
        
        if (playerTop < jumpThreshold) 
            return false;
    }
    
    // create hitboxes
    const playerLeft = playerRect.left + offsets.left;
    const playerRight = playerRect.right - offsets.right;
    const playerTop = playerRect.top + offsets.top;
    const playerBottom = playerRect.bottom - offsets.bottom;
    
    const obstacleLeft = obstacleRect.left + HITBOX_OFFSETS.obstacle.left;
    const obstacleRight = obstacleRect.right - HITBOX_OFFSETS.obstacle.right;
    const obstacleTop = obstacleRect.top + HITBOX_OFFSETS.obstacle.top;
    const obstacleBottom = obstacleRect.bottom - HITBOX_OFFSETS.obstacle.bottom;
    
    // check collision
    return !(
        playerRight < obstacleLeft ||
        playerLeft > obstacleRight ||
        playerBottom < obstacleTop ||
        playerTop > obstacleBottom
    );
}
//#endregion

//#region HANDLE GAME WIN & OVER

function handleGameOver() {
    gameOver = true;
    clearInterval(runAnimInterval);
    clearInterval(obstacleInterval);
    clearInterval(roadLoop);
    
    playLoseSound();

    if (isQuestionActive) 
        hideQuestion();
    
    
    visibleNoti("Bạn đã thua! Nhấn Enter để chơi lại.", 10000);
    document.addEventListener('keydown', restartGame);
}

function checkWin() {
    if (questionCounter >= totalQuestion) 
        handleWin();
}

function handleWin() {
    gameOver = true;
    clearInterval(runAnimInterval);
    clearInterval(obstacleInterval);
    clearInterval(roadLoop);
    
    playWinSound();
    
    const gameTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('final-score').textContent = score;
    document.getElementById('total-time').textContent = formattedTime;
    document.getElementById('correct-answers').textContent = `${correctAns}/${totalQuestion}`;
    
    // Check if user is authenticated
    const auth = getAuth(app);
    const uid = auth.currentUser ? auth.currentUser.uid : null;

    if (uid) saveGameRes(score, formattedTime, correctAns);
    
    else  visibleNoti("Bạn cần đăng nhập để lưu kết quả!", 3000); 
    

    const summaryContainer = document.getElementById('win-summary');
    summaryContainer.classList.add('active');
    
    // Restart game
    document.getElementById('restart-btn').onclick = function() {
        summaryContainer.classList.remove('active');
        restartGame({ type: 'click' });
    };
    
    // Return to homepage
    document.getElementById('home-btn').onclick = function() {
        window.location.href = "./index.html";
    };
}

function restartGame(e) {
    if ((e.code === 'Enter' && gameOver) || e.type === 'click') {
        document.removeEventListener('keydown', restartGame);
        stopAllSounds(); 
        
        // Reset game 
        gameOver = false;
        score = 0;
        updateScore();
        
        // Reset
        gameStartTime = Date.now();
        correctAns = 0;
        questionCounter = 0;
        
        // Remove all obstacles
        obstacles.forEach(obstacle => obstacle.element.remove());
        obstacles.length = 0; 
        
        // Reset player
        player.style.top = `${originalPos}px`;
        isJumping = false;
        isGrounded = true;
        
        restartWithNewTrack(); 
        startRunAnim();
        startGameLoops();
        visibleNoti("Trò chơi bắt đầu lại! Chúc bạn may mắn.", 2000);
    }
}

function updateRoad() {
    for (let i = 0; i < roadImgs.length; i++) {
        // MOVE ROAD IMGS
        roadPos[i] -= roadSpeed;
        roadImgs[i].style.left = `${roadPos[i]}px`;

        // INFINITE LOOP
        if (roadPos[i] <= -roadImgWidth) 
            roadPos[i] += roadImgWidth * roadImgs.length;
    }
}

function startGameLoops() {
    clearInterval(roadLoop);
    roadLoop = setInterval(updateRoad, roadSpeed);
    
    obstacleInterval = setInterval(updateObstacles, 16);
    createObstacle();
    
    setInterval(() => {
        if (!gameOver && !isQuestionActive && obstacleSpeed < 150) { 
            obstacleSpeed += 3;
            roadSpeed += 3;
            minObstacleInterval = Math.max(1200, minObstacleInterval - 30); 
        }
    }, 15000); 
}

// #endregion

// #region QUESTIONS

const totalQuestion = 2;

let questionTimer;
let currentQuestion;
let isQuestionActive = false;
let questionCounter = 0;
let correctAns = 0;

function showQuestion() {
    if (isQuestionActive || gameOver ||isPaused) return;
    
    isQuestionActive = true;
    questionCounter++;
    
    // Pause game
    clearInterval(obstacleInterval);
    
    // Get a question
    currentQuestion = getNextQuestion();
    
    // Display question
    questionElement.textContent = currentQuestion.question;
    
    // Display options
    optionsElements.forEach((option, index) => {
        const optionText = option.querySelector('.option-text');
        optionText.textContent = currentQuestion.options[index];
        
        // Reset option styling
        option.classList.remove('correct', 'incorrect', 'selected');
        
        // Add click e
        option.onclick = () => selectOption(index);
    });
    
    // Update question counter
    currentQuestionElement.textContent = questionCounter;
    totalQuestionsElement.textContent = questions.length;
    
    // Show board
    board.style.display = 'flex';
    
    // Start timer
    let timeLeft = 10;
    timeLeftElement.textContent = timeLeft;
    
    // Add timer styles if needed
    
    questionTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('time-left').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            // Time's up
            clearInterval(questionTimer);
            handleTimeUp();
        }
    }, 1000);
    
    // Hide next button initially
    nextButton.style.display = 'none';
    
    // Add next button e
    nextButton.onclick = hideQuestion;
}

function selectOption(index) {
    if (!isQuestionActive) return;
    clearInterval(questionTimer);
    
    optionsElements.forEach(option => option.classList.remove('selected'));
    optionsElements[index].classList.add('selected');
    
    // Check if answer is correct
    const isCorrect = index === currentQuestion.correctAnswer;
    
    if (isCorrect) {
        optionsElements[index].classList.add('correct');

        score += 10; 
        correctAns++; 

        updateScore();
        visibleNoti("Đúng! +10 điểm", 2000);
    } else {
        optionsElements[index].classList.add('incorrect');
        optionsElements[currentQuestion.correctAnswer].classList.add('correct');
        visibleNoti("Sai rồi!", 2000);
    }
    
    // Show next button
    nextButton.style.display = 'block';
}

function handleTimeUp() {
    visibleNoti("Hết giờ!", 2000);
    setTimeout(hideQuestion, 2000);

    nextButton.style.display = 'none';
}

function hideQuestion() {
    if (!isQuestionActive) return;
    
    board.style.display = 'none';
    clearInterval(questionTimer);
    
    checkWin();
    if (gameOver) return;
    
    // Resume game
    isQuestionActive = false;
    obstacleInterval = setInterval(updateObstacles, 16);
    
    setTimeout(createObstacle, 1000);
}

// #endregion

// #region PAUSE GAME
let isPaused = false;
let pausedTime = 0;

function pauseGame() {
    if (gameOver || isQuestionActive || isPaused) return;

    isPaused = true;

    // Pause all intervals
    clearInterval(runAnimInterval);
    clearInterval(obstacleInterval);
    clearInterval(roadLoop);
    if (questionTimer) clearInterval(questionTimer);

    // Show pause menu
    document.getElementById('pause-menu').style.display = 'flex';

    pausedTime = Date.now();
    visibleNoti("Tạm dừng trò chơi", 1000);
}

function resumeGame() {
    if (!isPaused) return;

    isPaused = false;

    // Resume all intervals
    startRunAnim();
    obstacleInterval = setInterval(updateObstacles, 16);
    roadLoop = setInterval(updateRoad, roadSpeed);
    
    // Resume question timer if active
    if (isQuestionActive && timeLeftElement.textContent > 0) {
        let timeLeft = parseInt(timeLeftElement.textContent);
        questionTimer = setInterval(() => {
            timeLeft--;
            timeLeftElement.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(questionTimer);
                handleTimeUp();
            }
        }, 1000);
    }

    // Hide pause menu
    document.getElementById('pause-menu').style.display = 'none';
    visibleNoti("Tiếp tục trò chơi", 1000);
}

function togglePause() {
    if (isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}
// #endregion

// #region START GAME

window.addEventListener('load', async () => {
    await loadQuestions();

    document.getElementById("pause-menu").style.display = "none";

    // reset audio on click
    document.addEventListener('click', function initAudioOnFirstInteraction() {
        initAudio();
        document.removeEventListener('click', initAudioOnFirstInteraction);
        restartWithNewTrack();
    }, { once: true });

    // reset audio on spacebar
    document.addEventListener('keydown', function initAudioOnFirstKey(e) {
        if (e.code === 'Space') {
            initAudio();
            document.removeEventListener('keydown', initAudioOnFirstKey);
            restartWithNewTrack();
        }
    }, { once: true });

    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    
    document.getElementById('restart-btn-pause').addEventListener('click', (e) => {
        document.getElementById('pause-menu').style.display = 'none';
        isPaused = false;
        restartGame(e);
    });
    document.getElementById('menu-btn').addEventListener('click', () => {
        window.location.href = "./index.html";
    });
    
    document.getElementById("total-questions").textContent = questions.length;
    document.getElementById("board").style.display = "none";
    
    startGameLoops();
    restartWithNewTrack(); 
    visibleNoti("Bấm phím CÁCH để nhảy!", 3000);
});
//#endregion