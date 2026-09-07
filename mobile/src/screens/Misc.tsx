import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Post, Notif } from '../api';
import { Banner, Grid, PostCard } from '../components';
import { fmtDate, fmtDateTime, money, pickLang } from '../i18n';
import { useStore } from '../store';
import { colors, radius } from '../theme';
import {
  Badge, Button, Card, Divider, Empty, Field, Img, KV, Loading, Row, Stars, Switch, Txt,
  useLayout, useT,
} from '../ui';

// -------------------------------------------------------------------- blog
export function BlogScreen() {
  const { go, lang } = useStore();
  const { t } = useT();
  const [posts, setPosts] = useState<Post[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(async () => {
      setLoading(true);
      try { setPosts(await api.get<Post[]>('/api/posts', { q: q || undefined })); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <View style={{ gap: 16 }}>
      <Txt bold="800" size={24}>{t('blog')}</Txt>
      <Txt color={colors.sub}>
        {lang === 'ar'
          ? 'مقالات ودلائل عملية من فريق سكوب عن المناظير والأجهزة الطبية.'
          : 'Practical guides from the SCOPE team on endoscopes and medical equipment.'}
      </Txt>
      <Field value={q} onChangeText={setQ} placeholder={t('search')} />
      {loading ? <Loading /> : posts.length === 0 ? <Empty icon="📰" title={t('noResults')} /> : (
        <Grid>
          {posts.map((p) => <PostCard key={p.id} post={p} onPress={() => go({ name: 'post', id: p.id })} />)}
        </Grid>
      )}
    </View>
  );
}

export function PostScreen({ id }: { id: number }) {
  const { lang, go } = useStore();
  const { t } = useT();
  const [p, setP] = useState<Post | null>(null);
  const [others, setOthers] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const post = await api.get<Post>(`/api/posts/${id}`);
        setP(post);
        const all = await api.get<Post[]>('/api/posts');
        setOthers(all.filter((x) => x.id !== post.id).slice(0, 3));
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <Loading />;
  if (!p) return <Banner level="danger" text="Not found" />;

  const body = pickLang(p, 'body', lang);

  return (
    <View style={{ gap: 18, maxWidth: 820, width: '100%', alignSelf: 'center' }}>
      <Img uri={p.cover} ratio={2.4} />
      <Row gap={8} wrap>{(p.tags || []).map((tg) => <Badge key={tg} label={tg} />)}</Row>
      <Txt bold="800" size={26} style={{ lineHeight: 38 }}>{pickLang(p, 'title', lang)}</Txt>
      <Txt size={12.5} color={colors.muted}>
        {p.author} · {fmtDate(p.published_at, lang)} · {p.views} {lang === 'ar' ? 'مشاهدة' : 'views'}
      </Txt>
      <Divider />
      <View style={{ gap: 14 }}>
        {body.split('\n').filter((l) => l.trim()).map((para, i) => (
          <Txt key={i} size={15} style={{ lineHeight: 27 }} color={colors.text}>{para}</Txt>
        ))}
      </View>
      {others.length ? (
        <>
          <Divider v={20} />
          <Txt bold="800" size={19}>{lang === 'ar' ? 'اقرأ أيضاً' : 'Read next'}</Txt>
          <Grid>
            {others.map((o) => <PostCard key={o.id} post={o} onPress={() => go({ name: 'post', id: o.id })} />)}
          </Grid>
        </>
      ) : null}
    </View>
  );
}

// ----------------------------------------------------------------- compare
export function CompareScreen() {
  const { compare, toggleCompare, clearCompare, lang, go } = useStore();
  const { t } = useT();

  if (!compare.length) {
    return <Empty icon="⇄" title={lang === 'ar' ? 'لم تختر أجهزة للمقارنة' : 'No devices selected'}
      sub={lang === 'ar' ? 'اضغط على أيقونة ⇄ في أي جهاز لإضافته للمقارنة (حتى 4 أجهزة).'
        : 'Tap the ⇄ icon on any device to add it (up to 4).'}
      action={<Button title={t('browseNow')} onPress={() => go({ name: 'catalog' })} />} />;
  }

  const rows: { label: string; get: (p: any) => string }[] = [
    { label: t('brand'), get: (p) => `${p.brand} ${p.model}` },
    { label: t('perDay'), get: (p) => p.rent_daily ? money(p.rent_daily, lang) : '—' },
    { label: t('perWeek'), get: (p) => p.rent_weekly ? money(p.rent_weekly, lang) : '—' },
    { label: t('perMonth'), get: (p) => p.rent_monthly ? money(p.rent_monthly, lang) : '—' },
    { label: t('forSale'), get: (p) => p.sale_price ? money(p.sale_price, lang) : '—' },
    { label: t('deposit'), get: (p) => money(p.deposit, lang) },
    { label: t('lateFee'), get: (p) => p.late_fee_per_day ? money(p.late_fee_per_day, lang) : '—' },
    { label: t('minRent'), get: (p) => `${p.min_rent_days} ${t('days')}` },
    { label: t('available'), get: (p) => `${p.units_available}/${p.units_total}` },
    { label: t('reviews'), get: (p) => p.rating_count ? `${p.rating_avg.toFixed(1)} ★ (${p.rating_count})` : '—' },
    { label: t('warranty'), get: (p) => p.warranty_months ? `${p.warranty_months} ${t('months')}` : '—' },
    { label: t('needsTraining'), get: (p) => (p.requires_training ? t('yes') : t('no')) },
  ];

  return (
    <View style={{ gap: 16 }}>
      <Row between center>
        <Txt bold="800" size={24}>{t('compareTitle')}</Txt>
        <Button small variant="ghost" title={t('reset')} onPress={clearCompare} />
      </Row>

      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Row gap={0} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ width: 116, padding: 10, backgroundColor: colors.brandSoft }} />
          {compare.map((p) => (
            <View key={p.id} style={{ flex: 1, padding: 10, gap: 6, borderStartWidth: 1, borderStartColor: colors.border }}>
              <Img uri={p.image} ratio={1.4} />
              <Txt bold="700" size={12.5} numberOfLines={2}>{pickLang(p, 'name', lang)}</Txt>
              <Row gap={6}>
                <Button small variant="secondary" title={t('orderDetails')}
                  onPress={() => go({ name: 'product', id: p.id })} />
                <Pressable onPress={() => toggleCompare(p)} hitSlop={8}
                  style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: colors.danger, fontSize: 15 }}>✕</Text>
                </Pressable>
              </Row>
            </View>
          ))}
        </Row>
        {rows.map((r, i) => (
          <Row key={r.label} gap={0} style={{ backgroundColor: i % 2 ? '#fff' : colors.brandSoft }}>
            <View style={{ width: 116, padding: 10, justifyContent: 'center' }}>
              <Txt size={11.5} bold="700" color={colors.sub}>{r.label}</Txt>
            </View>
            {compare.map((p) => (
              <View key={p.id} style={{ flex: 1, padding: 10, borderStartWidth: 1, borderStartColor: colors.border }}>
                <Txt size={12.5}>{r.get(p)}</Txt>
              </View>
            ))}
          </Row>
        ))}
      </Card>
    </View>
  );
}

// ------------------------------------------------------------------- auth
export function AuthScreen({ mode: initialMode = 'login' }: { mode?: 'login' | 'register' }) {
  const { login, register, go, lang, toast } = useStore();
  const { t } = useT();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [org, setOrg] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const u = mode === 'login'
        ? await login(email.trim(), password)
        : await register({ name, email: email.trim(), password, phone, organization: org, city });
      toast(`${t('welcomeBack')} ${u.name}`);
      go({ name: u.role === 'admin' ? 'admin.dashboard' : 'home' });
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const quick = (e: string, p: string) => { setEmail(e); setPassword(p); setMode('login'); };

  return (
    <View style={{ maxWidth: 460, width: '100%', alignSelf: 'center', gap: 16, paddingVertical: 10 }}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <View style={{
          width: 60, height: 60, borderRadius: 18, backgroundColor: colors.brand,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 28 }}>🔬</Text>
        </View>
        <Txt bold="800" size={22}>{mode === 'login' ? t('login') : t('register')}</Txt>
        <Txt color={colors.sub} center>
          {lang === 'ar' ? 'سكوب — الشركة المصرية للأجهزة الطبية' : 'SCOPE Egypt Medical Equipment'}
        </Txt>
      </View>

      <Card>
        <View style={{ gap: 12 }}>
          {mode === 'register' ? (
            <>
              <Field label={t('name')} value={name} onChangeText={setName} />
              <Row gap={10}>
                <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboard="phone-pad" />
                <Field label={t('city')} value={city} onChangeText={setCity} />
              </Row>
              <Field label={`${t('organization')} (${t('optional')})`} value={org} onChangeText={setOrg} />
            </>
          ) : null}
          <Field label={t('email')} value={email} onChangeText={setEmail} keyboard="email-address" />
          <Field label={t('password')} value={password} onChangeText={setPassword} secure />
          {err ? <Banner level="danger" text={err} /> : null}
          <Button full loading={busy} title={mode === 'login' ? t('login') : t('register')}
            disabled={!email || !password || (mode === 'register' && !name)} onPress={submit} />
          <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
            <Txt center size={13} color={colors.brand} bold="700">
              {mode === 'login' ? `${t('noAccount')} ${t('register')}` : `${t('haveAccount')} ${t('login')}`}
            </Txt>
          </Pressable>
        </View>
      </Card>

      <Card style={{ backgroundColor: colors.brandSoft }}>
        <Txt bold="700" size={13} style={{ marginBottom: 8 }}>🔑 {t('demoAccounts')}</Txt>
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => quick('admin@scope-eg.com', 'Admin@123')}>
            <Row between center>
              <View>
                <Txt size={12.5} bold="700">{t('admin')}</Txt>
                <Txt size={11} color={colors.muted}>admin@scope-eg.com / Admin@123</Txt>
              </View>
              <Txt size={11} color={colors.brand} bold="700">{lang === 'ar' ? 'استخدم' : 'Use'}</Txt>
            </Row>
          </Pressable>
          <Divider v={2} />
          <Pressable onPress={() => quick('ahmed@clinic-eg.com', 'Customer@123')}>
            <Row between center>
              <View>
                <Txt size={12.5} bold="700">{t('customer')}</Txt>
                <Txt size={11} color={colors.muted}>ahmed@clinic-eg.com / Customer@123</Txt>
              </View>
              <Txt size={11} color={colors.brand} bold="700">{lang === 'ar' ? 'استخدم' : 'Use'}</Txt>
            </Row>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------- profile
export function ProfileScreen() {
  const { user, logout, refreshUser, lang, setLang, go, toast } = useStore();
  const { t } = useT();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [org, setOrg] = useState(user?.organization || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState(user?.address || '');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) {
    return <Empty icon="🔐" title={t('loginRequired')}
      action={<Button title={t('login')} onPress={() => go({ name: 'auth' })} />} />;
  }

  const save = async () => {
    setBusy(true);
    try {
      await api.patch('/api/auth/me', {
        name, phone, organization: org, city, address, password: pw || undefined,
      });
      setPw('');
      await refreshUser();
      toast(t('profileUpdated'));
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ gap: 16, maxWidth: 620, width: '100%', alignSelf: 'center' }}>
      <Txt bold="800" size={24}>{t('profile')}</Txt>

      <Card>
        <Row center gap={14}>
          <View style={{
            width: 58, height: 58, borderRadius: 29, backgroundColor: colors.brand,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Txt bold="800" size={22} color="#fff">{user.name?.[0]}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt bold="800" size={17}>{user.name}</Txt>
            <Txt size={12.5} color={colors.sub}>{user.email}</Txt>
            <Badge small tone={user.role === 'admin' ? 'reserved' : 'available'}
              label={user.role === 'admin' ? t('admin') : t('customer')} />
          </View>
        </Row>
        {user.role === 'admin' ? (
          <Button full style={{ marginTop: 12 }} icon="⚙️" title={t('adminPanel')}
            onPress={() => go({ name: 'admin.dashboard' })} />
        ) : null}
      </Card>

      <Card>
        <View style={{ gap: 12 }}>
          <Txt bold="800" size={15}>{t('updateProfile')}</Txt>
          <Field label={t('name')} value={name} onChangeText={setName} />
          <Row gap={10}>
            <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboard="phone-pad" />
            <Field label={t('city')} value={city} onChangeText={setCity} />
          </Row>
          <Field label={t('organization')} value={org} onChangeText={setOrg} />
          <Field label={t('address')} value={address} onChangeText={setAddress} multiline />
          <Field label={t('newPassword')} value={pw} onChangeText={setPw} secure />
          <Button full title={t('save')} loading={busy} onPress={save} />
        </View>
      </Card>

      <Card>
        <View style={{ gap: 10 }}>
          <Txt bold="800" size={15}>{lang === 'ar' ? 'اللغة' : 'Language'}</Txt>
          <Row gap={10}>
            <Button full={false} variant={lang === 'ar' ? 'primary' : 'outline'} title="🇪🇬 العربية"
              onPress={() => setLang('ar')} />
            <Button full={false} variant={lang === 'en' ? 'primary' : 'outline'} title="🇬🇧 English"
              onPress={() => setLang('en')} />
          </Row>
        </View>
      </Card>

      <Button full variant="danger" icon="⏻" title={t('logout')} onPress={logout} />
    </View>
  );
}

// ---------------------------------------------------------- notifications
export function NotificationsScreen() {
  const { notifications, loadNotifications, lang, go, user } = useStore();
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  if (!user) {
    return <Empty icon="🔐" title={t('loginRequired')}
      action={<Button title={t('login')} onPress={() => go({ name: 'auth' })} />} />;
  }

  const markAll = async () => {
    setBusy(true);
    try { await api.post('/api/notifications/read-all'); await loadNotifications(); }
    finally { setBusy(false); }
  };

  const open = async (n: Notif) => {
    if (!n.is_read) { try { await api.post(`/api/notifications/${n.id}/read`); loadNotifications(); } catch { } }
    if (n.link?.startsWith('/orders/')) go({ name: 'order', id: Number(n.link.split('/')[2]) });
    else if (n.link?.startsWith('/admin/orders/')) go({ name: 'admin.order', id: Number(n.link.split('/')[3]) });
    else if (n.link === '/admin/maintenance') go({ name: 'admin.maintenance' });
    else if (n.link === '/admin/reviews') go({ name: 'admin.reviews' });
  };

  return (
    <View style={{ gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <Row between center>
        <Txt bold="800" size={24}>{t('notifications')}</Txt>
        {notifications.some((n) => !n.is_read)
          ? <Button small variant="ghost" title={t('markAllRead')} loading={busy} onPress={markAll} /> : null}
      </Row>
      {notifications.length === 0 ? <Empty icon="🔔" title={t('noNotifications')} /> : (
        <View style={{ gap: 10 }}>
          {notifications.map((n) => {
            const tone = { success: colors.success, warning: colors.warning, danger: colors.danger, info: colors.info }[n.level] || colors.info;
            return (
              <Card key={n.id} pad={13} onPress={() => open(n)}
                style={{ borderStartWidth: 4, borderStartColor: tone, opacity: n.is_read ? 0.68 : 1 }}>
                <Row between center gap={10}>
                  <View style={{ flex: 1 }}>
                    <Txt bold="700" size={13.5}>{pickLang(n as any, 'title', lang)}</Txt>
                    <Txt size={12.5} color={colors.sub}>{pickLang(n as any, 'body', lang)}</Txt>
                    <Txt size={10.5} color={colors.muted} style={{ marginTop: 3 }}>{fmtDateTime(n.created_at, lang)}</Txt>
                  </View>
                  {!n.is_read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: tone }} /> : null}
                </Row>
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}
