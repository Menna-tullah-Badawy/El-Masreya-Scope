import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { api, Category, Post, Product } from '../api';
import { Banner, Grid, PostCard, ProductCard, SectionHeader } from '../components';
import { money, pickLang } from '../i18n';
import { useStore } from '../store';
import { colors, radius, shadow } from '../theme';
import { Button, Card, Loading, Reveal, Row, Txt, openUrl, useLayout, useT, waLink } from '../ui';

export default function HomeScreen() {
  const { go, lang, settings } = useStore();
  const { t } = useT();
  const { isPhone, isDesktop } = useLayout();
  const [cats, setCats] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // فحص سريع لحالة الـ API (عشان نوري Banner لو مش متوصل)
        fetch(api.base + '/api/health')
          .then((r) => setApiOk(r.ok))
          .catch(() => setApiOk(false));
        const [c, f, p] = await Promise.all([
          api.get<Category[]>('/api/categories'),
          api.get<Product[]>('/api/products', { featured: true, limit: 6 }),
          api.get<Post[]>('/api/posts'),
        ]);
        setCats(c);
        setFeatured(f);
        setPosts(p.slice(0, 3));
      } catch (e: any) {
        setErr(e.message);
        setApiOk(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const wa = settings.whatsapp || '201113138839';

  const heroStats = useMemo(
    () => [
      { v: '19', l: lang === 'ar' ? 'جهاز طبي' : 'devices', s: lang === 'ar' ? 'جاهز للإيجار' : 'ready to rent' },
      { v: '7', l: lang === 'ar' ? 'أقسام' : 'categories', s: 'endoscopy → home care' },
      { v: '48h', l: lang === 'ar' ? 'توفير' : 'sourcing', s: lang === 'ar' ? 'لو مش في الكتالوج' : 'if not listed' },
      { v: '100%', l: lang === 'ar' ? 'تعقيم موثق' : 'validated', s: 'Class B cert.' },
    ],
    [lang]
  );

  if (loading) return <Loading label={t('loading')} />;

  return (
    <View style={{ gap: isPhone ? 28 : 36 }}>
      {err ? <Banner level="danger" text={err} /> : null}
      {apiOk === false ? (
        <Banner
          level="warning"
          text={
            lang === 'ar'
              ? '⚠️ الواجهة مش متواصلة بالـ API — تأكد إن الباك شغال على البورت 8000 و PORTS → 8000 Public. جرّب: https://...-8000.app.github.dev/api/health'
              : '⚠️ Frontend cannot reach API — make sure backend on 8000 is running and PORTS → 8000 is Public.'
          }
        />
      ) : null}

      {/* ───────────────────────── HERO — Modern Minimal (Apple/Linear) ───────────────────────── */}
      <Reveal>
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          }}
        >
          {/* subtle grid pattern */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: colors.border,
              opacity: 0.6,
            }}
          />
          <View style={{ padding: isPhone ? 18 : 32, gap: isPhone ? 18 : 22 }}>
            {/* top pill */}
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: radius.pill,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.sub, letterSpacing: 0.2 }}>
                {lang === 'ar' ? 'موثوق من 120+ عيادة ومستشفى في مصر' : 'Trusted by 120+ clinics & hospitals'}
              </Text>
              <View style={{ width: 1, height: 14, backgroundColor: colors.border, marginHorizontal: 2 }} />
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.muted }}>Cairo · Giza · Delta</Text>
            </View>

            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isPhone ? 18 : 28, alignItems: isPhone ? 'stretch' : 'flex-start' }}>
              {/* left copy */}
              <View style={{ flex: 1.1, gap: 14 }}>
                <Txt
                  bold="800"
                  style={{
                    fontSize: isPhone ? 30 : 42,
                    lineHeight: isPhone ? 34 : 44,
                    letterSpacing: isPhone ? -0.8 : -1.4,
                    color: colors.text,
                  }}
                >
                  {lang === 'ar' ? 'المنظار الصح.' : 'The right scope.'}
                  {'\n'}
                  <Text style={{ color: colors.brand }}> {lang === 'ar' ? 'في الوقت الصح.' : 'Right on time.'}</Text>
                  {'\n'}
                  <Text style={{ color: colors.sub, fontWeight: '600', fontSize: isPhone ? 22 : 30 }}>
                    {lang === 'ar' ? 'بسعر أوفر 60% من الشراء.' : '60% cheaper than buying.'}
                  </Text>
                </Txt>
                <Txt size={isPhone ? 13.5 : 15} color={colors.sub} style={{ lineHeight: 23, maxWidth: 560 }}>
                  {lang === 'ar'
                    ? 'تأجير وبيع مناظير وأجهزة طبية معقّمة — مع تركيب، تدريب، ودعم فني طوال المدة. إيجار يومي/أسبوعي/شهري بأرخص تركيبة محسوبة تلقائياً.'
                    : 'Rent or buy sterilized endoscopes & medical devices — with installation, training and support. Daily/weekly/monthly pricing auto-optimized to the cheapest combination.'}
                </Txt>

                {/* search bar — Linear-like */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: '#fff',
                    borderWidth: 1.2,
                    borderColor: colors.borderStrong,
                    borderRadius: 14,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    ...shadow.sm,
                    maxWidth: 560,
                    marginTop: 4,
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.muted }}>⌕</Text>
                  {Platform.OS === 'web' ? (
                    React.createElement('input', {
                      value: q,
                      placeholder: lang === 'ar' ? 'ابحث عن منظار، جهاز، أو قسم…' : 'Search scopes, devices or categories…',
                      onChange: (e: any) => setQ(e.target.value),
                      onKeyDown: (e: any) => {
                        if (e.key === 'Enter') go({ name: 'catalog', q });
                      },
                      style: {
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: 14.5,
                        color: colors.text,
                        fontFamily: 'inherit',
                        background: 'transparent',
                        padding: '8px 0',
                      },
                    })
                  ) : (
                    <TextInput
                      value={q}
                      onChangeText={setQ}
                      placeholder={lang === 'ar' ? 'ابحث…' : 'Search…'}
                      placeholderTextColor={colors.muted}
                      style={{ flex: 1, fontSize: 14.5, color: colors.text, paddingVertical: 8 }}
                    />
                  )}
                  <Pressable
                    onPress={() => go({ name: 'catalog', q })}
                    style={{ backgroundColor: colors.text, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                      {lang === 'ar' ? 'بحث' : 'Search'}
                    </Text>
                  </Pressable>
                </View>
                <Row gap={8} wrap>
                  {[
                    lang === 'ar' ? 'منظار معدة' : 'Gastroscope',
                    lang === 'ar' ? 'برج 4K' : '4K Tower',
                    lang === 'ar' ? 'مونيتور' : 'Monitor',
                    lang === 'ar' ? 'أكسجين' : 'Oxygen',
                  ].map((k) => (
                    <Pressable
                      key={k}
                      onPress={() => go({ name: 'catalog', q: k })}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 11,
                        borderRadius: radius.pill,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.sub, fontWeight: '600' }}>{k}</Text>
                    </Pressable>
                  ))}
                </Row>

                <Row gap={10} wrap style={{ marginTop: 4 }}>
                  <Button title={t('browseNow')} icon="→" onPress={() => go({ name: 'catalog' })} />
                  <Button
                    title={lang === 'ar' ? 'واتساب فوري' : 'WhatsApp'}
                    variant="outline"
                    onPress={() =>
                      openUrl(
                        waLink(
                          wa,
                          lang === 'ar' ? 'السلام عليكم، محتاج استفسار عن تأجير جهاز طبي' : 'Hello, I would like to ask about renting'
                        )
                      )
                    }
                  />
                  <Txt size={11.5} color={colors.muted} style={{ alignSelf: 'center', marginStart: 4 }}>
                    {settings.phone || '01113138839'} · {lang === 'ar' ? 'رد خلال دقائق' : 'reply in minutes'}
                  </Txt>
                </Row>
              </View>

              {/* right visual — device collage minimal */}
              <View style={{ flex: 0.9, gap: 10, alignSelf: 'stretch', minWidth: isPhone ? undefined : 320 }}>
                <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                  <View style={{ flex: 1.1, gap: 10 }}>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 10,
                        justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={{ uri: api.fileUrl('/uploads/p-tower-4k.jpg') }}
                        style={{ width: '100%', height: 120, borderRadius: 12, backgroundColor: '#fff' }}
                        resizeMode="cover"
                      />
                      <Txt size={11} bold="700" style={{ marginTop: 8 }}>
                        Olympus VISERA 4K
                      </Txt>
                      <Txt size={10.5} color={colors.muted}>
                        {money(3800, lang)} / {lang === 'ar' ? 'يوم' : 'day'}
                      </Txt>
                    </View>
                    <View
                      style={{
                        backgroundColor: '#111113',
                        borderRadius: 16,
                        padding: 14,
                        gap: 6,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>WHY RENT?</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12.5, lineHeight: 17 }}>
                        {lang === 'ar' ? 'أوفر 40–60% لو الاستخدام < 8 حالات/شهر' : '40–60% cheaper if < 8 cases/mo'}
                      </Text>
                      <Pressable onPress={() => go({ name: 'blog' })}>
                        <Text style={{ color: '#7DD3C0', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                          {lang === 'ar' ? 'احسبها ←' : 'Calculate →'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={{ flex: 1, gap: 10 }}>
                    <View
                      style={{
                        backgroundColor: colors.brandLight,
                        borderRadius: 16,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colors.brand + '22',
                        gap: 8,
                      }}
                    >
                      <Image
                        source={{ uri: api.fileUrl('/uploads/p-gastroscope.jpg') }}
                        style={{ width: '100%', height: 84, borderRadius: 10, backgroundColor: '#fff' }}
                        resizeMode="cover"
                      />
                      <Txt size={11} bold="700">
                        {lang === 'ar' ? 'منظار معدة HD' : 'Gastroscope HD'}
                      </Txt>
                      <Txt size={10.5} color={colors.sub}>
                        {money(1800, lang)}/{lang === 'ar' ? 'يوم' : 'day'}
                      </Txt>
                      <View style={{ height: 1, backgroundColor: colors.border }} />
                      <Txt size={10.5} color={colors.brandDark} bold="700">
                        ✓ {lang === 'ar' ? 'معقم + شهادة' : 'Sterilized + cert.'}
                      </Txt>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#fff',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 10,
                        gap: 6,
                      }}
                    >
                      <Image
                        source={{ uri: api.fileUrl('/uploads/p-oxygen-concentrator.jpg') }}
                        style={{ width: '100%', height: 80, borderRadius: 10, backgroundColor: colors.surface }}
                        resizeMode="cover"
                      />
                      <Txt size={11} bold="700">
                        EverFlo 5L
                      </Txt>
                      <Txt size={10.5} color={colors.muted}>
                        {money(150, lang)}/{lang === 'ar' ? 'يوم' : 'day'}
                      </Txt>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                  <Txt size={11} color={colors.sub}>
                    {lang === 'ar' ? 'كل الأجهزة تُسلّم بعد دورة تعقيم موثقة' : 'Every device ships after validated reprocessing'}
                  </Txt>
                </View>
              </View>
            </View>

            {/* stats strip */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                borderTopWidth: 1,
                borderTopColor: colors.border,
                marginTop: 4,
                paddingTop: 16,
                gap: isPhone ? 14 : 0,
              }}
            >
              {heroStats.map((s, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    minWidth: 120,
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'center',
                    paddingHorizontal: isPhone ? 0 : 14,
                    borderRightWidth: !isPhone && i < heroStats.length - 1 ? 1 : 0,
                    borderRightColor: colors.border,
                  }}
                >
                  <Txt bold="800" style={{ fontSize: 22, letterSpacing: -0.6, color: colors.text }}>
                    {s.v}
                  </Txt>
                  <View>
                    <Txt size={11.5} bold="700" color={colors.text}>
                      {s.l}
                    </Txt>
                    <Txt size={10.5} color={colors.muted}>
                      {s.s}
                    </Txt>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Reveal>

      {/* ───────────────────────── Why us — minimal icon grid ───────────────────────── */}
      <Reveal delay={80}>
        <View style={{ gap: 14 }}>
          <SectionHeader title={t('whyUs')} />
          <Grid>
            {[
              { i: '◐', t: t('why1t'), d: t('why1d') },
              { i: '⬢', t: t('why2t'), d: t('why2d') },
              { i: '⬔', t: t('why3t'), d: t('why3d') },
              { i: '⬣', t: t('why4t'), d: t('why4d') },
            ].map((x) => (
              <View
                key={x.t}
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: 16,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, color: colors.text }}>{x.i}</Text>
                </View>
                <Txt bold="700" size={13.5}>
                  {x.t}
                </Txt>
                <Txt size={12} color={colors.sub} style={{ lineHeight: 18 }}>
                  {x.d}
                </Txt>
              </View>
            ))}
          </Grid>
        </View>
      </Reveal>

      {/* ───────────────────────── categories — Apple style pills ───────────────────────── */}
      <Reveal delay={140}>
        <View style={{ gap: 14 }}>
          <SectionHeader title={t('categories')} action={t('seeAll')} onAction={() => go({ name: 'catalog' })} />
          <Grid>
            {cats.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => go({ name: 'catalog', category: c.slug })}
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: 14,
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 19 }}>{c.icon}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt bold="650" size={13.5} numberOfLines={1}>
                    {pickLang(c, 'name', lang)}
                  </Txt>
                  <Txt size={11} color={colors.muted} numberOfLines={1}>
                    {c.product_count} {lang === 'ar' ? 'جهاز' : 'devices'} · {pickLang(c, 'description', lang)}
                  </Txt>
                </View>
                <Text style={{ color: colors.muted, fontSize: 12 }}>›</Text>
              </Pressable>
            ))}
          </Grid>
        </View>
      </Reveal>

      {/* ───────────────────────── featured — minimal cards ───────────────────────── */}
      <Reveal delay={200}>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Txt bold="800" style={{ fontSize: 18, letterSpacing: -0.4 }}>
              {t('featured')}
            </Txt>
            <Pressable onPress={() => go({ name: 'catalog' })}>
              <Txt size={12.5} bold="600" color={colors.sub}>
                {t('seeAll')} →
              </Txt>
            </Pressable>
          </View>
          <Grid>
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} onPress={() => go({ name: 'product', id: p.id })} />
            ))}
          </Grid>
        </View>
      </Reveal>

      {/* ───────────────────────── story + CTA ───────────────────────── */}
      <Reveal delay={260}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#111113',
              borderRadius: radius.xl,
              padding: isPhone ? 18 : 24,
              gap: 12,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1, fontWeight: '700' }}>
              SCOPE STORY
            </Text>
            <Txt size={isPhone ? 18 : 20} bold="700" color="#fff" style={{ lineHeight: 26 }}>
              {lang === 'ar' ? 'ليه آلاف الأطباء بيختاروا الإيجار؟' : 'Why thousands rent instead of buying?'}
            </Txt>
            <Txt size={13} color="rgba(255,255,255,0.7)" style={{ lineHeight: 20 }}>
              {lang === 'ar'
                ? 'الشراء بيجمّد رأس مال، ويحتاج صيانة وتعقيم وتخزين. الإيجار مع SCOPE يشمل كل ده + توصيل وتركيب وتدريب في نفس اليوم.'
                : 'Buying locks capital and needs maintenance, reprocessing and storage. Renting with SCOPE includes all of it — plus same-day delivery, setup and training.'}
            </Txt>
            <Pressable
              onPress={() => go({ name: 'blog' })}
              style={{
                alignSelf: 'flex-start',
                marginTop: 6,
                backgroundColor: '#fff',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: radius.pill,
              }}
            >
              <Text style={{ color: '#111113', fontWeight: '700', fontSize: 13 }}>{lang === 'ar' ? 'اقرأ الدراسة ←' : 'Read the study →'}</Text>
            </Pressable>
          </View>

          <View
            style={{
              flex: 0.95,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.xl,
              padding: isPhone ? 18 : 24,
              gap: 12,
            }}
          >
            <Txt bold="700" size={16}>
              {lang === 'ar' ? 'محتاج جهاز مش في الكتالوج؟' : "Can't find it?"}
            </Txt>
            <Txt size={13} color={colors.sub} style={{ lineHeight: 20 }}>
              {lang === 'ar'
                ? 'شبكة موردينا توفره خلال 48 ساعة بنفس ضمان التعقيم. ابعتلنا المواصفات على واتساب.'
                : 'Our supplier network sources it within 48h with the same sterilization guarantee. Send us the specs on WhatsApp.'}
            </Txt>
            <Pressable
              onPress={() => openUrl(waLink(wa, lang === 'ar' ? 'السلام عليكم، محتاج جهاز غير موجود في الكتالوج' : 'Hello, I need a device not listed'))}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#25D366',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                alignSelf: 'flex-start',
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 14 }}>💬</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>{lang === 'ar' ? 'تواصل واتساب' : 'WhatsApp us'}</Text>
            </Pressable>
            <Txt size={11} color={colors.muted}>
              {lang === 'ar' ? 'نرد خلال دقائق · 01113138839' : 'Reply in minutes · 01113138839'}
            </Txt>
          </View>
        </View>
      </Reveal>

      {/* ───────────────────────── posts — minimal ───────────────────────── */}
      {posts.length ? (
        <Reveal delay={320}>
          <View style={{ gap: 14 }}>
            <SectionHeader title={t('latestPosts')} action={t('seeAll')} onAction={() => go({ name: 'blog' })} />
            <Grid>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onPress={() => go({ name: 'post', id: p.id })} />
              ))}
            </Grid>
          </View>
        </Reveal>
      ) : null}
    </View>
  );
}
