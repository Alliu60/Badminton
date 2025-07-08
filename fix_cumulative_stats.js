// 修复累计统计数据的临时脚本
// 将此脚本添加到 admin.html 页面中，然后在控制台中调用 fixCumulativeStats() 函数

async function fixCumulativeStats(clubId) {
    if (!clubId) {
        console.error("请提供俱乐部 ID");
        return;
    }

    console.log(`开始修复俱乐部 ${clubId} 的累计统计数据...`);

    try {
        // 1. 获取所有比赛记录
        const { data: tournaments, error: tournamentsError } = await supabase
            .from('tournament_archives')
            .select('*')
            .eq('club_id', clubId);
        
        if (tournamentsError) throw tournamentsError;
        
        console.log(`找到 ${tournaments.length} 条比赛记录`);

        // 2. 初始化累计统计数据
        const cumulativeStats = {};

        // 3. 计算每个比赛的统计数据并累加
        for (const tournament of tournaments) {
            const stateData = tournament.state_data;
            if (!stateData || !stateData.participants || !stateData.matches) {
                console.warn(`跳过无效的比赛记录: ${tournament.id}`);
                continue;
            }

            // 初始化玩家统计
            const tournamentPlayerStats = {};
            stateData.participants.forEach(participant => {
                tournamentPlayerStats[participant.name] = {
                    activityCount: 1,
                    gamesPlayed: 0,
                    wins: 0,
                    pointsFor: 0,
                    pointsAgainst: 0
                };
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
                        if (tournamentPlayerStats[player]) {
                            tournamentPlayerStats[player].wins++;
                            tournamentPlayerStats[player].pointsFor += winScore;
                            tournamentPlayerStats[player].pointsAgainst += loseScore;
                            tournamentPlayerStats[player].gamesPlayed++;
                        }
                    });
                    
                    // 更新失败队伍的统计
                    loser.forEach(player => {
                        if (tournamentPlayerStats[player]) {
                            tournamentPlayerStats[player].pointsFor += loseScore;
                            tournamentPlayerStats[player].pointsAgainst += winScore;
                            tournamentPlayerStats[player].gamesPlayed++;
                        }
                    });
                }
            });

            // 将此次比赛的统计数据累加到总统计中
            for (const [playerName, stats] of Object.entries(tournamentPlayerStats)) {
                if (!cumulativeStats[playerName]) {
                    cumulativeStats[playerName] = { ...stats };
                } else {
                    cumulativeStats[playerName].activityCount += stats.activityCount;
                    cumulativeStats[playerName].gamesPlayed += stats.gamesPlayed;
                    cumulativeStats[playerName].wins += stats.wins;
                    cumulativeStats[playerName].pointsFor += stats.pointsFor;
                    cumulativeStats[playerName].pointsAgainst += stats.pointsAgainst;
                }
            }
        }

        // 4. 更新累计统计数据
        const { data: existingData, error: checkError } = await supabase
            .from('cumulative_stats')
            .select('id')
            .eq('club_id', clubId)
            .single();
        
        let result;
        if (existingData) {
            // 更新现有记录
            result = await supabase
                .from('cumulative_stats')
                .update({ stats: cumulativeStats })
                .eq('club_id', clubId);
        } else {
            // 创建新记录
            result = await supabase
                .from('cumulative_stats')
                .insert({ 
                    club_id: clubId,
                    stats: cumulativeStats
                });
        }
        
        if (result.error) throw result.error;
        
        console.log("累计统计数据已成功更新:", cumulativeStats);
        return cumulativeStats;
    } catch (error) {
        console.error("修复累计统计数据时出错:", error);
        return null;
    }
}

// 使用方法：
// 1. 在浏览器控制台中，输入 fixCumulativeStats('您的俱乐部ID')
// 2. 例如：fixCumulativeStats('04161729')
