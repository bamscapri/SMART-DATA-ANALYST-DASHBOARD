import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateUniqueId } from '../../utils/idGenerator';
import { Users, ShieldCheck, UserPlus, Trash2, Lock } from 'lucide-react';

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
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Manajemen Pengguna & Kontrol Akses (Admin RBAC)</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Kelola peran pengguna (Admin / Analyst), kebijakan isolasi data Row Level Security (RLS), dan alokasi sumber daya.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme self-start sm:self-auto whitespace-nowrap cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah User Baru</span>
        </button>
      </div>

      {/* RLS Security Notice */}
      <div
        className="p-4 rounded-xl border border-[var(--accent-caramel)] text-xs flex items-start gap-3"
        style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
      >
        <Lock className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[var(--color-primary)]">Row Level Security (RLS) Aktif:</span>
          <p className="text-[var(--text-main)] text-[11px] mt-0.5 leading-relaxed">
            Setiap pengguna non-admin hanya memiliki otorisasi untuk membaca, mengunggah, dan mengedit dataset miliknya sendiri. Administrator memiliki hak istimewa untuk mengaudit seluruh repositori dan log sistem.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--text-main)]">
            <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold border-b border-[var(--border-color)]">
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
            <tbody className="divide-y divide-[var(--border-color)]">
              {users.map((u, index) => (
                <tr key={`${u.id}-${index}`} className="hover:bg-[var(--bg-caramel-soft)] transition-theme">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-[var(--text-main)]">{u.fullName}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-mono">{u.email}</div>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--text-secondary)]">{u.department}</td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleToggleRole(u.id)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-theme flex items-center gap-1 cursor-pointer border ${
                        u.role === 'admin'
                          ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] border-[var(--color-primary)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--color-primary)] border-[var(--border-color)]'
                      }`}
                      title="Klik untuk mengubah role"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>{u.role}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-[var(--text-main)] tabular-nums">
                    {u.datasetsCount}
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-[var(--color-primary)] tabular-nums">
                    {u.aiQueriesCount}
                  </td>
                  <td className="px-4 py-3.5 text-[var(--text-secondary)] text-[11px]">{u.lastLogin}</td>
                  <td className="px-5 py-3.5 text-right">
                    {u.email !== currentUser.email && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                        aria-label={`Hapus user ${u.fullName}`}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-secondary)] transition-theme cursor-pointer"
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-user-title"
          className="fixed inset-0 bg-[#211C19]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div className="surface-card rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 id="modal-add-user-title" className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[var(--color-primary)]" />
              <span>Daftarkan Pengguna Organisasi Baru</span>
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label htmlFor="um-name" className="text-[var(--text-main)] font-semibold block mb-1">
                  Nama Lengkap
                </label>
                <input
                  id="um-name"
                  type="text"
                  required
                  placeholder="Contoh: Budi Pratama"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
                />
              </div>

              <div>
                <label htmlFor="um-email" className="text-[var(--text-main)] font-semibold block mb-1">
                  Email Perusahaan
                </label>
                <input
                  id="um-email"
                  type="email"
                  required
                  placeholder="nama@smartai.enterprise"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
                />
              </div>

              <div>
                <label htmlFor="um-dept" className="text-[var(--text-main)] font-semibold block mb-1">
                  Departemen / Divisi
                </label>
                <input
                  id="um-dept"
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
                />
              </div>

              <div>
                <label htmlFor="um-role" className="text-[var(--text-main)] font-semibold block mb-1">
                  Role / Peran Akses
                </label>
                <select
                  id="um-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
                >
                  <option value="user">USER (Akses dataset mandiri & analisis)</option>
                  <option value="admin">ADMIN (Akses penuh seluruh dataset & manajemen sistem)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] border border-[var(--border-color)] transition-theme cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold transition-theme cursor-pointer"
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
