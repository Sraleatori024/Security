
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { guardiaoService } from './guardiaoService';
import { Guardiao } from '../types';

export const authService = {
  async login(email: string, pass: string): Promise<Guardiao> {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const guardiao = await guardiaoService.getGuardiao(userCredential.user.uid);
    if (!guardiao) throw new Error("Perfil não encontrado no Firestore.");
    return guardiao;
  },

  async logout() {
    await signOut(auth);
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
};
