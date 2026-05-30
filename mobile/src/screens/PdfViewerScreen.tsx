import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SermonStackParamList } from '../navigation/types';
import { API_BASE_URL } from '../api/config';
import { useState } from 'react';

type Props = NativeStackScreenProps<SermonStackParamList, 'PdfViewer'>;

export default function PdfViewerScreen({ route }: Props) {
  const { fileName, page } = route.params;
  const [loading, setLoading] = useState(true);

  // #page=N is honoured by browser PDF plugins (Chrome, Safari, Firefox)
  const uri = `${API_BASE_URL}/api/sermon-docs/file/${encodeURIComponent(fileName)}#page=${page}`;

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      )}
      <WebView
        source={{ uri }}
        style={styles.webview}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', zIndex: 1 },
});
