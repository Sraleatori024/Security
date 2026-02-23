
import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, Printer, 
  Trash2, Edit2, CheckCircle2, XCircle, 
  AlertCircle, History, PackagePlus, 
  TrendingDown, ArrowLeft, Download,
  User, MapPin, Calendar, FileText,
  RotateCcw, CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Material, Entrega, Guardiao, Posto } from '../../types';
import { materialService } from '../../services/materialService';
import { entregaService } from '../../services/entregaService';
import { guardiaoService } from '../../services/guardiaoService';
import { postoService } from '../../services/postoService';
import SignatureCanvas from '../SignatureCanvas';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const UniformsMaterialsModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'ENTREGA' | 'LISTAGEM' | 'ESTOQUE' | 'DEVOLUCOES'>('ESTOQUE');
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [guardioes, setGuardioes] = useState<Guardiao[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [pendingEntrega, setPendingEntrega] = useState<any>(null);

  useEffect(() => {
    const unsubMateriais = materialService.subscribeToMateriais(setMateriais);
    const unsubEntregas = entregaService.subscribeToEntregas(setEntregas);
    const unsubGuardioes = guardiaoService.subscribeToGuardioes(setGuardioes);
    const unsubPostos = postoService.subscribeToPostos(setPostos);

    return () => {
      unsubMateriais();
      unsubEntregas();
      unsubGuardioes();
      unsubPostos();
    };
  }, []);

  const handleCreateEntrega = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const materialId = fd.get('materialId') as string;
    const guardiaoId = fd.get('guardiaoId') as string;
    const postoId = fd.get('postoId') as string;
    const quantidade = parseInt(fd.get('quantidade') as string);
    
    const material = materiais.find(m => m.id === materialId);
    const guardiao = guardioes.find(g => g.id === guardiaoId);
    const posto = postos.find(p => p.id === postoId);

    if (!material || !guardiao || !posto) return;

    if (material.quantidadeDisponivel < quantidade) {
      alert("Estoque insuficiente!");
      return;
    }

    setPendingEntrega({
      guardiaoId,
      guardiaoNome: guardiao.nomeCompleto,
      guardiaoQRA: guardiao.QRA,
      postoId,
      postoNome: posto.nomePosto,
      materialId,
      materialNome: material.nomeMaterial,
      quantidade,
      statusEntrega: 'Entregue',
      dataEntrega: fd.get('dataEntrega') || new Date().toISOString(),
      entreguePor: 'Administrador', // Should come from auth context
      responsavelRecebimento: guardiao.nomeCompleto,
      observacoes: fd.get('observacoes') as string
    });
    
    setShowSignature(true);
  };

  const finalizeEntrega = async (signature: string) => {
    try {
      await entregaService.createEntrega({
        ...pendingEntrega,
        assinatura: signature
      });
      alert("Entrega registrada com sucesso!");
      setActiveSubTab('LISTAGEM');
      setShowSignature(false);
      setPendingEntrega(null);
    } catch (err) {
      alert("Erro ao registrar entrega.");
    }
  };

  const generateTermoPDF = (entrega: Entrega) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("GuardSystem Pro", pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text("TERMO DE ENTREGA DE UNIFORME / MATERIAL", pageWidth / 2, 30, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 35, pageWidth - 20, 35);

    // Content
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    
    const startY = 50;
    const lineSpacing = 10;

    doc.text(`Guardião: ${entrega.guardiaoNome} ${entrega.guardiaoQRA ? `(QRA: ${entrega.guardiaoQRA})` : ''}`, 20, startY);
    doc.text(`Unidade/Posto: ${entrega.postoNome}`, 20, startY + lineSpacing);
    doc.text(`Item: ${entrega.materialNome}`, 20, startY + lineSpacing * 2);
    doc.text(`Quantidade: ${entrega.quantidade}`, 20, startY + lineSpacing * 3);
    doc.text(`Data: ${new Date(entrega.dataEntrega).toLocaleDateString('pt-BR')}`, 20, startY + lineSpacing * 4);
    doc.text(`Responsável pela Entrega: ${entrega.entreguePor}`, 20, startY + lineSpacing * 5);

    // Signature Area
    const sigY = 150;
    if (entrega.assinatura) {
      doc.addImage(entrega.assinatura, 'PNG', 20, sigY - 30, 60, 30);
    }
    doc.line(20, sigY, 80, sigY);
    doc.text("Assinatura do Guardião", 20, sigY + 5);

    doc.line(pageWidth - 80, sigY, pageWidth - 20, sigY);
    doc.text("Assinatura da Empresa", pageWidth - 80, sigY + 5);

    // Footer
    doc.setFontSize(8);
    doc.text(`Documento emitido em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 280, { align: 'center' });

    doc.save(`Termo_${entrega.guardiaoNome}_${entrega.materialNome}.pdf`);
  };

  const generateRelatorioMensal = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date();
    const mes = now.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    const ano = now.getFullYear();

    doc.setFontSize(20);
    doc.text(`RELATÓRIO MENSAL DE ENTREGAS - ${mes} / ${ano}`, pageWidth / 2, 20, { align: 'center' });
    
    const tableData = entregas.map(e => [
      new Date(e.dataEntrega).toLocaleDateString('pt-BR'),
      e.guardiaoNome,
      e.postoNome,
      e.materialNome,
      e.quantidade,
      e.statusEntrega
    ]);

    (doc as any).autoTable({
      startY: 30,
      head: [['Data', 'Guardião', 'Posto', 'Item', 'Qtd', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] }
    });

    doc.save(`Relatorio_Mensal_${mes}_${ano}.pdf`);
  };

  return (
    <div className="space-y-8">
      {/* Sub-Navigation */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-100 rounded-[2rem] w-fit">
        <SubNavItem active={activeSubTab === 'ESTOQUE'} onClick={() => setActiveSubTab('ESTOQUE')} icon={<Package />} label="Estoque" />
        <SubNavItem active={activeSubTab === 'ENTREGA'} onClick={() => setActiveSubTab('ENTREGA')} icon={<PackagePlus />} label="Nova Entrega" />
        <SubNavItem active={activeSubTab === 'LISTAGEM'} onClick={() => setActiveSubTab('LISTAGEM')} icon={<History />} label="Listagem" />
        <SubNavItem active={activeSubTab === 'DEVOLUCOES'} onClick={() => setActiveSubTab('DEVOLUCOES')} icon={<RotateCcw />} label="Devoluções" />
        <button 
          onClick={generateRelatorioMensal}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs transition-all text-slate-400 hover:text-blue-600"
        >
          <FileText size={14} /> <span>Relatório Mensal</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'ESTOQUE' && (
          <motion.div 
            key="estoque"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Controle de Estoque</h3>
              <button 
                onClick={() => { setEditingMaterial(null); setIsModalOpen(true); }}
                className="px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Plus size={18} /> Adicionar Item
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="p-6">Item</th>
                    <th>Tipo</th>
                    <th>Disponível</th>
                    <th>Mínimo</th>
                    <th>Status</th>
                    <th className="p-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {materiais.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6">
                        <p className="font-bold text-slate-900">{item.nomeMaterial}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{item.descricao}</p>
                      </td>
                      <td>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${item.tipo === 'Uniforme' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="font-black text-slate-900">{item.quantidadeDisponivel}</td>
                      <td className="text-slate-400 font-bold">{item.quantidadeMinima}</td>
                      <td>
                        {item.quantidadeDisponivel <= item.quantidadeMinima ? (
                          <span className="flex items-center gap-1 text-red-600 font-black text-[9px] uppercase">
                            <TrendingDown size={12} /> Estoque Baixo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 font-black text-[9px] uppercase">
                            <CheckCircle2 size={12} /> Normal
                          </span>
                        )}
                      </td>
                      <td className="p-6 text-right">
                        <button 
                          onClick={() => { setEditingMaterial(item); setIsModalOpen(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'ENTREGA' && (
          <motion.div 
            key="entrega"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
              <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <PackagePlus className="text-blue-600" /> Registrar Nova Entrega
              </h3>
              
              <form onSubmit={handleCreateEntrega} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Guardião</label>
                    <select required name="guardiaoId" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold">
                      <option value="">Selecionar Guardião</option>
                      {guardioes.map(g => (
                        <option key={g.id} value={g.id}>{g.nomeCompleto} {g.QRA ? `(${g.QRA})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Posto / Unidade</label>
                    <select required name="postoId" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold">
                      <option value="">Selecionar Posto</option>
                      {postos.map(p => (
                        <option key={p.id} value={p.id}>{p.nomePosto}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Item do Estoque</label>
                    <select required name="materialId" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold">
                      <option value="">Selecionar Item</option>
                      {materiais.map(m => (
                        <option key={m.id} value={m.id} disabled={m.quantidadeDisponivel <= 0}>
                          {m.nomeMaterial} ({m.quantidadeDisponivel} disp.)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Quantidade</label>
                    <input required name="quantidade" type="number" min="1" defaultValue="1" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Observações</label>
                  <textarea name="observacoes" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold h-24" />
                </div>

                <button className="w-full py-6 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
                  PROSSEGUIR PARA ASSINATURA
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'LISTAGEM' && (
          <motion.div 
            key="listagem"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="p-6">Guardião</th>
                    <th>Item</th>
                    <th>Qtd</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th className="p-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {entregas.map(entrega => (
                    <tr key={entrega.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6">
                        <p className="font-bold text-slate-900">{entrega.guardiaoNome}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{entrega.postoNome}</p>
                      </td>
                      <td className="font-bold text-slate-700">{entrega.materialNome}</td>
                      <td className="font-black text-slate-900">{entrega.quantidade}</td>
                      <td className="text-xs font-bold text-slate-400">{new Date(entrega.dataEntrega).toLocaleDateString()}</td>
                      <td>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                          entrega.statusEntrega === 'Entregue' ? 'bg-emerald-50 text-emerald-600' : 
                          entrega.statusEntrega === 'Devolvido' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {entrega.statusEntrega}
                        </span>
                      </td>
                      <td className="p-6 text-right space-x-2">
                        <button 
                          onClick={() => generateTermoPDF(entrega)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-all"
                          title="Gerar Termo PDF"
                        >
                          <FileText size={18} />
                        </button>
                        {entrega.statusEntrega === 'Entregue' && (
                          <button 
                            onClick={() => {
                              if (confirm("Confirmar devolução deste item ao estoque?")) {
                                entregaService.registerReturn(entrega.id, entrega.materialId, entrega.quantidade);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-amber-600 transition-all"
                            title="Registrar Devolução"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signature Modal */}
      <AnimatePresence>
        {showSignature && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl space-y-8"
            >
              <div className="text-center">
                <h3 className="text-2xl font-black text-slate-900">Assinatura do Guardião</h3>
                <p className="text-slate-500 text-sm mt-2">Confirme o recebimento do material abaixo</p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm">
                <p className="font-bold text-slate-700">{pendingEntrega?.materialNome}</p>
                <p className="text-slate-500">Quantidade: {pendingEntrega?.quantidade}</p>
              </div>

              <SignatureCanvas onSave={finalizeEntrega} onClear={() => {}} />
              
              <button 
                onClick={() => { setShowSignature(false); setPendingEntrega(null); }}
                className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600"
              >
                Cancelar Operação
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Material Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">
                  {editingMaterial ? 'Editar Item' : 'Novo Item Estoque'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><XCircle /></button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const data = {
                    nomeMaterial: fd.get('nomeMaterial') as string,
                    tipo: fd.get('tipo') as 'Uniforme' | 'Equipamento',
                    descricao: fd.get('descricao') as string,
                    quantidadeTotal: parseInt(fd.get('quantidadeTotal') as string),
                    quantidadeDisponivel: parseInt(fd.get('quantidadeTotal') as string), // Initial available = total
                    quantidadeMinima: parseInt(fd.get('quantidadeMinima') as string),
                  };

                  try {
                    if (editingMaterial) {
                      await materialService.updateMaterial(editingMaterial.id, data);
                    } else {
                      await materialService.createMaterial(data);
                    }
                    setIsModalOpen(false);
                  } catch (err) {
                    alert("Erro ao salvar item.");
                  }
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Item</label>
                  <input required name="nomeMaterial" defaultValue={editingMaterial?.nomeMaterial} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo</label>
                    <select name="tipo" defaultValue={editingMaterial?.tipo} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
                      <option value="Uniforme">Uniforme</option>
                      <option value="Equipamento">Equipamento</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Qtd Total</label>
                    <input required type="number" name="quantidadeTotal" defaultValue={editingMaterial?.quantidadeTotal} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Qtd Mínima (Alerta)</label>
                  <input required type="number" name="quantidadeMinima" defaultValue={editingMaterial?.quantidadeMinima} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                </div>
                <button className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all">
                  SALVAR NO ESTOQUE
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SubNavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs transition-all
      ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}
    `}
  >
    {icon} <span>{label}</span>
  </button>
);

export default UniformsMaterialsModule;
