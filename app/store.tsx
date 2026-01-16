import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Topic = {
    id: number;
    name: string;
    price?: number;
    owned?: boolean;
    is_daily_offer?: boolean;
    is_free?: boolean;
    is_weekly_guest?: boolean;
    is_limited_time?: boolean;
};

export default function StoreScreen() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await fetchProfile(session.user.id);
            await fetchTopics(session.user.id);
        } else {
            router.replace('/auth');
        }
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

    async function fetchTopics(userId: string) {
        const { data: allCategories } = await supabase
            .from('word_categories')
            .select('id, name, price, is_daily_offer, is_free, is_weekly_guest, is_limited_time');

        const { data: ownedData } = await supabase
            .from('user_topics')
            .select('topic_id')
            .eq('user_id', userId);

        const ownedIds = new Set(ownedData?.map(o => o.topic_id) || []);

        setTopics(allCategories?.map(t => ({
            ...t,
            price: t.is_free ? 0 : (t.price || 500),
            owned: ownedIds.has(t.id) || t.is_free
        })) || []);
    }

    async function handleBuy(topic: Topic) {
        if (topic.is_free || topic.owned) return;

        if (!profile || profile.credits < (topic.price || 0)) {
            Alert.alert('خطأ', 'رصيدك غير كافٍ لإتمام هذه العملية!');
            return;
        }

        const { error: purchaseError } = await supabase
            .from('user_topics')
            .insert({ user_id: profile.id, topic_id: topic.id });

        if (purchaseError) {
            Alert.alert('خطأ', purchaseError.message);
            return;
        }

        const { error: creditError } = await supabase
            .from('profiles')
            .update({ credits: profile.credits - (topic.price || 0) })
            .eq('id', profile.id);

        if (creditError) {
            Alert.alert('تحذير', 'تم الشراء ولكن حدث خطأ في تحديث الرصيد البرمجي.');
        }

        Alert.alert('نجاح', `تم فتح باقة ${topic.name} بنجاح!`);
        fetchInitialData();
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1f96ad" />
            </View>
        );
    }

    const dailyOffer = topics.find(t => t.is_daily_offer && !t.owned);
    const weeklyGuests = topics.filter(t => t.is_weekly_guest && !t.owned);
    const freeTopics = topics.filter(t => t.is_free);
    const activeLimited = topics.filter(t => t.is_limited_time && !t.owned);
    const allOthers = topics.filter(t => !t.is_daily_offer && !t.is_free && !t.is_weekly_guest && (!t.is_limited_time || t.owned));

    const renderTopicCard = (topic: Topic, size: 'small' | 'large' = 'small') => {
        const isFreeContext = topic.is_free || topic.is_weekly_guest;
        return (
            <View key={topic.id} style={[styles.topicCard, size === 'large' && { width: '100%', marginBottom: 16 }, topic.owned && styles.ownedCard]}>
                <View style={[styles.topicIconBox, { backgroundColor: topic.owned ? 'rgba(74, 222, 128, 0.1)' : (isFreeContext ? 'rgba(31, 150, 173, 0.1)' : 'rgba(255, 127, 80, 0.1)') }]}>
                    <MaterialIcons
                        name={topic.owned ? "check-circle" : (topic.is_weekly_guest ? "event" : "shopping-bag")}
                        size={24}
                        color={topic.owned ? "#4ade80" : (isFreeContext ? "#1f96ad" : "#FF7F50")}
                    />
                </View>
                <View style={size === 'large' ? styles.largeTopicContent : { alignItems: 'center' }}>
                    <Text style={styles.topicName}>{topic.name}</Text>
                    <Text style={[styles.topicPrice, topic.is_weekly_guest && { color: '#1f96ad' }]}>
                        {topic.owned ? 'مملوك' : (topic.is_weekly_guest ? 'ضيف الأسبوع (مجاني مؤقتاً)' : (topic.is_free ? 'مجاني للأبد' : `${topic.price} CR`))}
                    </Text>
                </View>

                {!topic.owned && (
                    <Pressable
                        style={[styles.buyBtn, topic.is_weekly_guest && { backgroundColor: '#1f96ad' }]}
                        onPress={() => handleBuy(topic)}
                    >
                        <Text style={styles.buyBtnText}>{topic.is_weekly_guest ? 'تملّك للأبد' : 'شراء'}</Text>
                    </Pressable>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.push('/')} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>سوق المعلومات</Text>
                    <Text style={styles.headerSubtitle}>احصل على تقنيات ومواضيع جديدة</Text>
                </View>
                <Pressable onPress={() => router.push('/shop')} style={styles.balancePill}>
                    <MaterialIcons name="add" size={16} color="#FF7F50" style={{ marginRight: 4 }} />
                    <MaterialIcons name="toll" size={16} color="#1f96ad" />
                    <Text style={styles.balanceText}>{profile?.credits?.toLocaleString() || '0'}</Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* 1. DAILY GOLD OFFER */}
                {dailyOffer && (
                    <View style={styles.featuredSection}>
                        <Text style={styles.sectionLabel}>عرض اليوم الذهبي</Text>
                        <Pressable style={styles.featuredCard} onPress={() => handleBuy(dailyOffer)}>
                            <LinearGradient
                                colors={['#FF7F50', '#FF4500']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.featuredGradient}
                            >
                                <View style={styles.featuredContent}>
                                    <View>
                                        <Text style={styles.featuredTitle}>{dailyOffer.name}</Text>
                                        <Text style={styles.featuredSubtitle}>عرض محدود بخصم مذهل</Text>
                                    </View>
                                    <View style={styles.featuredPriceBox}>
                                        <Text style={styles.featuredPrice}>{dailyOffer.price} CR</Text>
                                        <MaterialIcons name="local-offer" size={24} color="#14181f" />
                                    </View>
                                </View>
                            </LinearGradient>
                        </Pressable>
                    </View>
                )}

                {/* 2. WEEKLY GUESTS */}
                {weeklyGuests.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>ضيف الأسبوع</Text>
                        {weeklyGuests.map(t => renderTopicCard(t, 'large'))}
                    </View>
                )}

                {/* 3. FREE TOPICS */}
                {freeTopics.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>باقات مجانية</Text>
                        <View style={styles.topicGrid}>
                            {freeTopics.map(t => renderTopicCard(t))}
                        </View>
                    </View>
                )}

                {/* 4. LIMITED TIME */}
                {activeLimited.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>إصدار محدود (عاجل)</Text>
                        <View style={styles.topicGrid}>
                            {activeLimited.map(t => renderTopicCard(t))}
                        </View>
                    </View>
                )}

                {/* 5. ALL OTHERS */}
                <View style={styles.gridSection}>
                    <Text style={styles.sectionLabel}>كل المهمات</Text>
                    <View style={styles.topicGrid}>
                        {allOthers.map(t => renderTopicCard(t))}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.bottomNavContainer}>
                <View style={styles.bottomNav}>
                    <Pressable style={[styles.navItem, styles.navItemActive]} onPress={() => router.push('/store')}><MaterialIcons name="storefront" size={24} color="#1f96ad" /></Pressable>
                    <Pressable style={styles.navItem} onPress={() => router.push('/')}><MaterialIcons name="home" size={24} color="#9ca3af" /></Pressable>
                    <Pressable style={styles.navItem} onPress={() => router.push('/leaderboard')}><MaterialIcons name="leaderboard" size={24} color="#9ca3af" /></Pressable>
                    <Pressable style={styles.navItem} onPress={() => router.push('/settings')}><MaterialIcons name="settings" size={24} color="#9ca3af" /></Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    loadingContainer: { flex: 1, backgroundColor: '#14181f', justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 12 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: 'white' },
    headerSubtitle: { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#1f96ad' },
    balancePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: 'rgba(31, 150, 173, 0.2)' },
    balanceText: { color: 'white', fontSize: 13, fontFamily: 'Epilogue-Bold' },
    scrollContent: { padding: 24 },
    section: { marginBottom: 32 },
    featuredSection: { marginBottom: 32 },
    featuredCard: { borderRadius: 24, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0px 10px 30px rgba(255, 127, 80, 0.3)' }, default: { shadowColor: '#FF7F50', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 } }) },
    featuredGradient: { padding: 24 },
    featuredContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    featuredTitle: { fontSize: 28, fontFamily: 'Cairo-Black', color: '#14181f' },
    featuredSubtitle: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'rgba(20,24,31,0.6)' },
    featuredPriceBox: { alignItems: 'center', gap: 4 },
    featuredPrice: { fontSize: 20, fontFamily: 'Epilogue-Black', color: '#14181f' },
    gridSection: {},
    sectionLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, textAlign: 'right' },
    topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    topicCard: { width: '48%', backgroundColor: '#1e252f', borderRadius: 24, padding: 16, borderWidth: 2, borderColor: '#2a3441', alignItems: 'center', ...Platform.select({ web: { boxShadow: '4px 4px 0px #0a0d12' }, default: { shadowColor: '#0a0d12', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 } }) },
    largeTopicContent: { flex: 1, paddingHorizontal: 12 },
    ownedCard: { borderColor: 'rgba(74, 222, 128, 0.2)', backgroundColor: 'rgba(10, 13, 18, 0.5)' },
    topicIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    topicName: { fontSize: 18, fontFamily: 'Cairo-Black', color: 'white', marginBottom: 4 },
    topicPrice: { fontSize: 12, fontFamily: 'Epilogue-Bold', color: '#FF7F50', marginBottom: 16, textAlign: 'center' },
    buyBtn: { backgroundColor: '#FF7F50', width: '100%', height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    buyBtnText: { fontSize: 14, fontFamily: 'Cairo-Black', color: '#14181f' },
    bottomNavContainer: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
    bottomNav: { width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 99, padding: 8, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: 'black', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
    navItem: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    navItemActive: { backgroundColor: 'rgba(31, 150, 173, 0.2)', borderWidth: 1, borderColor: 'rgba(31, 150, 173, 0.5)' },
});
