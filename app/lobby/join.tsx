import { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';

const showAlert = (title: string, msg: string) => Platform.OS === 'web' ? window.alert(`${title}: ${msg}`) : Alert.alert(title, msg);

export default function JoinRoom() {
    const [nickname, setNickname] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const actionLock = useRef(false);
    const router = useRouter();

    const handleJoinRoom = async () => {
        if (!nickname.trim() || !roomCode.trim() || loading || actionLock.current) {
            if (!nickname.trim() || !roomCode.trim()) showAlert('خطأ', 'ادخل اسمك وكود الغرفة');
            return;
        }

        actionLock.current = true;
        setLoading(true);
        try {
            const { data: room, error: roomError } = await supabase.from('rooms').select('code, status').eq('code', roomCode.toUpperCase()).single();
            if (roomError || !room) throw new Error('الدخول مرفوض. الكود غلط.');
            if (room.status !== 'LOBBY') throw new Error('الجلسة شغالة من قبل.');
            const { data: { session } } = await supabase.auth.getSession();
            const { data: userData, error: userError } = await supabase.from('players').insert([{
                room_code: roomCode.toUpperCase(),
                nickname: nickname.trim(),
                is_host: false,
                user_id: session?.user?.id || null
            }]).select().single();
            if (userError) throw userError;
            router.push(`/lobby/${roomCode.toUpperCase()}?playerId=${userData.id}`);
        } catch (error: any) { showAlert('الدخول مرفوض', error.message); }
        finally { setLoading(false); }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Pressable onPress={() => router.push('/')} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={20} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>انضم للشلة</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.bentoHero}>
                    <MaterialIcons name="security" size={48} color="#FF7F50" />
                    <Text style={styles.bentoTitle}>التحقق من الهوية</Text>
                    <Text style={styles.bentoSubtitle}>أدخل كود العملية واسمك السري</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>كود العملية</Text>
                <View style={styles.codeContainer}>
                    <TextInput
                        style={styles.codeInput}
                        placeholder="XXXX"
                        placeholderTextColor="rgba(31, 150, 173, 0.3)"
                        value={roomCode}
                        onChangeText={text => setRoomCode(text.toUpperCase())}
                        autoCapitalize="characters"
                        maxLength={4}
                    />
                    <View style={styles.codeUnderline} />
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
                <Pressable style={styles.joinButton} onPress={handleJoinRoom} disabled={loading}>
                    <View style={styles.joinButtonInner}>
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={styles.joinButtonText}>اتصال بالشبكة</Text>
                                <MaterialIcons name="wifi" size={24} color="white" />
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
    bentoHero: { backgroundColor: '#1e252f', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: '#2a3441', shadowColor: '#0a0d12', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
    bentoTitle: { fontSize: 22, fontFamily: 'Cairo-Black', color: 'white', marginTop: 16 },
    bentoSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo-Bold', marginTop: 8 },
    sectionLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: '#1f96ad', letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase', textAlign: 'right' },
    codeContainer: { position: 'relative' },
    codeInput: { backgroundColor: '#1e252f', borderRadius: 16, padding: 24, color: '#1f96ad', fontSize: 32, fontFamily: 'Epilogue-BlackItalic', borderWidth: 2, borderColor: '#1f96ad33', textAlign: 'center', letterSpacing: 8 },
    codeUnderline: { position: 'absolute', bottom: 12, left: '20%', right: '20%', height: 2, backgroundColor: '#1f96ad', opacity: 0.5 },
    inputContainer: { position: 'relative' },
    input: { backgroundColor: '#1e252f', borderRadius: 16, padding: 20, color: 'white', fontSize: 16, fontFamily: 'Cairo-Bold', borderWidth: 2, borderColor: '#2a3441', textAlign: 'right' },
    inputDecorator: { position: 'absolute', left: 20, bottom: -4, width: 40, height: 4, backgroundColor: '#FF7F50', borderRadius: 2 },
    footer: { marginTop: 'auto', paddingTop: 24 },
    joinButton: { backgroundColor: '#1f96ad', borderRadius: 99, shadowColor: '#0a0d12', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    joinButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 20 },
    joinButtonText: { fontSize: 18, fontFamily: 'Cairo-Black', color: 'white' },
});
