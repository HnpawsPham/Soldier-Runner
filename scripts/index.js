import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { setData, app, getData } from './firebase.js';
import { visibleNoti } from './noti.js';

const form = document.querySelector("form");
const nameInp = document.getElementById("name");
const passInp = document.getElementById("password");
const unitInp = document.getElementById("unit");
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
const unitNames = {
    "phong-nghiep-vu-1": "Phòng Nghiệp vụ 1",
    "phong-nghiep-vu-2": "Phòng Nghiệp vụ 2",
    "van-phong": "Văn phòng",
    "phong-kiem-tra-gqkntc": "Phòng Kiểm tra GQKNTC",
    "phong-ke-hoach-tai-chinh": "Phòng Kế hoạch Tài chính",
    "phong-to-chuc-can-bo": "Phòng Tổ chức Cán bộ"
};

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    let name = nameInp.value.trim();
    const password = passInp.value.trim();
    const unit = unitInp.value;

    // Sanitize the name
    name = name.replace(/[^a-zA-Z0-9]/g, ""); 

    // Validate input
    if (name === "" || password === "" || unit === "") { 
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
            unit: unit, 
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
                visibleNoti("Đã xảy ra lỗi, vui lòng kiểm tra lại thông tin đăng nhập!", 3000);
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
        const entries = {};
    
        Object.entries(leaderboardData).forEach(([uid, timestamps]) => {
            Object.entries(timestamps).forEach(([timestamp, res]) => {
                const score = res.score || 0;
                let time = 0;
                if (res.totalTime && res.totalTime !== 'N/A') {
                    const timeParts = res.totalTime.split(':');
                    if (timeParts.length === 2) {
                        time = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
                    }
                }

                // check if user is checked to make sure there's no duplication
                if (!entries[uid]) {
                    entries[uid] = {
                        name: usersData && usersData[uid] ? usersData[uid].name : 'Người chơi',
                        score: score,
                        time: time,
                        unit: usersData && usersData[uid] ? usersData[uid].unit : 'N/A',
                        formattedTime: res.totalTime || 'N/A', 
                        timestamp: parseInt(timestamp)
                    };
                } else {
                    //  update if this attempt is better
                    if (score > entries[uid].score || 
                        (score === entries[uid].score && time < entries[uid].time)) {
                        entries[uid].score = score;
                        entries[uid].time = time;
                        entries[uid].unit = usersData && usersData[uid] ? usersData[uid].unit : 'N/A';
                        entries[uid].formattedTime = res.totalTime || 'N/A'; 
                        entries[uid].timestamp = parseInt(timestamp);
                    }
                }
            });
        });
    
        // sort
        const sortedEntries = Object.entries(entries).map(([uid, data]) => ({ uid, ...data }));
        sortedEntries.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.time - b.time; 
        });
    
        // top 10
        const top10Entries = sortedEntries.slice(0, 10);
    
        top10Entries.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.name}</td>
                <td>${entry.score}</td>
                <td>${entry.unit !== 'N/A' ? unitNames[entry.unit] : 'N/A'}</td>
                <td>${entry.formattedTime !== 'N/A' ? entry.formattedTime : 'N/A'}</td>
                <td>${new Date(entry.timestamp).toLocaleString()}</td> <!-- Hiển thị thời gian -->
            `;
            leaderboardBody.appendChild(row);
        });
    } else {
        leaderboardBody.innerHTML = '<tr><td colspan="6">Chưa có dữ liệu.</td></tr>';
    }
}

loadLeaderboard();
//#endregion