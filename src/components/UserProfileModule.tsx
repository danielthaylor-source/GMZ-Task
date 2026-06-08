/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB, encryptPassword, decryptPassword } from "../dbState";
import { User, Mail, Phone, Lock, Globe, Sparkles, Camera, Image, Save, Check } from "lucide-react";

export const UserProfileModule: React.FC = () => {
  const { activeUser, updatePessoa, addToast } = useDB();

  const [nome, setNome] = useState(activeUser?.nome || "");
  const [email, setEmail] = useState(activeUser?.email || "");
  const [telefone, setTelefone] = useState(activeUser?.telefone || "");
  const [foto, setFoto] = useState(activeUser?.foto || "");
  const [idioma, setIdioma] = useState<"PT" | "EN" | "ES">(activeUser?.idioma || "PT");
  const [tema, setTema] = useState<"dark" | "metro" | "clean">(activeUser?.tema || "dark");

  const [endereco, setEndereco] = useState(activeUser?.endereco || "");
  const [cep, setCep] = useState(activeUser?.cep || "");
  const [cidade, setCidade] = useState(activeUser?.cidade || "");
  const [estado, setEstado] = useState(activeUser?.estado || "");
  const [cpf, setCpf] = useState(activeUser?.cpf || "");

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmNovaSenha, setConfirmNovaSenha] = useState("");

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;

    if (!nome.trim() || !email.trim()) {
      addToast(
        idioma === "PT"
          ? "Preencha nome e e-mail corporativo."
          : idioma === "EN"
          ? "Please fill in your name and email."
          : "Complete el nombre y correo electrónico.",
        "error"
      );
      return;
    }

    const payload: any = {
      nome,
      email,
      telefone,
      foto,
      idioma,
      tema,
      endereco,
      cep,
      cidade,
      estado,
      cpf,
    };

    // If changing password
    if (novaSenha.trim()) {
      const decryptedCurrent = decryptPassword(activeUser.senha || encryptPassword("123"));
      if (senhaAtual !== decryptedCurrent) {
        addToast(
          idioma === "PT"
            ? "Senha atual inválida."
            : idioma === "EN"
            ? "Invalid current password."
            : "Contraseña actual inválida.",
          "error"
        );
        return;
      }
      if (novaSenha !== confirmNovaSenha) {
        addToast(
          idioma === "PT"
            ? "Senhas novas não conferem."
            : idioma === "EN"
            ? "New passwords do not match."
            : "Las nuevas contraseñas no coinciden.",
          "error"
        );
        return;
      }
      payload.senha = encryptPassword(novaSenha);
    }

    try {
      await updatePessoa(activeUser.id, payload);
      // Clean password inputs
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmNovaSenha("");
      addToast(
        idioma === "PT"
          ? "Perfil pessoal atualizado com sucesso!"
          : idioma === "EN"
          ? "Personal profile updated successfully!"
          : "¡Perfil personal actualizado con éxito!",
        "success"
      );
    } catch (_) {
      addToast("Erro", "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in font-sans p-2">
      {/* Module Title Section */}
      <div className="text-left bg-neutral-900/40 border border-neutral-800 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-indigo-400 font-bold uppercase flex items-center gap-1.5">
            <Sparkles size={11} className="text-indigo-400" /> 
            {idioma === "PT" ? "DADOS CADASTRAIS" : idioma === "EN" ? "PERSONAL RECORD" : "DATOS DE REGISTRO"}
          </span>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-1">
            {idioma === "PT" ? "Perfil do Usuário" : idioma === "EN" ? "User Profile" : "Perfil del Usuario"}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            {idioma === "PT"
              ? "Gerencie suas informações cadastrais, redefina senhas com segurança, altere o tema visual e selecione o idioma nativo de operação."
              : idioma === "EN"
              ? "Manage your credentials, change password, switch visual themes, and select systems default languages."
              : "Administre sus credenciales, cambie la contraseña, cambie los temas visuales y seleccione el idioma de operación."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left column sidebar for photo upload, theme and language preview */}
        <div className="space-y-6 lg:col-span-1">
          {/* Photo upload container */}
          <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-3xl text-center space-y-4">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono block">
              {idioma === "PT" ? "Sua Avatar Foto" : idioma === "EN" ? "Avatar Picture" : "Imagen de Avatar"}
            </span>

            <div className="relative w-28 h-28 mx-auto group">
              <div className="w-full h-full rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0 shadow-lg relative">
                {foto ? (
                  <img src={foto} alt={nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={40} className="text-neutral-500" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg cursor-pointer transition active:scale-95 flex items-center justify-center border border-indigo-500">
                <Camera size={14} />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-neutral-200">{nome || "User Name"}</h4>
              <p className="text-[11px] font-mono text-neutral-500">{email || "Email"}</p>
            </div>

            {foto && (
              <button
                type="button"
                onClick={() => setFoto("")}
                className="text-[10px] text-rose-450 hover:text-rose-400 underline font-semibold cursor-pointer block mx-auto transition"
              >
                {idioma === "PT" ? "Remover Imagem" : idioma === "EN" ? "Remove Image" : "Remover Imagen"}
              </button>
            )}
          </div>

          {/* Languages selection view and tabs */}
          <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-3xl space-y-4">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono block flex items-center gap-1">
              <Globe size={11} className="text-indigo-400" />
              {idioma === "PT" ? "Idioma do Sistema" : idioma === "EN" ? "System Language" : "Idioma del Sistema"}
            </span>

            <div className="flex flex-col gap-2">
              {[
                { id: "PT", label: "Português (BR)", flag: "🇧🇷" },
                { id: "EN", label: "English (US)", flag: "🇺🇸" },
                { id: "ES", label: "Español (ES)", flag: "🇪🇸" },
              ].map((lang) => {
                const active = idioma === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setIdioma(lang.id as any)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition cursor-pointer text-xs ${
                      active
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 font-bold"
                        : "bg-neutral-950/40 border-neutral-850 text-neutral-400 hover:border-neutral-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm select-none">{lang.flag}</span>
                      {lang.label}
                    </span>
                    {active && <Check size={13} className="text-indigo-400 animate-scale-in" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 2 columns: credentials fields and theme selector */}
        <div className="space-y-6 lg:col-span-2">
          {/* Text Field coordinates card */}
          <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-3xl space-y-5">
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
              {idioma === "PT" ? "Dados Pessoais" : idioma === "EN" ? "Personal Coordinates" : "Coordenadas Personales"}
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">{idioma === "PT" ? "Nome Completo" : idioma === "EN" ? "Full Name" : "Nombre Completo"}</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 pl-10 pr-4 text-xs text-neutral-200 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">{idioma === "PT" ? "E-mail de Login" : idioma === "EN" ? "Registered Email" : "Correo Registrado"}</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="email"
                    required
                    disabled
                    value={email}
                    className="w-full bg-neutral-950/60 border border-neutral-850 rounded-xl py-2 pl-10 pr-4 text-xs text-neutral-400 cursor-not-allowed cursor-not-working"
                  />
                </div>
              </div>

              <div className="space-y-1.5 col-span-1">
                <label className="text-xs font-semibold text-neutral-300">{idioma === "PT" ? "Telefone / Celular" : idioma === "EN" ? "Mobile Phone" : "Celular"}</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 pl-10 pr-4 text-xs text-neutral-200 transition"
                  />
                </div>
              </div>

              {activeUser?.tipo === "GMZ" && (
                <>
                  <div className="col-span-1 md:col-span-2 border-t border-neutral-800/40 pt-4 mt-2">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Ficha de Endereço & Cadastro GMZ (Mandatório)</h4>
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-xs font-semibold text-neutral-300">CPF</label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-xs text-neutral-200 transition"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-xs font-semibold text-neutral-300">CEP</label>
                    <input
                      type="text"
                      required
                      placeholder="00000-000"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-xs text-neutral-200 transition"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-xs font-semibold text-neutral-300">Endereço Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Rua, número, complemento, bairro"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-xs text-neutral-200 transition"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-xs font-semibold text-neutral-300">Cidade</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: São Paulo"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-xs text-neutral-200 transition"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-xs font-semibold text-neutral-300">Estado</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: SP"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-xs text-neutral-200 transition"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Theme switcher card */}
          <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-3xl space-y-4">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono block">
              🎨 {idioma === "PT" ? "Tema de Interface" : idioma === "EN" ? "Interface Theme" : "Tema de Interfaz"}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: "dark",
                  label: "Modo Dark",
                  desc: "Slate Twilight default dark design.",
                  descPT: "Ambiente Slate Twilight escuro premium.",
                  descES: "Diseño oscuro premium por defecto.",
                  color: "bg-neutral-950 border-neutral-800",
                },
                {
                  id: "clean",
                  label: "Modo Clean",
                  desc: "Windows 11 Light modern ambient.",
                  descPT: "Ambiente claro, limpo e minimalista.",
                  descES: "Ambiente claro, limpio y minimalista.",
                  color: "bg-white border-neutral-300 text-neutral-900",
                },
              ].map((style) => {
                const active = tema === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setTema(style.id as any)}
                    className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition duration-200 gap-3 cursor-pointer ${
                      active
                        ? "border-indigo-500 bg-indigo-600/10 shadow-sm"
                        : "bg-neutral-950/40 border-neutral-850 hover:border-neutral-800"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">{style.label}</span>
                      <div className={`w-3.5 h-3.5 rounded-full border ${active ? "bg-indigo-505 border-indigo-400" : "bg-neutral-800 border-neutral-700"}`}></div>
                    </div>
                    <p className="text-[10px] text-neutral-500 leading-snug">
                      {idioma === "PT" ? style.descPT : idioma === "EN" ? style.desc : style.descES}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secure password changer card */}
          <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-3xl space-y-4">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
              <Lock size={11} className="text-rose-500" />
              {idioma === "PT" ? "Redefinir Senha de Acesso" : idioma === "EN" ? "Reset Login Password" : "Restablecer Contraseña"}
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase font-mono">{idioma === "PT" ? "Senha Atual" : idioma === "EN" ? "Current Password" : "Contraseña Actual"}</label>
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl p-2 px-3.5 text-xs text-neutral-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase font-mono">{idioma === "PT" ? "Nova Senha" : idioma === "EN" ? "New Password" : "Nueva Contraseña"}</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl p-2 px-3.5 text-xs text-neutral-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase font-mono">{idioma === "PT" ? "Confirmar Nova" : idioma === "EN" ? "Confirm New" : "Confirmar Nueva"}</label>
                <input
                  type="password"
                  value={confirmNovaSenha}
                  onChange={(e) => setConfirmNovaSenha(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl p-2 px-3.5 text-xs text-neutral-200"
                />
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition duration-200 scale-100 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg"
            >
              <Save size={13} />
              {idioma === "PT" ? "Salvar Perfil" : idioma === "EN" ? "Save Settings" : "Guardar Ajustes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
