
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Guardiao } from '../types';

const COLLECTION = 'guardioes';

export const guardiaoService = {
  async getGuardiao(id: string): Promise<Guardiao | null> {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Guardiao;
    }
    return null;
  },

  async createGuardiao(id: string, data: Omit<Guardiao, 'id'>) {
    const docRef = doc(db, COLLECTION, id);
    await setDoc(docRef, {
      ...data,
      dataCadastro: new Date().toISOString()
    });
  },

  async updateGuardiao(id: string, data: Partial<Guardiao>) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, data);
  },

  subscribeToGuardioes(callback: (guardioes: Guardiao[]) => void) {
    return onSnapshot(collection(db, COLLECTION), (snapshot) => {
      const guardioes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Guardiao[];
      callback(guardioes);
    });
  },

  async getGuardioesAtivos(): Promise<Guardiao[]> {
    const q = query(collection(db, COLLECTION), where("status", "==", "Ativo"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Guardiao[];
  },

  async getGuardiaoByName(name: string): Promise<Guardiao | null> {
    const q = query(collection(db, COLLECTION), where("nomeCompleto", "==", name));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Guardiao;
  }
};
