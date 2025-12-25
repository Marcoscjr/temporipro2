import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Users, PlusCircle, Search, Trash2, Edit, Phone, 
  CreditCard, Truck, Ruler, Save, X 
} from 'lucide-react';
import { masks, whatsappLink, notificar } from '../utils';

export default function Parceiros() {
  const [parceiros, setParceiros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('Todos'); // Todos | Fornecedor | Arquiteto

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({
    id: null,
    nome: '',
    tipo: 'Fornecedor',
    cpf_cnpj: '',
    telefone: '',
    email: '',
    chave_pix: '',
    observacoes: ''
  });

  useEffect(() => { carregarParceiros(); }, []);

  const carregarParceiros = async () => {
    setLoading(true);
    const { data } = await supabase.from('parceiros').select('*').order('nome');
    setParceiros(data || []);
    setLoading(false);
  };

  const salvar = async (e) => {
    e.preventDefault();
    try {
      const dados = {
        nome: form.nome,
        tipo: form.tipo,
        cpf_cnpj: form.cpf_cnpj,
        telefone: form.telefone,
        email: form.email,
        chave_pix: form.chave_pix,
        observacoes: form.observacoes
      };

      if (form.id) {
        // Editar
        const { error } = await supabase.from('parceiros').update(dados).eq('id', form.id);
        if (error) throw error;
        notificar.sucesso("Parceiro atualizado!");
      } else {
        // Criar
        const { error } = await supabase.from('parceiros').insert([dados]);
        if (error) throw error;
        notificar.sucesso("Parceiro cadastrado!");
      }
      
      setModalAberto(false);
      limparForm();
      carregarParceiros();
    } catch (error) {
      notificar.erro("Erro: " + error.message);
    }
  };

  const editar = (p) => {
    setForm(p);
    setModalAberto(true);
  };

  const excluir = async (id) => {
    if (!window.confirm("Deseja realmente excluir este parceiro?")) return;
    const { error } = await supabase.from('parceiros').delete().eq('id', id);
    if (error) notificar.erro(error.message);
    else {
      notificar.sucesso("Excluído com sucesso.");
      carregarParceiros();
    }
  };

  const limparForm = () => {
    setForm({
      id: null, nome: '', tipo: 'Fornecedor', cpf_cnpj: '', 
      telefone: '', email: '', chave_pix: '', observacoes: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let valorFinal = value;
    
    // Aplica máscaras dinamicamente
    if (name === 'telefone') {
      valorFinal = value.replace(/\D/g, "").replace(/^(\d\d)(\d)/g, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);
    }
    
    setForm(prev => ({ ...prev, [name]: valorFinal }));
  };

  // Filtragem
  const dadosFiltrados = parceiros.filter(p => {
    const matchTexto = p.nome.toLowerCase().includes(filtro.toLowerCase()) || 
                       p.cpf_cnpj?.includes(filtro) ||
                       p.telefone?.includes(filtro);
    const matchTipo = tipoFiltro === 'Todos' || p.tipo === tipoFiltro;
    return matchTexto && matchTipo;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={30} className="text-indigo-600"/> Parceiros & Fornecedores
        </h1>
        <button onClick={() => { limparForm(); setModalAberto(true); }} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold flex gap-2 hover:bg-indigo-700 shadow-lg">
          <PlusCircle size={20}/> Cadastrar Novo
        </button>
      </div>

      {/* FILTROS E PESQUISA */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 border rounded p-2 flex-1">
          <Search className="text-gray-400"/>
          <input 
            placeholder="Buscar por nome, CPF/CNPJ ou telefone..." 
            className="outline-none w-full text-gray-700"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['Todos', 'Fornecedor', 'Arquiteto', 'Prestador'].map(tipo => (
            <button 
              key={tipo}
              onClick={() => setTipoFiltro(tipo)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${tipoFiltro === tipo ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dadosFiltrados.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${p.tipo === 'Fornecedor' ? 'bg-blue-100 text-blue-600' : p.tipo === 'Arquiteto' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                  {p.tipo === 'Fornecedor' && <Truck size={20}/>}
                  {p.tipo === 'Arquiteto' && <Ruler size={20}/>}
                  {p.tipo === 'Prestador' && <Users size={20}/>}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{p.nome}</h3>
                  <span className="text-xs text-gray-400 font-mono">{p.tipo}</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => editar(p)} className="p-2 hover:bg-gray-100 rounded text-gray-500"><Edit size={16}/></button>
                <button onClick={() => excluir(p.id)} className="p-2 hover:bg-red-50 rounded text-red-400"><Trash2 size={16}/></button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              {p.telefone && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Phone size={14} className="text-gray-400"/> {p.telefone}</span>
                  <a href={whatsappLink(p.telefone, `Olá ${p.nome}, tudo bem?`)} target="_blank" rel="noreferrer" className="text-green-600 text-xs font-bold hover:underline">WhatsApp</a>
                </div>
              )}
              {p.cpf_cnpj && <p className="font-mono text-xs">DOC: {p.cpf_cnpj}</p>}
              {p.chave_pix && (
                 <div className="mt-3 bg-gray-50 p-2 rounded border border-gray-200 flex items-start gap-2">
                   <CreditCard size={14} className="text-gray-400 mt-0.5"/>
                   <div>
                     <p className="text-[10px] uppercase font-bold text-gray-400">Chave PIX / Banco</p>
                     <p className="font-mono font-bold select-all">{p.chave_pix}</p>
                   </div>
                 </div>
              )}
              {p.observacoes && <p className="text-xs italic text-gray-400 mt-2 border-t pt-2">{p.observacoes}</p>}
            </div>
          </div>
        ))}
      </div>
      
      {dadosFiltrados.length === 0 && !loading && (
        <div className="text-center p-10 text-gray-400">Nenhum parceiro encontrado com os filtros atuais.</div>
      )}

      {/* MODAL DE CADASTRO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-gray-800">{form.id ? 'Editar Parceiro' : 'Novo Parceiro'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500"><X/></button>
            </div>
            <form onSubmit={salvar} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="label-input">Nome / Razão Social</label>
                  <input required name="nome" value={form.nome} onChange={handleChange} className="input-padrao" placeholder="Ex: Madeireira Silva"/>
                </div>
                <div>
                  <label className="label-input">Tipo</label>
                  <select name="tipo" value={form.tipo} onChange={handleChange} className="input-padrao">
                    <option>Fornecedor</option>
                    <option>Arquiteto</option>
                    <option>Prestador</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-input">Telefone / WhatsApp</label>
                  <input name="telefone" value={form.telefone} onChange={handleChange} className="input-padrao" placeholder="(82) 99999-9999"/>
                </div>
                <div>
                  <label className="label-input">CPF / CNPJ</label>
                  <input name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} className="input-padrao"/>
                </div>
              </div>

              <div>
                <label className="label-input">Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} className="input-padrao"/>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="label-input flex items-center gap-1"><CreditCard size={12}/> Dados Bancários / PIX</label>
                <input name="chave_pix" value={form.chave_pix} onChange={handleChange} className="input-padrao mt-1" placeholder="Chave PIX, Agência e Conta..."/>
                <p className="text-[10px] text-gray-500 mt-1">Esses dados ficam fáceis de copiar na hora de pagar.</p>
              </div>

              <div>
                <label className="label-input">Observações</label>
                <textarea name="observacoes" value={form.observacoes} onChange={handleChange} className="input-padrao h-20 resize-none"/>
              </div>

              <button className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700 flex justify-center gap-2">
                <Save size={20}/> Salvar Cadastro
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .label-input { display: block; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem; }
        .input-padrao { width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; outline: none; transition: border-color 0.2s; }
        .input-padrao:focus { border-color: #4f46e5; ring: 2px solid #4f46e5; }
      `}</style>
    </div>
  );
}