import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/errorHandler";

export interface Category {
  id: string;
  name: string;
  order: number;
  department?: 'cafe' | 'atari';
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  costPrice: number;
  available: boolean;
  imageUrl?: string;
}

export interface Table {
  id: string;
  name: string;
  status: "free" | "busy" | "reserved";
  department?: 'cafe' | 'atari';
  cartItems?: {
    id: string;
    name: string;
    price: number;
    costPrice: number;
    qty: number;
  }[];
}

export function usePOSData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubs = [
      onSnapshot(query(collection(db, "categories"), orderBy("order")), (snap) => {
        if (!active) return;
        setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, "categories")),

      onSnapshot(collection(db, "menuItems"), (snap) => {
        if (!active) return;
        setMenuItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, "menuItems")),

      onSnapshot(collection(db, "tables"), (snap) => {
        if (!active) return;
        setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, "tables"))
    ];

    setLoading(false);

    return () => {
      active = false;
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  return { categories, menuItems, tables, loading };
}
