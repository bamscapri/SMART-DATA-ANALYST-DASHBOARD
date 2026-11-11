import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  User,
  ShieldCheck,
  Building,
  Mail,
  Key,
  LogOut,
  Save,
  CheckCircle2,
  Clock,
  Database
} from 'lucide-react';

export const UserProfileView: React.FC = () => {
  const { currentUser, setCurrentUser, addToast, datasets, currentStats } = useApp();

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
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" />
          Profil Pengguna & Kredensial Keamanan
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Informasi akun pengguna terautentikasi melalui Supabase Auth.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-6">
        <img
          src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
          alt={currentUser.fullName}
          className="w-20 h-20 rounded-2xl object-cover ring-2 ring-cyan-500/40 shadow-xl"
        />
        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg font-bold text-white">{currentUser.fullName}</h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 uppercase border border-cyan-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {currentUser.role}
            </span>
          </div>
          <p className="text-xs text-slate-400">{currentUser.email}</p>
          <p className="text-xs text-slate-300 flex items-center justify-center sm:justify-start gap-1 pt-1">
            <Building className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentUser.company}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">Dataset Dimiliki:</span>
            <span className="text-base font-bold text-white mt-0.5 block">{datasets.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-sans">Sesi Autentikasi:</span>
            <span className="text-xs font-bold text-emerald-400 mt-1 block">Active (JWT)</span>
          </div>
        </div>
      </div>

      {/* Forms: Edit Profile and Change Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edit Info Form */}
        <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            Edit Informasi Profil
          </h3>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Nama Lengkap:</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Email Perusahaan (Read-only):</label>
            <input
              type="email"
              disabled
              value={currentUser.email}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Organisasi / Perusahaan:</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-400" />
            Ubah Password Akun
          </h3>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Password Saat Ini:</label>
            <input
              type="password"
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Password Baru:</label>
            <input
              type="password"
              placeholder="Minimal 8 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Konfirmasi Password Baru:</label>
            <input
              type="password"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition flex items-center justify-center gap-2 border border-slate-700"
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>Perbarui Password</span>
          </button>
        </form>
      </div>
    </div>
  );
};
