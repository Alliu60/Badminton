# 羽毛球双打循环赛管理系统 (Badminton Doubles Tournament Management System)

这是一个基于网页的羽毛球双打循环赛管理系统，支持多俱乐部管理、比赛安排、分数记录和成绩统计。

## 功能特点

### 俱乐部管理
- 创建和管理多个羽毛球俱乐部
- 每个俱乐部具有独立的PIN码和管理密码
- 管理员可以创建、编辑和删除俱乐部

### 参赛者管理
- 支持通过接龙格式快速导入参赛者名单
- 剪贴板粘贴功能，方便从其他平台复制名单
- 显示参赛人数统计

### 比赛安排与计分
- 自动生成最优的双打比赛配对，确保公平性
- 可自定义每局比赛时间
- 可设置期望总局数
- 动态场地配置，支持多场地同时比赛
- 实时记录比分，自动计算排名

### 成绩统计
- 本次活动实时排名
- 俱乐部累计排名统计
- 个人数据汇总（胜率、参与次数等）
- 支持导出HTML功能，方便分享成绩

### 数据持久化
- 使用Supabase作为后端数据库
- 保存和加载比赛状态
- 安全的用户认证系统

## 技术架构

- 前端：纯HTML、CSS和JavaScript
- 后端：Supabase (PostgreSQL + API)
- 认证：基于密码的简单认证系统

## 安装指南

### 前提条件
- 现代网页浏览器（Chrome、Firefox、Safari等）
- 互联网连接

### 部署步骤
1. 克隆代码库到本地或服务器
2. 在Supabase创建一个新项目
3. 创建所需的数据表（详见SQL文件）
4. 更新`supabase-config.js`中的URL和API密钥
5. 通过网页服务器提供静态文件（如Nginx、Apache或直接通过GitHub Pages等）

## 使用说明

### 管理员操作
1. 访问`admin.html`页面
2. 登录管理员账号
3. 创建新俱乐部或管理现有俱乐部
4. 设置俱乐部PIN码和管理密码

### 用户操作
1. 访问首页(`index.html`)
2. 从列表中选择俱乐部并输入PIN码
3. 进入俱乐部后，复制接龙名单或手动添加参赛者
4. 点击"创建并生成对阵"按钮生成比赛
5. 比赛进行中记录每场比赛分数
6. 查看实时排名和累计统计

### 比赛管理员操作
1. 在比赛页面点击"登录"按钮
2. 输入俱乐部管理密码
3. 启用编辑功能，可以修改参赛者、比赛配对、场地设置等
4. 可以保存比赛状态或加载之前的比赛

## 数据库结构

系统主要使用以下数据表：
- `clubs`: 存储俱乐部信息
- `tournaments`: 存储比赛信息
- `tournament_archives`: 存储历史比赛数据
- `cumulative_stats`: 存储累计统计数据

## 贡献指南

欢迎提交问题报告和改进建议。如需贡献代码，请遵循以下步骤：
1. Fork本项目
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开Pull Request

## 许可证

[待定] - 请选择适合您项目的许可证

## 联系方式

[待定] - 请添加联系方式

## 致谢

感谢所有为本项目做出贡献的开发者和测试人员。 #   B a d m i n t o n  
 