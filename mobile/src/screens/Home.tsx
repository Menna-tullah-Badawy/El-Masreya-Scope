import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Category, Post, Product } from '../api';
import { Banner, Grid, PostCard, ProductCard, SectionHeader } from '../components';
import { money, pickLang } from '../i18n';
import { useStore } from '../store';
import { colors, radius, shadow } from '../theme';
import { Button, Card, Loading, Row, Txt, openUrl, useLayout, useT, waLink } from '../ui';

export default function HomeScreen() {
  const { go, lang, settings, rtl } = useStore();
  const { t } = useT();
  const { isPhone, isDesktop } = useLayout();
  const [cats, setCats] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [c, f, p] = await Promise.all([
          api.get<Category[]>('/api/categories'),
          api.get<Product[]>('/api/products', { featured: true, limit: 8 }),
          api.get<Post[]>('/api/posts'),
        ]);
        setCats(c); setFeatured(f); setPosts(p.slice(0, 3));
      } catch (e: any) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const wa = settings.whatsapp || '201113138839';

  if (loading) return <Loading label={t('loading')} />;

  return (
    <View style={{ gap: 26 }}>
      {err ? <Banner level="danger" text={err} /> : null}

      {/* ---------------------------------------------------------- hero */}
      <View style={{
        backgroundColor: colors.brandDark, borderRadius: radius.xl, overflow: 'hidden',
        padding: isPhone ? 22 : 38, ...shadow.md,
      }}>
        <View style={{
          position: 'absolute', top: -70, [rtl ? 'left' : 'right']: -50,
          width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)',
        } as any} />
        <View style={{
          position: 'absolute', bottom: -90, [rtl ? 'right' : 'left']: -40,
          width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)',
        } as any} />

        <View style={{ gap: 14, maxWidth: 660 }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start',
            paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.pill,
          }}>
            <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '700' }}>
              {lang === 'ar' ? '🇪🇬 خدمة داخل القاهرة والجيزة والدلتا' : '🇪🇬 Serving Cairo, Giza & the Delta'}
            </Text>
          </View>
          <Txt size={isPhone ? 25 : 36} bold="800" color="#fff" style={{ lineHeight: isPhone ? 34 : 46 }}>
            {t('heroTitle')}
          </Txt>
          <Txt size={isPhone ? 13.5 : 15.5} color="rgba(255,255,255,0.85)" style={{ lineHeight: 24 }}>
            {t('heroSub')}
          </Txt>
          <Row gap={10} wrap style={{ marginTop: 6 }}>
            <Button title={t('browseNow')} icon="🔍" onPress={() => go({ name: 'catalog' })} />
            <Button title={t('whatsapp')} icon="💬" variant="success"
              onPress={() => openUrl(waLink(wa, lang === 'ar'
                ? 'السلام عليكم، محتاج استفسار عن تأجير جهاز طبي'
                : 'Hello, I would like to ask about renting a medical device'))} />
            <Button title={`📞 ${settings.phone || '01113138839'}`} variant="ghost"
              style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
              onPress={() => openUrl(`tel:${settings.phone || '01113138839'}`)} />
          </Row>
        </View>
      </View>

      {/* ------------------------------------------------------ why us */}
      <View style={{ gap: 12 }}>
        <SectionHeader title={t('whyUs')} />
        <Grid>
          {[
            { i: '🧼', t: t('why1t'), d: t('why1d') },
            { i: '🚚', t: t('why2t'), d: t('why2d') },
            { i: '🛠️', t: t('why3t'), d: t('why3d') },
            { i: '💰', t: t('why4t'), d: t('why4d') },
          ].map((x) => (
            <Card key={x.t} pad={16}>
              <View style={{ gap: 8 }}>
                <View style={{
                  width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brandLight,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 20 }}>{x.i}</Text>
                </View>
                <Txt bold="700" size={14.5}>{x.t}</Txt>
                <Txt size={12.5} color={colors.sub} style={{ lineHeight: 19 }}>{x.d}</Txt>
              </View>
            </Card>
          ))}
        </Grid>
      </View>

      {/* --------------------------------------------------- categories */}
      <View style={{ gap: 12 }}>
        <SectionHeader title={t('categories')} action={t('seeAll')} onAction={() => go({ name: 'catalog' })} />
        <Grid>
          {cats.map((c) => (
            <Card key={c.id} pad={16} onPress={() => go({ name: 'catalog', category: c.slug })}>
              <Row center gap={12}>
                <View style={{
                  width: 48, height: 48, borderRadius: 14, backgroundColor: colors.brandSoft,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 23 }}>{c.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt bold="700" size={14.5} numberOfLines={1}>{pickLang(c, 'name', lang)}</Txt>
                  <Txt size={11.5} color={colors.muted} numberOfLines={2}>{pickLang(c, 'description', lang)}</Txt>
                  <Txt size={11} bold="700" color={colors.brand} style={{ marginTop: 3 }}>
                    {c.product_count} {lang === 'ar' ? 'جهاز' : 'devices'}
                  </Txt>
                </View>
              </Row>
            </Card>
          ))}
        </Grid>
      </View>

      {/* ----------------------------------------------------- featured */}
      <View style={{ gap: 12 }}>
        <SectionHeader title={t('featured')} action={t('seeAll')} onAction={() => go({ name: 'catalog' })} />
        <Grid>
          {featured.map((p) => (
            <ProductCard key={p.id} p={p} onPress={() => go({ name: 'product', id: p.id })} />
          ))}
        </Grid>
      </View>

      {/* -------------------------------------------------------- posts */}
      {posts.length ? (
        <View style={{ gap: 12 }}>
          <SectionHeader title={t('latestPosts')} action={t('seeAll')} onAction={() => go({ name: 'blog' })} />
          <Grid>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onPress={() => go({ name: 'post', id: p.id })} />
            ))}
          </Grid>
        </View>
      ) : null}

      {/* --------------------------------------------------------- cta */}
      <Card style={{ backgroundColor: colors.brandLight, borderColor: colors.brand + '44' }} pad={isPhone ? 20 : 30}>
        <View style={{ gap: 12, alignItems: isDesktop ? 'center' : 'flex-start' }}>
          <Txt bold="800" size={isPhone ? 18 : 22} center={isDesktop}>
            {lang === 'ar' ? 'محتاج جهاز مش لاقيه في الكتالوج؟' : "Can't find the device you need?"}
          </Txt>
          <Txt color={colors.sub} center={isDesktop} style={{ maxWidth: 560 }}>
            {lang === 'ar'
              ? 'كلمنا على واتساب وهنوفرهولك من شبكة موردينا خلال 48 ساعة، بنفس ضمان التعقيم والصيانة.'
              : 'Message us on WhatsApp — we source it from our supplier network within 48 hours with the same sterilization and service guarantee.'}
          </Txt>
          <Button title={t('contactWhatsapp')} icon="💬" variant="success"
            onPress={() => openUrl(waLink(wa, lang === 'ar'
              ? 'السلام عليكم، محتاج جهاز غير موجود في الكتالوج'
              : 'Hello, I need a device not listed in your catalog'))} />
        </View>
      </Card>
    </View>
  );
}
