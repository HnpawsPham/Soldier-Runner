export let questions = [];
export let currentQuestionIndex = 0;

export async function loadQuestions() {
    try {
        const response = await fetch('./questions.json');
        const data = await response.json();
        questions = data.questions; 
      
        shuffleArray(questions);
        return questions;
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

export function getNextQuestion() {
    if (currentQuestionIndex >= questions.length) {
        currentQuestionIndex = 0;
     
        shuffleArray(questions);
    }
    
    return questions[currentQuestionIndex++];
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}