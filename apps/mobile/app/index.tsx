import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID', // Firebase console > Authentication > Google > Web client ID
});

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    const unsub = auth().onAuthStateChanged((user) => {
      if (user) router.replace('/(tabs)');
    });
    return unsub;
  }, []);

  async function signInWithGoogle() {
    await GoogleSignin.hasPlayServices();
    const { idToken } = await GoogleSignin.signIn();
    const credential = auth.GoogleAuthProvider.credential(idToken);
    await auth().signInWithCredential(credential);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>PNOT</Text>
      <Text style={styles.subtitle}>Proje not defteri</Text>
      <TouchableOpacity style={styles.button} onPress={signInWithGoogle}>
        <Text style={styles.buttonText}>Google ile Giriş Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 48, fontWeight: 'bold', color: '#6366f1', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#9ca3af', marginBottom: 48 },
  button: { backgroundColor: '#6366f1', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
