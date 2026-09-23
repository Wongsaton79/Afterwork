import React, { useState } from 'react';
import { 
  DuplicateGroup, 
  deduplicateMenusInDb, 
  deleteDuplicatesForGroup, 
  deleteSingleMenuItem, 
  seedDefaultMenusSafely 
} from '../lib/menuService';
import { 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Copy, 
  Info,
  Loader2,
  X,
  Check
} from 'lucide-react';

interface DeduplicatePanelProps {
  duplicateGroups: DuplicateGroup[];
  totalRawCount: number;
  uniqueCount: number;
  onRefresh?: () => void;
}

export const DeduplicatePanel: React.FC<DeduplicatePanelProps> = ({
  duplicateGroups,
  totalRawCount,
  uniqueCount,
  onRefresh
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-app modal confirmation states (NEVER use window.confirm which is blocked in iframes)
  const [showConfirmAllModal, setShowConfirmAllModal] = useState(false);
  const [groupToClean, setGroupToClean] = useState<DuplicateGroup | null>(null);

  const totalDuplicatesToDelete = duplicateGroups.reduce((sum, g) => sum + (g.count - 1), 0);

  // Execute clean all duplicates
  const handleExecuteCleanAll = async () => {
    setShowConfirmAllModal(false);
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await deduplicateMenusInDb();
      setStatusMessage({
        type: 'success',
        text: `ลบเมนูที่ซ้ำซ้อนสำเร็จแล้ว ${res.removedCount} ฉบับ! (คงเหลือเมนูที่ดีที่สุดไว้ ${uniqueCount} รายการ)`
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Deduplicate all error:', err);
      setStatusMessage({
        type: 'error',
        text: `เกิดข้อผิดพลาดในการลบข้อมูล: ${err.message || 'ไม่สามารถติดต่อ Firebase ได้'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute clean for a specific group
  const handleExecuteCleanGroup = async () => {
    if (!groupToClean) return;
    const targetGroup = groupToClean;
    setGroupToClean(null);
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const removedCount = await deleteDuplicatesForGroup(targetGroup);
      setStatusMessage({
        type: 'success',
        text: `ลบรายการซ้ำของเมนู "${targetGroup.name}" สำเร็จ ${removedCount} ฉบับ (คงเหลือ 1 ฉบับสมบูรณ์)`
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Deduplicate group error:', err);
      setStatusMessage({
        type: 'error',
        text: `เกิดข้อผิดพลาด: ${err.message || 'ไม่สามารถลบได้'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute delete single document
  const handleDeleteSingleDoc = async (id: string, name: string) => {
    setProcessingId(id);
    setStatusMessage(null);
    try {
      await deleteSingleMenuItem(id);
      setStatusMessage({
        type: 'success',
        text: `ลบเอกสารรหัส #${id.slice(-6)} ของเมนู "${name}" เรียบร้อยแล้ว`
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Delete single error:', err);
      setStatusMessage({
        type: 'error',
        text: `เกิดข้อผิดพลาด: ${err.message || 'ไม่สามารถลบได้'}`
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSeedSafely = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await seedDefaultMenusSafely();
      setStatusMessage({
        type: 'success',
        text: `เพิ่มเมนูใหม่ ${res.inserted} รายการ (ข้าม ${res.skipped} รายการที่ชื่อซ้ำแล้วอย่างปลอดภัย)`
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: `เกิดข้อผิดพลาด: ${err.message || 'ไม่สามารถเพิ่มเมนูได้'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Alert Banner / Explanation */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">ระบบจัดการและล้างเมนูซ้ำซ้อน (Anti-Duplication Engine)</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Active Protection
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              เครื่องมือนี้ช่วยสแกนและลบเอกสารเมนูที่มีชื่อซ้ำกันออกจากฐานข้อมูล Firebase โดยจะคัดเลือกเก็บฉบับที่ดีที่สุด (มีรูปภาพและราคาถูกต้อง) ไว้ 1 รายการต่อ 1 เมนู
            </p>
            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-700 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                <strong>ระบบความปลอดภัย:</strong> ป้องกันการลบข้อมูลจริงโดยไม่ได้ตั้งใจผ่าน In-App Confirmation ไม่พึ่งพา Browser Dialog และมีระบบ Safe Seeding ป้องกันการเพิ่มเมนูซ้ำถาวร
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">เอกสารทั้งหมดใน Firebase</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{totalRawCount} ฉบับ</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">เมนูที่ไม่ซ้ำกัน (Unique Menus)</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">{uniqueCount} เมนู</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">รายการที่ซ้ำซ้อนที่ตรวจพบ</span>
          <div className="text-3xl font-black text-rose-600 mt-1">{totalDuplicatesToDelete} ฉบับ</div>
        </div>
      </div>

      {/* Action Notification */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowConfirmAllModal(true)}
          disabled={duplicateGroups.length === 0 || isProcessing}
          className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition ${
            duplicateGroups.length === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 active:scale-98 cursor-pointer'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          <span>
            {isProcessing ? 'กำลังดำเนินการ...' : `ลบเมนูซ้ำซ้อนทั้งหมด (${totalDuplicatesToDelete} ฉบับ)`}
          </span>
        </button>

        <button
          onClick={handleSeedSafely}
          disabled={isProcessing}
          className="py-4 px-6 rounded-2xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition shadow-md active:scale-98 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>เติมเมนูเริ่มต้นอย่างปลอดภัย (Safe Seed)</span>
        </button>
      </div>

      {/* Duplicates Detail List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Copy className="w-4 h-4 text-orange-500" />
            <span>รายการเมนูที่มีชื่อซ้ำใน Firebase ({duplicateGroups.length} กลุ่ม)</span>
          </h4>
          {duplicateGroups.length > 0 && (
            <span className="text-xs text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
              พบซ้ำ {totalDuplicatesToDelete} รายการที่ต้องกำจัด
            </span>
          )}
        </div>

        {duplicateGroups.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-700">ฐานข้อมูลสะอาดเรียบร้อย!</p>
            <p className="text-xs text-slate-500 mt-1">ไม่พบเมนูที่มีชื่อซ้ำกันใน Firebase แล้ว ระบบทำงานได้เต็มประสิทธิภาพ</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {duplicateGroups.map((group, idx) => (
              <div key={idx} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900">{group.name}</span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                      มีทั้งหมด {group.count} ฉบับ (ซ้ำ {group.count - 1} ฉบับ)
                    </span>
                    <span className="text-xs text-slate-400">({group.category})</span>
                  </div>

                  {/* Badges for each document ID */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {group.items.map((item, itemIdx) => {
                      const isPrimary = itemIdx === 0;
                      const isDeletingThis = processingId === item.id;
                      return (
                        <div 
                          key={item.id} 
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border font-mono transition ${
                            isPrimary 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-rose-300'
                          }`}
                        >
                          <span>#{item.id.slice(-6)}</span>
                          <span className="text-[10px] text-slate-500">({item.price}฿)</span>
                          {isPrimary ? (
                            <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-1.5 py-0.2 rounded font-sans font-bold">
                              ★ ฉบับหลัก
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDeleteSingleDoc(item.id, group.name)}
                              disabled={isProcessing || isDeletingThis}
                              className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition cursor-pointer"
                              title="ลบเอกสารฉบับนี้ออกจาก Firebase"
                            >
                              {isDeletingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Single Group Clean Button */}
                <div className="shrink-0">
                  <button
                    onClick={() => setGroupToClean(group)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบส่วนที่ซ้ำ ({group.count - 1} ฉบับ)</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Confirmation for cleaning ALL duplicates */}
      {showConfirmAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900">ยืนยันล้างเมนูซ้ำซ้อนทั้งหมด?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ระบบจะลบเอกสารเมนูที่ซ้ำซ้อนจำนวน <strong className="text-rose-600 font-bold">{totalDuplicatesToDelete} ฉบับ</strong> ออกจาก Firebase อย่างถาวร 
                โดยจะเก็บรักษาเมนูฉบับที่ดีที่สุดไว้ <strong className="text-emerald-600 font-bold">{uniqueCount} เมนู</strong> ครบถ้วน ไม่สูญหาย
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmAllModal(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteCleanAll}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                ยืนยันลบข้อมูลซ้ำ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Confirmation for cleaning single group duplicates */}
      {groupToClean && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900">ลบรายการซ้ำของเมนูนี้?</h3>
              <p className="text-sm font-bold text-slate-800">"{groupToClean.name}"</p>
              <p className="text-xs text-slate-600">
                จะทำการลบเอกสารส่วนเกิน {groupToClean.count - 1} ฉบับ และคงเหลือฉบับหลักที่ดีที่สุดไว้ 1 ฉบับ
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setGroupToClean(null)}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteCleanGroup}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
