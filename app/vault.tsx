import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

type Topic = {
    id: number;
    name: string;
};

export default function VaultScreen() {
    const [ownedTopics, setOwnedTopics] = useState<Topic[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchSession();
    }, []);

    async function fetchSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.replace('/auth');
            return;
        }
        await fetchProfile(session.user.id);
        await fetchOwnedTopics(session.user.id);
        setLoading(false);
    }

    async function fetchProfile(userId: string) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (data) setProfile(data);
    }

    async function fetchOwnedTopics(userId: string) {
        const { data, error } = await supabase
            .from('user_topics')
            .select('topic_id, word_categories(id, name)')
            .eq('user_id', userId);

        if (data) {
            setOwnedTopics(data.map((item: any) => item.word_categories).filter(Boolean));
        }
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
                    <Text style={styles.headerTitle}>الخزنة</Text>
                    <Text style={styles.headerSubtitle}>معلوماتك السرية وقدراتك</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.inventorySection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>المواضيع المملوكة</Text>
                        <View style={styles.counterPill}>
                            <Text style={styles.counterText}>{ownedTopics.length}</Text>
                        </View>
                    </View>

                    <View style={styles.topicGrid}>
                        {ownedTopics.map((topic) => (
                            <Pressable key={topic.id} style={styles.topicCard}>
                                <View style={styles.topicIconBox}>
                                    <MaterialIcons name="folder" size={24} color="#1f96ad" />
                                </View>
                                <Text style={styles.topicName}>{topic.name}</Text>
                                <View style={styles.topicStatus}>
                                    <Text style={styles.statusText}>نشط</Text>
                                </View>
                            </Pressable>
                        ))}

                        <Pressable style={styles.addCard} onPress={() => router.push('/store')}>
                            <MaterialIcons name="add" size={32} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.addText}>متجر المواضيع</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.statsSection}>
                    <Text style={styles.sectionLabel}>إحصائيات الملف</Text>
                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{profile?.wins || 0}</Text>
                            <Text style={styles.statLabel}>عملية ناجحة</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{profile?.credits?.toLocaleString() || '0'}</Text>
                            <Text style={styles.statLabel}>رصيد</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    loadingContainer: { flex: 1, backgroundColor: '#14181f', justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 16 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: 'white' },
    headerSubtitle: { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#1f96ad' },
    scrollContent: { padding: 24 },
    inventorySection: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
    counterPill: { backgroundColor: 'rgba(31, 150, 173, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
    counterText: { color: '#1f96ad', fontSize: 12, fontFamily: 'Cairo-Black' },
    topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    topicCard: { width: '48%', backgroundColor: '#1e252f', borderRadius: 20, padding: 16, borderWidth: 2, borderColor: '#2a3441', alignItems: 'flex-start' },
    topicIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(31, 150, 173, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    topicName: { fontSize: 16, fontFamily: 'Cairo-Black', color: 'white', marginBottom: 4 },
    topicStatus: { backgroundColor: 'rgba(74, 222, 128, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    statusText: { color: '#4ade80', fontSize: 10, fontFamily: 'Cairo-Bold' },
    addCard: { width: '48%', aspectRatio: 1.1, backgroundColor: 'transparent', borderRadius: 20, padding: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addText: { fontSize: 12, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.2)' },
    statsSection: { gap: 16 },
    statsCard: { backgroundColor: '#1e252f', borderRadius: 20, padding: 24, flexDirection: 'row', borderWidth: 2, borderColor: '#2a3441' },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 24, fontFamily: 'Cairo-Black', color: 'white' },
    statLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)' },
    statDivider: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.1)' },
});
