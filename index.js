// Supabase已在supabase-config.js中初始化

document.addEventListener('DOMContentLoaded', () => {
  // DOM 元素引用
  const clubList = document.getElementById('club-list');
  const pinEntrySection = document.getElementById('pin-entry-section');
  const selectedClubName = document.getElementById('selected-club-name');
  const pinInput = document.getElementById('pin');
  const submitPinButton = document.getElementById('submit-pin');
  const cancelPinButton = document.getElementById('cancel-pin');
  const pinError = document.getElementById('pin-error');
  const adminLoginButton = document.getElementById('admin-login-button');

  // 状态变量
  let selectedClub = null;

  // 初始化页面
  initPage();

  // 事件监听器
  adminLoginButton.addEventListener('click', showAdminLoginModal);
  submitPinButton.addEventListener('click', verifyClubPin);
  cancelPinButton.addEventListener('click', hidePinEntry);
  pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') verifyClubPin();
  });

  // 页面初始化函数
  async function initPage() {
    await loadClubs();
  }

  // 加载俱乐部列表
  async function loadClubs() {
    try {
      clubList.innerHTML = '<p>正在加载俱乐部...</p>';
      
      // 使用Supabase获取俱乐部列表
      const { data: clubs, error } = await supabase
        .from('clubs')
        .select('*');
      
      if (error) throw error;
      
      if (clubs.length === 0) {
        clubList.innerHTML = '<p>暂无俱乐部。请管理员先创建俱乐部。</p>';
        return;
      }
      
      // 清空加载提示，准备显示俱乐部列表
      clubList.innerHTML = '';
      
      // 为每个俱乐部创建一个卡片
      clubs.forEach(club => {
        const clubCard = document.createElement('div');
        clubCard.className = 'club-card';
        clubCard.innerHTML = `
          <h3>${club.name}</h3>
          <p>${club.description || '无描述'}</p>
          <button class="enter-club-btn primary">进入俱乐部</button>
        `;
        
        // 为"进入俱乐部"按钮添加点击事件
        const enterButton = clubCard.querySelector('.enter-club-btn');
        enterButton.addEventListener('click', () => selectClub(club.id, club));
        
        clubList.appendChild(clubCard);
      });
    } catch (error) {
      console.error("加载俱乐部时出错:", error);
      clubList.innerHTML = `<p>加载俱乐部时出错: ${error.message}</p>`;
    }
  }

  // 选择俱乐部，显示PIN码输入界面
  function selectClub(clubId, club) {
    selectedClub = { id: clubId, ...club };
    selectedClubName.textContent = club.name;
    pinEntrySection.style.display = 'block';
    pinInput.value = '';
    pinError.style.display = 'none';
    pinInput.focus();
  }

  // 验证俱乐部PIN码
  async function verifyClubPin() {
    if (!selectedClub) return;
    
    const pin = pinInput.value.trim();
    if (!pin) {
      pinError.textContent = '请输入PIN码';
      pinError.style.display = 'block';
      return;
    }
    
    try {
      // 获取当前选中俱乐部的最新数据（确保PIN码是最新的）
      const { data: club, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', selectedClub.id)
        .single();
      
      if (error) throw error;
      
      if (!club) {
        pinError.textContent = '俱乐部不存在或已被删除';
        pinError.style.display = 'block';
        return;
      }
      
      // 验证PIN码
      if (pin === club.pin) {
        // PIN码正确，保存俱乐部信息并跳转到俱乐部页面
        sessionStorage.setItem('currentClubId', selectedClub.id);
        sessionStorage.setItem('currentClubName', club.name);
        window.location.href = 'tournament.html';
      } else {
        // PIN码错误
        pinError.textContent = 'PIN码错误，请重试';
        pinError.style.display = 'block';
        pinInput.value = '';
        pinInput.focus();
      }
    } catch (error) {
      console.error("验证PIN码时出错:", error);
      pinError.textContent = `验证出错: ${error.message}`;
      pinError.style.display = 'block';
    }
  }

  // 隐藏PIN码输入界面
  function hidePinEntry() {
    pinEntrySection.style.display = 'none';
    selectedClub = null;
  }

  // 显示管理员登录弹窗
  function showAdminLoginModal() {
    // 创建管理员登录弹窗（如果页面中不存在）
    let adminModal = document.getElementById('admin-modal');
    if (!adminModal) {
      adminModal = document.createElement('div');
      adminModal.id = 'admin-modal';
      adminModal.className = 'modal-overlay';
      adminModal.innerHTML = `
        <div class="modal-content">
          <h2>管理员登录</h2>
          <div class="form-group">
            <label for="admin-email">管理员邮箱:</label>
            <input type="email" id="admin-email" class="modal-input">
          </div>
          <div class="form-group">
            <label for="admin-password">管理员密码:</label>
            <input type="password" id="admin-password" class="modal-input">
          </div>
          <div id="admin-login-error" class="error-message" style="display:none; color:red; margin-bottom:10px;"></div>
          <button id="admin-login-submit" class="primary">登录</button>
          <button id="close-admin-modal" class="secondary">取消</button>
        </div>
      `;
      document.body.appendChild(adminModal);

      // 为新创建的元素添加事件监听器
      document.getElementById('admin-login-submit').addEventListener('click', handleAdminLogin);
      document.getElementById('close-admin-modal').addEventListener('click', () => {
        adminModal.style.display = 'none';
      });
      
      // 添加回车键提交登录
      document.getElementById('admin-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAdminLogin();
      });
    }
    
    // 显示弹窗并清空输入框
    adminModal.style.display = 'flex';
    document.getElementById('admin-email').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-login-error').style.display = 'none';
    document.getElementById('admin-email').focus();
  }

  // 处理管理员登录
  async function handleAdminLogin() {
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorElement = document.getElementById('admin-login-error');
    
    if (!email || !password) {
      errorElement.textContent = '请输入邮箱和密码';
      errorElement.style.display = 'block';
      return;
    }
    
    try {
      // 登录到Supabase Auth
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (error) {
        // 如果是用户不存在的错误，尝试注册新用户
        if (error.message.includes('Invalid login credentials')) {
          if (confirm('用户不存在，是否注册为新管理员？')) {
            // 注册新用户
            const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
              email: email,
              password: password
            });
            
            if (signUpError) throw signUpError;
            
            // 添加到管理员表
            const { error: adminError } = await supabase
              .from('admins')
              .insert({
                user_id: newUser.id
              });
            
            if (adminError) throw adminError;
            
            alert('已成功注册为管理员，请登录。');
            return;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
      
      // 检查是否为管理员用户
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (adminError && adminError.code !== 'PGRST116') {
        // 如果有错误且不是"没有找到记录"错误
        throw adminError;
      }
      
      if (admin) {
        // 是管理员，跳转到管理页面
        window.location.href = 'admin.html';
      } else {
        // 用户存在但不是管理员，询问是否添加为管理员
        if (confirm('您的账户不是管理员。是否将此账户设为管理员？')) {
          const { error: insertError } = await supabase
            .from('admins')
            .insert({
              user_id: user.id
            });
          
          if (insertError) throw insertError;
          
          alert('已成功设置为管理员，即将跳转到管理页面。');
          window.location.href = 'admin.html';
        } else {
          // 用户不想成为管理员
          errorElement.textContent = '您不是管理员，无权访问管理页面';
          errorElement.style.display = 'block';
          await supabase.auth.signOut(); // 登出非管理员用户
        }
      }
    } catch (error) {
      console.error("管理员登录出错:", error);
      errorElement.textContent = `登录失败: ${error.message}`;
      errorElement.style.display = 'block';
    }
  }
}); 