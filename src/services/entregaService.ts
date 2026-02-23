
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { Entrega } from '../types';
import { materialService } from './materialService';

const COLLECTION = 'entregas';

export const entregaService = {
  async createEntrega(data: Omit<Entrega, 'id' | 'createdAt'>) {
    // 1. Check stock first (this should be done in UI too, but here for safety)
    // 2. Create the delivery record
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: new Date().toISOString()
    });

    // 3. Update stock automatically if status is 'Entregue'
    if (data.statusEntrega === 'Entregue') {
      await materialService.updateStock(data.materialId, -data.quantidade);
    }

    return docRef.id;
  },

  async registerReturn(id: string, materialId: string, quantity: number, observation?: string) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      statusEntrega: 'Devolvido',
      observacoes: observation ? `Devolução: ${observation}` : 'Devolvido'
    });

    // Repose stock
    await materialService.updateStock(materialId, quantity);
  },

  subscribeToEntregas(callback: (entregas: Entrega[]) => void) {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const entregas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Entrega[];
      callback(entregas);
    });
  },

  subscribeToGuardiaoEntregas(guardiaoId: string, callback: (entregas: Entrega[]) => void) {
    const q = query(
      collection(db, COLLECTION), 
      where("guardiaoId", "==", guardiaoId),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const entregas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Entrega[];
      callback(entregas);
    });
  }
};
