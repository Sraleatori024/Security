
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Ronda } from '../types';

const COLLECTION = 'rondas';

export const rondaService = {
  async startRonda(data: Omit<Ronda, 'id' | 'horarioFim' | 'status'>) {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      horarioInicio: new Date().toISOString(),
      status: 'Online'
    });
    return docRef.id;
  },

  async finishRonda(id: string) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      horarioFim: new Date().toISOString(),
      status: 'Offline'
    });
  },

  async uploadRondaPhoto(rondaId: string, base64Image: string, index: number): Promise<string> {
    const storageRef = ref(storage, `rondas/${rondaId}/photo_${index}_${Date.now()}.jpg`);
    await uploadString(storageRef, base64Image, 'data_url');
    return await getDownloadURL(storageRef);
  },

  async updateRondaPhotos(id: string, photoUrls: string[]) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, { photos: photoUrls });
  },

  subscribeToActiveRondas(callback: (rondas: Ronda[]) => void) {
    const q = query(collection(db, COLLECTION), where("status", "==", "Online"));
    return onSnapshot(q, (snapshot) => {
      const rondas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ronda[];
      callback(rondas);
    });
  },

  subscribeToRondaHistory(guardiaoId: string, callback: (rondas: Ronda[]) => void) {
    const q = query(
      collection(db, COLLECTION), 
      where("guardiaoId", "==", guardiaoId),
      orderBy("horarioInicio", "desc"),
      limit(50)
    );
    return onSnapshot(q, (snapshot) => {
      const rondas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ronda[];
      callback(rondas);
    });
  }
};
