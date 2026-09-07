import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Category, Post, Product, Unit } from '../api';
import { Banner } from '../components';
import { fmtDate, money, pickLang } from '../i18n';
import { useStore } from '../store';
import { colors, radius } from '../theme';
import {
  Badge, Button, Card, Chips, DateField, Divider, Empty, Field, Img, Loading, Row,
  Select, Sheet, Switch, Txt, openUrl, useLayout, useT,
} from '../ui';
import { TableHead, TableRow } from './AdminDash';

// -------------------------------------------------------------- products
const emptyProduct = {
  sku: '', slug: '', name_ar: '', name_en: '', brand: '', model: '', category_id: 0,
  short_ar: '', short_en: '', description_ar: '', description_en: '',
  image: '', images: [] as string[], specs: [] as any[],
  is_for_rent: true, is_for_sale: false, is_active: true, is_featured: false,
  sale_price: 0, rent_daily: 0, rent_weekly: 0, rent_monthly: 0,
  deposit: 0, late_fee_per_day: 0, min_rent_days: 1,
  requires_training: false, warranty_months: 0,
};

export function AdminProducts() {
  const { lang, toast, go } = useStore();
  const { t } = useT();
  const { isPhone } = useLayout();
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        api.get<Product[]>('/api/products', { q: q || undefined, include_inactive: true, limit: 300 }),
        api.get<Category[]>('/api/categories', { include_inactive: true }),
      ]);
      setItems(p); setCats(c);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [q]);
  useEffect(() => { const i = setTimeout(load, 250); return () => clearTimeout(i); }, [load]);

  const startNew = () => { setEditing({ ...emptyProduct, category_id: cats[0]?.id || 0 }); setOpen(true); };
  const startEdit = (p: Product) => {
    setEditing({ ...p, specs: p.specs || [], images: p.images || [] });
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...editing };
      delete body.id; delete body.rating_avg; delete body.rating_count;
      delete body.units_total; delete body.units_available;
      delete body.category_name_ar; delete body.category_name_en;
      if (!body.slug) body.slug = body.name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (editing.id) await api.put(`/api/products/${editing.id}`, body);
      else await api.post('/api/products', body);
      toast(t('saved')); setOpen(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (p: Product) => {
    try { await api.del(`/api/products/${p.id}`); toast(t('deleted')); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const setF = (k: string, v: any) => setEditing((e: any) => ({ ...e, [k]: v }));

  return (
    <View style={{ gap: 16 }}>
      <Row between center wrap gap={10}>
        <Txt bold="800" size={24}>{t('products')} ({items.length})</Txt>
        <Button icon="＋" title={t('newProduct')} onPress={startNew} />
      </Row>
      <Field value={q} onChangeText={setQ} placeholder={t('search')} />
      {err ? <Banner level="danger" text={err} /> : null}

      {loading ? <Loading /> : items.length === 0 ? <Empty icon="🩺" title={t('noResults')} /> : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {!isPhone ? <TableHead cols={[
            lang === 'ar' ? 'الجهاز' : 'Device', 'SKU', t('perDay'), t('perMonth'),
            lang === 'ar' ? 'الوحدات' : 'Units', t('status'), '']} /> : null}
          {items.map((p, i) => isPhone ? (
            <View key={p.id} style={{ padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <Row gap={10}>
                <Img uri={p.image} ratio={1} style={{ width: 54 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt bold="700" size={13.5} numberOfLines={2}>{pickLang(p, 'name', lang)}</Txt>
                  <Txt size={11} color={colors.muted}>{p.sku} · {money(p.rent_daily, lang)}{t('perDay')}</Txt>
                  <Row gap={6} wrap>
                    <Badge small tone={p.is_active ? 'available' : 'retired'}
                      label={p.is_active ? t('us_available') : t('us_retired')} />
                    <Badge small label={`${p.units_available}/${p.units_total}`} />
                  </Row>
                  <Row gap={6}>
                    <Button small variant="secondary" title={t('edit')} onPress={() => startEdit(p)} />
                    <Button small variant="ghost" title={t('delete')} onPress={() => remove(p)} />
                  </Row>
                </View>
              </Row>
            </View>
          ) : (
            <TableRow key={p.id} alt={i % 2 === 1} cells={[
              <Row key="n" center gap={9}>
                <Img uri={p.image} ratio={1} style={{ width: 38 }} />
                <View style={{ flex: 1 }}>
                  <Txt size={12.5} bold="700" numberOfLines={1}>{pickLang(p, 'name', lang)}</Txt>
                  <Txt size={10.5} color={colors.muted}>{p.brand}</Txt>
                </View>
              </Row>,
              p.sku, money(p.rent_daily, lang), money(p.rent_monthly, lang),
              <Badge key="u" small tone={p.units_available > 0 ? 'available' : 'maintenance'}
                label={`${p.units_available}/${p.units_total}`} />,
              <Badge key="s" small tone={p.is_active ? 'available' : 'retired'}
                label={p.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'مخفي' : 'Hidden')} />,
              <Row key="a" gap={5}>
                <Button small variant="secondary" title={t('edit')} onPress={() => startEdit(p)} />
                <Button small variant="ghost" title="🗑" onPress={() => remove(p)} />
              </Row>,
            ]} />
          ))}
        </Card>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} wide
        title={editing?.id ? t('edit') : t('newProduct')}>
        {editing ? (
          <View style={{ gap: 14 }}>
            <Row gap={10} wrap>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="الاسم (عربي)" value={editing.name_ar} onChangeText={(v) => setF('name_ar', v)} /></View>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="Name (English)" value={editing.name_en} onChangeText={(v) => setF('name_en', v)} /></View>
            </Row>
            <Row gap={10} wrap>
              <View style={{ flex: 1, minWidth: 130 }}><Field label="SKU" value={editing.sku} onChangeText={(v) => setF('sku', v)} /></View>
              <View style={{ flex: 1, minWidth: 130 }}><Field label="Slug" value={editing.slug} onChangeText={(v) => setF('slug', v)} hint="auto" /></View>
              <View style={{ flex: 1, minWidth: 130 }}><Field label={t('brand')} value={editing.brand} onChangeText={(v) => setF('brand', v)} /></View>
              <View style={{ flex: 1, minWidth: 130 }}><Field label="Model" value={editing.model} onChangeText={(v) => setF('model', v)} /></View>
            </Row>
            <Select label={t('categories')} value={editing.category_id}
              onChange={(v) => setF('category_id', v)}
              options={cats.map((c) => ({ value: c.id, label: `${c.icon} ${pickLang(c, 'name', lang)}` }))} />
            <Field label="صورة (رابط)" value={editing.image} onChangeText={(v) => setF('image', v)}
              placeholder="https://…" />
            <Row gap={10} wrap>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="وصف مختصر (ع)" value={editing.short_ar} onChangeText={(v) => setF('short_ar', v)} multiline /></View>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="Short (EN)" value={editing.short_en} onChangeText={(v) => setF('short_en', v)} multiline /></View>
            </Row>
            <Row gap={10} wrap>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="الوصف الكامل (ع)" value={editing.description_ar} onChangeText={(v) => setF('description_ar', v)} multiline /></View>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="Description (EN)" value={editing.description_en} onChangeText={(v) => setF('description_en', v)} multiline /></View>
            </Row>

            <Divider v={4} />
            <Txt bold="800" size={15}>💰 {lang === 'ar' ? 'التسعير' : 'Pricing'}</Txt>
            <Row gap={10} wrap>
              {[
                ['rent_daily', t('perDay')], ['rent_weekly', t('perWeek')], ['rent_monthly', t('perMonth')],
                ['deposit', t('deposit')], ['late_fee_per_day', t('lateFee')], ['sale_price', t('forSale')],
                ['min_rent_days', t('minRent')], ['warranty_months', t('warranty')],
              ].map(([k, l]) => (
                <View key={k} style={{ flex: 1, minWidth: 130 }}>
                  <Field label={l as string} keyboard="numeric" value={String(editing[k as string] ?? 0)}
                    onChangeText={(v) => setF(k as string, Number(v.replace(/[^\d.]/g, '')) || 0)} />
                </View>
              ))}
            </Row>

            <Divider v={4} />
            <Row gap={16} wrap>
              <View style={{ minWidth: 170 }}><Switch label={t('forRent')} value={editing.is_for_rent} onChange={(v) => setF('is_for_rent', v)} /></View>
              <View style={{ minWidth: 170 }}><Switch label={t('forSale')} value={editing.is_for_sale} onChange={(v) => setF('is_for_sale', v)} /></View>
              <View style={{ minWidth: 170 }}><Switch label={lang === 'ar' ? 'نشط' : 'Active'} value={editing.is_active} onChange={(v) => setF('is_active', v)} /></View>
              <View style={{ minWidth: 170 }}><Switch label={t('featured')} value={editing.is_featured} onChange={(v) => setF('is_featured', v)} /></View>
              <View style={{ minWidth: 200 }}><Switch label={t('needsTraining')} value={editing.requires_training} onChange={(v) => setF('requires_training', v)} /></View>
            </Row>

            <Divider v={4} />
            <Row between center>
              <Txt bold="800" size={15}>📋 {t('specs')}</Txt>
              <Button small variant="secondary" icon="＋" title={t('add')}
                onPress={() => setF('specs', [...(editing.specs || []), { key_ar: '', key_en: '', value_ar: '', value_en: '' }])} />
            </Row>
            {(editing.specs || []).map((s: any, i: number) => (
              <Row key={i} gap={8} wrap style={{ alignItems: 'flex-end' }}>
                <View style={{ flex: 1, minWidth: 120 }}><Field label="مفتاح (ع)" value={s.key_ar} onChangeText={(v) => { const c = [...editing.specs]; c[i] = { ...c[i], key_ar: v }; setF('specs', c); }} /></View>
                <View style={{ flex: 1, minWidth: 120 }}><Field label="Key (EN)" value={s.key_en} onChangeText={(v) => { const c = [...editing.specs]; c[i] = { ...c[i], key_en: v }; setF('specs', c); }} /></View>
                <View style={{ flex: 1, minWidth: 120 }}><Field label="قيمة (ع)" value={s.value_ar} onChangeText={(v) => { const c = [...editing.specs]; c[i] = { ...c[i], value_ar: v }; setF('specs', c); }} /></View>
                <View style={{ flex: 1, minWidth: 120 }}><Field label="Value (EN)" value={s.value_en} onChangeText={(v) => { const c = [...editing.specs]; c[i] = { ...c[i], value_en: v }; setF('specs', c); }} /></View>
                <Button small variant="ghost" title="🗑" onPress={() => setF('specs', editing.specs.filter((_: any, j: number) => j !== i))} />
              </Row>
            ))}

            <Row gap={10} style={{ marginTop: 8 }}>
              <Button title={t('save')} loading={busy} onPress={save} />
              <Button variant="outline" title={t('cancel')} onPress={() => setOpen(false)} />
            </Row>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

// ----------------------------------------------------------------- units
export function AdminUnits() {
  const { lang, toast } = useStore();
  const { t } = useT();
  const { isPhone } = useLayout();
  const [units, setUnits] = useState<Unit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p] = await Promise.all([
        api.get<Unit[]>('/api/units', { q: q || undefined, status: status || undefined }),
        api.get<Product[]>('/api/products', { include_inactive: true, limit: 300 }),
      ]);
      setUnits(u); setProducts(p);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [q, status, toast]);
  useEffect(() => { const i = setTimeout(load, 250); return () => clearTimeout(i); }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...editing };
      delete body.id; delete body.product_name_ar; delete body.product_name_en;
      delete body.total_rentals; delete body.last_service_at;
      if (editing.id) await api.put(`/api/units/${editing.id}`, body);
      else await api.post('/api/units', body);
      toast(t('saved')); setOpen(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const setF = (k: string, v: any) => setEditing((e: any) => ({ ...e, [k]: v }));
  const statusOpts = ['available', 'reserved', 'rented', 'maintenance', 'sterilizing', 'retired'];

  return (
    <View style={{ gap: 16 }}>
      <Row between center wrap gap={10}>
        <Txt bold="800" size={24}>{t('units')} ({units.length})</Txt>
        <Button icon="＋" title={t('newUnit')}
          onPress={() => {
            setEditing({
              product_id: products[0]?.id || 0, serial_number: '', asset_tag: '',
              status: 'available', condition_note: '', purchase_date: null,
              purchase_cost: 0, location: 'المخزن الرئيسي', next_service_due: null, is_active: true,
            });
            setOpen(true);
          }} />
      </Row>
      <Field value={q} onChangeText={setQ} placeholder={t('serial')} />
      <Chips value={status} onChange={(v) => setStatus(v as string)}
        options={[{ value: '', label: t('all') },
        ...statusOpts.map((s) => ({ value: s, label: t(`us_${s}` as any) }))]} />

      {loading ? <Loading /> : units.length === 0 ? <Empty icon="🔖" title={t('noResults')} /> : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {!isPhone ? <TableHead cols={[
            lang === 'ar' ? 'الجهاز' : 'Device', t('serial'), t('status'), t('location'),
            lang === 'ar' ? 'مرات التأجير' : 'Rentals', t('serviceDue'), '']} /> : null}
          {units.map((u, i) => isPhone ? (
            <View key={u.id} style={{ padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, gap: 5 }}>
              <Txt bold="700" size={13}>{lang === 'ar' ? u.product_name_ar : u.product_name_en}</Txt>
              <Txt size={11.5} color={colors.muted}>🔖 {u.serial_number} · {u.location}</Txt>
              <Row gap={6} wrap center>
                <Badge small tone={u.status} label={t(`us_${u.status}` as any)} />
                <Button small variant="secondary" title={t('edit')} onPress={() => { setEditing({ ...u }); setOpen(true); }} />
                <Button small variant="ghost" title="🏷 QR" onPress={() => openUrl(api.docUrl(`/api/docs/unit-label/${u.id}.pdf`))} />
              </Row>
            </View>
          ) : (
            <TableRow key={u.id} alt={i % 2 === 1} cells={[
              lang === 'ar' ? u.product_name_ar : u.product_name_en,
              u.serial_number,
              <Badge key="s" small tone={u.status} label={t(`us_${u.status}` as any)} />,
              u.location, u.total_rentals,
              u.next_service_due
                ? <Txt key="d" size={12} color={new Date(u.next_service_due) < new Date() ? colors.danger : colors.text}>
                  {fmtDate(u.next_service_due, lang)}</Txt> : '—',
              <Row key="a" gap={5}>
                <Button small variant="secondary" title={t('edit')} onPress={() => { setEditing({ ...u }); setOpen(true); }} />
                <Button small variant="ghost" title="🏷" onPress={() => openUrl(api.docUrl(`/api/docs/unit-label/${u.id}.pdf`))} />
              </Row>,
            ]} />
          ))}
        </Card>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={editing?.id ? t('edit') : t('newUnit')}>
        {editing ? (
          <View style={{ gap: 12 }}>
            <Select label={t('products')} value={editing.product_id} onChange={(v) => setF('product_id', v)}
              options={products.map((p) => ({ value: p.id, label: `${pickLang(p, 'name', lang)} (${p.sku})` }))} />
            <Row gap={10}>
              <Field label={t('serial')} value={editing.serial_number} onChangeText={(v) => setF('serial_number', v)} />
              <Field label="Asset tag" value={editing.asset_tag} onChangeText={(v) => setF('asset_tag', v)} />
            </Row>
            <Select label={t('status')} value={editing.status} onChange={(v) => setF('status', v)}
              options={statusOpts.map((s) => ({ value: s, label: t(`us_${s}` as any) }))} />
            <Field label={t('location')} value={editing.location} onChangeText={(v) => setF('location', v)} />
            <Row gap={10}>
              <DateField label={lang === 'ar' ? 'تاريخ الشراء' : 'Purchase date'}
                value={editing.purchase_date || ''} onChange={(v) => setF('purchase_date', v || null)} />
              <Field label={lang === 'ar' ? 'تكلفة الشراء' : 'Purchase cost'} keyboard="numeric"
                value={String(editing.purchase_cost || 0)}
                onChangeText={(v) => setF('purchase_cost', Number(v.replace(/[^\d.]/g, '')) || 0)} />
            </Row>
            <DateField label={t('serviceDue')} value={editing.next_service_due || ''}
              onChange={(v) => setF('next_service_due', v || null)} />
            <Field label={t('conditionNote')} value={editing.condition_note} onChangeText={(v) => setF('condition_note', v)} multiline />
            <Switch label={lang === 'ar' ? 'نشط' : 'Active'} value={editing.is_active} onChange={(v) => setF('is_active', v)} />
            <Row gap={10}>
              <Button title={t('save')} loading={busy} onPress={save} />
              <Button variant="outline" title={t('cancel')} onPress={() => setOpen(false)} />
            </Row>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

// ----------------------------------------------------------------- posts
export function AdminPosts() {
  const { lang, toast } = useStore();
  const { t } = useT();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPosts(await api.get<Post[]>('/api/posts', { include_drafts: true })); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...editing };
      delete body.id; delete body.published_at; delete body.views;
      if (typeof body.tags === 'string') body.tags = body.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (!body.slug) body.slug = body.title_en.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (editing.id) await api.put(`/api/posts/${editing.id}`, body);
      else await api.post('/api/posts', body);
      toast(t('saved')); setOpen(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const setF = (k: string, v: any) => setEditing((e: any) => ({ ...e, [k]: v }));

  return (
    <View style={{ gap: 16 }}>
      <Row between center>
        <Txt bold="800" size={24}>{t('posts')} ({posts.length})</Txt>
        <Button icon="＋" title={t('newPost')} onPress={() => {
          setEditing({
            slug: '', title_ar: '', title_en: '', excerpt_ar: '', excerpt_en: '',
            body_ar: '', body_en: '', cover: '', author: 'فريق SCOPE', tags: [], is_published: true,
          }); setOpen(true);
        }} />
      </Row>
      {loading ? <Loading /> : (
        <View style={{ gap: 10 }}>
          {posts.map((p) => (
            <Card key={p.id} pad={13}>
              <Row between center gap={10}>
                <View style={{ flex: 1 }}>
                  <Txt bold="700" size={14} numberOfLines={1}>{pickLang(p, 'title', lang)}</Txt>
                  <Txt size={11.5} color={colors.muted}>
                    {p.author} · {fmtDate(p.published_at, lang)} · {p.views} 👁
                  </Txt>
                </View>
                <Badge small tone={p.is_published ? 'available' : 'retired'}
                  label={p.is_published ? (lang === 'ar' ? 'منشور' : 'Published') : (lang === 'ar' ? 'مسودة' : 'Draft')} />
                <Button small variant="secondary" title={t('edit')}
                  onPress={() => { setEditing({ ...p, tags: (p.tags || []).join(', ') }); setOpen(true); }} />
                <Button small variant="ghost" title="🗑"
                  onPress={async () => { await api.del(`/api/posts/${p.id}`); toast(t('deleted')); load(); }} />
              </Row>
            </Card>
          ))}
        </View>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} wide title={editing?.id ? t('edit') : t('newPost')}>
        {editing ? (
          <View style={{ gap: 12 }}>
            <Row gap={10} wrap>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="العنوان (ع)" value={editing.title_ar} onChangeText={(v) => setF('title_ar', v)} /></View>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="Title (EN)" value={editing.title_en} onChangeText={(v) => setF('title_en', v)} /></View>
            </Row>
            <Row gap={10} wrap>
              <View style={{ flex: 1, minWidth: 160 }}><Field label="Slug" value={editing.slug} onChangeText={(v) => setF('slug', v)} hint="auto" /></View>
              <View style={{ flex: 1, minWidth: 160 }}><Field label="Tags (comma)" value={editing.tags} onChangeText={(v) => setF('tags', v)} /></View>
            </Row>
            <Field label="صورة الغلاف" value={editing.cover} onChangeText={(v) => setF('cover', v)} />
            <Row gap={10} wrap>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="مقتطف (ع)" value={editing.excerpt_ar} onChangeText={(v) => setF('excerpt_ar', v)} multiline /></View>
              <View style={{ flex: 1, minWidth: 200 }}><Field label="Excerpt (EN)" value={editing.excerpt_en} onChangeText={(v) => setF('excerpt_en', v)} multiline /></View>
            </Row>
            <Field label="المحتوى (ع)" value={editing.body_ar} onChangeText={(v) => setF('body_ar', v)} multiline />
            <Field label="Body (EN)" value={editing.body_en} onChangeText={(v) => setF('body_en', v)} multiline />
            <Switch label={lang === 'ar' ? 'منشور' : 'Published'} value={editing.is_published} onChange={(v) => setF('is_published', v)} />
            <Row gap={10}>
              <Button title={t('save')} loading={busy} onPress={save} />
              <Button variant="outline" title={t('cancel')} onPress={() => setOpen(false)} />
            </Row>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
