import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Kicker,
  Modal,
  ModalActions,
  Table,
  Td,
} from "../../components/ds";
import { toast } from "../../lib/toast";
import { ApiError } from "../../lib/api";
import type {
  ChangePasswordPayload,
  NotificationPrefs,
  User,
} from "../../context/AuthContext";

/* ═══════════════════════════════════════════════════════════════════════════
 * Ayarlar — notification preferences, the password change and the one
 * irreversible action on the account.
 * ═══════════════════════════════════════════════════════════════════════ */

const NOTIFICATION_ROWS: {
  key: keyof NotificationPrefs;
  label: string;
  desc: string;
}[] = [
  {
    key: "email",
    label: "E-posta bildirimleri",
    desc: "Rezervasyon güncellemeleri e-posta ile gelsin.",
  },
  {
    key: "sms",
    label: "SMS bildirimleri",
    desc: "Önemli güncellemeler SMS ile gelsin.",
  },
  {
    key: "push",
    label: "Anlık bildirimler",
    desc: "Tarayıcı bildirimleri açık olsun.",
  },
];

export function SettingsTab({
  user,
  updateProfile,
  changePassword,
  deleteAccount,
  onDeleted,
}: {
  user: User;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (data: ChangePasswordPayload) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  onDeleted: () => void;
}) {
  // Notifications are pessimistic: the switch waits for the PATCH to land
  // so it never shows a state the backend doesn't actually have.
  const [notifsBusy, setNotifsBusy] = useState<keyof NotificationPrefs | null>(
    null,
  );

  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [delOpen, setDelOpen] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delSubmitting, setDelSubmitting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const handleToggleNotification = async (key: keyof NotificationPrefs) => {
    if (notifsBusy) return;
    const next = { ...user.notifications, [key]: !user.notifications[key] };
    setNotifsBusy(key);
    try {
      await updateProfile({ notifications: next });
    } catch (err) {
      toast.apiError(err, "Tercih kaydedilemedi.");
    } finally {
      setNotifsBusy(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdSubmitting) return;
    setPwdError(null);
    if (pwdNew.length < 8) {
      setPwdError("Yeni şifre en az 8 karakter olmalı.");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError("Yeni şifreler eşleşmiyor.");
      return;
    }
    setPwdSubmitting(true);
    try {
      await changePassword({ currentPassword: pwdCurrent, newPassword: pwdNew });
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      toast.success("Şifren güncellendi.");
    } catch (err: unknown) {
      setPwdError(
        err instanceof ApiError ? err.message : "Şifre güncellenemedi.",
      );
    } finally {
      setPwdSubmitting(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delSubmitting || !delPassword) return;
    setDelSubmitting(true);
    setDelError(null);
    try {
      await deleteAccount(delPassword);
      // deleteAccount clears local auth; the parent bounces to the home page.
      onDeleted();
    } catch (err: unknown) {
      setDelError(err instanceof ApiError ? err.message : "Hesap silinemedi.");
    } finally {
      setDelSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="t-panel mb-10">Ayarlar</h1>

      {/* ── Notifications ────────────────────────────────────────────── */}
      <Kicker as="h2" className="mb-3.5">
        Bildirimler
      </Kicker>
      <Table caption="Bildirim tercihleri" stack={false}>
        <tbody>
          {NOTIFICATION_ROWS.map(({ key, label, desc }) => (
            <tr key={key}>
              <Td>
                <span className="block">{label}</span>
                <span className="t-meta block">{desc}</span>
              </Td>
              <Td className="text-right">
                <Checkbox
                  bare
                  className="justify-end"
                  checked={user.notifications[key]}
                  disabled={notifsBusy === key}
                  onChange={() => handleToggleNotification(key)}
                  aria-label={`${label} ${user.notifications[key] ? "açık" : "kapalı"}`}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* ── Password ─────────────────────────────────────────────────── */}
      <Kicker as="h2" className="mt-14 mb-3.5">
        Şifre Değiştir
      </Kicker>
      <form
        onSubmit={handleChangePassword}
        className="grid items-end gap-4 md:grid-cols-3"
      >
        <Field label="Mevcut şifre" required>
          {(field) => (
            <Input
              {...field}
              type="password"
              value={pwdCurrent}
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={(e) => setPwdCurrent(e.target.value)}
              required
            />
          )}
        </Field>
        <Field label="Yeni şifre" required hint="En az 8 karakter.">
          {(field) => (
            <Input
              {...field}
              type="password"
              value={pwdNew}
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              onChange={(e) => setPwdNew(e.target.value)}
              required
            />
          )}
        </Field>
        <Field label="Yeni şifre (tekrar)" required>
          {(field) => (
            <Input
              {...field}
              type="password"
              value={pwdConfirm}
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              onChange={(e) => setPwdConfirm(e.target.value)}
              required
            />
          )}
        </Field>

        {pwdError && (
          <div className="md:col-span-3">
            <Alert tone="error">{pwdError}</Alert>
          </div>
        )}

        <div className="md:col-span-3">
          <Button
            type="submit"
            variant="primary"
            disabled={!pwdCurrent || !pwdNew || !pwdConfirm}
            loading={pwdSubmitting}
            loadingLabel="Güncelleniyor…"
          >
            Şifreyi Güncelle
          </Button>
        </div>
      </form>

      {/* ── Delete account ───────────────────────────────────────────── */}
      <div className="mt-14 border-t-2 border-rule pt-7">
        <h3 className="t-sub">Hesabı Sil</h3>
        <p className="t-body mt-3.5 max-w-[52ch]">
          Hesabını silersen rezervasyon geçmişin ve değerlendirmelerin kalıcı
          olarak kaldırılır. Bu işlem geri alınamaz.
        </p>
        <Button
          variant="danger"
          className="mt-6"
          onClick={() => {
            setDelOpen(true);
            setDelPassword("");
            setDelError(null);
          }}
        >
          Hesabımı Sil
        </Button>
      </div>

      <Modal
        open={delOpen}
        onClose={() => {
          if (!delSubmitting) setDelOpen(false);
        }}
        title="Hesabı Sil"
        description="Hesabını kalıcı olarak silmek için şifreni doğrula."
      >
        <form onSubmit={handleDeleteAccount}>
          <Alert tone="error">
            <strong className="font-semibold">Bu işlem geri alınamaz.</strong>{" "}
            Hesabınla birlikte tüm rezervasyonların, değerlendirmelerin ve
            profil bilgilerin kalıcı olarak silinir.
          </Alert>

          <div className="mt-5">
            <Field label="Devam etmek için şifreni gir" required>
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  value={delPassword}
                  autoComplete="current-password"
                  onChange={(e) => setDelPassword(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          {delError && (
            <Alert tone="error" className="mt-4">
              {delError}
            </Alert>
          )}

          <ModalActions>
            <Button
              type="submit"
              variant="danger"
              disabled={!delPassword}
              loading={delSubmitting}
              loadingLabel="Siliniyor…"
            >
              Hesabımı Kalıcı Olarak Sil
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDelOpen(false)}
              disabled={delSubmitting}
            >
              Vazgeç
            </Button>
          </ModalActions>
        </form>
      </Modal>
    </>
  );
}
