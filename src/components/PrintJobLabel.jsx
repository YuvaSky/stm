import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Tag, Printer, CheckCircle } from 'lucide-react';

export default function PrintJobLabel({ order }) {
  if (!order) return null;

  const totalPages = (order.documents || []).reduce((sum, d) => sum + (d.pageCount || 1), 0);
  const colorSetting = (order.settings && order.settings[0]) ? order.settings[0].colorMode : 'BW';
  const sidesSetting = (order.settings && order.settings[0]) ? order.settings[0].sides : 'SINGLE';

  return (
    <div className="printable-job-label bg-white text-slate-900 border-2 border-slate-900 rounded-xl p-4 max-w-sm w-full shadow-lg font-mono">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">SUPERFAST PRINT SHOP</span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{order.publicOrderId}</h2>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
            PHYSICAL TRAY TAG
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-slate-100 p-2 rounded-lg border border-slate-300">
        <div>
          <span className="text-slate-500 text-[10px] block">PAGES & COPIES</span>
          <span className="font-bold text-slate-900 text-sm">{totalPages} Pages (1 Copy)</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block">TYPE & SIDES</span>
          <span className="font-bold text-slate-900 text-sm">{colorSetting} | {sidesSetting}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block">AMOUNT PAID</span>
          <span className="font-bold text-emerald-700 text-sm">₹{order.totalAmount} (PAID)</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block">CUSTOMER</span>
          <span className="font-bold text-slate-900 text-sm">{order.userId?.name || 'Customer'}</span>
        </div>
      </div>

      {/* QR Code and Barcode simulator */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-300">
        <div className="shrink-0">
          <QRCodeSVG value={order.publicOrderId} size={64} level="M" />
        </div>
        <div className="text-right flex-1 pl-3">
          <p className="text-[9px] font-bold text-slate-600">ENVELOPE / TRAY ID</p>
          <p className="text-xs font-black tracking-widest text-slate-900">{order.publicOrderId}</p>
          <p className="text-[9px] text-slate-500 mt-1">Attach to printed packet immediately after printing</p>
        </div>
      </div>
    </div>
  );
}
