import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewProductScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', sku: '', categoryId: '', supplierId: '', unit: 'PIECE',
    costPrice: '', sellingPrice: '', sellingPriceRural: '', reorderLevel: '', unitsPerBox: '1',
  });

  useEffect(() => {
    api.get('/api/categories').then(r => setCategories(r.data?.data ?? r.data ?? [])).catch(() => {});
    api.get('/api/suppliers?limit=100').then(r => setSuppliers(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Зөвшөөрөл', 'Зураг оруулахын тулд зөвшөөрөл хэрэгтэй'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Зураг сонгоход алдаа');
    }
  };

  const uploadImage = async (productId: string) => {
    if (!imageUri) return;
    const formData = new FormData();
    const name = imageUri.split('/').pop() || 'image.jpg';
    const type = name.match(/\.(jpg|jpeg|png|webp)$/i) ? `image/${name.split('.').pop()?.toLowerCase()}` : 'image/jpeg';
    // @ts-ignore - FormData accepts this shape in React Native
    formData.append('image', { uri: imageUri, name, type });
    await api.post(`/api/products/${productId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Нэр заавал'); return; }
    if (!form.sku.trim()) { setError('Баркод заавал'); return; }
    if (!form.categoryId) { setError('Ангилал сонгоно уу'); return; }
    if (!form.sellingPrice) { setError('Зарах үнэ заавал'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await api.post('/api/products', {
        name: form.name.trim(),
        sku: form.sku.trim(),
        categoryId: form.categoryId,
        supplierId: form.supplierId || undefined,
        unit: form.unit,
        costPrice: Number(form.costPrice || 0),
        sellingPrice: Number(form.sellingPrice),
        sellingPriceRural: Number(form.sellingPriceRural || form.sellingPrice),
        reorderLevel: Number(form.reorderLevel || 0),
        unitsPerBox: Number(form.unitsPerBox || 1),
      });
      const pid = res.data?.id;
      if (pid && imageUri) {
        try { await uploadImage(pid); } catch (e: any) {
          Alert.alert('Анхааруулга', 'Бараа үүслээ гэхдээ зураг оруулахад алдаа: ' + (e?.message || ''));
        }
      }
      invalidateListCache('/api/products');
      invalidateListCache('/api/inventory');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Шинэ бараа" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      {/* Image picker */}
      <View style={s.imageWrap}>
        <TouchableOpacity style={s.imageBtn} onPress={pickImage} activeOpacity={0.7}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.image} contentFit="cover" />
          ) : (
            <View style={s.imagePh}>
              <Ionicons name="camera-outline" size={32} color="#8E8E93" />
              <Text style={s.imagePhText}>Зураг нэмэх</Text>
            </View>
          )}
        </TouchableOpacity>
        {imageUri ? (
          <TouchableOpacity onPress={() => setImageUri(null)} style={s.removeImg}>
            <Ionicons name="close-circle" size={24} color="#FF3B30" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FormField label="Нэр" value={form.name} onChange={v => update('name', v)} required />
      <FormField label="Баркод (SKU)" value={form.sku} onChange={v => update('sku', v)} required />
      <FormField label="Ангилал" value={form.categoryId} onChange={v => update('categoryId', v)} type="select" required options={categories.map((c: any) => ({ label: c.name, value: c.id }))} />
      <FormField label="Нийлүүлэгч" value={form.supplierId} onChange={v => update('supplierId', v)} type="select" options={[{label: 'Сонгох...', value: ''}, ...suppliers.map((s: any) => ({ label: s.name, value: s.id }))]} />
      <FormField
        label="Нэгж" value={form.unit} onChange={v => update('unit', v)} type="select"
        options={[
          { label: 'Ширхэг', value: 'PIECE' },
          { label: 'Хайрцаг', value: 'BOX' },
          { label: 'Кг', value: 'KG' },
          { label: 'Литр', value: 'LITER' },
          { label: 'Баглаа', value: 'PACK' },
        ]}
      />
      <FormField label="Хайрцагт (ширхэг)" value={form.unitsPerBox} onChange={v => update('unitsPerBox', v)} type="number" />
      <FormField label="Өртөг" value={form.costPrice} onChange={v => update('costPrice', v)} type="currency" prefix="₮" />
      <FormField label="🏙️ Мөрөн үнэ" value={form.sellingPrice} onChange={v => update('sellingPrice', v)} type="currency" prefix="₮" required helperText="Мөрөн хотод зарах үнэ" />
      <FormField label="🏞️ Орон нутгийн үнэ" value={form.sellingPriceRural} onChange={v => update('sellingPriceRural', v)} type="currency" prefix="₮" helperText="Хоосон бол Мөрөн үнэтэй ижил" />
      <FormField label="Доод хэмжээ" value={form.reorderLevel} onChange={v => update('reorderLevel', v)} type="number" helperText="Үлдэгдэл энэ тоонд хүрвэл анхаарах" />
    </FormModal>
  );
}

const s = StyleSheet.create({
  imageWrap: { alignItems: 'center', marginVertical: 16, position: 'relative' },
  imageBtn: { width: 120, height: 120, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F2F4F7', borderWidth: 1, borderColor: '#E8ECF0', borderStyle: 'dashed' },
  image: { width: '100%', height: '100%' },
  imagePh: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  imagePhText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  removeImg: { position: 'absolute', top: 0, right: '30%', backgroundColor: '#fff', borderRadius: 12 },
});
