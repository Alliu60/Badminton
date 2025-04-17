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
  
  // 确认删除弹窗元素
  const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
  const deleteConfirmationMessage = document.getElementById('delete-confirmation-message');
  const confirmDeleteButton = document.getElementById('confirm-delete-button');
  const cancelDeleteButton = document.getElementById('cancel-delete-button');
  
  // 状态变量
  let currentClubToDelete = null;
  let currentUser = null;

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
          </div>
        `;
        
        // 添加事件监听器
        const editButton = clubCard.querySelector('.edit-club-btn');
        const deleteButton = clubCard.querySelector('.delete-club-btn');
        const clearButton = clubCard.querySelector('.clear-cumulative-btn');
        
        editButton.addEventListener('click', () => showClubModal(club.id, club));
        deleteButton.addEventListener('click', () => showDeleteConfirmation(club.id, club.name, 'club'));
        clearButton.addEventListener('click', () => showDeleteConfirmation(club.id, club.name, 'cumulativeStats'));
        
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
}); 