import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Product, Quote, Review } from '../api';
import { Banner, Grid, ProductCard } from '../components';
import { addDays, iso, money, pickLang, fmtDate } from '../i18n';
import { useStore } from '../store';
import { colors, radius } from '../theme';
import {
  Badge, Button, Card, DateField, Divider, Empty, Field, Img, KV, Loading, MiniCalendar,
  Row, Stars, Txt, openUrl, useLayout, useT, waLink,
} from '../ui';

export default function ProductScreen({ id }: { id: number }) {
  const { go, lang, user, addToCart, toast, settings, compare, toggleCompare, setCartDates, rtl } = useStore();
  const { t } = useT();
  const { isPhone, isDesktop } = useLayout();

  const [p, setP] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [start, setStart] = useState(iso(addDays(new Date(), 1)));
  const [end, setEnd] = useState(iso(addDays(new Date(), 7)));
  const [qty, setQty] = useState(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteErr, setQuoteErr] = useState('');

  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const prod = await api.get<Product>(`/api/products/${id}`);
        setP(prod);
        const [rel, rev, cal] = await Promise.all([
          api.get<Product[]>('/api/products', { category_id: prod.category_id, limit: 8 }),
          api.get<Review[]>('/api/reviews', { product_id: prod.id }),
          api.get<{ busy_dates: string[] }>(`/api/availability/${prod.id}/calendar`, { months: 3 }),
        ]);
        setRelated(rel.filter((x) => x.id !== prod.id).slice(0, 4));
        setReviews(rev);
        setBusy(cal.busy_dates || []);
      } catch (e: any) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const getQuote = useCallback(async () => {
    if (!p || !p.is_for_rent) return;
    setQuoting(true); setQuoteErr('');
    try {
      setQuote(await api.post<Quote>('/api/quote', {
        product_id: p.id, start_date: start, end_date: end, qty,
      }));
    } catch (e: any) { setQuoteErr(e.message); setQuote(null); }
    finally { setQuoting(false); }
  }, [p, start, end, qty]);

  useEffect(() => { if (p?.is_for_rent) getQuote(); }, [p, getQuote]);

  const submitReview = async () => {
    if (!user) { go({ name: 'auth' }); return; }
    setSending(true);
    try {
      await api.post('/api/reviews', { product_id: id, rating: myRating, comment: myComment });
      setMyComment('');
      toast(t('reviewPending'));
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSending(false); }
  };

  if (loading) return <Loading label={t('loading')} />;
  if (err || !p) return <Banner level="danger" text={err || 'Not found'} />;

  const name = pickLang(p, 'name', lang);
  const desc = pickLang(p, 'description', lang);
  const inCompare = !!compare.find((c) => c.id === p.id);
  const wa = settings.whatsapp || '201113138839';

  // -------------------------------------------------------------- panels
  const gallery = (
    <View style={{ gap: 10 }}>
      <Img uri={p.image} ratio={1.45} />
      <Row gap={8} wrap>
        {p.is_for_rent ? <Badge label={t('forRent')} tone="available" /> : null}
        {p.is_for_sale ? <Badge label={t('forSale')} tone="reserved" /> : null}
        <Badge label={`🔖 ${t('serialTracked')}`} />
        {p.requires_training ? <Badge label={`🎓 ${t('needsTraining')}`} tone="normal" /> : null}
      </Row>
    </View>
  );

  const bookingPanel = (
    <Card>
      <View style={{ gap: 14 }}>
        <Txt bold="800" size={16}>{p.is_for_rent ? t('pickDates') : t('buyNow')}</Txt>

        {p.is_for_rent ? (
          <>
            <Row gap={10}>
              <DateField label={t('from')} value={start} min={iso(new Date())}
                onChange={(v) => { setStart(v); if (v > end) setEnd(v); }} />
              <DateField label={t('to')} value={end} min={start} onChange={setEnd} />
            </Row>
            <Row center gap={10}>
              <Txt size={12.5} bold="600" color={colors.sub}>{t('qty')}</Txt>
              <Row center gap={0} style={{
                borderWidth: 1.4, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden',
              }}>
                <Pressable onPress={() => setQty(Math.max(1, qty - 1))}
                  style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Txt bold="800" size={16} color={colors.brand}>−</Txt>
                </Pressable>
                <View style={{ paddingHorizontal: 16, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }}>
                  <Txt bold="800" size={15}>{qty}</Txt>
                </View>
                <Pressable onPress={() => setQty(qty + 1)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Txt bold="800" size={16} color={colors.brand}>+</Txt>
                </Pressable>
              </Row>
              <View style={{ flex: 1 }} />
              <Button small variant="secondary" title={t('checkAvailability')} loading={quoting} onPress={getQuote} />
            </Row>

            {quoteErr ? <Banner level="danger" text={quoteErr} /> : null}

            {quote ? (
              <View style={{
                backgroundColor: colors.brandSoft, borderRadius: radius.md, padding: 14,
                borderWidth: 1, borderColor: colors.brand + '33', gap: 4,
              }}>
                <Row between center>
                  <Txt bold="700" size={13.5} color={colors.brandDark}>{t('bestPrice')}</Txt>
                  <Badge tone={quote.availability.is_available ? 'available' : 'maintenance'}
                    label={quote.availability.is_available
                      ? `${quote.availability.available} ${t('available')}`
                      : t('unavailable')} small />
                </Row>
                <Divider v={6} />
                <KV k={lang === 'ar' ? 'عدد الأيام' : 'Days'} v={`${quote.days} ${t('days')}`} />
                <KV k={lang === 'ar' ? 'التركيبة المختارة' : 'Chosen combination'}
                  v={[
                    quote.breakdown.months ? `${quote.breakdown.months} ${t('month')}` : '',
                    quote.breakdown.weeks ? `${quote.breakdown.weeks} ${t('week')}` : '',
                    quote.breakdown.days ? `${quote.breakdown.days} ${t('day')}` : '',
                  ].filter(Boolean).join(' + ')} />
                <KV k={lang === 'ar' ? 'متوسط اليوم' : 'Effective daily'} v={money(quote.effective_daily, lang)} />
                <KV k={t('deposit') + ` (${t('refundable')})`} v={money(quote.deposit, lang)} />
                <Divider v={6} />
                <Row between center>
                  <Txt bold="800" size={14}>{t('total')}</Txt>
                  <Txt bold="800" size={20} color={colors.brandDark}>{money(quote.grand_total, lang)}</Txt>
                </Row>
                {quote.saving > 0 ? (
                  <View style={{
                    backgroundColor: colors.successBg, borderRadius: radius.sm,
                    padding: 8, marginTop: 6,
                  }}>
                    <Txt size={12} bold="700" color={colors.success}>
                      💰 {t('youSave')} {money(quote.saving, lang)} — {t('insteadOf')} {money(quote.list_price, lang)}
                    </Txt>
                  </View>
                ) : null}
                {quote.late_fee_per_day > 0 ? (
                  <Txt size={11} color={colors.muted} style={{ marginTop: 4 }}>
                    ⚠️ {t('lateFee')}: {money(quote.late_fee_per_day, lang)}{t('perDayShort')}
                  </Txt>
                ) : null}
              </View>
            ) : null}

            <Button full icon="🛒" title={t('addToCart')}
              disabled={!quote?.availability.is_available}
              onPress={() => {
                setCartDates({ start, end });
                addToCart(p, qty, 'rent');
                toast(t('addedToCart'));
              }} />
          </>
        ) : null}

        {p.is_for_sale ? (
          <>
            {p.is_for_rent ? <Divider /> : null}
            <Row between center>
              <Txt bold="700">{t('forSale')}</Txt>
              <Txt bold="800" size={20} color={colors.brandDark}>{money(p.sale_price, lang)}</Txt>
            </Row>
            {p.warranty_months ? (
              <Txt size={12} color={colors.sub}>🛡️ {t('warranty')}: {p.warranty_months} {t('months')}</Txt>
            ) : null}
            <Button full variant="success" icon="🛍️" title={t('buyNow')}
              disabled={p.units_available <= 0}
              onPress={() => { addToCart(p, 1, 'sale'); toast(t('addedToCart')); }} />
          </>
        ) : null}

        <Button full variant="outline" icon="💬" title={t('contactWhatsapp')}
          onPress={() => openUrl(waLink(wa, lang === 'ar'
            ? `استفسار عن: ${name} (${p.sku})`
            : `Inquiry about: ${pickLang(p, 'name', 'en')} (${p.sku})`))} />
        <Button full variant="ghost" icon="⇄"
          title={inCompare ? t('inCompare') : t('addToCompare')}
          onPress={() => toggleCompare(p)} />
      </View>
    </Card>
  );

  const details = (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Txt size={12.5} color={colors.muted}>
          {pickLang(p, 'category_name', lang)} · {p.brand} {p.model ? `· ${p.model}` : ''} · SKU {p.sku}
        </Txt>
        <Txt bold="800" size={isPhone ? 21 : 26}>{name}</Txt>
        <Row center gap={10} wrap>
          <Stars value={p.rating_avg} size={16} />
          <Txt size={12.5} color={colors.sub}>
            {p.rating_count ? `${p.rating_avg.toFixed(1)} · ${p.rating_count} ${t('reviews')}` : t('noReviews')}
          </Txt>
          <Badge tone={p.units_available > 0 ? 'available' : 'maintenance'}
            label={`${p.units_available}/${p.units_total} ${t('available')}`} small />
        </Row>
      </View>

      {p.is_for_rent ? (
        <Card pad={14}>
          <Row gap={12} wrap>
            {[
              { l: t('perDay'), v: p.rent_daily },
              { l: t('perWeek'), v: p.rent_weekly },
              { l: t('perMonth'), v: p.rent_monthly },
            ].filter((x) => x.v > 0).map((x) => (
              <View key={x.l} style={{
                flex: 1, minWidth: 110, backgroundColor: colors.brandSoft,
                borderRadius: radius.md, padding: 12, alignItems: 'center',
              }}>
                <Txt size={11} color={colors.sub}>{x.l}</Txt>
                <Txt bold="800" size={16} color={colors.brandDark}>{money(x.v, lang)}</Txt>
              </View>
            ))}
          </Row>
          <Txt size={11} color={colors.muted} style={{ marginTop: 8 }}>
            {lang === 'ar'
              ? '💡 النظام بيحسب أرخص تركيبة تلقائياً — مش مجرد ضرب في عدد الأيام.'
              : '💡 We auto-compute the cheapest combination — not just days × daily rate.'}
          </Txt>
        </Card>
      ) : null}

      <Card>
        <Txt bold="800" size={16} style={{ marginBottom: 8 }}>{t('description')}</Txt>
        <Txt style={{ lineHeight: 23 }} color={colors.sub}>{desc}</Txt>
      </Card>

      {p.specs?.length ? (
        <Card>
          <Txt bold="800" size={16} style={{ marginBottom: 8 }}>{t('specs')}</Txt>
          {p.specs.map((s, i) => (
            <View key={i}>
              <KV k={pickLang(s as any, 'key', lang)} v={pickLang(s as any, 'value', lang)} />
              {i < p.specs.length - 1 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
            </View>
          ))}
          <Divider />
          <KV k={t('minRent')} v={`${p.min_rent_days} ${t('days')}`} />
          {p.late_fee_per_day > 0
            ? <KV k={t('lateFee')} v={`${money(p.late_fee_per_day, lang)}${t('perDayShort')}`} tone={colors.warning} /> : null}
          {p.deposit > 0
            ? <KV k={`${t('deposit')} (${t('refundable')})`} v={money(p.deposit, lang)} /> : null}
        </Card>
      ) : null}

      {p.is_for_rent ? (
        <Card>
          <Txt bold="800" size={16} style={{ marginBottom: 4 }}>{t('busyDates')}</Txt>
          <Txt size={12} color={colors.muted} style={{ marginBottom: 10 }}>
            {lang === 'ar' ? 'الأيام باللون الأحمر محجوزة بالكامل' : 'Red days are fully booked'}
          </Txt>
          <MiniCalendar busy={busy} months={isPhone ? 1 : 2} start={start} end={end}
            onPick={(d) => { if (d < start || d > end) { if (d < start) setStart(d); else setEnd(d); } else setStart(d); }} />
        </Card>
      ) : null}

      {/* --------------------------------------------------------- reviews */}
      <Card>
        <Txt bold="800" size={16} style={{ marginBottom: 10 }}>
          {t('reviews')} {reviews.length ? `(${reviews.length})` : ''}
        </Txt>
        {reviews.length === 0 ? (
          <Txt color={colors.muted} size={13}>{t('noReviews')}</Txt>
        ) : reviews.map((r, i) => (
          <View key={r.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <Row between center>
              <Row center gap={8}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandLight,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Txt bold="800" size={13} color={colors.brandDark}>{r.user_name?.[0] || '؟'}</Txt>
                </View>
                <View>
                  <Txt bold="700" size={13}>{r.user_name}</Txt>
                  <Txt size={10.5} color={colors.muted}>{fmtDate(r.created_at, lang)}</Txt>
                </View>
              </Row>
              <Stars value={r.rating} size={13} />
            </Row>
            {r.comment ? <Txt size={13} color={colors.sub} style={{ marginTop: 6, lineHeight: 20 }}>{r.comment}</Txt> : null}
          </View>
        ))}

        <Divider />
        <Txt bold="700" size={14} style={{ marginBottom: 8 }}>{t('writeReview')}</Txt>
        {user ? (
          <View style={{ gap: 10 }}>
            <Row center gap={10}>
              <Txt size={12.5} color={colors.sub}>{t('yourRating')}</Txt>
              <Stars value={myRating} size={24} onChange={setMyRating} />
            </Row>
            <Field value={myComment} onChangeText={setMyComment} multiline
              placeholder={lang === 'ar' ? 'شاركنا تجربتك مع الجهاز…' : 'Share your experience…'} />
            <Button title={t('sendReview')} loading={sending} onPress={submitReview} />
          </View>
        ) : (
          <Button variant="secondary" title={t('loginRequired')} onPress={() => go({ name: 'auth' })} />
        )}
      </Card>
    </View>
  );

  return (
    <View style={{ gap: 18 }}>
      {isDesktop ? (
        <Row gap={20} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1.15, gap: 16 }}>{gallery}{details}</View>
          <View style={{ width: 370 }}>{bookingPanel}</View>
        </Row>
      ) : (
        <View style={{ gap: 16 }}>{gallery}{bookingPanel}{details}</View>
      )}

      {related.length ? (
        <View style={{ gap: 12 }}>
          <Txt bold="800" size={19}>{lang === 'ar' ? 'أجهزة مشابهة' : 'Similar devices'}</Txt>
          <Grid>
            {related.map((r) => (
              <ProductCard key={r.id} p={r} onPress={() => go({ name: 'product', id: r.id })} />
            ))}
          </Grid>
        </View>
      ) : null}
    </View>
  );
}
