import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
        window.alert(`${title}: ${message}`);
    } else {
        Alert.alert(title, message);
    }
};

type Player = { id: string; nickname: string; is_host: boolean };

export default function LobbyRoom() {
    const params = useLocalSearchParams();
    const code = Array.isArray(params.code) ? params.code[0] : params.code;
    const playerId = Array.isArray(params.playerId) ? params.playerId[0] : params.playerId;
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>([]);
    const [isHost, setIsHost] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (code) {
            fetchPlayers();
            const playersSub = supabase.channel(`lobby_players_${code}`).on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${code}` }, () => fetchPlayers()).subscribe();
            const roomSub = supabase.channel(`lobby_room_${code}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (payload) => {
                if (payload.new.status === 'PLAYING_CLUES') router.replace(`/game/${code}?playerId=${playerId}`);
            }).subscribe();
            return () => { supabase.removeChannel(playersSub); supabase.removeChannel(roomSub); };
        }
    }, [code]);

    const fetchPlayers = async () => {
        const { data, error } = await supabase.from('players').select('id, nickname, is_host').eq('room_code', code);
        if (data) { setPlayers(data); setIsHost(data.find(p => p.id === playerId)?.is_host || false); }
        setLoading(false);
    };

    const handleStartGame = async () => {
        if (players.length < 3) { showAlert('ما في عملاء كافيين', 'تحتاج على الأقل ٣ عملاء عشان تبدأ اللعبة.'); return; }
        try {
            const { data: roomData } = await supabase.from('rooms').select('game_mode, selected_topic').eq('code', code).single();
            const gameMode = roomData?.game_mode || 'relative';
            const selectedTopic = roomData?.selected_topic;
            let { data: categories } = await supabase.from('word_categories').select('*');
            if (!categories?.length) throw new Error('No word packs found.');
            let category = selectedTopic ? categories.find(c => c.name === selectedTopic) || categories[0] : categories[Math.floor(Math.random() * categories.length)];
            let civWord: string, impWord: string;
            if (gameMode === 'relative' && category.relative_pairs?.length > 0) {
                const pair = category.relative_pairs[Math.floor(Math.random() * category.relative_pairs.length)];
                const flip = Math.random() > 0.5; civWord = flip ? pair[1] : pair[0]; impWord = flip ? pair[0] : pair[1];
            } else {
                const words = [...category.words]; civWord = words.splice(Math.floor(Math.random() * words.length), 1)[0]; impWord = words[Math.floor(Math.random() * words.length)];
            }
            const imposterIndex = Math.floor(Math.random() * players.length);
            await Promise.all(players.map((p, i) => supabase.from('players').update({ role: i === imposterIndex ? 'IMPOSTER' : 'CIVILIAN' }).eq('id', p.id)));
            await supabase.from('rooms').update({ status: 'PLAYING_CLUES', civilian_word: civWord, imposter_word: impWord, imposter_id: players[imposterIndex].id }).eq('code', code);
        } catch (error: any) { showAlert('خطأ', error.message); }
    };

    if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#1f96ad" /></View>;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View style={[styles.statusPill, { backgroundColor: 'rgba(31, 150, 173, 0.1)' }]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusTitle}>منصة التسلل</Text>
                </View>
                <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>ID: #{code}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>الشلة المتصلة</Text>
                <View style={styles.playersGrid}>
                    {players.map(player => (
                        <View key={player.id} style={[styles.playerCard, player.is_host && styles.playerCardHost]}>
                            {player.is_host && (
                                <View style={styles.hostBadge}>
                                    <MaterialIcons name="star" size={10} color="#14181f" />
                                    <Text style={styles.hostBadgeText}>المضيف</Text>
                                </View>
                            )}
                            <View style={styles.playerAvatar}>
                                <MaterialIcons name="person" size={24} color={player.is_host ? "#FF7F50" : "#1f96ad"} />
                            </View>
                            <Text style={styles.playerName}>{player.nickname}</Text>
                        </View>
                    ))}
                    {[...Array(Math.max(0, 4 - players.length))].map((_, i) => (
                        <View key={`empty-${i}`} style={styles.emptyCard}>
                            <MaterialIcons name="more-horiz" size={24} color="rgba(255,255,255,0.1)" />
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>معايير الأمان</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>العملاء</Text>
                        <Text style={styles.statValue}>{players.length}</Text>
                    </View>
                    <View style={[styles.statBox, { borderColor: '#FF7F50' }]}>
                        <Text style={styles.statLabel}>الحالة</Text>
                        <Text style={[styles.statValue, { color: '#FF7F50' }]}>جاهز</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>الأمان</Text>
                        <Text style={styles.statValue}>٠٣</Text>
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                {isHost ? (
                    <Pressable style={styles.startButton} onPress={handleStartGame}>
                        <View style={styles.startButtonInner}>
                            <Text style={styles.startButtonText}>ابدأ التسلل</Text>
                            <MaterialIcons name="play-arrow" size={24} color="white" />
                        </View>
                    </Pressable>
                ) : (
                    <View style={styles.waitingNotice}>
                        <ActivityIndicator color="#1f96ad" style={{ marginBottom: 16 }} />
                        <Text style={styles.waitingText}>في انتظار إذن المضيف...</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    scrollContent: { padding: 24, flexGrow: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 32 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: '#1f96ad33' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1f96ad' },
    statusTitle: { fontSize: 10, fontFamily: 'Cairo-Bold', color: '#1f96ad', textTransform: 'uppercase', letterSpacing: 1 },
    codeBox: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    codeLabel: { fontSize: 12, fontFamily: 'Epilogue-BlackItalic', color: 'white' },
    section: { marginBottom: 32 },
    sectionLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: '#1f96ad', letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase', textAlign: 'right' },
    playersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    playerCard: { width: '47%', aspectRatio: 1, backgroundColor: '#1e252f', borderRadius: 20, padding: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#2a3441', shadowColor: '#0a0d12', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
    playerCardHost: { borderColor: '#FF7F50' },
    playerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    playerName: { fontSize: 16, fontFamily: 'Cairo-Bold', color: 'white', textAlign: 'center' },
    hostBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#FF7F50', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 4 },
    hostBadgeText: { fontSize: 8, fontFamily: 'Cairo-Bold', color: '#14181f' },
    emptyCard: { width: '47%', aspectRatio: 1, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    statsRow: { flexDirection: 'row', gap: 12 },
    statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo-Bold', marginBottom: 4 },
    statValue: { fontSize: 18, fontFamily: 'Epilogue-BlackItalic', color: 'white' },
    footer: { marginTop: 'auto', paddingTop: 24 },
    startButton: { backgroundColor: '#FF7F50', borderRadius: 99, shadowColor: '#0a0d12', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    startButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 20 },
    startButtonText: { fontSize: 20, fontFamily: 'Cairo-Black', color: 'white' },
    waitingNotice: { alignItems: 'center', padding: 24 },
    waitingText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: '#1f96ad', textAlign: 'center' },
});
