import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import * as api from '../api';
import type { UserNote } from '../types';

const EMPTY = { title: '', content: '' };

export default function NotesScreen() {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.getNotes().then(r => setNotes(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = (prefill = '') => {
    setForm({ title: '', content: prefill });
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (n: UserNote) => {
    setForm({ title: n.title, content: n.content });
    setEditId(n.id);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      if (editId) await api.updateNote(editId, form);
      else await api.createNote({ ...form, sourceType: 'sermon' });
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: number) => {
    Alert.alert('Delete Note', 'Delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteNote(id); load(); } },
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#1976d2" />;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => openNew()}>
        <Text style={styles.addBtnText}>+ New Note</Text>
      </TouchableOpacity>

      <FlatList
        data={notes}
        keyExtractor={n => String(n.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No notes yet. Tap "+ New Note" to create one.</Text>}
        renderItem={({ item: n }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(n)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
              <Text style={styles.cardDate}>{new Date(n.updatedAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.cardContent} numberOfLines={3}>{n.content}</Text>
            {n.sourceRef && <Text style={styles.cardRef}>{n.sourceType === 'bible' ? '📖' : '📜'} {n.sourceRef}</Text>}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => remove(n.id)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editId ? 'Edit Note' : 'New Note'}</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={v => setForm(f => ({ ...f, title: v }))}
            placeholder="Note title…"
          />

          <Text style={styles.label}>Note</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={form.content}
            onChangeText={v => setForm(f => ({ ...f, content: v }))}
            placeholder="Write your note…"
            multiline
          />

          <TouchableOpacity
            style={[styles.saveBtn, (!form.title.trim() || !form.content.trim() || saving) && styles.saveBtnDisabled]}
            onPress={save}
            disabled={!form.title.trim() || !form.content.trim() || saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Note'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1 },
  addBtn: { margin: 12, backgroundColor: '#1976d2', borderRadius: 8, padding: 13, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  list: { paddingHorizontal: 12, paddingBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#212121', flex: 1 },
  cardDate: { fontSize: 11, color: '#aaa', marginLeft: 8 },
  cardContent: { fontSize: 13, color: '#555', lineHeight: 19 },
  cardRef: { fontSize: 11, color: '#1976d2', marginTop: 6 },
  deleteBtn: { marginTop: 10, alignSelf: 'flex-end' },
  deleteBtnText: { fontSize: 12, color: '#d32f2f' },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalClose: { fontSize: 20, color: '#888' },
  label: { fontSize: 13, color: '#666', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 15 },
  inputMulti: { minHeight: 160, textAlignVertical: 'top' },
  saveBtn: { marginTop: 24, backgroundColor: '#1976d2', borderRadius: 8, padding: 14, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#bbb' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
