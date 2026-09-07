import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Order } from '../api';
import { Banner } from '../components';
import { fmtDate, fmtDateTime, money, pickLang } from '../i18n';
import { useStore } from '../store';
import { colors, radius, statusColor } from '../theme';
import {
  Badge, Button, Card, Chips, Divider, Empty, Img, KV, Loading, Row, Txt,
  openUrl, useLayout, useT, waLink,
} from '../ui';

const FLOW = ['pending', 'approved', 'active', 'returned', 'completed'];

export function OrdersScreen() {
  const { go, lang, user } = useStore();
  const { t } = useT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setOrders(await api.get<Order[]>('/api/orders', { status: filter || undefined, mine: true })); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return <Empty icon="🔐" title={t('loginRequired')}
      action={<Button title={t('login')} onPress={() => go({ name: 'auth' })} />} />;
  }

  return (
    <View style={{ gap: 16 }}>
      <Txt bold="800" size={24}>{t('orders')}</Txt>
      <Chips value={filter} onChange={(v) => setFilter(v as string)}
        options={[{ value: '', label: t('all') },
        ...FLOW.map((s) => ({ value: s, label: t(`st_${s}` as any) })),
        { value: 'cancelled', label: t('st_cancelled') }]} />
      {err ? <Banner level="danger" text={err} /> : null}
      {loading ? <Loading />
        : orders.length === 0 ? (
          <Empty icon="📦" title={t('noOrders')}
            action={<Button title={t('browseNow')} onPress={() => go({ name: 'catalog' })} />} />
        ) : (
          <View style={{ gap: 12 }}>
            {orders.map((o) => <OrderRow key={o.id} o={o} onPress={() => go({ name: 'order', id: o.id })} />)}
          </View>
        )}
    </View>
  );
}

export function OrderRow({ o, onPress, showCustomer }: { o: Order; onPress: () => void; showCustomer?: boolean }) {
  const { lang } = useStore();
  const { t } = useT();
  return (
    <Card onPress={onPress} pad={14}>
      <View style={{ gap: 10 }}>
        <Row between center>
          <View>
            <Row center gap={8}>
              <Txt bold="800" size={15}>{o.code}</Txt>
              <Badge tone={o.status} label={t(`st_${o.status}` as any)} small />
            </Row>
            <Txt size={11.5} color={colors.muted}>
              {showCustomer ? `${o.customer_name} · ` : ''}{fmtDateTime(o.created_at, lang)}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt bold="800" size={16} color={colors.brandDark}>{money(o.total, lang)}</Txt>
            <Badge small tone={o.payment_status === 'paid' ? 'paid' : 'unpaid'}
              label={o.payment_status === 'paid'
                ? (lang === 'ar' ? 'مدفوع' : 'Paid')
                : `${t('due')} ${money(o.amount_due, lang)}`} />
          </View>
        </Row>

        <Row gap={8} style={{ alignItems: 'center' }}>
          {o.items.slice(0, 4).map((i) => (
            <Img key={i.id} uri={i.product_image} ratio={1} style={{ width: 42 }} />
          ))}
          <View style={{ flex: 1 }}>
            <Txt size={12.5} numberOfLines={2}>
              {o.items.map((i) => `${lang === 'ar' ? i.product_name_ar : i.product_name_en} ×${i.qty}`).join('، ')}
            </Txt>
            {o.type === 'rent' && o.start_date ? (
              <Txt size={11} color={colors.muted}>
                📅 {fmtDate(o.start_date, lang)} → {fmtDate(o.end_date, lang)} · {o.days} {t('days')}
              </Txt>
            ) : (
              <Txt size={11} color={colors.muted}>🛒 {t('forSale')}</Txt>
            )}
          </View>
        </Row>
      </View>
    </Card>
  );
}

export function OrderDetailScreen({ id }: { id: number }) {
  const { lang, go, toast, settings, user } = useStore();
  const { t } = useT();
  const { isDesktop } = useLayout();
  const [o, setO] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setO(await api.get<Order>(`/api/orders/${id}`)); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    setBusy(true);
    try { setO(await api.post<Order>(`/api/orders/${id}/cancel`)); toast(t('saved')); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const pay = async () => {
    if (!o) return;
    setBusy(true);
    try {
      const intent = await api.post<any>('/api/payments/stripe/intent', undefined, { order_id: o.id });
      if (intent.mode === 'demo') {
        await api.post('/api/payments/stripe/confirm', undefined,
          { order_id: o.id, reference: intent.client_secret, success: true });
        toast(t('paySuccess'));
        load();
      } else {
        toast(lang === 'ar' ? 'تم إنشاء PaymentIntent — أكمل من بوابة Stripe' : 'PaymentIntent created', 'info');
      }
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  if (loading) return <Loading />;
  if (err || !o) return <Banner level="danger" text={err || 'Not found'} />;

  const stepIdx = FLOW.indexOf(o.status);
  const wa = settings.whatsapp || '201113138839';

  return (
    <View style={{ gap: 16 }}>
      <Row between center wrap gap={10}>
        <View>
          <Txt bold="800" size={22}>{t('orderNo')} {o.code}</Txt>
          <Txt size={12.5} color={colors.muted}>{fmtDateTime(o.created_at, lang)}</Txt>
        </View>
        <Badge tone={o.status} label={t(`st_${o.status}` as any)} />
      </Row>

      {/* ------------------------------------------------------ timeline */}
      {o.status !== 'cancelled' && o.status !== 'rejected' ? (
        <Card>
          <Txt bold="800" size={15} style={{ marginBottom: 14 }}>{t('timeline')}</Txt>
          <Row style={{ alignItems: 'flex-start' }} gap={0}>
            {FLOW.map((s, i) => {
              const done = i <= stepIdx;
              return (
                <View key={s} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <Row center gap={0} style={{ width: '100%' }}>
                    <View style={{ flex: 1, height: 3, backgroundColor: i === 0 ? 'transparent' : done ? colors.brand : colors.border }} />
                    <View style={{
                      width: 26, height: 26, borderRadius: 13,
                      backgroundColor: done ? colors.brand : '#fff',
                      borderWidth: 2, borderColor: done ? colors.brand : colors.border,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 12, color: done ? '#fff' : colors.muted }}>{done ? '✓' : i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, height: 3, backgroundColor: i === FLOW.length - 1 ? 'transparent' : i < stepIdx ? colors.brand : colors.border }} />
                  </Row>
                  <Txt size={10.5} center bold={done ? '700' : undefined}
                    color={done ? colors.brandDark : colors.muted}>{t(`st_${s}` as any)}</Txt>
                </View>
              );
            })}
          </Row>
        </Card>
      ) : (
        <Banner level="danger" text={`${t(`st_${o.status}` as any)}${o.admin_note ? ` — ${o.admin_note}` : ''}`} />
      )}

      <Row gap={16} wrap style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1.4, minWidth: 300, gap: 14 }}>
          <Card>
            <Txt bold="800" size={15} style={{ marginBottom: 10 }}>
              {lang === 'ar' ? 'الأجهزة' : 'Devices'}
            </Txt>
            {o.items.map((i, idx) => (
              <View key={i.id} style={{ paddingVertical: 10, borderTopWidth: idx ? 1 : 0, borderTopColor: colors.border }}>
                <Row gap={12} style={{ alignItems: 'flex-start' }}>
                  <Img uri={i.product_image} ratio={1} style={{ width: 62 }} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt bold="700" size={13.5}>{lang === 'ar' ? i.product_name_ar : i.product_name_en}</Txt>
                    {i.unit_serial ? (
                      <Txt size={11} color={colors.muted}>🔖 SN: {i.unit_serial}</Txt>
                    ) : (
                      <Txt size={11} color={colors.warning}>
                        {lang === 'ar' ? 'لم يتم تخصيص وحدة بعد' : 'Unit not assigned yet'}
                      </Txt>
                    )}
                    {i.pricing_breakdown && Object.keys(i.pricing_breakdown).length ? (
                      <Txt size={11} color={colors.sub}>
                        {[
                          i.pricing_breakdown.months ? `${i.pricing_breakdown.months} ${t('month')}` : '',
                          i.pricing_breakdown.weeks ? `${i.pricing_breakdown.weeks} ${t('week')}` : '',
                          i.pricing_breakdown.days ? `${i.pricing_breakdown.days} ${t('day')}` : '',
                        ].filter(Boolean).join(' + ')}
                      </Txt>
                    ) : null}
                    <Row between center>
                      <Txt size={12} color={colors.sub}>×{i.qty}</Txt>
                      <Txt bold="700" size={14}>{money(i.line_total, lang)}</Txt>
                    </Row>
                  </View>
                </Row>
              </View>
            ))}
          </Card>

          <Card>
            <Txt bold="800" size={15} style={{ marginBottom: 8 }}>{t('deliveryDetails')}</Txt>
            <KV k={t('name')} v={o.contact_name} />
            <KV k={t('phone')} v={o.contact_phone} />
            <KV k={t('address')} v={o.delivery_address || '—'} />
            {o.notes ? <KV k={t('notes')} v={o.notes} /> : null}
            {o.admin_note ? <KV k={t('adminNote')} v={o.admin_note} tone={colors.warning} /> : null}
          </Card>
        </View>

        <View style={{ flex: 1, minWidth: 280, gap: 14 }}>
          <Card>
            <Txt bold="800" size={15} style={{ marginBottom: 8 }}>{lang === 'ar' ? 'الحساب' : 'Billing'}</Txt>
            {o.type === 'rent' && o.start_date ? (
              <>
                <KV k={t('rentalPeriod')} v={`${fmtDate(o.start_date, lang)} → ${fmtDate(o.end_date, lang)}`} />
                <KV k={lang === 'ar' ? 'عدد الأيام' : 'Days'} v={`${o.days}`} />
                {o.actual_return_date ? <KV k={t('returnDate')} v={fmtDate(o.actual_return_date, lang)} /> : null}
                <Divider v={8} />
              </>
            ) : null}
            <KV k={t('subtotal')} v={money(o.subtotal, lang)} />
            {o.deposit_total > 0 ? <KV k={`${t('deposit')} (${t('refundable')})`} v={money(o.deposit_total, lang)} /> : null}
            {o.delivery_fee > 0 ? <KV k={t('deliveryFee')} v={money(o.delivery_fee, lang)} /> : null}
            {o.late_fee_total > 0 ? <KV k={t('lateFee')} v={money(o.late_fee_total, lang)} tone={colors.danger} /> : null}
            {o.discount > 0 ? <KV k={t('discount')} v={`− ${money(o.discount, lang)}`} tone={colors.success} /> : null}
            <Divider v={8} />
            <Row between center>
              <Txt bold="800">{t('total')}</Txt>
              <Txt bold="800" size={19} color={colors.brandDark}>{money(o.total, lang)}</Txt>
            </Row>
            <KV k={t('paid')} v={money(o.amount_paid, lang)} tone={colors.success} />
            <KV k={t('due')} v={money(o.amount_due, lang)} tone={o.amount_due > 0 ? colors.danger : colors.success} />
            <Divider v={8} />
            <KV k={t('paymentMethod')}
              v={o.payment_method === 'stripe' ? t('cardStripe') : t('cashOnDelivery')} />
          </Card>

          <Card>
            <View style={{ gap: 9 }}>
              {o.payment_method === 'stripe' && o.amount_due > 0
                && ['approved', 'active', 'pending'].includes(o.status) ? (
                <Button full variant="success" icon="💳" title={t('payNow')} loading={busy} onPress={pay} />
              ) : null}
              {o.invoice_number ? (
                <Button full variant="secondary" icon="🧾" title={t('downloadInvoice')}
                  onPress={() => openUrl(api.docUrl(`/api/docs/invoice/${o.id}.pdf`))} />
              ) : null}
              {o.type === 'rent' && ['approved', 'active', 'returned', 'completed'].includes(o.status) ? (
                <Button full variant="secondary" icon="📄" title={t('downloadContract')}
                  onPress={() => openUrl(api.docUrl(`/api/docs/contract/${o.id}.pdf`))} />
              ) : null}
              <Button full variant="outline" icon="💬" title={t('contactWhatsapp')}
                onPress={() => openUrl(waLink(wa, lang === 'ar'
                  ? `استفسار عن الطلب رقم ${o.code}` : `Inquiry about order ${o.code}`))} />
              {['pending', 'approved'].includes(o.status) ? (
                <Button full variant="danger" icon="✕" title={t('cancelOrder')} loading={busy} onPress={cancel} />
              ) : null}
            </View>
          </Card>
        </View>
      </Row>
    </View>
  );
}
