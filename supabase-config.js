// Supabase 配置
const supabaseUrl = 'https://bvwqjxqlpnvlotczvmtv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2d3FqeHFscG52bG90Y3p2bXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NjUzNzYsImV4cCI6MjA2MDQ0MTM3Nn0.HjubJbr5btWPJaskyYWgntYw6onig9XyGjT3ukaKetk';

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey); 