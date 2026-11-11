import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateUniqueId } from '../../utils/idGenerator';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Trash2,
  Mail,
  Building,
  Key,
  Shield,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'user';
  department: string;
  datasetsCount: number;
  aiQueriesCount: number;
  status: 'active' | 'suspended';
  lastLogin: string;
}

export const UserManagement: React.FC = () => {
  const { currentUser, addToast } = useApp();

  const [users, setUsers] = useState<ManagedUser[]>([
    {
      id: 'usr-1',
      fullName: 'Director of Analytics',
      email: 'admin@smartai.enterprise',
      role: 'admin',
      department: 'Executive Board',
      datasetsCount: 14,
      aiQueriesCount: 248,
      status: 'active',
      lastLogin: 'Today, 08:30 AM'
    },
    {
      id: 'usr-2',
      fullName: 'Senior Data Scientist',
      email: 'analyst@smartai.enterprise',
      role: 'user',
      department: 'Business Intelligence',
      datasetsCount: 8,
      aiQueriesCount: 182,
      status: 'active',
      lastLogin: 'Yesterday, 14:15 PM'
    },
    {
      id: 'usr-3',
      fullName: 'Supply Chain Operations Lead',
      email: 'operations@smartai.enterprise',
      role: 'user',
      department: 'Logistics & Supply',
      datasetsCount: 5,
      aiQueriesCount: 64,
      status: 'active',
      lastLogin: '3 days ago'
    },
    {
      id: 'usr-4',
      fullName: 'Financial Controller',
      email: 'finance@smartai.enterprise',
      role: 'user',
      department: 'Corporate Finance',
      datasetsCount: 11,
      aiQueriesCount: 95,
      status: 'active',
      lastLogin: '5 days ago'
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [newDept, setNewDept] = useState('Business Intelligence');

  const handleToggleRole = (id: string) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.id === id) {
          const nextRole: 'admin' | 'user' = u.role === 'admin' ? 'user' : 'admin';
          addToast('info', 'Hak Akses Diperbarui', `Role ${u.fullName} diubah menjadi ${nextRole.toUpperCase()}`);
          return { ...u, role: nextRole };
        }
        return u;
      })
    );
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail) return;

    const newUser: ManagedUser = {
      id: generateUniqueId('usr'),
      fullName: newFullName,
      email: newEmail,
      role: newRole,
      department: newDept,
      datasetsCount: 0,
      aiQueriesCount: 0,
      status: 'active',
      lastLogin: 'Just now'
    };

    setUsers(prev => [newUser, ...prev]);
    setShowAddModal(false);
    setNewFullName('');
    setNewEmail('');
    addToast('success', 'User Berhasil Ditambahkan', `${newUser.fullName} telah didaftarkan.`);
  };

  const handleDeleteUser = (id: string, name: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    addToast('info', 'User Dihapus', `${name} telah dihapus dari sistem.`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Manajemen Pengguna & Kontrol Akses (Admin RBAC)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola peran pengguna (Admin / Analyst), kebijakan isolasi data Row Level Security (RLS), dan alokasi sumber daya.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah User Baru</span>
        </button>
      </div>

      {/* RLS Security Notice */}
      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs flex items-start gap-3">
        <Lock className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-cyan-300">Row Level Security (RLS) Aktif:</span>
          <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
            Setiap pengguna non-admin hanya memiliki otorisasi untuk membaca, mengunggah, dan mengedit dataset miliknya sendiri. Administrator memiliki hak istimewa untuk mengaudit seluruh repositori dan log sistem.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Nama & Email</th>
                <th className="px-4 py-3">Departemen</th>
                <th className="px-4 py-3">Role Akses</th>
                <th className="px-4 py-3 text-center">Dataset</th>
                <th className="px-4 py-3 text-center">AI Kueri</th>
                <th className="px-4 py-3">Login Terakhir</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u, index) => (
                <tr key={`${u.id}-${index}`} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-white">{u.fullName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">{u.department}</td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleToggleRole(u.id)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition flex items-center gap-1 ${
                        u.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      }`}
                      title="Klik untuk mengubah role"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>{u.role}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-200">
                    {u.datasetsCount}
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-cyan-400">
                    {u.aiQueriesCount}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-[11px]">{u.lastLogin}</td>
                  <td className="px-5 py-3.5 text-right">
                    {u.email !== currentUser.email && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Hapus user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add User */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              Daftarkan Pengguna Organisasi Baru
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Pratama"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Email Perusahaan:</label>
                <input
                  type="email"
                  required
                  placeholder="nama@smartai.enterprise"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Departemen / Divisi:</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Role / Peran Akses:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="user">USER (Akses dataset mandiri & analisis)</option>
                  <option value="admin">ADMIN (Akses penuh seluruh dataset & manajemen sistem)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
