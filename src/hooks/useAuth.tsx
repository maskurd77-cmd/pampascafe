import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import toast from "react-hot-toast";
import { handleFirestoreError, OperationType } from "../lib/errorHandler";

interface UserProfile {
  uid: string;
  email: string | null;
  role: "admin" | "staff";
  name: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // First user becomes admin automatically if users collection might be empty, 
            // else they shouldn't just be able to login if they aren't registered. 
            // For Pampas Cafe, we'll set any newly authenticated user with no profile to admin initially 
            // so the owner can get in, then lock it down in production.
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: "admin", 
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Admin User",
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, "users");
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (error) => {
       console.error("Auth Error:", error);
       toast.error("کێشە لە چوونەژوورەوە هەیە");
       setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success("چوویتە دەرەوە");
    } catch (error) {
      toast.error("هەڵەیەک ڕوویدا لە چوونە دەرەوە");
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
