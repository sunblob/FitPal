import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ADMIN_PAGE_SIZES, type AdminPage } from '@fitpal/shared';
import { api } from './api';
import type { Field, Resource, Row } from './resources';

type FormValues = Record<string, string>;

function toInput(field: Field, value: unknown): string {
  if (value == null) return '';
  if (field.type === 'lines') return Array.isArray(value) ? value.join('\n') : '';
  if (field.type === 'datetime') {
    // datetime-local ждёт локальное время без зоны
    const d = new Date(String(value));
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }
  return String(value);
}

function fromInput(field: Field, raw: string): unknown {
  const value = field.type === 'lines' ? raw : raw.trim();
  if (value === '') {
    if (field.nullable) return null;
    if (field.type === 'lines') return [];
    return undefined;
  }
  switch (field.type) {
    case 'number':
      return Number(value.replace(',', '.'));
    case 'int':
      return Math.round(Number(value));
    case 'lines':
      return value
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    case 'datetime':
      return new Date(value).toISOString();
    default:
      return value;
  }
}

/** Только изменённые поля; для новой записи — все заполненные. */
function buildPatch(fields: Field[], values: FormValues, initial: FormValues | null) {
  const patch: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = values[f.key] ?? '';
    if (initial && raw === (initial[f.key] ?? '')) continue;
    const v = fromInput(f, raw);
    if (v !== undefined) patch[f.key] = v;
  }
  return patch;
}

function EditDialog({
  resource,
  row,
  onClose,
  onSaved,
}: {
  resource: Resource;
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = row
    ? Object.fromEntries(resource.fields.map((f) => [f.key, toInput(f, row[f.key])]))
    : null;
  const [values, setValues] = useState<FormValues>(initial ?? {});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const patch = buildPatch(resource.fields, values, initial);
    if (row && Object.keys(patch).length === 0) return onClose();
    setSaving(true);
    setError(null);
    try {
      await api(row ? `${resource.path}/${encodeURIComponent(row.id)}` : resource.path, {
        method: row ? 'PATCH' : 'POST',
        body: JSON.stringify(patch),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" onSubmit={submit}>
        <h2>{row ? resource.label(row) || 'Редактирование' : 'Новая запись'}</h2>
        {row && <p className="muted small mono">{row.id}</p>}
        <div className="form-grid">
          {resource.fields.map((f) => {
            const value = values[f.key] ?? '';
            const set = (v: string) => setValues((s) => ({ ...s, [f.key]: v }));
            return (
              <label key={f.key} className={f.type === 'lines' ? 'wide' : undefined}>
                <span>
                  {f.label}
                  {f.required && ' *'}
                </span>
                {f.type === 'select' ? (
                  <select value={value} onChange={(e) => set(e.target.value)}>
                    {(f.nullable || !row) && <option value="">—</option>}
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'lines' ? (
                  <textarea rows={6} value={value} onChange={(e) => set(e.target.value)} />
                ) : (
                  <input
                    type={
                      f.type === 'datetime'
                        ? 'datetime-local'
                        : f.type === 'text'
                          ? 'text'
                          : 'number'
                    }
                    step={f.type === 'number' ? 'any' : undefined}
                    required={f.required && !row}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                  />
                )}
              </label>
            );
          })}
        </div>
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ResourcePage({
  resource,
  params,
  onError,
}: {
  resource: Resource;
  params: URLSearchParams;
  onError: (e: unknown) => void;
}) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(ADMIN_PAGE_SIZES[0]);
  const [data, setData] = useState<AdminPage<Row> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);

  const userId = params.get('userId');

  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) query.set('q', search);
    if (filter && resource.filter) query.set(resource.filter.key, filter);
    if (userId) query.set('userId', userId);
    setError(null);
    api<AdminPage<Row>>(`${resource.path}?${query.toString()}`)
      .then(setData)
      .catch((e: unknown) => {
        onError(e);
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [resource, page, pageSize, search, filter, userId, onError]);

  useEffect(load, [load]);

  // Поиск с небольшой задержкой, чтобы не дёргать API на каждую букву
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const remove = async (row: Row) => {
    if (!window.confirm(`Удалить «${resource.label(row)}»? Это нельзя отменить.`)) return;
    try {
      await api(`${resource.path}/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      load();
    } catch (e) {
      onError(e);
      window.alert(e instanceof Error ? e.message : String(e));
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="resource">
      <div className="toolbar">
        <h1>{resource.title}</h1>
        <input
          type="search"
          placeholder={resource.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {resource.filter && (
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            aria-label={resource.filter.label}
          >
            <option value="">{resource.filter.label}: все</option>
            {resource.filter.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
        {userId && (
          <span className="chip">
            Пользователь {userId.slice(0, 8)}… <a href={`#/${resource.key}`}>×</a>
          </span>
        )}
        {resource.canCreate && (
          <button className="primary" onClick={() => setEditing('new')}>
            Добавить
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {resource.columns.map((c) => (
                <th key={c.key} className={c.num ? 'num' : undefined}>
                  {c.label}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr key={row.id}>
                {resource.columns.map((c) => (
                  <td key={c.key} className={c.num ? 'num' : undefined}>
                    {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                  </td>
                ))}
                <td className="row-actions">
                  {resource.actions?.(row).map((a) => (
                    <a key={a.title} href={a.href}>
                      {a.title}
                    </a>
                  ))}
                  <button className="link" onClick={() => setEditing(row)}>
                    Изменить
                  </button>
                  {resource.canDelete && (
                    <button className="link danger" onClick={() => void remove(row)}>
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={resource.columns.length + 1} className="muted empty">
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <span className="muted">{data ? `Всего: ${data.total}` : 'Загрузка…'}</span>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ←
        </button>
        <span>
          {page} / {pages}
        </span>
        <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          →
        </button>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          aria-label="Строк на странице"
        >
          {ADMIN_PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} строк
            </option>
          ))}
        </select>
      </div>

      {editing && (
        <EditDialog
          resource={resource}
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
