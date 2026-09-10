import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Category, Product } from '../api';
import { Banner, Grid, ProductCard } from '../components';
import { pickLang } from '../i18n';
import { useStore } from '../store';
import { colors, radius } from '../theme';
import {
  Button, Card, Chips, Empty, Field, Loading, Row, Select, Sheet, Txt, useLayout, useT,
} from '../ui';

export default function CatalogScreen({ initialCategory, initialMode, initialQ }: {
  initialCategory?: string; initialMode?: 'rent' | 'sale'; initialQ?: string;
}) {
  const { go, lang, compare, rtl } = useStore();
  const { t } = useT();
  const { isPhone } = useLayout();

  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [q, setQ] = useState(initialQ || '');
  const [category, setCategory] = useState<string>(initialCategory || '');
  const [mode, setMode] = useState<string>(initialMode || '');
  const [brand, setBrand] = useState<string>('');
  const [sort, setSort] = useState<string>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [c, b] = await Promise.all([
          api.get<Category[]>('/api/categories'),
          api.get<string[]>('/api/products/brands'),
        ]);
        setCats(c); setBrands(b);
      } catch { /* silent */ }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      setItems(await api.get<Product[]>('/api/products', {
        q: q || undefined, category: category || undefined, mode: mode || undefined,
        brand: brand || undefined, sort,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
      }));
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [q, category, mode, brand, sort, minPrice, maxPrice]);

  useEffect(() => { const id = setTimeout(load, 260); return () => clearTimeout(id); }, [load]);

  const activeFilters = [category, mode, brand, minPrice, maxPrice].filter(Boolean).length;

  const filterControls = (
    <View style={{ gap: 14 }}>
      <Select label={t('categories')} value={category} placeholder={t('all')}
        onChange={(v) => setCategory(v as string)}
        options={[{ value: '', label: t('all') },
        ...cats.map((c) => ({ value: c.slug, label: `${c.icon}  ${pickLang(c, 'name', lang)}` }))]} />
      <Select label={t('brand')} value={brand} placeholder={t('all')}
        onChange={(v) => setBrand(v as string)}
        options={[{ value: '', label: t('all') }, ...brands.map((b) => ({ value: b, label: b }))]} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label={lang === 'ar' ? 'أقل سعر (جنيه/يوم)' : 'Min price (EGP/day)'} value={minPrice} onChangeText={setMinPrice} placeholder="0" keyboard="numeric" /></View>
        <View style={{ flex: 1 }}><Field label={lang === 'ar' ? 'أقصى سعر (جنيه/يوم)' : 'Max price (EGP/day)'} value={maxPrice} onChangeText={setMaxPrice} placeholder="5000" keyboard="numeric" /></View>
      </View>
      <Txt size={11} color={colors.muted}>{lang === 'ar' ? 'يُفلتر حسب سعر اليوم للإيجار أو سعر البيع' : 'Filters by daily rent or sale price'}</Txt>
      <Select label={t('sortBy')} value={sort} onChange={(v) => setSort(v as string)}
        options={[
          { value: 'newest', label: t('newest') },
          { value: 'price_asc', label: t('priceAsc') },
          { value: 'price_desc', label: t('priceDesc') },
          { value: 'rating', label: t('topRated') },
          { value: 'popular', label: t('popular') },
        ]} />
      <Button title={t('reset')} variant="outline" full
        onPress={() => { setCategory(''); setBrand(''); setMode(''); setSort('newest'); setQ(''); setMinPrice(''); setMaxPrice(''); }} />
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      <Txt bold="800" size={24}>{t('catalog')}</Txt>

      <Card pad={14}>
        <View style={{ gap: 12 }}>
          <Field value={q} onChangeText={setQ} placeholder={t('search')}
            right={<Text style={{ fontSize: 15, color: colors.muted }}>🔍</Text>} />
          <Row between center gap={10}>
            <View style={{ flex: 1 }}>
              <Chips small value={mode}
                onChange={(v) => setMode(v as string)}
                options={[
                  { value: '', label: t('all') },
                  { value: 'rent', label: t('forRent'), icon: '📅' },
                  { value: 'sale', label: t('forSale'), icon: '🛒' },
                ]} />
            </View>
            {isPhone ? (
              <Button small variant="outline" icon="⚙️"
                title={activeFilters ? `${t('filters')} (${activeFilters})` : t('filters')}
                onPress={() => setShowFilters(true)} />
            ) : null}
          </Row>
          {!isPhone ? (
            <>
              <Row gap={12} wrap>
                <View style={{ flex: 1, minWidth: 190 }}>
                  <Select label={t('categories')} value={category} placeholder={t('all')}
                    onChange={(v) => setCategory(v as string)}
                    options={[{ value: '', label: t('all') },
                    ...cats.map((c) => ({ value: c.slug, label: `${c.icon}  ${pickLang(c, 'name', lang)}` }))]} />
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Select label={t('brand')} value={brand} placeholder={t('all')}
                    onChange={(v) => setBrand(v as string)}
                    options={[{ value: '', label: t('all') }, ...brands.map((b) => ({ value: b, label: b }))]} />
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Select label={t('sortBy')} value={sort} onChange={(v) => setSort(v as string)}
                    options={[
                      { value: 'newest', label: t('newest') },
                      { value: 'price_asc', label: t('priceAsc') },
                      { value: 'price_desc', label: t('priceDesc') },
                      { value: 'rating', label: t('topRated') },
                      { value: 'popular', label: t('popular') },
                    ]} />
                </View>
              </Row>
              <Row gap={10} wrap>
                <View style={{ flex: 1, minWidth: 140 }}><Field label={lang === 'ar' ? 'أقل سعر' : 'Min price'} value={minPrice} onChangeText={setMinPrice} placeholder="0" keyboard="numeric" /></View>
                <View style={{ flex: 1, minWidth: 140 }}><Field label={lang === 'ar' ? 'أقصى سعر' : 'Max price'} value={maxPrice} onChangeText={setMaxPrice} placeholder="5000" keyboard="numeric" /></View>
                {(minPrice || maxPrice) ? <View style={{ justifyContent: 'flex-end', paddingBottom: 4 }}><Button small variant="ghost" title="✕" onPress={() => { setMinPrice(''); setMaxPrice(''); }} /></View> : null}
              </Row>
            </>
          ) : null}
        </View>
      </Card>

      {(minPrice || maxPrice) && !loading ? (
        <View style={{ backgroundColor: colors.brandLight, borderWidth: 1, borderColor: colors.brand + '22', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt size={12} color={colors.brandDark} bold="600">{lang === 'ar' ? `السعر: ${minPrice || 0} → ${maxPrice || '∞'} جنيه/يوم` : `Price: ${minPrice || 0} → ${maxPrice || '∞'} EGP/day`}</Txt>
          <Pressable onPress={() => { setMinPrice(''); setMaxPrice(''); }}><Txt size={11} bold="700" color={colors.brand}>✕ {t('reset')}</Txt></Pressable>
        </View>
      ) : null}

      {compare.length ? (
        <Pressable onPress={() => go({ name: 'compare' })}>
          <View style={{
            backgroundColor: colors.brand, borderRadius: radius.md, padding: 12,
            flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Txt color="#fff" bold="700">⇄ {t('compare')} ({compare.length})</Txt>
            <Txt color="#fff" bold="700">←</Txt>
          </View>
        </Pressable>
      ) : null}

      {err ? <Banner level="danger" text={err} /> : null}

      {loading ? <Loading />
        : items.length === 0 ? (
          <Empty icon="🔎" title={t('noResults')}
            sub={lang === 'ar' ? 'جرب تغيير كلمة البحث أو الفلاتر' : 'Try different keywords or filters'}
            action={<Button title={t('reset')} variant="secondary"
              onPress={() => { setCategory(''); setBrand(''); setMode(''); setQ(''); }} />} />
        ) : (
          <>
            <Txt size={13} color={colors.sub}>{items.length} {t('results')}</Txt>
            <Grid>
              {items.map((p) => (
                <ProductCard key={p.id} p={p} onPress={() => go({ name: 'product', id: p.id })} />
              ))}
            </Grid>
          </>
        )}

      <Sheet open={showFilters} onClose={() => setShowFilters(false)} title={t('filters')}>
        {filterControls}
        <Button title={t('apply')} full onPress={() => setShowFilters(false)} />
      </Sheet>
    </View>
  );
}
