import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Order, Quote } from '../api';
import { Banner } from '../components';
import { daysBetween, iso, money, pickLang } from '../i18n';
import { useStore } from '../store';
import { colors, radius } from '../theme';
import {
  Badge, Button, Card, DateField, Divider, Empty, Field, Img, KV, Loading, Row, Txt,
  useLayout, useT,
} from '../ui';

export default function CartScreen() {
  const {
    cart, cartDates, setCartDates, removeFromCart, setQty, clearCart,
    lang, go, user, toast,
  } = useStore();
  const { t } = useT();
  const { isDesktop } = useLayout();

  const [quotes, setQuotes] = useState<Record<number, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const rentLines = cart.filter((l) => l.type === 'rent');
  const saleLines = cart.filter((l) => l.type === 'sale');
  const days = daysBetween(cartDates.start, cartDates.end);

  useEffect(() => {
    if (!rentLines.length) { setQuotes({}); return; }
    setLoading(true); setErr('');
    (async () => {
      try {
        const res = await Promise.all(rentLines.map((l) =>
          api.post<Quote>('/api/quote', {
            product_id: l.product.id, start_date: cartDates.start,
            end_date: cartDates.end, qty: l.qty,
          }).then((q) => [l.product.id, q] as const)
            .catch(() => [l.product.id, null] as const)
        ));
        const map: Record<number, Quote> = {};
        res.forEach(([id, q]) => { if (q) map[id] = q; });
        setQuotes(map);
      } catch (e: any) { setErr(e.message); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cart.map((c) => [c.product.id, c.qty, c.type])), cartDates.start, cartDates.end]);

  const totals = useMemo(() => {
    let sub = 0, dep = 0;
    rentLines.forEach((l) => {
      const q = quotes[l.product.id];
      if (q) { sub += q.subtotal; dep += q.deposit; }
    });
    saleLines.forEach((l) => { sub += (l.product.sale_price || 0) * l.qty; });
    return { sub, dep, total: sub + dep };
  }, [rentLines, saleLines, quotes]);

  if (!cart.length) {
    return <Empty icon="🛒" title={t('emptyCart')} sub={t('emptyCartSub')}
      action={<Button title={t('browseNow')} onPress={() => go({ name: 'catalog' })} />} />;
  }

  const summary = (
    <Card>
      <View style={{ gap: 4 }}>
        <Txt bold="800" size={16}>{t('total')}</Txt>
        <Divider v={8} />
        <KV k={t('subtotal')} v={money(totals.sub, lang)} />
        {totals.dep > 0 ? <KV k={`${t('deposit')} (${t('refundable')})`} v={money(totals.dep, lang)} /> : null}
        <Divider v={8} />
        <Row between center>
          <Txt bold="800" size={15}>{t('total')}</Txt>
          <Txt bold="800" size={22} color={colors.brandDark}>{money(totals.total, lang)}</Txt>
        </Row>
        <Button full style={{ marginTop: 12 }} icon="✓" title={t('checkout')}
          disabled={loading}
          onPress={() => (user ? go({ name: 'checkout' }) : go({ name: 'auth' }))} />
        <Button full variant="ghost" small title={lang === 'ar' ? 'تفريغ السلة' : 'Clear cart'}
          onPress={clearCart} />
      </View>
    </Card>
  );

  const lines = (
    <View style={{ gap: 14 }}>
      {rentLines.length ? (
        <Card>
          <View style={{ gap: 12 }}>
            <Txt bold="800" size={15}>📅 {t('rentalPeriod')}</Txt>
            <Row gap={10}>
              <DateField label={t('from')} value={cartDates.start} min={iso(new Date())}
                onChange={(v) => setCartDates({ start: v, end: v > cartDates.end ? v : cartDates.end })} />
              <DateField label={t('to')} value={cartDates.end} min={cartDates.start}
                onChange={(v) => setCartDates({ ...cartDates, end: v })} />
            </Row>
            <Badge label={`${days} ${t('days')}`} />
          </View>
        </Card>
      ) : null}

      {err ? <Banner level="danger" text={err} /> : null}

      {cart.map((l) => {
        const q = quotes[l.product.id];
        const isRent = l.type === 'rent';
        const lineTotal = isRent
          ? (q ? q.subtotal + q.deposit : 0)
          : (l.product.sale_price || 0) * l.qty;
        return (
          <Card key={`${l.product.id}-${l.type}`} pad={12}>
            <Row gap={12} style={{ alignItems: 'flex-start' }}>
              <Img uri={l.product.image} ratio={1} style={{ width: 82 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Row between>
                  <View style={{ flex: 1 }}>
                    <Txt bold="700" size={14} numberOfLines={2}>{pickLang(l.product, 'name', lang)}</Txt>
                    <Txt size={11} color={colors.muted}>{l.product.brand} · {l.product.sku}</Txt>
                  </View>
                  <Pressable onPress={() => removeFromCart(l.product.id)} hitSlop={8}>
                    <Text style={{ fontSize: 16, color: colors.danger }}>🗑</Text>
                  </Pressable>
                </Row>

                <Badge small tone={isRent ? 'available' : 'reserved'}
                  label={isRent ? t('forRent') : t('forSale')} />

                {isRent && q ? (
                  <Txt size={11.5} color={colors.sub}>
                    {[
                      q.breakdown.months ? `${q.breakdown.months} ${t('month')}` : '',
                      q.breakdown.weeks ? `${q.breakdown.weeks} ${t('week')}` : '',
                      q.breakdown.days ? `${q.breakdown.days} ${t('day')}` : '',
                    ].filter(Boolean).join(' + ')}
                    {q.saving > 0 ? `  ·  💰 ${t('youSave')} ${money(q.saving, lang)}` : ''}
                  </Txt>
                ) : null}
                {isRent && q && !q.availability.is_available ? (
                  <Badge tone="maintenance" small label={t('unavailable')} />
                ) : null}

                <Row between center>
                  <Row center gap={0} style={{
                    borderWidth: 1.2, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden',
                  }}>
                    <Pressable onPress={() => setQty(l.product.id, l.qty - 1)}
                      style={{ paddingHorizontal: 11, paddingVertical: 5 }}>
                      <Txt bold="800" color={colors.brand}>−</Txt>
                    </Pressable>
                    <View style={{ paddingHorizontal: 12 }}><Txt bold="700" size={13}>{l.qty}</Txt></View>
                    <Pressable onPress={() => setQty(l.product.id, l.qty + 1)}
                      style={{ paddingHorizontal: 11, paddingVertical: 5 }}>
                      <Txt bold="800" color={colors.brand}>+</Txt>
                    </Pressable>
                  </Row>
                  <Txt bold="800" size={15} color={colors.brandDark}>
                    {loading && isRent ? '…' : money(lineTotal, lang)}
                  </Txt>
                </Row>
              </View>
            </Row>
          </Card>
        );
      })}
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      <Txt bold="800" size={24}>{t('cart')}</Txt>
      {isDesktop ? (
        <Row gap={20} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1.6 }}>{lines}</View>
          <View style={{ width: 340 }}>{summary}</View>
        </Row>
      ) : (
        <View style={{ gap: 16 }}>{lines}{summary}</View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- checkout
export function CheckoutScreen() {
  const { cart, cartDates, clearCart, user, lang, go, toast, settings } = useStore();
  const { t } = useT();
  const { isDesktop } = useLayout();

  const [quotes, setQuotes] = useState<Record<number, Quote>>({});
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<'cash_on_delivery' | 'stripe'>('cash_on_delivery');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Order[] | null>(null);
  const [paying, setPaying] = useState(false);

  const rentLines = cart.filter((l) => l.type === 'rent');
  const saleLines = cart.filter((l) => l.type === 'sale');
  const stripeEnabled = settings.stripe_enabled;

  useEffect(() => {
    if (!rentLines.length) return;
    (async () => {
      const res = await Promise.all(rentLines.map((l) =>
        api.post<Quote>('/api/quote', {
          product_id: l.product.id, start_date: cartDates.start, end_date: cartDates.end, qty: l.qty,
        }).then((q) => [l.product.id, q] as const).catch(() => [l.product.id, null] as const)));
      const map: Record<number, Quote> = {};
      res.forEach(([id, q]) => { if (q) map[id] = q; });
      setQuotes(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => {
    let s = 0;
    rentLines.forEach((l) => { const q = quotes[l.product.id]; if (q) s += q.grand_total; });
    saleLines.forEach((l) => { s += (l.product.sale_price || 0) * l.qty; });
    return s;
  }, [rentLines, saleLines, quotes]);

  const submit = async () => {
    setSubmitting(true); setErr('');
    try {
      const created: Order[] = [];
      if (rentLines.length) {
        created.push(await api.post<Order>('/api/orders', {
          type: 'rent',
          items: rentLines.map((l) => ({ product_id: l.product.id, qty: l.qty })),
          start_date: cartDates.start, end_date: cartDates.end,
          payment_method: method, contact_name: name, contact_phone: phone,
          delivery_address: address, notes,
        }));
      }
      if (saleLines.length) {
        created.push(await api.post<Order>('/api/orders', {
          type: 'sale',
          items: saleLines.map((l) => ({ product_id: l.product.id, qty: l.qty })),
          payment_method: method, contact_name: name, contact_phone: phone,
          delivery_address: address, notes,
        }));
      }
      clearCart();
      setDone(created);
    } catch (e: any) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  const payNow = async (order: Order) => {
    setPaying(true);
    try {
      const intent = await api.post<any>('/api/payments/stripe/intent', undefined, { order_id: order.id });
      if (intent.mode === 'demo') {
        await api.post('/api/payments/stripe/confirm', undefined,
          { order_id: order.id, reference: intent.client_secret, success: true });
        toast(t('paySuccess'));
        setDone((d) => d ? d.map((o) => o.id === order.id ? { ...o, payment_status: 'paid' } : o) : d);
      } else {
        toast(lang === 'ar'
          ? 'تم إنشاء عملية دفع Stripe — أكمل الدفع من صفحة الطلب'
          : 'Stripe intent created — complete payment from the order page', 'info');
      }
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setPaying(false); }
  };

  if (done) {
    return (
      <View style={{ gap: 16, maxWidth: 620, alignSelf: 'center', width: '100%' }}>
        <Card style={{ alignItems: 'center' }} pad={30}>
          <Text style={{ fontSize: 52 }}>🎉</Text>
          <Txt bold="800" size={20} center style={{ marginTop: 10 }}>{t('orderPlaced')}</Txt>
          <Txt color={colors.sub} center style={{ marginTop: 6 }}>{t('orderPlacedSub')}</Txt>
          <View style={{ gap: 10, width: '100%', marginTop: 18 }}>
            {done.map((o) => (
              <Card key={o.id} pad={12} style={{ backgroundColor: colors.brandSoft }}>
                <Row between center>
                  <View>
                    <Txt bold="800">{o.code}</Txt>
                    <Txt size={12} color={colors.sub}>{money(o.total, lang)} · {t(`st_${o.status}` as any)}</Txt>
                  </View>
                  <Row gap={8}>
                    {method === 'stripe' && o.payment_status !== 'paid' ? (
                      <Button small variant="success" title={t('payNow')} loading={paying}
                        onPress={() => payNow(o)} />
                    ) : null}
                    <Button small variant="secondary" title={t('orderDetails')}
                      onPress={() => go({ name: 'order', id: o.id })} />
                  </Row>
                </Row>
              </Card>
            ))}
          </View>
          <Button style={{ marginTop: 16 }} variant="ghost" title={t('browseNow')}
            onPress={() => go({ name: 'catalog' })} />
        </Card>
      </View>
    );
  }

  if (!cart.length) {
    return <Empty icon="🛒" title={t('emptyCart')} sub={t('emptyCartSub')}
      action={<Button title={t('browseNow')} onPress={() => go({ name: 'catalog' })} />} />;
  }

  const form = (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={{ gap: 12 }}>
          <Txt bold="800" size={16}>📍 {t('deliveryDetails')}</Txt>
          <Row gap={12} wrap>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Field label={t('name')} value={name} onChangeText={setName} />
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboard="phone-pad" />
            </View>
          </Row>
          <Field label={t('address')} value={address} onChangeText={setAddress} multiline
            placeholder={lang === 'ar' ? 'العنوان بالتفصيل — المحافظة، المنطقة، الشارع، رقم العيادة' : 'Full delivery address'} />
          <Field label={`${t('notes')} (${t('optional')})`} value={notes} onChangeText={setNotes} multiline
            placeholder={lang === 'ar' ? 'أي تعليمات خاصة بالتسليم أو التركيب' : 'Any special delivery or setup instructions'} />
        </View>
      </Card>

      <Card>
        <View style={{ gap: 10 }}>
          <Txt bold="800" size={16}>💳 {t('paymentMethod')}</Txt>
          {([
            { id: 'cash_on_delivery', label: t('cashOnDelivery'), icon: '💵',
              sub: lang === 'ar' ? 'ادفع للمندوب عند تسليم الجهاز' : 'Pay the courier on delivery' },
            { id: 'stripe', label: t('cardStripe'), icon: '💳',
              sub: stripeEnabled
                ? (lang === 'ar' ? 'دفع آمن ببطاقة الائتمان' : 'Secure card payment')
                : (lang === 'ar' ? 'وضع تجريبي — لم يتم ضبط مفاتيح Stripe بعد' : 'Demo mode — Stripe keys not configured') },
          ] as const).map((m) => (
            <Pressable key={m.id} onPress={() => setMethod(m.id as any)}>
              <View style={{
                borderWidth: 1.6, borderRadius: radius.md, padding: 13,
                borderColor: method === m.id ? colors.brand : colors.border,
                backgroundColor: method === m.id ? colors.brandSoft : '#fff',
              }}>
                <Row center gap={11}>
                  <View style={{
                    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                    borderColor: method === m.id ? colors.brand : colors.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {method === m.id ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} /> : null}
                  </View>
                  <Text style={{ fontSize: 19 }}>{m.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Row center gap={6}>
                      <Txt bold="700" size={14}>{m.label}</Txt>
                      {m.id === 'stripe' && !stripeEnabled ? <Badge label={t('demoMode')} tone="normal" small /> : null}
                    </Row>
                    <Txt size={11.5} color={colors.muted}>{m.sub}</Txt>
                  </View>
                </Row>
              </View>
            </Pressable>
          ))}
        </View>
      </Card>
      {err ? <Banner level="danger" text={err} /> : null}
    </View>
  );

  const summary = (
    <Card>
      <View style={{ gap: 4 }}>
        <Txt bold="800" size={16}>{lang === 'ar' ? 'ملخص الطلب' : 'Order summary'}</Txt>
        <Divider v={8} />
        {cart.map((l) => {
          const q = quotes[l.product.id];
          const v = l.type === 'rent' ? (q?.grand_total ?? 0) : (l.product.sale_price || 0) * l.qty;
          return <KV key={`${l.product.id}-${l.type}`}
            k={`${pickLang(l.product, 'name', lang)} ×${l.qty}`} v={money(v, lang)} />;
        })}
        {rentLines.length ? (
          <>
            <Divider v={8} />
            <KV k={t('rentalPeriod')} v={`${cartDates.start} → ${cartDates.end}`} />
          </>
        ) : null}
        <Divider v={8} />
        <Row between center>
          <Txt bold="800" size={15}>{t('total')}</Txt>
          <Txt bold="800" size={22} color={colors.brandDark}>{money(total, lang)}</Txt>
        </Row>
        <Button full style={{ marginTop: 12 }} icon="✓" title={t('placeOrder')}
          loading={submitting} disabled={!name || !phone || !address}
          onPress={submit} />
        <Txt size={11} color={colors.muted} center style={{ marginTop: 8 }}>
          {lang === 'ar'
            ? 'بتأكيد الطلب أنت موافق على شروط الإيجار الموضحة في العقد.'
            : 'By placing this order you agree to the rental terms in the contract.'}
        </Txt>
      </View>
    </Card>
  );

  return (
    <View style={{ gap: 16 }}>
      <Txt bold="800" size={24}>{t('checkout')}</Txt>
      {isDesktop ? (
        <Row gap={20} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1.5 }}>{form}</View>
          <View style={{ width: 350 }}>{summary}</View>
        </Row>
      ) : <View style={{ gap: 16 }}>{form}{summary}</View>}
    </View>
  );
}
