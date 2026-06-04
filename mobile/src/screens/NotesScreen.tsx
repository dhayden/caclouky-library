import { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput,
  ScrollView, Alert, ActivityIndicator, NativeSyntheticEvent, TextInputSelectionChangeEventData,
} from 'react-native';
import * as api from '../api';
import type { NoteFolder, UserNote } from '../types';
import { useDisplay } from '../context/DisplayContext';

// ── Simple markdown renderer ──────────────────────────────────────────────────
function MarkdownText({ text, baseStyle }: { text: string; baseStyle: any }) {
  // Split on bold (**...**), italic (*...*), highlight (==...==)
  const tokens: { type: 'bold' | 'italic' | 'highlight' | 'text'; value: string }[] = [];
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|==(.+?)==)/gs;
  let last = 0, m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) });
    if (m[2]) tokens.push({ type: 'bold',      value: m[2] });
    else if (m[3]) tokens.push({ type: 'italic',    value: m[3] });
    else if (m[4]) tokens.push({ type: 'highlight', value: m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return (
    <Text style={baseStyle}>
      {tokens.map((t, i) => {
        if (t.type === 'bold')      return <Text key={i} style={{ fontWeight: 'bold' }}>{t.value}</Text>;
        if (t.type === 'italic')    return <Text key={i} style={{ fontStyle: 'italic' }}>{t.value}</Text>;
        if (t.type === 'highlight') return <Text key={i} style={{ backgroundColor: '#FFE066' }}>{t.value}</Text>;
        return <Text key={i}>{t.value}</Text>;
      })}
    </Text>
  );
}

// ── Formatting toolbar ────────────────────────────────────────────────────────
const TOOLBAR_HIGHLIGHT_COLORS = [
  { color: '#FFE066', label: '🟡' },
  { color: '#90EE90', label: '🟢' },
  { color: '#87CEEB', label: '🔵' },
  { color: '#FFB6C1', label: '🩷' },
];

function FormatToolbar({ onFormat, primaryColor }: { onFormat: (prefix: string, suffix: string) => void; primaryColor: string }) {
  const [showColors, setShowColors] = useState(false);
  return (
    <View style={tbStyles.bar}>
      <TouchableOpacity style={tbStyles.btn} onPress={() => onFormat('**', '**')}>
        <Text style={[tbStyles.btnText, { fontWeight: 'bold' }]}>B</Text>
      </TouchableOpacity>
      <TouchableOpacity style={tbStyles.btn} onPress={() => onFormat('*', '*')}>
        <Text style={[tbStyles.btnText, { fontStyle: 'italic' }]}>I</Text>
      </TouchableOpacity>
      {showColors
        ? TOOLBAR_HIGHLIGHT_COLORS.map(({ color, label }) => (
            <TouchableOpacity key={color} style={[tbStyles.btn, { backgroundColor: color }]}
              onPress={() => { onFormat(`==${color}:`, '=='); setShowColors(false); }}>
              <Text style={tbStyles.btnText}>{label}</Text>
            </TouchableOpacity>
          ))
        : <TouchableOpacity style={tbStyles.btn} onPress={() => setShowColors(true)}>
            <Text style={tbStyles.btnText}>🖍</Text>
          </TouchableOpacity>
      }
      <TouchableOpacity style={tbStyles.btn} onPress={() => onFormat('\n- ', '')}>
        <Text style={tbStyles.btnText}>• </Text>
      </TouchableOpacity>
      {showColors && (
        <TouchableOpacity style={tbStyles.btn} onPress={() => setShowColors(false)}>
          <Text style={tbStyles.btnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const tbStyles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 6, paddingVertical: 8, paddingHorizontal: 4, flexWrap: 'wrap' },
  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F0F0F0', minWidth: 36, alignItems: 'center' },
  btnText: { fontSize: 14, color: '#333' },
});

const FOLDER_COLORS = ['#1976d2', '#388e3c', '#7b1fa2', '#f57c00', '#c62828', '#00796b', '#5d4037', '#455a64'];

const EMPTY_NOTE = { title: '', content: '', folderId: undefined as number | undefined };
const EMPTY_FOLDER = { name: '', color: FOLDER_COLORS[0] };

export default function NotesScreen() {
  const { theme } = useDisplay();
  const c = theme.colors;
  const f = theme.font;

  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [noteModal, setNoteModal] = useState(false);
  const [editNoteId, setEditNoteId] = useState<number | null>(null);
  const [noteForm, setNoteForm] = useState(EMPTY_NOTE);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSelection, setNoteSelection] = useState({ start: 0, end: 0 });
  const contentInputRef = useRef<TextInput>(null);

  const applyFormat = (prefix: string, suffix: string) => {
    const { start, end } = noteSelection;
    const content = noteForm.content;
    const selected = content.slice(start, end);
    const newContent = content.slice(0, start) + prefix + selected + suffix + content.slice(end);
    setNoteForm(fo => ({ ...fo, content: newContent }));
    contentInputRef.current?.focus();
  };

  const [folderModal, setFolderModal] = useState(false);
  const [editFolderId, setEditFolderId] = useState<number | null>(null);
  const [folderForm, setFolderForm] = useState(EMPTY_FOLDER);
  const [savingFolder, setSavingFolder] = useState(false);

  const loadFolders = () =>
    api.getNoteFolders().then(r => setFolders(r.data)).catch(() => {});

  const loadNotes = (folderId?: number) => {
    setLoading(true);
    setLoadError(false);
    api.getNotes(folderId)
      .then(r => setNotes(r.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFolders();
    loadNotes();
  }, []);

  const selectFolder = (id: number | null) => {
    setActiveFolderId(id);
    loadNotes(id ?? undefined);
  };

  // --- Note actions ---
  const openNewNote = (prefillContent = '') => {
    setNoteForm({ title: '', content: prefillContent, folderId: activeFolderId ?? undefined });
    setEditNoteId(null);
    setNoteModal(true);
  };

  const openEditNote = (n: UserNote) => {
    setNoteForm({ title: n.title, content: n.content, folderId: n.folderId });
    setEditNoteId(n.id);
    setNoteModal(true);
  };

  const saveNote = async () => {
    if (!noteForm.title.trim() || !noteForm.content.trim()) return;
    setSavingNote(true);
    try {
      if (editNoteId) await api.updateNote(editNoteId, noteForm);
      else await api.createNote({ ...noteForm, sourceType: 'general' });
      setNoteModal(false);
      loadNotes(activeFolderId ?? undefined);
      loadFolders();
    } catch {
      Alert.alert('Error', 'Could not save note. Check your connection.');
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = (id: number) => {
    Alert.alert('Delete Note', 'Delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await api.deleteNote(id);
          loadNotes(activeFolderId ?? undefined);
          loadFolders();
        },
      },
    ]);
  };

  // --- Folder actions ---
  const openNewFolder = () => {
    setFolderForm(EMPTY_FOLDER);
    setEditFolderId(null);
    setFolderModal(true);
  };

  const openEditFolder = (folder: NoteFolder) => {
    setFolderForm({ name: folder.name, color: folder.color ?? FOLDER_COLORS[0] });
    setEditFolderId(folder.id);
    setFolderModal(true);
  };

  const saveFolder = async () => {
    if (!folderForm.name.trim()) return;
    setSavingFolder(true);
    try {
      if (editFolderId) await api.updateNoteFolder(editFolderId, folderForm.name, folderForm.color);
      else await api.createNoteFolder(folderForm.name, folderForm.color);
      setFolderModal(false);
      loadFolders();
    } catch {
      Alert.alert('Error', 'Could not save folder.');
    } finally {
      setSavingFolder(false);
    }
  };

  const deleteFolder = (folder: NoteFolder) => {
    Alert.alert('Delete Folder', `Delete "${folder.name}"? Notes inside will be moved to All Notes.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await api.deleteNoteFolder(folder.id);
          if (activeFolderId === folder.id) selectFolder(null);
          else loadFolders();
        },
      },
    ]);
  };

  const activeFolder = folders.find(fo => fo.id === activeFolderId);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Folder strip */}
      <View style={[styles.folderStrip, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderScroll}>
          <TouchableOpacity
            style={[styles.folderChip, { borderColor: c.border }, activeFolderId === null && { backgroundColor: '#1976d2', borderColor: '#1976d2' }]}
            onPress={() => selectFolder(null)}
          >
            <Text style={[styles.folderChipText, { color: activeFolderId === null ? '#fff' : c.textSecondary, fontSize: f.label }]}>
              All Notes
            </Text>
          </TouchableOpacity>

          {folders.map(fo => (
            <TouchableOpacity
              key={fo.id}
              style={[styles.folderChip, { borderColor: fo.color ?? '#1976d2' }, activeFolderId === fo.id && { backgroundColor: fo.color ?? '#1976d2' }]}
              onPress={() => selectFolder(fo.id)}
              onLongPress={() => openEditFolder(fo)}
            >
              <Text style={[styles.folderChipText, { color: activeFolderId === fo.id ? '#fff' : (fo.color ?? c.textSecondary), fontSize: f.label }]}>
                {fo.name} ({fo.noteCount})
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.folderChip, styles.folderChipAdd, { borderColor: c.border }]} onPress={openNewFolder}>
            <Text style={[styles.folderChipText, { color: c.textMuted, fontSize: f.label }]}>+ Folder</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loadError && (
        <TouchableOpacity style={styles.errorBanner} onPress={() => loadNotes(activeFolderId ?? undefined)}>
          <Text style={styles.errorBannerText}>Could not reach server — tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* Add note button */}
      <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.primary }]} onPress={() => openNewNote()}>
        <Text style={[styles.addBtnText, { fontSize: f.body }]}>
          + New Note{activeFolder ? ` in ${activeFolder.name}` : ''}
        </Text>
      </TouchableOpacity>

      {/* Notes list */}
      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color={c.primary} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={n => String(n.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.textMuted, fontSize: f.body }]}>
              {loadError ? 'Notes unavailable — check your connection.' : 'No notes here yet.'}
            </Text>
          }
          renderItem={({ item: n }) => {
            const folder = folders.find(fo => fo.id === n.folderId);
            return (
              <TouchableOpacity style={[styles.card, { backgroundColor: c.surface, shadowColor: c.cardShadow }]} onPress={() => openEditNote(n)}>
                {folder && (
                  <View style={[styles.cardFolderTag, { backgroundColor: folder.color ?? '#1976d2' }]}>
                    <Text style={styles.cardFolderTagText}>{folder.name}</Text>
                  </View>
                )}
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: c.textPrimary, fontSize: f.body + 2 }]} numberOfLines={1}>{n.title}</Text>
                  <Text style={[styles.cardDate, { color: c.textMuted, fontSize: f.label - 1 }]}>{new Date(n.updatedAt).toLocaleDateString()}</Text>
                </View>
                <MarkdownText text={n.content.slice(0, 300) + (n.content.length > 300 ? '…' : '')} baseStyle={[styles.cardContent, { color: c.textSecondary, fontSize: f.body }]} />
                {n.sourceRef && (
                  <Text style={[styles.cardRef, { color: c.primary, fontSize: f.label }]}>
                    {n.sourceType === 'bible' ? '📖' : '📜'} {n.sourceRef}
                  </Text>
                )}
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNote(n.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Note modal */}
      <Modal visible={noteModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNoteModal(false)}>
        <ScrollView style={[styles.modal, { backgroundColor: c.background }]} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editNoteId ? 'Edit Note' : 'New Note'}</Text>
            <TouchableOpacity onPress={() => setNoteModal(false)}>
              <Text style={[styles.modalClose, { color: c.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: c.textSecondary, fontSize: f.label }]}>Title</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]}
            value={noteForm.title}
            onChangeText={v => setNoteForm(fo => ({ ...fo, title: v }))}
            placeholder="Note title…"
            placeholderTextColor={c.textMuted}
          />

          <Text style={[styles.label, { color: c.textSecondary, fontSize: f.label }]}>Folder</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderPickerScroll}>
            <TouchableOpacity
              style={[styles.folderPickerChip, { borderColor: c.border }, !noteForm.folderId && { backgroundColor: '#1976d2', borderColor: '#1976d2' }]}
              onPress={() => setNoteForm(fo => ({ ...fo, folderId: undefined }))}
            >
              <Text style={[styles.folderPickerText, { color: !noteForm.folderId ? '#fff' : c.textMuted }]}>None</Text>
            </TouchableOpacity>
            {folders.map(fo => (
              <TouchableOpacity
                key={fo.id}
                style={[styles.folderPickerChip, { borderColor: fo.color ?? '#1976d2' }, noteForm.folderId === fo.id && { backgroundColor: fo.color ?? '#1976d2' }]}
                onPress={() => setNoteForm(fn => ({ ...fn, folderId: fo.id }))}
              >
                <Text style={[styles.folderPickerText, { color: noteForm.folderId === fo.id ? '#fff' : (fo.color ?? c.textMuted) }]}>{fo.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.toolbarRow, { borderColor: c.border, backgroundColor: c.surface }]}>
            <FormatToolbar onFormat={applyFormat} primaryColor={c.primary} />
          </View>
          <TextInput
            ref={contentInputRef}
            style={[styles.input, styles.inputMulti, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]}
            value={noteForm.content}
            onChangeText={v => setNoteForm(fo => ({ ...fo, content: v }))}
            onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) =>
              setNoteSelection(e.nativeEvent.selection)
            }
            placeholder="Write your note…"
            placeholderTextColor={c.textMuted}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: c.primary }, (!noteForm.title.trim() || !noteForm.content.trim() || savingNote) && styles.saveBtnDisabled]}
            onPress={saveNote}
            disabled={!noteForm.title.trim() || !noteForm.content.trim() || savingNote}
          >
            <Text style={[styles.saveBtnText, { fontSize: f.body }]}>{savingNote ? 'Saving…' : 'Save Note'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Folder modal */}
      <Modal visible={folderModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setFolderModal(false)}>
        <ScrollView style={[styles.modal, { backgroundColor: c.background }]} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editFolderId ? 'Edit Folder' : 'New Folder'}</Text>
            <TouchableOpacity onPress={() => setFolderModal(false)}>
              <Text style={[styles.modalClose, { color: c.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: c.textSecondary, fontSize: f.label }]}>Name</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, backgroundColor: c.inputBg, color: c.textPrimary, fontSize: f.body }]}
            value={folderForm.name}
            onChangeText={v => setFolderForm(fo => ({ ...fo, name: v }))}
            placeholder="Folder name…"
            placeholderTextColor={c.textMuted}
          />

          <Text style={[styles.label, { color: c.textSecondary, fontSize: f.label }]}>Color</Text>
          <View style={styles.colorRow}>
            {FOLDER_COLORS.map(col => (
              <TouchableOpacity
                key={col}
                style={[styles.colorSwatch, { backgroundColor: col }, folderForm.color === col && styles.colorSwatchSelected]}
                onPress={() => setFolderForm(fo => ({ ...fo, color: col }))}
              />
            ))}
          </View>

          <View style={styles.folderActions}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: c.primary, flex: 1 }, (!folderForm.name.trim() || savingFolder) && styles.saveBtnDisabled]}
              onPress={saveFolder}
              disabled={!folderForm.name.trim() || savingFolder}
            >
              <Text style={[styles.saveBtnText, { fontSize: f.body }]}>{savingFolder ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
            {editFolderId && (
              <TouchableOpacity style={styles.deleteFolderBtn} onPress={() => { setFolderModal(false); deleteFolder(folders.find(fo => fo.id === editFolderId)!); }}>
                <Text style={styles.deleteFolderBtnText}>Delete Folder</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, marginTop: 60 },
  folderStrip: { borderBottomWidth: 1 },
  folderScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  folderChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  folderChipAdd: { borderStyle: 'dashed' },
  folderChipText: { fontWeight: '600' },
  errorBanner: { backgroundColor: '#d32f2f', padding: 10, alignItems: 'center' },
  errorBannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  addBtn: { margin: 16, borderRadius: 10, padding: 15, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { borderRadius: 12, padding: 18, marginBottom: 14, shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' },
  cardFolderTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 10 },
  cardFolderTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontWeight: '700', flex: 1 },
  cardDate: { marginLeft: 8 },
  cardContent: { lineHeight: 23 },
  cardRef: { marginTop: 10 },
  deleteBtn: { marginTop: 14, alignSelf: 'flex-end' },
  deleteBtnText: { fontSize: 13, color: '#d32f2f' },
  empty: { textAlign: 'center', marginTop: 60 },
  modal: { flex: 1 },
  modalContent: { padding: 24, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalClose: { fontSize: 22 },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 16 },
  toolbarRow: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, marginTop: 16, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14 },
  inputMulti: { minHeight: 300, textAlignVertical: 'top' },
  folderPickerScroll: { marginBottom: 4 },
  folderPickerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  folderPickerText: { fontSize: 13, fontWeight: '600' },
  saveBtn: { borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 4 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  folderActions: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 },
  deleteFolderBtn: { paddingHorizontal: 16, paddingVertical: 16 },
  deleteFolderBtnText: { color: '#d32f2f', fontWeight: '600', fontSize: 14 },
});
