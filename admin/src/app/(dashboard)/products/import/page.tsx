'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function ProductImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleDownloadTemplate() {
    try {
      const res = await api.get('/api/products/import-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products-template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Загвар татахад алдаа гарлаа');
    }
  }

  async function handleImport() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/products/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setFile(null);
    } catch (err: any) {
      setResult({
        created: 0,
        updated: 0,
        errors: [err.response?.data?.message ?? 'Импортлоход алдаа гарлаа'],
      });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/products" className="inline-flex items-center gap-1.5 text-[15px] text-[#007AFF] font-medium">
            <ArrowLeft className="w-4 h-4" /> Буцах
          </Link>
          <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Бараа импортлох</h1>
        </div>
        <button onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 transition-all active:scale-[0.97]">
          <Download className="w-4 h-4" /> Загвар татах
        </button>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-6">
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
            dragging ? 'border-[#007AFF] bg-[#007AFF]/5' : 'border-[#E5E5EA] hover:border-[#007AFF]/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
          />
          {file ? (
            <div className="space-y-2">
              <FileSpreadsheet className="w-12 h-12 text-[#34C759] mx-auto" />
              <p className="text-[15px] font-semibold text-[#1C1C1E]">{file.name}</p>
              <p className="text-[13px] text-[#8E8E93]">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-12 h-12 text-[#AEAEB2] mx-auto" />
              <p className="text-[15px] font-semibold text-[#1C1C1E]">Файл сонгох эсвэл чирж оруулах</p>
              <p className="text-[13px] text-[#8E8E93]">.xlsx, .xls, .csv файл дэмжинэ</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={handleImport} disabled={!file || uploading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Импортлож байна...' : 'Импортлох'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-6 space-y-4">
          <h2 className="text-[17px] font-bold text-[#1C1C1E]">Импортын үр дүн</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#34C759]/10">
              <CheckCircle2 className="w-8 h-8 text-[#34C759]" />
              <div>
                <p className="text-[24px] font-bold text-[#34C759]">{result.created ?? 0}</p>
                <p className="text-[13px] text-[#8E8E93]">Шинээр нэмсэн</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#007AFF]/10">
              <CheckCircle2 className="w-8 h-8 text-[#007AFF]" />
              <div>
                <p className="text-[24px] font-bold text-[#007AFF]">{result.updated ?? 0}</p>
                <p className="text-[13px] text-[#8E8E93]">Шинэчлэгдсэн</p>
              </div>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-[14px] font-semibold text-[#FF3B30] flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> Алдааны жагсаалт ({result.errors.length})
              </p>
              <div className="max-h-48 overflow-y-auto rounded-xl bg-[#FF3B30]/5 p-3 space-y-1">
                {result.errors.map((err: string, idx: number) => (
                  <p key={idx} className="text-[13px] text-[#FF3B30]">{err}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
