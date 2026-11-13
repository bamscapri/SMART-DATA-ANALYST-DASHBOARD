import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ThemeSwitcher } from '../common/ThemeSwitcher';
import {
  User,
  ShieldCheck,
  Building,
  Key,
  Save,
  CheckCircle2,
  Palette
} from 'lucide-react';

export const UserProfileView: React.FC = () => {
  const { currentUser, setCurrentUser, addToast, datasets } = useApp();

  const [fullName, setFullName] = useState(currentUser.fullName);
  const [company, setCompany] = useState(currentUser.company || 'PT Nusantara Enterprise Global');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser({
      ...currentUser,
      fullName,
      company
    });
    addToast('success', 'Profil Berhasil Diperbarui', 'Perubahan identitas telah disimpan.');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      addToast('error', 'Konfirmasi Password Tidak Cocok');
      return;
    }
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    addToast('success', 'Password Berhasil Diubah', 'Kredensial keamanan akun Anda telah diperbarui.');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <User className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Profil Pengguna & Kredensial Keamanan</span>
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Informasi akun pengguna terautentikasi dan preferensi tampilan dashboard.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl surface-card flex flex-col sm:flex-row items-center gap-6">
        <img
          src={currentUser.avatarUrl || '/src/assets/images/avatar_admin_1794548316205.jpg'}
          alt={currentUser.fullName}
          referrerPolicy="no-referrer"
          className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[var(--accent-caramel)] shadow-sm bg-[var(--bg-secondary)] shrink-0"
        />
        <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-[var(--text-main)]">{currentUser.fullName}</h2>
            <span className="text-[11px] font-bold text-[var(--color-primary)] uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {currentUser.role}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">{currentUser.email}</p>
          <p className="text-xs text-[var(--text-main)] flex items-center justify-center sm:justify-start gap-1 pt-1">
            <Building className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
            <span>{currentUser.company}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
          <div className="p-3 rounded-xl surface-secondary text-center">
            <span className="text-[10px] text-[var(--text-secondary)] block font-sans">Dataset Dimiliki</span>
            <span className="text-base font-bold text-[var(--text-main)] mt-0.5 block">{datasets.length}</span>
          </div>
          <div className="p-3 rounded-xl surface-secondary text-center">
            <span className="text-[10px] text-[var(--text-secondary)] block font-sans">Sesi Autentikasi</span>
            <span className="text-xs font-bold mt-1 block" style={{ color: 'var(--color-success)' }}>
              Active (JWT)
            </span>
          </div>
        </div>
      </div>

      {/* Theme Preferences Card in Profile */}
      <div className="p-5 rounded-2xl surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl text-[var(--color-primary)]"
            style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">Preferensi Tema Tampilan</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Siang (Brown Cream), Malam (Dark Brown), atau Sistem Perangkat.
            </p>
          </div>
        </div>
        <ThemeSwitcher showLabels />
      </div>

      {/* Forms: Edit Profile and Change Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edit Info Form */}
        <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl surface-card space-y-4 text-xs">
          <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Edit Informasi Profil</span>
          </h3>

          <div>
            <label htmlFor="prof-name" className="text-[var(--text-main)] font-semibold block mb-1">
              Nama Lengkap
            </label>
            <input
              id="prof-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
            />
          </div>

          <div>
            <label htmlFor="prof-email" className="text-[var(--text-main)] font-semibold block mb-1">
              Email Perusahaan (Read-only)
            </label>
            <input
              id="prof-email"
              type="email"
              disabled
              value={currentUser.email}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-secondary)] cursor-not-allowed opacity-80"
            />
          </div>

          <div>
            <label htmlFor="prof-comp" className="text-[var(--text-main)] font-semibold block mb-1">
              Organisasi / Perusahaan
            </label>
            <input
              id="prof-comp"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold transition-theme flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="p-6 rounded-2xl surface-card space-y-4 text-xs">
          <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
            <Key className="w-4 h-4 text-[var(--accent-caramel)]" />
            <span>Ubah Password Akun</span>
          </h3>

          <div>
            <label htmlFor="prof-old-pw" className="text-[var(--text-main)] font-semibold block mb-1">
              Password Saat Ini
            </label>
            <input
              id="prof-old-pw"
              type="password"
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
            />
          </div>

          <div>
            <label htmlFor="prof-new-pw" className="text-[var(--text-main)] font-semibold block mb-1">
              Password Baru
            </label>
            <input
              id="prof-new-pw"
              type="password"
              placeholder="Minimal 8 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
            />
          </div>

          <div>
            <label htmlFor="prof-confirm-pw" className="text-[var(--text-main)] font-semibold block mb-1">
              Konfirmasi Password Baru
            </label>
            <input
              id="prof-confirm-pw"
              type="password"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] font-semibold transition-theme flex items-center justify-center gap-2 border border-[var(--border-color)] cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Perbarui Password</span>
          </button>
        </form>
      </div>
    </div>
  );
};
