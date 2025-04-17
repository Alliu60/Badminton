// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-jLF_ra4N7-5LdLDn_y8hY9kqhChrCmM",
  authDomain: "sports-1d8fd.firebaseapp.com",
  projectId: "sports-1d8fd",
  storageBucket: "sports-1d8fd.appspot.com", // Use .appspot.com for storage bucket
  messagingSenderId: "529973621657",
  appId: "1:529973621657:web:e184c5e8467edcef4c1908",
  measurementId: "G-ZSEQQD6YZD"
};

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// Optional: const analytics = firebase.analytics();

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const nameInput = document.getElementById('nameInput');
    const clearButton = document.getElementById('clearButton');
    const pasteButton = document.getElementById('pasteButton');
    const generateButton = document.getElementById('generateButton');
    const participantList = document.getElementById('participantList');
    const participantCount = document.getElementById('participantCount');
    const matchList = document.getElementById('matchList');
    const matchProgress = document.getElementById('matchProgress');
    const resultsTableBody = document.getElementById('resultsTable').querySelector('tbody');
    const resetButton = document.getElementById('resetButton');
    const totalMatchInput = document.getElementById('totalMatchInput');
    // New elements for Save/Load/Export
    const saveButton = document.getElementById('saveButton');
    const loadButton = document.getElementById('loadButton');
    const exportButton = document.getElementById('exportButton');
    const loadModal = document.getElementById('loadModal');
    const savedGamesList = document.getElementById('savedGamesList');
    const closeLoadModal = document.getElementById('closeLoadModal');

    // New Login elements
    const loginLogoutButton = document.getElementById('loginLogoutButton');
    const loginModal = document.getElementById('loginModal');
    const passwordInput = document.getElementById('passwordInput');
    const loginSubmitButton = document.getElementById('loginSubmitButton');
    const closeLoginModal = document.getElementById('closeLoginModal');

    // Removed LS_KEYS constant

    let participants = []; // Now stores objects: { name: string, mode: 'S' | 'L' }
    let allPossiblePairs = [];
    let selectedMatches = [];
    let playerStats = {};
    const MAX_CONSECUTIVE_GAMES = 2; // Limit consecutive games

    // Target games based on participant count (adjust as needed)
    const targetMatchCounts = {
        4: 3,  // Min players, 3 matches total
        5: 5,  // Need logic for 5 players (complex for doubles)
        6: 9,  // Each player plays 3 games
        7: 14, // Each player plays 4 games
        8: 14, // Each player plays ~3.5 games (rounds up/down)
        9: 18, // Each player plays 4 games
        10: 20, // Each player plays 4 games
        11: 33, // Each player plays 6 games
        12: 33, // Each player plays 5.5 games
        // Add more entries or a formula for larger numbers
    };

    // Global state variables (Auth state managed by Firebase)
    let currentUser = null; // Stores the Firebase auth user object
    let currentClubId = null; // ID of the club the user is managing
    let currentTournamentId = null; // ID of the currently active/loaded tournament
    let isLoggedIn = false; // Keep this for UI checks tied to old logic temporarily

    // --- UI Update Functions (Enable/Disable Editing) ---
    function enableEditing() {
        console.log("Enabling editing controls");
        nameInput.disabled = false;
        clearButton.disabled = false;
        pasteButton.disabled = false;
        generateButton.disabled = false;
        resetButton.disabled = false;
        saveButton.disabled = false;
        totalMatchInput.disabled = false;
        // Enable score inputs and save buttons within match cards
        matchList.querySelectorAll('.score, .save-score-button, .mode-select').forEach(el => el.disabled = false);
        // Enable mode selects in participant list
        participantList.querySelectorAll('.mode-select').forEach(el => el.disabled = false);
    }

    function disableEditing() {
        console.log("Disabling editing controls"); // Corrected typo here
        nameInput.disabled = true;
        clearButton.disabled = true;
        pasteButton.disabled = true;
        generateButton.disabled = true;
        resetButton.disabled = true;
        saveButton.disabled = true;
        totalMatchInput.disabled = true;
        // Disable score inputs and save buttons within match cards
        matchList.querySelectorAll('.score, .save-score-button, .mode-select').forEach(el => el.disabled = true);
        // Disable mode selects in participant list
        participantList.querySelectorAll('.mode-select').forEach(el => el.disabled = true);
    }

    // --- Firebase Auth Listener ---
    auth.onAuthStateChanged(user => {
        currentUser = user;
        isLoggedIn = !!user; // Update isLoggedIn based on Firebase user state
        console.log("Auth state changed:", user ? user.email : "No user");

        if (user) {
            // User is signed in.
            loginLogoutButton.textContent = '登出';
            loginLogoutButton.classList.remove('secondary');
            loginLogoutButton.classList.add('primary');
            // Enable editing ONLY if the user is an admin of the current club (check Firestore later)
            enableEditing();
        } else {
            // User is signed out.
            loginLogoutButton.textContent = '登录';
            loginLogoutButton.classList.remove('primary');
            loginLogoutButton.classList.add('secondary');
            disableEditing();
        }
    });

    // --- Firebase Auth UI (Placeholder) ---
    // In a real app, replace this with a proper UI
    function showLoginModal() {
        loginModal.style.display = 'flex';
        passwordInput.value = '';
        passwordInput.focus();
    }

    function hideLoginModal() {
        loginModal.style.display = 'none';
    }

    async function handleEmailPasswordLogin() {
        const email = prompt("Enter your email:");
        const password = passwordInput.value;
        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
            hideLoginModal(); // Hide after successful login
            alert("Login successful!");
        } catch (error) {
            console.error("Login error:", error);
            alert("Login failed: " + error.message);
        }
    }

    async function handleLogout() {
        try {
            await auth.signOut();
            alert("Logged out successfully!");
        } catch (error) {
            console.error("Logout error:", error);
            alert("Logout failed: " + error.message);
        }
    }

    // --- Event Listeners (Modified for Firebase Auth) ---

    loginLogoutButton.addEventListener('click', () => {
        if (currentUser) {
            // Logout
            handleLogout();
        } else {
            // Show Login Modal (Email/Password)
            showLoginModal();
        }
    });

    closeLoginModal.addEventListener('click', () => {
        hideLoginModal();
    });

    // Replace the old login submit with email/password login
    loginSubmitButton.addEventListener('click', handleEmailPasswordLogin);
    passwordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleEmailPasswordLogin();
        }
    });

    // Modify existing listeners to check login status (Firebase auth manages this now)
    clearButton.addEventListener('click', () => {
        if (!currentUser) return alert('请先登录以执行此操作。');
        nameInput.value = '';
        resetApp();
    });

    pasteButton.addEventListener('click', async () => {
        if (!currentUser) return alert('请先登录以执行此操作。');
        try {
            const text = await navigator.clipboard.readText();
            nameInput.value = text;
            parseNames();
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            alert('无法读取剪贴板内容。');
        }
    });

    nameInput.addEventListener('input', () => {
        if (!currentUser) return; // Prevent parsing if not logged in
        parseNames();
    });

    generateButton.addEventListener('click', () => {
        if (!currentUser) return alert('请先登录以执行此操作。');
        if (participants.length >= 4) {
            generatePairs();
            generateMatches();
            displayMatches();
            initializeStats();
            updateMatchProgress();
            clearResults();
        } else {
            alert('至少需要4名参与者才能生成双打比赛。');
        }
    });

    resetButton.addEventListener('click', () => {
        if (!currentUser) return alert('请先登录以执行此操作。');
        resetApp();
    });

    // Add listener for score inputs (delegated from matchList)
    matchList.addEventListener('change', (event) => {
        if (!currentUser) return; // Ignore score changes if not logged in
        if (event.target.classList.contains('score')) {
            // No longer auto-record on change, rely on button
            // recordScore(parseInt(matchIndex));
        }
    });

     // Add listener for score save buttons (delegated from matchList)
     matchList.addEventListener('click', (event) => {
        if (event.target.classList.contains('save-score-button')) {
            if (!currentUser) return alert('请先登录以记录分数。');
            const matchIndex = event.target.closest('.match-card').dataset.matchIndex;
            recordScore(parseInt(matchIndex)); // Re-trigger score recording and stats update
        }
        // Also handle mode select change (delegated from participantList)
        if (event.target.classList.contains('mode-select')) {
            if (!currentUser) return; // Should not happen if disabled, but check anyway
            const selectedMode = event.target.value;
            const pIndex = parseInt(event.target.dataset.participantIndex);
            if (participants[pIndex]) {
                 participants[pIndex].mode = selectedMode;
                 console.log(`Set ${participants[pIndex].name} mode to ${selectedMode}`);
                 // Consider if regeneration/stats update is needed here
            }
        }
    });

    // Separate listener for participantList mode changes
    participantList.addEventListener('change', (event) => {
        if (event.target.classList.contains('mode-select')) {
            if (!currentUser) return;
            const selectedMode = event.target.value;
            const pIndex = parseInt(event.target.dataset.participantIndex);
             if (participants[pIndex]) {
                 participants[pIndex].mode = selectedMode;
                 console.log(`Participant List: Set ${participants[pIndex].name} mode to ${selectedMode}`);
             }
        }
    });


    // Save/Load/Export Button Listeners (Updated for Firestore)
    saveButton.addEventListener('click', () => {
        if (!currentUser) return alert('请先登录以保存状态。');
        saveStateToFirestore(); // Changed from saveState()
    });
    loadButton.addEventListener('click', () => {
        if (!currentUser) return alert('请先登录以加载状态。');
        showLoadFromFirestoreModal(); // Changed from showLoadModal()
    });
    closeLoadModal.addEventListener('click', () => loadModal.style.display = 'none');
    exportButton.addEventListener('click', exportToHtml);

    // --- Core Logic Functions ---

    function parseNames() {
        console.log("parseNames function triggered"); // Debugging line
        const text = nameInput.value.trim();
        let parsedNames = [];
        if (!text) {
            participants = [];
            updateParticipantList();
            return;
        }

        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
        parsedNames = lines.map(line => {
            return line.replace(/^\d+[、.]?\s*|^姓名[:：]?\s*/, '').trim();
        }).filter(name => name);

        // Initialize participants with default mode 'S'
        participants = parsedNames.map(name => ({ name: name, mode: 'S' }));
        updateParticipantList();
    }

    function updateParticipantList() {
        participantList.innerHTML = ''; // Clear previous list
        participants.forEach((participant, index) => {
            const li = document.createElement('li');
            li.classList.add('participant-item'); // Add class for styling

            // Avatar
            const avatar = document.createElement('span');
            avatar.classList.add('participant-avatar');
            avatar.textContent = participant.name.charAt(0).toUpperCase();
            li.appendChild(avatar);

            // Name
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('participant-name');
            nameSpan.textContent = participant.name;
            li.appendChild(nameSpan);

            // Mode Selector (Dropdown)
            const modeSelect = document.createElement('select');
            modeSelect.classList.add('mode-select');
            modeSelect.dataset.participantIndex = index;
            const optionS = document.createElement('option');
            optionS.value = 'S';
            optionS.textContent = '标准 (S)';
            optionS.selected = participant.mode === 'S';
            const optionL = document.createElement('option');
            optionL.value = 'L';
            optionL.textContent = '较少 (L)';
            optionL.selected = participant.mode === 'L';
            modeSelect.appendChild(optionS);
            modeSelect.appendChild(optionL);

            // Event listener moved to delegated listener on participantList

            li.appendChild(modeSelect);
            participantList.appendChild(li);
        });
        participantCount.textContent = participants.length;
        // Update disabled state based on currentUser
        if (!currentUser) {
            participantList.querySelectorAll('.mode-select').forEach(el => el.disabled = true);
        } else {
            participantList.querySelectorAll('.mode-select').forEach(el => el.disabled = false);
        }
    }

    // Helper to get player mode
    function getPlayerMode(playerName) {
        const participant = participants.find(p => p.name === playerName);
        return participant ? participant.mode : 'S'; // Default to 'S' if not found (shouldn't happen)
    }

    function generatePairs() {
        allPossiblePairs = []; // Reset
        if (participants.length < 2) return;
        for (let i = 0; i < participants.length; i++) {
            for (let j = i + 1; j < participants.length; j++) {
                // Store actual names in pairs
                allPossiblePairs.push([participants[i].name, participants[j].name]);
            }
        }
        // console.log("Generated All Possible Pairs:", allPossiblePairs);
    }

    // Helper function to get combinations (n choose k)
    function combinations(arr, k) {
        if (k < 1 || k > arr.length) {
            return [];
        }
        if (k === arr.length) {
            return [arr];
        }
        if (k === 1) {
            return arr.map(e => [e]);
        }
        let combs = [];
        for (let i = 0; i < arr.length - k + 1; i++) {
            const head = arr.slice(i, i + 1);
            const tailCombs = combinations(arr.slice(i + 1), k - 1);
            for (const tail of tailCombs) {
                combs.push(head.concat(tail));
            }
        }
        return combs;
    }

    // New function to generate matches based on balanced play and consecutive limit
    function generateMatches() {
        selectedMatches = [];
        const n = participants.length;
        if (n < 4 || allPossiblePairs.length < 2) return;

        // 1. Generate ALL possible unique matches
        let allPossibleMatches = [];
        for (let i = 0; i < allPossiblePairs.length; i++) {
            for (let j = i + 1; j < allPossiblePairs.length; j++) {
                const pair1 = allPossiblePairs[i];
                const pair2 = allPossiblePairs[j];
                // Check for common players
                if (pair1.every(p => !pair2.includes(p))) {
                    allPossibleMatches.push({
                        team1: pair1,
                        team2: pair2,
                        score1: null,
                        score2: null,
                        played: false
                    });
                }
            }
        }
        // Shuffle for variety
        allPossibleMatches.sort(() => Math.random() - 0.5);

        // 2. Determine target number of matches
        const userInputTarget = parseInt(totalMatchInput.value);
        const calculatedTarget = targetMatchCounts[n] || Math.floor(allPossibleMatches.length * 0.8); // Default calculation
        // Use user input if valid and within reasonable bounds, otherwise use calculation
        let targetCount = (userInputTarget > 0 && userInputTarget <= allPossibleMatches.length) ? userInputTarget : calculatedTarget;
        targetCount = Math.min(targetCount, allPossibleMatches.length); // Cannot exceed total possible matches

        totalMatchInput.placeholder = `自动计算 (${calculatedTarget})`; // Show calculated value as placeholder

        if (allPossibleMatches.length === 0) return;

        // 3. Selection logic - Prioritize balance and avoid consecutive plays
        let playerGameCounts = participants.reduce((acc, p) => { acc[p.name] = { count: 0, consecutive: 0 }; return acc; }, {});
        let pairGameCounts = allPossiblePairs.reduce((acc, pair) => {
            const key = pair.slice().sort().join('_'); // Create a consistent key like "A_B"
            acc[key] = 0;
            return acc;
        }, {});
        let potentialMatchesPool = [...allPossibleMatches]; // Start with all valid pairings
        let lastSelectedMatch = null; // Keep track for logging/debugging

        while (selectedMatches.length < targetCount && potentialMatchesPool.length > 0) {
            let bestMatch = null;
            let bestMatchIndex = -1;
            let lowestTotalGames = Infinity;

            let filteredPool1 = []; // Respecting player limits
            let filteredPool2 = []; // Respecting pair limits (max 2 games per pair)

            // Pass 1: Filter by Player Consecutive Limits
            potentialMatchesPool.forEach((potentialMatch) => {
                const playersInMatch = [...potentialMatch.team1, ...potentialMatch.team2];
                let possible = true;
                for (const player of playersInMatch) {
                    const playerMode = getPlayerMode(player);
                    const consecutiveLimit = playerMode === 'L' ? 1 : MAX_CONSECUTIVE_GAMES;
                    if (!playerGameCounts[player] || playerGameCounts[player].consecutive >= consecutiveLimit) {
                        possible = false;
                        break; // Strict violation
                    }
                }
                if (possible) {
                    filteredPool1.push(potentialMatch);
                }
            });

            if (filteredPool1.length === 0) {
                console.warn(`Stopping match generation at game ${selectedMatches.length + 1}: No potential matches satisfy all player consecutive limits. Check player modes and available pairings.`);
                console.log("Current consecutive counts:", playerGameCounts);
                break; // No valid options left respecting constraints
            }

            // Pass 2: Filter by Pair Play Count Limit (Max 2)
            filteredPool1.forEach(potentialMatch => {
                const pair1Key = potentialMatch.team1.slice().sort().join('_');
                const pair2Key = potentialMatch.team2.slice().sort().join('_');
                if ((pairGameCounts[pair1Key] ?? 0) < 2 && (pairGameCounts[pair2Key] ?? 0) < 2) {
                    filteredPool2.push(potentialMatch);
                }
            });

             if (filteredPool2.length === 0) {
                console.warn(`Stopping match generation at game ${selectedMatches.length + 1}: No available matches satisfy the 'max 2 games per pair' limit while respecting player constraints.`);
                 console.log("Current pair game counts:", pairGameCounts);
                 console.log("Current player consecutive counts:", playerGameCounts);
                break; // No valid options left
            }

            // Pass 3: Select Best Match from filteredPool2
            bestMatch = null; // Reset best match for this iteration
            let bestScore = -Infinity; // Higher score is better

            filteredPool2.forEach((potentialMatch) => {
                const playersInMatch = [...potentialMatch.team1, ...potentialMatch.team2];
                const pair1Key = potentialMatch.team1.slice().sort().join('_');
                const pair2Key = potentialMatch.team2.slice().sort().join('_');

                const p1Games = pairGameCounts[pair1Key] ?? 0;
                const p2Games = pairGameCounts[pair2Key] ?? 0;
                const totalPlayerGames = playersInMatch.reduce((sum, p) => sum + (playerGameCounts[p]?.count || 0), 0);

                // Scoring: Higher is better
                let score = 0;
                // Priority 1: Heavily reward involving pairs that haven't played (score +100 for each)
                if (p1Games === 0) score += 100;
                if (p2Games === 0) score += 100;

                // Priority 2: Penalize based on total games of players involved (higher total games = lower score)
                // Normalize by dividing by a large number to make it less impactful than Priority 1
                score -= totalPlayerGames / 10; 
                
                // Priority 3: Penalize based on total games of pairs involved (less impact than player games)
                score -= (p1Games + p2Games) / 50;

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = potentialMatch;
                }
            });

            if (bestMatch) {
                 // Find the actual index in the original pool to remove it
                 bestMatchIndex = potentialMatchesPool.findIndex(match => match === bestMatch);

                // Select the best match found
                selectedMatches.push(bestMatch);
                potentialMatchesPool.splice(bestMatchIndex, 1); // Remove from pool
                lastSelectedMatch = bestMatch; // Update last selected match

                const playersInSelectedMatch = [...bestMatch.team1, ...bestMatch.team2];

                // Update counts
                participants.forEach(p => {
                    const playerName = p.name;
                    if (playersInSelectedMatch.includes(playerName)) {
                        playerGameCounts[playerName].count = (playerGameCounts[playerName].count || 0) + 1;
                        playerGameCounts[playerName].consecutive = (playerGameCounts[playerName].consecutive || 0) + 1;
                    } else {
                        playerGameCounts[playerName].consecutive = 0; // Reset consecutive count if not playing
                    }
                });
                 // Update pair game counts
                const pair1Key = bestMatch.team1.slice().sort().join('_');
                const pair2Key = bestMatch.team2.slice().sort().join('_');
                pairGameCounts[pair1Key] = (pairGameCounts[pair1Key] ?? 0) + 1;
                pairGameCounts[pair2Key] = (pairGameCounts[pair2Key] ?? 0) + 1;

            } else {
                // This might happen if filteredPool2 was populated but scoring failed somehow (unlikely)
                 console.error("Error in selection logic: Best match not found despite valid options in filteredPool2.");
                 break;
            }
            // Removed attempts counter - loop terminates naturally
        }

        // Remove the old fallback logic completely
        /*
        if(selectedMatches.length < targetCount) {
             console.warn(`Target matches ${targetCount}, but only generated ${selectedMatches.length} due to constraints or lack of options.`);
        }
        if (attempts >= MAX_ATTEMPTS) {
             console.warn("Reached max attempts during match generation.");
        }
        */

        if (selectedMatches.length < targetCount && potentialMatchesPool.length === 0) {
             console.log(`Reached end of possible matches after ${selectedMatches.length} games.`);
        } else if (selectedMatches.length < targetCount) {
            // Warning about stopping due to constraints was already issued inside the loop
        } else {
            console.log(`Successfully generated target ${targetCount} matches.`);
        }

        // Final check on game counts
        console.log("Final Player Game Counts:", Object.entries(playerGameCounts).map(([p, d]) => ({player: p, mode: getPlayerMode(p), games: d.count})));
        console.log("Final Pair Game Counts:", pairGameCounts);

        // selectedMatches.sort(() => Math.random() - 0.5); // Keep the generated order
        // console.log("Selected Matches:", selectedMatches);
    }

    function displayMatches() {
        matchList.innerHTML = ''; // Clear previous matches
        if (selectedMatches.length === 0) {
            matchList.innerHTML = '<p>请先生成对阵。</p>';
            return;
        }

        selectedMatches.forEach((match, index) => {
            const card = document.createElement('div');
            card.classList.add('match-card');
            card.dataset.matchIndex = index; // Store match index

            const team1Div = createTeamDiv(match.team1);
            const team2Div = createTeamDiv(match.team2);
            const vsSpan = document.createElement('span');
            vsSpan.classList.add('vs');
            vsSpan.textContent = 'PK';

            const scoreDiv = document.createElement('div');
            scoreDiv.classList.add('score-input');
            const score1Input = document.createElement('input');
            score1Input.type = 'number';
            score1Input.classList.add('score', 'score1');
            score1Input.placeholder = '分数';
            score1Input.value = match.score1 !== null ? match.score1 : '';
            const scoreSeparator = document.createElement('span');
            scoreSeparator.textContent = '-';
            const score2Input = document.createElement('input');
            score2Input.type = 'number';
            score2Input.classList.add('score', 'score2');
            score2Input.placeholder = '分数';
            score2Input.value = match.score2 !== null ? match.score2 : '';

            // Removed automatic score saving on input change, using button instead
            // score1Input.addEventListener('input', () => recordScore(index));
            // score2Input.addEventListener('input', () => recordScore(index));

            scoreDiv.appendChild(score1Input);
            scoreDiv.appendChild(scoreSeparator);
            scoreDiv.appendChild(score2Input);

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('actions');
            const saveButton = document.createElement('button');
            saveButton.classList.add('save-score-button')
            // Set initial button text based on whether score exists
            saveButton.textContent = (match.score1 !== null && match.score2 !== null) ? '更新结果' : '记录比分';
            // saveButton.addEventListener('click', () => recordScore(index)); // Handled by event delegation
            actionsDiv.appendChild(saveButton);


            card.appendChild(team1Div);
            card.appendChild(vsSpan);
            card.appendChild(team2Div);
            card.appendChild(scoreDiv);
            card.appendChild(actionsDiv);

            matchList.appendChild(card);
        });
        // Update disabled state based on currentUser
        if (!currentUser) {
             matchList.querySelectorAll('.score, .save-score-button').forEach(el => el.disabled = true);
        } else {
             matchList.querySelectorAll('.score, .save-score-button').forEach(el => el.disabled = false);
        }
    }

    function createTeamDiv(team) {
        const div = document.createElement('div');
        div.classList.add('team');
        team.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player');
            const avatar = document.createElement('span');
            avatar.classList.add('player-avatar');
            avatar.textContent = player.charAt(0).toUpperCase();
            playerDiv.appendChild(avatar);
            playerDiv.appendChild(document.createTextNode(player));
            div.appendChild(playerDiv);
        });
        return div;
    }

     function recordScore(matchIndex) {
        if (matchIndex < 0 || matchIndex >= selectedMatches.length) return;
        const match = selectedMatches[matchIndex];
        const card = matchList.querySelector(`.match-card[data-match-index="${matchIndex}"]`);
        const score1Input = card.querySelector('.score1');
        const score2Input = card.querySelector('.score2');

        const score1 = parseInt(score1Input.value);
        const score2 = parseInt(score2Input.value);

        if (!isNaN(score1) && !isNaN(score2)) {
            match.score1 = score1;
            match.score2 = score2;
            match.played = true;
            // Update button text
            const button = card.querySelector('.save-score-button');
            if (button) button.textContent = '更新结果';

            updateStats(); // Recalculate stats
            displayResults(); // Update results table
            updateMatchProgress(); // Update progress counter
        } else {
             // If scores are cleared or invalid, reset match state
            if (match.played) { // Only reset if it was previously played
                match.score1 = null;
                match.score2 = null;
                match.played = false;
                updateStats(); // Recalculate stats
                displayResults();
                updateMatchProgress();
                 // Update button text back
                const button = card.querySelector('.save-score-button');
                if (button) button.textContent = '记录比分';
            }
        }
    }

    function initializeStats() {
        playerStats = {};
        participants.forEach(participant => {
            const name = participant.name;
            playerStats[name] = {
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                netPoints: 0,
                gamesPlayed: 0,
                winRate: 0, // Added winRate
                avgNetPoints: 0 // Added average net points
            };
        });
    }

    function updateStats() {
        initializeStats(); // Reset stats before recalculating

        selectedMatches.forEach(match => {
            if (match.played && typeof match.score1 === 'number' && typeof match.score2 === 'number') {
                const { team1, team2, score1, score2 } = match;
                const winner = score1 > score2 ? team1 : team2;
                const loser = score1 > score2 ? team2 : team1;
                const winScore = Math.max(score1, score2);
                const loseScore = Math.min(score1, score2);

                winner.forEach(player => {
                    if (!playerStats[player]) initializeStatsForPlayer(player); // Ensure stats object exists
                    playerStats[player].wins++;
                    playerStats[player].pointsFor += winScore;
                    playerStats[player].pointsAgainst += loseScore;
                    playerStats[player].gamesPlayed++;
                });

                loser.forEach(player => {
                    if (!playerStats[player]) initializeStatsForPlayer(player); // Ensure stats object exists
                    playerStats[player].losses++;
                    playerStats[player].pointsFor += loseScore;
                    playerStats[player].pointsAgainst += winScore;
                    playerStats[player].gamesPlayed++;
                });
            }
        });

        // Calculate net points, win rate, and average net points
        participants.forEach(participant => {
            const name = participant.name;
            const stats = playerStats[name];
            if (!stats) return; // Should not happen if initialized correctly
            stats.netPoints = stats.pointsFor - stats.pointsAgainst;
            stats.winRate = stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) : 0;
            stats.avgNetPoints = stats.gamesPlayed > 0 ? (stats.netPoints / stats.gamesPlayed) : 0;
        });
        // console.log("Updated Stats:", playerStats);
    }

    // Helper to initialize stats for a single player if needed
    function initializeStatsForPlayer(playerName) {
         if (!playerStats[playerName]) {
             playerStats[playerName] = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, netPoints: 0, gamesPlayed: 0, winRate: 0, avgNetPoints: 0 };
         }
    }

    function displayResults() {
        resultsTableBody.innerHTML = ''; // Clear previous results

        // Create an array from playerStats for sorting
        const rankedPlayers = participants.map(participant => ({
            name: participant.name,
            // Use default stats object if player has no stats yet
             ...(playerStats[participant.name] || { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, netPoints: 0, gamesPlayed: 0, winRate: 0, avgNetPoints: 0 })
        }));

        // Sort by: 1. Win Rate (desc), 2. Net Points (desc), 3. Avg Net Pts (desc) 4. Name (asc)
        rankedPlayers.sort((a, b) => {
            if (b.winRate !== a.winRate) {
                return b.winRate - a.winRate; // Higher win rate first
            }
            if (b.netPoints !== a.netPoints) {
                return b.netPoints - a.netPoints; // Higher net points first
            }
            if (b.avgNetPoints !== a.avgNetPoints) {
                 return b.avgNetPoints - a.avgNetPoints; // Higher avg net points as tie-breaker
            }
            return a.name.localeCompare(b.name); // Alphabetical by name as final tie-breaker
        });

        rankedPlayers.forEach((player, index) => {
            const row = resultsTableBody.insertRow();
            row.insertCell(0).textContent = index + 1; // Rank

            const nameCell = row.insertCell(1);
            const avatar = document.createElement('span');
            avatar.classList.add('participant-avatar'); // Use participant style for consistency
            avatar.style.backgroundColor = getAvatarColor(index); // Optional: color based on rank
            avatar.textContent = player.name.charAt(0).toUpperCase(); // Use player.name
            nameCell.appendChild(avatar);
            nameCell.appendChild(document.createTextNode(` ${player.name}`)); // Use player.name
            nameCell.style.textAlign = 'left';

            row.insertCell(2).textContent = `${player.wins}-${player.losses}`;
            row.insertCell(3).textContent = (player.winRate * 100).toFixed(1) + '%'; // Add Win Rate column data
            row.insertCell(4).textContent = player.netPoints > 0 ? `+${player.netPoints}` : player.netPoints;
            row.insertCell(5).textContent = player.avgNetPoints.toFixed(1); // Add Avg Net Points column data
            // Add more cells for 平均得失分 if needed
        });
    }

    function getAvatarColor(rank) {
        // Simple color scheme for top ranks
        if (rank === 0) return '#dc3545'; // Reddish
        if (rank === 1) return '#ffc107'; // yellowish
        if (rank === 2) return '#fd7e14'; // Orangish
        return '#6c757d'; // Default grey
    }

    function updateMatchProgress() {
        const playedCount = selectedMatches.filter(m => m.played).length;
        const totalCount = selectedMatches.length;
        matchProgress.textContent = `${playedCount}/${totalCount} 场`;
    }

    function clearResults() {
         resultsTableBody.innerHTML = '';
    }

    function resetApp(confirmReset = true) {
        if (!currentUser && confirmReset) {
             alert('请先登录以重置应用。');
             return;
        }
        if (confirmReset && !confirm('确定要重置所有数据吗？此操作无法撤销。')) {
            return;
        }
        participants = [];
        allPossiblePairs = [];
        selectedMatches = [];
        playerStats = {};
        nameInput.value = '';
        totalMatchInput.value = '';
        updateParticipantList();
        displayMatches();
        clearResults();
        currentTournamentId = null; // Reset current tournament ID
        console.log("App reset.");
    }

    // --- Save/Load Functions (Firestore) ---

    async function saveStateToFirestore() {
        if (!currentUser) {
            alert("请先登录以保存状态。");
            return;
        }
        if (participants.length === 0 && selectedMatches.length === 0) {
            alert("没有可保存的数据。");
            return;
        }

        const defaultSaveName = `赛事_${new Date().toISOString().split('T')[0]}`;
        const saveName = prompt("请输入保存名称:", currentTournamentId ? currentTournamentId : defaultSaveName); // Suggest current ID or date

        if (!saveName) {
            alert("保存已取消。");
            return;
        }

        const state = {
            saveFormatVersion: 1, // For future compatibility
            saveName: saveName, // Store the name within the document
            userId: currentUser.uid, // Associate with the logged-in user
            timestamp: firebase.firestore.FieldValue.serverTimestamp(), // Use server time
            participants: participants, // Includes name and mode
            matches: selectedMatches, // Includes teams, scores, played status
            targetMatchCount: totalMatchInput.value || null
        };

        try {
            // If currentTournamentId exists, update that document. Otherwise, create a new one.
            const docRef = currentTournamentId
                ? db.collection("tournaments").doc(currentTournamentId)
                : db.collection("tournaments").doc(); // Let Firestore generate ID if new

            if (currentTournamentId) {
                await docRef.update(state); // Update existing document
                alert(`状态 '${saveName}' 已更新。`);
            } else {
                await docRef.set(state); // Create new document
                currentTournamentId = docRef.id; // Store the new ID
                 alert(`状态已保存为: ${saveName}`);
            }

        } catch (e) {
            console.error("Error saving state to Firestore:", e);
            alert("保存状态到数据库失败！");
        }
    }

     function showLoadFromFirestoreModal() {
        if (!currentUser) {
             alert("请先登录以加载状态。");
             return;
        }
        populateLoadModalFromFirestore();
        loadModal.style.display = 'flex';
    }

    async function populateLoadModalFromFirestore() {
        if (!currentUser) return; // Should be checked before calling, but double-check

        savedGamesList.innerHTML = '<li>正在加载保存的比赛...</li>'; // Loading indicator

        try {
            const tournamentsRef = db.collection("tournaments");
            // Query for tournaments created by the current user, order by timestamp descending
            const querySnapshot = await tournamentsRef
                                        .where("userId", "==", currentUser.uid)
                                        .orderBy("timestamp", "desc")
                                        .get();

            savedGamesList.innerHTML = ''; // Clear loading/previous list

            if (querySnapshot.empty) {
                savedGamesList.innerHTML = '<li>没有找到已保存的比赛。</li>';
                return;
            }

            querySnapshot.forEach(doc => {
                const tournamentData = doc.data();
                const tournamentId = doc.id; // Get the document ID

                const li = document.createElement('li');
                const nameSpan = document.createElement('span');
                nameSpan.textContent = tournamentData.saveName || `未命名 (${tournamentId.substring(0, 6)}...)`; // Use saveName or fallback
                nameSpan.style.flexGrow = '1';
                nameSpan.style.marginRight = '10px';
                nameSpan.style.cursor = 'pointer'; // Indicate clickable

                // Add timestamp (optional, for display)
                 const timestamp = tournamentData.timestamp?.toDate ? tournamentData.timestamp.toDate().toLocaleString() : '未知日期';
                 const timeSpan = document.createElement('span');
                 timeSpan.textContent = ` (${timestamp})`;
                 timeSpan.style.fontSize = '0.8em';
                 timeSpan.style.color = '#666';
                 nameSpan.appendChild(timeSpan);


                nameSpan.addEventListener('click', () => {
                    if (confirm(`确定要加载比赛 '${nameSpan.textContent.split(' (')[0]}' 吗？当前进度将丢失。`)) {
                        loadStateFromFirestore(tournamentId); // Load using document ID
                    }
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '删除';
                deleteBtn.classList.add('delete-save'); // Keep class for potential styling
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`确定要永久删除比赛 '${nameSpan.textContent.split(' (')[0]}' 吗？`)) {
                        deleteStateFromFirestore(tournamentId); // Delete using document ID
                    }
                });

                li.appendChild(nameSpan);
                li.appendChild(deleteBtn);
                savedGamesList.appendChild(li);
            });

        } catch (e) {
            console.error("Error fetching saved tournaments from Firestore:", e);
            savedGamesList.innerHTML = '<li>加载保存的比赛失败。</li>';
            alert("加载保存列表失败！");
        }
    }


    async function loadStateFromFirestore(tournamentId) {
         if (!currentUser || !tournamentId) return;

        try {
            const docRef = db.collection("tournaments").doc(tournamentId);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                alert(`无法加载状态: ID ${tournamentId} 未找到！`);
                populateLoadModalFromFirestore(); // Refresh list
                return;
            }

            const state = docSnap.data();

            // --- Restore State ---
            resetApp(false); // Clear current state without confirmation

            participants = state.participants || [];
            selectedMatches = state.matches || [];
            totalMatchInput.value = state.targetMatchCount || '';
            currentTournamentId = tournamentId; // Set the loaded tournament ID

            // --- Update UI ---
            updateParticipantList();
            displayMatches();
            updateStats(); // Recalculate stats based on loaded matches
            displayResults();
            updateMatchProgress();

            loadModal.style.display = 'none'; // Hide modal
            alert(`比赛 '${state.saveName || tournamentId}' 已加载。`);

        } catch (e) {
            console.error(`Error loading state ${tournamentId} from Firestore:`, e);
            alert(`加载状态 ${tournamentId} 失败！`);
        }
    }

     async function deleteStateFromFirestore(tournamentId) {
         if (!currentUser || !tournamentId) return;

        try {
            const docRef = db.collection("tournaments").doc(tournamentId);
            await docRef.delete();

            // If the deleted state was the currently loaded one, reset
            if (currentTournamentId === tournamentId) {
                 resetApp(false); // Reset without confirmation
            }

            populateLoadModalFromFirestore(); // Refresh the list
            alert(`比赛 (ID: ${tournamentId}) 已从数据库删除。`);

        } catch (e) {
            console.error(`Error deleting state ${tournamentId} from Firestore:`, e);
            alert(`删除状态 ${tournamentId} 失败！`);
        }
    }

    // --- Export Function ---
    function exportToHtml() {
        if (participants.length === 0 && selectedMatches.length === 0) {
            alert("没有可导出的数据。");
            return;
        }

        // 1. Prepare data
        updateStats(); // Ensure stats are current
        const currentRankedPlayers = participants.map(participant => ({
            name: participant.name,
            // Use default stats object if player has no stats yet (e.g., before matches played)
            ...(playerStats[participant.name] || { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, netPoints: 0, gamesPlayed: 0, winRate: 0, avgNetPoints: 0 })
        })).sort((a, b) => { // Use same sorting as displayResults
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            if (b.netPoints !== a.netPoints) return b.netPoints - a.netPoints;
            if (b.avgNetPoints !== a.avgNetPoints) return b.avgNetPoints - a.avgNetPoints;
            return a.name.localeCompare(b.name);
        });

        // 2. CSS Styles (Minified - use actual styles here if needed)
        const cssStyles = `body,h1,h2,h3,p,ul,li,button,input,textarea,table{margin:0;padding:0;box-sizing:border-box;font-family:sans-serif}body{background-color:#f4f7fc;color:#333;padding:20px}.container{max-width:800px;margin:0 auto;background-color:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.1);overflow:hidden}header{background-color:#4a90e2;color:#fff;padding:15px 20px;font-size:1.2em;text-align:center}main{padding:20px}section{margin-bottom:30px;background-color:#fff;padding:20px;border-radius:6px;box-shadow:0 1px 5px rgba(0,0,0,.05)}h2{font-size:1.4em;color:#4a90e2;margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:10px}.input-area,.participant-section .mode-select,.participant-section button,.match-count-input,footer,.match-card .actions,.match-card .score-input,.modal-overlay{display:none!important}#participantList li.participant-item{justify-content:flex-start}.participant-item .participant-name{margin-right:0}.participant-section .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}#participantList{list-style:none;padding:0}.participant-avatar{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background-color:#6c757d;color:#fff;font-weight:700;margin-right:10px;font-size:.9em;flex-shrink:0}#participantList li.participant-item{display:flex;align-items:center;justify-content:flex-start;background-color:#f9f9f9;border:1px solid #eee;padding:8px 12px;margin-bottom:8px;border-radius:4px}.participant-item .participant-name{flex-grow:1;text-align:left}.match-section .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:.8em}#matchList{display:grid;gap:15px}.match-card{background-color:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:15px;display:grid;grid-template-columns:1fr auto 1fr;grid-template-rows:auto auto;gap:10px 15px;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.05)}.match-card .static-score{grid-column:1/-1;grid-row:2;text-align:center;font-size:1.1em;font-weight:700;color:#555;padding:5px 0}.match-card .team{display:flex;flex-direction:column;gap:8px;align-items:center}.match-card .team .player{display:flex;align-items:center;background-color:#f0f0f0;padding:5px 10px;border-radius:15px;font-size:.9em}.player-avatar{width:24px;height:24px;font-size:.8em}.match-card .vs{grid-row:1;grid-column:2;font-weight:700;color:#4a90e2;font-size:1.1em;text-align:center}.results-section .tabs{display:flex;margin-bottom:15px;border-bottom:1px solid #ccc}.results-section .tab{padding:10px 15px;cursor:pointer;border-bottom:3px solid transparent}.results-section .tab.active{border-bottom-color:#4a90e2;font-weight:700;color:#4a90e2}#resultsTable{width:100%;border-collapse:collapse;margin-top:15px}#resultsTable th,#resultsTable td{padding:10px;text-align:center;border-bottom:1px solid #eee}#resultsTable th{background-color:#f8f9fa;font-weight:700;color:#495057}#resultsTable tbody tr:nth-child(odd){background-color:#fdfdfd}#resultsTable tbody tr:hover{background-color:#f1f1f1}#resultsTable .participant-avatar{margin-right:5px;width:24px;height:24px;font-size:.8em}@media (max-width:600px){body{padding:10px}main{padding:15px}section{padding:15px}.match-card{grid-template-columns:1fr auto 1fr;gap:8px 10px}.match-card .team .player{font-size:.85em}#resultsTable th,#resultsTable td{padding:8px;font-size:.9em}}`;

        // 3. Construct HTML String
        const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>羽毛球双打循环赛 - 导出结果</title>
    <style>
${cssStyles}
    </style>
</head>
<body>
    <div class="container">
        <header><h1>羽毛球双打循环赛 - 结果</h1></header>
        <main>
            <section class="participant-section"><div class="header"><h2>报名名单</h2><span><span id="participantCount">${participants.length}</span>人</span></div><ul id="participantList"></ul></section>
            <section class="match-section"><div class="header"><h2>对局计分</h2><span id="matchProgress">${selectedMatches.filter(m => m.played).length}/${selectedMatches.length} 场</span></div><div id="matchList"></div></section>
            <section class="results-section"><div class="tabs"><div class="tab active">比赛成绩</div></div><h2>比赛成绩</h2><table id="resultsTable"><thead><tr><th>排名</th><th>组合</th><th>胜负</th><th>胜率</th><th>净胜分</th><th>平均得失分</th></tr></thead><tbody></tbody></table></section>
        </main>
    </div>
    <script>
        // --- Embedded Data ---
        const participantsData = ${JSON.stringify(participants)};
        const matchesData = ${JSON.stringify(selectedMatches)};
        const rankedPlayersData = ${JSON.stringify(currentRankedPlayers)};

        // --- Static Rendering Functions (Simplified & Self-Contained with more checks) ---
        function getAvatarColor(rank) {
            // Ensure rank is a number
            const r = Number(rank);
            if (isNaN(r)) return '#6c757d';
            if (r === 0) return '#dc3545';
            if (r === 1) return '#ffc107';
            if (r === 2) return '#fd7e14';
            return '#6c757d';
        }
        function createTeamDiv_static(team) {
            const div = document.createElement('div'); div.classList.add('team');
            if (!Array.isArray(team)) { console.error('createTeamDiv_static: Invalid team data', team); return div; }
            team.forEach(player => {
                if (typeof player !== 'string' || !player) { console.warn('createTeamDiv_static: Skipping invalid player', player); return; }
                const playerDiv = document.createElement('div'); playerDiv.classList.add('player');
                const avatar = document.createElement('span'); avatar.classList.add('player-avatar','participant-avatar');
                avatar.textContent = player.charAt(0).toUpperCase();
                playerDiv.appendChild(avatar); playerDiv.appendChild(document.createTextNode(' ' + player));
                div.appendChild(playerDiv);
            }); return div;
        }
        function updateParticipantList_static() {
            const listElement = document.getElementById('participantList');
            if (!listElement) { console.error('updateParticipantList_static: List element not found'); return; }
            listElement.innerHTML = '';
            if (!Array.isArray(participantsData)) { console.error('updateParticipantList_static: Invalid participants data'); return; }
            participantsData.forEach(p => {
                if (!p || typeof p.name !== 'string' || !p.name) { console.warn('updateParticipantList_static: Skipping invalid participant', p); return; }
                const li = document.createElement('li'); li.classList.add('participant-item');
                const avatar = document.createElement('span'); avatar.classList.add('participant-avatar');
                avatar.textContent = p.name.charAt(0).toUpperCase();
                li.appendChild(avatar);
                const nameSpan = document.createElement('span'); nameSpan.classList.add('participant-name'); nameSpan.textContent = p.name;
                li.appendChild(nameSpan); listElement.appendChild(li);
            });
        }
        function displayMatches_static() {
            const listElement = document.getElementById('matchList');
            if (!listElement) { console.error('displayMatches_static: List element not found'); return; }
            listElement.innerHTML = '';
            if (!Array.isArray(matchesData) || matchesData.length === 0) { listElement.innerHTML = '<p>没有生成的对阵。</p>'; return; }
            matchesData.forEach(match => {
                 if (!match || !Array.isArray(match.team1) || !Array.isArray(match.team2)) { console.warn('displayMatches_static: Skipping invalid match data', match); return; }
                const card = document.createElement('div'); card.classList.add('match-card');
                card.appendChild(createTeamDiv_static(match.team1));
                const vsSpan = document.createElement('span'); vsSpan.classList.add('vs'); vsSpan.textContent = 'PK'; card.appendChild(vsSpan);
                card.appendChild(createTeamDiv_static(match.team2));
                const scoreDiv = document.createElement('div'); scoreDiv.classList.add('static-score');
                if (match.score1 !== null && match.score2 !== null) {
                    scoreDiv.textContent = String(match.score1) + ' - ' + String(match.score2);
                } else {
                    scoreDiv.textContent = '未开始';
                }
                card.appendChild(scoreDiv); listElement.appendChild(card);
            });
        }
        function displayResults_static() {
            const tableBody = document.getElementById('resultsTable')?.querySelector('tbody');
            if (!tableBody) { console.error('displayResults_static: Table body not found'); return; }
            tableBody.innerHTML = '';
            if (!Array.isArray(rankedPlayersData)) { console.error('displayResults_static: Invalid ranked players data'); return; }
            rankedPlayersData.forEach((player, index) => {
                if (!player || typeof player.name !== 'string' || !player.name) { console.warn('displayResults_static: Skipping invalid player data', player); return; }
                const row = tableBody.insertRow();
                row.insertCell(0).textContent = index + 1;
                const nameCell = row.insertCell(1);
                const avatar = document.createElement('span'); avatar.classList.add('participant-avatar');
                avatar.style.backgroundColor = getAvatarColor(index); avatar.textContent = player.name.charAt(0).toUpperCase();
                nameCell.appendChild(avatar); nameCell.appendChild(document.createTextNode(\` \${player.name}\`)); nameCell.style.textAlign = 'left';
                const wins = player.wins ?? 0; const losses = player.losses ?? 0;
                const winRate = player.winRate ?? 0; const netPoints = player.netPoints ?? 0; const avgNetPoints = player.avgNetPoints ?? 0;
                row.insertCell(2).textContent = \`\${wins}-\${losses}\`;
                row.insertCell(3).textContent = (winRate * 100).toFixed(1) + '%';
                row.insertCell(4).textContent = netPoints > 0 ? \`+\${netPoints}\` : netPoints;
                row.insertCell(5).textContent = avgNetPoints.toFixed(1);
            });
        }
        // --- Run on Load ---
        document.addEventListener('DOMContentLoaded',()=>{try{updateParticipantList_static();displayMatches_static();displayResults_static()}catch(e){console.error("Error rendering static content:",e)}});
    </script>
</body>
</html>
        `;

        // 4. Create Blob and trigger download
        try {
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            // Generate filename with date and time
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
            const filename = `羽毛球比赛结果_${dateStr}_${timeStr}.html`;

            // Create a temporary link to trigger the download
            const link = document.createElement('a');
            link.href = url;
            link.download = filename; // Set the desired filename
            document.body.appendChild(link); // Append link to body
            link.click(); // Programmatically click the link to trigger download
            document.body.removeChild(link); // Remove the link
            URL.revokeObjectURL(url); // Clean up the Blob URL

        } catch (e) {
            console.error("Error generating or downloading HTML content:", e);
            alert('生成导出文件失败！');
        }
    } // Closing brace for exportToHtml function

}); // Closing brace for main DOMContentLoaded listener
