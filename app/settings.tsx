import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, Platform, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function SettingsScreen() {
    const [user, setUser] = useState<any>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [vibrationEnabled, setVibrationEnabled] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchUser();
    }, []);

    async function fetchUser() {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
    }

    async function handleLogout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert('خطأ', error.message);
        } else {
            router.replace('/auth');
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.push('/')} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>الإعدادات</Text>
                    <Text style={styles.headerSubtitle}>تخصيص تجربة المحتال</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>الحساب</Text>
                    <View style={styles.settingsGroup}>
                        {user ? (
                            <View style={styles.accountCard}>
                                <View style={styles.accountInfo}>
                                    <Text style={styles.accountEmail}>{user.email}</Text>
                                    <Text style={styles.accountStatus}>عميل نشط</Text>
                                </View>
                                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                                    <Text style={styles.logoutText}>خروج</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <Pressable style={styles.loginBanner} onPress={() => router.push('/auth')}>
                                <MaterialIcons name="login" size={24} color="#FF7F50" />
                                <Text style={styles.loginText}>سجل دخولك لحفظ تقدمك</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Game Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>إعدادات اللعبة</Text>
                    <View style={styles.settingsGroup}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <MaterialIcons name="volume-up" size={20} color="#1f96ad" />
                                <Text style={styles.settingLabel}>المؤثرات الصوتية</Text>
                            </View>
                            <Switch
                                value={soundEnabled}
                                onValueChange={setSoundEnabled}
                                trackColor={{ false: '#2a3441', true: 'rgba(31, 150, 173, 0.5)' }}
                                thumbColor={soundEnabled ? '#1f96ad' : '#9ca3af'}
                            />
                        </View>

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <MaterialIcons name="vibration" size={20} color="#1f96ad" />
                                <Text style={styles.settingLabel}>الاهتزاز</Text>
                            </View>
                            <Switch
                                value={vibrationEnabled}
                                onValueChange={setVibrationEnabled}
                                trackColor={{ false: '#2a3441', true: 'rgba(31, 150, 173, 0.5)' }}
                                thumbColor={vibrationEnabled ? '#1f96ad' : '#9ca3af'}
                            />
                        </View>

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <MaterialIcons name="notifications" size={20} color="#1f96ad" />
                                <Text style={styles.settingLabel}>التنبيهات</Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: '#2a3441', true: 'rgba(31, 150, 173, 0.5)' }}
                                thumbColor={notificationsEnabled ? '#1f96ad' : '#9ca3af'}
                            />
                        </View>
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>حول اللعبة</Text>
                    <View style={styles.settingsGroup}>
                        <Pressable style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <MaterialIcons name="info" size={20} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.settingLabel}>الإصدار</Text>
                            </View>
                            <Text style={styles.settingValue}>1.0.0 (Beta)</Text>
                        </Pressable>

                        <Pressable style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <MaterialIcons name="help" size={20} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.settingLabel}>الدعم والمساعدة</Text>
                            </View>
                            <MaterialIcons name="chevron-left" size={20} color="rgba(255,255,255,0.2)" />
                        </Pressable>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Bottom Nav Pill */}
            <View style={styles.bottomNavContainer}>
                <View style={styles.bottomNav}>
                    <Pressable style={styles.navItem} onPress={() => router.push('/store')}><MaterialIcons name="storefront" size={24} color="#9ca3af" /></Pressable>
                    <Pressable style={styles.navItem} onPress={() => router.push('/')}><MaterialIcons name="home" size={24} color="#9ca3af" /></Pressable>
                    <Pressable style={styles.navItem} onPress={() => router.push('/leaderboard')}><MaterialIcons name="leaderboard" size={24} color="#9ca3af" /></Pressable>
                    <Pressable style={[styles.navItem, styles.navItemActive]} onPress={() => router.push('/settings')}><MaterialIcons name="settings" size={24} color="#1f96ad" /></Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 16 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: 'white' },
    headerSubtitle: { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#1f96ad' },
    scrollContent: { padding: 24 },
    section: { marginBottom: 32 },
    sectionLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, textAlign: 'right' },
    settingsGroup: { backgroundColor: '#1e252f', borderRadius: 24, padding: 8, borderWidth: 2, borderColor: '#2a3441' },
    accountCard: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    accountInfo: { flex: 1 },
    accountEmail: { fontSize: 16, fontFamily: 'Cairo-Bold', color: 'white' },
    accountStatus: { fontSize: 12, fontFamily: 'Cairo-Bold', color: '#1f96ad', marginTop: 2 },
    logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
    logoutText: { color: '#ef4444', fontSize: 14, fontFamily: 'Cairo-Black' },
    loginBanner: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    loginText: { color: '#FF7F50', fontSize: 14, fontFamily: 'Cairo-Black' },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    settingLabel: { fontSize: 16, fontFamily: 'Cairo-Bold', color: 'white' },
    settingValue: { fontSize: 14, fontFamily: 'Epilogue-Bold', color: 'rgba(255,255,255,0.3)' },
    bottomNavContainer: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
    bottomNav: { width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 99, padding: 8, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: 'black', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
    navItem: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    navItemActive: { backgroundColor: 'rgba(31, 150, 173, 0.2)', borderWidth: 1, borderColor: 'rgba(31, 150, 173, 0.5)' },
});
