import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Alert,
  Button,
  Field,
  Input,
  Kicker,
  Photo,
  Table,
  Tag,
  Td,
  Textarea,
} from "../../components/ds";
import { toast } from "../../lib/toast";
import { ApiError } from "../../lib/api";
import type { User } from "../../context/AuthContext";

/* ═══════════════════════════════════════════════════════════════════════════
 * Profil — the account's own record, read-only until the user asks to edit.
 * ═══════════════════════════════════════════════════════════════════════ */

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // keep in sync with backend
const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ProfileTab({
  user,
  updateProfile,
  uploadAvatar,
}: {
  user: User;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [location, setLocation] = useState(user.location ?? "");
  const [bio, setBio] = useState(user.bio ?? "");

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  // Re-seed the form whenever the stored user changes (another tab, a
  // successful save) so the fields never drift from the source of truth.
  useEffect(() => {
    if (editing) return;
    setName(user.name);
    setPhone(user.phone ?? "");
    setLocation(user.location ?? "");
    setBio(user.bio ?? "");
  }, [user, editing]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so re-selecting the same file still triggers `change`.
    e.target.value = "";
    if (!file || uploading) return;

    // Client-side gate: matches the server's checks but saves a round-trip
    // when the user picks something obviously wrong.
    if (!ALLOWED_AVATAR_MIME.has(file.type)) {
      toast.error("Yalnızca JPEG, PNG veya WebP yükleyebilirsiniz.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Dosya çok büyük (en fazla 2 MB).");
      return;
    }

    setUploading(true);
    try {
      await uploadAvatar(file);
      toast.success("Avatar güncellendi.");
    } catch (err) {
      toast.apiError(err, "Avatar yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name, phone, location, bio });
      setEditing(false);
      toast.success("Profil güncellendi.");
    } catch (err: unknown) {
      // Stays inline — the user is still in the form and the error points
      // at it (e.g. "Telefon zorunlu"). A toast would scroll away too fast.
      setError(err instanceof ApiError ? err.message : "Profil kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setName(user.name);
    setPhone(user.phone ?? "");
    setLocation(user.location ?? "");
    setBio(user.bio ?? "");
  };

  return (
    <>
      <h1 className="t-panel mb-10">Profil</h1>

      <div className="grid gap-7 border-t-2 border-rule pt-7 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-x-[clamp(24px,4vw,56px)]">
        {/* ── Avatar ─────────────────────────────────────────────────── */}
        <div>
          <Photo src={user.avatar} name={user.name} alt="" size={120} portrait />
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <Button
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => avatarInputRef.current?.click()}
            loading={uploading}
            loadingLabel="Yükleniyor…"
          >
            Fotoğraf Değiştir
          </Button>
          <p className="t-meta mt-2">JPEG, PNG veya WebP. En fazla 2 MB.</p>
        </div>

        {/* ── Identity + form ────────────────────────────────────────── */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl leading-none font-extrabold">
              {user.name}
            </h2>
            {user.emailVerified && (
              <Tag tone="success" className="gap-1.5">
                <ShieldCheck size={12} aria-hidden="true" />
                Doğrulandı
              </Tag>
            )}
          </div>
          <p className="t-meta mt-2">
            {user.accountType === "customer" ? "Hizmet Alan" : "Uzman / Usta"} —
            Üyelik: {user.joinDate}
          </p>

          {editing ? (
            <form onSubmit={handleSave} className="mt-7 flex flex-col gap-6">
              <Field label="Ad Soyad" required>
                {(field) => (
                  <Input
                    {...field}
                    type="text"
                    value={name}
                    autoComplete="name"
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Telefon">
                  {(field) => (
                    <Input
                      {...field}
                      type="tel"
                      value={phone}
                      autoComplete="tel"
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  )}
                </Field>
                <Field label="Konum">
                  {(field) => (
                    <Input
                      {...field}
                      type="text"
                      value={location}
                      autoComplete="address-level2"
                      placeholder="Örn: Ankara, TR"
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  )}
                </Field>
              </div>

              <Field label="Kısa Tanıtım">
                {(field) => (
                  <Textarea
                    {...field}
                    value={bio}
                    placeholder="Kendinizi kısaca tanıtın…"
                    onChange={(e) => setBio(e.target.value)}
                  />
                )}
              </Field>

              {error && <Alert tone="error">{error}</Alert>}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  loadingLabel="Kaydediliyor…"
                >
                  Kaydet
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Vazgeç
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-7">
              <Kicker className="mb-3.5">Kişisel Bilgiler</Kicker>
              <Table caption="Kişisel bilgiler" stack={false}>
                <tbody>
                  <tr>
                    <Td>Ad Soyad</Td>
                    <Td className="text-right font-display font-extrabold">
                      {user.name}
                    </Td>
                  </tr>
                  <tr>
                    <Td>E-posta</Td>
                    <Td className="max-w-0 truncate text-right">{user.email}</Td>
                  </tr>
                  <tr>
                    <Td>Telefon</Td>
                    <Td className="tnum text-right">{user.phone || "—"}</Td>
                  </tr>
                  <tr>
                    <Td>Konum</Td>
                    <Td className="text-right">{user.location || "—"}</Td>
                  </tr>
                  {user.specialty && (
                    <tr>
                      <Td>Uzmanlık</Td>
                      <Td className="text-right">{user.specialty}</Td>
                    </tr>
                  )}
                </tbody>
              </Table>

              {user.bio && (
                <>
                  <Kicker className="mt-10 mb-3.5">Hakkımda</Kicker>
                  <p className="t-body max-w-[58ch] whitespace-pre-line">
                    {user.bio}
                  </p>
                </>
              )}

              <Button
                variant="primary"
                className="mt-7"
                onClick={() => setEditing(true)}
              >
                Profili Düzenle
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
