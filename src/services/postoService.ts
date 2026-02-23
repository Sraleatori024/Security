
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { Posto } from '../types';

const COLLECTION = 'postos';

export const postoService = {
  async createPosto(data: Omit<Posto, 'id' | 'qrUrl'>) {
    // Generate a unique ID first to link the QR code
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      dataCadastro: new Date().toISOString()
    });

    // Update with QR URL (using a public QR generator for the ID)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${docRef.id}`;
    await updateDoc(docRef, { qrUrl });
    
    return docRef.id;
  },

  async updatePosto(id: string, data: Partial<Posto>) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, data);
  },

  async deletePosto(id: string) {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },

  subscribeToPostos(callback: (postos: Posto[]) => void) {
    const q = query(collection(db, COLLECTION), orderBy('dataCadastro', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const postos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Posto[];
      callback(postos);
    });
  }
};
