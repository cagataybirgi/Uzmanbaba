import { createContext, useContext, useState, type ReactNode } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountType: "customer" | "professional";
  emailVerified: boolean;
  avatar: string;
  location: string;
  specialty?: string;
  bio?: string;
  joinDate: string;
  rating?: number;
  completedJobs: number;
  pendingJobs: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  pendingEmail: string;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    accountType: "customer" | "professional";
    specialty?: string;
    city?: string;
    bio?: string;
  }) => Promise<void>;
  logout: () => void;
  verifyEmail: (code: string) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");

  const login = async (email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 1200));
    setUser({
      id: "u1",
      name: "Ahmet Kullanıcı",
      email,
      phone: "+90 555 123 45 67",
      accountType: "customer",
      emailVerified: true,
      avatar: DEFAULT_AVATAR,
      location: "Ankara, TR",
      joinDate: "Mayıs 2026",
      completedJobs: 8,
      pendingJobs: 2,
      rating: 4.9,
    });
  };

  const register = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    accountType: "customer" | "professional";
    specialty?: string;
    city?: string;
    bio?: string;
  }) => {
    await new Promise((r) => setTimeout(r, 1400));
    setPendingEmail(data.email);
    setUser({
      id: "u1",
      name: data.name,
      email: data.email,
      phone: data.phone,
      accountType: data.accountType,
      emailVerified: false,
      avatar: DEFAULT_AVATAR,
      location: data.city ? `${data.city}, TR` : "Türkiye",
      specialty: data.specialty,
      bio: data.bio,
      joinDate: "Mayıs 2026",
      completedJobs: 0,
      pendingJobs: 0,
    });
  };

  const logout = () => {
    setUser(null);
    setPendingEmail("");
  };

  const verifyEmail = async (code: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 1000));
    // Accept any 6-digit code (mock)
    if (code.length === 6) {
      setUser((prev) => (prev ? { ...prev, emailVerified: true } : null));
      return true;
    }
    return false;
  };

  const updateProfile = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        pendingEmail,
        login,
        register,
        logout,
        verifyEmail,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
