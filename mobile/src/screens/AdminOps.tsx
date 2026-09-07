import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Order, Review, Ticket, Unit, User } from '../api';
import { Banner } from '../components';
import { fmtDate, fmtDateTime, money, pickLang } from '../i18n';
import { useStore } from '../store';
import { colors, radius } from '../theme';
import {
  Badge, Button, Card, Chips, DateField, Divider, Empty, Field, Img, KV, Loading, Row,
  Select, Sheet, Stars, Switch, Txt, openUrl, useLayout, useT, waLink,
} from '../ui';
import { OrderRow } from './Orders';
import { TableHead, TableRow } from './AdminDash';

// ---------------------------------------------------------------- orders
export function AdminOrders() {
  const { go, lang } = useStore();
  const { t } = useT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await api.get<Order[]>('/api/orders', { status: status || undefined, q: q || undefined })); }
    finally { setLoading(false); }
  }, [status, q]);
  useEffect(() => { const i = setTimeout(load, 250); return () => clearTimeout(i); }, [load]);

  return (
    <View style={{ gap: 16 }}>
      <Txt bold="800" size={24}>{t('allOrders')} ({orders.length})</Txt>
      <Field value={q} onChangeText={setQ} placeholder={lang === 'ar' ? 'ابحث بكود الطلب…' : 'Search order code…'} />
      <Chips value={status} onChange={(v) => setStatus(v as string)}
        options={[{ value: '', label: t('all') },
        ...['pending', 'approved', 'active', 'returned', 'completed', 'rejected', 'cancelled']
          .map((s) => ({ value: s, label: t(`st_${s}` as any) }))]} />
      {loading ? <Loading /> : orders.length === 0 ? <Empty icon="📦" title={t('noResults')} /> : (
        <View style={{ gap: 12 }}>
          {orders.map((o) => (
            <OrderRow key={o.id} o={o} showCustomer onPress={() => go({ name: 'admin.order', id: o.id })} />
          ))}
        </View>
      )}
    </View>
  );
}

export function AdminOrderDetail({ id }: { id: number }) {
  const { lang, toast, settings } = useStore();
  const { t } = useT();
  const { isDesktop } = useLayout();
  const [o, setO] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState('0');
  const [fee, setFee] = useState('0');

  const [assignFor, setAssignFor] = useState<number | null>(null);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('0');
  const [payMethod, setPayMethod] = useState('cash_on_delivery');
  const [payRef, setPayRef] = useState('');
  const [returnOpen, setReturnOpen] = useState(false);
  const [retDate, setRetDate] = useState(new Date().toISOString().slice(0, 10));
  const [retNote, setRetNote] = useState('');
  const [sterilize, setSterilize] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Order>(`/api/orders/${id}`);
      setO(data);
      setNote(data.admin_note || '');
      setDiscount(String(data.discount || 0));
      setFee(String(data.delivery_fee || 0));
      setPayAmount(String(data.amount_due || 0));
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      setO(await api.patch<Order>(`/api/orders/${id}/status`, {
        status, admin_note: note, discount: Number(discount) || 0, delivery_fee: Number(fee) || 0,
      }));
      toast(t('saved'));
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const openAssign = async (itemId: number) => {
    setAssignFor(itemId);
    try { setSuggested(await api.get<any[]>(`/api/orders/${id}/suggest-units`, { item_id: itemId })); }
    catch { setSuggested([]); }
  };

  const assign = async (unitId: number) => {
    if (!assignFor) return;
    setBusy(true);
    try {
      setO(await api.post<Order>(`/api/orders/${id}/assign-unit`, { item_id: assignFor, unit_id: unitId }));
      toast(t('saved')); setAssignFor(null);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const doReturn = async () => {
    setBusy(true);
    try {
      setO(await api.post<Order>(`/api/orders/${id}/return`, {
        actual_return_date: retDate, condition_note: retNote, send_to_sterilization: sterilize,
      }));
      toast(t('saved')); setReturnOpen(false);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const addPayment = async () => {
    setBusy(true);
    try {
      setO(await api.post<Order>(`/api/orders/${id}/payments`, {
        amount: Number(payAmount) || 0, method: payMethod, reference: payRef,
      }));
      toast(t('saved')); setPayOpen(false);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  if (loading) return <Loading />;
  if (!o) return <Banner level="danger" text="Not found" />;

  const wa = settings.whatsapp || '201113138839';

  const actions = (
    <Card>
      <View style={{ gap: 10 }}>
        <Txt bold="800" size={15}>⚡ {lang === 'ar' ? 'إجراءات' : 'Actions'}</Txt>
        <Row gap={10} wrap>
          <Field label={t('discount')} keyboard="numeric" value={discount} onChangeText={setDiscount} />
          <Field label={t('deliveryFee')} keyboard="numeric" value={fee} onChangeText={setFee} />
        </Row>
        <Field label={t('adminNote')} value={note} onChangeText={setNote} multiline />
        <Divider v={6} />
        <Row gap={8} wrap>
          {o.status === 'pending' ? (
            <>
              <Button variant="success" icon="✓" title={t('approve')} loading={busy} onPress={() => setStatus('approved')} />
              <Button variant="danger" icon="✕" title={t('reject')} loading={busy} onPress={() => setStatus('rejected')} />
            </>
          ) : null}
          {o.status === 'approved' ? (
            <Button icon="🚚" title={t('markDelivered')} loading={busy} onPress={() => setStatus('active')} />
          ) : null}
          {o.status === 'active' && o.type === 'rent' ? (
            <Button variant="secondary" icon="📥" title={t('markReturned')} onPress={() => setReturnOpen(true)} />
          ) : null}
          {['returned', 'active'].includes(o.status) ? (
            <Button variant="success" icon="🏁" title={t('markCompleted')} loading={busy} onPress={() => setStatus('completed')} />
          ) : null}
          <Button variant="outline" icon="💵" title={t('recordPayment')} onPress={() => setPayOpen(true)} />
          <Button variant="outline" icon="🧾" title={t('downloadInvoice')}
            onPress={() => openUrl(api.docUrl(`/api/docs/invoice/${o.id}.pdf`))} />
          {o.type === 'rent' ? (
            <Button variant="outline" icon="📄" title={t('downloadContract')}
              onPress={() => openUrl(api.docUrl(`/api/docs/contract/${o.id}.pdf`))} />
          ) : null}
          <Button variant="ghost" icon="💬" title={t('whatsapp')}
            onPress={() => openUrl(waLink(o.customer_phone || wa,
              lang === 'ar' ? `بخصوص طلبكم رقم ${o.code}` : `Regarding your order ${o.code}`))} />
          {!['cancelled', 'completed'].includes(o.status) ? (
            <Button variant="ghost" title={t('st_cancelled')} loading={busy} onPress={() => setStatus('cancelled')} />
          ) : null}
        </Row>
      </View>
    </Card>
  );

  return (
    <View style={{ gap: 16 }}>
      <Row between center wrap gap={10}>
        <View>
          <Txt bold="800" size={22}>{o.code}</Txt>
          <Txt size={12.5} color={colors.muted}>{fmtDateTime(o.created_at, lang)}</Txt>
        </View>
        <Row gap={8} center>
          <Badge tone={o.type === 'rent' ? 'available' : 'reserved'}
            label={o.type === 'rent' ? t('forRent') : t('forSale')} />
          <Badge tone={o.status} label={t(`st_${o.status}` as any)} />
          <Badge tone={o.payment_status} label={o.payment_status === 'paid'
            ? (lang === 'ar' ? 'مدفوع' : 'Paid') : `${t('due')} ${money(o.amount_due, lang)}`} />
        </Row>
      </Row>

      <Row gap={16} wrap style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1.5, minWidth: 320, gap: 14 }}>
          <Card>
            <Txt bold="800" size={15} style={{ marginBottom: 10 }}>
              {lang === 'ar' ? 'البنود وتخصيص الوحدات' : 'Items & unit assignment'}
            </Txt>
            {o.items.map((i, idx) => (
              <View key={i.id} style={{ paddingVertical: 11, borderTopWidth: idx ? 1 : 0, borderTopColor: colors.border }}>
                <Row gap={12} style={{ alignItems: 'flex-start' }}>
                  <Img uri={i.product_image} ratio={1} style={{ width: 58 }} />
                  <View style={{ flex: 1, gap: 5 }}>
                    <Txt bold="700" size={13.5}>{lang === 'ar' ? i.product_name_ar : i.product_name_en}</Txt>
                    <Row between center>
                      <Txt size={12} color={colors.sub}>×{i.qty} · {money(i.line_total, lang)}</Txt>
                      {i.unit_serial
                        ? <Badge small tone="available" label={`🔖 ${i.unit_serial}`} />
                        : <Badge small tone="open" label={lang === 'ar' ? 'بدون وحدة' : 'Unassigned'} />}
                    </Row>
                    <Button small variant="secondary" title={t('assignUnit')} onPress={() => openAssign(i.id)} />
                  </View>
                </Row>
              </View>
            ))}
          </Card>
          {actions}
        </View>

        <View style={{ flex: 1, minWidth: 290, gap: 14 }}>
          <Card>
            <Txt bold="800" size={15} style={{ marginBottom: 8 }}>{t('customer')}</Txt>
            <KV k={t('name')} v={o.customer_name} />
            <KV k={t('phone')} v={o.contact_phone || o.customer_phone} />
            <KV k={t('address')} v={o.delivery_address || '—'} />
            {o.notes ? <KV k={t('notes')} v={o.notes} /> : null}
          </Card>

          <Card>
            <Txt bold="800" size={15} style={{ marginBottom: 8 }}>{lang === 'ar' ? 'الحساب' : 'Billing'}</Txt>
            {o.type === 'rent' && o.start_date ? (
              <>
                <KV k={t('rentalPeriod')} v={`${fmtDate(o.start_date, lang)} → ${fmtDate(o.end_date, lang)}`} />
                <KV k={lang === 'ar' ? 'الأيام' : 'Days'} v={`${o.days}`} />
                {o.actual_return_date ? <KV k={t('returnDate')} v={fmtDate(o.actual_return_date, lang)} /> : null}
                <Divider v={6} />
              </>
            ) : null}
            <KV k={t('subtotal')} v={money(o.subtotal, lang)} />
            {o.deposit_total > 0 ? <KV k={t('deposit')} v={money(o.deposit_total, lang)} /> : null}
            {o.delivery_fee > 0 ? <KV k={t('deliveryFee')} v={money(o.delivery_fee, lang)} /> : null}
            {o.late_fee_total > 0 ? <KV k={t('lateFee')} v={money(o.late_fee_total, lang)} tone={colors.danger} /> : null}
            {o.discount > 0 ? <KV k={t('discount')} v={`− ${money(o.discount, lang)}`} tone={colors.success} /> : null}
            <Divider v={6} />
            <Row between center>
              <Txt bold="800">{t('total')}</Txt>
              <Txt bold="800" size={18} color={colors.brandDark}>{money(o.total, lang)}</Txt>
            </Row>
            <KV k={t('paid')} v={money(o.amount_paid, lang)} tone={colors.success} />
            <KV k={t('due')} v={money(o.amount_due, lang)} tone={o.amount_due > 0 ? colors.danger : colors.success} />
          </Card>
        </View>
      </Row>

      {/* -------------------------------------------------- assign sheet */}
      <Sheet open={assignFor !== null} onClose={() => setAssignFor(null)} title={t('assignUnit')}>
        {suggested.length === 0 ? (
          <Banner level="warning" text={lang === 'ar'
            ? 'لا توجد وحدات متاحة في هذه الفترة — راجع المخزون أو الصيانة.'
            : 'No units available for this period — check inventory or maintenance.'} />
        ) : suggested.map((u) => (
          <Card key={u.id} pad={12} onPress={() => assign(u.id)}>
            <Row between center>
              <View>
                <Txt bold="700" size={13.5}>🔖 {u.serial_number}</Txt>
                <Txt size={11.5} color={colors.muted}>{u.location}</Txt>
              </View>
              <Badge small tone={u.status} label={t(`us_${u.status}` as any)} />
            </Row>
          </Card>
        ))}
      </Sheet>

      {/* ------------------------------------------------- payment sheet */}
      <Sheet open={payOpen} onClose={() => setPayOpen(false)} title={t('recordPayment')}>
        <Field label={t('amount')} keyboard="numeric" value={payAmount} onChangeText={setPayAmount} />
        <Select label={t('paymentMethod')} value={payMethod} onChange={(v) => setPayMethod(v as string)}
          options={[{ value: 'cash_on_delivery', label: t('cashOnDelivery') },
          { value: 'stripe', label: t('cardStripe') }]} />
        <Field label={lang === 'ar' ? 'مرجع / رقم إيصال' : 'Reference'} value={payRef} onChangeText={setPayRef} />
        <Button full title={t('save')} loading={busy} onPress={addPayment} />
      </Sheet>

      {/* -------------------------------------------------- return sheet */}
      <Sheet open={returnOpen} onClose={() => setReturnOpen(false)} title={t('markReturned')}>
        <DateField label={t('returnDate')} value={retDate} onChange={setRetDate} />
        <Field label={t('conditionNote')} value={retNote} onChangeText={setRetNote} multiline
          placeholder={lang === 'ar' ? 'حالة الجهاز، أي تلف، ملاحظات الفني…' : 'Device condition, damage, technician notes…'} />
        <Switch label={t('sendToSterilization')} value={sterilize} onChange={setSterilize} />
        <Banner level="info" text={lang === 'ar'
          ? 'لو التاريخ بعد نهاية الإيجار هتتحسب غرامة تأخير تلقائياً حسب تعريفة كل جهاز.'
          : 'If the date is past the end date, a late fee is computed automatically per device rate.'} />
        <Button full title={t('confirm')} loading={busy} onPress={doReturn} />
      </Sheet>
    </View>
  );
}

// -------------------------------------------------------------- customers
export function AdminCustomers() {
  const { lang, toast } = useStore();
  const { t } = useT();
  const { isPhone } = useLayout();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await api.get<User[]>('/api/users', { q: q || undefined })); }
    finally { setLoading(false); }
  }, [q]);
  useEffect(() => { const i = setTimeout(load, 250); return () => clearTimeout(i); }, [load]);

  const toggle = async (u: User) => {
    try { await api.patch(`/api/users/${u.id}/toggle`); toast(t('saved')); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <View style={{ gap: 16 }}>
      <Txt bold="800" size={24}>{t('customers')} ({users.length})</Txt>
      <Field value={q} onChangeText={setQ} placeholder={t('search')} />
      {loading ? <Loading /> : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {!isPhone ? <TableHead cols={[t('name'), t('email'), t('phone'), t('organization'), t('city'), t('status'), '']} /> : null}
          {users.map((u, i) => isPhone ? (
            <View key={u.id} style={{ padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, gap: 5 }}>
              <Txt bold="700">{u.name}</Txt>
              <Txt size={11.5} color={colors.muted}>{u.email} · {u.phone}</Txt>
              <Row gap={6} center wrap>
                <Badge small tone={u.role === 'admin' ? 'reserved' : 'available'} label={u.role === 'admin' ? t('admin') : t('customer')} />
                <Badge small tone={u.is_active ? 'available' : 'retired'} label={u.is_active ? '✓' : '✕'} />
                <Button small variant="secondary" title={t('orderDetails')}
                  onPress={async () => setDetail(await api.get(`/api/users/${u.id}`))} />
              </Row>
            </View>
          ) : (
            <TableRow key={u.id} alt={i % 2 === 1} cells={[
              <Row key="n" center gap={8}>
                <View style={{
                  width: 30, height: 30, borderRadius: 15, backgroundColor: colors.brandLight,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Txt bold="800" size={12} color={colors.brandDark}>{u.name?.[0]}</Txt>
                </View>
                <Txt size={12.5} bold="700">{u.name}</Txt>
              </Row>,
              u.email, u.phone || '—', u.organization || '—', u.city || '—',
              <Badge key="s" small tone={u.is_active ? 'available' : 'retired'}
                label={u.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'موقوف' : 'Disabled')} />,
              <Row key="a" gap={5}>
                <Button small variant="secondary" title="👁"
                  onPress={async () => setDetail(await api.get(`/api/users/${u.id}`))} />
                {u.role !== 'admin' ? (
                  <Button small variant="ghost" title={u.is_active ? '🚫' : '✓'} onPress={() => toggle(u)} />
                ) : null}
              </Row>,
            ]} />
          ))}
        </Card>
      )}

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.name}>
        {detail ? (
          <View style={{ gap: 6 }}>
            <KV k={t('email')} v={detail.email} />
            <KV k={t('phone')} v={detail.phone || '—'} />
            <KV k={t('organization')} v={detail.organization || '—'} />
            <KV k={t('city')} v={detail.city || '—'} />
            <KV k={t('address')} v={detail.address || '—'} />
            <Divider />
            <KV k={lang === 'ar' ? 'عدد الطلبات' : 'Orders'} v={detail.orders_count} />
            <KV k={lang === 'ar' ? 'إجمالي الإنفاق' : 'Total spent'} v={money(detail.total_spent, lang)} tone={colors.success} />
            <KV k={lang === 'ar' ? 'تاريخ التسجيل' : 'Joined'} v={fmtDate(detail.created_at, lang)} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

// ------------------------------------------------------------ maintenance
export function AdminMaintenance() {
  const { lang, toast } = useStore();
  const { t } = useT();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [due, setDue] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tk, dd, un] = await Promise.all([
        api.get<Ticket[]>('/api/maintenance/tickets', { status: status || undefined }),
        api.get<any[]>('/api/maintenance/due', { days: 30 }),
        api.get<Unit[]>('/api/units'),
      ]);
      setTickets(tk); setDue(dd); setUnits(un);
    } finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      if (editing.id) {
        await api.patch(`/api/maintenance/tickets/${editing.id}`, {
          status: editing.status, priority: editing.priority, technician: editing.technician,
          cost: Number(editing.cost) || 0, description: editing.description,
          scheduled_at: editing.scheduled_at || null, next_due_at: editing.next_due_at || null,
        });
      } else {
        await api.post('/api/maintenance/tickets', {
          unit_id: editing.unit_id, type: editing.type, priority: editing.priority,
          title: editing.title, description: editing.description, technician: editing.technician,
          cost: Number(editing.cost) || 0, scheduled_at: editing.scheduled_at || null,
          next_due_at: editing.next_due_at || null,
        });
      }
      toast(t('saved')); setOpen(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const setF = (k: string, v: any) => setEditing((e: any) => ({ ...e, [k]: v }));

  return (
    <View style={{ gap: 16 }}>
      <Row between center wrap gap={10}>
        <Txt bold="800" size={24}>{t('maintenance')} ({tickets.length})</Txt>
        <Button icon="＋" title={t('newTicket')} onPress={() => {
          setEditing({
            unit_id: units[0]?.id || 0, type: 'maintenance', priority: 'normal',
            title: '', description: '', technician: '', cost: 0,
            scheduled_at: new Date().toISOString().slice(0, 10), next_due_at: '',
          }); setOpen(true);
        }} />
      </Row>

      {due.length ? (
        <Card style={{ borderColor: colors.warning + '55' }}>
          <Txt bold="800" size={15} color={colors.warning} style={{ marginBottom: 8 }}>
            🔧 {t('serviceDue')} ({due.length})
          </Txt>
          {due.slice(0, 6).map((d) => (
            <Row key={d.unit_id} between center style={{ paddingVertical: 6 }}>
              <View style={{ flex: 1 }}>
                <Txt size={13} bold="700" numberOfLines={1}>
                  {lang === 'ar' ? d.product_name_ar : d.product_name_en}
                </Txt>
                <Txt size={11} color={colors.muted}>🔖 {d.serial_number}</Txt>
              </View>
              <Badge small tone={d.overdue ? 'maintenance' : 'open'} label={fmtDate(d.next_service_due, lang)} />
            </Row>
          ))}
        </Card>
      ) : null}

      <Chips value={status} onChange={(v) => setStatus(v as string)}
        options={[{ value: '', label: t('all') },
        ...['open', 'in_progress', 'done', 'cancelled'].map((s) => ({ value: s, label: t(`ts_${s}` as any) }))]} />

      {loading ? <Loading /> : tickets.length === 0 ? <Empty icon="🛠️" title={t('noResults')} /> : (
        <View style={{ gap: 12 }}>
          {tickets.map((tk) => (
            <Card key={tk.id} pad={13} onPress={() => {
              setEditing({ ...tk, scheduled_at: tk.scheduled_at || '', next_due_at: tk.next_due_at || '' });
              setOpen(true);
            }}>
              <View style={{ gap: 7 }}>
                <Row between center>
                  <Row center gap={8}>
                    <Txt bold="800" size={14}>{tk.code}</Txt>
                    <Badge small tone={tk.status} label={t(`ts_${tk.status}` as any)} />
                    <Badge small tone={tk.priority} label={t(`pr_${tk.priority}` as any)} />
                  </Row>
                  <Badge small label={t(`tt_${tk.type}` as any)} />
                </Row>
                <Txt bold="700" size={13.5}>{tk.title}</Txt>
                <Txt size={12} color={colors.sub} numberOfLines={2}>{tk.description}</Txt>
                <Row between center wrap gap={8}>
                  <Txt size={11.5} color={colors.muted}>
                    {lang === 'ar' ? tk.product_name_ar : tk.product_name_en} · 🔖 {tk.unit_serial}
                  </Txt>
                  <Row gap={10} center>
                    {tk.technician ? <Txt size={11.5} color={colors.muted}>👷 {tk.technician}</Txt> : null}
                    {tk.cost ? <Txt size={12} bold="700" color={colors.brandDark}>{money(tk.cost, lang)}</Txt> : null}
                  </Row>
                </Row>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={editing?.id ? editing.code : t('newTicket')}>
        {editing ? (
          <View style={{ gap: 12 }}>
            {!editing.id ? (
              <>
                <Select label={t('units')} value={editing.unit_id} onChange={(v) => setF('unit_id', v)}
                  options={units.map((u) => ({
                    value: u.id,
                    label: `${u.serial_number} — ${lang === 'ar' ? u.product_name_ar : u.product_name_en}`,
                  }))} />
                <Select label={t('ticketType')} value={editing.type} onChange={(v) => setF('type', v)}
                  options={['maintenance', 'sterilization', 'calibration', 'inspection']
                    .map((s) => ({ value: s, label: t(`tt_${s}` as any) }))} />
                <Field label={lang === 'ar' ? 'العنوان' : 'Title'} value={editing.title} onChangeText={(v) => setF('title', v)} />
              </>
            ) : (
              <Select label={t('status')} value={editing.status} onChange={(v) => setF('status', v)}
                options={['open', 'in_progress', 'done', 'cancelled'].map((s) => ({ value: s, label: t(`ts_${s}` as any) }))} />
            )}
            <Select label={t('priority')} value={editing.priority} onChange={(v) => setF('priority', v)}
              options={['low', 'normal', 'high', 'urgent'].map((s) => ({ value: s, label: t(`pr_${s}` as any) }))} />
            <Field label={lang === 'ar' ? 'الوصف' : 'Description'} value={editing.description} onChangeText={(v) => setF('description', v)} multiline />
            <Row gap={10}>
              <Field label={t('technician')} value={editing.technician} onChangeText={(v) => setF('technician', v)} />
              <Field label={t('cost')} keyboard="numeric" value={String(editing.cost || 0)} onChangeText={(v) => setF('cost', v)} />
            </Row>
            <Row gap={10}>
              <DateField label={lang === 'ar' ? 'موعد التنفيذ' : 'Scheduled'} value={editing.scheduled_at || ''} onChange={(v) => setF('scheduled_at', v)} />
              <DateField label={lang === 'ar' ? 'الصيانة القادمة' : 'Next due'} value={editing.next_due_at || ''} onChange={(v) => setF('next_due_at', v)} />
            </Row>
            <Row gap={10}>
              <Button title={t('save')} loading={busy} onPress={save} />
              {editing.id ? (
                <Button variant="ghost" title={t('delete')} onPress={async () => {
                  await api.del(`/api/maintenance/tickets/${editing.id}`);
                  toast(t('deleted')); setOpen(false); load();
                }} />
              ) : null}
            </Row>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

// ---------------------------------------------------------------- reviews
export function AdminReviews() {
  const { lang, toast } = useStore();
  const { t } = useT();
  const [pending, setPending] = useState<Review[]>([]);
  const [all, setAll] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        api.get<Review[]>('/api/reviews', { pending: true }),
        api.get<Review[]>('/api/reviews'),
      ]);
      setPending(p); setAll(a);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (r: Review, approve: boolean) => {
    try {
      if (approve) await api.patch(`/api/reviews/${r.id}/approve`, undefined, { approve: true });
      else await api.del(`/api/reviews/${r.id}`);
      toast(t('saved')); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const item = (r: Review, showActions: boolean) => (
    <Card key={r.id} pad={13}>
      <View style={{ gap: 7 }}>
        <Row between center>
          <View style={{ flex: 1 }}>
            <Txt bold="700" size={13.5}>{r.user_name}</Txt>
            <Txt size={11.5} color={colors.muted} numberOfLines={1}>{r.product_name_ar}</Txt>
          </View>
          <Stars value={r.rating} size={14} />
        </Row>
        {r.comment ? <Txt size={13} color={colors.sub}>{r.comment}</Txt> : null}
        <Row between center>
          <Txt size={10.5} color={colors.muted}>{fmtDate(r.created_at, lang)}</Txt>
          {showActions ? (
            <Row gap={7}>
              <Button small variant="success" title={t('approveReview')} onPress={() => act(r, true)} />
              <Button small variant="ghost" title={t('delete')} onPress={() => act(r, false)} />
            </Row>
          ) : (
            <Row gap={7} center>
              <Badge small tone={r.is_approved ? 'available' : 'open'}
                label={r.is_approved ? (lang === 'ar' ? 'معتمد' : 'Approved') : (lang === 'ar' ? 'معلق' : 'Pending')} />
              <Button small variant="ghost" title="🗑" onPress={() => act(r, false)} />
            </Row>
          )}
        </Row>
      </View>
    </Card>
  );

  return (
    <View style={{ gap: 16 }}>
      <Txt bold="800" size={24}>{t('reviews')}</Txt>
      {loading ? <Loading /> : (
        <>
          {pending.length ? (
            <View style={{ gap: 10 }}>
              <Txt bold="800" size={16} color={colors.warning}>⏳ {t('pendingReviews')} ({pending.length})</Txt>
              {pending.map((r) => item(r, true))}
            </View>
          ) : <Banner level="success" text={lang === 'ar' ? 'لا توجد تقييمات بانتظار الاعتماد.' : 'No reviews awaiting approval.'} />}
          <Divider />
          <Txt bold="800" size={16}>{lang === 'ar' ? 'كل التقييمات' : 'All reviews'} ({all.length})</Txt>
          <View style={{ gap: 10 }}>{all.map((r) => item(r, false))}</View>
        </>
      )}
    </View>
  );
}

// --------------------------------------------------------------- settings
export function AdminSettings() {
  const { lang, toast, settings } = useStore();
  const { t } = useT();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.get<Record<string, any>>('/api/settings');
        const clean: Record<string, string> = {};
        Object.entries(s).forEach(([k, v]) => {
          if (!['stripe_enabled', 'stripe_publishable_key'].includes(k)) clean[k] = String(v);
        });
        setForm(clean);
      } finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    try { await api.put('/api/settings', form); toast(t('saved')); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  if (loading) return <Loading />;

  const fields: [string, string][] = [
    ['company_name_ar', 'اسم الشركة (عربي)'],
    ['company_name_en', 'Company name (EN)'],
    ['phone', t('phone')],
    ['whatsapp', 'WhatsApp (2010…)'],
    ['email', t('email')],
    ['address_ar', 'العنوان (عربي)'],
    ['address_en', 'Address (EN)'],
    ['delivery_fee', t('deliveryFee')],
    ['hero_title_ar', 'عنوان الصفحة الرئيسية (ع)'],
    ['hero_title_en', 'Hero title (EN)'],
  ];

  return (
    <View style={{ gap: 16, maxWidth: 760, width: '100%' }}>
      <Txt bold="800" size={24}>{t('settings')}</Txt>
      <Card>
        <View style={{ gap: 12 }}>
          <Txt bold="800" size={15}>🏢 {lang === 'ar' ? 'بيانات الشركة' : 'Company details'}</Txt>
          <Row gap={10} wrap>
            {fields.map(([k, l]) => (
              <View key={k} style={{ flex: 1, minWidth: 230 }}>
                <Field label={l} value={form[k] ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, [k]: v }))} />
              </View>
            ))}
          </Row>
          <Button title={t('save')} loading={busy} onPress={save} />
        </View>
      </Card>

      <Card>
        <Txt bold="800" size={15} style={{ marginBottom: 8 }}>💳 Stripe</Txt>
        <KV k={lang === 'ar' ? 'الحالة' : 'Status'}
          v={<Badge tone={settings.stripe_enabled ? 'available' : 'open'}
            label={settings.stripe_enabled
              ? (lang === 'ar' ? 'مفعّل — وضع حقيقي' : 'Enabled — live')
              : (lang === 'ar' ? 'وضع تجريبي (محاكاة)' : 'Demo mode (simulated)')} />} />
        <Banner level="info" text={lang === 'ar'
          ? 'لتفعيل الدفع الحقيقي: ضع STRIPE_SECRET_KEY و STRIPE_PUBLISHABLE_KEY و STRIPE_WEBHOOK_SECRET في ملف backend/.env ثم أعد تشغيل الخادم.'
          : 'To go live: set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY and STRIPE_WEBHOOK_SECRET in backend/.env and restart the API.'} />
      </Card>
    </View>
  );
}
