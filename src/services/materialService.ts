
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot,
  query,
  orderBy,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { Material } from '../types';

const COLLECTION = 'materiais';

export const materialService = {
  async createMaterial(data: Omit<Material, 'id' | 'dataCadastro'>) {
    await addDoc(collection(db, COLLECTION), {
      ...data,
      dataCadastro: new Date().toISOString()
    });
  },

  async updateMaterial(id: string, data: Partial<Material>) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, data);
  },

  async updateStock(id: string, amount: number) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      quantidadeDisponivel: increment(amount)
    });
  },

  subscribeToMateriais(callback: (materiais: Material[]) => void) {
    const q = query(collection(db, COLLECTION), orderBy('nomeMaterial', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const materiais = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];
      callback(materiais);
    });
  }
};
