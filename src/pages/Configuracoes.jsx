import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { createClient } from '@supabase/supabase-js'; 
import { 
  UserPlus, Trash2, Save, X, Users, Settings, Eye, EyeOff, 
  Shield, DollarSign, Percent, TrendingUp, Target, LayoutGrid, AlertCircle,
  CalendarDays, BarChart3, UserCheck // Novos ícones para Metas Individuais
} from 'lucide-react';
import { notificar, BRL } from '../utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL; 
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState('geral');
  const [loading, setLoading] = useState(false);
  
  // --- DADOS GERAIS ---
  const [config, setConfig] = useState({
    id: null, meta_loja: 0, markup_padrao: 0,
    taxa_juros_mensal: 0,
    faixa_1_teto: 180000, faixa_1_pct: 3,
    faixa_2_teto: 300000, faixa_2_pct: 4,
    faixa_3_pct: 5,
    comissao_tecnico: 0, desconto_maximo: 0
  });

  // --- DADOS METAS MENSAIS ---
  const [mesSelecionado, setMesSelecionado] = useState(new Date().toISOString().substring(0, 7)); // Formato YYYY-MM
  const [metasMes, setMetasMes] = useState({ valor_meta_loja: 0, valor_meta_individual: 0 });
  const [metasIndividuais, setMetasIndividuais] = useState({}); // { consultor_id: valor }

  // --- DADOS EQUIPE ---
  const [equipe, setEquipe] = useState([]);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', senha: '', cargo: 'consultor' }); // Alterado para consultor
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
    carregarEquipe(); // Carregamos sempre a equipe para usar nas metas
    if (abaAtiva === 'metas') carregarMetasMes();
  }, [abaAtiva, mesSelecionado]);

  // --- CARREGAMENTOS ---
  const carregarConfiguracoes = async () => {
    const { data } = await supabase.from('configuracoes').select('*').single();
    if (data) setConfig(data);
  };

  const carregarMetasMes = async () => {
    setLoading(true);
    const periodoBusca = `${mesSelecionado}-01`;
    
    // 1. Meta Global
    const { data: globalData } = await supabase
        .from('metas_mensais')
        .select('*')
        .eq('periodo', periodoBusca)
        .maybeSingle();
    
    if (globalData) {
        setMetasMes({ valor_meta_loja: globalData.valor_meta_loja, valor_meta_individual: globalData.valor_meta_individual });
    } else {
        setMetasMes({ valor_meta_loja: 0, valor_meta_individual: 0 });
    }

    // 2. Metas Individuais
    const { data: indivData } = await supabase
        .from('metas_individuais')
        .select('*')
        .eq('periodo', periodoBusca);
    
    const mapaMetas = {};
    indivData?.forEach(m => mapaMetas[m.consultor_id] = m.valor_meta);
    setMetasIndividuais(mapaMetas);

    setLoading(false);
  };

  const carregarEquipe = async () => {
    const { data } = await supabase.from('perfis').select('*').order('nome');
    setEquipe(data || []);
  };

  // --- AÇÕES ---
  const salvarGeral = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const { error } = await supabase.from('configuracoes').upsert(config);
        if (error) throw error;
        notificar.sucesso("Parâmetros atualizados!");
    } catch (err) {
        notificar.erro(err.message);
    } finally {
        setLoading(false);
    }
  };

  const salvarMetasMensais = async () => {
    setLoading(true);
    try {
        const periodo = `${mesSelecionado}-01`;
        
        // 1. Salvar Meta Global
        const { error: errGlobal } = await supabase.from('metas_mensais').upsert({
            periodo,
            valor_meta_loja: parseFloat(metasMes.valor_meta_loja),
            valor_meta_individual: parseFloat(metasMes.valor_meta_individual)
        }, { onConflict: 'periodo' });

        if (errGlobal) throw errGlobal;

        // 2. Salvar Metas Individuais (apenas dos consultores que possuem valor preenchido)
        const insertsIndiv = Object.entries(metasIndividuais).map(([consultor_id, valor]) => ({
            consultor_id,
            periodo,
            valor_meta: parseFloat(valor || 0)
        }));

        if (insertsIndiv.length > 0) {
            const { error: errIndiv } = await supabase.from('metas_individuais').upsert(insertsIndiv, { onConflict: 'consultor_id, periodo' });
            if (errIndiv) throw errIndiv;
        }

        notificar.sucesso(`Metas de ${mesSelecionado} atualizadas com sucesso!`);
    } catch (err) {
        notificar.erro("Erro ao salvar metas: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const criarUsuario = async (e) => {
    e.preventDefault();
    if (!SUPABASE_URL || SUPABASE_URL.includes('SUA_URL')) {
        return notificar.erro("Erro de configuração: Chaves do Supabase não encontradas.");
    }
    setLoading(true);
    try {
        const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data, error: authError } = await tempClient.auth.signUp({
            email: novoUsuario.email,
            password: novoUsuario.senha,
        });
        if (authError) throw authError;
        if (data.user) {
            setTimeout(async () => {
                const { error: profileError } = await supabase
                    .from('perfis')
                    .update({ nome: novoUsuario.nome, cargo: novoUsuario.cargo })
                    .eq('id', data.user.id);
                if (profileError) {
                    notificar.erro("Usuário criado, mas erro ao definir perfil.");
                } else {
                    notificar.sucesso(`Usuário ${novoUsuario.nome} cadastrado!`);
                }
                setModalUsuario(false);
                setNovoUsuario({ nome: '', email: '', senha: '', cargo: 'consultor' });
                carregarEquipe();
                setLoading(false);
            }, 2000);
        }
    } catch (err) {
        notificar.erro("Falha: " + err.message);
        setLoading(false);
    }
  };

  const removerUsuario = async (id) => {
      if(!confirm("Remover este acesso permanentemente?")) return;
      try {
          await supabase.from('perfis').delete().eq('id', id);
          notificar.sucesso("Usuário removido.");
          carregarEquipe();
      } catch (err) { notificar.erro(err.message); }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 animate-fade-in p-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Configurações</h1>
          <p className="text-slate-500 font-medium mt-2">Parâmetros operacionais e gestão de consultores.</p>
        </div>
        
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex gap-1 w-full md:w-auto">
            {[
                { id: 'geral', icon: Settings, label: 'Políticas' },
                { id: 'metas', icon: Target, label: 'Metas' },
                { id: 'equipe', icon: Users, label: 'Equipe' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setAbaAtiva(tab.id)}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <tab.icon size={14}/> {tab.label}
                </button>
            ))}
        </div>
      </div>

      {abaAtiva === 'geral' && (
          <form onSubmit={salvarGeral} className="animate-fade-in space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center"><DollarSign size={20}/></div>
                        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">Cálculos Base</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Markup Padrao (%)</label>
                            <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={config.markup_padrao} onChange={e => setConfig({...config, markup_padrao: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Desc. Máximo (%)</label>
                            <input type="number" className="w-full p-3 bg-red-50/30 border border-red-100 rounded-2xl outline-none font-bold text-red-600" value={config.desconto_maximo} onChange={e => setConfig({...config, desconto_maximo: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><TrendingUp size={20}/></div>
                        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">Custo VPL</h3>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Taxa de Juros Mensal</label>
                        <div className="relative">
                            <input type="number" step="0.01" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-slate-800 text-2xl" value={config.taxa_juros_mensal} onChange={e => setConfig({...config, taxa_juros_mensal: e.target.value})} />
                            <Percent size={20} className="absolute right-4 top-5 text-slate-300"/>
                        </div>
                    </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
                  <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800 mb-8 flex items-center gap-2"><Percent size={20} className="text-orange-600"/> Tabela de Comissões</h3>
                  <div className="grid md:grid-cols-3 gap-6">
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Bronze (Ate)</label>
                          <input type="number" className="w-full bg-transparent border-b border-slate-200 font-bold mb-2 py-1" value={config.faixa_1_teto} onChange={e => setConfig({...config, faixa_1_teto: e.target.value})} />
                          <div className="flex items-baseline gap-1"><input type="number" step="0.1" className="w-16 bg-transparent text-3xl font-black" value={config.faixa_1_pct} onChange={e => setConfig({...config, faixa_1_pct: e.target.value})} />%</div>
                      </div>
                      <div className="p-6 rounded-3xl bg-blue-50/40 border border-blue-100">
                          <label className="text-[10px] font-black text-blue-400 uppercase">Prata (Ate)</label>
                          <input type="number" className="w-full bg-transparent border-b border-blue-200 font-bold mb-2 py-1" value={config.faixa_2_teto} onChange={e => setConfig({...config, faixa_2_teto: e.target.value})} />
                          <div className="flex items-baseline gap-1"><input type="number" step="0.1" className="w-16 bg-transparent text-3xl font-black text-blue-600" value={config.faixa_2_pct} onChange={e => setConfig({...config, faixa_2_pct: e.target.value})} />%</div>
                      </div>
                      <div className="p-6 rounded-3xl bg-orange-50/40 border border-orange-100">
                          <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest italic">Ouro (Acima)</label>
                          <div className="py-2 font-black text-orange-900/30 text-sm">{BRL(config.faixa_2_teto)}</div>
                          <div className="flex items-baseline gap-1"><input type="number" step="0.1" className="w-16 bg-transparent text-3xl font-black text-orange-600" value={config.faixa_3_pct} onChange={e => setConfig({...config, faixa_3_pct: e.target.value})} />%</div>
                      </div>
                  </div>
              </div>

              <div className="flex justify-end">
                  <button type="submit" disabled={loading} className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-4">
                    <Save size={20}/> {loading ? 'Gravando...' : 'Salvar Diretrizes'}
                  </button>
              </div>
          </form>
      )}

      {/* --- ABA DE METAS MENSAIS (COM METAS INDIVIDUAIS POR CONSULTOR) --- */}
      {abaAtiva === 'metas' && (
          <div className="animate-fade-in space-y-6">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 border-b border-slate-50 pb-8">
                      <div className="flex items-center gap-4">
                          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><CalendarDays size={28}/></div>
                          <div>
                              <h3 className="font-black text-slate-900 text-xl uppercase italic">Metas do Período</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Selecione o mês e defina os objetivos.</p>
                          </div>
                      </div>
                      <input 
                        type="month" 
                        className="w-full md:w-64 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" 
                        value={mesSelecionado}
                        onChange={(e) => setMesSelecionado(e.target.value)}
                      />
                  </div>

                  <div className="grid grid-cols-1 gap-8 mb-10">
                      <div className="space-y-4 max-w-md">
                          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                              <Target size={14} className="text-blue-500"/> Meta Global da Loja
                          </label>
                          <div className="relative">
                              <span className="absolute left-5 top-5 text-slate-300 font-black text-xl">R$</span>
                              <input 
                                type="number" 
                                className="w-full pl-14 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none font-black text-3xl text-slate-800"
                                value={metasMes.valor_meta_loja}
                                onChange={e => setMetasMes({...metasMes, valor_meta_loja: e.target.value})}
                              />
                          </div>
                      </div>
                  </div>

                  {/* LISTA DE METAS POR CONSULTOR */}
                  <div className="mt-10 border-t border-slate-50 pt-8">
                      <h4 className="text-sm font-black uppercase text-slate-800 mb-6 flex items-center gap-2 italic">
                          <UserCheck size={18} className="text-blue-600"/> Metas Individuais por Consultor
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {equipe.filter(m => m.cargo === 'consultor').map(consultor => (
                              <div key={consultor.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                                  <div className="overflow-hidden mr-4">
                                      <p className="font-black text-slate-800 uppercase text-xs truncate">{consultor.nome}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">{consultor.email}</p>
                                  </div>
                                  <div className="relative w-40">
                                      <span className="absolute left-3 top-3 text-slate-400 text-xs font-black">R$</span>
                                      <input 
                                        type="number"
                                        className="w-full pl-9 p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="Definir..."
                                        value={metasIndividuais[consultor.id] || ''}
                                        onChange={e => setMetasIndividuais({...metasIndividuais, [consultor.id]: e.target.value})}
                                      />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="flex justify-end mt-12">
                      <button 
                        onClick={salvarMetasMensais}
                        disabled={loading}
                        className="bg-blue-600 text-white px-12 py-5 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center gap-3"
                      >
                        <Save size={20}/> {loading ? 'Processando...' : 'Confirmar Metas Individuais e Loja'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {abaAtiva === 'equipe' && (
        <div className="animate-slide-up space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-4 rounded-2xl text-blue-600 shadow-inner"><Users size={28}/></div>
                    <div>
                        <h3 className="font-black text-slate-900 text-xl uppercase italic leading-none">Colaboradores</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{equipe.length} Perfis Criados</p>
                    </div>
                </div>
                <button onClick={() => setModalUsuario(true)} className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                    <UserPlus size={18}/> Novo Perfil
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {equipe.map((membro) => (
                    <div key={membro.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl uppercase">{membro.nome ? membro.nome[0] : '?'}</div>
                            <div className="overflow-hidden flex-1">
                                <p className="font-black text-slate-900 text-lg uppercase tracking-tighter truncate">{membro.nome || 'Pendente'}</p>
                                <span className="inline-block text-[9px] uppercase font-black px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 mt-2">{membro.cargo}</span>
                            </div>
                            <button onClick={() => removerUsuario(membro.id)} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* MODAL NOVO USUÁRIO */}
      {modalUsuario && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10">
                <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Novo Acesso</h2>
                    <button onClick={() => setModalUsuario(false)} className="text-slate-400 hover:text-red-500"><X size={24}/></button>
                </div>
                <form onSubmit={criarUsuario} className="space-y-5">
                    <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={novoUsuario.nome} onChange={e => setNovoUsuario({...novoUsuario, nome: e.target.value})} placeholder="Nome Completo" />
                    <input required type="email" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={novoUsuario.email} onChange={e => setNovoUsuario({...novoUsuario, email: e.target.value})} placeholder="E-mail de Login" />
                    <div className="relative">
                        <input required type={mostrarSenha?"text":"password"} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold pr-12" value={novoUsuario.senha} onChange={e => setNovoUsuario({...novoUsuario, senha: e.target.value})} placeholder="Senha (mín. 6)" minLength={6}/>
                        <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-4 top-4 text-slate-300">{mostrarSenha?<EyeOff size={22}/>:<Eye size={22}/>}</button>
                    </div>
                    <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black uppercase text-xs appearance-none" value={novoUsuario.cargo} onChange={e => setNovoUsuario({...novoUsuario, cargo: e.target.value})}>
                        <option value="admin">Administrador</option>
                        <option value="financeiro">Financeiro</option>
                        <option value="consultor">Consultor (Vendas)</option>
                        <option value="tecnico">Técnico</option>
                        <option value="montador">Montador</option>
                    </select>
                    <button disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-blue-600 transition-all mt-4">
                        {loading ? 'Cadastrando...' : 'Criar Conta de Acesso'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}