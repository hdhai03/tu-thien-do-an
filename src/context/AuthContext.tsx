import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase"; // Đảm bảo đã export db từ firebase config

// Interface khớp với dữ liệu bạn đã gửi
interface User {
  id: string;
  UID: string;
  email: string;
  fullName: string;
  gender: number;
  phoneNumber: string;
  avatar: string;
  role: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: { fullName?: string; avatar?: string; phoneNumber?: string; gender?: number }) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hàm bổ trợ để lấy profile từ Firestore
  const fetchUserProfile = async (uid: string) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ưu tiên lấy dữ liệu từ Firestore để có đầy đủ fullName, phoneNumber...
        const profile = await fetchUserProfile(firebaseUser.uid);

        if (profile) {
          setUser(profile);
        } else {
          // Fallback nếu chưa có profile trong Firestore
          const newUser: User = {
            id: firebaseUser.uid,
            UID: firebaseUser.uid,
            fullName: firebaseUser.displayName || "Người dùng",
            email: firebaseUser.email || "",
            avatar: firebaseUser.photoURL || "",
            phoneNumber: "",
            gender: 2,
            role: 1,
          };
          await setDoc(doc(db, "users", firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message || "Đăng nhập thất bại");
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 1. Cập nhật Auth Profile
      await updateProfile(userCredential.user, { displayName: name });

      // 2. Tạo document trong Firestore collection "users"
      const newUser: User = {
        id: uid,
        UID: uid,
        email: email,
        fullName: name,
        avatar: "",
        phoneNumber: "",
        gender: 2,
        role: 1,
      };

      await setDoc(doc(db, "users", uid), newUser);
      setUser(newUser);
    } catch (error: any) {
      throw new Error(error.message || "Đăng ký thất bại");
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const updateUser = async (data: { fullName?: string; avatar?: string; phoneNumber?: string; gender?: number }) => {
    if (!auth.currentUser) throw new Error("Chưa đăng nhập");

    try {
      const uid = auth.currentUser.uid;

      // Cập nhật Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: data.fullName,
        photoURL: data.avatar,
      });

      // Cập nhật Firestore
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { ...data });

      // Cập nhật State local
      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (error: any) {
      throw new Error(error.message || "Cập nhật thất bại");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}