import React, { useState } from 'react';
import { User, Lock, Save, Key, Camera, Image as ImageIcon } from 'lucide-react';
import { User as UserType } from '../../types';
import { motion } from 'motion/react';

interface ProfileSectionProps {
  user: UserType;
  setUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserType | null>>;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ user, setUsers, setCurrentUser }) => {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImage || '');
  const [name, setName] = useState(user.name);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, profileImage: profileImageUrl, name } : u));
    setCurrentUser(prev => prev ? { ...prev, profileImage: profileImageUrl, name } : null);
    setMessage({ text: 'Perfil atualizado com sucesso!', type: 'success' });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.current !== user.password) {
      setMessage({ text: 'Senha atual incorreta.', type: 'error' });
      return;
    }
    
    if (passwords.new !== passwords.confirm) {
      setMessage({ text: 'As novas senhas não coincidem.', type: 'error' });
      return;
    }

    if (passwords.new.length < 6) {
      setMessage({ text: 'A nova senha deve ter pelo menos 6 caracteres.', type: 'error' });
      return;
    }

    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, password: passwords.new } : u));
    setCurrentUser(prev => prev ? { ...prev, password: passwords.new } : null);
    
    setMessage({ text: 'Senha alterada com sucesso!', type: 'success' });
    setPasswords({ current: '', new: '', confirm: '' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Meu Perfil</h2>
        <p className="text-slate-500">Gerencie suas informações de acesso e senha.</p>
      </div>

      <div className="glass-card p-8">
        <div className="flex flex-col md:flex-row items-center gap-8 mb-8 pb-8 border-b border-slate-100">
          <div className="relative group">
            <img 
              src={user.profileImage || `https://picsum.photos/seed/${user.id}/120/120`} 
              alt="User" 
              className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
                  <input 
                    type="email" 
                    value={user.email}
                    disabled
                    className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">URL da Foto de Perfil</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={profileImageUrl}
                      onChange={e => setProfileImageUrl(e.target.value)}
                      placeholder="URL da nova foto de perfil..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Salvar Alterações do Perfil
              </button>
            </form>
          </div>
        </div>

        <div className="pt-4">
          <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-600" /> Alterar Senha
          </h4>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {message.text && (
              <div className={`p-4 rounded-xl text-sm font-medium ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Senha Atual</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="password"
                  value={passwords.current}
                  onChange={e => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                  className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nova Senha</label>
                <input
                  required
                  type="password"
                  value={passwords.new}
                  onChange={e => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confirmar Nova Senha</label>
                <input
                  required
                  type="password"
                  value={passwords.confirm}
                  onChange={e => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition-all flex items-center justify-center gap-2">
              <Save className="w-5 h-5" /> Salvar Nova Senha
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
