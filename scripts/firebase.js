import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, set, get, child, remove } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAIvi5X5gMsXhVh3EJ_49sw3JlV44Pf86I",
    authDomain: "soldier-runner.firebaseapp.com",
    databaseURL: "soldier-runner-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "soldier-runner",
    storageBucket: "soldier-runner.firebasestorage.app",
    messagingSenderId: "896889544587",
    appId: "1:896889544587:web:ab5bec242f1cf0228d198e"
};

export const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export async function setData(name, data) {
  try {
      await set(ref(db, name), data);
  } catch (err) {
      console.error("Error:", err);
      throw err; 
  }
}

export async function getData(name) {
  try {
    const snapshot = await get(child(ref(db), name));
    if (snapshot.exists()) return snapshot.val();
    else {
      console.log(`Path '${name}' does not exist.`);
      return null;
    }
  }
  catch (err) {
    console.log(err.message);
    return null
  }
}

export async function delData(name) {
  remove(ref(db, name))
    .catch(err => {
      console.log(err.message);
    })
}

export async function saveGameRes(score, totalTime, correctAnswers) {
  const uid = getAuth(app).currentUser.uid; 

  if (!uid) {
    console.error("User is not authenticated. Cannot save game results.");
    return;
  }

  const gameData = {
      score: score,
      totalTime: totalTime,
      correctAnswers: correctAnswers,
      timestamp: Date.now() 
  };

  try {
      await set(ref(db, `result/${uid}/${Date.now()}`), gameData); 
      console.log("Game results saved successfully!");
  } catch (error) {
      console.error("Error saving game results:", error);
  }
}