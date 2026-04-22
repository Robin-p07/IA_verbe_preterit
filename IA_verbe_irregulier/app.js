// --- Smart Learning Engine ---

class LearningEngine {
    constructor(verbs) {
        this.verbs = verbs;
        this.userData = this.loadData();
        this.syncVerbs();
    }

    loadData() {
        const stored = localStorage.getItem('smartVerbsData');
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            stats: { totalAttempts: 0, correctAttempts: 0, currentStreak: 0 },
            verbsWeights: {} // weight > 1 means user struggles with it
        };
    }

    saveData() {
        localStorage.setItem('smartVerbsData', JSON.stringify(this.userData));
    }

    syncVerbs() {
        // Initialize weights for new verbs
        this.verbs.forEach(v => {
            if (!this.userData.verbsWeights[v.base]) {
                this.userData.verbsWeights[v.base] = 1; // Base weight
            }
        });
        this.saveData();
    }

    getNextVerb() {
        // Weighted random selection
        const weights = this.verbs.map(v => this.userData.verbsWeights[v.base]);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        
        let random = Math.random() * totalWeight;
        for (let i = 0; i < this.verbs.length; i++) {
            if (random < weights[i]) {
                return this.verbs[i];
            }
            random -= weights[i];
        }
        return this.verbs[0];
    }

    recordAttempt(verb, isCorrect) {
        this.userData.stats.totalAttempts++;
        
        let weight = this.userData.verbsWeights[verb.base];
        
        if (isCorrect) {
            this.userData.stats.correctAttempts++;
            this.userData.stats.currentStreak++;
            // Decrease weight, min 0.5
            this.userData.verbsWeights[verb.base] = Math.max(0.5, weight - 0.5);
        } else {
            this.userData.stats.currentStreak = 0;
            // Increase weight significantly on error
            this.userData.verbsWeights[verb.base] = weight + 2;
        }
        
        this.saveData();
    }

    getStats() {
        const { totalAttempts, correctAttempts, currentStreak } = this.userData.stats;
        const accuracy = totalAttempts === 0 ? 0 : Math.round((correctAttempts / totalAttempts) * 100);
        return { score: currentStreak, accuracy };
    }
}

// --- App Logic ---

document.addEventListener('DOMContentLoaded', () => {
    const engine = new LearningEngine(irregularVerbs);
    let currentVerb = null;
    let isWaitingForNext = false;

    // DOM Elements
    const form = document.getElementById('quiz-form');
    const inputBase = document.getElementById('input-base');
    const inputPast = document.getElementById('input-past');
    const inputParticiple = document.getElementById('input-participle');
    const elVerbFr = document.getElementById('current-verb-fr');
    const elScore = document.getElementById('score-display');
    const elAccuracy = document.getElementById('accuracy-display');
    const feedbackMsg = document.getElementById('feedback-msg');
    const submitBtn = document.getElementById('submit-btn');
    const nextBtn = document.getElementById('next-btn');
    const themeToggle = document.getElementById('theme-toggle');

    // Theme Management
    const initTheme = () => {
        const savedTheme = localStorage.getItem('smartVerbsTheme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    };

    const toggleTheme = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('smartVerbsTheme', next);
        updateThemeIcon(next);
    };

    const updateThemeIcon = (theme) => {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    };

    themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    // Save / Load System
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    exportBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(engine.userData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const exportFileDefaultName = 'smartVerbs_sauvegarde.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', url);
        linkElement.setAttribute('download', exportFileDefaultName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && importedData.stats && importedData.verbsWeights) {
                    localStorage.setItem('smartVerbsData', JSON.stringify(importedData));
                    alert("Progression chargée avec succès !");
                    location.reload(); // Reload to apply changes
                } else {
                    alert("Le fichier de sauvegarde est invalide.");
                }
            } catch (err) {
                alert("Erreur lors de la lecture du fichier.");
            }
        };
        reader.readAsText(file);
    });

    // Game Functions
    const updateStatsDisplay = () => {
        const stats = engine.getStats();
        elScore.textContent = `🎯 Streak: ${stats.score}`;
        elAccuracy.textContent = `📈 Réussite: ${stats.accuracy}%`;
    };

    const loadNextVerb = () => {
        currentVerb = engine.getNextVerb();
        elVerbFr.textContent = currentVerb.fr;
        
        // Reset UI
        inputBase.value = '';
        inputPast.value = '';
        inputParticiple.value = '';
        inputBase.className = '';
        inputPast.className = '';
        inputParticiple.className = '';
        
        feedbackMsg.className = 'feedback';
        feedbackMsg.innerHTML = '';
        
        submitBtn.style.display = 'block';
        nextBtn.style.display = 'none';
        isWaitingForNext = false;
        
        inputBase.focus();
    };

    const checkAnswer = (inputVal, correctVals) => {
        const val = inputVal.trim().toLowerCase();
        return correctVals.includes(val);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isWaitingForNext) return;

        const valBase = inputBase.value;
        const valPast = inputPast.value;
        const valParticiple = inputParticiple.value;

        const isBaseCorrect = checkAnswer(valBase, [currentVerb.base]);
        const isPastCorrect = checkAnswer(valPast, [currentVerb.past, currentVerb.pastAlt].filter(Boolean));
        const isParticipleCorrect = checkAnswer(valParticiple, [currentVerb.participle, currentVerb.participleAlt].filter(Boolean));

        const isAllCorrect = isBaseCorrect && isPastCorrect && isParticipleCorrect;

        // UI Feedback
        inputBase.className = isBaseCorrect ? 'correct-pulse' : 'error-shake';
        inputPast.className = isPastCorrect ? 'correct-pulse' : 'error-shake';
        inputParticiple.className = isParticipleCorrect ? 'correct-pulse' : 'error-shake';

        if (isAllCorrect) {
            feedbackMsg.className = 'feedback show correct';
            feedbackMsg.innerHTML = `<h3>Excellent ! 🎉</h3><p>Bonne réponse.</p>`;
            setTimeout(() => {
                loadNextVerb();
            }, 1200);
        } else {
            feedbackMsg.className = 'feedback show incorrect';
            feedbackMsg.innerHTML = `
                <h3>Oups ! 😕</h3>
                <p>Voici les bonnes réponses :</p>
                <table class="correction-table">
                    <tr><th>Base</th><th>Prétérit</th><th>Participe</th></tr>
                    <tr>
                        <td>${currentVerb.base}</td>
                        <td>${currentVerb.past}</td>
                        <td>${currentVerb.participle}</td>
                    </tr>
                </table>
            `;
            submitBtn.style.display = 'none';
            nextBtn.style.display = 'block';
            isWaitingForNext = true;
            nextBtn.focus();
        }

        // Record attempt to adjust weights
        engine.recordAttempt(currentVerb, isAllCorrect);
        updateStatsDisplay();
    };

    form.addEventListener('submit', handleSubmit);
    nextBtn.addEventListener('click', loadNextVerb);

    // Initial load
    updateStatsDisplay();
    loadNextVerb();
});
