import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const showAlert = (title: string, msg: string) => Platform.OS === 'web' ? window.alert(`${title}: ${msg}`) : Alert.alert(title, msg);

type WordCategory = { id: number; name: string; words: string[]; relative_pairs: [string, string][]; };

export default function PacksPage() {
    const [categories, setCategories] = useState<WordCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<WordCategory | null>(null);
    const [newWord, setNewWord] = useState('');
    const [newPairA, setNewPairA] = useState('');
    const [newPairB, setNewPairB] = useState('');
    const [newPackName, setNewPackName] = useState('');
    const [jsonInput, setJsonInput] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => { const { data, error } = await supabase.from('word_categories').select('*'); if (error) showAlert('خطأ', error.message); else setCategories(data || []); setLoading(false); };

    const handleAddWord = async () => {
        if (!newWord.trim() || !selectedCategory) return;
        const updatedWords = [...(selectedCategory.words || []), newWord.trim()];
        const { error } = await supabase.from('word_categories').update({ words: updatedWords }).eq('id', selectedCategory.id);
        if (error) showAlert('خطأ', error.message);
        else { setSelectedCategory({ ...selectedCategory, words: updatedWords }); setCategories(cats => cats.map(c => c.id === selectedCategory.id ? { ...c, words: updatedWords } : c)); setNewWord(''); }
    };

    const handleRemoveWord = async (wordToRemove: string) => {
        if (!selectedCategory) return;
        const updatedWords = selectedCategory.words.filter(w => w !== wordToRemove);
        const { error } = await supabase.from('word_categories').update({ words: updatedWords }).eq('id', selectedCategory.id);
        if (error) showAlert('خطأ', error.message);
        else { setSelectedCategory({ ...selectedCategory, words: updatedWords }); setCategories(cats => cats.map(c => c.id === selectedCategory.id ? { ...c, words: updatedWords } : c)); }
    };

    const handleAddPair = async () => {
        if (!newPairA.trim() || !newPairB.trim() || !selectedCategory) return;
        const updatedPairs = [...(selectedCategory.relative_pairs || []), [newPairA.trim(), newPairB.trim()] as [string, string]];
        const { error } = await supabase.from('word_categories').update({ relative_pairs: updatedPairs }).eq('id', selectedCategory.id);
        if (error) showAlert('خطأ', error.message);
        else { setSelectedCategory({ ...selectedCategory, relative_pairs: updatedPairs }); setCategories(cats => cats.map(c => c.id === selectedCategory.id ? { ...c, relative_pairs: updatedPairs } : c)); setNewPairA(''); setNewPairB(''); }
    };

    const handleRemovePair = async (pairToRemove: [string, string]) => {
        if (!selectedCategory) return;
        const updatedPairs = selectedCategory.relative_pairs.filter(p => !(p[0] === pairToRemove[0] && p[1] === pairToRemove[1]));
        const { error } = await supabase.from('word_categories').update({ relative_pairs: updatedPairs }).eq('id', selectedCategory.id);
        if (error) showAlert('خطأ', error.message);
        else { setSelectedCategory({ ...selectedCategory, relative_pairs: updatedPairs }); setCategories(cats => cats.map(c => c.id === selectedCategory.id ? { ...c, relative_pairs: updatedPairs } : c)); }
    };

    const handleCreatePack = async () => {
        if (!newPackName.trim()) return;
        const { data, error } = await supabase.from('word_categories').insert({ name: newPackName.trim(), words: [], relative_pairs: [] }).select().single();
        if (error) showAlert('خطأ', error.message);
        else { setCategories([...categories, data]); setNewPackName(''); }
    };

    const handleImportJSON = async () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (!parsed.wordPacks || !Array.isArray(parsed.wordPacks)) throw new Error('الصيغة غلط. المتوقع: { wordPacks: [...] }');

            let updatedCats = 0;
            let addedCats = 0;
            const globalWordsSet = new Set<string>();
            let totalPairs = 0;

            for (const pack of parsed.wordPacks) {
                const pairs = pack.relativePairs || [];
                const explicitWords = pack.words || [];
                const derivedFromPairs = pairs.flat();
                const allWords = Array.from(new Set([...explicitWords, ...derivedFromPairs]));

                allWords.forEach(w => globalWordsSet.add(w.trim()));

                const { data: existing } = await supabase
                    .from('word_categories')
                    .select('id, words, relative_pairs')
                    .eq('name', pack.category)
                    .maybeSingle();

                if (existing) {
                    const mergedWords = Array.from(new Set([
                        ...(existing.words || []),
                        ...allWords
                    ]));

                    const existingPairs = existing.relative_pairs || [];
                    const newPairs = pairs.filter((np: [string, string]) =>
                        !existingPairs.some((ep: [string, string]) =>
                            (ep[0] === np[0] && ep[1] === np[1]) || (ep[0] === np[1] && ep[1] === np[0])
                        )
                    );
                    const mergedPairs = [...existingPairs, ...newPairs];

                    const { error } = await supabase.from('word_categories').update({
                        words: mergedWords,
                        relative_pairs: mergedPairs
                    }).eq('id', existing.id);
                    if (error) throw error;
                    updatedCats++;
                } else {
                    const { error } = await supabase.from('word_categories').insert({
                        name: pack.category,
                        words: allWords,
                        relative_pairs: pairs,
                        price: 500,
                        is_free: false
                    });
                    if (error) throw error;
                    addedCats++;
                }
                totalPairs += pairs.length;
            }
            showAlert('نجاح الاستيراد', `✅ تم تحديث ${updatedCats} حزم\n🆕 تم إضافة ${addedCats} حزم جديدة\n📊 الكلمات الفريدة: ${globalWordsSet.size}\n🔗 الأزواج: ${totalPairs}`);
            setJsonInput('');
            fetchCategories();
        } catch (e: any) { showAlert('خطأ', e.message); }
    };

    const handleDeletePack = async (id: number) => {
        const { error } = await supabase.from('word_categories').delete().eq('id', id);
        if (error) showAlert('خطأ', error.message);
        else fetchCategories();
    };

    if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#1f96ad" /></View>;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Pressable onPress={() => selectedCategory ? setSelectedCategory(null) : router.push('/')} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={20} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>{selectedCategory ? selectedCategory.name : 'حزم الكلمات'}</Text>
            </View>

            {!selectedCategory ? (
                <>
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>إنشاء حزمة جديدة</Text>
                        <View style={styles.inputArea}>
                            <TextInput
                                style={styles.pillInput}
                                value={newPackName}
                                onChangeText={setNewPackName}
                                placeholder="اسم الحزمة..."
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                textAlign="right"
                            />
                            <Pressable style={styles.actionButtonPill} onPress={handleCreatePack}>
                                <MaterialIcons name="add" size={24} color="white" />
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>اختر حزمة للتعديل</Text>
                        <View style={styles.grid}>
                            {categories.map(cat => (
                                <View key={cat.id} style={styles.bentoCard}>
                                    <Pressable style={styles.bentoCardContent} onPress={() => setSelectedCategory(cat)}>
                                        <MaterialCommunityIcons name="folder-zip" size={24} color="#1f96ad" />
                                        <Text style={styles.bentoCardTitle}>{cat.name}</Text>
                                        <Text style={styles.bentoCardMeta}>{cat.words?.length || 0} كلمة • {cat.relative_pairs?.length || 0} أزواج</Text>
                                    </Pressable>
                                    <Pressable onPress={() => handleDeletePack(cat.id)} style={styles.cardDeleteIcon}>
                                        <MaterialIcons name="delete-outline" size={20} color="#FF7F50" />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>استيراد من JSON</Text>
                        <TextInput
                            style={styles.jsonInput}
                            multiline
                            numberOfLines={6}
                            value={jsonInput}
                            onChangeText={setJsonInput}
                            placeholder={'{\n  "wordPacks": [\n    { "category": "Animals", "words": ["Dog", "Cat"], "relativePairs": [["Dog", "Wolf"]] }\n  ]\n}'}
                            placeholderTextColor="rgba(31, 150, 173, 0.3)"
                            textAlign="left"
                        />
                        <Pressable style={styles.primaryActionButton} onPress={handleImportJSON}>
                            <Text style={styles.actionButtonText}>حقن البيانات</Text>
                            <MaterialIcons name="file-download" size={20} color="white" />
                        </Pressable>
                    </View>
                </>
            ) : (
                <>
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>الكلمات ({selectedCategory.words?.length || 0})</Text>
                        <View style={styles.wordGrid}>
                            {selectedCategory.words?.map((word, i) => (
                                <View key={i} style={styles.wordChip}>
                                    <Text style={styles.wordChipText}>{word}</Text>
                                    <Pressable onPress={() => handleRemoveWord(word)} style={styles.chipRemoveBtn}>
                                        <MaterialIcons name="close" size={14} color="white" />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                        <View style={styles.inputArea}>
                            <TextInput
                                style={styles.pillInput}
                                value={newWord}
                                onChangeText={setNewWord}
                                placeholder="كلمة جديدة..."
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                textAlign="right"
                            />
                            <Pressable style={styles.actionButtonPill} onPress={handleAddWord}>
                                <MaterialIcons name="add" size={24} color="white" />
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>الأزواج المتشابهة ({selectedCategory.relative_pairs?.length || 0})</Text>
                        <View style={styles.pairList}>
                            {selectedCategory.relative_pairs?.map((pair, i) => (
                                <View key={i} style={styles.pairRow}>
                                    <View style={styles.pairContent}>
                                        <Text style={styles.pairText}>{pair[0]}</Text>
                                        <MaterialIcons name="swap-horiz" size={16} color="#1f96ad" />
                                        <Text style={styles.pairText}>{pair[1]}</Text>
                                    </View>
                                    <Pressable onPress={() => handleRemovePair(pair)} style={styles.pairDeleteBtn}>
                                        <MaterialIcons name="delete-outline" size={20} color="#FF7F50" />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                        <View style={styles.pairInputRow}>
                            <TextInput style={styles.halfInput} value={newPairA} onChangeText={setNewPairA} placeholder="كلمة أ" placeholderTextColor="rgba(255,255,255,0.2)" textAlign="right" />
                            <TextInput style={styles.halfInput} value={newPairB} onChangeText={setNewPairB} placeholder="كلمة ب" placeholderTextColor="rgba(255,255,255,0.2)" textAlign="right" />
                            <Pressable style={styles.actionButtonPill} onPress={handleAddPair}>
                                <MaterialIcons name="add" size={24} color="white" />
                            </Pressable>
                        </View>
                    </View>
                </>
            )}
            <View style={{ height: 40 }} />
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
    inputArea: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    pillInput: { flex: 1, backgroundColor: '#1e252f', borderRadius: 99, paddingHorizontal: 20, paddingVertical: 14, color: 'white', fontFamily: 'Cairo-Bold', borderWidth: 2, borderColor: '#2a3441', textAlign: 'right' },
    actionButtonPill: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1f96ad', alignItems: 'center', justifyContent: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    bentoCard: { width: '47%', aspectRatio: 1, backgroundColor: '#1e252f', borderRadius: 20, padding: 16, borderWidth: 2, borderColor: '#2a3441', shadowColor: '#0a0d12', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
    bentoCardContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    bentoCardTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: 'white', marginTop: 12, textAlign: 'center' },
    bentoCardMeta: { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: 'center', fontFamily: 'Cairo-Bold' },
    cardDeleteIcon: { position: 'absolute', top: 12, right: 12 },
    jsonInput: { backgroundColor: '#1e252f', borderRadius: 16, padding: 16, color: '#1f96ad', fontSize: 12, fontFamily: 'Cairo-Bold', borderWidth: 1, borderColor: '#2a3441', minHeight: 120, marginBottom: 16 },
    primaryActionButton: { backgroundColor: '#FF7F50', borderRadius: 99, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#0a0d12', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    actionButtonText: { fontSize: 18, fontFamily: 'Cairo-Black', color: 'white' },
    wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    wordChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f96ad20', borderRadius: 8, paddingLeft: 12, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: '#1f96ad40' },
    wordChipText: { fontSize: 14, color: 'white', fontFamily: 'Cairo-Bold' },
    chipRemoveBtn: { marginLeft: 8, padding: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
    pairList: { gap: 12, marginBottom: 16 },
    pairRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e252f', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a3441' },
    pairContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    pairText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: 'white' },
    pairDeleteBtn: { padding: 4 },
    pairInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    halfInput: { flex: 1, backgroundColor: '#1e252f', borderRadius: 12, padding: 12, color: 'white', fontFamily: 'Cairo-Bold', borderWidth: 1, borderColor: '#2a3441', textAlign: 'right' },
});
