import { useState } from 'react';
import { Plus, Pencil, Trash2, Database, RotateCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { WORKING_RULE_PRESETS, type AppState, type Employee, type Weekday, type WorkingRulePreset } from '../types';
import { Card, Field, Modal, SectionHeader, Tabs } from './ui';

type Collection = 'employees' | 'brands' | 'processes' | 'pods' | 'allocations' | 'holidays' | 'leaves';

type FieldType = 'text' | 'number' | 'date' | 'select' | 'multi' | 'weekdays' | 'rule' | 'color';
interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj);
}
function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.');
  let cursor = obj;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) cursor[key] = value;
    else {
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
      cursor = cursor[key] as Record<string, unknown>;
    }
  });
}

export default function DataManager() {
  const { state, setCollection, reset } = useApp();
  const [collection, setCollectionName] = useState<Collection>('allocations');
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');

  const options = (key: keyof AppState): Array<{ value: string; label: string }> => {
    switch (key) {
      case 'employees': return state.employees.map((e) => ({ value: e.id, label: e.name }));
      case 'brands': return state.brands.map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` }));
      case 'processes': return state.processes.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }));
      case 'pods': return state.pods.map((p) => ({ value: p.id, label: p.name }));
      default: return [];
    }
  };

  const schemas: Record<Collection, { fields: FieldDef[]; columns: Array<{ key: string; label: string; render?: (row: never) => string }>; title: string; note: string }> = {
    employees: {
      title: 'Employees', note: '30 people across four pods. Edit assignments here; the roster regenerates automatically.',
      fields: [
        { key: 'name', label: 'Full name', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'podId', label: 'Pod', type: 'select', options: options('pods') },
        { key: 'preferredOffDays', label: 'Preferred off days', type: 'weekdays' },
        { key: 'maxConsecutiveDays', label: 'Max consecutive days', type: 'number', min: 3, max: 14 },
        { key: 'skills', label: 'Trained processes', type: 'multi', options: options('processes') },
        { key: 'joiningDate', label: 'Joining date', type: 'date' },
      ],
      columns: [
        { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' },
        { key: 'podId', label: 'Pod', render: (r) => state.pods.find((p) => p.id === (r as never as Employee).podId)?.name ?? '' },
        { key: 'preferredOffDays', label: 'Preferred off', render: (r) => ((r as never as Employee).preferredOffDays ?? []).map((d: Weekday) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') },
      ],
    },
    brands: {
      title: 'Brands', note: 'Client accounts. Coverage rules are configured per allocation, not per brand.',
      fields: [
        { key: 'name', label: 'Brand name', type: 'text' }, { key: 'code', label: 'Code', type: 'text' },
        { key: 'category', label: 'Category', type: 'select', options: [{ value: 'D2C', label: 'D2C' }, { value: 'Marketplace', label: 'Marketplace' }, { value: 'Retail', label: 'Retail' }] },
        { key: 'color', label: 'Colour', type: 'color' },
      ],
      columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'category', label: 'Category' }],
    },
    processes: {
      title: 'Processes', note: 'Customer Support, Abandoned Cart Conversion, Retention and NDR.',
      fields: [
        { key: 'name', label: 'Process name', type: 'text' }, { key: 'code', label: 'Code', type: 'text' }, { key: 'color', label: 'Colour', type: 'color' },
      ],
      columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'color', label: 'Colour' }],
    },
    pods: {
      title: 'Pods', note: 'Each pod has a lead who oversees its employees.',
      fields: [
        { key: 'name', label: 'Pod name', type: 'text' },
        { key: 'leadEmployeeId', label: 'Pod lead', type: 'select', options: options('employees') },
        { key: 'color', label: 'Colour', type: 'color' },
      ],
      columns: [
        { key: 'name', label: 'Pod' },
        { key: 'leadEmployeeId', label: 'Lead', render: (r) => state.employees.find((e) => e.id === (r as Record<string, string>).leadEmployeeId)?.name ?? (r as Record<string, string>).leadEmployeeId },
        { key: 'color', label: 'Colour' },
      ],
    },
    allocations: {
      title: 'Brand-process allocations', note: 'The core configuration: who can cover a process, the minimum staffing level, and the operating calendar.',
      fields: [
        { key: 'brandId', label: 'Brand', type: 'select', options: options('brands') },
        { key: 'processId', label: 'Process', type: 'select', options: options('processes') },
        { key: 'employeeIds', label: 'Eligible employees', type: 'multi', options: options('employees') },
        { key: 'minCoverage', label: 'Minimum coverage / day', type: 'number', min: 1, max: 10 },
        { key: 'rulePreset', label: 'Operating rule', type: 'rule', options: Object.entries(WORKING_RULE_PRESETS).map(([value, r]) => ({ value, label: r.label })) },
      ],
      columns: [
        { key: 'brandId', label: 'Brand', render: (r) => state.brands.find((b) => b.id === (r as Record<string, string>).brandId)?.name ?? '' },
        { key: 'processId', label: 'Process', render: (r) => state.processes.find((p) => p.id === (r as Record<string, string>).processId)?.code ?? '' },
        { key: 'employeeIds', label: 'Employees', render: (r) => `${((r as Record<string, string[]>).employeeIds ?? []).length} assigned` },
        { key: 'minCoverage', label: 'Min / day' },
        { key: 'rule.label', label: 'Rule' },
      ],
    },
    holidays: {
      title: 'Public holidays', note: 'Holidays are global; each allocation decides whether its process works on them.',
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'name', label: 'Holiday name', type: 'text' }],
      columns: [{ key: 'date', label: 'Date' }, { key: 'name', label: 'Name' }],
    },
    leaves: {
      title: 'Leaves & comp-offs', note: 'Approved time off is a hard constraint: nobody is scheduled on these dates.',
      fields: [
        { key: 'employeeId', label: 'Employee', type: 'select', options: options('employees') },
        { key: 'startDate', label: 'From', type: 'date' }, { key: 'endDate', label: 'To', type: 'date' },
        { key: 'type', label: 'Type', type: 'select', options: [{ value: 'PLANNED', label: 'Planned' }, { value: 'COMP_OFF', label: 'Comp-off' }, { value: 'SICK', label: 'Sick' }] },
        { key: 'reason', label: 'Reason', type: 'text' },
      ],
      columns: [
        { key: 'employeeId', label: 'Employee', render: (r) => state.employees.find((e) => e.id === (r as Record<string, string>).employeeId)?.name ?? '' },
        { key: 'startDate', label: 'From' }, { key: 'endDate', label: 'To' }, { key: 'type', label: 'Type' }, { key: 'reason', label: 'Reason' },
      ],
    },
  };

  const items = state[collection] as unknown as Array<Record<string, unknown>>;
  const schema = schemas[collection];

  const openNew = () => {
    setError(''); setIsNew(true);
    const base: Record<string, unknown> = {};
    schema.fields.forEach((f) => {
      if (f.type === 'multi') base[f.key] = [];
      else if (f.type === 'weekdays') base[f.key] = [];
      else if (f.type === 'number') base[f.key] = f.min ?? 1;
      else if (f.type === 'rule') base[f.key] = Object.keys(WORKING_RULE_PRESETS)[0];
      else base[f.key] = f.type === 'date' ? `${state.rosterMonth}-01` : '';
    });
    setEditing(base);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setError(''); setIsNew(false);
    const copy = structuredClone(row) as Record<string, unknown>;
    if (collection === 'allocations' && copy.rule && typeof copy.rule === 'object') {
      copy.rulePreset = (copy.rule as { id: string }).id;
    }
    setEditing(copy);
  };

  const save = () => {
    if (!editing) return;
    if (collection === 'allocations') {
      const ids = (editing.employeeIds as string[]) ?? [];
      const min = Number(editing.minCoverage) || 1;
      if (ids.length === 0) { setError('Select at least one eligible employee.'); return; }
      if (min > ids.length) { setError('Minimum coverage cannot exceed the number of eligible employees.'); return; }
      editing.minCoverage = min;
      const preset = String(editing.rulePreset || Object.keys(WORKING_RULE_PRESETS)[0]) as WorkingRulePreset;
      const presetDef = WORKING_RULE_PRESETS[preset];
      editing.rule = {
        id: preset,
        label: presetDef.label,
        workingDays: [...presetDef.workingDays],
        worksOnHolidays: presetDef.worksOnHolidays,
      };
      delete editing.rulePreset;
      if (editing.exceptionDates === undefined) editing.exceptionDates = [];
    }
    if (collection === 'employees') {
      const offs = (editing.preferredOffDays as number[]) ?? [];
      if (offs.length === 0) { setError('Select at least one preferred off day.'); return; }
      editing.maxConsecutiveDays = Number(editing.maxConsecutiveDays) || 6;
    }
    if (collection === 'leaves' && String(editing.startDate) > String(editing.endDate)) {
      setError('End date must be on or after the start date.'); return;
    }
    const idKey = collection === 'holidays' ? 'date' : 'id';
    if (isNew && !editing[idKey]) {
      editing[idKey] = collection === 'holidays' ? String(editing.date) : `${collection.slice(0, 3)}-${Date.now()}`;
    }
    const next = isNew ? [...items, editing] : items.map((row) => (row[idKey] === (editing as Record<string, unknown>)[idKey] ? editing : row));
    setCollection(collection, next as never);
    setEditing(null);
  };

  const remove = (row: Record<string, unknown>) => {
    const idKey = collection === 'holidays' ? 'date' : 'id';
    setCollection(collection, items.filter((i) => i[idKey] !== row[idKey]) as never);
  };

  return (
    <div className="page-stack">
      <Card>
        <SectionHeader
          title="Configuration & sample data"
          subtitle="Everything the scheduler reads is editable here. Changes regenerate the current roster and revalidate all constraints."
          action={<button className="btn btn-ghost" onClick={() => { if (confirm('Restore the original sample dataset? All edits will be lost.')) reset(); }}><RotateCcw size={15} /> Reset sample data</button>}
        />
        <Tabs
          active={collection}
          onChange={(c) => setCollectionName(c)}
          tabs={(Object.keys(schemas) as Collection[]).map((c) => ({ id: c, label: `${schemas[c].title} (${(state[c] as unknown[]).length})` }))}
        />
      </Card>

      <Card>
        <SectionHeader title={schema.title} subtitle={schema.note} action={<button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Add new</button>} />
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>{schema.columns.map((c) => <th key={c.key}>{c.label}</th>)}<th /></tr></thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={String(row.id ?? row.date ?? i)}>
                  {schema.columns.map((c) => <td key={c.key}>{c.render ? c.render(row as never) : String(getPath(row, c.key) ?? '—')}</td>)}
                  <td className="row-actions">
                    <button className="icon-btn" onClick={() => openEdit(row)} title="Edit"><Pencil size={15} /></button>
                    <button className="icon-btn danger" onClick={() => remove(row)} title="Delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <Modal title={`${isNew ? 'Add' : 'Edit'} ${schema.title.replace(/s$/, '')}`} onClose={() => setEditing(null)} wide>
          <div className="form-grid two">
            {schema.fields.map((field) => (
              <Field key={field.key} label={field.label}>
                <FormInput field={field} value={getPath(editing, field.key)} onChange={(v) => setPath(editing, field.key, v)} />
              </Field>
            ))}
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="button-row end">
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save changes</button>
          </div>
        </Modal>
      )}

      <div className="callout full"><Database size={16} /> State is persisted in your browser's localStorage. Use <strong>Reset</strong> to return to the original 30-employee sample dataset at any time.</div>
    </div>
  );
}

function FormInput({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (value: unknown) => void }) {
  if (field.type === 'select') {
    return <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}><option value="">— select —</option>{field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  }
  if (field.type === 'multi') {
    const arr = (value as string[]) ?? [];
    return (
      <div className="check-list">
        {field.options?.map((o) => (
          <label key={o.value} className="check-item">
            <input type="checkbox" checked={arr.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...arr, o.value] : arr.filter((v) => v !== o.value))} />
            {o.label}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === 'weekdays') {
    const arr = (value as Weekday[]) ?? [];
    return (
      <div className="weekday-list">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
          <button key={label} type="button" className={`day-toggle ${arr.includes(i as Weekday) ? 'on' : ''}`} onClick={() => onChange(arr.includes(i as Weekday) ? arr.filter((d) => d !== i) : [...arr, i as Weekday])}>{label}</button>
        ))}
      </div>
    );
  }
  if (field.type === 'rule') {
    return <select value={String(getRulePreset(value))} onChange={(e) => {
      const preset = e.target.value as WorkingRulePreset;
      onChange(preset);
    }}>{field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  }
  return <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'color' ? 'color' : 'text'} value={String(value ?? '')} min={field.min} max={field.max} onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)} />;
}

function getRulePreset(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: string }).id);
  return Object.keys(WORKING_RULE_PRESETS)[0];
}
