import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SermonStackParamList } from '../navigation/types';
import * as api from '../api';

type Props = NativeStackScreenProps<SermonStackParamList, 'PdfViewer'>;

function HighlightedText({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight || highlight.length < 10) {
    return <Text style={styles.text}>{text || 'No text available for this page.'}</Text>;
  }

  // Find the first ~60-char window of the snippet that appears in the page text
  const needle = highlight.slice(0, 80).replace(/…$/, '').trim();
  const idx = text.indexOf(needle);

  if (idx === -1) {
    return <Text style={styles.text}>{text || 'No text available for this page.'}</Text>;
  }

  const before = text.slice(0, idx);
  const match  = text.slice(idx, idx + needle.length);
  const after  = text.slice(idx + needle.length);

  return (
    <Text style={styles.text}>
      {before}
      <Text style={styles.highlight}>{match}</Text>
      {after}
    </Text>
  );
}

export default function PdfViewerScreen({ route, navigation }: Props) {
  const { fileName, page, highlight } = route.params;
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
          <HighlightedText text={text} highlight={highlight} />
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
  container: { flex: 1, backgroundColor: '#F7F6F2' },
  center: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 22, paddingBottom: 32 },
  text: { fontSize: 15, lineHeight: 26, color: '#1A1A2E', fontFamily: 'Georgia' },
  highlight: { backgroundColor: '#FFE066', color: '#1A1A2E', fontSize: 15, lineHeight: 26 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E8E6E0', backgroundColor: '#FFFFFF' },
  navBtn: { backgroundColor: '#2C52A0', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20 },
  navBtnDisabled: { backgroundColor: '#C0BFB8' },
  navBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  pageIndicator: { fontSize: 13, color: '#A0A0B4', fontWeight: '500' },
});
