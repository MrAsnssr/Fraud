import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, ImageBackground, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const TOTAL_IMAGES = 2; // Hero image and Vault card background

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        setIsAdmin(session.user.email === 'asnssrr@gmail.com');
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      setIsAdmin(session.user.email === 'asnssrr@gmail.com');
      fetchProfile(session.user.id);
      fetchActiveRoom();
    } else {
      setUser(null);
      setIsAdmin(false);
    }
  }

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it with 150 credits
      const nickname = user?.email?.split('@')[0] || 'المحقق';
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          credits: 150,
          nickname,
          last_reward_claim: null
        })
        .select()
        .single();

      if (newProfile) setProfile(newProfile);
    } else if (data) {
      setProfile(data);
    }
  }

  const isRewardAvailable = () => {
    if (!profile) return false;
    if (!profile.last_reward_claim) return true;

    const lastClaim = new Date(profile.last_reward_claim);
    const now = new Date();
    const diffHours = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
    return diffHours >= 24;
  };

  async function handleClaimReward() {
    if (!user || !profile || !isRewardAvailable()) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        credits: (profile.credits || 0) + 50,
        last_reward_claim: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      Alert.alert('خطأ', 'فشل في استلام المكافأة. تأكد من تحديث قاعدة البيانات.');
      return;
    }

    Alert.alert('نجاح', 'تم استلام مكافأة اليوم: 50 CR');
    fetchProfile(user.id);
  }

  async function fetchActiveRoom() {
    const { data, error } = await supabase
      .from('rooms')
      .select('code, word_categories(name)')
      .neq('status', 'FINISHED')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) setActiveRoom(data[0]);
  }

  const handleVaultPress = () => {
    if (!user) {
      router.push('/auth');
    } else if (isAdmin) {
      router.push('/admin/dashboard');
    } else {
      router.push('/vault');
    }
  };

  const handleImageLoad = () => {
    setLoadedCount(prev => {
      const newCount = prev + 1;
      if (newCount >= TOTAL_IMAGES) {
        setImagesLoaded(true);
      }
      return newCount;
    });
  };

  return (
    <View style={styles.outerContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <Image
            source={require('../assets/images/hero.png')}
            style={styles.heroImage}
            resizeMode="contain"
            onLoad={handleImageLoad}
          />

          <View style={styles.heroOverlay}>
            {/* Top Status Bar with Real Data */}
            <View style={styles.statusBar}>
              <View style={styles.statusPill}>
                <MaterialIcons name="toll" size={14} color="#1f96ad" />
                <Text style={styles.statusText}>{profile?.credits?.toLocaleString() || '0'}</Text>
              </View>
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.titleMain}>المحتال</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          {/* Primary CTA: Play */}
          <Pressable style={styles.playCard} onPress={() => router.push('/lobby/create')}>
            <View>
              <Text style={styles.playTitle}>ابدأ العملية</Text>
              <Text style={styles.playSubtitle}>
                {activeRoom ? `Active: ${activeRoom.code}` : 'No active operations'}
              </Text>
            </View>
            <View style={styles.playIconContainer}>
              <MaterialIcons name="play-arrow" size={30} color="#14181f" />
            </View>
          </Pressable>

          <View style={styles.row}>
            <Pressable style={styles.vaultCardContainer} onPress={handleVaultPress}>
              <ImageBackground
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnXToVoU_Ps7X79-9Z6c5ZGJFdYo4VSiJGF6GzBKpa-AldLNOP0zS2F44Ks_tQH-PYCnaJw70vCZ8rCj5Wm0_02FZwsTHNaELdHVd58AyacwfqB9KEZ5jnfCsA4y2XYR065TDzxTKIM6It7zJL8IMvAb-Ebyu0thcmgQ0cBLsW5FY-NMDLOI-zvh3XgR_fAX8lZrySRgB_4bqDL9MC5ZsdfYxH8kZBH8EpKvlmRoWgCsCBhofdjwNSj1n821HB8Oc8nveOeViHHD8' }}
                style={styles.vaultCard}
                imageStyle={{ borderRadius: 16 }}
                onLoad={handleImageLoad}
              >
                <View style={[styles.vaultOverlay, isAdmin && { backgroundColor: 'rgba(255, 127, 80, 0.85)' }]}>
                  <MaterialIcons name={isAdmin ? "settings" : "lock"} size={28} color="#14181f" style={styles.selfEnd} />
                  <Text style={styles.vaultTitle}>{isAdmin ? 'الإدارة' : 'الخزنة'}</Text>
                </View>
              </ImageBackground>
            </Pressable>

            <Pressable style={styles.crewCard} onPress={() => router.push('/lobby/join')}>
              <MaterialIcons name="groups" size={28} color="#1f96ad" style={styles.selfEnd} />
              <Text style={styles.crewTitle}>انضم للشلة</Text>
            </Pressable>
          </View>

          {/* Daily Contract - Reward Claim */}
          <Pressable
            style={[styles.contractCard, isRewardAvailable() && styles.availableContract]}
            onPress={handleClaimReward}
            disabled={!isRewardAvailable()}
          >
            <View style={[styles.contractIconBox, isRewardAvailable() && { backgroundColor: 'rgba(255, 127, 80, 0.2)', borderColor: 'rgba(255,127,80,0.3)' }]}>
              <MaterialIcons
                name={isRewardAvailable() ? "redeem" : "assignment-turned-in"}
                size={24}
                color={isRewardAvailable() ? "#FF7F50" : "#1f96ad"}
              />
            </View>
            <View style={styles.contractInfo}>
              <Text style={[styles.contractLabel, isRewardAvailable() && { color: '#FF7F50' }]}>
                {isRewardAvailable() ? 'مكافأة متاحة!' : 'مهمة اليوم'}
              </Text>
              <Text style={styles.contractName}>
                {isRewardAvailable() ? 'اضغط لاستلام 50 CR' : (activeRoom?.word_categories?.name || 'Search for Intel')}
              </Text>
            </View>
            <View style={styles.rewardBox}>
              <Text style={styles.rewardLabel}>{isRewardAvailable() ? 'GIFT' : 'WINS'}</Text>
              <Text style={[styles.rewardValue, isRewardAvailable() && { color: '#FF7F50' }]}>
                {isRewardAvailable() ? '+50' : (profile?.wins || 0)}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <Pressable style={styles.navItem} onPress={() => router.push('/store')}><MaterialIcons name="storefront" size={24} color="#9ca3af" /></Pressable>
          <Pressable style={[styles.navItem, styles.navItemActive]} onPress={() => router.push('/')}><MaterialIcons name="home" size={24} color="#1f96ad" /></Pressable>
          <Pressable style={styles.navItem} onPress={() => router.push('/leaderboard')}><MaterialIcons name="leaderboard" size={24} color="#9ca3af" /></Pressable>
          <Pressable style={styles.navItem} onPress={() => user ? router.push('/settings') : router.push('/auth')}><MaterialIcons name={user ? "settings" : "login"} size={24} color="#9ca3af" /></Pressable>
        </View>
      </View>

      {!imagesLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1f96ad" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#14181f' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  heroContainer: { width: '100%', aspectRatio: 1.2, backgroundColor: '#14181f', position: 'relative', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 24, paddingTop: 10, justifyContent: 'space-between' },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 8 },
  statusText: { color: 'white', fontSize: 12, fontWeight: '700', fontFamily: 'Epilogue-Bold' },
  titleContainer: { zIndex: 20, marginBottom: 25, alignItems: 'flex-start', paddingVertical: 10 },
  titleMain: {
    fontSize: 80, fontFamily: 'Cairo-Black', color: 'white', letterSpacing: -2, lineHeight: 100, textAlign: 'left',
    ...Platform.select({
      web: { textShadow: '5px 5px 0px #1f96ad' },
      default: { textShadowColor: '#1f96ad', textShadowOffset: { width: 5, height: 5 }, textShadowRadius: 0 }
    })
  },
  grid: { padding: 24, gap: 16, marginTop: 0, zIndex: 30 },
  playCard: {
    backgroundColor: '#FF7F50', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: '#2a3441',
    ...Platform.select({
      web: { boxShadow: '4px 4px 0px #0a0d12' },
      default: { shadowColor: '#0a0d12', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }
    })
  },
  playTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: '#14181f', textAlign: 'right' },
  playSubtitle: { fontSize: 10, fontWeight: '700', color: 'rgba(20,24,31,0.6)', letterSpacing: 1, marginTop: 2, fontFamily: 'Epilogue-Bold', textAlign: 'right' },
  playIconContainer: { backgroundColor: '#14181f', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 16 },
  vaultCardContainer: { flex: 1, aspectRatio: 1 },
  vaultCard: {
    flex: 1, width: '100%', height: '100%', overflow: 'hidden', borderWidth: 2, borderColor: '#2a3441',
    ...Platform.select({
      web: { boxShadow: '4px 4px 0px #0a0d12' },
      default: { shadowColor: '#0a0d12', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }
    })
  },
  vaultOverlay: { flex: 1, backgroundColor: 'rgba(31, 150, 173, 0.85)', padding: 16, justifyContent: 'space-between' },
  vaultTitle: { color: '#14181f', fontSize: 18, fontFamily: 'Cairo-Black', lineHeight: 24, textAlign: 'right' },
  crewCard: {
    flex: 1, aspectRatio: 1, backgroundColor: '#1e252f', borderRadius: 16, padding: 16, justifyContent: 'space-between', borderWidth: 2, borderColor: '#2a3441',
    ...Platform.select({
      web: { boxShadow: '4px 4px 0px #0a0d12' },
      default: { shadowColor: '#0a0d12', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }
    })
  },
  crewTitle: { color: 'white', fontSize: 18, fontFamily: 'Cairo-Black', lineHeight: 24, textAlign: 'right' },
  selfEnd: { alignSelf: 'flex-end' },
  contractCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  contractIconBox: { width: 48, height: 48, borderRadius: 8, backgroundColor: 'rgba(31, 150, 173, 0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(31,150,173,0.3)' },
  contractInfo: { flex: 1 },
  contractLabel: { fontSize: 10, color: '#1f96ad', fontWeight: '700', letterSpacing: 1, marginBottom: 2, fontFamily: 'Cairo-Bold', textAlign: 'right' },
  contractName: { fontSize: 14, color: 'white', fontWeight: '700', fontFamily: 'Epilogue-Bold' },
  availableContract: { borderColor: 'rgba(255, 127, 80, 0.3)', backgroundColor: 'rgba(255, 127, 80, 0.05)' },
  rewardBox: { alignItems: 'flex-end' },
  rewardLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  rewardValue: { fontSize: 12, color: '#FF7F50', fontFamily: 'Epilogue-BlackItalic' },
  bottomNavContainer: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  bottomNav: { width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 99, padding: 8, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: 'black', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  navItem: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  navItemActive: { backgroundColor: 'rgba(31, 150, 173, 0.2)', borderWidth: 1, borderColor: 'rgba(31, 150, 173, 0.5)' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#14181f',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  }
});
