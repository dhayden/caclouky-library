import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GokTocYear, GokSection } from '../types';
import * as api from '../api';
import { useDisplay } from '../context/DisplayContext';

type NavLevel = 'collection' | 'year' | 'dates';

// ── Go-To Chooser (3-level: collection → year → dates) ───────────────────────

interface GoToChooserProps {
  visible: boolean;
  years: GokTocYear[];
  onSelect: (date: string) => void;
  onClose: () => void;
}

function GoToChooser({ visible, years, onSelect, onClose }: GoToChooserProps) {
  const [level, setLevel] = useState<NavLevel>('collection');
  const [selectedYear, setSelectedYear] = useState<GokTocYear | null>(null);

  useEffect(() => {
    if (visible) { setLevel('collection'); setSelectedYear(null); }
  }, [visible]);

  const goBack = () => {
    if (level === 'dates')      setLevel('year');
    else if (level === 'year')  setLevel('collection');
    else                        onClose();
  };

  const header =
    level === 'collection' ? 'Go To…' :
    level === 'year'       ? 'Gospel of the Kingdom Papers' :
                             selectedYear?.year ?? '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={navStyles.container}>

        {/* Header */}
        <View style={navStyles.header}>
          <TouchableOpacity onPress={goBack} style={navStyles.backBtn}>
            <Text style={navStyles.backText}>{level === 'collection' ? '✕' : '‹'}</Text>
          </TouchableOpacity>
          <Text style={navStyles.headerTitle} numberOfLines={1}>{header}</Text>
          {level !== 'collection' && (
            <TouchableOpacity onPress={onClose}><Text style={navStyles.closeText}>✕</Text></TouchableOpacity>
          )}
        </View>

        <ScrollView style={navStyles.list} showsVerticalScrollIndicator={false}>

          {/* Level 1: collection */}
          {level === 'collection' && (
            <TouchableOpacity style={navStyles.row} onPress={() => setLevel('year')}>
              <Ionicons name="book-outline" size={18} color="#7B9FE0" style={navStyles.rowIcon} />
              <Text style={navStyles.rowText}>Gospel of the Kingdom Papers</Text>
              <Text style={navStyles.rowChevron}>›</Text>
            </TouchableOpacity>
          )}

          {/* Level 2: years */}
          {level === 'year' && years.map(y => (
            <TouchableOpacity key={y.year} style={navStyles.row} onPress={() => { setSelectedYear(y); setLevel('dates'); }}>
              <Text style={navStyles.yearLabel}>{y.year}</Text>
              <Text style={navStyles.rowMeta}>{y.sermons.length} sermons</Text>
              <Text style={navStyles.rowChevron}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Level 3: dates */}
          {level === 'dates' && selectedYear?.sermons.map(date => (
            <TouchableOpacity key={date} style={navStyles.row} onPress={() => { onSelect(date); onClose(); }}>
              <Text style={navStyles.dateLabel}>{date}</Text>
            </TouchableOpacity>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const navStyles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#12122a' },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a2a4a', paddingHorizontal: 16, paddingVertical: 14, paddingTop: Platform.OS === 'ios' ? 56 : 20, gap: 10 },
  backBtn:     { width: 32 },
  backText:    { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff' },
  closeText:   { fontSize: 20, color: '#aaa', paddingHorizontal: 4 },
  list:        { flex: 1 },
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2a2a4a' },
  rowIcon:     { marginRight: 12 },
  rowText:     { flex: 1, fontSize: 16, color: '#eef', fontWeight: '500' },
  rowMeta:     { fontSize: 13, color: '#666', marginRight: 8 },
  rowChevron:  { fontSize: 18, color: '#555' },
  yearLabel:   { flex: 1, fontSize: 20, fontWeight: '700', color: '#7B9FE0' },
  dateLabel:   { flex: 1, fontSize: 15, color: '#eef' },
});

// ── Content renderer ──────────────────────────────────────────────────────────

function SectionBlock({ section, fontSize }: { section: GokSection; fontSize: number }) {
  const { theme } = useDisplay();
  const c = theme.colors;

  const lines = section.text.split('\n');

  return (
    <View style={{ marginBottom: 20 }}>
      {section.sectionTitle ? (
        <Text style={[styles.sectionTitle, { color: c.primary, fontSize: fontSize + 2 }]}>
          {section.sectionTitle}
        </Text>
      ) : null}
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const isSpeaker = /^[A-Z][a-zA-Z .]+:$/.test(trimmed) || /^(Question|Answer|Brother [A-Z]|Bro\. |Sister )/.test(trimmed);
        return (
          <Text
            key={i}
            style={[
              styles.bodyText,
              { color: isSpeaker ? c.textSecondary : c.textPrimary, fontSize },
              isSpeaker && styles.speaker,
            ]}
          >
            {trimmed}
          </Text>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function GokScreen() {
  const { theme } = useDisplay();
  const c = theme.colors;
  const f = theme.font;

  const [toc, setToc] = useState<GokTocYear[]>([]);
  const [flatDates, setFlatDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [sections, setSections] = useState<GokSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [tocLoading, setTocLoading] = useState(true);
  const [chooserOpen, setChooserOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Load table of contents once
  useEffect(() => {
    (async () => {
      try {
        const res = await api.getGokToc();
        const years = res.data.years;
        setToc(years);
        setFlatDates(years.flatMap(y => y.sermons));
      } catch {
        // will show empty state
      } finally {
        setTocLoading(false);
      }
    })();
  }, []);

  const loadSermon = useCallback(async (date: string) => {
    setLoading(true);
    setCurrentDate(date);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    try {
      const res = await api.getGokSermon(date);
      setSections(res.data.sections);
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const currentIndex = currentDate ? flatDates.indexOf(currentDate) : -1;
  const canBack    = currentIndex > 0;
  const canForward = currentIndex >= 0 && currentIndex < flatDates.length - 1;

  const goBack    = () => canBack    && loadSermon(flatDates[currentIndex - 1]);
  const goForward = () => canForward && loadSermon(flatDates[currentIndex + 1]);

  const yearLabel = (() => {
    if (!currentDate) return '';
    const m = currentDate.match(/\b(\d{4})\b/);
    return m ? m[1] : '';
  })();

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

      {/* Top nav bar */}
      <View style={[styles.topBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setChooserOpen(true)}>
          <Ionicons name="book" size={20} color={c.primary} />
          <Text style={[styles.navBtnLabel, { color: c.primary }]}>Go To…</Text>
        </TouchableOpacity>
        <View style={styles.navArrows}>
          <TouchableOpacity style={styles.arrowBtn} onPress={goBack} disabled={!canBack}>
            <Ionicons name="chevron-back" size={22} color={canBack ? c.textPrimary : c.textMuted} />
            <Text style={[styles.arrowLabel, { color: canBack ? c.textPrimary : c.textMuted }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.arrowBtn} onPress={goForward} disabled={!canForward}>
            <Text style={[styles.arrowLabel, { color: canForward ? c.textPrimary : c.textMuted }]}>Forward</Text>
            <Ionicons name="chevron-forward" size={22} color={canForward ? c.textPrimary : c.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section header */}
      {currentDate && (
        <View style={[styles.sectionHeader, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          <Text style={[styles.sectionHeaderText, { color: c.textSecondary }]} numberOfLines={1}>
            Gospel of the Kingdom Papers{yearLabel ? `  |  ${yearLabel}` : ''}
          </Text>
        </View>
      )}

      {/* Content */}
      {tocLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : !currentDate ? (
        <View style={styles.centered}>
          <Ionicons name="book-outline" size={48} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>Gospel of the Kingdom Papers</Text>
          <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>Tap "Go To…" to select a sermon</Text>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[styles.loadingText, { color: c.textMuted }]}>{currentDate}</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={[styles.dateHeading, { color: c.textPrimary, fontSize: f.heading + 2 }]}>
            {currentDate}
          </Text>
          {sections.map((s, i) => (
            <SectionBlock key={i} section={s} fontSize={f.body} />
          ))}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* Bottom status bar */}
      <View style={[styles.statusBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
        <Text style={[styles.statusText, { color: c.textMuted }]}>
          GoK  ·  Gospel of the Kingdom Papers
          {currentDate ? `  ·  ${currentDate}` : ''}
        </Text>
      </View>

      {/* Go-To modal */}
      <GoToChooser
        visible={chooserOpen}
        years={toc}
        onSelect={loadSermon}
        onClose={() => setChooserOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1 },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  navBtn:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  navBtnLabel:      { fontSize: 15, fontWeight: '600' },
  navArrows:        { flexDirection: 'row', gap: 4 },
  arrowBtn:         { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 6 },
  arrowLabel:       { fontSize: 14 },
  sectionHeader:    { paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionHeaderText:{ fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  centered:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle:       { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle:    { fontSize: 14, textAlign: 'center' },
  loadingText:      { fontSize: 14, marginTop: 12 },
  scroll:           { flex: 1 },
  scrollContent:    { paddingHorizontal: 20, paddingTop: 20 },
  dateHeading:      { fontWeight: '800', marginBottom: 20, lineHeight: 30 },
  sectionTitle:     { fontWeight: '700', marginBottom: 8, marginTop: 4 },
  bodyText:         { lineHeight: 26, marginBottom: 4 },
  speaker:          { fontWeight: '700', marginTop: 8 },
  statusBar:        { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  statusText:       { fontSize: 11 },
});
