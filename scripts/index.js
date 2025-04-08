import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { setData, app, getData } from './firebase.js';
import { visibleNoti } from './noti.js';

const form = document.querySelector("form");
const nameInp = document.getElementById("name");
const passInp = document.getElementById("password");
const startGameBtn = document.getElementById("start-btn");

//#region SIGNUP

const auth = getAuth(app);

// Start btn handle
function startGame() {
    const user = auth.currentUser; 

    // Check if the user is logged in
    if (user) window.location.href = "./game.html";

    else visibleNoti("Bạn cần đăng ký trước!", 3000);
}

startGameBtn.addEventListener("click", () => startGame());

// Form submit handle
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    let name = nameInp.value.trim();
    const password = passInp.value.trim();

    // Sanitize the name
    name = name.replace(/[^a-zA-Z0-9]/g, ""); 

    // Validate input
    if (name === "" || password === "") {
        visibleNoti("Vui lòng nhập đầy đủ thông tin!", 3000);
        return;
    }

    // Check password length
    if (password.length < 6) {
        visibleNoti("Mật khẩu phải có ít nhất 6 ký tự!", 3000);
        return;
    }

    // Check if user already exists
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, name + "@example.com", password); // Use a unique email
        const uid = userCredential.user.uid;

        // Prepare data
        const userData = {
            name: name,
        };

        // Send data
        await setData(`users/${uid}`, userData); 
        visibleNoti("Đăng ký thành công!", 3000);
        form.reset(); 
        
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            // log in if the account already exists
            try {
                const userCredential = await signInWithEmailAndPassword(auth, name + "@example.com", password);
                visibleNoti("Đăng nhập thành công!", 3000);
                form.reset(); 
            } 
            catch (loginError) {
                console.error("Error logging in:", loginError);
                visibleNoti("Đã xảy ra lỗi khi đăng nhập, vui lòng thử lại!", 3000);
            }
        } 
        else {
            console.error("Error saving data:", error);
            visibleNoti("Đã xảy ra lỗi, vui lòng thử lại!", 3000);
        }
    }
});
//#endregion

//#region LEADERBOARD
async function loadLeaderboard() {
    const leaderboardData = await getData('result'); 
    const usersData = await getData('users'); 

    const leaderboardBody = document.getElementById('leaderboard-body');
    leaderboardBody.innerHTML = ''; 

    if (leaderboardData) {
        const entries = [];
    
        Object.entries(leaderboardData).forEach(([uid, timestamps]) => {
            Object.entries(timestamps).forEach(([timestamp, res]) => {
                let totalTimeInSeconds = 0;
                if (res.totalTime && res.totalTime !== 'N/A') {
                    const timeParts = res.totalTime.split(':');
                    if (timeParts.length === 2) {
                        totalTimeInSeconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
                    }
                }
    
                entries.push({
                    uid,
                    name: usersData && usersData[uid] ? usersData[uid].name : 'Người chơi',
                    score: res.score || 0,
                    totalTime: res.totalTime || 'N/A',
                    totalTimeInSeconds: totalTimeInSeconds,
                    formattedTime: new Date(parseInt(timestamp)).toLocaleString(),
                    timestamp: parseInt(timestamp)
                });
            });
        });
    
        entries.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
    
            if (a.totalTimeInSeconds !== b.totalTimeInSeconds) {
                return a.totalTimeInSeconds - b.totalTimeInSeconds;
            }
    
            return b.timestamp - a.timestamp;
        });
    
        // top 10
        const top10Entries = entries.slice(0, 10);
    
        top10Entries.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.name}</td>
                <td>${entry.score}</td>
                <td>${entry.totalTime}</td>
                <td>${entry.formattedTime}</td>
            `;
            leaderboardBody.appendChild(row);
        });
    } else {
        leaderboardBody.innerHTML = '<tr><td colspan="5">Chưa có dữ liệu.</td></tr>';
    }
}

loadLeaderboard();
//#endregion