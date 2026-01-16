import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

type Ranking = {
    id: string;
    nickname: string;
    wins: number;
    avatar?: string;
};

export default function LeaderboardScreen() {
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchRankings();
    }, []);

    async function fetchRankings() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, nickname, wins, avatar:current_character_id') // We'll need characters table for actual avatar URLs later
            .order('wins', { ascending: false })
            .limit(20);

        if (data) {
            setRankings(data.map(r => ({
                id: r.id,
                nickname: r.nickname || 'Unknown Agent',
                wins: r.wins || 0,
                // Placeholder avatar for now or use character mapping
                avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${r.id}`
            })));
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1f96ad" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.push('/')} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>قائمة الشرف</Text>
                    <Text style={styles.headerSubtitle}>أفضل المحتالين في المقر</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Podium for Top 3 */}
                <View style={styles.podium}>
                    {/* 2nd Place */}
                    <View style={[styles.podiumItem, styles.podiumItemSide]}>
                        <View style={[styles.avatarBox, { borderColor: '#9ca3af' }]}>
                            <Text style={styles.avatarEmoji}>🥈</Text>
                        </View>
                        <Text style={styles.podiumName}>{rankings[1]?.nickname}</Text>
                        <View style={[styles.winsBadge, { backgroundColor: '#9ca3af' }]}>
                            <Text style={styles.winsText}>{rankings[1]?.wins} فوز</Text>
                        </View>
                    </View>

                    {/* 1st Place */}
                    <View style={[styles.podiumItem, styles.podiumItemCenter]}>
                        <View style={[styles.avatarBox, { borderColor: '#FF7F50', width: 80, height: 80 }]}>
                            <Text style={[styles.avatarEmoji, { fontSize: 40 }]}>👑</Text>
                        </View>
                        <Text style={[styles.podiumName, { fontSize: 18 }]}>{rankings[0]?.nickname}</Text>
                        <View style={[styles.winsBadge, { backgroundColor: '#FF7F50' }]}>
                            <Text style={styles.winsText}>{rankings[0]?.wins} فوز</Text>
                        </View>
                    </View>

                    {/* 3rd Place */}
                    <View style={[styles.podiumItem, styles.podiumItemSide]}>
                        <View style={[styles.avatarBox, { borderColor: '#cd7f32' }]}>
                            <Text style={styles.avatarEmoji}>🥉</Text>
                        </View>
                        <Text style={styles.podiumName}>{rankings[2]?.nickname}</Text>
                        <View style={[styles.winsBadge, { backgroundColor: '#cd7f32' }]}>
                            <Text style={styles.winsText}>{rankings[2]?.wins} فوز</Text>
                        </View>
                    </View>
                </View>

                {/* List for the rest */}
                <View style={styles.rankList}>
                    {rankings.slice(3).map((item, index) => (
                        <View key={item.id} style={styles.rankRow}>
                            <View style={styles.rankInfo}>
                                <View style={styles.rankNumberCircle}>
                                    <Text style={styles.rankNumber}>{index + 4}</Text>
                                </View>
                                <Text style={styles.rankName}>{item.nickname}</Text>
                            </View>
                            <Text style={styles.rankWins}>{item.wins} فوز</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Bottom Nav Pill */}
            <View style={styles.bottomNavContainer}>
                <View style={styles.bottomNav}>
                    <Pressable style={styles.navItem} onPress={() => router.push('/store')}><MaterialIcons name="storefront" size={24} color="#9ca3af" /></Pressable>
                    <Pressable style={styles.navItem} onPress={() => router.push('/')}><MaterialIcons name="home" size={24} color="#9ca3af" /></Pressable>
                    <Pressable style={[styles.navItem, styles.navItemActive]} onPress={() => router.push('/leaderboard')}><MaterialIcons name="leaderboard" size={24} color="#1f96ad" /></Pressable>
                    <Pressable style={styles.navItem} onPress={() => router.push('/settings')}><MaterialIcons name="settings" size={24} color="#9ca3af" /></Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    loadingContainer: { flex: 1, backgroundColor: '#14181f', justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 16 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: 'white' },
    headerSubtitle: { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#1f96ad' },
    scrollContent: { padding: 24 },
    podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 40, height: 220 },
    podiumItem: { alignItems: 'center', flex: 1 },
    podiumItemCenter: { zIndex: 10, marginHorizontal: -10 },
    podiumItemSide: { marginBottom: -10 },
    avatarBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1e252f', borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarEmoji: { fontSize: 28 },
    podiumName: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'white', marginBottom: 4, textAlign: 'center' },
    winsBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
    winsText: { color: '#14181f', fontSize: 10, fontFamily: 'Cairo-Black' },
    rankList: { gap: 12 },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e252f',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2a3441',
        ...Platform.select({
            web: { boxShadow: '2px 2px 0px #0a0d12' },
            default: { elevation: 2 }
        })
    },
    rankInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rankNumberCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    rankNumber: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Epilogue-Bold' },
    rankName: { fontSize: 16, fontFamily: 'Cairo-Bold', color: 'white' },
    rankWins: { fontSize: 14, fontFamily: 'Epilogue-Bold', color: '#1f96ad' },
    bottomNavContainer: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
    bottomNav: { width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 99, padding: 8, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: 'black', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
    navItem: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    navItemActive: { backgroundColor: 'rgba(31, 150, 173, 0.2)', borderWidth: 1, borderColor: 'rgba(31, 150, 173, 0.5)' },
});
