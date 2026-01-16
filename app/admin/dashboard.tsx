import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    const [userCount, setUserCount] = useState<number | null>(null);
    const [activeRoomsCount, setActiveRoomsCount] = useState<number | null>(null);

    useEffect(() => {
        checkAdmin();
        fetchStats();
    }, []);

    async function fetchStats() {
        // Fetch total users (from profiles if available, or just a mock if not allowed to read auth.users)
        // Since we are moving to "Real Data", let's try to count profiles
        const { count: users, error: userError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (!userError) setUserCount(users);

        // Fetch active rooms (not finished)
        const { count: rooms, error: roomError } = await supabase
            .from('rooms')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'FINISHED');

        if (!roomError) setActiveRoomsCount(rooms);
    }

    async function checkAdmin() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || session.user.email !== 'asnssrr@gmail.com') {
            Alert.alert('منوع', 'هذه المنطقة للمسؤولين فقط!');
            router.replace('/');
            return;
        }
        setIsAdmin(true);
        setLoading(false);
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF7F50" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.push('/')} style={styles.backButton}>
                    <MaterialIcons name="close" size={24} color="white" />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>غرفة القيادة</Text>
                    <Text style={styles.headerSubtitle}>إدارة عمليات المحتال</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.grid}>
                    <Pressable style={styles.adminCard} onPress={() => router.push('/admin/characters')}>
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 127, 80, 0.1)' }]}>
                            <MaterialIcons name="face" size={32} color="#FF7F50" />
                        </View>
                        <Text style={styles.cardTitle}>الشخصيات</Text>
                        <Text style={styles.cardDesc}>إضافة وتعديل صور العملاء</Text>
                    </Pressable>

                    <Pressable style={styles.adminCard} onPress={() => router.push('/admin/shop')}>
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(31, 150, 173, 0.1)' }]}>
                            <MaterialIcons name="storefront" size={32} color="#1f96ad" />
                        </View>
                        <Text style={styles.cardTitle}>المتجر</Text>
                        <Text style={styles.cardDesc}>إدارة مبيعات المواضيع</Text>
                    </Pressable>

                    <Pressable style={styles.adminCard} onPress={() => router.push('/packs')}>
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                            <MaterialIcons name="library-books" size={32} color="#a855f7" />
                        </View>
                        <Text style={styles.cardTitle}>المواضيع</Text>
                        <Text style={styles.cardDesc}>تعديل قوائم الكلمات</Text>
                    </Pressable>

                    <View style={styles.statsCard}>
                        <Text style={styles.statsTitle}>نشاط النظام</Text>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>إجمالي المستخدمين</Text>
                            <Text style={styles.statValue}>{userCount !== null ? userCount.toLocaleString() : '...'}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>العمليات النشطة</Text>
                            <Text style={styles.statValue}>{activeRoomsCount !== null ? activeRoomsCount.toLocaleString() : '...'}</Text>
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
    headerSubtitle: { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#FF7F50' },
    scrollContent: { padding: 24 },
    grid: { gap: 16 },
    adminCard: { backgroundColor: '#1e252f', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#2a3441', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    iconBox: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 20, fontFamily: 'Cairo-Black', color: 'white', marginBottom: 4 },
    cardDesc: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)' },
    statsCard: { backgroundColor: 'rgba(31, 150, 173, 0.05)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(31, 150, 173, 0.1)', marginTop: 8 },
    statsTitle: { fontSize: 16, fontFamily: 'Cairo-Black', color: '#1f96ad', marginBottom: 16 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statLabel: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.5)' },
    statValue: { fontSize: 18, fontFamily: 'Cairo-Black', color: 'white' },
    statDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 12 },
});
