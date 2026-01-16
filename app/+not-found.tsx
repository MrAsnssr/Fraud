import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View style={styles.container}>
                <MaterialIcons name="error-outline" size={80} color="#FF7F50" />
                <Text style={styles.title}>عذراً! الصفحة غير موجودة</Text>
                <Text style={styles.subtitle}>يبدو أنك ضعت في دهاليز العملية...</Text>

                <Link href="/" asChild>
                    <Pressable style={styles.link}>
                        <MaterialIcons name="home" size={24} color="white" />
                        <Text style={styles.linkText}>العودة للرئيسية</Text>
                    </Pressable>
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#14181f',
    },
    title: {
        fontSize: 28,
        fontFamily: 'Cairo-Black',
        color: 'white',
        marginTop: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Cairo-Bold',
        color: 'rgba(255,255,255,0.4)',
        marginVertical: 15,
        textAlign: 'center',
    },
    link: {
        marginTop: 30,
        paddingVertical: 15,
        paddingHorizontal: 30,
        backgroundColor: '#1f96ad',
        borderRadius: 99,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#0a0d12',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    linkText: {
        fontSize: 18,
        fontFamily: 'Cairo-Black',
        color: 'white',
    },
});
