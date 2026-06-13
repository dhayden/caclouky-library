import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Pressable,
  StyleSheet, Modal, ActivityIndicator, Platform, Animated, Dimensions,
} from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GokTocYear, GokSection } from '../types';
import * as api from '../api';
import { useDisplay } from '../context/DisplayContext';
import type { GokStackParamList } from '../navigation/types';

type NavLevel = 'collection' | 'year' | 'dates';

// ── Go-To Chooser ─────────────────────────────────────────────────────────────

function GoToChooser({ visible, years, onSelect, onClose }: {
  visible: boolean; years: GokTocYear[];
  onSelect: (date: string) => void; onClose: () => void;
}) {
  const [level, setLevel] = useState<NavLevel>('collection');
  const [selectedYear, setSelectedYear] = useState<GokTocYear | null>(null);

  useEffect(() => { if (visible) { setLevel('collection'); setSelectedYear(null); } }, [visible]);

  const goBack = () => {
    if (level === 'dates') setLevel('year');
    else if (level === 'year') setLevel('collection');
    else onClose();
  };

  const header = level === 'collection' ? 'Go To…'
    : level === 'year' ? 'Gospel of the Kingdom Papers'
    : selectedYear?.year ?? '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={navStyles.container}>
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
          {level === 'collection' && (
            <TouchableOpacity style={navStyles.row} onPress={() => setLevel('year')}>
              <Ionicons name="book-outline" size={18} color="#7B9FE0" style={navStyles.rowIcon} />
              <Text style={navStyles.rowText}>Gospel of the Kingdom Papers</Text>
              <Text style={navStyles.rowChevron}>›</Text>
            </TouchableOpacity>
          )}
          {level === 'year' && years.map(y => (
            <TouchableOpacity key={y.year} style={navStyles.row} onPress={() => { setSelectedYear(y); setLevel('dates'); }}>
              <Text style={navStyles.yearLabel}>{y.year}</Text>
              <Text style={navStyles.rowMeta}>{y.sermons.length} sermons</Text>
              <Text style={navStyles.rowChevron}>›</Text>
            </TouchableOpacity>
          ))}
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

// ── Cover page ─────────────────────────────────────────────────────────────────

function CoverPage({ onLayout }: { onLayout: (h: number) => void }) {
  const { theme } = useDisplay();
  const c = theme.colors;
  const screenH = Dimensions.get('window').height;

  return (
    <View
      style={[coverStyles.root, { minHeight: screenH, backgroundColor: c.background }]}
      onLayout={e => onLayout(e.nativeEvent.layout.height)}
    >
      <View style={coverStyles.iconWrap}>
        <Ionicons name="book" size={52} color={c.primary} />
      </View>
      <View style={[coverStyles.rule, { backgroundColor: c.primary }]} />
      <Text style={[coverStyles.titleSmall, { color: c.textSecondary }]}>GOSPEL OF THE</Text>
      <Text style={[coverStyles.titleLarge, { color: c.textPrimary }]}>KINGDOM{'\n'}PAPERS</Text>
      <View style={[coverStyles.ruleThin, { backgroundColor: c.border }]} />
      <Text style={[coverStyles.authorLabel, { color: c.textMuted }]}>compiled from sermons by</Text>
      <Text style={[coverStyles.authorName, { color: c.textPrimary }]}>William Sowders</Text>
      <Text style={[coverStyles.years, { color: c.textSecondary }]}>1944 – 1952</Text>
      <View style={[coverStyles.ruleThin, { backgroundColor: c.border }]} />
      <Text style={[coverStyles.desc, { color: c.textSecondary }]}>
        Transcribed from recorded church services{'\n'}of the Gospel of the Kingdom movement.
      </Text>
      <View style={coverStyles.scrollCue}>
        <Ionicons name="chevron-down" size={20} color={c.textMuted} />
      </View>
    </View>
  );
}

const coverStyles = StyleSheet.create({
  root:        { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60 },
  iconWrap:    { marginBottom: 28 },
  rule:        { width: 56, height: 3, borderRadius: 2, marginBottom: 22 },
  ruleThin:    { width: 120, height: StyleSheet.hairlineWidth, marginVertical: 24 },
  titleSmall:  { fontSize: 13, fontWeight: '700', letterSpacing: 4, marginBottom: 8 },
  titleLarge:  { fontSize: 44, fontWeight: '900', textAlign: 'center', lineHeight: 50, marginBottom: 24, letterSpacing: 1 },
  authorLabel: { fontSize: 12, letterSpacing: 2, marginBottom: 8 },
  authorName:  { fontSize: 20, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  years:       { fontSize: 14, letterSpacing: 1 },
  desc:        { fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 4 },
  scrollCue:   { marginTop: 48, opacity: 0.5 },
});

// ── Section block ─────────────────────────────────────────────────────────────

function splitHighlight(text: string, term: string): string[] {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.split(new RegExp(`(${escaped})`, 'gi'));
}

function HighlightLine({ text, highlight, style }: { text: string; highlight?: string; style: StyleProp<TextStyle> }) {
  if (!highlight?.trim()) return <Text style={style}>{text}</Text>;
  const parts = splitHighlight(text, highlight);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.toLowerCase() === highlight.toLowerCase()
          ? <Text key={i} style={{ backgroundColor: '#FFD700', color: '#000' }}>{p}</Text>
          : p
      )}
    </Text>
  );
}

function SectionBlock({ section, fontSize, highlight }: { section: GokSection; fontSize: number; highlight?: string }) {
  const { theme } = useDisplay();
  const c = theme.colors;
  const lines = section.text.split('\n');
  return (
    <View style={{ marginBottom: 20 }}>
      {section.sectionTitle ? (
        <HighlightLine
          text={section.sectionTitle}
          highlight={highlight}
          style={[styles.sectionTitle, { color: c.primary, fontSize: fontSize + 2 }]}
        />
      ) : null}
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const isSpeaker = /^[A-Z][a-zA-Z .]+:$/.test(trimmed) || /^(Question|Answer|Brother [A-Z]|Bro\. |Sister )/.test(trimmed);
        return (
          <HighlightLine
            key={i}
            text={trimmed}
            highlight={highlight}
            style={[styles.bodyText, { color: isSpeaker ? c.textSecondary : c.textPrimary, fontSize }, isSpeaker && styles.speaker]}
          />
        );
      })}
    </View>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type LoadedSermon = { date: string; sections: GokSection[] };

const FONT_SIZES = ['small', 'medium', 'large'] as const;
const LOAD_AHEAD_PX = 600; // start loading next sermon when this many px from bottom

// ── Main screen ───────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<GokStackParamList, 'GokHome'>;

export default function GokScreen({ navigation, route }: Props) {
  const { theme, fontSize: sizeKey, setFontSize } = useDisplay();
  const c = theme.colors;
  const f = theme.font;
  const insets = useSafeAreaInsets();

  // TOC state
  const [toc, setToc]             = useState<GokTocYear[]>([]);
  const [flatDates, setFlatDates] = useState<string[]>([]);
  const [tocLoading, setTocLoading] = useState(true);

  // Continuous reader state
  const [loadedSermons, setLoadedSermons] = useState<LoadedSermon[]>([]);
  const [loadingMore, setLoadingMore]     = useState(false);
  const nextIndexRef = useRef(0); // index in flatDates of next sermon to append

  // Visible sermon tracking
  const [currentVisibleDate, setCurrentVisibleDate] = useState<string | null>(null);
  const sermonYPositions = useRef<Map<string, number>>(new Map()); // date → Y in scroll content
  const scrollYRef = useRef(0);

  // Highlight term from search navigation
  const [highlightTerm, setHighlightTerm] = useState('');

  // UI state
  const [chooserOpen, setChooserOpen]   = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const scrollRef        = useRef<ScrollView>(null);
  const coverHeight      = useRef(0);
  const pendingScrollDate = useRef<string | null>(null);

  // Overlay animation
  const navShownRef = useRef(false);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [navShown, setNavShown] = useState(false);


  // ── Load a single sermon and append ──────────────────────────────────────────

  const appendSermon = useCallback(async (index: number, dates: string[]): Promise<boolean> => {
    if (index >= dates.length) return false;
    const date = dates[index];
    try {
      const res = await api.getGokSermon(date);
      setLoadedSermons(prev => {
        if (prev.some(s => s.date === date)) return prev; // already loaded
        return [...prev, { date, sections: res.data.sections }];
      });
      nextIndexRef.current = index + 1;
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── Initial TOC load ──────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getGokToc();
        const years = res.data.years;
        setToc(years);
        const dates = years.flatMap((y: GokTocYear) => y.sermons);
        setFlatDates(dates);
        if (dates.length > 0) {
          nextIndexRef.current = 0;
          await appendSermon(0, dates);
        }
      } catch {
      } finally {
        setTocLoading(false);
      }
    })();
  }, [appendSermon]);

  // ── React to search navigation params ────────────────────────────────────────

  useEffect(() => {
    const { scrollToDate, highlight } = route.params ?? {};
    if (highlight !== undefined) setHighlightTerm(highlight);
    if (scrollToDate && flatDates.length > 0) goToDate(scrollToDate, flatDates);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.scrollToDate, route.params?.highlight, flatDates]);

  // ── Load more when near bottom ────────────────────────────────────────────────

  const maybeLoadMore = useCallback((contentHeight: number, layoutHeight: number, offsetY: number) => {
    if (loadingMore) return;
    const distanceFromBottom = contentHeight - (offsetY + layoutHeight);
    if (distanceFromBottom < LOAD_AHEAD_PX) {
      setLoadingMore(true);
      appendSermon(nextIndexRef.current, flatDates)
        .finally(() => setLoadingMore(false));
    }
  }, [loadingMore, flatDates, appendSermon]);

  // ── Scroll handler ────────────────────────────────────────────────────────────

  const handleScroll = useCallback((e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    scrollYRef.current = contentOffset.y;

    // Update visible sermon date
    let visible: string | null = null;
    for (const [date, yPos] of sermonYPositions.current) {
      if (yPos <= contentOffset.y + 80) visible = date;
      else break;
    }
    setCurrentVisibleDate(visible);

    // Load more near bottom
    maybeLoadMore(contentSize.height, layoutMeasurement.height, contentOffset.y);
  }, [maybeLoadMore]);

  // ── Navigate to a specific date ───────────────────────────────────────────────

  const goToDate = useCallback(async (date: string, dates: string[]) => {
    const idx = dates.indexOf(date);
    if (idx < 0) return;

    // If already loaded, scroll to it
    const yPos = sermonYPositions.current.get(date);
    if (yPos !== undefined) {
      scrollRef.current?.scrollTo({ y: yPos, animated: true });
      return;
    }

    // Otherwise: clear and reload from this date; onLayout will scroll once laid out
    setLoadedSermons([]);
    sermonYPositions.current.clear();
    pendingScrollDate.current = date;
    nextIndexRef.current = idx;
    await appendSermon(idx, dates);
  }, [appendSermon]);

  // ── Prev / Next ───────────────────────────────────────────────────────────────

  const currentIndex = currentVisibleDate ? flatDates.indexOf(currentVisibleDate) : -1;
  const canBack      = currentIndex > 0;
  const canForward   = currentIndex >= 0 && currentIndex < flatDates.length - 1;

  const goBack    = () => { if (canBack)    goToDate(flatDates[currentIndex - 1], flatDates); };
  const goForward = () => { if (canForward) goToDate(flatDates[currentIndex + 1], flatDates); };

  // ── Overlay toggle ────────────────────────────────────────────────────────────

  const toggleNav = () => {
    const show = !navShownRef.current;
    navShownRef.current = show;
    if (show) { setNavShown(true); setFontPickerOpen(false); }
    Animated.timing(overlayAnim, { toValue: show ? 1 : 0, duration: 220, useNativeDriver: true })
      .start(() => { if (!show) setNavShown(false); });
  };

  const overlayBg = theme.dark ? 'rgba(8,10,24,0.92)' : 'rgba(248,246,240,0.96)';

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <Pressable onPress={toggleNav}>
          {/* Cover page */}
          <CoverPage onLayout={h => { coverHeight.current = h; }} />

          {/* Divider */}
          <View style={[styles.divider, { borderTopColor: c.border }]} />

          {/* Loaded sermons — appended as user scrolls */}
          {tocLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={c.primary} />
            </View>
          ) : (
            <>
              {loadedSermons.map(({ date, sections }) => (
                <View
                  key={date}
                  onLayout={e => {
                    const y = e.nativeEvent.layout.y;
                    sermonYPositions.current.set(date, y);
                    if (pendingScrollDate.current === date) {
                      pendingScrollDate.current = null;
                      scrollRef.current?.scrollTo({ y, animated: false });
                    }
                  }}
                >
                  <Text style={[styles.dateHeading, { color: c.textPrimary, fontSize: f.heading + 2 }]}>
                    {date}
                  </Text>
                  {sections.map((s, i) => (
                    <SectionBlock key={i} section={s} fontSize={f.body} highlight={highlightTerm || undefined} />
                  ))}
                  {/* Separator between sermons */}
                  <View style={[styles.sermonSep, { borderTopColor: c.border }]} />
                </View>
              ))}

              {/* Loading spinner at bottom */}
              {loadingMore && (
                <View style={styles.loadMoreSpinner}>
                  <ActivityIndicator size="small" color={c.textMuted} />
                </View>
              )}

              {/* End of document */}
              {!loadingMore && nextIndexRef.current >= flatDates.length && flatDates.length > 0 && (
                <View style={styles.endOfDoc}>
                  <Ionicons name="book-outline" size={24} color={c.textMuted} />
                  <Text style={[styles.endText, { color: c.textMuted }]}>End of Gospel of the Kingdom Papers</Text>
                </View>
              )}
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Overlay header */}
      <Animated.View style={[styles.overlayTop, { opacity: overlayAnim }]} pointerEvents={navShown ? 'box-none' : 'none'}>
        <View style={[styles.headerBar, { backgroundColor: overlayBg }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setChooserOpen(true)}>
            <Ionicons name="list-outline" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.textPrimary }]} numberOfLines={1}>
            {currentVisibleDate ?? 'Gospel of the Kingdom'}
          </Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setFontPickerOpen(v => !v)}>
            <Text style={[styles.aaBtn, { color: c.textPrimary }]}>Aa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('SermonSearch')}>
            <Ionicons name="search-outline" size={24} color={c.textPrimary} />
          </TouchableOpacity>
        </View>
        {fontPickerOpen && (
          <View style={[styles.fontPicker, { backgroundColor: overlayBg, borderTopColor: c.border }]}>
            {FONT_SIZES.map(size => (
              <TouchableOpacity
                key={size}
                style={[styles.fontBtn, sizeKey === size && { backgroundColor: c.primary + '30' }]}
                onPress={() => { setFontSize(size); setFontPickerOpen(false); }}
              >
                <Text style={[styles.fontBtnLabel, { color: sizeKey === size ? c.primary : c.textSecondary },
                  size === 'small' && { fontSize: 13 }, size === 'medium' && { fontSize: 17 }, size === 'large' && { fontSize: 22 }]}>
                  Aa
                </Text>
                <Text style={[styles.fontSizeHint, { color: c.textMuted }]}>
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Overlay footer */}
      <Animated.View
        style={[styles.overlayBottom, { opacity: overlayAnim, paddingBottom: insets.bottom + 4 }]}
        pointerEvents={navShown ? 'box-none' : 'none'}
      >
        <View style={[styles.footerBar, { backgroundColor: overlayBg }]}>
          <TouchableOpacity style={styles.footerArrow} onPress={goBack} disabled={!canBack}>
            <Ionicons name="chevron-back" size={20} color={canBack ? c.textPrimary : c.textMuted} />
            <Text style={[styles.arrowLabel, { color: canBack ? c.textPrimary : c.textMuted }]}>Prev</Text>
          </TouchableOpacity>
          <Text style={[styles.footerInfo, { color: c.textSecondary }]} numberOfLines={1}>
            {currentIndex >= 0
              ? `${currentIndex + 1} of ${flatDates.length}`
              : 'Gospel of the Kingdom Papers'}
          </Text>
          <TouchableOpacity style={styles.footerArrow} onPress={goForward} disabled={!canForward}>
            <Text style={[styles.arrowLabel, { color: canForward ? c.textPrimary : c.textMuted }]}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color={canForward ? c.textPrimary : c.textMuted} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <GoToChooser
        visible={chooserOpen}
        years={toc}
        onSelect={date => goToDate(date, flatDates)}
        onClose={() => setChooserOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1 },
  scroll:          { flex: 1 },
  divider:         { borderTopWidth: StyleSheet.hairlineWidth, marginHorizontal: 32, marginBottom: 32 },
  centered:        { minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  dateHeading:     { fontWeight: '800', marginBottom: 20, lineHeight: 30, paddingHorizontal: 22, paddingTop: 8 },
  sectionTitle:    { fontWeight: '700', marginBottom: 8, marginTop: 4 },
  bodyText:        { lineHeight: 26, marginBottom: 4, paddingHorizontal: 22 },
  speaker:         { fontWeight: '700', marginTop: 8 },
  sermonSep:       { borderTopWidth: StyleSheet.hairlineWidth, marginHorizontal: 32, marginTop: 32, marginBottom: 40 },
  loadMoreSpinner: { paddingVertical: 32, alignItems: 'center' },
  endOfDoc:        { paddingVertical: 48, alignItems: 'center', gap: 12 },
  endText:         { fontSize: 14, textAlign: 'center' },

  overlayTop:      { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  overlayBottom:   { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 },
  headerBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6 },
  iconBtn:         { padding: 10 },
  headerTitle:     { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 4 },
  aaBtn:           { fontSize: 17, fontWeight: '700' },
  fontPicker:      { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  fontBtn:         { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 6, borderRadius: 8 },
  fontBtnLabel:    { fontWeight: '700' },
  fontSizeHint:    { fontSize: 11, marginTop: 3 },
  footerBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6 },
  footerArrow:     { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 10 },
  arrowLabel:      { fontSize: 13 },
  footerInfo:      { flex: 1, textAlign: 'center', fontSize: 12, letterSpacing: 0.2 },
});
