import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="project/[projectId]" options={{ title: 'Proje' }} />
        <Stack.Screen name="page/[projectId]/[pageId]" options={{ title: 'Sayfa' }} />
        <Stack.Screen name="invite/[token]" options={{ title: 'Davet' }} />
      </Stack>
    </>
  );
}
