import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type Topic = {
    id: number;
    name: string;
    price?: number;
};

export default function ShopManager() {
    const [topics, setTopics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchTopics();
    }, []);

    async function fetchTopics() {
        const { data, error } = await supabase
            .from('word_categories')
            .select('id, name, price, is_daily_offer, is_free, is_weekly_guest, is_limited_time')
            .order('id');

        if (error) {
            console.error(error);
        } else {
            setTopics(data || []);
        }
        setLoading(false);
    }

    async function updateField(id: number, field: string, value: any) {
        setTopics(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    }

    async function toggleDailyOffer(id: number, currentStatus: boolean) {
        // Only one daily offer at a time (ideally)
        // If we enable one, we should probably disable others in the UI for clarity
        const newTopics = topics.map(t => {
            if (t.id === id) return { ...t, is_daily_offer: !currentStatus };
            if (!currentStatus) return { ...t, is_daily_offer: false }; // Disable others if we are enabling this
            return t;
        });
        setTopics(newTopics);
    }

    async function handleSave() {
        setLoading(true);
        try {
            for (const topic of topics) {
                const { error } = await supabase
                    .from('word_categories')
                    .update({
                        price: topic.price || 500,
                        is_daily_offer: topic.is_daily_offer || false,
                        is_free: topic.is_free || false,
                        is_weekly_guest: topic.is_weekly_guest || false,
                        is_limited_time: topic.is_limited_time || false
                    })
                    .eq('id', topic.id);
                if (error) throw error;
            }
            Alert.alert('نجاح', 'تم حفظ التغييرات بنجاح');
            fetchTopics();
        } catch (error: any) {
            Alert.alert('خطأ', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>إدارة المتجر</Text>
                    <Text style={styles.headerSubtitle}>تحديد أسعار المواضيع والخصومات</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>قائمة المواضيع والأسعار</Text>
                    <View style={styles.list}>
                        {topics.map((topic) => (
                            <View key={topic.id} style={[styles.itemRow, topic.is_daily_offer && styles.activeItem]}>
                                <View style={styles.topicInfo}>
                                    <View style={styles.titleRow}>
                                        <Text style={styles.topicName}>{topic.name}</Text>
                                        {topic.is_daily_offer && (
                                            <MaterialIcons name="star" size={16} color="#FF7F50" style={{ marginLeft: 8 }} />
                                        )}
                                    </View>
                                    <Text style={styles.topicId}>ID: {topic.id}</Text>
                                </View>

                                <View style={styles.controls}>
                                    <View style={styles.togglesRow}>
                                        <Pressable
                                            style={[styles.smallToggle, topic.is_daily_offer && { backgroundColor: '#FF7F50' }]}
                                            onPress={() => toggleDailyOffer(topic.id, topic.is_daily_offer)}
                                        >
                                            <MaterialIcons name="local-offer" size={16} color={topic.is_daily_offer ? "#14181f" : "rgba(255,255,255,0.4)"} />
                                        </Pressable>

                                        <Pressable
                                            style={[styles.smallToggle, topic.is_free && { backgroundColor: '#4ade80' }]}
                                            onPress={() => updateField(topic.id, 'is_free', !topic.is_free)}
                                        >
                                            <MaterialIcons name="money-off" size={16} color={topic.is_free ? "#14181f" : "rgba(255,255,255,0.4)"} />
                                        </Pressable>

                                        <Pressable
                                            style={[styles.smallToggle, topic.is_weekly_guest && { backgroundColor: '#1f96ad' }]}
                                            onPress={() => updateField(topic.id, 'is_weekly_guest', !topic.is_weekly_guest)}
                                        >
                                            <MaterialIcons name="event" size={16} color={topic.is_weekly_guest ? "#14181f" : "rgba(255,255,255,0.4)"} />
                                        </Pressable>

                                        <Pressable
                                            style={[styles.smallToggle, topic.is_limited_time && { backgroundColor: '#FFD700' }]}
                                            onPress={() => updateField(topic.id, 'is_limited_time', !topic.is_limited_time)}
                                        >
                                            <MaterialIcons name="timer" size={16} color={topic.is_limited_time ? "#14181f" : "rgba(255,255,255,0.4)"} />
                                        </Pressable>
                                    </View>

                                    <View style={styles.priceEdit}>
                                        <TextInput
                                            style={styles.priceInput}
                                            value={topic.price?.toString()}
                                            onChangeText={(val) => updateField(topic.id, 'price', parseInt(val) || 0)}
                                            keyboardType="numeric"
                                            textAlign="center"
                                        />
                                        <Text style={styles.currency}>CR</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <Pressable
                    style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#14181f" /> : <Text style={styles.saveBtnText}>حفظ كل التغييرات</Text>}
                </Pressable>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 16 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: 'white' },
    headerSubtitle: { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#FF7F50' },
    scrollContent: { padding: 24 },
    section: { marginBottom: 32 },
    sectionLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, textAlign: 'right' },
    list: { gap: 12 },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e252f', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#2a3441' },
    activeItem: { borderColor: '#FF7F50', backgroundColor: 'rgba(255, 127, 80, 0.05)' },
    topicInfo: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center' },
    topicName: { fontSize: 16, fontFamily: 'Cairo-Bold', color: 'white' },
    topicId: { fontSize: 10, fontFamily: 'Epilogue-Bold', color: 'rgba(255,255,255,0.2)', marginTop: 2 },
    controls: { flexDirection: 'column', alignItems: 'flex-end', gap: 12 },
    togglesRow: { flexDirection: 'row', gap: 6 },
    smallToggle: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    priceEdit: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#14181f', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2a3441' },
    priceInput: { color: '#1f96ad', fontSize: 14, fontFamily: 'Epilogue-Bold', width: 60, paddingVertical: 8 },
    currency: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Epilogue-Bold' },
    saveBtn: { backgroundColor: '#FF7F50', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    saveBtnText: { color: '#14181f', fontSize: 18, fontFamily: 'Cairo-Black' },
});
