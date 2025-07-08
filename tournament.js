// Supabase已在supabase-config.js中初始化

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
    const cumulativeSummaryButton = document.getElementById('cumulativeSummaryButton'); // <-- Add reference
    const exportButton = document.getElementById('exportButton');
    const loadModal = document.getElementById('loadModal');
    const savedGamesList = document.getElementById('savedGamesList');
    const closeLoadModal = document.getElementById('closeLoadModal');
    // Back to clubs button
    const backToClubsButton = document.getElementById('backToClubsButton');
    // Club Name Display
    const clubNameDisplay = document.getElementById('club-name-display');

    // New Login elements
    const loginLogoutButton = document.getElementById('loginLogoutButton');
    const loginModal = document.getElementById('loginModal');
    const passwordInput = document.getElementById('passwordInput');
    const loginSubmitButton = document.getElementById('loginSubmitButton');
    const closeLoginModal = document.getElementById('closeLoginModal');

    // New UI Elements for Courts & Summary
    const courtConfigSection = document.getElementById('court-config-section'); // Assuming this ID exists in HTML
    const courtListDiv = document.getElementById('court-list'); // Assuming this ID exists in HTML
    const addCourtButton = document.getElementById('add-court-button'); // Assuming this ID exists in HTML
    const modifyScheduleButton = document.getElementById('modify-schedule-button'); // Assuming this ID exists in HTML
    const generateSummaryButton = document.getElementById('generate-summary-button'); // Assuming this ID exists in HTML
    const summarySection = document.getElementById('summary-section'); // Assuming this ID exists in HTML
    const summaryTableBody = document.getElementById('summaryTable')?.querySelector('tbody'); // Assuming this ID exists in HTML
    // NEW Cumulative Results Table
    const cumulativeResultsSection = document.getElementById('cumulative-results-section');
    const cumulativeResultsTableBody = document.getElementById('cumulativeResultsTable')?.querySelector('tbody');

    // Modify Players Modal Elements
    const modifyPlayersModal = document.getElementById('modify-players-modal');
    const editMatchIndexInput = document.getElementById('edit-match-index-input');
    const modifyT1P1Select = document.getElementById('modify-t1-p1');
    const modifyT1P2Select = document.getElementById('modify-t1-p2');
    const modifyT2P1Select = document.getElementById('modify-t2-p1');
    const modifyT2P2Select = document.getElementById('modify-t2-p2');
    const savePlayerChangesButton = document.getElementById('save-player-changes');
    const cancelPlayerChangesButton = document.getElementById('cancel-player-changes');
    const modifyPlayersError = document.getElementById('modify-players-error');
    const gameDurationInput = document.getElementById('gameDurationInput');

    let participants = []; // Stores objects: { name: string, maxConsecutive: number, arrivalOffset: number }
    let allPossiblePairs = [];
    let selectedMatches = [];
    let playerStats = {};
    // -- Constants for Scheduling --
    // Remove old constants, use dynamic values now
    // const GAME_DURATION_MINUTES = 12;
    // const MAX_CONSECUTIVE_GAMES_STANDARD = 3;
    // const MAX_CONSECUTIVE_GAMES_LESS = 2;

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
    let currentClubName = '未知俱乐部'; // Store club name
    let courts = [ // Array to hold court information
        { id: 1, startTime: '', endTime: '' } // Default: one court, no times set yet
    ];
    let isAdminEditingSchedule = false; // Flag for admin schedule edit mode
    let isClubAdmin = false; // **** NEW STATE: Tracks if club admin password entered ****
    let clubAdminPassword = null; // Store fetched password

    // --- Initialization Function (Called Directly) ---
    async function initializeTournamentPage() { // Make async
        console.log("Initializing tournament page...");
        // 1. Get Club ID and Name
        currentClubId = sessionStorage.getItem('currentClubId');
        currentClubName = sessionStorage.getItem('currentClubName') || '未知俱乐部';

        if (!currentClubId) {
            console.error("Club ID not found! Redirecting...");
            alert("错误：未指定俱乐部。将返回俱乐部选择页面。");
            window.location.href = 'index.html';
            return false;
        }
        console.log(`Loaded Club: ${currentClubName} (ID: ${currentClubId})`);
        clubNameDisplay.textContent = `俱乐部: ${currentClubName}`;

        // Fetch the club's admin password and WAIT for it to complete
        const passwordFetched = await fetchClubAdminPassword();

        // 3. Add event listeners (Now added *after* password fetch attempt)
        addTournamentEventListeners();

        // 5. Initial UI state - Always start disabled
        disableEditing();

        // Load court config initially
        loadCourtConfig();
        displayCourtConfig();

        // --- NEW: Load and display initial cumulative stats ---
        console.log("Fetching initial cumulative stats...");
        const initialCumulativeStats = await fetchCumulativeStats(currentClubId);
        if (initialCumulativeStats !== null) {
            displayCumulativeResults(initialCumulativeStats);
        } else {
            console.error("Failed to fetch initial cumulative stats.");
            // Optional: Display an error in the table body
            if (cumulativeResultsTableBody) {
                 cumulativeResultsTableBody.innerHTML = '<tr><td colspan="6">无法加载累计排名数据。</td></tr>';
            }
        }
        // --- END NEW ---

        return true;
    }

    // --- Fetch Club Admin Password (returns boolean success) ---
    async function fetchClubAdminPassword() {
        if (!currentClubId) return false;
        try {
            const { data: club, error } = await supabase
                .from('clubs')
                .select('"adminPassword"')
                .eq('id', currentClubId)
                .single();

            if (error) throw error;

            if (club) {
                clubAdminPassword = club.adminPassword;
                if (clubAdminPassword) {
                    console.log("Club admin password fetched successfully.");
                    loginLogoutButton.disabled = false; // Ensure button is enabled if fetch succeeds
                    return true;
                } else {
                    console.error(`Club document for ${currentClubId} is missing the adminPassword field.`);
                    // Don't disable button, allow login attempt
                    // loginLogoutButton.disabled = true;
                    // loginLogoutButton.title = "俱乐部数据缺少管理密码";
                    return false;
                }
            } else {
                console.error(`Club document not found for ID: ${currentClubId} while fetching password.`);
                // Don't disable button, allow login attempt
                // loginLogoutButton.disabled = true;
                // loginLogoutButton.title = "无法加载俱乐部数据";
                return false;
            }
        } catch (error) {
            console.error("Error fetching club admin password:", error);
            // Don't disable button, allow login attempt
            // loginLogoutButton.disabled = true;
            // loginLogoutButton.title = "加载俱乐部密码时出错";
            return false;
        }
    }

    // --- UI Update Functions (Now based on isClubAdmin) ---
    function enableEditing() {
        if (!isClubAdmin) return; // Extra safety check
        console.log("Enabling editing controls (Club Admin)");
        // ... (enable all relevant controls: nameInput, buttons, court config, scores etc.) ...
        nameInput.disabled = false;
        clearButton.disabled = false;
        pasteButton.disabled = false;
        generateButton.disabled = false;
        resetButton.disabled = false;
        saveButton.disabled = false;
        cumulativeSummaryButton.disabled = false; // <-- Enable button
        totalMatchInput.disabled = false;
        matchList.querySelectorAll('.score, .save-score-button, .mode-select, .modify-players-button').forEach(el => el.disabled = false);
        participantList.querySelectorAll('.mode-select').forEach(el => el.disabled = false);
        courtConfigSection?.querySelectorAll('input, button').forEach(el => el.disabled = false);
        modifyScheduleButton?.removeAttribute('disabled');
        generateSummaryButton?.removeAttribute('disabled');
        if (isAdminEditingSchedule) {
            enableMatchEditingUI();
        }
         displayCourtConfig(); // Re-render court config in enabled state
    }

    function disableEditing() {
        console.log("Disabling editing controls (Club Admin)");
        // ... (disable all relevant controls) ...
        nameInput.disabled = true;
        clearButton.disabled = true;
        pasteButton.disabled = true;
        generateButton.disabled = true;
        resetButton.disabled = true;
        saveButton.disabled = true;
        cumulativeSummaryButton.disabled = true; // <-- Disable button
        totalMatchInput.disabled = true;
        matchList.querySelectorAll('.score, .save-score-button, .mode-select, .modify-players-button').forEach(el => el.disabled = true);
        participantList.querySelectorAll('.mode-select').forEach(el => el.disabled = true);
        courtConfigSection?.querySelectorAll('input, button').forEach(el => el.disabled = true);
        modifyScheduleButton?.setAttribute('disabled', 'true');
        generateSummaryButton?.setAttribute('disabled', 'true');
        disableMatchEditingUI();
        displayCourtConfig(); // Re-render court config in disabled state
    }

    // --- Event Listeners Specific to Tournament Page ---
    function addTournamentEventListeners() {
        console.log("Adding tournament event listeners...");
        loginLogoutButton.addEventListener('click', () => {
            if (isClubAdmin) {
                // --- Logout Logic ---
                isClubAdmin = false;
                isAdminEditingSchedule = false; // Also reset edit mode on logout
                loginLogoutButton.textContent = '管理员登录';
                loginLogoutButton.classList.remove('primary');
                loginLogoutButton.classList.add('secondary');
                disableEditing();
                modifyScheduleButton.textContent = '修改对阵'; // Reset edit button text
                modifyScheduleButton.classList.remove('active');
                alert('俱乐部管理员已登出。');
                // --- End Logout Logic ---
            } else {
                // --- Login Attempt Logic ---
                console.log("Club Admin Login button clicked. Prompting...");
                promptForClubAdminPassword();
                // --- End Login Attempt Logic ---
            }
        });

        clearButton.addEventListener('click', () => {
            if (!isClubAdmin) return alert('请先使用俱乐部管理密码登录。');
            nameInput.value = '';
            resetApp();
        });

        pasteButton.addEventListener('click', async () => {
            if (!isClubAdmin) return alert('请先使用俱乐部管理密码登录。');
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
            if (!isClubAdmin) return; // Allow typing even if not admin?
            // Let's disable input if not admin via disableEditing()
            parseNames();
        });

        generateButton.addEventListener('click', () => {
            if (!isClubAdmin) return alert('请先使用俱乐部管理密码登录。');
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
            if (!isClubAdmin) return alert('请先使用俱乐部管理密码登录。');
            resetApp();
        });

        matchList.addEventListener('change', (event) => {
            if (!isClubAdmin) return;
            if (event.target.classList.contains('score')) {
                // Still rely on save button
            }
        });

        matchList.addEventListener('click', (event) => {
            if (event.target.classList.contains('save-score-button')) {
                if (!isClubAdmin) return alert('请先使用俱乐部管理密码登录。');
                const matchIndex = event.target.closest('.match-card').dataset.matchIndex;
                recordScore(parseInt(matchIndex));
            }
            if (event.target.classList.contains('mode-select')) { // Mode select is now in participant list
                // This delegation might be removed from here if moved entirely
            }
        });

        participantList.addEventListener('change', (event) => {
            if (event.target.classList.contains('mode-select')) {
                if (!isClubAdmin) {
                    // Prevent change if not admin - revert it?
                    // It should be disabled by disableEditing() anyway.
                    return;
                }
                const selectedMode = event.target.value;
                const pIndex = parseInt(event.target.dataset.participantIndex);
                 if (participants[pIndex]) {
                     participants[pIndex].mode = selectedMode;
                     console.log(`Participant List: Set ${participants[pIndex].name} mode to ${selectedMode}`);
                     // If matches are already generated, maybe warn user?
                     // Or potentially allow changing mode even after generation? Needs decision.
                 }
            }
        });

        saveButton.addEventListener('click', () => {
            if (!isClubAdmin) return alert('请先使用俱乐部管理密码登录。');
            saveStateToFirestore(); // Note: saveState might still use auth.currentUser.uid if available
        });
        loadButton.addEventListener('click', () => {
            if (!isClubAdmin) return alert('请先使用俱乐部管理密码登录。');
            showLoadFromFirestoreModal();
        });
        closeLoadModal.addEventListener('click', () => loadModal.style.display = 'none');
        exportButton.addEventListener('click', exportToHtml);

        // Back button listener
        backToClubsButton.addEventListener('click', () => {
            // Optional: Ask for confirmation if there are unsaved changes
            // if (hasUnsavedChanges()) {
            //    if (!confirm("有未保存的更改，确定要离开吗？")) return;
            // }
            window.location.href = 'index.html'; // Go back to club selection
        });

        // Add listeners for new buttons
        addCourtButton?.addEventListener('click', addCourt);
        modifyScheduleButton?.addEventListener('click', toggleScheduleEditMode);
        // Rename listener function for clarity
        // generateSummaryButton?.addEventListener('click', updateAndDisplayCumulativeStats);
        // Connect the correct button
        cumulativeSummaryButton?.addEventListener('click', updateAndDisplayCumulativeStats);

        // Add listener for court config changes
        courtListDiv?.addEventListener('change', handleCourtTimeChange);
        courtListDiv?.addEventListener('click', handleRemoveCourt);
        // Add listeners for the new modal buttons
        savePlayerChangesButton?.addEventListener('click', handleSaveChanges);
        cancelPlayerChangesButton?.addEventListener('click', hideModifyPlayersModal);
        // Need listener for new participant inputs
        participantList.addEventListener('change', handleParticipantSettingChange);
    }

    // --- Club Admin Password Prompt Function ---
    function promptForClubAdminPassword() {
        if (clubAdminPassword === null) { // Check if password was fetched
            alert("无法验证管理员：俱乐部密码未加载。请检查网络连接并刷新页面。");
            return;
        }

        const enteredPassword = prompt(`请输入俱乐部 '${currentClubName}' 的管理密码:`);

        if (enteredPassword === null) { // User cancelled
            console.log("Club admin password prompt cancelled.");
            return;
        }

        if (enteredPassword === clubAdminPassword) {
            console.log("Club admin password verified.");
            isClubAdmin = true;
            loginLogoutButton.textContent = '登出管理员';
            loginLogoutButton.classList.remove('secondary');
            loginLogoutButton.classList.add('primary');
            enableEditing();
        } else {
            console.log("Incorrect club admin password entered.");
            alert('管理密码错误！');
            isClubAdmin = false;
            disableEditing(); // Ensure editing stays disabled
        }
    }

    // --- New Court Management Functions ---
    function displayCourtConfig() {
        if (!courtListDiv) return;
        courtListDiv.innerHTML = ''; // Clear existing
        const isAdmin = isClubAdmin; // *** Use isClubAdmin flag ***

        courts.forEach((court, index) => {
            const courtDiv = document.createElement('div');
            courtDiv.className = 'court-item';
            courtDiv.innerHTML = `
                <label>场地 ${court.id}:</label>
                <label for="court-${court.id}-start">开始时间:</label>
                <input type="time" id="court-${court.id}-start" data-court-id="${court.id}" data-type="startTime" value="${court.startTime || ''}" ${!isAdmin ? 'disabled' : ''}>
                <label for="court-${court.id}-end">结束时间:</label>
                <input type="time" id="court-${court.id}-end" data-court-id="${court.id}" data-type="endTime" value="${court.endTime || ''}" ${!isAdmin ? 'disabled' : ''}>
                ${courts.length > 1 ? `<button class="remove-court-btn danger small" data-court-id="${court.id}" ${!isAdmin ? 'disabled' : ''}>移除</button>` : ''}
            `;
            courtListDiv.appendChild(courtDiv);
        });
        addCourtButton?.toggleAttribute('disabled', !isAdmin);
    }

    function addCourt() {
        const newCourtId = courts.length > 0 ? Math.max(...courts.map(c => c.id)) + 1 : 1;
        courts.push({ id: newCourtId, startTime: '', endTime: '' });
        displayCourtConfig();
        saveCourtConfig(); // Persist changes
    }

    function handleCourtTimeChange(event) {
        if (event.target.type === 'time') {
            const courtId = parseInt(event.target.dataset.courtId);
            const type = event.target.dataset.type; // 'startTime' or 'endTime'
            const value = event.target.value;
            const courtIndex = courts.findIndex(c => c.id === courtId);
            if (courtIndex !== -1) {
                courts[courtIndex][type] = value;
                console.log(`Updated court ${courtId} ${type} to ${value}`);
                saveCourtConfig(); // Persist changes
                // Optionally, re-generate matches if times change significantly?
            }
        }
    }

    function handleRemoveCourt(event) {
        if (event.target.classList.contains('remove-court-btn')) {
            if (courts.length <= 1) {
                alert("至少需要保留一个场地。");
                return;
            }
            const courtId = parseInt(event.target.dataset.courtId);
            if (confirm(`确定要移除场地 ${courtId} 吗？`)) {
                courts = courts.filter(c => c.id !== courtId);
                // Re-assign IDs sequentially if needed, or just keep gaps?
                // Keeping gaps is simpler for now.
                displayCourtConfig();
                saveCourtConfig(); // Persist changes
            }
        }
    }

    function saveCourtConfig() {
        // Basic save to session storage for persistence within the session
        // For long-term persistence, save to Firestore tournament state
        try {
             sessionStorage.setItem(`courtConfig_${currentClubId}`, JSON.stringify(courts));
        } catch (e) {
            console.warn("Could not save court config to session storage:", e);
        }
    }

    function loadCourtConfig() {
        try {
            const savedConfig = sessionStorage.getItem(`courtConfig_${currentClubId}`);
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                if (Array.isArray(parsedConfig) && parsedConfig.length > 0) {
                     courts = parsedConfig;
                     console.log("Loaded court config from session storage:", courts);
                } else {
                    // Initialize with one default court if saved data is invalid
                    courts = [{ id: 1, startTime: '', endTime: '' }];
                }
            } else {
                 // Initialize with one default court if nothing saved
                 courts = [{ id: 1, startTime: '', endTime: '' }];
            }
        } catch (e) {
            console.error("Error loading court config:", e);
            courts = [{ id: 1, startTime: '', endTime: '' }]; // Fallback
        }
        displayCourtConfig();
    }

    // --- Placeholder Functions for Schedule Edit & Summary ---
    function toggleScheduleEditMode() {
        if (!isClubAdmin) return; // Use correct flag
        isAdminEditingSchedule = !isAdminEditingSchedule;
        modifyScheduleButton.textContent = isAdminEditingSchedule ? '完成修改' : '修改对阵';
        modifyScheduleButton.classList.toggle('active', isAdminEditingSchedule);

        if (isAdminEditingSchedule) {
            enableMatchEditingUI();
        } else {
            disableMatchEditingUI();
            // Optionally save changes made during edit mode?
        }
        console.log(`Admin schedule edit mode: ${isAdminEditingSchedule}`);
    }

    function enableMatchEditingUI() {
        // Add visual cues or enable drag-and-drop, etc.
        matchList.classList.add('edit-mode');
        matchList.querySelectorAll('.match-card').forEach(card => {
            card.draggable = true; // Example: enable dragging
            // Add edit buttons or other controls
        });
        // TODO: Implement actual editing functionality (e.g., drag-drop, swap players)
    }

    function disableMatchEditingUI() {
        matchList.classList.remove('edit-mode');
        matchList.querySelectorAll('.match-card').forEach(card => {
            card.draggable = false;
            // Remove or disable edit controls
        });
    }

    // --- NEW Cumulative Stats Functions ---

    // Fetches cumulative stats from Supabase for the current club
    async function fetchCumulativeStats(clubId) {
        if (!clubId) return null;
        try {
            console.log(`Fetching cumulative stats for club: ${clubId}`);

            const { data, error } = await supabase
                .from('cumulative_stats')
                .select('stats')
                .eq('club_id', clubId)
                .single();

            console.log("Query response:", { data, error });

            if (error && error.code !== 'PGRST116') {
                // 如果有错误且不是"没有找到记录"错误
                console.error("Error fetching cumulative stats:", error);
                return null;
            }

            // 如果找到了记录，返回stats字段；否则返回空对象
            return data?.stats || {};
        } catch (error) {
            console.error("Error fetching cumulative stats:", error);
            return null; // Indicate error
        }
    }

    // Updates the cumulative stats in Supabase for the current club
    async function updateCumulativeStats(clubId, newStatsMap) {
        if (!clubId || !newStatsMap) return false;
        try {
            // 先检查是否存在记录
            const { data, error: checkError } = await supabase
                .from('cumulative_stats')
                .select('id')
                .eq('club_id', clubId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                // 如果有错误且不是"没有找到记录"错误
                throw checkError;
            }

            let result;

            if (data) {
                // 更新现有记录
                result = await supabase
                    .from('cumulative_stats')
                    .update({ stats: newStatsMap })
                    .eq('club_id', clubId);
            } else {
                // 创建新记录
                result = await supabase
                    .from('cumulative_stats')
                    .insert({
                        club_id: clubId,
                        stats: newStatsMap
                    });
            }

            if (result.error) throw result.error;

            console.log("Cumulative stats updated successfully in Supabase.");
            return true;
        } catch (error) {
            console.error("Error updating cumulative stats:", error);
            return false;
        }
    }

    // Function triggered by the "汇总" button
    async function updateAndDisplayCumulativeStats() {
        if (!isClubAdmin) return alert("请先使用俱乐部管理密码登录。只有管理员才能更新俱乐部累计排名。");
        if (!currentClubId) return alert("错误：未识别俱乐部 ID。");

        // Ensure current session stats are calculated
        updateStats();
        if (Object.keys(playerStats).length === 0 || selectedMatches.filter(m => m.played).length === 0) {
            return alert("本次活动尚无有效比赛记录，无法更新累计排名。");
        }

        // 检查当前会话是否已经保存到tournament_archives表中
        if (currentTournamentId) {
            // 如果已经有tournamentId，说明这个比赛已经保存过了
            // 检查这个比赛是否已经计入了累计统计
            try {
                const { data: tournamentData, error: fetchError } = await supabase
                    .from('tournament_archives')
                    .select('*')
                    .eq('id', currentTournamentId)
                    .single();

                if (fetchError) throw fetchError;

                // 获取当前累计统计数据
                const { data: cumulativeData, error: cumulativeError } = await supabase
                    .from('cumulative_stats')
                    .select('stats')
                    .eq('club_id', currentClubId)
                    .single();

                if (cumulativeError && cumulativeError.code !== 'PGRST116') {
                    throw cumulativeError;
                }

                // 显示当前累计统计数据
                if (cumulativeData && cumulativeData.stats) {
                    displayCumulativeResults(cumulativeData.stats);
                }

                return alert("当前比赛已保存，其数据已经计入累计统计。如需更新，请先删除该比赛记录，然后重新汇总。");
            } catch (e) {
                console.error("检查比赛记录时出错:", e);
                // 如果出错，继续执行下面的代码
            }
        }

        console.log("Updating cumulative stats...");

        // 1. Fetch existing cumulative stats
        const cumulativeStats = await fetchCumulativeStats(currentClubId);
        if (cumulativeStats === null) { // Check for fetch error
            return alert("无法获取俱乐部累计数据，请检查网络连接或稍后重试。");
        }

        // 2. Merge current session stats into cumulative stats
        participants.forEach(participant => {
            const name = participant.name;
            const currentStats = playerStats[name];
            if (!currentStats || currentStats.gamesPlayed === 0) {
                // Skip players who didn't play in this session
                return;
            }

            // Get existing cumulative data for this player or initialize
            let playerCumulative = cumulativeStats[name] || {
                activityCount: 0,
                gamesPlayed: 0,
                wins: 0,
                pointsFor: 0,
                pointsAgainst: 0
            };

            // Update the cumulative data
            playerCumulative.activityCount += 1;
            playerCumulative.gamesPlayed += currentStats.gamesPlayed;
            playerCumulative.wins += currentStats.wins;
            playerCumulative.pointsFor += currentStats.pointsFor;
            playerCumulative.pointsAgainst += currentStats.pointsAgainst;

            // Put the updated data back into the main map
            cumulativeStats[name] = playerCumulative;
            console.log(`   Updated cumulative stats for ${name}:`, playerCumulative);
        });

        // 3. Save updated stats back to Supabase
        const saveSuccess = await updateCumulativeStats(currentClubId, cumulativeStats);
        if (!saveSuccess) {
            return alert("保存累计排名到数据库失败！");
        }

        // 4. Display the updated cumulative results
        displayCumulativeResults(cumulativeStats);

        // 5. 提示用户保存比赛记录，以便将来可以正确处理
        if (!currentTournamentId) {
            alert("累计排名已更新。请记得保存比赛记录，以便将来可以正确管理累计统计数据。");
        } else {
            alert("累计排名已更新。");
        }

        console.log("Cumulative stats updated and displayed.");
    }

    // Displays the cumulative rankings in the dedicated table
    function displayCumulativeResults(cumulativeStatsMap) {
        if (!cumulativeResultsTableBody || !cumulativeResultsSection) {
            console.error("Cumulative results table or section not found!");
            return;
        }

        // --- Existing code to clear table, prepare data, sort, and populate table ---
        cumulativeResultsTableBody.innerHTML = ''; // Clear previous results
        if (Object.keys(cumulativeStatsMap).length === 0) {
            cumulativeResultsTableBody.innerHTML = '<tr><td colspan="6">尚无累计排名数据。</td></tr>';
            return; // Exit if no data
        }
        const playersArray = Object.entries(cumulativeStatsMap).map(([name, stats]) => ({
            name,
            ...stats
        }));

        // Calculate derived stats (Win Rate, Point Ratio)
        playersArray.forEach(player => {
            player.winRate = player.gamesPlayed > 0 ? (player.wins / player.gamesPlayed) : 0;
            player.pointDiffRatio = player.pointsAgainst > 0 ? (player.pointsFor / player.pointsAgainst) : (player.pointsFor > 0 ? Infinity : 0);
        });

        // Sort players
        playersArray.sort((a, b) => {
            // ... (sorting logic remains the same)
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            if (a.pointDiffRatio === Infinity && b.pointDiffRatio !== Infinity) return -1;
            if (b.pointDiffRatio === Infinity && a.pointDiffRatio !== Infinity) return 1;
            if (a.pointDiffRatio === Infinity && b.pointDiffRatio === Infinity) {
                const netPointsA = a.pointsFor - a.pointsAgainst;
                const netPointsB = b.pointsFor - b.pointsAgainst;
                if (netPointsB !== netPointsA) return netPointsB - netPointsA;
            }
            if (b.pointDiffRatio !== a.pointDiffRatio) return b.pointDiffRatio - a.pointDiffRatio;
            if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
            return a.name.localeCompare(b.name);
        });

        // Populate the table
        playersArray.forEach((player, index) => {
            const row = cumulativeResultsTableBody.insertRow();
            row.insertCell(0).textContent = index + 1; // Rank
            row.insertCell(1).textContent = player.name;
            row.insertCell(2).textContent = player.activityCount;
            row.insertCell(3).textContent = player.gamesPlayed;
            row.insertCell(4).textContent = (player.winRate * 100).toFixed(1) + '%';
            let ratioText = '-';
            if (player.pointDiffRatio === Infinity) {
                ratioText = '∞';
            } else if (player.pointDiffRatio >= 0) {
                ratioText = player.pointDiffRatio.toFixed(2);
            }
            row.insertCell(5).textContent = ratioText;
        });
        // --- End of existing logic ---

        // --- REMOVE showing/scrolling as section is now always visible ---
        // cumulativeResultsSection.style.display = 'block';
        // cumulativeResultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // --- Core Logic Functions (Needs Refactoring) ---

    function parseNames() {
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

        // Initialize participants with default settings
        participants = parsedNames.map(name => ({
            name: name,
            maxConsecutive: 2, // Default max consecutive games
            arrivalOffset: 0   // Default arrival/departure offset
        }));
        updateParticipantList();
    }

    function updateParticipantList() {
        participantList.innerHTML = ''; // Clear previous list
        const isAdmin = isClubAdmin;
        participants.forEach((participant, index) => {
            const li = document.createElement('li');
            li.classList.add('participant-item-settings'); // Use a new class for styling if needed

            const avatar = document.createElement('span');
            avatar.classList.add('participant-avatar');
            avatar.textContent = participant.name.charAt(0).toUpperCase();
            li.appendChild(avatar);

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('participant-name');
            nameSpan.textContent = participant.name;
            li.appendChild(nameSpan);

            // Consecutive Games Input
            const consecutiveLabel = document.createElement('label');
            consecutiveLabel.textContent = '连续场次:';
            consecutiveLabel.htmlFor = `p-${index}-consecutive`;
            const consecutiveInput = document.createElement('input');
            consecutiveInput.type = 'number';
            consecutiveInput.id = `p-${index}-consecutive`;
            consecutiveInput.min = 1;
            consecutiveInput.max = 5;
            consecutiveInput.value = participant.maxConsecutive;
            consecutiveInput.dataset.index = index;
            consecutiveInput.dataset.field = 'maxConsecutive';
            consecutiveInput.classList.add('participant-setting-input');
            consecutiveInput.disabled = !isAdmin;
            consecutiveInput.style.width = '50px'; // Adjust width

            // Arrival/Departure Offset Input
            const offsetLabel = document.createElement('label');
            offsetLabel.textContent = '到场调整:';
            offsetLabel.htmlFor = `p-${index}-offset`;
            const offsetInput = document.createElement('input');
            offsetInput.type = 'number';
            offsetInput.id = `p-${index}-offset`;
            offsetInput.min = -8;
            offsetInput.max = 8;
            offsetInput.value = participant.arrivalOffset;
            offsetInput.dataset.index = index;
            offsetInput.dataset.field = 'arrivalOffset';
            offsetInput.classList.add('participant-setting-input');
            offsetInput.disabled = !isAdmin;
            offsetInput.style.width = '50px'; // Adjust width

            li.appendChild(consecutiveLabel);
            li.appendChild(consecutiveInput);
            li.appendChild(offsetLabel);
            li.appendChild(offsetInput);

            participantList.appendChild(li);
        });
        participantCount.textContent = participants.length;
        // Update enable/disable state of inputs based on admin status
         participantList.querySelectorAll('.participant-setting-input').forEach(el => el.disabled = !isAdmin);
    }

    // New handler for participant setting changes
    function handleParticipantSettingChange(event) {
         if (event.target.classList.contains('participant-setting-input')) {
            if (!isClubAdmin) return;

            const index = parseInt(event.target.dataset.index);
            const field = event.target.dataset.field;
            let value = parseInt(event.target.value);
            const min = parseInt(event.target.min);
            const max = parseInt(event.target.max);

            // Validate and clamp value
            if (isNaN(value)) {
                value = (field === 'maxConsecutive') ? 2 : 0; // Default on invalid input
            } else if (value < min) {
                value = min;
            } else if (value > max) {
                value = max;
            }
            event.target.value = value; // Update input visually if clamped

            if (participants[index] && participants[index][field] !== value) {
                participants[index][field] = value;
                console.log(`Set participant ${index} (${participants[index].name}) ${field} to ${value}`);
                // Consider adding visual feedback or maybe prompting re-generation?
            }
        }
    }

    // Helper to parse HH:MM time string to minutes since midnight
    function timeToMinutes(timeStr) {
        if (!timeStr || !timeStr.includes(':')) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes;
    }

    // Helper to format minutes since midnight back to HH:MM
    function minutesToTime(minutes) {
        if (minutes === null || isNaN(minutes)) return ''
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    function generatePairs() {
        // ... (Keep the original generatePairs logic) ...
        allPossiblePairs = []; // Reset
        if (participants.length < 2) return;
        for (let i = 0; i < participants.length; i++) {
            for (let j = i + 1; j < participants.length; j++) {
                allPossiblePairs.push([participants[i].name, participants[j].name]);
            }
        }
    }

    function combinations(arr, k) {
        // ... (Keep the original combinations logic) ...
         if (k < 1 || k > arr.length) return [];
         if (k === arr.length) return [arr];
         if (k === 1) return arr.map(e => [e]);
         let combs = [];
         for (let i = 0; i < arr.length - k + 1; i++) {
             const head = arr.slice(i, i + 1);
             const tailCombs = combinations(arr.slice(i + 1), k - 1);
             for (const tail of tailCombs) { combs.push(head.concat(tail)); }
         }
         return combs;
    }

    function generateMatches() {
        console.log("Generating schedule with player-specific limits and offsets...");
        selectedMatches = [];
        const n = participants.length;
        const gameDuration = parseInt(gameDurationInput.value) || 12; // Use input value or default
        console.log(`Using game duration: ${gameDuration} minutes`);
        if (gameDuration < 5 || gameDuration > 30) {
             return alert("每局时间必须在 5 到 30 分钟之间。");
        }

        // Validation
        if (n < 4) return alert("至少需要4名参与者。");
        if (courts.some(c => !c.startTime || !c.endTime)) {
            return alert("请为所有场地设置有效的开始和结束时间。");
        }
         // ... (rest of time validation for courts) ...
        for (const court of courts) {
            const startMin = timeToMinutes(court.startTime);
            const endMin = timeToMinutes(court.endTime);
            if (startMin === null || endMin === null) {
                 return alert(`场地 ${court.id} 的时间格式无效。请使用 HH:MM 格式。`);
            }
            if (startMin >= endMin) {
                return alert(`场地 ${court.id} 的开始时间必须早于结束时间。`);
            }
        }

        generatePairs();
        if (allPossiblePairs.length < 2) return alert("无法生成足够的配对。");

        let potentialMatchesPool = [];
        // ... (generate potentialMatchesPool as before) ...
        for (let i = 0; i < allPossiblePairs.length; i++) {
            for (let j = i + 1; j < allPossiblePairs.length; j++) {
                const pair1 = allPossiblePairs[i];
                const pair2 = allPossiblePairs[j];
                if (pair1.every(p => !pair2.includes(p))) {
                     potentialMatchesPool.push({
                        id: `match_${i}_${j}`,
                        team1: pair1, team2: pair2,
                        score1: null, score2: null, played: false,
                        courtId: null, startTime: null, endTime: null
                    });
                }
            }
        }
        if (potentialMatchesPool.length === 0) return alert("无法生成任何有效的比赛对阵。");
        potentialMatchesPool.sort(() => Math.random() - 0.5);

        // Target Match Count
        const userInputTarget = parseInt(totalMatchInput.value);
        const calculatedTarget = targetMatchCounts[n] || Math.floor(potentialMatchesPool.length * 0.8);
        let targetCount = (userInputTarget > 0 && userInputTarget <= potentialMatchesPool.length) ? userInputTarget : calculatedTarget;
        targetCount = Math.min(targetCount, potentialMatchesPool.length);
        totalMatchInput.placeholder = `自动计算 (${calculatedTarget})`;
        console.log(`Targeting ${targetCount} matches.`);

        // Generate Time Slots (using new gameDuration)
        let availableSlots = [];
        courts.forEach(court => {
            const startMin = timeToMinutes(court.startTime);
            const endMin = timeToMinutes(court.endTime);
            if (startMin === null || endMin === null || startMin >= endMin) return;
            for (let currentTime = startMin; currentTime + gameDuration <= endMin; currentTime += gameDuration) {
                availableSlots.push({
                    courtId: court.id,
                    startTime: currentTime,
                    endTime: currentTime + gameDuration,
                    isUsed: false,
                    gameIndex: -1 // Assign later based on scheduled order
                });
            }
        });
        availableSlots.sort((a, b) => a.startTime - b.startTime || a.courtId - b.courtId);
        if (availableSlots.length === 0) {
            return alert("没有可用的比赛时间段。");
        }
        console.log(`[Scheduler] Calculated ${availableSlots.length} total available time slots.`); // <-- LOG SLOT COUNT

        // Assign game indices to slots for arrival/departure check
        availableSlots.forEach((slot, index) => slot.gameIndex = index);
        const totalSlotsAvailable = availableSlots.length;
        const estimatedTotalGames = Math.min(targetCount, totalSlotsAvailable);

        // Initialize Player State
        let playerState = participants.reduce((acc, p) => {
            acc[p.name] = {
                gameCount: 0,
                consecutiveGames: 0,
                lastGameEndTime: -1,
                maxConsecutive: p.maxConsecutive,
                arrivalOffset: p.arrivalOffset,
                schedulingScore: 0 // Renamed from appearanceScore
            };
            return acc;
        }, {});

        // Scheduling Loop - Process slots grouped by start time
        let scheduledMatchesCount = 0;
        const MAX_ITERATIONS = potentialMatchesPool.length * availableSlots.length + 100;
        let iterations = 0;
        let currentSlotIndex = 0;

        while (scheduledMatchesCount < targetCount && currentSlotIndex < availableSlots.length && potentialMatchesPool.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++; // Safety break counter

            const currentStartTime = availableSlots[currentSlotIndex].startTime;
            // Find all available slots starting at this exact time
            const slotsAtThisTime = availableSlots.filter(slot => slot.startTime === currentStartTime && !slot.isUsed);

            console.log(`[Scheduler Iteration ${iterations}] Processing time ${minutesToTime(currentStartTime)}. Available courts: ${slotsAtThisTime.map(s=>s.courtId).join(',')}`);

            let consideredInLoop = new Set();
            let scheduledInThisTimeBlock = false;

            // Process all available courts for this specific start time
            for (const slot of slotsAtThisTime) {
                if (scheduledMatchesCount >= targetCount) break; // Stop if target met mid-block
                 if (potentialMatchesPool.length === 0) break; // Stop if no more matches

                let bestMatchForSlot = null;
                let bestMatchIndex = -1;
                let bestScore = +Infinity; // Lower score is better

                // Find best match for this specific court/slot
                for (let j = 0; j < potentialMatchesPool.length; j++) {
                    const potentialMatch = potentialMatchesPool[j];
                    const matchId = potentialMatch.id;
                    // No need for consideredInLoop if we remove scheduled matches immediately

                    const playersInMatch = [...potentialMatch.team1, ...potentialMatch.team2];
                    let canSchedule = true;
                    // let violatesConsecutive = false; // Not needed for penalty here

                    // Check Hard Constraints
                    for (const playerName of playersInMatch) {
                        const pData = participants.find(p => p.name === playerName);
                        if (!pData) { canSchedule = false; break; }
                        const pState = playerState[playerName];
                        // Effective limit calculation remains the same
                        let limit = pData.maxConsecutive;
                        if (courts.length > 1) { limit += 1; }
                        limit = Math.min(limit, 5);
                        // Arrival/Departure/Simultaneous checks remain the same
                        if (pData.arrivalOffset > 0 && slot.gameIndex < pData.arrivalOffset) { canSchedule = false; break; }
                        if (pData.arrivalOffset < 0 && slot.gameIndex >= (estimatedTotalGames + pData.arrivalOffset) ){ canSchedule = false; break; }
                        if (pState.lastGameEndTime > slot.startTime) { canSchedule = false; break; }
                        // Consecutive limit check - NOW A HARD CONSTRAINT AGAIN?
                        // Based on latest request, seems like LOW SCORE is the main driver.
                        // Let's keep consecutive check as HARD for now, as penalty is applied *after* slot.
                         if (pState.lastGameEndTime === slot.startTime && pState.consecutiveGames >= limit) {
                             console.log(`[Debug Slot ${slot.gameIndex}, Time ${minutesToTime(slot.startTime)}] Player ${playerName} unscheduled: Consecutive Limit (Played ${pState.consecutiveGames} >= Limit ${limit})`);
                              canSchedule = false; break;
                         }
                    }

                    // If hard constraints passed, calculate score based on scheduling score
                    if (canSchedule) {
                        // Base score = sum of scheduling scores
                        let currentScore = playersInMatch.reduce((sum, p) => sum + playerState[p].schedulingScore, 0);

                        // NO penalty applied during selection now.

                        // Check if this match is the best (lowest) score so far for this slot
                        if (currentScore < bestScore) {
                            bestScore = currentScore;
                            bestMatchForSlot = potentialMatch;
                            bestMatchIndex = j;
                        }
                    }
                } // End potential match loop for this slot

                // Schedule best match found for this slot
                if (bestMatchForSlot) {
                    console.log(`[Scheduler Slot ${slot.gameIndex}, Time ${minutesToTime(slot.startTime)}] Scheduling Match ${bestMatchForSlot.id} on Court ${slot.courtId}. Best Score: ${bestScore}`);
                    bestMatchForSlot.courtId = slot.courtId;
                    bestMatchForSlot.startTime = minutesToTime(slot.startTime);
                    bestMatchForSlot.endTime = minutesToTime(slot.endTime);

                    selectedMatches.push(bestMatchForSlot);
                    scheduledMatchesCount++;
                    slot.isUsed = true;
                    scheduledInThisTimeBlock = true;

                    // Update player states (Increment score by 50, with discount)
                    const playersInScheduledMatch = [...bestMatchForSlot.team1, ...bestMatchForSlot.team2];
                    participants.forEach(p => {
                        const pState = playerState[p.name];
                        if (playersInScheduledMatch.includes(p.name)) {
                            pState.gameCount++;

                            // Determine consecutive count *before* adding score
                            let newConsecutiveCount = 1;
                            if (pState.lastGameEndTime === slot.startTime) {
                                newConsecutiveCount = pState.consecutiveGames + 1;
                            } // else, it's the 1st game after a break

                            // Update consecutive count for the next check
                            pState.consecutiveGames = newConsecutiveCount;

                            // --- START REPLACE BLOCK ---
                            // --- NEW SCORE LOGIC based on player's maxConsecutive setting ---
                            const participant = participants.find(participantData => participantData.name === p.name); // Find participant data
                            let scoreIncrement = 50; // Default score
                            if (participant) {
                                if (participant.maxConsecutive === 3) {
                                    scoreIncrement = 40; // 40 points
                                } else if (participant.maxConsecutive === 4) {
                                    scoreIncrement = 36; // 36 points
                                } else if (participant.maxConsecutive >= 5) { // Treat 5 or more the same
                                    scoreIncrement = 32; // 32 points
                                }
                                // If maxConsecutive is 1 or 2, scoreIncrement remains 50
                            } else {
                                console.warn(`Participant data not found for ${p.name} when calculating score.`);
                            }
                            // --- END NEW SCORE LOGIC ---

                            // Add the calculated score, rounded
                            pState.schedulingScore += Math.round(scoreIncrement);
                            console.log(`   Player ${p.name}: Played game ${pState.gameCount} (Actual Consecutive: ${newConsecutiveCount}). MaxCons: ${participant?.maxConsecutive || 'N/A'}. Score +${Math.round(scoreIncrement)} -> ${pState.schedulingScore}`);
                            // --- END REPLACE BLOCK ---

                            // Update last game end time
                            pState.lastGameEndTime = slot.endTime;
                        } else {
                            // Reset consecutive count for players resting *during this exact slot start time*
                            if (pState.lastGameEndTime <= slot.startTime) {
                               if (pState.consecutiveGames > 0) {
                                   // Only log reset if they actually *were* playing consecutively
                                   console.log(`   Player ${p.name}: Rested. Consecutive count reset from ${pState.consecutiveGames} to 0.`);
                               }
                               pState.consecutiveGames = 0;
                            }
                        }
                    });
                    // Remove scheduled match from pool immediately
                    potentialMatchesPool.splice(bestMatchIndex, 1);
                } else {
                    console.log(`[Scheduler Slot ${slot.gameIndex}, Time ${minutesToTime(slot.startTime)}] No suitable match found for Court ${slot.courtId}.`);
                }
            } // End loop for slots at this specific time

            // --- End-of-Time-Block Processing ---
            if (scheduledInThisTimeBlock) { // Only process if matches were actually scheduled
                 console.log(`--- Processing End of Time Block: ${minutesToTime(currentStartTime)} ---`);
                 participants.forEach(p => {
                    const pState = playerState[p.name];
                    const oldScore = pState.schedulingScore;

                    // Reset score (keep last 3 digits)
                    pState.schedulingScore = oldScore % 1000;
                    const scoreAfterReset = pState.schedulingScore;

                    // Apply penalty if consecutive limit is met/exceeded *now*
                    const pData = participants.find(pData => pData.name === p.name);
                    let limit = pData.maxConsecutive;
                    if (courts.length > 1) { limit += 1; }
                    limit = Math.min(limit, 5);

                    if (pState.consecutiveGames >= limit) {
                        pState.schedulingScore += 10000;
                        console.log(`   Player ${p.name}: Limit ${limit} reached (played ${pState.consecutiveGames}). Score ${oldScore} -> Reset ${scoreAfterReset} -> Penalized ${pState.schedulingScore}`);
                    } else if (oldScore !== scoreAfterReset) {
                         console.log(`   Player ${p.name}: Score ${oldScore} -> Reset ${scoreAfterReset}`);
                    }
                 });
                 console.log(`--- End of Time Block Processing ---`);
            }
            // Move to the next available time slot index
            currentSlotIndex += slotsAtThisTime.length; // Jump past all slots processed at this time
             if (currentSlotIndex >= availableSlots.length && scheduledMatchesCount < targetCount) {
                  console.log(`[Scheduler] Loop terminating: Processed all time slots, but target not reached.`);
                  break;
             }
             // Other termination checks
            if (scheduledMatchesCount >= targetCount) {
                console.log(`[Scheduler] Loop terminating: Target count (${targetCount}) reached.`);
                break;
            }
            if (potentialMatchesPool.length === 0) {
                console.log(`[Scheduler] Loop terminating: No potential matches left in pool.`);
                break;
            }
             if (!scheduledInThisTimeBlock && currentSlotIndex < availableSlots.length) {
                  console.warn(`[Scheduler] Loop terminating early: No matches could be scheduled in time block ${minutesToTime(currentStartTime)} (Iteration ${iterations}, Scheduled ${scheduledMatchesCount}).`);
                  break;
             }

        } // End while loop

       // ... (rest of function: max iterations check, final output) ...
    }

    function displayMatches() {
        // Needs modification to show court/time and edit button
        matchList.innerHTML = '';
        if (selectedMatches.length === 0) { matchList.innerHTML = '<p>请先生成对阵。</p>'; return; }
        selectedMatches.forEach((match, index) => {
            const card = document.createElement('div');
            card.classList.add('match-card');
            card.dataset.matchIndex = index;
            card.draggable = isAdminEditingSchedule; // Make draggable if in edit mode

            const team1Div = createTeamDiv(match.team1);
            const team2Div = createTeamDiv(match.team2);
            const vsSpan = document.createElement('span'); vsSpan.classList.add('vs'); vsSpan.textContent = 'PK';

            // Display Court and Time
            const scheduleInfo = document.createElement('div');
            scheduleInfo.className = 'schedule-info';
            const courtText = match.courtId ? `场地 ${match.courtId}` : '未分配';
            const timeText = match.startTime ? `时间 ${match.startTime}` : '未安排'; // Assume startTime is formatted string HH:MM
            scheduleInfo.textContent = `${courtText} / ${timeText}`;

            const scoreDiv = document.createElement('div'); scoreDiv.classList.add('score-input');
            const score1Input = document.createElement('input'); score1Input.type = 'number'; score1Input.classList.add('score', 'score1'); score1Input.placeholder = '分数'; score1Input.value = match.score1 !== null ? match.score1 : '';
            const scoreSeparator = document.createElement('span'); scoreSeparator.textContent = '-';
            const score2Input = document.createElement('input'); score2Input.type = 'number'; score2Input.classList.add('score', 'score2'); score2Input.placeholder = '分数'; score2Input.value = match.score2 !== null ? match.score2 : '';
            scoreDiv.appendChild(score1Input); scoreDiv.appendChild(scoreSeparator); scoreDiv.appendChild(score2Input);

            const actionsDiv = document.createElement('div'); actionsDiv.classList.add('actions');
            const saveButtonEl = document.createElement('button'); saveButtonEl.classList.add('save-score-button');
            saveButtonEl.textContent = (match.score1 !== null && match.score2 !== null) ? '更新结果' : '记录比分';
            actionsDiv.appendChild(saveButtonEl);

            // Add Modify Players button (only when admin is logged in)
            const modifyPlayersButton = document.createElement('button');
            modifyPlayersButton.textContent = '修改人员';
            modifyPlayersButton.classList.add('modify-players-button', 'secondary', 'small');
            modifyPlayersButton.dataset.matchIndex = index; // Store index
            modifyPlayersButton.style.marginLeft = '5px'; // Add some spacing
            modifyPlayersButton.onclick = () => modifyMatchPlayers(index);
            // --- FIX: Set disabled state based on isClubAdmin when creating ---
            modifyPlayersButton.disabled = !isClubAdmin;
            // --- END FIX ---
            actionsDiv.appendChild(modifyPlayersButton);

            // Add Edit button for admin mode (This seems redundant if we have modify players?)
            // Let's comment this out for now unless a different edit function is needed.
            /*
            if (isAdminEditingSchedule) {
                const editButton = document.createElement('button');
                editButton.textContent = '编辑';
                editButton.classList.add('edit-match-button', 'secondary', 'small');
                editButton.onclick = () => editMatchDetails(index);
                actionsDiv.appendChild(editButton);
            }
            */

            card.appendChild(scheduleInfo); // Add schedule info first
            card.appendChild(team1Div);
            card.appendChild(vsSpan);
            card.appendChild(team2Div);
            card.appendChild(scoreDiv);
            card.appendChild(actionsDiv);
            matchList.appendChild(card);
        });
        // Update disabled state
        const isDisabled = !isClubAdmin;
        matchList.querySelectorAll('.score, .save-score-button').forEach(el => el.disabled = isDisabled);
        // Draggable state is handled by isAdminEditingSchedule flag during creation
    }

    function editMatchDetails(matchIndex) {
        // TODO: Implement modal or inline editing for match details (players, court, time)
        console.log(`Editing match index: ${matchIndex}`);
        alert("编辑对阵功能尚未完全实现。");
    }

    // Function to open and populate the modify players modal
    function modifyMatchPlayers(matchIndex) {
        console.log('modifyMatchPlayers called with index:', matchIndex); // <-- Added log
        console.log('Current isClubAdmin status:', isClubAdmin); // <-- Added log

        if (!isClubAdmin) {
            alert("请先使用俱乐部管理密码登录。");
            return;
        }
        console.log(`Opening modify players modal for match index: ${matchIndex}`);
        const match = selectedMatches[matchIndex];
        if (!match) {
            console.error("Match data not found for index:", matchIndex);
            return;
        }

        // Store the index
        editMatchIndexInput.value = matchIndex;

        // Get all participant names
        const playerNames = participants.map(p => p.name);

        // Populate the select elements
        const selects = [
            { element: modifyT1P1Select, current: match.team1[0] },
            { element: modifyT1P2Select, current: match.team1[1] },
            { element: modifyT2P1Select, current: match.team2[0] },
            { element: modifyT2P2Select, current: match.team2[1] }
        ];

        selects.forEach(selInfo => {
            const selectElement = selInfo.element;
            selectElement.innerHTML = ''; // Clear previous options

            // Add a default placeholder
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '--选择队员--';
            selectElement.appendChild(placeholder);

            // Add all participants
            playerNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                if (name === selInfo.current) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
        });

        // Clear previous errors and show modal
        console.log('Modal element found:', modifyPlayersModal); // <-- Added log
        modifyPlayersError.style.display = 'none';
        modifyPlayersError.textContent = '';
        modifyPlayersModal.style.display = 'flex';
        console.log('Modal display style set to flex'); // <-- Added log
    }

    // Function to hide the modal
    function hideModifyPlayersModal() {
        modifyPlayersModal.style.display = 'none';
    }

    // Function to handle saving player changes
    function handleSaveChanges() {
        const matchIndex = parseInt(editMatchIndexInput.value);
        if (isNaN(matchIndex) || matchIndex < 0 || matchIndex >= selectedMatches.length) {
             console.error("Invalid match index on save.");
             modifyPlayersError.textContent = '无法保存更改，比赛索引无效。';
             modifyPlayersError.style.display = 'block';
             return;
        }

        const p1_1 = modifyT1P1Select.value;
        const p1_2 = modifyT1P2Select.value;
        const p2_1 = modifyT2P1Select.value;
        const p2_2 = modifyT2P2Select.value;

        const selectedPlayers = [p1_1, p1_2, p2_1, p2_2];

        // Validation 1: Ensure 4 players selected
        if (selectedPlayers.some(p => !p)) {
            modifyPlayersError.textContent = '请为所有位置选择队员。';
            modifyPlayersError.style.display = 'block';
            return;
        }

        // Validation 2: Ensure 4 *unique* players selected
        const uniquePlayers = new Set(selectedPlayers);
        if (uniquePlayers.size !== 4) {
            modifyPlayersError.textContent = '每位队员只能选择一次，不能重复。';
            modifyPlayersError.style.display = 'block';
            return;
        }

        // Validation passed, update the match data
        const originalMatch = selectedMatches[matchIndex];
        selectedMatches[matchIndex] = {
            ...originalMatch, // Keep score, court, time etc.
            team1: [p1_1, p1_2],
            team2: [p2_1, p2_2]
        };

        console.log(`Match ${matchIndex} players updated to: ${[p1_1, p1_2].join('&')} vs ${[p2_1, p2_2].join('&')}`);

        // Hide modal and refresh display
        hideModifyPlayersModal();
        displayMatches(); // Update the match list UI

        // Recalculate stats if the match was already played
        if (originalMatch.played) {
             console.log("Recalculating stats due to player change in a played match.");
             updateStats();
             displayResults();
        }
    }

    function createTeamDiv(team) {
        // ... (Keep the original createTeamDiv logic) ...
        const div = document.createElement('div'); div.classList.add('team');
        team.forEach(player => {
            const playerDiv = document.createElement('div'); playerDiv.classList.add('player');
            const avatar = document.createElement('span'); avatar.classList.add('player-avatar'); avatar.textContent = player.charAt(0).toUpperCase();
            playerDiv.appendChild(avatar); playerDiv.appendChild(document.createTextNode(player));
            div.appendChild(playerDiv);
        }); return div;
    }

    function recordScore(matchIndex) {
        // ... (Keep the original recordScore logic) ...
        if (matchIndex < 0 || matchIndex >= selectedMatches.length) return;
        const match = selectedMatches[matchIndex];
        const card = matchList.querySelector(`.match-card[data-match-index="${matchIndex}"]`);
        if (!card) return;
        const score1Input = card.querySelector('.score1');
        const score2Input = card.querySelector('.score2');
        const score1 = parseInt(score1Input.value);
        const score2 = parseInt(score2Input.value);

        if (!isNaN(score1) && !isNaN(score2)) {
            match.score1 = score1; match.score2 = score2; match.played = true;
            const button = card.querySelector('.save-score-button'); if (button) button.textContent = '更新结果';
            updateStats(); displayResults(); updateMatchProgress();
        } else {
            if (match.played) { // Reset only if it was played
                match.score1 = null; match.score2 = null; match.played = false;
                updateStats(); displayResults(); updateMatchProgress();
                const button = card.querySelector('.save-score-button'); if (button) button.textContent = '记录比分';
            }
        }
    }

    function initializeStats() {
        // ... (Keep the original initializeStats logic) ...
        playerStats = {};
        participants.forEach(participant => {
            const name = participant.name;
            playerStats[name] = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, netPoints: 0, gamesPlayed: 0, winRate: 0, avgNetPoints: 0 };
        });
    }

    function updateStats() {
        // ... (Keep the original updateStats logic) ...
        initializeStats();
        selectedMatches.forEach(match => {
            if (match.played && typeof match.score1 === 'number' && typeof match.score2 === 'number') {
                const { team1, team2, score1, score2 } = match;
                const winner = score1 > score2 ? team1 : team2;
                const loser = score1 > score2 ? team2 : team1;
                const winScore = Math.max(score1, score2);
                const loseScore = Math.min(score1, score2);
                winner.forEach(player => { if (!playerStats[player]) initializeStatsForPlayer(player); playerStats[player].wins++; playerStats[player].pointsFor += winScore; playerStats[player].pointsAgainst += loseScore; playerStats[player].gamesPlayed++; });
                loser.forEach(player => { if (!playerStats[player]) initializeStatsForPlayer(player); playerStats[player].losses++; playerStats[player].pointsFor += loseScore; playerStats[player].pointsAgainst += winScore; playerStats[player].gamesPlayed++; });
            }
        });
        participants.forEach(participant => {
            const name = participant.name; const stats = playerStats[name]; if (!stats) return;
            stats.netPoints = stats.pointsFor - stats.pointsAgainst;
            stats.winRate = stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) : 0;
            stats.avgNetPoints = stats.gamesPlayed > 0 ? (stats.netPoints / stats.gamesPlayed) : 0;
        });
    }

    function initializeStatsForPlayer(playerName) {
        // ... (Keep the original initializeStatsForPlayer logic) ...
         if (!playerStats[playerName]) { playerStats[playerName] = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, netPoints: 0, gamesPlayed: 0, winRate: 0, avgNetPoints: 0 }; }
    }

    function displayResults() {
        // ... (Keep the original displayResults logic) ...
        resultsTableBody.innerHTML = '';
        const rankedPlayers = participants.map(participant => ({ name: participant.name, ...(playerStats[participant.name] || { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, netPoints: 0, gamesPlayed: 0, winRate: 0, avgNetPoints: 0 }) }))
            .sort((a, b) => {
                if (b.winRate !== a.winRate) return b.winRate - a.winRate;
                if (b.netPoints !== a.netPoints) return b.netPoints - a.netPoints;
                if (b.avgNetPoints !== a.avgNetPoints) return b.avgNetPoints - a.avgNetPoints;
                return a.name.localeCompare(b.name);
            });
        rankedPlayers.forEach((player, index) => {
            const row = resultsTableBody.insertRow();
            row.insertCell(0).textContent = index + 1;
            const nameCell = row.insertCell(1);
            const avatar = document.createElement('span'); avatar.classList.add('participant-avatar'); avatar.style.backgroundColor = getAvatarColor(index); avatar.textContent = player.name.charAt(0).toUpperCase();
            nameCell.appendChild(avatar); nameCell.appendChild(document.createTextNode(` ${player.name}`)); nameCell.style.textAlign = 'left';
            row.insertCell(2).textContent = `${player.wins}-${player.losses}`;
            row.insertCell(3).textContent = (player.winRate * 100).toFixed(1) + '%';
            row.insertCell(4).textContent = player.netPoints > 0 ? `+${player.netPoints}` : player.netPoints;
            row.insertCell(5).textContent = player.avgNetPoints.toFixed(1);
        });
    }

    function getAvatarColor(rank) {
        // ... (Keep the original getAvatarColor logic) ...
        if (rank === 0) return '#dc3545'; if (rank === 1) return '#ffc107'; if (rank === 2) return '#fd7e14'; return '#6c757d';
    }

    function updateMatchProgress() {
        // ... (Keep the original updateMatchProgress logic) ...
        const playedCount = selectedMatches.filter(m => m.played).length;
        const totalCount = selectedMatches.length;
        matchProgress.textContent = `${playedCount}/${totalCount} 场`;
    }

    function clearResults() {
        // ... (Keep the original clearResults logic) ...
         resultsTableBody.innerHTML = '';
    }

    function resetApp(confirmReset = true) {
        // ... (Keep the original resetApp logic, adjusted for admin check) ...
        if (!isClubAdmin && confirmReset) { alert('请先使用俱乐部管理密码登录。'); return; }
        if (confirmReset && !confirm('确定要重置此俱乐部的所有比赛数据吗？此操作无法撤销。')) { return; }
        participants = []; allPossiblePairs = []; selectedMatches = []; playerStats = {};
        nameInput.value = ''; totalMatchInput.value = '';
        updateParticipantList(); displayMatches(); clearResults();
        currentTournamentId = null; // Reset current tournament ID for this club session
        console.log("App reset for club:", currentClubId);
    }

    // --- Save/Load Functions (Firestore - Modified for Club Context) ---

    async function saveStateToFirestore() {
        if (!isClubAdmin) return alert("请先使用俱乐部管理密码登录。");
        if (!currentClubId) return alert("错误：未识别俱乐部 ID，无法保存。");
        if (participants.length === 0 && selectedMatches.length === 0) return alert("没有可保存的数据。");

        // Generate default save name with Date and HHMM Time
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`; // HHMM
        const defaultSaveName = `${currentClubName}_${dateStr}_${timeStr}`;

        // Use currentTournamentId if it exists (meaning we loaded it), otherwise suggest default
        const suggestedName = currentTournamentId
            ? (selectedMatches.length > 0 ? selectedMatches[0].saveName || defaultSaveName : defaultSaveName) // Try to get loaded name
            : defaultSaveName;
        const saveName = prompt("请输入保存名称:", suggestedName);

        if (!saveName) return alert("保存已取消。");

        // 获取当前会话的用户信息
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

        const state = {
            saveFormatVersion: 1,
            participants: participants,
            matches: selectedMatches,
            targetMatchCount: totalMatchInput.value || null,
            courtConfig: courts,
            gameDuration: parseInt(gameDurationInput.value) || 12 // 保存比赛时长
        };

        try {
            console.log("Saving state to Supabase...", {
                currentTournamentId,
                saveName,
                userId,
                club_id: currentClubId
            });

            // 创建一个完整的对象，确保所有字段名与数据库中的列名完全匹配
            const record = {
                savename: saveName,
                userid: userId,
                club_id: currentClubId,
                timestamp: new Date().toISOString(),
                state_data: state
            };

            console.log("Record to save:", record);

            let result;
            if (currentTournamentId) {
                // 更新现有记录
                result = await supabase
                    .from('tournament_archives')
                    .update(record)
                    .eq('id', currentTournamentId);

                if (result.error) throw result.error;
                alert(`状态 '${saveName}' 已更新。`);
            } else {
                // 创建新记录
                result = await supabase
                    .from('tournament_archives')
                    .insert(record);

                if (result.error) throw result.error;

                // 获取新创建的记录ID
                const { data: newRecord, error: idError } = await supabase
                    .from('tournament_archives')
                    .select('id')
                    .eq('savename', saveName)
                    .eq('club_id', currentClubId)
                    .order('timestamp', { ascending: false })
                    .limit(1)
                    .single();

                if (idError) throw idError;

                currentTournamentId = newRecord.id;

                // 检查是否需要自动计入累计统计
                // 获取当前累计统计数据
                updateStats(); // 确保统计数据是最新的
                const { data: cumulativeData, error: cumulativeError } = await supabase
                    .from('cumulative_stats')
                    .select('stats')
                    .eq('club_id', currentClubId)
                    .single();

                if (!cumulativeError || cumulativeError.code === 'PGRST116') {
                    // 如果成功获取数据或者是"没有找到记录"错误
                    const cumulativeStats = cumulativeData?.stats || {};
                    let statsUpdated = false;

                    // 合并当前会话统计数据到累计统计
                    participants.forEach(participant => {
                        const name = participant.name;
                        const currentStats = playerStats[name];
                        if (!currentStats || currentStats.gamesPlayed === 0) {
                            // 跳过本次会话中没有参与比赛的玩家
                            return;
                        }

                        // 获取现有累计数据或初始化
                        let playerCumulative = cumulativeStats[name] || {
                            activityCount: 0,
                            gamesPlayed: 0,
                            wins: 0,
                            pointsFor: 0,
                            pointsAgainst: 0
                        };

                        // 更新累计数据
                        playerCumulative.activityCount += 1;
                        playerCumulative.gamesPlayed += currentStats.gamesPlayed;
                        playerCumulative.wins += currentStats.wins;
                        playerCumulative.pointsFor += currentStats.pointsFor;
                        playerCumulative.pointsAgainst += currentStats.pointsAgainst;

                        // 将更新后的数据放回主映射
                        cumulativeStats[name] = playerCumulative;
                        statsUpdated = true;
                    });

                    // 如果有更新，保存累计统计数据
                    if (statsUpdated) {
                        await updateCumulativeStats(currentClubId, cumulativeStats);
                        // 显示更新后的累计统计数据
                        displayCumulativeResults(cumulativeStats);
                    }
                }

                alert(`状态已保存为: ${saveName}，并已自动计入累计统计。`);
            }
        } catch (e) {
            console.error("Error saving state to Supabase:", e);
            alert("保存状态到数据库失败！" + e.message);
        }
    }

    function showLoadFromFirestoreModal() {
        // REMOVE isClubAdmin check - Allow members to load
        // if (!isClubAdmin) return alert("请先使用俱乐部管理密码登录。");
        if (!currentClubId) return alert("错误：未识别俱乐部 ID，无法加载。");
        populateLoadModalFromFirestore();
        loadModal.style.display = 'flex';
    }

    async function populateLoadModalFromFirestore() {
        // REMOVE isClubAdmin check
        // if (!isClubAdmin || !currentClubId) return;
        if (!currentClubId) { // Still need club ID
            console.error("populateLoadModalFromFirestore called without currentClubId");
            return;
        }

        savedGamesList.innerHTML = '<li>正在加载此俱乐部保存的比赛...</li>';

        try {
            console.log("Fetching saved tournaments for club:", currentClubId);
            // 查询属于当前俱乐部的记录，按时间戳降序排列
            const { data: tournaments, error } = await supabase
                .from('tournament_archives')
                .select('*')
                .eq('club_id', currentClubId)
                .order('timestamp', { ascending: false });

            if (error) throw error;

            console.log("Fetched tournaments:", tournaments);
            savedGamesList.innerHTML = '';

            if (!tournaments || tournaments.length === 0) {
                savedGamesList.innerHTML = `<li>此俱乐部 (${currentClubName}) 没有找到已保存的比赛。</li>`;
                return;
            }

            tournaments.forEach(tournament => {
                const li = document.createElement('li');
                const nameSpan = document.createElement('span');
                nameSpan.textContent = tournament.savename || `未命名 (${tournament.id.substring(0, 6)}...)`;
                nameSpan.style.flexGrow = '1'; nameSpan.style.marginRight = '10px'; nameSpan.style.cursor = 'pointer';

                const timestamp = tournament.timestamp ? new Date(tournament.timestamp).toLocaleString() : '未知日期';
                const timeSpan = document.createElement('span'); timeSpan.textContent = ` (${timestamp})`;
                timeSpan.style.fontSize = '0.8em'; timeSpan.style.color = '#666';
                nameSpan.appendChild(timeSpan);

                nameSpan.addEventListener('click', () => {
                    if (confirm(`确定要加载比赛 '${nameSpan.textContent.split(' (')[0]}' 吗？当前进度将丢失。`)) {
                        loadStateFromFirestore(tournament.id);
                    }
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '删除'; deleteBtn.classList.add('delete-save');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`确定要永久删除比赛 '${nameSpan.textContent.split(' (')[0]}' 吗？`)) {
                        deleteStateFromFirestore(tournament.id);
                    }
                });

                li.appendChild(nameSpan); li.appendChild(deleteBtn);
                savedGamesList.appendChild(li);
            });

        } catch (e) {
            console.error("Error fetching saved tournaments:", e);
            savedGamesList.innerHTML = '<li>加载保存的比赛失败。</li>';
            alert("加载保存列表失败！");
        }
    }

    async function loadStateFromFirestore(tournamentId) {
         // REMOVE isClubAdmin check
         // if (!isClubAdmin || !tournamentId) return;
         if (!tournamentId) return; // Still need tournament ID

        try {
            const { data: tournament, error } = await supabase
                .from('tournament_archives')
                .select('*')
                .eq('id', tournamentId)
                .single();

            if (error) throw error;

            if (!tournament || tournament.club_id !== currentClubId) { // Verify club ID match
                alert(`无法加载状态: ID ${tournamentId} 未找到或不属于此俱乐部！`);
                populateLoadModalFromFirestore();
                return;
            }

            resetApp(false); // Clear current state

            const stateData = tournament.state_data;
            participants = (stateData.participants || []).map(p => ({
                name: p.name || '未知',
                maxConsecutive: p.maxConsecutive !== undefined ? p.maxConsecutive : 2,
                arrivalOffset: p.arrivalOffset !== undefined ? p.arrivalOffset : 0
            }));

            selectedMatches = stateData.matches || [];
            totalMatchInput.value = stateData.targetMatchCount || '';
            currentTournamentId = tournamentId; // Set the loaded tournament ID

            // Load game duration
            gameDurationInput.value = stateData.gameDuration || 12;

            // Load courts
            if (stateData.courtConfig && Array.isArray(stateData.courtConfig) && stateData.courtConfig.length > 0) {
                courts = stateData.courtConfig;
            } else {
                courts = [{ id: 1, startTime: '', endTime: '' }];
            }
            displayCourtConfig();

            // 设置保存名称 - 使用小写 savename
            if (tournament.savename && selectedMatches.length > 0) {
                selectedMatches[0].saveName = tournament.savename;
            }
            updateParticipantList();
            displayMatches();
            updateStats();
            displayResults();
            updateMatchProgress();

            loadModal.style.display = 'none';
            alert(`比赛 '${tournament.savename || tournamentId}' 已加载。`);

        } catch (e) {
            console.error(`Error loading state ${tournamentId}:`, e);
            alert(`加载状态 ${tournamentId} 失败！`);
        }
    }

    async function deleteStateFromFirestore(tournamentId) {
        // KEEP isClubAdmin check - Only admin should delete
        if (!isClubAdmin || !tournamentId) return;

        try {
            // 1. 首先获取要删除的汇总结果详细数据
            const { data: tournamentData, error: fetchError } = await supabase
                .from('tournament_archives')
                .select('*')
                .eq('id', tournamentId)
                .single();

            if (fetchError) throw fetchError;

            if (!tournamentData || !tournamentData.club_id) {
                throw new Error('无法获取汇总结果数据');
            }

            const clubId = tournamentData.club_id;
            const stateData = tournamentData.state_data;

            // 2. 获取当前累计统计数据
            const { data: cumulativeData, error: cumulativeError } = await supabase
                .from('cumulative_stats')
                .select('stats')
                .eq('club_id', clubId)
                .single();

            if (cumulativeError && cumulativeError.code !== 'PGRST116') {
                throw cumulativeError;
            }

            // 3. 从累计统计中减去被删除的汇总结果数据
            if (cumulativeData && stateData && stateData.participants && stateData.matches) {
                const currentStats = cumulativeData.stats || {};

                // 计算这次比赛中每个玩家的统计数据
                const playerStats = {};

                // 初始化玩家统计
                stateData.participants.forEach(participant => {
                    // 使用参与者的名称作为键
                    const playerName = typeof participant === 'string' ? participant : participant.name;
                    if (playerName) {
                        playerStats[playerName] = {
                            activityCount: 1, // 每个玩家参加一次活动
                            gamesPlayed: 0,
                            wins: 0,
                            pointsFor: 0,
                            pointsAgainst: 0
                        };
                    }
                });

                // 计算比赛统计
                stateData.matches.forEach(match => {
                    if (match.played && typeof match.score1 === 'number' && typeof match.score2 === 'number') {
                        const { team1, team2, score1, score2 } = match;
                        const winner = score1 > score2 ? team1 : team2;
                        const loser = score1 > score2 ? team2 : team1;
                        const winScore = Math.max(score1, score2);
                        const loseScore = Math.min(score1, score2);

                        // 更新获胜队伍的统计
                        winner.forEach(player => {
                            if (playerStats[player]) {
                                playerStats[player].wins++;
                                playerStats[player].pointsFor += winScore;
                                playerStats[player].pointsAgainst += loseScore;
                                playerStats[player].gamesPlayed++;
                            }
                        });

                        // 更新失败队伍的统计
                        loser.forEach(player => {
                            if (playerStats[player]) {
                                playerStats[player].pointsFor += loseScore;
                                playerStats[player].pointsAgainst += winScore;
                                playerStats[player].gamesPlayed++;
                            }
                        });
                    }
                });

                // 更新累计统计数据
                let statsUpdated = false;
                for (const [playerName, stats] of Object.entries(playerStats)) {
                    if (currentStats[playerName]) {
                        // 减去该玩家在此次比赛中的数据
                        currentStats[playerName].activityCount = Math.max(0, (currentStats[playerName].activityCount || 1) - 1);
                        currentStats[playerName].gamesPlayed = Math.max(0, (currentStats[playerName].gamesPlayed || 0) - (stats.gamesPlayed || 0));
                        currentStats[playerName].wins = Math.max(0, (currentStats[playerName].wins || 0) - (stats.wins || 0));
                        currentStats[playerName].pointsFor = Math.max(0, (currentStats[playerName].pointsFor || 0) - (stats.pointsFor || 0));
                        currentStats[playerName].pointsAgainst = Math.max(0, (currentStats[playerName].pointsAgainst || 0) - (stats.pointsAgainst || 0));

                        // 如果玩家的所有数据都变为0，则从统计中移除该玩家
                        if (currentStats[playerName].gamesPlayed === 0) {
                            delete currentStats[playerName];
                        }

                        statsUpdated = true;
                    }
                }

                // 只有在有更新时才保存累计统计数据
                if (statsUpdated) {
                    // 更新累计统计数据
                    const { error: updateError } = await supabase
                        .from('cumulative_stats')
                        .update({ stats: currentStats })
                        .eq('club_id', clubId);

                    if (updateError) throw updateError;

                    // 刷新累计统计显示
                    displayCumulativeResults(currentStats);
                    console.log("累计统计数据已更新");
                } else {
                    console.log("没有需要更新的累计统计数据");
                }
            } else {
                console.log("没有找到累计统计数据或比赛数据不完整，无法更新累计统计");
            }

            // 4. 删除汇总结果记录
            const { error } = await supabase
                .from('tournament_archives')
                .delete()
                .eq('id', tournamentId);

            if (error) throw error;

            // 如果当前加载的是被删除的记录，则重置应用
            if (currentTournamentId === tournamentId) {
                resetApp(false);
                currentTournamentId = null;
            }

            // 刷新列表
            populateLoadModalFromFirestore();
            alert('比赛记录已成功删除，并已更新累计统计数据。');
        } catch (e) {
            console.error(`删除比赛记录失败（ID: ${tournamentId}）:`, e);
            alert('删除比赛记录失败！' + e.message);
        }
    }

    // --- Export Function (Mostly unchanged, might add club name to title) ---
    function exportToHtml() {
        // ... (Keep the original exportToHtml logic, maybe update title) ...
        if (participants.length === 0 && selectedMatches.length === 0) { alert("没有可导出的数据。"); return; }
        updateStats();
        const currentRankedPlayers = participants.map(p => ({ name: p.name, ...(playerStats[p.name] || { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, netPoints: 0, gamesPlayed: 0, winRate: 0, avgNetPoints: 0 }) }))
            .sort((a, b) => { if (b.winRate !== a.winRate) return b.winRate - a.winRate; if (b.netPoints !== a.netPoints) return b.netPoints - a.netPoints; if (b.avgNetPoints !== a.avgNetPoints) return b.avgNetPoints - a.avgNetPoints; return a.name.localeCompare(b.name); });
        const cssStyles = `body,h1,h2,h3,p,ul,li,button,input,textarea,table{margin:0;padding:0;box-sizing:border-box;font-family:sans-serif}body{background-color:#f4f7fc;color:#333;padding:20px}.container{max-width:800px;margin:0 auto;background-color:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.1);overflow:hidden}header{background-color:#4a90e2;color:#fff;padding:15px 20px;text-align:center}header h1{font-size:1.2em}header h2{font-size:1em;font-weight:normal;margin-top:5px}main{padding:20px}section{margin-bottom:30px;background-color:#fff;padding:20px;border-radius:6px;box-shadow:0 1px 5px rgba(0,0,0,.05)}h2{font-size:1.4em;color:#4a90e2;margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:10px}.input-area,.participant-section .mode-select,.participant-section button,.match-count-input,footer,.match-card .actions,.match-card .score-input,.modal-overlay{display:none!important}#participantList li.participant-item{justify-content:flex-start}.participant-item .participant-name{margin-right:0}.participant-section .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}#participantList{list-style:none;padding:0}.participant-avatar{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background-color:#6c757d;color:#fff;font-weight:700;margin-right:10px;font-size:.9em;flex-shrink:0}#participantList li.participant-item{display:flex;align-items:center;justify-content:flex-start;background-color:#f9f9f9;border:1px solid #eee;padding:8px 12px;margin-bottom:8px;border-radius:4px}.participant-item .participant-name{flex-grow:1;text-align:left}.match-section .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:.8em}#matchList{display:grid;gap:15px}.match-card{background-color:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:15px;display:grid;grid-template-columns:1fr auto 1fr;grid-template-rows:auto auto;gap:10px 15px;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.05)}.match-card .static-score{grid-column:1/-1;grid-row:2;text-align:center;font-size:1.1em;font-weight:700;color:#555;padding:5px 0}.match-card .team{display:flex;flex-direction:column;gap:8px;align-items:center}.match-card .team .player{display:flex;align-items:center;background-color:#f0f0f0;padding:5px 10px;border-radius:15px;font-size:.9em}.player-avatar{width:24px;height:24px;font-size:.8em}.match-card .vs{grid-row:1;grid-column:2;font-weight:700;color:#4a90e2;font-size:1.1em;text-align:center}.results-section .tabs{display:flex;margin-bottom:15px;border-bottom:1px solid #ccc}.results-section .tab{padding:10px 15px;cursor:pointer;border-bottom:3px solid transparent}.results-section .tab.active{border-bottom-color:#4a90e2;font-weight:700;color:#4a90e2}#resultsTable{width:100%;border-collapse:collapse;margin-top:15px}#resultsTable th,#resultsTable td{padding:10px;text-align:center;border-bottom:1px solid #eee}#resultsTable th{background-color:#f8f9fa;font-weight:700;color:#495057}#resultsTable tbody tr:nth-child(odd){background-color:#fdfdfd}#resultsTable tbody tr:hover{background-color:#f1f1f1}#resultsTable .participant-avatar{margin-right:5px;width:24px;height:24px;font-size:.8em}@media (max-width:600px){body{padding:10px}main{padding:15px}section{padding:15px}.match-card{grid-template-columns:1fr auto 1fr;gap:8px 10px}.match-card .team .player{font-size:.85em}#resultsTable th,#resultsTable td{padding:8px;font-size:.9em}}`;
        const htmlContent = `
<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>羽毛球赛结果 - ${currentClubName}</title><style>${cssStyles}</style></head><body><div class="container">
<header><h1>羽毛球双打循环赛 - 结果</h1><h2>俱乐部: ${currentClubName}</h2></header><main>
<section class="participant-section"><div class="header"><h2>报名名单</h2><span><span>${participants.length}</span>人</span></div><ul id="participantList"></ul></section>
<section class="match-section"><div class="header"><h2>对局计分</h2><span>${selectedMatches.filter(m => m.played).length}/${selectedMatches.length} 场</span></div><div id="matchList"></div></section>
<section class="results-section"><div class="tabs"><div class="tab active">比赛成绩</div></div><h2>比赛成绩</h2><table id="resultsTable"><thead><tr><th>排名</th><th>组合</th><th>胜负</th><th>胜率</th><th>净胜分</th><th>平均得失分</th></tr></thead><tbody></tbody></table></section>
</main></div><script>
const participantsData = ${JSON.stringify(participants)}; const matchesData = ${JSON.stringify(selectedMatches)}; const rankedPlayersData = ${JSON.stringify(currentRankedPlayers)};
function getAvatarColor(r){r=Number(r);if(isNaN(r))return'#6c757d';if(r===0)return'#dc3545';if(r===1)return'#ffc107';if(r===2)return'#fd7e14';return'#6c757d'}
function createTeamDiv_static(t){const d=document.createElement('div');d.classList.add('team');if(!Array.isArray(t)){console.error('createTeamDiv_static: Invalid team',t);return d}t.forEach(p=>{if(typeof p!=='string'||!p){console.warn('createTeamDiv_static: Invalid player',p);return}const pd=document.createElement('div');pd.classList.add('player');const a=document.createElement('span');a.classList.add('player-avatar','participant-avatar');a.textContent=p.charAt(0).toUpperCase();pd.appendChild(a);pd.appendChild(document.createTextNode(' '+p));d.appendChild(pd)});return d}
function updateParticipantList_static(){const l=document.getElementById('participantList');if(!l){console.error('updateParticipantList_static: List element not found');return}l.innerHTML='';if(!Array.isArray(participantsData)){console.error('updateParticipantList_static: Invalid participants data');return}participantsData.forEach(p=>{if(!p||typeof p.name!=='string'||!p.name){console.warn('updateParticipantList_static: Skipping invalid participant',p);return}const li=document.createElement('li');li.classList.add('participant-item');const a=document.createElement('span');a.classList.add('participant-avatar');a.textContent=p.name.charAt(0).toUpperCase();li.appendChild(a);const n=document.createElement('span');n.classList.add('participant-name');n.textContent=p.name;li.appendChild(n);l.appendChild(li)})}
function displayMatches_static(){const l=document.getElementById('matchList');if(!l){console.error('displayMatches_static: List element not found');return}l.innerHTML='';if(!Array.isArray(matchesData)||matchesData.length===0){l.innerHTML='<p>没有生成的对阵。</p>';return}matchesData.forEach(m=>{if(!m||!Array.isArray(m.team1)||!Array.isArray(m.team2)){console.warn('displayMatches_static: Skipping invalid match data',m);return}const c=document.createElement('div');c.classList.add('match-card');c.appendChild(createTeamDiv_static(m.team1));const v=document.createElement('span');v.classList.add('vs');v.textContent='PK';c.appendChild(v);c.appendChild(createTeamDiv_static(m.team2));const s=document.createElement('div');s.classList.add('static-score');if(m.score1!==null&&m.score2!==null){s.textContent=String(m.score1)+' - '+String(m.score2)}else{s.textContent='未开始'}c.appendChild(s);l.appendChild(c)})}
function displayResults_static(){const t=document.getElementById('resultsTable')?.querySelector('tbody');if(!t){console.error('displayResults_static: Table body not found');return}t.innerHTML='';if(!Array.isArray(rankedPlayersData)){console.error('displayResults_static: Invalid ranked players data');return}rankedPlayersData.forEach((p,i)=>{if(!p||typeof p.name!=='string'||!p.name){console.warn('displayResults_static: Skipping invalid player data',p);return}const r=t.insertRow();r.insertCell(0).textContent=i+1;const n=r.insertCell(1);const a=document.createElement('span');a.classList.add('participant-avatar');a.style.backgroundColor=getAvatarColor(i);a.textContent=p.name.charAt(0).toUpperCase();n.appendChild(a);n.appendChild(document.createTextNode(\` \${p.name}\`));n.style.textAlign='left';const w=p.wins??0;const l=p.losses??0;const wr=p.winRate??0;const np=p.netPoints??0;const anp=p.avgNetPoints??0;r.insertCell(2).textContent=\`\${w}-\${l}\`;r.insertCell(3).textContent=(wr*100).toFixed(1)+'%';r.insertCell(4).textContent=np>0?\`+\${np}\`:np;r.insertCell(5).textContent=anp.toFixed(1)})}
document.addEventListener('DOMContentLoaded',()=>{try{updateParticipantList_static();displayMatches_static();displayResults_static()}catch(e){console.error("Error rendering static content:",e)}});
</script></body></html>`;

        try {
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' }); const url = URL.createObjectURL(blob);
            const now = new Date(); const dateStr = now.toISOString().split('T')[0]; const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
            const filename = `羽毛球比赛结果_${currentClubName.replace(/\s+/g, '_')}_${dateStr}_${timeStr}.html`; // Include club name
            const link = document.createElement('a'); link.href = url; link.download = filename;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) { console.error("Error exporting:", e); alert('生成导出文件失败！'); }
    }

    // --- Initialize Page (Called directly now) ---
    initializeTournamentPage(); // Call async function

}); // Closing brace for main DOMContentLoaded listener
