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
      }));
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [q, category, mode, brand, sort]);

  useEffect(() => { const id = setTimeout(load, 260); return () => clearTimeout(id); }, [load]);

  const activeFilters = [category, mode, brand].filter(Boolean).length;

  const filterControls = (
    <View style={{ gap: 14 }}>
      <Select label={t('categories')} value={category} placeholder={t('all')}
        onChange={(v) => setCategory(v as string)}
        options={[{ value: '', label: t('all') },
        ...cats.map((c) => ({ value: c.slug, label: `${c.icon}  ${pickLang(c, 'name', lang)}` }))]} />
      <Select label={t('brand')} value={brand} placeholder={t('all')}
        onChange={(v) => setBrand(v as string)}
        options={[{ value: '', label: t('all') }, ...brands.map((b) => ({ value: b, label: b }))]} />
      <Select label={t('sortBy')} value={sort} onChange={(v) => setSort(v as string)}
        options={[
          { value: 'newest', label: t('newest') },
          { value: 'price_asc', label: t('priceAsc') },
          { value: 'price_desc', label: t('priceDesc') },
          { value: 'rating', label: t('topRated') },
          { value: 'popular', label: t('popular') },
        ]} />
      <Button title={t('reset')} variant="outline" full
        onPress={() => { setCategory(''); setBrand(''); setMode(''); setSort('newest'); setQ(''); }} />
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
          ) : null}
        </View>
      </Card>

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
