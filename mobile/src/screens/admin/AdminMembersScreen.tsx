import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, Switch, ScrollView } from 'react-native';
import type { Member } from '../../types';
import * as api from '../../api';

const ROLES = ['GeneralAssembly', 'Minister', 'Admin'];
const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', phone: '', address: '', role: 'GeneralAssembly', isActive: true };

export default function AdminMembersScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.getMembers().then(r => setMembers(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setModalOpen(true); };
  const openEdit = (m: Member) => {
    setForm({ firstName: m.firstName, lastName: m.lastName, email: m.email, password: '', phone: m.phone ?? '', address: m.address ?? '', role: m.roles[0] ?? 'GeneralAssembly', isActive: m.isActive });
    setEditId(m.id);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await api.updateMember(editId, form);
      else await api.createMember(form);
      setModalOpen(false);
      load();
    } catch (err: any) {
      const msg = err.response?.data?.title ?? 'Save failed.';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = (m: Member) => {
    Alert.alert('Deactivate', `Deactivate ${m.firstName} ${m.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => { await api.deactivateMember(m.id); load(); } },
    ]);
  };

  const roleColor = (role: string) => role === 'Admin' ? '#7b1fa2' : role === 'Minister' ? '#1565c0' : '#555';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Member</Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator style={styles.center} size="large" color="#1976d2" /> : (
        <FlatList
          data={members}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No members.</Text>}
          renderItem={({ item: m }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{m.lastName}, {m.firstName}</Text>
                <View style={[styles.badge, { backgroundColor: m.isActive ? '#e8f5e9' : '#ffebee' }]}>
                  <Text style={{ fontSize: 11, color: m.isActive ? '#2e7d32' : '#c62828' }}>{m.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
              <Text style={styles.email}>{m.email}</Text>
              {m.phone ? <Text style={styles.meta}>📞 {m.phone}</Text> : null}
              <View style={styles.roleRow}>
                <Text style={[styles.role, { color: roleColor(m.roles[0]) }]}>{m.roles[0]}</Text>
                <Text style={styles.since}>since {new Date(m.memberSince).toLocaleDateString()}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(m)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                {m.isActive && (
                  <TouchableOpacity style={styles.deactivateBtn} onPress={() => deactivate(m)}>
                    <Text style={styles.deactivateBtnText}>Deactivate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editId ? 'Edit Member' : 'Add Member'}</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>

          {(['firstName', 'lastName', 'email'] as const).map(field => (
            <View key={field} style={styles.field}>
              <Text style={styles.fieldLabel}>{field === 'firstName' ? 'First Name' : field === 'lastName' ? 'Last Name' : 'Email'}</Text>
              <TextInput
                style={styles.fieldInput}
                value={form[field]}
                onChangeText={v => setForm(f => ({ ...f, [field]: v }))}
                autoCapitalize={field === 'email' ? 'none' : 'words'}
                keyboardType={field === 'email' ? 'email-address' : 'default'}
              />
            </View>
          ))}

          {!editId && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput style={styles.fieldInput} value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} secureTextEntry />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput style={styles.fieldInput} value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput style={styles.fieldInput} value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleButtons}>
              {ROLES.map(r => (
                <TouchableOpacity key={r} style={[styles.roleBtn, form.role === r && styles.roleBtnActive]} onPress={() => setForm(f => ({ ...f, role: r }))}>
                  <Text style={[styles.roleBtnText, form.role === r && styles.roleBtnTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.fieldLabel}>Active</Text>
            <Switch value={form.isActive} onValueChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, (saving || !form.firstName || !form.lastName || !form.email) && styles.saveBtnDisabled]}
            onPress={save}
            disabled={saving || !form.firstName || !form.lastName || !form.email}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1 },
  addBtn: { margin: 12, backgroundColor: '#1976d2', borderRadius: 8, padding: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  list: { paddingHorizontal: 12, paddingBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: '#212121' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  email: { fontSize: 13, color: '#555', marginTop: 2 },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  role: { fontSize: 12, fontWeight: '600' },
  since: { fontSize: 12, color: '#aaa' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: { backgroundColor: '#e3f2fd', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14 },
  editBtnText: { color: '#1976d2', fontWeight: '600', fontSize: 13 },
  deactivateBtn: { backgroundColor: '#fff3e0', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14 },
  deactivateBtnText: { color: '#f57f17', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalClose: { fontSize: 20, color: '#888' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  fieldInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 15 },
  roleButtons: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  roleBtnText: { fontSize: 12, color: '#555' },
  roleBtnTextActive: { color: '#fff', fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saveBtn: { backgroundColor: '#1976d2', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { backgroundColor: '#bbb' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
