import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// Função auxiliar para transformar links normais em links de Embed (Loom e YouTube)
function getEmbedUrl(url) {
  if (!url) return '';
  
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('embed/')) {
      return url;
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  // Loom
  if (url.includes('loom.com')) {
    let videoId = '';
    if (url.includes('share/')) {
      videoId = url.split('share/')[1]?.split('?')[0];
    } else if (url.includes('embed/')) {
      return url;
    }
    return videoId ? `https://www.loom.com/embed/${videoId}` : url;
  }

  return url;
}

export default function TutorialsPage() {
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('todos');

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tutorials')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar tutoriais:', error);
    } else {
      setTutorials(data || []);
    }
    setLoading(false);
  };

  const categories = ['todos', ...new Set(tutorials.map(t => t.category || 'geral'))];

  const filteredTutorials = activeCategory === 'todos'
    ? tutorials
    : tutorials.filter(t => (t.category || 'geral') === activeCategory);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Carregando vídeos de ajuda...
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            🎥 Central de Ajuda e Tutoriais
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Aprenda a configurar e extrair o máximo do seu Nexale CRM passo a passo.
          </p>
        </div>

        {/* Filtros de Categorias */}
        {tutorials.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white shadow-indigo-200/50'
                    : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200/60'
                }`}
              >
                {cat === 'todos' ? 'Ver Todos' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid de Vídeos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutorials.map(t => {
            const embedUrl = getEmbedUrl(t.video_url);
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-100/50 overflow-hidden hover:shadow-md transition-all flex flex-col">
                {/* Player de Vídeo Embutido */}
                <div className="relative aspect-video bg-slate-900 w-full border-b border-slate-100">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="absolute inset-0 w-full h-full"
                      frameBorder="0"
                      allowFullScreen
                      title={t.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    ></iframe>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                      Vídeo indisponível
                    </div>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-3 border border-slate-200/50">
                      {t.category || 'geral'}
                    </span>
                    <h3 className="text-base font-black text-slate-800 tracking-tight leading-snug">
                      {t.title}
                    </h3>
                    {t.description && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
                    Nexale CRM • Tutorial Oficial
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {tutorials.length === 0 && (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/60 shadow-sm">
            <span className="text-4xl mb-3 block">📺</span>
            <h3 className="text-slate-800 font-bold text-sm">Nenhum tutorial disponível ainda</h3>
            <p className="text-slate-400 text-xs mt-1">Nossa equipe de suporte está preparando os vídeos de boas-vindas!</p>
          </div>
        )}
      </div>
    </div>
  );
}
