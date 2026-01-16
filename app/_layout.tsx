import { Stack } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useFonts, Epilogue_400Regular, Epilogue_700Bold, Epilogue_900Black_Italic } from '@expo-google-fonts/epilogue';
import { Cairo_400Regular, Cairo_700Bold, Cairo_900Black } from '@expo-google-fonts/cairo';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        'Epilogue': Epilogue_400Regular,
        'Epilogue-Bold': Epilogue_700Bold,
        'Epilogue-BlackItalic': Epilogue_900Black_Italic,
        'Cairo': Cairo_400Regular,
        'Cairo-Bold': Cairo_700Bold,
        'Cairo-Black': Cairo_900Black,
        ...MaterialIcons.font,
        ...MaterialCommunityIcons.font,
    });

    if (!fontsLoaded) {
        return (
            <View style={[styles.wrapper, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#1f96ad" />
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: {
                            backgroundColor: '#14181f',
                        },
                    }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#0a0d12',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        width: '100%',
        maxWidth: 430,
        backgroundColor: '#14181f',
    },
});
