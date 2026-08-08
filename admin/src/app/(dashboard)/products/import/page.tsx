'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { ChevronLeft, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2, PackagePlus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';

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
    <div className="space-y-5 animate-ios-fade-in mx-auto w-full max-w-3xl">
      <Link href="/products" className="inline-flex items-center gap-1 text-[13px] text-[#007AFF] font-semibold hover:text-[#0066D6] transition-colors active:scale-[0.97]">
        <ChevronLeft className="w-4 h-4" /> Бүтээгдэхүүн
      </Link>

      <PageHeader
        title="Бараа импортлох"
        subtitle="Excel/CSV файлаас бөөнөөр бараа нэмэх"
        icon={PackagePlus}
        actions={
          <button onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-[#007AFF] bg-[#007AFF]/8 hover:bg-[#007AFF]/15 border border-[#007AFF]/15 transition-all active:scale-[0.97]">
            <Download className="w-4 h-4" /> Загвар татах
          </button>
        }
      />

      {/* Upload Area */}
      <SectionCard>
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
            dragging ? 'border-[#007AFF] bg-[#007AFF]/5' : 'border-[#E8ECF0] hover:border-[#007AFF]/50 hover:bg-[#F9FAFB]'
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
              <div className="w-14 h-14 rounded-2xl bg-[#34C759]/10 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-7 h-7 text-[#34C759]" />
              </div>
              <p className="text-[15px] font-semibold text-[#1A1D26]">{file.name}</p>
              <p className="text-[13px] text-[#8C8FA3]">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#F2F4F7] flex items-center justify-center mx-auto">
                <Upload className="w-7 h-7 text-[#8C8FA3]" />
              </div>
              <p className="text-[15px] font-semibold text-[#1A1D26]">Файл сонгох эсвэл чирж оруулах</p>
              <p className="text-[13px] text-[#8C8FA3]">.xlsx, .xls, .csv файл дэмжинэ</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={handleImport} disabled={!file || uploading}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-[14px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] disabled:opacity-50 hover:brightness-105"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Импортлож байна...' : 'Импортлох'}
          </button>
        </div>
      </SectionCard>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <StatGrid cols={2}>
            <StatCard label="Шинээр нэмсэн" value={result.created ?? 0} icon={CheckCircle2} gradient="green" index={0} />
            <StatCard label="Шинэчлэгдсэн" value={result.updated ?? 0} icon={CheckCircle2} gradient="blue" index={1} />
          </StatGrid>

          {result.errors && result.errors.length > 0 && (
            <SectionCard title={`Алдааны жагсаалт (${result.errors.length})`}>
              <div className="max-h-48 overflow-y-auto rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/15 p-3 space-y-1">
                {result.errors.map((err: string, idx: number) => (
                  <p key={idx} className="text-[13px] text-[#FF3B30] flex items-start gap-1.5">
                    <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> <span>{err}</span>
                  </p>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
