// Supabase已在supabase-config.js中初始化

document.addEventListener('DOMContentLoaded', async () => {
  // DOM 元素引用
  // 页面元素
  const clubList = document.getElementById('club-list');
  const adminEmailDisplay = document.getElementById('admin-email-display');
  const logoutButton = document.getElementById('logout-button');
  const createClubButton = document.getElementById('create-club-button');
  const backToClubsButton = document.getElementById('back-to-clubs');
  const manageAdminsButton = document.getElementById('manage-admins-button');

  // 俱乐部弹窗元素
  const clubModal = document.getElementById('club-modal');
  const clubModalTitle = document.getElementById('club-modal-title');
  const clubForm = document.getElementById('club-form');
  const clubNameInput = document.getElementById('club-name');
  const clubDescriptionInput = document.getElementById('club-description');
  const clubPinInput = document.getElementById('club-pin');
  const clubAdminPasswordInput = document.getElementById('club-admin-password');
  const editClubIdInput = document.getElementById('edit-club-id');
  const clubFormError = document.getElementById('club-form-error');
  const saveClubButton = document.getElementById('save-club-button');
  const cancelClubButton = document.getElementById('cancel-club-button');

  // 管理员管理弹窗元素
  const adminManagementModal = document.getElementById('admin-management-modal');
  const newAdminEmailInput = document.getElementById('new-admin-email');
  const addAdminButton = document.getElementById('add-admin-button');
  const adminList = document.getElementById('admin-list');
  const adminManagementError = document.getElementById('admin-management-error');
  const closeAdminManagement = document.getElementById('close-admin-management');

  // 汇总结果管理弹窗元素
  const summariesManagementModal = document.getElementById('summaries-management-modal');
  const summariesClubName = document.getElementById('summaries-club-name');
  const summariesListContainer = document.getElementById('summaries-list-container');
  const summariesManagementError = document.getElementById('summaries-management-error');
  const closeSummariesManagement = document.getElementById('close-summaries-management');

  // 确认删除弹窗元素
  const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
  const deleteConfirmationMessage = document.getElementById('delete-confirmation-message');
  const confirmDeleteButton = document.getElementById('confirm-delete-button');
  const cancelDeleteButton = document.getElementById('cancel-delete-button');

  // 状态变量
  let currentClubToDelete = null;
  let currentUser = null;
  let currentClubForSummaries = null;

  // 初始化页面
  initialize();

  // 事件监听器
  // 登录/登出按钮
  logoutButton.addEventListener('click', handleLogout);

  // 俱乐部操作
  createClubButton.addEventListener('click', () => showClubModal());
  backToClubsButton.addEventListener('click', () => window.location.href = 'index.html');

  // 俱乐部表单操作
  clubForm.addEventListener('submit', handleClubFormSubmit);
  cancelClubButton.addEventListener('click', hideClubModal);

  // 管理员管理操作
  manageAdminsButton.addEventListener('click', showAdminManagementModal);
  addAdminButton.addEventListener('click', handleAddAdmin);
  closeAdminManagement.addEventListener('click', hideAdminManagementModal);

  // 汇总结果管理操作
  closeSummariesManagement.addEventListener('click', hideSummariesManagementModal);

  // 删除确认弹窗操作
  confirmDeleteButton.addEventListener('click', confirmDeleteClub);
  cancelDeleteButton.addEventListener('click', hideDeleteConfirmationModal);

  // 初始化函数
  async function initialize() {
    // 检查是否登录，并确认是管理员
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      currentUser = session.user;

      // 查询用户是否为管理员
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // 如果有错误且不是"没有找到记录"错误
        console.error("检查管理员状态时出错:", error);
        alert('检查管理员状态时出错');
        await supabase.auth.signOut();
        window.location.href = 'index.html';
        return;
      }

      if (admin) {
        // 显示管理员信息
        adminEmailDisplay.textContent = currentUser.email;
        // 加载俱乐部列表
        loadClubs();
      } else {
        // 用户存在但不是管理员，自动添加为管理员
        try {
          const { error: insertError } = await supabase
            .from('admins')
            .insert({
              user_id: currentUser.id
            });

          if (insertError) throw insertError;

          console.log("已自动添加为管理员");
          // 显示管理员信息
          adminEmailDisplay.textContent = currentUser.email;
          // 加载俱乐部列表
          loadClubs();
        } catch (err) {
          console.error("添加管理员记录失败:", err);
          alert('您不是管理员，无权访问此页面');
          await supabase.auth.signOut();
          window.location.href = 'index.html';
        }
      }
    } else {
      // 未登录，重定向到首页
      window.location.href = 'index.html';
    }
  }

  // 登出处理
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    } catch (error) {
      console.error('登出时发生错误:', error);
      alert(`登出失败: ${error.message}`);
    }
  }

  // 加载俱乐部列表
  async function loadClubs() {
    try {
      clubList.innerHTML = '<p>正在加载俱乐部...</p>';

      const { data: clubs, error } = await supabase
        .from('clubs')
        .select('*');

      if (error) throw error;

      if (clubs.length === 0) {
        clubList.innerHTML = '<p>暂无俱乐部。点击"创建新俱乐部"按钮创建您的第一个俱乐部。</p>';
        return;
      }

      // 创建俱乐部列表
      clubList.innerHTML = '';

      clubs.forEach(club => {
        const clubCard = document.createElement('div');
        clubCard.className = 'admin-club-card';
        clubCard.innerHTML = `
          <div class="club-info">
            <h3>${club.name}</h3>
            <p>${club.description || '无描述'}</p>
            <div class="club-details">
              <span>PIN码: ${club.pin}</span>
              <span>管理密码: ${'•'.repeat(8)}</span>
            </div>
          </div>
          <div class="club-actions">
            <button class="edit-club-btn primary small">编辑</button>
            <button class="delete-club-btn danger small">删除</button>
            <button class="clear-cumulative-btn danger small">清除汇总数据</button>
            <button class="manage-summaries-btn secondary small">管理汇总结果</button>
          </div>
        `;

        // 添加事件监听器
        const editButton = clubCard.querySelector('.edit-club-btn');
        const deleteButton = clubCard.querySelector('.delete-club-btn');
        const clearButton = clubCard.querySelector('.clear-cumulative-btn');
        const manageSummariesButton = clubCard.querySelector('.manage-summaries-btn');

        editButton.addEventListener('click', () => showClubModal(club.id, club));
        deleteButton.addEventListener('click', () => showDeleteConfirmation(club.id, club.name, 'club'));
        clearButton.addEventListener('click', () => showDeleteConfirmation(club.id, club.name, 'cumulativeStats'));
        manageSummariesButton.addEventListener('click', () => showSummariesManagementModal(club.id, club.name));

        clubList.appendChild(clubCard);
      });
    } catch (error) {
      console.error('加载俱乐部时发生错误:', error);
      clubList.innerHTML = `<p>加载俱乐部时出错: ${error.message}</p>`;
    }
  }

  // 显示俱乐部表单弹窗
  function showClubModal(clubId = null, club = null) {
    // 重置表单
    clubForm.reset();
    clubFormError.style.display = 'none';

    if (clubId && club) {
      // 编辑模式
      clubModalTitle.textContent = '编辑俱乐部';
      clubNameInput.value = club.name || '';
      clubDescriptionInput.value = club.description || '';
      clubPinInput.value = club.pin || '';
      clubAdminPasswordInput.value = club.adminPassword || '';
      editClubIdInput.value = clubId;
    } else {
      // 创建模式
      clubModalTitle.textContent = '创建新俱乐部';
      editClubIdInput.value = '';
    }

    clubModal.style.display = 'flex';
    clubNameInput.focus();
  }

  // 隐藏俱乐部表单弹窗
  function hideClubModal() {
    clubModal.style.display = 'none';
  }

  // 处理俱乐部表单提交
  async function handleClubFormSubmit(event) {
    event.preventDefault();

    const name = clubNameInput.value.trim();
    const description = clubDescriptionInput.value.trim();
    const pin = clubPinInput.value.trim();
    const adminPassword = clubAdminPasswordInput.value.trim();
    const clubId = editClubIdInput.value;

    if (!name || !pin || !adminPassword) {
      clubFormError.textContent = '俱乐部名称、PIN码和管理密码为必填项';
      clubFormError.style.display = 'block';
      return;
    }

    try {
      let result;

      if (clubId) {
        // 更新现有俱乐部
        result = await supabase
          .from('clubs')
          .update({
            name,
            description,
            pin,
            "adminPassword": adminPassword
          })
          .eq('id', clubId);
      } else {
        // 创建新俱乐部
        result = await supabase
          .from('clubs')
          .insert({
            name,
            description,
            pin,
            "adminPassword": adminPassword
          });
      }

      if (result.error) throw result.error;

      // 成功后刷新俱乐部列表并隐藏弹窗
      hideClubModal();
      loadClubs();
    } catch (error) {
      console.error('保存俱乐部时出错:', error);
      clubFormError.textContent = `保存失败: ${error.message}`;
      clubFormError.style.display = 'block';
    }
  }

  // 显示删除确认弹窗
  function showDeleteConfirmation(itemId, itemName, itemType) {
    currentClubToDelete = {
      id: itemId,
      type: itemType
    };

    if (itemType === 'club') {
      deleteConfirmationMessage.textContent = `您确定要删除俱乐部"${itemName}"吗？此操作将同时删除该俱乐部的所有数据，且无法撤销。`;
    } else if (itemType === 'cumulativeStats') {
      deleteConfirmationMessage.textContent = `您确定要删除俱乐部"${itemName}"的所有累计数据吗？此操作无法撤销。`;
    }

    deleteConfirmationModal.style.display = 'flex';
  }

  // 隐藏删除确认弹窗
  function hideDeleteConfirmationModal() {
    deleteConfirmationModal.style.display = 'none';
    currentClubToDelete = null;
  }

  // 确认删除操作
  async function confirmDeleteClub() {
    if (!currentClubToDelete) return;

    try {
      if (currentClubToDelete.type === 'club') {
        // 删除俱乐部
        const { error } = await supabase
          .from('clubs')
          .delete()
          .eq('id', currentClubToDelete.id);

        if (error) throw error;

        // 删除相关的累计数据和存档
        const { error: statsError } = await supabase
          .from('cumulative_stats')
          .delete()
          .eq('club_id', currentClubToDelete.id);

        // 忽略统计数据删除的错误，继续删除存档
        const { error: archiveError } = await supabase
          .from('tournament_archives')
          .delete()
          .eq('club_id', currentClubToDelete.id);

      } else if (currentClubToDelete.type === 'cumulativeStats') {
        // 仅删除累计数据
        await clearCumulativeStats(currentClubToDelete.id);
      }

      // 隐藏弹窗并刷新列表
      hideDeleteConfirmationModal();
      loadClubs();
    } catch (error) {
      console.error('删除操作时出错:', error);
      alert(`删除失败: ${error.message}`);
      hideDeleteConfirmationModal();
    }
  }

  // 清除累计数据
  async function clearCumulativeStats(clubId) {
    try {
      const { error } = await supabase
        .from('cumulative_stats')
        .delete()
        .eq('club_id', clubId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('清除累计数据时出错:', error);
      throw error;
    }
  }

  // 显示管理员管理弹窗
  async function showAdminManagementModal() {
    adminManagementModal.style.display = 'flex';
    adminManagementError.style.display = 'none';
    newAdminEmailInput.value = '';

    // 加载管理员列表
    await loadAdminsList();
  }

  // 隐藏管理员管理弹窗
  function hideAdminManagementModal() {
    adminManagementModal.style.display = 'none';
  }

  // 加载管理员列表
  async function loadAdminsList() {
    try {
      adminList.innerHTML = '<p>正在加载管理员列表...</p>';

      const { data: admins, error } = await supabase
        .from('admins')
        .select('*');

      if (error) throw error;

      if (admins.length === 0) {
        adminList.innerHTML = '<p>暂无管理员。</p>';
        return;
      }

      // 创建管理员列表
      adminList.innerHTML = '';

      // 为每个管理员查询用户信息
      for (const admin of admins) {
        const { data: userData, error: userError } = await supabase
          .from('auth.users')
          .select('email')
          .eq('id', admin.user_id)
          .single();

        const adminItem = document.createElement('div');
        adminItem.className = 'admin-item';

        // 如果无法获取邮箱，则显示用户ID
        const email = userError ? `用户ID: ${admin.user_id}` : userData.email;

        adminItem.innerHTML = `
          <span>${email}</span>
          ${admin.user_id !== currentUser.id ?
            `<button class="remove-admin-btn danger small">删除</button>` :
            '<span class="admin-current">(当前用户)</span>'}
        `;

        if (admin.user_id !== currentUser.id) {
          const removeButton = adminItem.querySelector('.remove-admin-btn');
          removeButton.addEventListener('click', () => handleRemoveAdmin(admin.id, email));
        }

        adminList.appendChild(adminItem);
      }
    } catch (error) {
      console.error('加载管理员列表时出错:', error);
      adminList.innerHTML = `<p>加载管理员列表时出错: ${error.message}</p>`;
    }
  }

  // 处理添加管理员
  async function handleAddAdmin() {
    const email = newAdminEmailInput.value.trim();
    if (!email) {
      adminManagementError.textContent = '请输入邮箱';
      adminManagementError.style.display = 'block';
      return;
    }

    try {
      // 创建新用户账号
      const { data: { user }, error: signupError } = await supabase.auth.admin.createUser({
        email: email,
        password: generateRandomPassword(12), // 随机密码
        email_confirm: true
      });

      if (signupError) throw signupError;

      // 添加到管理员表
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          user_id: user.id
        });

      if (adminError) throw adminError;

      // 清空输入并刷新列表
      newAdminEmailInput.value = '';
      adminManagementError.style.display = 'none';
      await loadAdminsList();
    } catch (error) {
      console.error('添加管理员时出错:', error);
      adminManagementError.textContent = `添加失败: ${error.message}`;
      adminManagementError.style.display = 'block';
    }
  }

  // 处理删除管理员
  async function handleRemoveAdmin(adminId, adminEmail) {
    if (!confirm(`确定要删除管理员 ${adminEmail} 吗？`)) {
      return;
    }

    try {
      // 从管理员表中删除
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      // 刷新列表
      await loadAdminsList();
    } catch (error) {
      console.error('删除管理员时出错:', error);
      alert(`删除失败: ${error.message}`);
    }
  }

  // 生成随机密码
  function generateRandomPassword(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // 显示汇总结果管理弹窗
  async function showSummariesManagementModal(clubId, clubName) {
    currentClubForSummaries = { id: clubId, name: clubName };
    summariesClubName.textContent = clubName;
    summariesListContainer.innerHTML = '<p>正在加载汇总结果...</p>';
    summariesManagementError.style.display = 'none';
    summariesManagementModal.style.display = 'flex';

    // 加载汇总结果列表
    await loadSummariesList(clubId);
  }

  // 隐藏汇总结果管理弹窗
  function hideSummariesManagementModal() {
    summariesManagementModal.style.display = 'none';
    currentClubForSummaries = null;
  }

  // 加载汇总结果列表
  async function loadSummariesList(clubId) {
    if (!clubId) return;

    try {
      // 查询属于当前俱乐部的记录，按时间戳降序排列
      const { data: tournaments, error } = await supabase
        .from('tournament_archives')
        .select('*')
        .eq('club_id', clubId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      if (!tournaments || tournaments.length === 0) {
        summariesListContainer.innerHTML = '<p>此俱乐部没有找到已保存的汇总结果。</p>';
        return;
      }

      // 创建汇总结果列表
      summariesListContainer.innerHTML = '';
      const table = document.createElement('table');
      table.className = 'summaries-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>汇总名称</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="summaries-table-body"></tbody>
      `;

      const tableBody = table.querySelector('#summaries-table-body');

      tournaments.forEach(tournament => {
        const row = document.createElement('tr');

        // 名称单元格
        const nameCell = document.createElement('td');
        nameCell.textContent = tournament.savename || `未命名 (${tournament.id.substring(0, 6)}...)`;

        // 时间单元格
        const timeCell = document.createElement('td');
        const timestamp = tournament.timestamp ? new Date(tournament.timestamp).toLocaleString() : '未知日期';
        timeCell.textContent = timestamp;

        // 操作单元格
        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.className = 'danger small';
        deleteButton.addEventListener('click', () => deleteSummary(tournament.id, tournament.savename || '未命名汇总'));

        actionCell.appendChild(deleteButton);

        // 添加到行
        row.appendChild(nameCell);
        row.appendChild(timeCell);
        row.appendChild(actionCell);

        // 添加到表格
        tableBody.appendChild(row);
      });

      summariesListContainer.appendChild(table);

    } catch (error) {
      console.error('加载汇总结果列表时出错:', error);
      summariesListContainer.innerHTML = `<p>加载汇总结果列表时出错: ${error.message}</p>`;
    }
  }

  // 删除汇总结果
  async function deleteSummary(summaryId, summaryName) {
    if (!confirm(`确定要删除汇总结果 "${summaryName}" 吗？此操作无法撤销。`)) {
      return;
    }

    try {
      // 1. 首先获取要删除的汇总结果详细数据
      const { data: summaryData, error: fetchError } = await supabase
        .from('tournament_archives')
        .select('*')
        .eq('id', summaryId)
        .single();

      if (fetchError) throw fetchError;

      if (!summaryData || !summaryData.club_id) {
        throw new Error('无法获取汇总结果数据');
      }

      const clubId = summaryData.club_id;
      const stateData = summaryData.state_data;

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
      if (cumulativeData && stateData && stateData.participants) {
        const currentStats = cumulativeData.stats || {};
        const playerStats = calculatePlayerStats(stateData);

        // 更新累计统计数据
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
          }
        }

        // 4. 更新累计统计数据
        const { error: updateError } = await supabase
          .from('cumulative_stats')
          .update({ stats: currentStats })
          .eq('club_id', clubId);

        if (updateError) throw updateError;
      }

      // 5. 删除汇总结果记录
      const { error } = await supabase
        .from('tournament_archives')
        .delete()
        .eq('id', summaryId);

      if (error) throw error;

      // 刷新列表
      if (currentClubForSummaries) {
        await loadSummariesList(currentClubForSummaries.id);
      }

      alert(`汇总结果 "${summaryName}" 已成功删除，并已更新累计统计数据。`);
    } catch (error) {
      console.error('删除汇总结果时出错:', error);
      alert(`删除汇总结果失败: ${error.message}`);
    }
  }

  // 计算玩家统计数据
  function calculatePlayerStats(stateData) {
    const playerStats = {};

    // 初始化玩家统计
    if (stateData.participants) {
      stateData.participants.forEach(participant => {
        playerStats[participant.name] = {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0
        };
      });
    }

    // 计算比赛统计
    if (stateData.matches) {
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
              playerStats[player].losses++;
              playerStats[player].pointsFor += loseScore;
              playerStats[player].pointsAgainst += winScore;
              playerStats[player].gamesPlayed++;
            }
          });
        }
      });
    }

    return playerStats;
  }
});