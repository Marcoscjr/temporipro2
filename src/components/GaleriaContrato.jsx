import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Upload, FileText, Image as ImageIcon, Trash2, 
  Download, Eye, Loader2 
} from 'lucide-react';
import { notificar } from '../utils';

export default function GaleriaContrato({ contratoId }) {
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (contratoId) listarArquivos();
  }, [contratoId]);

  const listarArquivos = async () => {
    setLoading(true);
    try {
      // Lista todos os arquivos na pasta do contrato (ID do contrato = Nome da pasta)
      const { data, error } = await supabase
        .storage
        .from('contratos-files')
        .list(contratoId + '/', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setArquivos(data || []);
    } catch (error) {
      console.error("Erro ao listar arquivos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // Sanitiza o nome do arquivo para evitar caracteres especiais
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${contratoId}/${fileName}`;

      const { error } = await supabase.storage
        .from('contratos-files')
        .upload(filePath, file);

      if (error) throw error;

      notificar.sucesso("Arquivo enviado com sucesso!");
      listarArquivos(); // Atualiza a lista
    } catch (error) {
      notificar.erro("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deletarArquivo = async (nomeArquivo) => {
    if (!window.confirm("Deseja realmente excluir este arquivo?")) return;

    try {
      const { error } = await supabase.storage
        .from('contratos-files')
        .remove([`${contratoId}/${nomeArquivo}`]);

      if (error) throw error;

      notificar.sucesso("Arquivo removido.");
      setArquivos(arquivos.filter(a => a.name !== nomeArquivo));
    } catch (error) {
      notificar.erro("Erro ao deletar: " + error.message);
    }
  };

  const getUrl = (nomeArquivo) => {
    const { data } = supabase.storage
      .from('contratos-files')
      .getPublicUrl(`${contratoId}/${nomeArquivo}`);
    return data.publicUrl;
  };

  const isImage = (nome) => {
    return nome.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-100 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <ImageIcon size={20} className="text-blue-600"/> Galeria de Arquivos
          </h3>
          <p className="text-sm text-gray-500">Projetos, plantas, contratos assinados e fotos da obra.</p>
        </div>
        
        <div className="relative">
          <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleUpload}
            disabled={uploading}
          />
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}>
            {uploading ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20}/>}
            {uploading ? 'Enviando...' : 'Adicionar Arquivo'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-10 text-gray-400">Carregando arquivos...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {arquivos.length === 0 && (
            <div className="col-span-full text-center p-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400">
              Nenhum arquivo encontrado.<br/>
              Clique no botão acima ou arraste arquivos aqui.
            </div>
          )}

          {arquivos.map((arquivo) => (
            <div key={arquivo.id} className="group relative bg-white border rounded-lg shadow-sm hover:shadow-md transition overflow-hidden">
              {/* Preview Visual */}
              <div className="h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                {isImage(arquivo.name) ? (
                  <img 
                    src={getUrl(arquivo.name)} 
                    alt={arquivo.name} 
                    className="w-full h-full object-cover transition transform group-hover:scale-110"
                  />
                ) : (
                  <FileText size={48} className="text-gray-300"/>
                )}
              </div>

              {/* Informações */}
              <div className="p-3">
                <p className="text-xs font-bold text-gray-700 truncate mb-1" title={arquivo.name}>
                  {arquivo.name.substring(14)} {/* Remove o timestamp do começo p/ ficar legivel */}
                </p>
                <p className="text-[10px] text-gray-400">
                  {(arquivo.metadata?.size / 1024 / 1024).toFixed(2)} MB • {new Date(arquivo.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Ações (Overlay) */}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                  href={getUrl(arquivo.name)} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-2 bg-white/20 text-white rounded-full hover:bg-white hover:text-blue-600 backdrop-blur-sm transition"
                  title="Visualizar / Baixar"
                >
                  {isImage(arquivo.name) ? <Eye size={20}/> : <Download size={20}/>}
                </a>
                <button 
                  onClick={() => deletarArquivo(arquivo.name)}
                  className="p-2 bg-white/20 text-white rounded-full hover:bg-red-600 hover:text-white backdrop-blur-sm transition"
                  title="Excluir"
                >
                  <Trash2 size={20}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}