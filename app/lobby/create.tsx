import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';

const showAlert = (title: string, msg: string) => Platform.OS === 'web' ? window.alert(`${title}: ${msg}`) : Alert.alert(title, msg);

type Category = { id: number; name: string };

export default function CreateRoom() {
    const [nickname, setNickname] = useState('');
    const [gameMode, setGameMode] = useState<'relative' | 'random'>('relative');
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. Fetch free and guest topics
        const { data: publicTopics } = await supabase
            .from('word_categories')
            .select('id, name')
            .or('is_free.eq.true,is_weekly_guest.eq.true');

        // 2. Fetch owned topics
        const { data: ownedData } = await supabase
            .from('user_topics')
            .select('word_categories(id, name)')
            .eq('user_id', session.user.id);

        const ownedTopics = ownedData?.map((item: any) => item.word_categories).filter(Boolean) || [];

        // 3. Combine and deduplicate
        const combined = [...(publicTopics || []), ...ownedTopics];
        const unique = Array.from(new Set(combined.map(t => t.id))).map(id => combined.find(t => t.id === id));

        if (unique.length > 0) {
            setCategories(unique as Category[]);
            setSelectedTopic(unique[0]?.name || null);
        }
    };

    const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

    const handleCreateRoom = async () => {
        if (!nickname.trim()) { showAlert('خطأ', 'ادخل اسمك يا ولد'); return; }
        setLoading(true);
        const roomCode = generateRoomCode();
        try {
            const { error: roomError } = await supabase.from('rooms').insert([{ code: roomCode, status: 'LOBBY', game_mode: gameMode }]);
            if (roomError) throw roomError;
            const { data: { session } } = await supabase.auth.getSession();
            const { data: userData, error: userError } = await supabase.from('players').insert([{
                room_code: roomCode,
                nickname: nickname.trim(),
                is_host: true,
                user_id: session?.user?.id || null
            }]).select().single();
            if (userError) throw userError;
            router.push(`/lobby/${roomCode}?playerId=${userData.id}`);
        } catch (error: any) { showAlert('خطأ', error.message); }
        finally { setLoading(false); }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Pressable onPress={() => router.push('/')} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={20} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>إعداد العملية</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>اختر وضع اللعب</Text>
                <View style={styles.row}>
                    <Pressable
                        style={[styles.modeCard, gameMode === 'relative' && styles.modeCardActive, { backgroundColor: '#FF7F50' }]}
                        onPress={() => setGameMode('relative')}
                    >
                        <MaterialIcons name="gps-fixed" size={32} color="#14181f" />
                        <Text style={[styles.modeTitle, { color: '#14181f' }]}>قريب</Text>
                        <Text style={[styles.modeDesc, { color: 'rgba(20,24,31,0.6)' }]}>كلمات متشابهة</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.modeCard, gameMode === 'random' && styles.modeCardActive, { backgroundColor: '#1f96ad' }]}
                        onPress={() => setGameMode('random')}
                    >
                        <MaterialIcons name="shuffle" size={32} color="#14181f" />
                        <Text style={[styles.modeTitle, { color: '#14181f' }]}>عشوائي</Text>
                        <Text style={[styles.modeDesc, { color: 'rgba(20,24,31,0.6)' }]}>أي كلمات</Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>اختر الموضوع</Text>
                <View style={styles.topicGrid}>
                    {categories.map(cat => (
                        <Pressable
                            key={cat.id}
                            style={[styles.topicCard, selectedTopic === cat.name && styles.topicCardActive]}
                            onPress={() => setSelectedTopic(cat.name)}
                        >
                            <Text style={[styles.topicText, selectedTopic === cat.name && styles.topicTextActive]}>{cat.name}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>اسم العميل</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="أدخل اسمك..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={nickname}
                        onChangeText={setNickname}
                    />
                    <View style={styles.inputDecorator} />
                </View>
            </View>

            <View style={styles.footer}>
                <Pressable style={styles.createButton} onPress={handleCreateRoom} disabled={loading}>
                    <View style={styles.createButtonInner}>
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={styles.createButtonText}>ابدأ العملية</Text>
                                <MaterialIcons name="play-arrow" size={24} color="white" />
                            </>
                        )}
                    </View>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    scrollContent: { padding: 24, flexGrow: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 24, marginBottom: 32 },
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: 'white' },
    section: { marginBottom: 32 },
    sectionLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: '#1f96ad', letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase', textAlign: 'right' },
    row: { flexDirection: 'row', gap: 16 },
    modeCard: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: '#2a3441', shadowColor: '#0a0d12', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
    modeCardActive: { borderColor: 'white', borderWidth: 2 },
    modeTitle: { fontSize: 20, fontFamily: 'Cairo-Black', marginTop: 12 },
    modeDesc: { fontSize: 10, fontWeight: '700', marginTop: 4, fontFamily: 'Cairo-Bold' },
    topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
    topicCard: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1e252f', borderRadius: 12, borderWidth: 1, borderColor: '#2a3441' },
    topicCardActive: { borderColor: '#1f96ad', backgroundColor: 'rgba(31, 150, 173, 0.1)' },
    topicText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo-Bold' },
    topicTextActive: { color: '#1f96ad' },
    inputContainer: { position: 'relative' },
    input: { backgroundColor: '#1e252f', borderRadius: 16, padding: 20, color: 'white', fontSize: 16, fontFamily: 'Cairo-Bold', borderWidth: 2, borderColor: '#2a3441', textAlign: 'right' },
    inputDecorator: { position: 'absolute', left: 20, bottom: -4, width: 40, height: 4, backgroundColor: '#FF7F50', borderRadius: 2 },
    footer: { marginTop: 'auto', paddingTop: 24 },
    createButton: { backgroundColor: '#FF7F50', borderRadius: 99, shadowColor: '#0a0d12', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    createButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 20 },
    createButtonText: { fontSize: 18, fontFamily: 'Cairo-Black', color: 'white' },
});
