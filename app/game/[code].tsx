import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const showAlert = (title: string, msg: string) => Platform.OS === 'web' ? window.alert(`${title}: ${msg}`) : Alert.alert(title, msg);

type Player = { id: string; nickname: string; role: 'CIVILIAN' | 'IMPOSTER'; user_id?: string | null };
type Clue = { id: string; player_id: string; content: string };
type Vote = { id: string; voter_id: string; target_id: string };

export default function GameRoom() {
    const params = useLocalSearchParams();
    const code = Array.isArray(params.code) ? params.code[0] : params.code;
    const playerId = Array.isArray(params.playerId) ? params.playerId[0] : params.playerId;
    const router = useRouter();
    const [me, setMe] = useState<Player | null>(null);
    const [word, setWord] = useState('');
    const [clue, setClue] = useState('');
    const [clues, setClues] = useState<Clue[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [roomStatus, setRoomStatus] = useState('PLAYING_CLUES');
    const [civilianWord, setCivilianWord] = useState('');
    const [imposterWord, setImposterWord] = useState('');
    const [winner, setWinner] = useState<string | null>(null);
    const [round, setRound] = useState(1);
    const [categoryWords, setCategoryWords] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (code) {
            initGame();
            const cluesSub = supabase.channel(`game_clues_${code}`).on('postgres_changes', { event: '*', schema: 'public', table: 'clues', filter: `room_code=eq.${code}` }, () => fetchClues()).subscribe();
            const votesSub = supabase.channel(`game_votes_${code}`).on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_code=eq.${code}` }, () => fetchVotes()).subscribe();
            const roomSub = supabase.channel(`game_room_${code}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (p) => setRoomStatus(p.new.status)).subscribe();
            return () => { supabase.removeChannel(cluesSub); supabase.removeChannel(votesSub); supabase.removeChannel(roomSub); };
        }
    }, [code]);

    const initGame = async () => {
        const { data: pData } = await supabase.from('players').select('id, nickname, role').eq('id', playerId).single();
        const { data: rData } = await supabase.from('rooms').select('*').eq('code', code).single();
        const { data: allP } = await supabase.from('players').select('id, nickname, role, user_id').eq('room_code', code);
        if (!pData || !rData) { showAlert('خطأ', 'البيانات ما موجودة'); router.replace('/'); return; }
        setMe(pData); setRoomStatus(rData.status); setCivilianWord(rData.civilian_word); setImposterWord(rData.imposter_word);
        setWord(pData.role === 'IMPOSTER' ? rData.imposter_word : rData.civilian_word); setPlayers(allP || []);

        // Fetch category words for the guess phase
        if (rData.selected_topic) {
            const { data: catData } = await supabase.from('word_categories').select('words').eq('name', rData.selected_topic).single();
            if (catData?.words) setCategoryWords(catData.words);
        }

        fetchClues(); fetchVotes(); setLoading(false);
    };

    const fetchClues = async () => { const { data } = await supabase.from('clues').select('*').eq('room_code', code); if (data) { setClues(data); setHasSubmitted(data.filter(c => c.player_id === playerId).length >= round); } };
    const fetchVotes = async () => { const { data } = await supabase.from('votes').select('*').eq('room_code', code); if (data) { setVotes(data); setHasVoted(data.some(v => v.voter_id === playerId)); } };

    const handleSubmitClue = async () => {
        if (!clue.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await supabase.from('clues').insert({ player_id: playerId, room_code: code, content: clue.trim() });
            setClue('');
            setHasSubmitted(true);
            fetchClues();
        } catch (e) {
            showAlert('خطأ', 'فشل في إرسال الإشارة');
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleStartVoting = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await supabase.from('rooms').update({ status: 'PLAYING_VOTING' }).eq('code', code);
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleAnotherRound = async () => {
        if (isSubmitting) return;
        setRound(r => r + 1); setHasSubmitted(false);
    };
    const handleVote = async (targetId: string) => {
        if (hasVoted || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await supabase.from('votes').insert({ voter_id: playerId, target_id: targetId, room_code: code });
            setHasVoted(true);
            fetchVotes();
        } finally {
            setIsSubmitting(false);
        }
    };

    const awardCredits = async (winnerRole: 'CIVILIAN' | 'IMPOSTER') => {
        const winners = players.filter(p => p.role === winnerRole && p.user_id);
        for (const w of winners) {
            const { data: prof } = await supabase.from('profiles').select('credits, wins').eq('id', w.user_id).single();
            if (prof) {
                await supabase.from('profiles').update({
                    credits: (prof.credits || 0) + 20,
                    wins: (prof.wins || 0) + 1
                }).eq('id', w.user_id);
            }
        }
    };

    const handleTallyVotes = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const counts: Record<string, number> = {}; votes.forEach(v => counts[v.target_id] = (counts[v.target_id] || 0) + 1);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]); if (sorted.length === 0) return;
            const topVotedId = sorted[0][0]; const imposter = players.find(p => p.role === 'IMPOSTER');
            if (topVotedId === imposter?.id) { await supabase.from('rooms').update({ status: 'PLAYING_GUESS' }).eq('code', code); }
            else {
                setWinner('النصّاب فاز! 🎭');
                await awardCredits('IMPOSTER');
                await supabase.from('rooms').update({ status: 'FINISHED' }).eq('code', code);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImposterGuess = async (guess: string) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const isCorrect = guess === civilianWord;
            setWinner(isCorrect ? 'النصّاب فاز! 🎭' : 'المحققين فازوا! 🎉');
            await awardCredits(isCorrect ? 'IMPOSTER' : 'CIVILIAN');
            await supabase.from('rooms').update({ status: 'FINISHED' }).eq('code', code);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isHost = players.length > 0 && me?.id === players[0]?.id;
    const allSubmitted = clues.length >= players.length * round;

    if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#1f96ad" /></View>;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header: Game Status & Your Word */}
            <View style={styles.header}>
                <View style={styles.roundPill}>
                    <Text style={styles.roundText}>الجولة {round}</Text>
                </View>
                <View style={styles.intelCard}>
                    <Text style={styles.intelLabel}>{roomStatus === 'FINISHED' ? 'انكشفت الكلمات' : 'معلومتك'}</Text>
                    <Text style={styles.intelValue} selectable={false}>
                        {roomStatus === 'FINISHED' ? `${civilianWord} / ${imposterWord}` : word}
                    </Text>
                    <View style={styles.intelDecorator} />
                </View>
            </View>

            {/* Main Game Area */}
            {roomStatus === 'PLAYING_CLUES' && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="wifi-tethering" size={16} color="#1f96ad" />
                        <Text style={styles.sectionLabel}>الإشارات ({clues.length}/{players.length * round})</Text>
                    </View>
                    <View style={styles.clueList}>
                        {clues.map(item => (
                            <View key={item.id} style={styles.clueItem}>
                                <Text style={styles.clueSender}>{players.find(p => p.id === item.player_id)?.nickname}</Text>
                                <Text style={styles.clueContent}>{item.content}</Text>
                            </View>
                        ))}
                    </View>

                    {!hasSubmitted ? (
                        <View style={styles.inputArea}>
                            <TextInput
                                style={styles.clueInput}
                                value={clue}
                                onChangeText={setClue}
                                placeholder="أرسل إشارة..."
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                textAlign="right"
                            />
                            <Pressable
                                style={[styles.sendButton, isSubmitting && { opacity: 0.7 }]}
                                onPress={handleSubmitClue}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <ActivityIndicator color="white" size="small" /> : <MaterialIcons name="send" size={24} color="white" />}
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.waitingContainer}>
                            <ActivityIndicator color="#1f96ad" style={{ marginBottom: 12 }} />
                            <Text style={styles.waitingText}>في انتظار البقية...</Text>
                            {isHost && allSubmitted && (
                                <View style={styles.hostActions}>
                                    <Pressable
                                        style={[styles.primaryActionButton, isSubmitting && { opacity: 0.7 }]}
                                        onPress={handleStartVoting}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <ActivityIndicator color="white" size="small" /> : (
                                            <>
                                                <Text style={styles.actionButtonText}>بدء التصويت</Text>
                                                <MaterialIcons name="how-to-vote" size={20} color="white" />
                                            </>
                                        )}
                                    </Pressable>
                                    <Pressable style={styles.secondaryActionButton} onPress={handleAnotherRound}>
                                        <Text style={styles.secondaryActionText}>جولة ثانية</Text>
                                        <MaterialIcons name="loop" size={18} color="rgba(255,255,255,0.4)" />
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}

            {roomStatus === 'PLAYING_VOTING' && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="person-search" size={16} color="#FF7F50" />
                        <Text style={styles.sectionLabel}>حدد النصّاب</Text>
                    </View>
                    <View style={styles.voteGrid}>
                        {players.map(item => (
                            <Pressable
                                key={item.id}
                                style={[styles.voteCard, (hasVoted || isSubmitting) && styles.voteCardDisabled]}
                                onPress={() => handleVote(item.id)}
                                disabled={hasVoted || isSubmitting}
                            >
                                <View style={styles.voteCardInner}>
                                    <Text style={styles.voteCardName}>{item.nickname}</Text>
                                    <View style={styles.voteDots}>
                                        {votes.filter(v => v.target_id === item.id).map((_, i) => (
                                            <View key={i} style={styles.voteDot} />
                                        ))}
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                    {isHost && votes.length >= players.length && (
                        <Pressable
                            style={[styles.primaryActionButton, isSubmitting && { opacity: 0.7 }]}
                            onPress={handleTallyVotes}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color="white" size="small" /> : (
                                <>
                                    <Text style={styles.actionButtonText}>كشف النتائج</Text>
                                    <MaterialIcons name="visibility" size={20} color="white" />
                                </>
                            )}
                        </Pressable>
                    )}
                </View>
            )}

            {roomStatus === 'PLAYING_GUESS' && (
                <View style={[styles.section, { alignItems: 'center' }]}>
                    {me?.role === 'IMPOSTER' ? (
                        <>
                            <View style={styles.warningBox}>
                                <MaterialIcons name="warning" size={32} color="#FF7F50" />
                                <Text style={styles.warningTitle}>انكشفت الهوية!</Text>
                                <Text style={styles.warningSubtitle}>خمن الكلمة الصحيحة للهروب</Text>
                            </View>
                            <View style={styles.guessGrid}>
                                {(categoryWords.length > 0 ? categoryWords.slice(0, 10) : ['أبل', 'كمثرى', 'كلب', 'ذئب', 'قطة', 'أسد', 'بيتزا', 'برجر', 'كرسي', 'طاولة']).map(opt => (
                                    <Pressable
                                        key={opt}
                                        style={[styles.guessCard, isSubmitting && { opacity: 0.5 }]}
                                        onPress={() => handleImposterGuess(opt)}
                                        disabled={isSubmitting}
                                    >
                                        <Text style={styles.guessText}>{opt}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    ) : (
                        <View style={styles.waitingContainer}>
                            <ActivityIndicator color="#FF7F50" size="large" />
                            <Text style={[styles.waitingText, { marginTop: 20 }]}>النصّاب يحاول التخمين...</Text>
                        </View>
                    )}
                </View>
            )}

            {roomStatus === 'FINISHED' && (
                <View style={styles.resultSection}>
                    <Text style={styles.resultMainTitle}>اكتملت العملية</Text>
                    <View style={[styles.resultCard, { borderColor: winner?.includes('النصّاب') ? '#FF7F50' : '#1f96ad' }]}>
                        <Text style={[styles.resultWinner, { color: winner?.includes('النصّاب') ? '#FF7F50' : '#1f96ad' }]}>{winner}</Text>
                        <View style={styles.divider} />
                        <Text style={styles.resultImposter}>النصّاب كان: {players.find(p => p.role === 'IMPOSTER')?.nickname}</Text>
                    </View>
                    <Pressable style={styles.primaryActionButton} onPress={() => router.replace('/')}>
                        <Text style={styles.actionButtonText}>العودة للرئيسية</Text>
                        <MaterialIcons name="home" size={20} color="white" />
                    </Pressable>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    scrollContent: { padding: 24, flexGrow: 1 },
    header: { marginTop: 24, marginBottom: 32, gap: 16 },
    roundPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(31, 150, 173, 0.1)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(31, 150, 173, 0.2)' },
    roundText: { fontSize: 12, fontFamily: 'Cairo-Bold', color: '#1f96ad', textTransform: 'uppercase' },
    intelCard: {
        backgroundColor: '#1e252f',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2a3441',
        ...Platform.select({
            web: { boxShadow: '4px 4px 0px #0a0d12' },
            default: {
                shadowColor: '#0a0d12',
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 4,
            }
        })
    },
    intelLabel: { fontSize: 10, fontFamily: 'Cairo-Bold', color: '#1f96ad', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    intelValue: { fontSize: 32, fontFamily: 'Cairo-Black', color: 'white' },
    intelDecorator: { height: 4, width: 40, backgroundColor: '#FF7F50', borderRadius: 2, marginTop: 16 },
    section: { flex: 1 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, justifyContent: 'flex-end' },
    sectionLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
    clueList: { gap: 12, marginBottom: 24 },
    clueItem: { backgroundColor: '#1e252f', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2a3441' },
    clueSender: { fontSize: 10, fontFamily: 'Cairo-Bold', color: '#1f96ad', marginBottom: 4, textAlign: 'right' },
    clueContent: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'white', textAlign: 'right' },
    inputArea: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    clueInput: { flex: 1, backgroundColor: '#1e252f', borderRadius: 99, paddingHorizontal: 24, paddingVertical: 16, color: 'white', fontFamily: 'Cairo-Bold', borderWidth: 2, borderColor: '#2a3441' },
    sendButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1f96ad',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: { boxShadow: '0px 4px 8px rgba(31, 150, 173, 0.3)' },
            default: {
                shadowColor: '#1f96ad',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
            }
        })
    },
    waitingContainer: { alignItems: 'center', padding: 32 },
    waitingText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)' },
    hostActions: { width: '100%', gap: 12, marginTop: 24 },
    primaryActionButton: {
        backgroundColor: '#FF7F50',
        borderRadius: 99,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        ...Platform.select({
            web: { boxShadow: '0px 8px 12px rgba(10, 13, 18, 0.3)' },
            default: {
                shadowColor: '#0a0d12',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
            }
        })
    },
    actionButtonText: { fontSize: 18, fontFamily: 'Cairo-Black', color: 'white' },
    secondaryActionButton: { borderRadius: 99, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    secondaryActionText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)' },
    voteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    voteCard: { width: '48%', backgroundColor: '#1e252f', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#2a3441' },
    voteCardDisabled: { opacity: 0.5 },
    voteCardInner: { alignItems: 'center' },
    voteCardName: { fontSize: 16, fontFamily: 'Cairo-Bold', color: 'white', marginBottom: 8 },
    voteDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
    voteDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF7F50' },
    warningBox: { alignItems: 'center', marginBottom: 32 },
    warningTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: '#FF7F50', marginTop: 16 },
    warningSubtitle: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)', marginTop: 8 },
    guessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
    guessCard: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#1e252f', borderRadius: 12, borderWidth: 1, borderColor: '#2a3441' },
    guessText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'white' },
    resultSection: { alignItems: 'center', paddingTop: 40, gap: 24 },
    resultMainTitle: { fontSize: 40, fontFamily: 'Cairo-Black', color: 'white', textAlign: 'center' },
    resultCard: {
        width: '100%',
        backgroundColor: '#1e252f',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 2,
        ...Platform.select({
            web: { boxShadow: '4px 4px 0px #0a0d12' },
            default: {
                shadowColor: '#0a0d12',
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 4,
            }
        })
    },
    resultWinner: { fontSize: 28, fontFamily: 'Cairo-Black', textAlign: 'center' },
    divider: { height: 1, width: '60%', backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 20 },
    resultImposter: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)' },
});
