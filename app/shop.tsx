import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BUNDLES = [
    { id: 'bundle_small', name: 'رزمة المبتدئ', credits: 500, price: '0.500 OMR', icon: 'payments', color: ['#1f96ad', '#14181f'] },
    { id: 'bundle_medium', name: 'حقيبة العميل', credits: 2500, price: '2.000 OMR', icon: 'work', color: ['#FF7F50', '#14181f'] },
    { id: 'bundle_large', name: 'خزنة المقر', credits: 7500, price: '5.000 OMR', icon: 'account-balance', color: ['#FFD700', '#14181f'] },
];

export default function ShopScreen() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (data) setProfile(data);
        } else {
            router.replace('/auth');
        }
    }

    const handlePurchase = async (bundle: typeof BUNDLES[0]) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-paymob-session', {
                body: { bundleId: bundle.id, credits: bundle.credits },
            });

            if (error) throw error;

            if (data?.url) {
                if (Platform.OS === 'web') {
                    window.location.href = data.url;
                } else {
                    Alert.alert('رابط الدفع', 'سيتم فتح متصفح لإكمال الدفع عبر Paymob.', [
                        { text: 'إلغاء', style: 'cancel' },
                        { text: 'موافق', onPress: () => { /* Logic to open URL on mobile */ } }
                    ]);
                }
            }
        } catch (err: any) {
            Alert.alert('خطأ', 'فشل في الاتصال بخدمة Paymob: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>متجر الرصيد</Text>
                    <Text style={styles.headerSubtitle}>اشحن رصيدك لفتح مواضيع ومميزات حصرية</Text>
                </View>
                <View style={styles.balancePill}>
                    <MaterialIcons name="toll" size={16} color="#1f96ad" />
                    <Text style={styles.balanceText}>{profile?.credits?.toLocaleString() || '0'}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.bundlesGrid}>
                    {BUNDLES.map((bundle) => (
                        <Pressable
                            key={bundle.id}
                            style={styles.bundleCard}
                            onPress={() => handlePurchase(bundle)}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={bundle.color}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.cardGradient}
                            >
                                <View style={styles.iconBox}>
                                    <MaterialIcons name={bundle.icon as any} size={32} color="white" />
                                </View>
                                <View style={styles.content}>
                                    <Text style={styles.bundleName}>{bundle.name}</Text>
                                    <View style={styles.creditInfo}>
                                        <MaterialIcons name="toll" size={18} color="#1f96ad" />
                                        <Text style={styles.creditValue}>+{bundle.credits.toLocaleString()}</Text>
                                    </View>
                                </View>
                                <View style={styles.priceTag}>
                                    <Text style={styles.priceText}>{bundle.price}</Text>
                                </View>
                            </LinearGradient>
                        </Pressable>
                    ))}
                </View>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#1f96ad" />
                        <Text style={styles.loadingText}>جاري تحضير بوابة الدفع...</Text>
                    </View>
                )}

                <View style={styles.infoBox}>
                    <MaterialIcons name="security" size={20} color="#1f96ad" />
                    <Text style={styles.infoText}>جميع المعاملات تتم بشكل آمن عبر سحابة Paymob</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 12 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: 'white' },
    headerSubtitle: { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#1f96ad' },
    balancePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: 'rgba(31, 150, 173, 0.2)' },
    balanceText: { color: 'white', fontSize: 13, fontFamily: 'Epilogue-Bold' },
    scrollContent: { padding: 24 },
    bundlesGrid: { gap: 16 },
    bundleCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#2a3441',
        ...Platform.select({
            web: { cursor: 'pointer', transition: 'transform 0.2s' },
        })
    },
    cardGradient: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1 },
    bundleName: { fontSize: 20, fontFamily: 'Cairo-Black', color: 'white' },
    creditInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    creditValue: { fontSize: 18, fontFamily: 'Epilogue-Bold', color: '#1f96ad' },
    priceTag: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    priceText: { color: '#14181f', fontSize: 14, fontFamily: 'Cairo-Black' },
    loadingOverlay: { marginTop: 20, alignItems: 'center', gap: 12 },
    loadingText: { color: '#1f96ad', fontSize: 14, fontFamily: 'Cairo-Bold' },
    infoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, opacity: 0.6 },
    infoText: { color: 'white', fontSize: 12, fontFamily: 'Cairo-Bold' }
});
