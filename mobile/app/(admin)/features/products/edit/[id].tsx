import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { FormModal, FormField, confirm } from '@/src/components/admin';
import { router, useLocalSearchParams } from 'expo-router';
import api from '@/src/lib/api';
import { getImageUrl } from '@/src/lib/image-url';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '', sku: '', categoryId: '', supplierId: '', unit: 'PIECE',
    costPrice: '', sellingPrice: '', sellingPriceRural: '', reorderLevel: '', unitsPerBox: '1',
  });
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/categories'),
      api.get('/api/suppliers?limit=100'),
      api.get(`/api/products/${id}`),
    ]).then(([cRes, sRes, pRes]) => {
      setCategories(cRes.data?.data ?? cRes.data ?? []);
      setSuppliers(sRes.data?.data ?? sRes.data ?? []);
      const p = pRes.data?.data ?? pRes.data;
      setForm({
        name: p.name ?? '',
        sku: p.sku ?? '',
        categoryId: p.categoryId ?? p.category?.id ?? '',
        supplierId: p.supplierId ?? '',
        unit: p.unit ?? 'PIECE',
        costPrice: String(Number(p.costPrice ?? 0)),
        sellingPrice: String(Number(p.sellingPrice ?? 0)),
        sellingPriceRural: String(Number(p.sellingPriceRural ?? 0)),
        reorderLevel: String(Number(p.reorderLevel ?? 0)),
        unitsPerBox: String(Number(p.unitsPerBox ?? 1)),
      });
      setExistingImageUrl(p.imageUrl ?? null);
    }).catch(e => setError(e?.response?.data?.message || 'Алдаа'))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Зөвшөөрөл хэрэгтэй'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]) setNewImageUri(result.assets[0].uri);
    } catch (e: any) { Alert.alert('Алдаа', e?.message || 'Зураг сонгоход алдаа'); }
  };

  const uploadImage = async () => {
    if (!newImageUri) return;
    const formData = new FormData();
    const name = newImageUri.split('/').pop() || 'image.jpg';
    const type = name.match(/\.(jpg|jpeg|png|webp)$/i) ? `image/${name.split('.').pop()?.toLowerCase()}` : 'image/jpeg';
    // @ts-ignore
    formData.append('image', { uri: newImageUri, name, type });
    await api.post(`/api/products/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  };

  const handleSubmit = async () => {
    setSubmitting(true); setError(null);
    try {
      await api.patch(`/api/products/${id}`, {
        name: form.name.trim(),
        sku: form.sku.trim(),
        categoryId: form.categoryId,
        supplierId: form.supplierId || undefined,
        unit: form.unit,
        costPrice: Number(form.costPrice || 0),
        sellingPrice: Number(form.sellingPrice || 0),
        sellingPriceRural: Number(form.sellingPriceRural || form.sellingPrice || 0),
        reorderLevel: Number(form.reorderLevel || 0),
        unitsPerBox: Number(form.unitsPerBox || 1),
      });
      if (newImageUri) {
        try { await uploadImage(); } catch (e: any) {
          Alert.alert('Анхааруулга', 'Зураг оруулахад алдаа: ' + (e?.message || ''));
        }
      }
      invalidateListCache('/api/products');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Устгах уу?', destructive: true, confirmLabel: 'Устгах' });
    if (!ok) return;
    try {
      await api.delete(`/api/products/${id}`);
      invalidateListCache('/api/products');
      router.back();
    } catch (e: any) { Alert.alert('Алдаа', e?.response?.data?.message || 'Устгахад алдаа'); }
  };

  if (loading) return <FormModal title="Ачааллаж..." onSubmit={() => {}} submitting>{null}</FormModal>;

  const displayUri = newImageUri || (existingImageUrl ? getImageUrl(existingImageUrl) : null);

  return (
    <FormModal title="Бараа засах" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <View style={s.imageWrap}>
        <TouchableOpacity style={s.imageBtn} onPress={pickImage} activeOpacity={0.7}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={s.image} contentFit="cover" />
          ) : (
            <View style={s.imagePh}>
              <Ionicons name="camera-outline" size={32} color="#8E8E93" />
              <Text style={s.imagePhText}>Зураг нэмэх</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <FormField label="Нэр" value={form.name} onChange={v => update('name', v)} required />
      <FormField label="Баркод" value={form.sku} onChange={v => update('sku', v)} required />
      <FormField label="Ангилал" value={form.categoryId} onChange={v => update('categoryId', v)} type="select" options={categories.map((c: any) => ({ label: c.name, value: c.id }))} />
      <FormField label="Нийлүүлэгч" value={form.supplierId} onChange={v => update('supplierId', v)} type="select" options={[{label: 'Сонгох...', value: ''}, ...suppliers.map((s: any) => ({ label: s.name, value: s.id }))]} />
      <FormField label="Нэгж" value={form.unit} onChange={v => update('unit', v)} type="select" options={[{label:'Ширхэг',value:'PIECE'},{label:'Хайрцаг',value:'BOX'},{label:'Кг',value:'KG'},{label:'Литр',value:'LITER'},{label:'Баглаа',value:'PACK'}]} />
      <FormField label="Хайрцагт (ш)" value={form.unitsPerBox} onChange={v => update('unitsPerBox', v)} type="number" />
      <FormField label="Өртөг" value={form.costPrice} onChange={v => update('costPrice', v)} type="currency" prefix="₮" />
      <FormField label="🏙️ Мөрөн үнэ" value={form.sellingPrice} onChange={v => update('sellingPrice', v)} type="currency" prefix="₮" required helperText="Мөрөн хотод зарах үнэ" />
      <FormField label="🏞️ Орон нутгийн үнэ" value={form.sellingPriceRural} onChange={v => update('sellingPriceRural', v)} type="currency" prefix="₮" helperText="Хоосон бол Мөрөн үнэтэй ижил" />
      <FormField label="Доод хэмжээ" value={form.reorderLevel} onChange={v => update('reorderLevel', v)} type="number" />

      <View style={{ paddingHorizontal: 12, marginTop: 20 }}>
        <TouchableOpacity style={s.delBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          <Text style={s.delText}>Бараа устгах</Text>
        </TouchableOpacity>
      </View>
    </FormModal>
  );
}

const s = StyleSheet.create({
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FF3B3012', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#FF3B3030' },
  delText: { fontSize: 14, fontWeight: '600', color: '#FF3B30' },
  imageWrap: { alignItems: 'center', marginVertical: 12 },
  imageBtn: { width: 120, height: 120, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F2F4F7', borderWidth: 1, borderColor: '#E8ECF0' },
  image: { width: '100%', height: '100%' },
  imagePh: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  imagePhText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
});
