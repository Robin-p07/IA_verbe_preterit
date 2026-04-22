// --- Smart Learning Engine ---

class SessionEngine {
    constructor(allVerbs) {
        this.allVerbs = allVerbs;
        this.queue = [];
        this.history = [];
        this.errorsList = [];
        this.totalSessionVerbs = 0;
        this.currentScore = 0;
        this.phase = 1;
    }

    startSession(count) {
        let verbsToUse = [...this.allVerbs];
        verbsToUse.sort(() => Math.random() - 0.5); // Shuffle
        if (count && count > 0 && count < verbsToUse.length) {
            verbsToUse = verbsToUse.slice(0, count);
        }
        this.queue = verbsToUse;
        this.totalSessionVerbs = this.queue.length;
        this.history = [];
        this.errorsList = [];
        this.currentScore = 0;
        this.phase = 1;
    }
    
    startRetry() {
        this.queue = [...this.errorsList];
        this.errorsList = [];
        this.phase = 2;
    }

    getNextVerb() {
        return this.queue.length > 0 ? this.queue[0] : null;
    }

    getRemainingCount() {
        return this.queue.length;
    }

    recordAttempt(verb, isCorrect, userAnswers) {
        if (this.phase === 1) {
            if (isCorrect) {
                this.currentScore += 1;
            } else {
                this.errorsList.push(verb);
            }
        } else if (this.phase === 2) {
            if (isCorrect) {
                this.currentScore += 0.5;
            }
        }
        
        // Add to history with phase tag
        this.history.push({ verb, isCorrect, userAnswers, phase: this.phase });
        
        this.queue.shift(); // Remove from front
    }
    
    getState() {
        return {
            queue: this.queue,
            history: this.history,
            errorsList: this.errorsList,
            totalSessionVerbs: this.totalSessionVerbs,
            currentScore: this.currentScore,
            phase: this.phase
        };
    }
    
    loadState(state) {
        this.queue = state.queue || [];
        this.history = state.history || [];
        this.errorsList = state.errorsList || [];
        this.totalSessionVerbs = state.totalSessionVerbs || 0;
        this.currentScore = state.currentScore || 0;
        this.phase = state.phase || 1;
    }
}

// --- App Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    let irregularVerbs = [];
    const engine = new SessionEngine(irregularVerbs);
    let currentVerb = null;
    let isWaitingForNext = false;

    // Fetch verbs from API
    try {
        const res = await fetch('/api/verbs');
        irregularVerbs = await res.json();
        engine.allVerbs = irregularVerbs;
        
        // Update UI with max verbs info
        const maxDisplay = document.getElementById('max-verbs-display');
        const countInput = document.getElementById('session-count');
        if (maxDisplay) maxDisplay.textContent = `(Max: ${irregularVerbs.length})`;
        if (countInput) countInput.max = irregularVerbs.length;
    } catch (e) {
        console.error("Failed to load verbs", e);
    }

    // DOM Elements - UI
    // DOM Elements - UI
    const setupView = document.getElementById('setup-view');
    const quizView = document.getElementById('quiz-view');
    const resultView = document.getElementById('result-view');
    const logoutBtn = document.getElementById('logout-btn');
    const changePwdBtn = document.getElementById('change-pwd-btn');
    
    // Setup Form
    const setupForm = document.getElementById('setup-form');
    const sessionCountInput = document.getElementById('session-count');
    const startAllBtn = document.getElementById('start-all-btn');

    // Quiz Form
    const quizForm = document.getElementById('quiz-form');
    const inputBase = document.getElementById('input-base');
    const inputPast = document.getElementById('input-past');
    const inputParticiple = document.getElementById('input-participle');
    const elVerbFr = document.getElementById('current-verb-fr');
    const elProgress = document.getElementById('progress-display');
    const elAccuracy = document.getElementById('session-accuracy-display');
    const feedbackMsg = document.getElementById('feedback-msg');
    const submitBtn = document.getElementById('submit-btn');
    const nextBtn = document.getElementById('next-btn');
    const quitBtn = document.getElementById('quit-btn');

    // Result UI
    const finalScore = document.getElementById('final-score');
    const historyList = document.getElementById('history-list');
    const restartBtn = document.getElementById('restart-btn');
    const retryBtn = document.getElementById('retry-btn');
    
    // Auth & Init Logic
    let savedSessionState = null;
    const resumeContainer = document.getElementById('resume-container');
    const resumeInfo = document.getElementById('resume-info');

    // Parse saved session from window.APP_DATA
    if (window.APP_DATA && window.APP_DATA.statsJson) {
        if (window.APP_DATA.statsJson.savedSession && window.APP_DATA.statsJson.savedSession.queue && window.APP_DATA.statsJson.savedSession.queue.length > 0) {
            savedSessionState = window.APP_DATA.statsJson.savedSession;
        }
    }
    
    setupView.style.display = 'block';
    if (savedSessionState) {
        setupForm.style.display = 'none';
        if (resumeContainer) {
            resumeContainer.style.display = 'block';
            resumeInfo.textContent = `Session en cours (Tour ${savedSessionState.phase}) - Il reste ${savedSessionState.queue.length} verbe(s) à traduire.`;
        }
    } else {
        setupForm.style.display = 'block';
        if (resumeContainer) resumeContainer.style.display = 'none';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login';
        });
    }

    // Password logic
    const pwdModal = document.getElementById('pwd-modal');
    if (pwdModal) {
        changePwdBtn.addEventListener('click', () => pwdModal.style.display = 'flex');
        document.getElementById('close-pwd-btn').addEventListener('click', () => pwdModal.style.display = 'none');
        
        document.getElementById('pwd-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPwd = document.getElementById('new-pwd').value;
            try {
                const res = await fetch('/api/user/password', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({new_password: newPwd})
                });
                if (res.ok) {
                    alert("Mot de passe modifié avec succès !");
                    pwdModal.style.display = 'none';
                    document.getElementById('new-pwd').value = '';
                } else {
                    alert("Erreur lors de la modification.");
                }
            } catch (e) { alert("Erreur réseau"); }
        });
    }

    // Theme Management and other UI logic...
    const themeToggle = document.getElementById('theme-toggle');
    const initTheme = () => {
        const savedTheme = localStorage.getItem('smartVerbsTheme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    };
    themeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('smartVerbsTheme', next);
        themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    });
    initTheme();

    // Game Functions
    const saveSessionToServer = async (state) => {
        try {
            await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ savedSession: state })
            });
        } catch(e) { console.error("Save failed", e); }
    };

    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const count = parseInt(sessionCountInput.value);
        startSession(isNaN(count) ? null : count);
    });

    startAllBtn.addEventListener('click', () => {
        startSession(null);
    });

    if (document.getElementById('resume-btn')) {
        document.getElementById('resume-btn').addEventListener('click', () => {
            if (savedSessionState) {
                engine.loadState(savedSessionState);
                setupView.style.display = 'none';
                quizView.style.display = 'block';
                updateStatsDisplay();
                loadNextVerb();
            }
        });
    }

    if (document.getElementById('discard-btn')) {
        document.getElementById('discard-btn').addEventListener('click', () => {
            if(confirm("Êtes-vous sûr de vouloir abandonner cette session ? Toute progression sera perdue.")) {
                savedSessionState = null;
                saveSessionToServer(null); // Clear from server
                resumeContainer.style.display = 'none';
                setupForm.style.display = 'block';
            }
        });
    }

    restartBtn.addEventListener('click', () => {
        resultView.style.display = 'none';
        setupForm.style.display = 'block';
        if(resumeContainer) resumeContainer.style.display = 'none';
        setupView.style.display = 'block';
    });

    retryBtn.addEventListener('click', () => {
        engine.startRetry();
        resultView.style.display = 'none';
        quizView.style.display = 'block';
        updateStatsDisplay();
        loadNextVerb();
    });

    quitBtn.addEventListener('click', () => {
        if(confirm("Êtes-vous sûr de vouloir quitter la session en cours ? Elle sera sauvegardée.")) {
            saveSessionToServer(engine.getState());
            quizView.style.display = 'none';
            
            // update UI immediately to show resume
            savedSessionState = engine.getState();
            setupForm.style.display = 'none';
            resumeContainer.style.display = 'block';
            resumeInfo.textContent = `Session en cours (Tour ${savedSessionState.phase}) - Il reste ${savedSessionState.queue.length} verbe(s) à traduire.`;
            
            setupView.style.display = 'block';
        }
    });

    const startSession = (count) => {
        engine.startSession(count);
        saveSessionToServer(engine.getState()); // Initial save
        setupView.style.display = 'none';
        quizView.style.display = 'block';
        updateStatsDisplay();
        loadNextVerb();
    };

    const updateStatsDisplay = () => {
        const remaining = engine.getRemainingCount();
        elProgress.textContent = `Reste dans la file: ${remaining} (Tour ${engine.phase})`;
        
        // Show current score based on initial count
        const currentTotal = engine.totalSessionVerbs;
        const scoreStr = engine.currentScore % 1 === 0 ? engine.currentScore : engine.currentScore.toFixed(1);
        elAccuracy.textContent = `🎯 Score: ${scoreStr} / ${currentTotal}`;
    };

    const loadNextVerb = () => {
        currentVerb = engine.getNextVerb();
        
        if (!currentVerb) {
            showResults();
            return;
        }

        elVerbFr.textContent = currentVerb.fr;
        
        inputBase.value = ''; inputPast.value = ''; inputParticiple.value = '';
        inputBase.className = ''; inputPast.className = ''; inputParticiple.className = '';
        
        feedbackMsg.className = 'feedback';
        feedbackMsg.innerHTML = '';
        
        submitBtn.style.display = 'block';
        nextBtn.style.display = 'none';
        isWaitingForNext = false;
        
        inputBase.focus();
    };

    const showResults = () => {
        quizView.style.display = 'none';
        resultView.style.display = 'block';
        
        const scoreStr = engine.currentScore % 1 === 0 ? engine.currentScore : engine.currentScore.toFixed(1);
        finalScore.textContent = `Score final : ${scoreStr} / ${engine.totalSessionVerbs}`;
        finalScore.style.color = '#FFBF00';
        finalScore.style.textShadow = '0 1px 2px rgba(0,0,0,0.1)'; // Slight shadow for readability on light backgrounds
        historyList.innerHTML = '';
        
        if (engine.errorsList.length > 0 && engine.phase === 1) {
            retryBtn.style.display = 'inline-block';
            retryBtn.textContent = `Améliorer mon score (${engine.errorsList.length} erreurs)`;
        } else {
            retryBtn.style.display = 'none';
        }
        
        const mergedHistoryMap = new Map();
        engine.history.forEach(attempt => {
            mergedHistoryMap.set(attempt.verb.id, attempt); // Keeps the last attempt
        });
        const mergedHistory = Array.from(mergedHistoryMap.values());
        
        const check = (inputVal, expectedVals) => {
            if (!inputVal) return false;
            return expectedVals.map(v => v.toLowerCase()).includes(inputVal.trim().toLowerCase());
        };

        const formatCell = (expectedStr, expectedArr, userStr) => {
            const isCorrect = check(userStr, expectedArr);
            if (isCorrect) {
                return `<span class="history-text-correct">${userStr || expectedStr}</span>`;
            } else {
                const displayUser = userStr ? userStr : '(vide)';
                return `<span class="history-text-error">${displayUser}</span><span class="history-text-expected">${expectedStr}</span>`;
            }
        };

        let tableHTML = `
            <div class="history-table-wrapper">
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Verbe (FR)</th>
                            <th>Base verbale</th>
                            <th>Prétérit</th>
                            <th>Participe passé</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        mergedHistory.forEach((attempt) => {
            const v = attempt.verb;
            const u = attempt.userAnswers;
            
            const baseCell = formatCell(v.base, [v.base], u.base);
            const pastExpectedStr = v.pastAlt ? `${v.past} / ${v.pastAlt}` : v.past;
            const pastCell = formatCell(pastExpectedStr, [v.past, v.pastAlt].filter(Boolean), u.past);
            const partExpectedStr = v.participleAlt ? `${v.participle} / ${v.participleAlt}` : v.participle;
            const partCell = formatCell(partExpectedStr, [v.participle, v.participleAlt].filter(Boolean), u.participle);
            
            const frColor = attempt.isCorrect ? 'var(--success-text)' : 'var(--error-text)';
            
            tableHTML += `
                <tr>
                    <td><strong style="color: ${frColor};">${v.fr}</strong></td>
                    <td>${baseCell}</td>
                    <td>${pastCell}</td>
                    <td>${partCell}</td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table></div>`;
        historyList.innerHTML = tableHTML;
        
        saveSessionToServer(null); // Clear from server as session is fully done
    };

    const checkAnswer = (inputVal, correctVals) => correctVals.includes(inputVal.trim().toLowerCase());

    quizForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (isWaitingForNext) return;

        const valBase = inputBase.value;
        const valPast = inputPast.value;
        const valParticiple = inputParticiple.value;

        const isBaseCorrect = checkAnswer(valBase, [currentVerb.base]);
        const isPastCorrect = checkAnswer(valPast, [currentVerb.past, currentVerb.pastAlt].filter(Boolean));
        const isParticipleCorrect = checkAnswer(valParticiple, [currentVerb.participle, currentVerb.participleAlt].filter(Boolean));

        const isAllCorrect = isBaseCorrect && isPastCorrect && isParticipleCorrect;

        inputBase.className = isBaseCorrect ? 'correct-pulse' : 'error-shake';
        inputPast.className = isPastCorrect ? 'correct-pulse' : 'error-shake';
        inputParticiple.className = isParticipleCorrect ? 'correct-pulse' : 'error-shake';

        engine.recordAttempt(currentVerb, isAllCorrect, {
            base: valBase,
            past: valPast,
            participle: valParticiple
        });
        updateStatsDisplay();

        if (isAllCorrect) {
            feedbackMsg.className = 'feedback show correct';
            feedbackMsg.innerHTML = `<h3>Excellent ! 🎉</h3><p>Bonne réponse.</p>`;
            setTimeout(() => { loadNextVerb(); }, 1200);
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
            nextBtn.textContent = engine.getRemainingCount() === 0 ? "Voir mon résultat" : "Verbe suivant ➔";
            isWaitingForNext = true;
            nextBtn.focus();
        }
    });

    nextBtn.addEventListener('click', loadNextVerb);
});
