import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();

    async function handleEmailAuth() {
        if (!email || !password) return;
        setLoading(true);

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        // Assuming "Confirm email" is disabled in Supabase Dashboard
                        // This will allow the user to sign up and be logged in immediately
                    }
                });
                if (error) throw error;

                // If the user is logged in immediately (no confirmation), we can redirect
                if (data.session) {
                    router.replace('/');
                } else {
                    Alert.alert('نجاح', 'تم إنشاء الحساب! سجل دخولك الآن.');
                    setIsSignUp(false);
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                router.replace('/');
            }
        } catch (error: any) {
            Alert.alert('خطأ', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleSignIn() {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            Alert.alert('خطأ', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.iconBox}>
                        <MaterialCommunityIcons name="shield-key" size={40} color="#1f96ad" />
                    </View>
                    <Text style={styles.title}>{isSignUp ? 'عميل جديد' : 'تسجيل الدخول'}</Text>
                    <Text style={styles.subtitle}>
                        {isSignUp ? 'انضم إلى نخبة المحتالين' : 'مرحباً بك مجدداً في المقر'}
                    </Text>
                </View>

                <View style={styles.form}>
                    {/* Google Auth - Primary */}
                    <Pressable
                        style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                    >
                        <MaterialCommunityIcons name="google" size={24} color="white" />
                        <Text style={styles.googleButtonText}>الدخول عبر جوجل</Text>
                    </Pressable>

                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>أو عبر البريد</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Email/Password Auth */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>البريد الإلكتروني</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialIcons name="email" size={20} color="rgba(255,255,255,0.3)" />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="example@gmail.com"
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>كلمة المرور</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialIcons name="lock" size={20} color="rgba(255,255,255,0.3)" />
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="********"
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <Pressable
                        style={({ pressed }) => [styles.submitButton, pressed && styles.buttonPressed]}
                        onPress={handleEmailAuth}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#14181f" />
                        ) : (
                            <Text style={styles.submitButtonText}>{isSignUp ? 'إنشاء الحساب' : 'اتصال آمن'}</Text>
                        )}
                    </Pressable>

                    <Pressable style={styles.toggleButton} onPress={() => setIsSignUp(!isSignUp)}>
                        <Text style={styles.toggleText}>
                            {isSignUp ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ سجل الآن'}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>

            <View style={styles.decorationCircle} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#14181f' },
    scrollContent: { padding: 32, flexGrow: 1, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 40 },
    iconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(31, 150, 173, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(31, 150, 173, 0.2)' },
    title: { fontSize: 32, fontFamily: 'Cairo-Black', color: 'white', marginBottom: 8 },
    subtitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
    form: { gap: 20 },
    googleButton: { backgroundColor: '#4285F4', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 },
    googleButtonText: { fontSize: 16, fontFamily: 'Cairo-Black', color: 'white' },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 8 },
    dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    dividerText: { color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo-Bold', fontSize: 12 },
    inputContainer: { gap: 8 },
    label: { fontSize: 14, fontFamily: 'Cairo-Bold', color: '#1f96ad', textAlign: 'right', marginBottom: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e252f', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 2, borderColor: '#2a3441' },
    input: { flex: 1, color: 'white', fontFamily: 'Cairo-Bold', fontSize: 16, textAlign: 'right', paddingRight: 12 },
    submitButton: { backgroundColor: '#FF7F50', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    buttonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    submitButtonText: { fontSize: 18, fontFamily: 'Cairo-Black', color: '#14181f' },
    toggleButton: { padding: 12, alignItems: 'center' },
    toggleText: { color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo-Bold', fontSize: 14 },
    decorationCircle: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(31, 150, 173, 0.05)', zIndex: -1 },
});
