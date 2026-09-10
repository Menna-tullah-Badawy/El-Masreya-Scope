import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Image, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TextStyle, useWindowDimensions, View, ViewStyle,
} from 'react-native';
import { api } from './api';
import { colors, radius, shadow, statusColor } from './theme';
import { useStore } from './store';
import { Lang, addDays, iso, t as tr } from './i18n';

export const useT = () => {
  const { lang } = useStore();
  return { t: (k: any) => tr(k, lang), lang };
};

export const useLayout = () => {
  const { width } = useWindowDimensions();
  return {
    width,
    isPhone: width < 700,
    isTablet: width >= 700 && width < 1100,
    isDesktop: width >= 1100,
    cols: width < 560 ? 1 : width < 900 ? 2 : width < 1350 ? 3 : 4,
  };
};

// ------------------------------------------------------------------- text
export function Txt({ children, style, bold, size, color, center, numberOfLines }: {
  children?: React.ReactNode; style?: TextStyle | TextStyle[]; bold?: boolean | '600' | '700' | '800';
  size?: number; color?: string; center?: boolean; numberOfLines?: number;
}) {
  const { rtl } = useStore();
  const weight = bold === true ? '700' : bold || undefined;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { color: color || colors.text, fontSize: size || 14, textAlign: center ? 'center' : rtl ? 'right' : 'left' },
        weight ? { fontWeight: weight as any } : null,
        rtl ? { writingDirection: 'rtl' } : null,
        style as any,
      ]}
    >
      {children}
    </Text>
  );
}

// ------------------------------------------------------------------ card
export function Card({ children, style, onPress, pad = 16 }: {
  children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void; pad?: number;
}) {
  const inner = (
    <View style={[{
      backgroundColor: colors.card, borderRadius: radius.lg, padding: pad,
      borderWidth: 1, borderColor: colors.border,
    }, shadow.sm, style as any]}>
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }]}>
      {inner}
    </Pressable>
  );
}

// ---------------------------------------------------------------- button
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, full, small, style }: {
  title: string; onPress?: () => void; variant?: BtnVariant; icon?: string;
  disabled?: boolean; loading?: boolean; full?: boolean; small?: boolean; style?: ViewStyle;
}) {
  const map: Record<BtnVariant, { bg: string; fg: string; bd?: string }> = {
    primary: { bg: colors.brand, fg: '#fff' },
    secondary: { bg: colors.brandLight, fg: colors.brandDark },
    ghost: { bg: 'transparent', fg: colors.brandDark },
    outline: { bg: 'transparent', fg: colors.text, bd: colors.border },
    danger: { bg: colors.danger, fg: '#fff' },
    success: { bg: colors.success, fg: '#fff' },
  };
  const c = map[variant];
  const dis = disabled || loading;
  return (
    <Pressable
      onPress={dis ? undefined : onPress}
      style={({ pressed }) => [{
        backgroundColor: c.bg, borderRadius: radius.md,
        paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 12 : 18,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        borderWidth: c.bd ? 1 : 0, borderColor: c.bd,
        opacity: dis ? 0.5 : pressed ? 0.85 : 1,
        alignSelf: full ? 'stretch' : 'flex-start',
      }, style as any]}
    >
      {loading ? <ActivityIndicator size="small" color={c.fg} /> : icon ? <Text style={{ fontSize: small ? 13 : 15 }}>{icon}</Text> : null}
      <Text style={{ color: c.fg, fontWeight: '700', fontSize: small ? 13 : 14.5 }}>{title}</Text>
    </Pressable>
  );
}

// ----------------------------------------------------------------- badge
export function Badge({ label, tone, small }: { label: string; tone?: string; small?: boolean }) {
  const c = (tone && statusColor[tone]) || { bg: colors.brandLight, fg: colors.brandDark };
  return (
    <View style={{
      backgroundColor: c.bg, borderRadius: radius.pill,
      paddingVertical: small ? 2 : 4, paddingHorizontal: small ? 8 : 11, alignSelf: 'flex-start',
    }}>
      <Text style={{ color: c.fg, fontSize: small ? 10.5 : 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

// ----------------------------------------------------------------- input
export function Field({ label, value, onChangeText, placeholder, secure, keyboard, multiline,
  hint, error, right, disabled }: {
  label?: string; value: string; onChangeText: (s: string) => void; placeholder?: string;
  secure?: boolean; keyboard?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean; hint?: string; error?: string; right?: React.ReactNode; disabled?: boolean;
}) {
  const { rtl } = useStore();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {label ? <Txt size={12.5} bold="600" color={colors.sub}>{label}</Txt> : null}
      <View style={{
        flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center',
        backgroundColor: disabled ? '#F2F5F6' : '#fff',
        borderWidth: 1.4, borderColor: error ? colors.danger : focus ? colors.brand : colors.border,
        borderRadius: radius.md, paddingHorizontal: 12,
      }}>
        <TextInput
          value={value}
          editable={!disabled}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secure}
          keyboardType={keyboard as any}
          multiline={multiline}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={[{
            flex: 1, paddingVertical: multiline ? 10 : 11, fontSize: 14.5, color: colors.text,
            textAlign: rtl ? 'right' : 'left', minHeight: multiline ? 88 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
        />
        {right}
      </View>
      {error ? <Txt size={11.5} color={colors.danger}>{error}</Txt>
        : hint ? <Txt size={11.5} color={colors.muted}>{hint}</Txt> : null}
    </View>
  );
}

// ---------------------------------------------------------------- select
export function Chips<T extends string | number>({ options, value, onChange, small }: {
  options: { value: T; label: string; icon?: string }[];
  value: T | null; onChange: (v: T) => void; small?: boolean;
}) {
  const { rtl } = useStore();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, flexDirection: rtl ? 'row-reverse' : 'row', paddingVertical: 2 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)}
            style={{
              backgroundColor: active ? colors.brand : '#fff',
              borderWidth: 1.2, borderColor: active ? colors.brand : colors.border,
              borderRadius: radius.pill,
              paddingVertical: small ? 6 : 9, paddingHorizontal: small ? 12 : 15,
              flexDirection: 'row', alignItems: 'center', gap: 5,
            }}>
            {o.icon ? <Text style={{ fontSize: small ? 12 : 14 }}>{o.icon}</Text> : null}
            <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700', fontSize: small ? 12 : 13.5 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Select<T extends string | number>({ label, options, value, onChange, placeholder }: {
  label?: string; options: { value: T; label: string }[]; value: T | null;
  onChange: (v: T) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const { rtl } = useStore();
  const sel = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {label ? <Txt size={12.5} bold="600" color={colors.sub}>{label}</Txt> : null}
      <Pressable onPress={() => setOpen(true)} style={{
        borderWidth: 1.4, borderColor: colors.border, borderRadius: radius.md,
        paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#fff',
        flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Txt color={sel ? colors.text : colors.muted}>{sel?.label || placeholder || '—'}</Txt>
        <Text style={{ color: colors.muted, fontSize: 11 }}>▼</Text>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <ScrollView style={{ maxHeight: 420 }}>
          {options.map((o) => (
            <Pressable key={String(o.value)}
              onPress={() => { onChange(o.value); setOpen(false); }}
              style={{
                paddingVertical: 14, paddingHorizontal: 14, borderRadius: radius.md,
                backgroundColor: o.value === value ? colors.brandLight : 'transparent',
              }}>
              <Txt bold={o.value === value ? '700' : undefined}
                color={o.value === value ? colors.brandDark : colors.text}>{o.label}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  const { rtl } = useStore();
  return (
    <Pressable onPress={() => onChange(!value)} style={{
      flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, paddingVertical: 6,
    }}>
      <View style={{
        width: 44, height: 26, borderRadius: 13, padding: 3,
        backgroundColor: value ? colors.brand : '#CBD5D8',
        alignItems: value ? (rtl ? 'flex-start' : 'flex-end') : (rtl ? 'flex-end' : 'flex-start'),
      }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
      </View>
      {label ? <Txt style={{ flex: 1 }}>{label}</Txt> : null}
    </Pressable>
  );
}

// --------------------------------------------------------------- modal
export function Sheet({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean;
}) {
  const { rtl } = useStore();
  const { isPhone } = useLayout();
  if (!open) return null;
  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{
        flex: 1, backgroundColor: 'rgba(11,30,34,0.5)',
        justifyContent: isPhone ? 'flex-end' : 'center', alignItems: 'center', padding: isPhone ? 0 : 24,
      }}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{
          backgroundColor: colors.bg, width: '100%', maxWidth: wide ? 900 : 560,
          borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
          borderBottomLeftRadius: isPhone ? 0 : radius.xl, borderBottomRightRadius: isPhone ? 0 : radius.xl,
          maxHeight: '92%', overflow: 'hidden',
        }}>
          <View style={{
            flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center',
            justifyContent: 'space-between', padding: 16, borderBottomWidth: 1,
            borderBottomColor: colors.border, backgroundColor: '#fff',
          }}>
            <Txt bold="800" size={16}>{title || ''}</Txt>
            <Pressable onPress={onClose} hitSlop={12} style={{
              width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 15, color: colors.sub }}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ----------------------------------------------------------------- misc
export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} disabled={!onChange} onPress={() => onChange?.(n)} hitSlop={4}>
          <Text style={{ fontSize: size, color: n <= Math.round(value) ? '#F2B01E' : '#D8E0E2' }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Empty({ icon = '📭', title, sub, action }: {
  icon?: string; title: string; sub?: string; action?: React.ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 52, gap: 10 }}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <Txt bold="700" size={16} center>{title}</Txt>
      {sub ? <Txt color={colors.sub} center style={{ maxWidth: 320 }}>{sub}</Txt> : null}
      {action}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator size="large" color={colors.brand} />
      {label ? <Txt color={colors.sub}>{label}</Txt> : null}
    </View>
  );
}

export function Row({ children, gap = 10, style, wrap, center, between }: {
  children: React.ReactNode; gap?: number; style?: ViewStyle; wrap?: boolean;
  center?: boolean; between?: boolean;
}) {
  const { rtl } = useStore();
  return (
    <View style={[{
      flexDirection: rtl ? 'row-reverse' : 'row', gap,
      flexWrap: wrap ? 'wrap' : 'nowrap',
      alignItems: center ? 'center' : 'flex-start',
      justifyContent: between ? 'space-between' : 'flex-start',
    }, style as any]}>{children}</View>
  );
}

export function Divider({ v = 12 }: { v?: number }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: v }} />;
}

export function KV({ k, v, tone }: { k: string; v: React.ReactNode; tone?: string }) {
  const { rtl } = useStore();
  return (
    <View style={{
      flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingVertical: 6, gap: 12,
    }}>
      <Txt size={13} color={colors.sub}>{k}</Txt>
      {typeof v === 'string' || typeof v === 'number'
        ? <Txt size={13.5} bold="700" color={tone}>{v}</Txt> : v}
    </View>
  );
}

export function Stat({ label, value, icon, tone = colors.brand, sub }: {
  label: string; value: string | number; icon?: string; tone?: string; sub?: string;
}) {
  return (
    <Card style={{ flex: 1, minWidth: 152 }} pad={14}>
      <Row center gap={8}>
        {icon ? (
          <View style={{
            width: 34, height: 34, borderRadius: 10, backgroundColor: tone + '18',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 16 }}>{icon}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Txt size={11.5} color={colors.sub} numberOfLines={1}>{label}</Txt>
          <Txt size={18} bold="800" color={tone}>{value}</Txt>
          {sub ? <Txt size={10.5} color={colors.muted}>{sub}</Txt> : null}
        </View>
      </Row>
    </Card>
  );
}

export function Img({ uri, style, ratio = 1.35, radiusTop }: {
  uri?: string; style?: ViewStyle; ratio?: number; radiusTop?: boolean;
}) {
  const [err, setErr] = useState(false);
  // relative paths (e.g. "/uploads/x.jpg") are served by the API host, not the web host
  const src = uri ? api.fileUrl(uri) : uri;
  const r = radiusTop
    ? { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }
    : { borderRadius: radius.md };
  if (!uri || err) {
    return (
      <View style={[{
        aspectRatio: ratio, backgroundColor: colors.brandSoft, alignItems: 'center',
        justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
      }, r, style as any]}>
        <Text style={{ fontSize: 34, opacity: 0.35 }}>🩺</Text>
      </View>
    );
  }
  return (
    <Image source={{ uri: src }} onError={() => setErr(true)} resizeMode="cover"
      style={[{ aspectRatio: ratio, backgroundColor: colors.brandSoft }, r, style as any]} />
  );
}

// ------------------------------------------------------------ date input
export function DateField({ label, value, onChange, min, max, busy }: {
  label?: string; value: string; onChange: (s: string) => void;
  min?: string; max?: string; busy?: string[];
}) {
  const { rtl } = useStore();
  if (Platform.OS === 'web') {
    return (
      <View style={{ gap: 6, flex: 1 }}>
        {label ? <Txt size={12.5} bold="600" color={colors.sub}>{label}</Txt> : null}
        {React.createElement('input', {
          type: 'date', value, min, max,
          onChange: (e: any) => onChange(e.target.value),
          style: {
            border: `1.4px solid ${colors.border}`, borderRadius: radius.md,
            padding: '11px 12px', fontSize: 14.5, color: colors.text,
            fontFamily: 'inherit', background: '#fff', outline: 'none', width: '100%',
            direction: rtl ? 'rtl' : 'ltr', boxSizing: 'border-box',
          },
        })}
      </View>
    );
  }
  return <Field label={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" hint="مثال 2026-10-01" />;
}

// ------------------------------------------------------------- calendar
export function MiniCalendar({ busy = [], months = 2, start, end, onPick }: {
  busy?: string[]; months?: number; start?: string; end?: string;
  onPick?: (d: string) => void;
}) {
  const { lang, rtl } = useStore();
  const today = new Date();
  const busySet = new Set(busy);
  const blocks: React.ReactNode[] = [];

  for (let m = 0; m < months; m++) {
    const base = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const firstDow = base.getDay();
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(<View key={`e${i}`} style={{ width: 30, height: 30 }} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(base.getFullYear(), base.getMonth(), d);
      const key = iso(dt);
      const isBusy = busySet.has(key);
      const past = dt < new Date(today.toDateString());
      const inRange = start && end && key >= start && key <= end;
      const edge = key === start || key === end;
      cells.push(
        <Pressable key={key} disabled={!onPick || isBusy || past} onPress={() => onPick?.(key)}
          style={{
            width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
            backgroundColor: edge ? colors.brand : inRange ? colors.brandLight
              : isBusy ? colors.dangerBg : 'transparent',
            opacity: past ? 0.3 : 1,
          }}>
          <Text style={{
            fontSize: 11.5, fontWeight: edge ? '800' : '500',
            color: edge ? '#fff' : isBusy ? colors.danger : inRange ? colors.brandDark : colors.text,
            textDecorationLine: isBusy ? 'line-through' : 'none',
          }}>{d}</Text>
        </Pressable>
      );
    }
    blocks.push(
      <View key={m} style={{ gap: 6 }}>
        <Txt size={13} bold="700" center>
          {base.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { month: 'long', year: 'numeric' })}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 30 * 7, gap: 0 }}>
          {(lang === 'ar' ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'])
            .map((d, i) => (
              <View key={i} style={{ width: 30, alignItems: 'center', paddingBottom: 3 }}>
                <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '700' }}>{d}</Text>
              </View>
            ))}
          {cells}
        </View>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 20 }}>{blocks}</View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------- toasts
export function Toasts() {
  const { toasts, rtl } = useStore();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="none" style={{
      position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center', gap: 8, zIndex: 9999,
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} msg={t.msg} level={t.level} rtl={rtl} />
      ))}
    </View>
  );
}

function ToastItem({ msg, level, rtl }: { msg: string; level: string; rtl: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 7 }).start();
  }, [a]);
  const bg = level === 'error' ? colors.danger : level === 'info' ? colors.dark : colors.success;
  return (
    <Animated.View style={{
      opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      backgroundColor: bg, paddingVertical: 11, paddingHorizontal: 18, borderRadius: radius.pill,
      maxWidth: 460, ...shadow.md,
    }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5, textAlign: rtl ? 'right' : 'left' }}>{msg}</Text>
    </Animated.View>
  );
}

// -------------------------------------------------------------- helpers
export function openUrl(url: string) {
  if (Platform.OS === 'web') { window.open(url, '_blank'); return; }
  const { Linking } = require('react-native');
  Linking.openURL(url).catch(() => {});
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

// ------------------------------- reveal (subtle fade + slide — Apple/Linear style)
export function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle }) {
  const a = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  // on web we use IntersectionObserver-like delay; on native immediate
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  useEffect(() => {
    if (!visible) return;
    Animated.timing(a, { toValue: 1, duration: 520, delay: 0, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [visible, a]);
  return (
    <Animated.View
      style={[
        {
          opacity: a,
          transform: [
            {
              translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
            },
          ],
        },
        style as any,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export const styles = StyleSheet.create({
  pageWrap: { padding: 16, gap: 16, maxWidth: 1400, width: '100%', alignSelf: 'center' },
});

export { addDays, iso };
