import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SermonStackParamList } from '../navigation/types';
import * as api from '../api';

type Props = NativeStackScreenProps<SermonStackParamList, 'PdfViewer'>;

export default function PdfViewerScreen({ route, navigation }: Props) {
  const { fileName, page } = route.params;
  const [text, setText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(page);
  const [loading, setLoading] = useState(true);

  const load = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.getSermonPage(fileName, p);
      setText(res.data.text);
      setPageCount(res.data.pageCount);
      setCurrentPage(p);
      navigation.setOptions({ title: `${res.data.title} — p.${p}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color="#1976d2" />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.text}>{text || 'No text available for this page.'}</Text>
        </ScrollView>
      )}

      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.navBtn, currentPage <= 1 && styles.navBtnDisabled]}
          onPress={() => load(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
        >
          <Text style={styles.navBtnText}>‹ Prev</Text>
        </TouchableOpacity>
        <Text style={styles.pageIndicator}>Page {currentPage} of {pageCount}</Text>
        <TouchableOpacity
          style={[styles.navBtn, currentPage >= pageCount && styles.navBtnDisabled]}
          onPress={() => load(currentPage + 1)}
          disabled={currentPage >= pageCount || loading}
        >
          <Text style={styles.navBtnText}>Next ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20 },
  text: { fontSize: 15, lineHeight: 24, color: '#212121' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#fafafa' },
  navBtn: { backgroundColor: '#1976d2', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 18 },
  navBtnDisabled: { backgroundColor: '#ccc' },
  navBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  pageIndicator: { fontSize: 13, color: '#666' },
});
