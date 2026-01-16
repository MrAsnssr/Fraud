import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function CharacterEditor() {
    const [name, setName] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    async function pickImage() {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    }

    async function saveCharacter() {
        if (!name || !image) {
            Alert.alert('خطأ', 'يرجى إدخال الاسم واختيار الصورة');
            return;
        }

        setSaving(true);
        try {
            // In a real implementation, we would upload the image to Supabase Storage first
            // For this demo, we'll simulate the save to the database
            const { error } = await supabase.from('characters').insert({
                name,
                image_url: image,
                default_scale: scale,
                default_pos_x: posX,
                default_pos_y: posY,
            });

            if (error) throw error;
            Alert.alert('نجاح', 'تم حفظ الشخصية بنجاح!');
            router.back();
        } catch (error: any) {
            Alert.alert('خطأ', error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>محرر الشخصيات</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Preview Area */}
                <View style={styles.previewContainer}>
                    <View style={styles.previewBox}>
                        {image ? (
                            <Image
                                source={{ uri: image }}
                                style={[
                                    styles.previewImage,
                                    { transform: [{ scale }, { translateX: posX }, { translateY: posY }] }
                                ]}
                            />
                        ) : (
                            <MaterialCommunityIcons name="account-question" size={64} color="rgba(255,255,255,0.1)" />
                        )}
                        <View style={styles.previewOverlay} pointerEvents="none" />
                    </View>
                    <Text style={styles.previewLabel}>معاينة الشخصية في اللعبة</Text>
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>اسم الشخصية</Text>
                        <TextInput
                            style={styles.textInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="مثال: العميل الصامت"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            textAlign="right"
                        />
                    </View>

                    <Pressable style={styles.imagePicker} onPress={pickImage}>
                        <MaterialIcons name="add-a-photo" size={24} color="#1f96ad" />
                        <Text style={styles.imagePickerText}>{image ? 'تغيير الصورة' : 'اختيار صورة الشخصية'}</Text>
                    </Pressable>

                    {image && (
                        <View style={styles.adjustmentGroup}>
                            <Text style={styles.label}>الضبط والموضع</Text>

                            <View style={styles.controlRow}>
                                <Pressable style={styles.controlBtn} onPress={() => setScale(s => s + 0.1)}><MaterialIcons name="add" size={20} color="white" /></Pressable>
                                <Text style={styles.controlValue}>الحجم: {scale.toFixed(1)}</Text>
                                <Pressable style={styles.controlBtn} onPress={() => setScale(s => Math.max(0.1, s - 0.1))}><MaterialIcons name="remove" size={20} color="white" /></Pressable>
                            </View>

                            <View style={styles.controlRow}>
                                <Pressable style={styles.controlBtn} onPress={() => setPosX(x => x + 5)}><MaterialIcons name="chevron-right" size={20} color="white" /></Pressable>
                                <Text style={styles.controlValue}>الأحداثي X: {posX}</Text>
                                <Pressable style={styles.controlBtn} onPress={() => setPosX(x => x - 5)}><MaterialIcons name="chevron-left" size={20} color="white" /></Pressable>
                            </View>

                            <View style={styles.controlRow}>
                                <Pressable style={styles.controlBtn} onPress={() => setPosY(y => y + 5)}><MaterialIcons name="expand-more" size={20} color="white" /></Pressable>
                                <Text style={styles.controlValue}>الأحداثي Y: {posY}</Text>
                                <Pressable style={styles.controlBtn} onPress={() => setPosY(y => y - 5)}><MaterialIcons name="expand-less" size={20} color="white" /></Pressable>
                            </View>
                        </View>
                    )}

                    <Pressable
                        style={[styles.saveButton, (saving || (!name || !image)) && styles.disabledBtn]}
                        onPress={saveCharacter}
                        disabled={saving || !name || !image}
                    >
                        <Text style={styles.saveButtonText}>حفظ الشخصية</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, gap: 16 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo-Black', color: 'white' },
    scrollContent: { padding: 24 },
    previewContainer: { alignItems: 'center', marginBottom: 32 },
    previewBox: { width: 200, height: 200, backgroundColor: '#000', borderRadius: 24, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#2a3441' },
    previewImage: { width: '100%', height: '100%' },
    previewOverlay: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(31, 150, 173, 0.2)', borderStyle: 'dashed' },
    previewLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.4)', marginTop: 12 },
    controls: { gap: 24 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontFamily: 'Cairo-Bold', color: '#1f96ad', textAlign: 'right' },
    textInput: { backgroundColor: '#1e252f', borderRadius: 16, paddingHorizontal: 16, height: 56, color: 'white', fontFamily: 'Cairo-Bold', borderWidth: 2, borderColor: '#2a3441' },
    imagePicker: { height: 80, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(31, 150, 173, 0.3)', borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'rgba(31, 150, 173, 0.05)' },
    imagePickerText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: '#1f96ad' },
    adjustmentGroup: { gap: 12 },
    controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
    controlBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#2a3441', alignItems: 'center', justifyContent: 'center' },
    controlValue: { color: 'white', fontFamily: 'Cairo-Bold', width: 120, textAlign: 'center' },
    saveButton: { backgroundColor: '#FF7F50', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    saveButtonText: { fontSize: 18, fontFamily: 'Cairo-Black', color: '#14181f' },
    disabledBtn: { opacity: 0.5 },
});
