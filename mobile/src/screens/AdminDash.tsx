import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Dashboard } from '../api';
import { Banner } from '../components';
import { fmtDate, money } from '../i18n';
import { useStore } from '../store';
import { colors, radius } from '../theme';
import {
  Badge, Button, Card, DateField, Divider, Empty, KV, Loading, Row, Stat, Txt,
  useLayout, useT,
} from '../ui';

export function AdminDashboard() {
  const { lang, go } = useStore();
  const { t } = useT();
  const [d, setD] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try { setD(await api.get<Dashboard>('/api/reports/dashboard')); }
      catch (e: any) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Loading />;
  if (err || !d) return <Banner level="danger" text={err} />;

  const k = d.kpis;
  const maxRev = Math.max(...d.revenue_series.map((s) => s.revenue), 1);

  const statusLabels: Record<string, string> = {
    available: t('us_available'), reserved: t('us_reserved'), rented: t('us_rented'),
    maintenance: t('us_maintenance'), sterilizing: t('us_sterilizing'), retired: t('us_retired'),
  };

  return (
    <View style={{ gap: 16 }}>
      <Txt bold="800" size={24}>{t('dashboard')}</Txt>

      <Row gap={12} wrap>
        <Stat icon="💰" label={t('revenueTotal')} value={money(k.revenue_total, lang)} tone={colors.brand} />
        <Stat icon="📈" label={t('revenueMonth')} value={money(k.revenue_month, lang)} tone={colors.success} />
        <Stat icon="🏦" label={t('collected')} value={money(k.collected, lang)} tone={colors.info} />
        <Stat icon="⏳" label={t('outstanding')} value={money(k.outstanding, lang)} tone={colors.danger} />
      </Row>
      <Row gap={12} wrap>
        <Stat icon="🕓" label={t('ordersPending')} value={k.orders_pending} tone={colors.warning} />
        <Stat icon="📦" label={t('ordersActive')} value={k.orders_active} tone={colors.success} />
        <Stat icon="⚠️" label={t('overdue')} value={k.orders_overdue} tone={colors.danger} />
        <Stat icon="👥" label={t('customers')} value={k.customers} tone={colors.brand} />
      </Row>
      <Row gap={12} wrap>
        <Stat icon="🩺" label={t('products')} value={k.products} tone={colors.brandDark} />
        <Stat icon="🔖" label={lang === 'ar' ? 'إجمالي الوحدات' : 'Total units'} value={k.units} tone={colors.brandDark} />
        <Stat icon="✅" label={t('unitsAvailable')} value={k.units_available} tone={colors.success} />
        <Stat icon="🛠️" label={t('openTickets')} value={k.tickets_open} tone={colors.warning} />
      </Row>

      <Row gap={16} wrap style={{ alignItems: 'flex-start' }}>
        <Card style={{ flex: 1.4, minWidth: 320 }}>
          <Txt bold="800" size={15} style={{ marginBottom: 16 }}>{t('revenueTrend')}</Txt>
          <Row gap={10} style={{ alignItems: 'flex-end', height: 160 }}>
            {d.revenue_series.map((s) => (
              <View key={s.month} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <Txt size={9.5} color={colors.sub}>{s.revenue >= 1000 ? `${Math.round(s.revenue / 1000)}k` : Math.round(s.revenue)}</Txt>
                <View style={{
                  width: '72%', height: Math.max(4, (s.revenue / maxRev) * 118),
                  backgroundColor: colors.brand, borderRadius: 6,
                }} />
                <Txt size={9.5} color={colors.muted}>{s.month.slice(5)}/{s.month.slice(2, 4)}</Txt>
              </View>
            ))}
          </Row>
        </Card>

        <Card style={{ flex: 1, minWidth: 260 }}>
          <Txt bold="800" size={15} style={{ marginBottom: 10 }}>{t('fleetStatus')}</Txt>
          {Object.entries(d.units_by_status).map(([s, n]) => {
            const pct = Math.round((n / Math.max(1, k.units)) * 100);
            return (
              <View key={s} style={{ gap: 4, paddingVertical: 5 }}>
                <Row between center>
                  <Txt size={12.5}>{statusLabels[s] || s}</Txt>
                  <Txt size={12.5} bold="700">{n} · {pct}%</Txt>
                </Row>
                <View style={{ height: 7, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.brand }} />
                </View>
              </View>
            );
          })}
        </Card>
      </Row>

      <Row gap={16} wrap style={{ alignItems: 'flex-start' }}>
        <Card style={{ flex: 1, minWidth: 300 }}>
          <Txt bold="800" size={15} style={{ marginBottom: 10 }}>{t('topProducts')}</Txt>
          {d.top_products.length === 0 ? <Txt color={colors.muted}>{t('none')}</Txt>
            : d.top_products.map((p, i) => (
              <View key={p.product_id} style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                <Row between center>
                  <Row center gap={9} style={{ flex: 1 }}>
                    <View style={{
                      width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brandLight,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Txt size={11} bold="800" color={colors.brandDark}>{i + 1}</Txt>
                    </View>
                    <Txt size={13} numberOfLines={1} style={{ flex: 1 }}>
                      {lang === 'ar' ? p.name_ar : p.name_en}
                    </Txt>
                  </Row>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt size={13} bold="700" color={colors.brandDark}>{money(p.revenue, lang)}</Txt>
                    <Txt size={10.5} color={colors.muted}>{p.orders} {lang === 'ar' ? 'طلب' : 'orders'}</Txt>
                  </View>
                </Row>
              </View>
            ))}
        </Card>

        <View style={{ flex: 1, minWidth: 300, gap: 16 }}>
          {d.overdue_orders.length ? (
            <Card style={{ borderColor: colors.danger + '55' }}>
              <Txt bold="800" size={15} color={colors.danger} style={{ marginBottom: 8 }}>
                ⚠️ {t('overdue')} ({d.overdue_orders.length})
              </Txt>
              {d.overdue_orders.map((o: any) => (
                <Pressable key={o.id} onPress={() => go({ name: 'admin.order', id: o.id })}>
                  <Row between center style={{ paddingVertical: 7 }}>
                    <View>
                      <Txt size={13} bold="700">{o.code}</Txt>
                      <Txt size={11} color={colors.muted}>{o.customer}</Txt>
                    </View>
                    <Badge tone="maintenance" small
                      label={`${o.days_late} ${lang === 'ar' ? 'يوم تأخير' : 'days late'}`} />
                  </Row>
                </Pressable>
              ))}
            </Card>
          ) : null}

          <Card>
            <Txt bold="800" size={15} style={{ marginBottom: 8 }}>📅 {t('dueSoon')}</Txt>
            {d.due_soon.length === 0 ? <Txt color={colors.muted} size={13}>{t('none')}</Txt>
              : d.due_soon.map((o: any) => (
                <Pressable key={o.id} onPress={() => go({ name: 'admin.order', id: o.id })}>
                  <Row between center style={{ paddingVertical: 7 }}>
                    <View>
                      <Txt size={13} bold="700">{o.code}</Txt>
                      <Txt size={11} color={colors.muted}>{o.customer}</Txt>
                    </View>
                    <Txt size={12}>{fmtDate(o.end_date, lang)}</Txt>
                  </Row>
                </Pressable>
              ))}
          </Card>
        </View>
      </Row>
    </View>
  );
}

// ---------------------------------------------------------------- reports
export function AdminReports() {
  const { lang } = useStore();
  const { t } = useT();
  const [tab, setTab] = useState<'revenue' | 'inventory'>('revenue');
  const [start, setStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [rev, setRev] = useState<any>(null);
  const [inv, setInv] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'revenue') setRev(await api.get('/api/reports/revenue', { start, end }));
      else setInv(await api.get('/api/reports/inventory'));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [tab, start, end]);
  useEffect(() => { load(); }, [load]);

  const csv = (rows: any[], headers: string[], keys: string[], filename: string) => {
    const lines = [headers.join(','), ...rows.map((r) => keys.map((k) => `"${r[k] ?? ''}"`).join(','))];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <View style={{ gap: 16 }}>
      <Txt bold="800" size={24}>{t('reports')}</Txt>
      <Row gap={10}>
        <Button small variant={tab === 'revenue' ? 'primary' : 'outline'} title={t('revenueReport')}
          onPress={() => setTab('revenue')} />
        <Button small variant={tab === 'inventory' ? 'primary' : 'outline'} title={t('inventoryReport')}
          onPress={() => setTab('inventory')} />
      </Row>

      {tab === 'revenue' ? (
        <>
          <Card>
            <Row gap={12} wrap center>
              <View style={{ flex: 1, minWidth: 160 }}><DateField label={t('from')} value={start} onChange={setStart} /></View>
              <View style={{ flex: 1, minWidth: 160 }}><DateField label={t('to')} value={end} onChange={setEnd} /></View>
              <Button title={t('apply')} onPress={load} style={{ marginTop: 18 }} />
            </Row>
          </Card>
          {loading ? <Loading /> : rev ? (
            <>
              <Row gap={12} wrap>
                <Stat icon="📅" label={t('forRent')} value={money(rev.rent.revenue, lang)} sub={`${rev.rent.orders} ${lang === 'ar' ? 'طلب' : 'orders'}`} />
                <Stat icon="🛒" label={t('forSale')} value={money(rev.sale.revenue, lang)} sub={`${rev.sale.orders} ${lang === 'ar' ? 'طلب' : 'orders'}`} tone={colors.info} />
                <Stat icon="⏰" label={t('lateFee')} value={money(rev.late_fees, lang)} tone={colors.warning} />
                <Stat icon="🔒" label={t('deposit')} value={money(rev.deposits_held, lang)} tone={colors.sub} />
                <Stat icon="💰" label={t('total')} value={money(rev.total, lang)} tone={colors.success} />
              </Row>
              <Card pad={0} style={{ overflow: 'hidden' }}>
                <Row between center style={{ padding: 14 }}>
                  <Txt bold="800" size={15}>{lang === 'ar' ? 'تفاصيل الطلبات' : 'Order details'}</Txt>
                  <Button small variant="secondary" icon="⬇️" title={t('exportCsv')}
                    onPress={() => csv(rev.rows, ['Code', 'Date', 'Customer', 'Type', 'Status', 'Total'],
                      ['code', 'date', 'customer', 'type', 'status', 'total'], 'scope-revenue.csv')} />
                </Row>
                <TableHead cols={[
                  lang === 'ar' ? 'الكود' : 'Code', t('date'), t('customer'),
                  lang === 'ar' ? 'النوع' : 'Type', t('status'), t('total')]} />
                {rev.rows.map((r: any, i: number) => (
                  <TableRow key={i} alt={i % 2 === 1} cells={[
                    r.code, fmtDate(r.date, lang), r.customer,
                    r.type === 'rent' ? t('forRent') : t('forSale'),
                    t(`st_${r.status}` as any), money(r.total, lang)]} />
                ))}
              </Card>
            </>
          ) : null}
        </>
      ) : (
        loading ? <Loading /> : inv ? (
          <>
            <Row gap={12} wrap>
              <Stat icon="🔖" label={lang === 'ar' ? 'إجمالي الوحدات' : 'Total units'} value={inv.totals.units} />
              <Stat icon="🏷️" label={t('assetValue')} value={money(inv.totals.asset_value, lang)} tone={colors.success} />
            </Row>
            <Card pad={0} style={{ overflow: 'hidden' }}>
              <Row between center style={{ padding: 14 }}>
                <Txt bold="800" size={15}>{t('inventoryReport')}</Txt>
                <Button small variant="secondary" icon="⬇️" title={t('exportCsv')}
                  onPress={() => csv(inv.rows, ['SKU', 'Name', 'Total', 'Available', 'Rented', 'Maintenance', 'Utilization%', 'AssetValue'],
                    ['sku', 'name_en', 'total', 'available', 'rented', 'maintenance', 'utilization', 'asset_value'], 'scope-inventory.csv')} />
              </Row>
              <TableHead cols={[lang === 'ar' ? 'الجهاز' : 'Device', lang === 'ar' ? 'إجمالي' : 'Total',
              t('us_available'), t('us_rented'), t('us_maintenance'), t('utilization'), t('assetValue')]} />
              {inv.rows.map((r: any) => (
                <TableRow key={r.product_id} cells={[
                  lang === 'ar' ? r.name_ar : r.name_en, r.total, r.available, r.rented,
                  r.maintenance, `${r.utilization}%`, money(r.asset_value, lang)]} />
              ))}
            </Card>
          </>
        ) : null
      )}
    </View>
  );
}

export function TableHead({ cols }: { cols: string[] }) {
  const { rtl } = useStore();
  return (
    <View style={{
      flexDirection: rtl ? 'row-reverse' : 'row', backgroundColor: colors.brand,
      paddingVertical: 10, paddingHorizontal: 12,
    }}>
      {cols.map((c, i) => (
        <View key={i} style={{ flex: i === 0 ? 2 : 1 }}>
          <Text style={{
            color: '#fff', fontSize: 11.5, fontWeight: '800',
            textAlign: rtl ? 'right' : 'left',
          }}>{c}</Text>
        </View>
      ))}
    </View>
  );
}

export function TableRow({ cells, alt, onPress }: { cells: React.ReactNode[]; alt?: boolean; onPress?: () => void }) {
  const { rtl } = useStore();
  const content = (
    <View style={{
      flexDirection: rtl ? 'row-reverse' : 'row', paddingVertical: 11, paddingHorizontal: 12,
      backgroundColor: alt ? colors.brandSoft : '#fff', borderTopWidth: 1, borderTopColor: colors.border,
      alignItems: 'center',
    }}>
      {cells.map((c, i) => (
        <View key={i} style={{ flex: i === 0 ? 2 : 1, paddingHorizontal: 2 }}>
          {typeof c === 'string' || typeof c === 'number'
            ? <Text style={{ fontSize: 12.5, color: colors.text, textAlign: rtl ? 'right' : 'left' }} numberOfLines={2}>{c}</Text>
            : c}
        </View>
      ))}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}
