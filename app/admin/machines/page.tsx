/* app/admin/machines/page.tsx */
"use client";
import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Upload, Trash2, Plus, X, ChevronDown, ArrowLeft, FileUp } from "lucide-react";

// --- TIPOS DE DATOS COMPLETOS ---
type Size = { width: number | null; length: number | null; };
type Bracket = {
  constraints: { maxLen: number; maxWid: number };
  sheetCost: { unit: "per_sheet" | "per_thousand"; value: number | null; currency?: string };
};
type Machine = {
  id?: string;
  name: string;
  printingBodies: number | null;
  sheetFeedOrientation: 'long_edge' | 'short_edge';
  margins: { clamp: number | null; tail: number | null; sides: number | null; };
  minSheetSize: Size;
  maxSheetSize: Size;
  overage: { amount: number | null; perInk: boolean; };
  minImpressionsCharge: number | null;
  setupCost: { price: number | null; perInk: boolean; };
  washCost: { price: number | null; perInk: boolean; };
  impressionCost: { pricePerThousand: number | null; perInkPass: boolean; };
  duplexChargePrice: number | null;
  specialMaterialCharges?: { setupCharge?: number | null; impressionCharge?: number | null; };
  price_brackets?: Bracket[];
  _dirty?: boolean;
  _snapshot?: Machine;
};

// --- COMPONENTES REUTILIZABLES ---
const LabeledField = ({ label, children, className = "" }: { label: string, children: React.ReactNode, className?: string }) => (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
        <span className="text-white/80 font-medium">{label}</span>
        {children}
    </label>
);

const EditableField = ({ isEditing, onStartEdit, value, onChange, placeholder, type = "text", options, className = "" }: any) => {
  const displayValue = options?.find((opt:any) => opt.value === value)?.label || value;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLElement).blur();
  };
  const commonClasses = `w-full bg-transparent px-1 py-0.5 rounded-sm transition-colors text-white/90`;
  const viewClasses = `border-b border-transparent hover:border-white/30 cursor-pointer`;
  const editClasses = `border-b border-white/60 focus:border-white focus:outline-none bg-black/30`;
  if (type === 'select') {
    return (
      <div className="relative w-full">
        <select value={value ?? ""} onChange={onChange} onBlur={() => onStartEdit(null)} onKeyDown={handleKeyDown} className={`${commonClasses} ${editClasses} h-[32px] appearance-none custom-select`}>
          {options.map((opt:any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
      </div>
    );
  }
  if (isEditing) {
    return ( <input type={type} value={value ?? ""} onChange={onChange} onBlur={() => onStartEdit(null)} onKeyDown={handleKeyDown} placeholder={placeholder} className={`${commonClasses} ${editClasses} ${className}`} autoFocus /> );
  }
  return (
    <div className={`${commonClasses} ${viewClasses} min-h-[32px] flex items-center ${className}`} onClick={onStartEdit}>
      {displayValue || <span className="text-white/40">{placeholder}</span>}
    </div>
  );
};

const CostModeSelector = ({ value, onChange, options }: { value: boolean, onChange: (isPerInk: boolean) => void, options: [string, string] }) => (
    <div className="flex items-center rounded-lg bg-zinc-800 p-0.5 w-full max-w-[150px]">
        <button type="button" onClick={() => onChange(false)} className={`flex-1 text-xs px-1 py-1 rounded-md transition-colors ${!value ? 'bg-blue-600 font-semibold' : 'hover:bg-zinc-700'}`}>
            {options[0]}
        </button>
        <button type="button" onClick={() => onChange(true)} className={`flex-1 text-xs px-1 py-1 rounded-md transition-colors ${value ? 'bg-blue-600 font-semibold' : 'hover:bg-zinc-700'}`}>
            {options[1]}
        </button>
    </div>
);

const IconButton = ({ onClick, children, title, className = "", colorClass = "text-white/60 hover:text-white" }: any) => (
    <button className={`p-1.5 rounded-md transition-colors ${colorClass} ${className}`} title={title} onClick={onClick}>
      {children}
    </button>
);

// --- COMPONENTE PRINCIPAL ---
export default function MachinesAdmin() {
  const [items, setItems] = useState<Machine[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      setMsg("Cargando máquinas...");
      try {
        const res = await fetch('/api/admin/machines');
        if (!res.ok) throw new Error("No se pudo cargar las máquinas");
        const data = await res.json();
        const list: Machine[] = (data.items || []).map((m: any) => ({
            name: m.name || "Sin Nombre", printingBodies: m.printingBodies || null,
            sheetFeedOrientation: m.sheetFeedOrientation || 'long_edge',
            margins: m.margins || { clamp: null, tail: null, sides: null },
            minSheetSize: m.minSheetSize || { width: null, length: null },
            maxSheetSize: m.maxSheetSize || { width: null, length: null },
            overage: m.overage || { amount: null, perInk: false },
            minImpressionsCharge: m.minImpressionsCharge || null,
            setupCost: m.setupCost || { price: null, perInk: false },
            washCost: m.washCost || { price: null, perInk: false },
            impressionCost: m.impressionCost || { pricePerThousand: null, perInkPass: false },
            duplexChargePrice: m.duplexChargePrice || 0,
            specialMaterialCharges: m.specialMaterialCharges || { setupCharge: null, impressionCharge: null },
            price_brackets: m.price_brackets || [],
            ...m, _dirty: false, _snapshot: undefined,
        }));
        setItems(list);
        setMsg(list.length > 0 ? `${list.length} máquinas cargadas.` : "No hay máquinas.");
      } catch (error: any) { setMsg("Error al cargar: " + error.message); }
    })();
  }, []);


  const toNum = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : null; };

  function mut(i: number, patch: Partial<Machine>) {
    setItems(p => p.map((x, ix) => {
      if (ix !== i) return x;
      const snapshot = x._snapshot ?? structuredClone(x);
      const newState = { ...x, ...patch };
      if (patch.margins) newState.margins = { ...x.margins, ...patch.margins };
      if (patch.minSheetSize) newState.minSheetSize = { ...x.minSheetSize, ...patch.minSheetSize };
      if (patch.maxSheetSize) newState.maxSheetSize = { ...x.maxSheetSize, ...patch.maxSheetSize };
      if (patch.overage) newState.overage = { ...x.overage, ...patch.overage };
      if (patch.setupCost) newState.setupCost = { ...x.setupCost, ...patch.setupCost };
      if (patch.washCost) newState.washCost = { ...x.washCost, ...patch.washCost };
      if (patch.impressionCost) newState.impressionCost = { ...x.impressionCost, ...patch.impressionCost };
      if (patch.specialMaterialCharges) newState.specialMaterialCharges = { ...x.specialMaterialCharges, ...patch.specialMaterialCharges };
      return { ...newState, _dirty: true, _snapshot: snapshot };
    }));
  }

  function addMachine() {
    const newMachineId = `new-${Date.now()}`;
    const newMachine: Machine = {
        id: newMachineId, name: "Nueva Máquina", printingBodies: 4,
        sheetFeedOrientation: 'long_edge', margins: { clamp: 10, tail: 10, sides: 5 },
        minSheetSize: { width: 210, length: 297 }, maxSheetSize: { width: 720, length: 1020 },
        overage: { amount: 50, perInk: false }, minImpressionsCharge: 1000,
        setupCost: { price: 2000, perInk: false }, washCost: { price: 500, perInk: false },
        impressionCost: { pricePerThousand: 300, perInkPass: false }, duplexChargePrice: 0,
        specialMaterialCharges: { setupCharge: 1000, impressionCharge: 50 },
        price_brackets: [], _dirty: true
    };
    setItems(p => [newMachine, ...p]);
    setEditingField(`${newMachineId}-name`);
  }
  function cancelCardChanges(i: number) { 
    const snap = items[i]._snapshot;
    if (!snap) { setItems(p => p.filter((_, ix) => ix !== i)); return; }
    setItems(p => p.map((x, ix) => ix === i ? { ...snap, _dirty: false, _snapshot: undefined } : x));
  }
  async function saveCardChanges(i: number) {
    const machineToSave = items[i];
    const { _dirty, _snapshot, ...payload } = machineToSave;
    setMsg(`Guardando "${payload.name}"...`);
    try {
        const r = await fetch("/api/admin/machines", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [payload] }) });
        if (!r.ok) throw new Error("Falló el guardado");
        const savedItem = (await r.json()).items[0];
        setItems(p => p.map((x, ix) => ix === i ? { ...savedItem, _dirty: false, _snapshot: undefined } : x));
        setMsg(`Máquina "${savedItem.name}" guardada.`);
    } catch (e: any) { setMsg("Error al guardar: " + e.message); }
  }
  async function deleteMachine(id?: string, idx?: number) {
    if (!confirm("¿Eliminar máquina?")) return;
    try {
        if (id && !id.startsWith('new-')) {
            await fetch(`/api/admin/machines?id=${id}`, { method: "DELETE" });
        }
        setItems(p => p.filter((_, i) => i !== (idx ?? -1)));
        setMsg("Máquina eliminada.");
    } catch (e: any) { setMsg("Error al eliminar: " + e.message); }
  }

  function updBracket(mi: number, bi: number, patch: Partial<Bracket>) {
    const curr = items[mi].price_brackets ?? [];
    const next = curr.map((x, idx) => idx === bi ? ({ ...x, ...patch }) : x);
    mut(mi, { price_brackets: next });
  }
  function removeBracket(mi: number, bi: number) {
    const curr = items[mi].price_brackets ?? [];
    mut(mi, { price_brackets: curr.filter((_, idx) => idx !== bi) });
  }
  
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <a href="/admin" title="Volver"><ArrowLeft size={20}/></a>
        <h1 className="text-2xl font-bold mr-auto">Máquinas</h1>
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
        <button title="Agregar Máquina" onClick={addMachine}><Plus size={20}/></button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((m, i) => (
          <div key={m.id ?? i} className="rounded-xl border border-white/15 bg-black/40 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <EditableField isEditing={editingField === `${m.id}-name`} onStartEdit={() => setEditingField(`${m.id}-name`)} value={m.name} onChange={(e:any) => mut(i, {name: e.target.value})} className="text-lg font-semibold" />
                <div className="flex items-center gap-1.5">
                    {m._dirty && (<><IconButton title="Deshacer" onClick={() => cancelCardChanges(i)}><RotateCcw size={18} /></IconButton><IconButton title="Guardar" onClick={() => saveCardChanges(i)} colorClass="text-green-400"><Upload size={18} /></IconButton></>)}
                    <IconButton title="Eliminar" onClick={()=>deleteMachine(m.id, i)} colorClass="text-red-500"><Trash2 size={18}/></IconButton>
                </div>
            </div>
            
            <div className="border-b border-white/10 pb-4">
                <h3 className="text-base font-semibold text-white/90 mb-3">Propiedades Físicas</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4 items-end">
                        <LabeledField label="Cuerpos" className="col-span-3"><EditableField type="number" isEditing={editingField === `${m.id}-bodies`} onStartEdit={() => setEditingField(`${m.id}-bodies`)} value={m.printingBodies} onChange={(e:any) => mut(i, {printingBodies: toNum(e.target.value)})}/></LabeledField>
                        <LabeledField label="Entrada Papel" className="col-span-3"><EditableField type="select" value={m.sheetFeedOrientation} onStartEdit={() => {}} onChange={(e:any) => mut(i, {sheetFeedOrientation: e.target.value as any})} options={[{value: 'long_edge', label: 'Lado Largo'}, {value: 'short_edge', label: 'Lado Corto'}]} /></LabeledField>
                        <LabeledField label="Márgenes (P/C/L)" className="col-span-6"><div className="grid grid-cols-3 gap-2"><EditableField type="number" isEditing={editingField === `${m.id}-clamp`} onStartEdit={() => setEditingField(`${m.id}-clamp`)} value={m.margins.clamp} onChange={(e:any) => mut(i, {margins: { ...m.margins, clamp: toNum(e.target.value)}})}/><EditableField type="number" isEditing={editingField === `${m.id}-tail`} onStartEdit={() => setEditingField(`${m.id}-tail`)} value={m.margins.tail} onChange={(e:any) => mut(i, {margins: { ...m.margins, tail: toNum(e.target.value)}})} /><EditableField type="number" isEditing={editingField === `${m.id}-sides`} onStartEdit={() => setEditingField(`${m.id}-sides`)} value={m.margins.sides} onChange={(e:any) => mut(i, {margins: { ...m.margins, sides: toNum(e.target.value)}})} /></div></LabeledField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <LabeledField label="Tamaño Mín. Pliego (Ancho x Largo)"><div className="flex gap-2"><EditableField type="number" isEditing={editingField === `${m.id}-minW`} onStartEdit={() => setEditingField(`${m.id}-minW`)} value={m.minSheetSize.width} onChange={(e:any) => mut(i, {minSheetSize: { ...m.minSheetSize, width: toNum(e.target.value)!}})}/><EditableField type="number" isEditing={editingField === `${m.id}-minL`} onStartEdit={() => setEditingField(`${m.id}-minL`)} value={m.minSheetSize.length} onChange={(e:any) => mut(i, {minSheetSize: { ...m.minSheetSize, length: toNum(e.target.value)!}})} /></div></LabeledField>
                        <LabeledField label="Tamaño Máx. Pliego (Ancho x Largo)"><div className="flex gap-2"><EditableField type="number" isEditing={editingField === `${m.id}-maxW`} onStartEdit={() => setEditingField(`${m.id}-maxW`)} value={m.maxSheetSize.width} onChange={(e:any) => mut(i, {maxSheetSize: { ...m.maxSheetSize, width: toNum(e.target.value)!}})}/><EditableField type="number" isEditing={editingField === `${m.id}-maxL`} onStartEdit={() => setEditingField(`${m.id}-maxL`)} value={m.maxSheetSize.length} onChange={(e:any) => mut(i, {maxSheetSize: { ...m.maxSheetSize, length: toNum(e.target.value)!}})} /></div></LabeledField>
                    </div>
                </div>
            </div>

            <div className="border-b border-white/10 pb-4">
                <h3 className="text-base font-semibold text-white/90 mb-3">Reglas de Costeo</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <LabeledField label="Demasía (Pliegos Extra)"><div className="flex items-center gap-2"><EditableField type="number" isEditing={editingField === `${m.id}-overage`} onStartEdit={() => setEditingField(`${m.id}-overage`)} value={m.overage.amount} onChange={(e:any) => mut(i, {overage: { ...m.overage, amount: toNum(e.target.value)}})}/><CostModeSelector value={m.overage.perInk} onChange={c => mut(i, {overage: { ...m.overage, perInk: c}})} options={['Fija', 'Por Tinta']} /></div></LabeledField>
                    <LabeledField label="Mínimo de Impresión (Pliegos)"><EditableField type="number" isEditing={editingField === `${m.id}-minImp`} onStartEdit={() => setEditingField(`${m.id}-minImp`)} value={m.minImpressionsCharge} onChange={(e:any) => mut(i, {minImpressionsCharge: toNum(e.target.value)})}/></LabeledField>
                    <LabeledField label="Costo de Postura"><div className="flex items-center gap-2"><EditableField type="number" isEditing={editingField === `${m.id}-setup`} onStartEdit={() => setEditingField(`${m.id}-setup`)} value={m.setupCost.price} onChange={(e:any) => mut(i, {setupCost: { ...m.setupCost, price: toNum(e.target.value)}})}/><CostModeSelector value={m.setupCost.perInk} onChange={c => mut(i, {setupCost: { ...m.setupCost, perInk: c}})} options={['Fijo', 'Por Tinta']} /></div></LabeledField>
                    <LabeledField label="Costo de Lavado"><div className="flex items-center gap-2"><EditableField type="number" isEditing={editingField === `${m.id}-wash`} onStartEdit={() => setEditingField(`${m.id}-wash`)} value={m.washCost.price} onChange={(e:any) => mut(i, {washCost: { ...m.washCost, price: toNum(e.target.value)}})}/><CostModeSelector value={m.washCost.perInk} onChange={c => mut(i, {washCost: { ...m.washCost, perInk: c}})} options={['Fijo', 'Por Tinta']} /></div></LabeledField>
                    <LabeledField label="Costo por Millar"><div className="flex items-center gap-2"><EditableField type="number" isEditing={editingField === `${m.id}-imp`} onStartEdit={() => setEditingField(`${m.id}-imp`)} value={m.impressionCost.pricePerThousand} onChange={(e:any) => mut(i, {impressionCost: { ...m.impressionCost, pricePerThousand: toNum(e.target.value)}})}/><CostModeSelector value={m.impressionCost.perInkPass} onChange={c => mut(i, {impressionCost: { ...m.impressionCost, perInkPass: c}})} options={['Por Pliego', 'Por Tinta']} /></div></LabeledField>
                    <LabeledField label="Costo Extra por Frente y Dorso"><EditableField type="number" isEditing={editingField === `${m.id}-duplex`} onStartEdit={() => setEditingField(`${m.id}-duplex`)} value={m.duplexChargePrice} onChange={(e:any) => mut(i, {duplexChargePrice: toNum(e.target.value)})}/></LabeledField>
                    <LabeledField label="Extra: Postura (Material Especial)"><EditableField type="number" isEditing={editingField === `${m.id}-specSetup`} onStartEdit={() => setEditingField(`${m.id}-specSetup`)} value={m.specialMaterialCharges?.setupCharge} onChange={(e:any) => mut(i, {specialMaterialCharges: { ...m.specialMaterialCharges, setupCharge: toNum(e.target.value)}})}/></LabeledField>
                    <LabeledField label="Extra: Millar (Material Especial)"><EditableField type="number" isEditing={editingField === `${m.id}-specImp`} onStartEdit={() => setEditingField(`${m.id}-specImp`)} value={m.specialMaterialCharges?.impressionCharge} onChange={(e:any) => mut(i, {specialMaterialCharges: { ...m.specialMaterialCharges, impressionCharge: toNum(e.target.value)}})}/></LabeledField>
                </div>
            </div>
            
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm text-white/80 font-semibold">Costos por Formato (Price Brackets)</h3>
                <IconButton title="Añadir Tramo" onClick={() => {
                    const curr = m.price_brackets ?? [];
                    const next: Bracket = { constraints: { maxLen: 0, maxWid: 0 }, sheetCost: { unit: "per_sheet", value: 0, currency: "UYU" } };
                    mut(i, { price_brackets: [next, ...curr] });
                  }} className="bg-green-600/30 hover:bg-green-600/50 text-green-300"
                ><Plus size={16}/></IconButton>
              </div>

              {(m.price_brackets ?? []).length === 0 && <div className="text-xs text-white/60 py-2">Sin tramos</div>}

              <div className="space-y-1">
                {(m.price_brackets ?? []).map((b, bi) => (
                  <div key={bi} className="relative rounded-lg p-2 transition-colors border border-transparent hover:bg-black/20">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pr-8">
                      <LabeledField label="Ancho × Largo"><div className="flex items-center gap-2"><EditableField isEditing={editingField === `${m.id}-b${bi}-len`} onStartEdit={() => setEditingField(`${m.id}-b${bi}-len`)} type="number" value={b.constraints?.maxLen} onChange={(e:any) => updBracket(i, bi, { constraints: { ...(b.constraints || { maxWid: 0 }), maxLen: Number(e.target.value || 0) } })} /><span className="text-white/50">×</span><EditableField isEditing={editingField === `${m.id}-b${bi}-wid`} onStartEdit={() => setEditingField(`${m.id}-b${bi}-wid`)} type="number" value={b.constraints?.maxWid} onChange={(e:any) => updBracket(i, bi, { constraints: { ...(b.constraints || { maxLen: 0 }), maxWid: Number(e.target.value || 0) } })} /></div></LabeledField>
                      <LabeledField label="Unidad y Precio"><div className="flex items-center gap-2"><EditableField type="select" value={b.sheetCost?.unit} onStartEdit={setEditingField} onChange={(e:any) => updBracket(i, bi, { sheetCost: { ...(b.sheetCost || { value: 0 }), unit: e.target.value as any } })} options={[{value: "per_sheet", label: "por hoja"}, {value: "per_thousand", label: "por millar"}]} /><EditableField isEditing={editingField === `${m.id}-b${bi}-price`} onStartEdit={() => setEditingField(`${m.id}-b${bi}-price`)} type="number" value={b.sheetCost?.value} onChange={(e:any) => updBracket(i, bi, { sheetCost: { ...(b.sheetCost || { unit: "per_sheet" }), value: toNum(e.target.value) } })} /></div></LabeledField>
                    </div>
                    <IconButton title="Eliminar tramo" onClick={() => removeBracket(i, bi)} className="absolute top-1 right-1" colorClass="text-red-500 hover:text-red-400 opacity-50 hover:opacity-100"><Trash2 size={16}/></IconButton>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
       <style jsx global>{`
        .inp { background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; padding: 6px 10px; transition: all 0.2s; color: white; }
        .inp:focus { background-color: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.4); outline: none; }
        .custom-select option { background-color: #222; color: #eee; }
      `}</style>
    </div>
  );
}