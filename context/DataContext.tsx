
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StudentLead, Message, User, LeadStage, SystemLog, UserAction, Department, UserRole } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch
} from 'firebase/firestore';

interface DataContextType {
  leads: StudentLead[];
  messages: Message[];
  users: User[];
  logs: SystemLog[];
  loading: boolean;
  addLead: (lead: StudentLead) => Promise<void>;
  batchAddLeads: (newLeads: StudentLead[], replace: boolean) => Promise<void>;
  updateLead: (id: string, updates: Partial<StudentLead>) => Promise<void>;
  assignLeadsToHOD: (leadIds: string[], hodId: string) => Promise<void>;
  assignLeadsToTeacher: (leadIds: string[], teacherId: string) => Promise<void>;
  autoDistributeLeadsToHODs: (leadIds: string[]) => Promise<void>;
  autoDistributeLeadsToTeachers: (leadIds: string[], department: Department) => Promise<void>;
  sendMessage: (msg: Message) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  registerUser: (user: User) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  handleUserApproval: (userId: string, approverId: string, status: 'approved' | 'rejected') => Promise<void>;
  markMessagesAsSeen: (partnerId: string, currentUserId: string) => Promise<void>;
  addLog: (userId: string, userName: string, action: UserAction, details: string) => Promise<void>;
  exportSystemData: () => string;
  importSystemData: (content: string) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<StudentLead[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => doc.data() as User);
      setUsers(userData);
      setLoading(false);
    }, (error) => {
      console.error("Users sync error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'leads'), (snapshot) => {
      const leadData = snapshot.docs.map(doc => doc.data() as StudentLead);
      setLeads(leadData);
    }, (error) => {
      console.error("Leads sync error:", error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const msgData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id // Map Firestore doc ID to message ID
        } as Message));
        setMessages(msgData);
      }, (error) => {
        console.error("Messages sync error:", error);
      });
      return () => unsub();
    } catch (e) {
      console.error("Failed to setup messages query:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const logData = snapshot.docs.map(doc => doc.data() as SystemLog);
        setLogs(logData.slice(0, 100));
      }, (error) => {
        console.error("Logs sync error:", error);
      });
      return () => unsub();
    } catch (e) {
      console.error("Failed to setup logs query:", e);
    }
  }, []);

  const addLead = async (lead: StudentLead) => {
    await setDoc(doc(db, 'leads', lead.id), lead);
  };

  const batchAddLeads = async (newLeads: StudentLead[], replace: boolean) => {
    const batch = writeBatch(db);
    newLeads.forEach(lead => {
      batch.set(doc(db, 'leads', lead.id), lead);
    });
    await batch.commit();
  };

  const updateLead = async (id: string, updates: Partial<StudentLead>) => {
    await setDoc(doc(db, 'leads', id), updates, { merge: true });
  };

  const registerUser = async (user: User) => {
    await setDoc(doc(db, 'users', user.id), { ...user, isApproved: false, registrationStatus: 'pending' });
  };

  const addUser = async (user: User) => {
    await setDoc(doc(db, 'users', user.id), { ...user, isApproved: true, registrationStatus: 'approved' });
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    await setDoc(doc(db, 'users', id), updates, { merge: true });
  };

  const deleteUser = async (userId: string) => {
    await deleteDoc(doc(db, 'users', userId));
  };

  const handleUserApproval = async (userId: string, approverId: string, status: 'approved' | 'rejected') => {
    await setDoc(doc(db, 'users', userId), {
      registrationStatus: status,
      isApproved: status === 'approved',
      approvedBy: approverId,
      approvalDate: new Date().toLocaleString()
    }, { merge: true });
  };

  const assignLeadsToHOD = async (leadIds: string[], hodId: string) => {
    const hod = users.find(u => u.id === hodId);
    const batch = writeBatch(db);
    leadIds.forEach(id => {
      batch.set(doc(db, 'leads', id), {
        assignedToHOD: hodId,
        department: hod?.department || Department.IT,
        stage: LeadStage.ASSIGNED
      }, { merge: true });
    });
    await batch.commit();
  };

  const assignLeadsToTeacher = async (leadIds: string[], teacherId: string) => {
    const batch = writeBatch(db);
    leadIds.forEach(id => {
      batch.set(doc(db, 'leads', id), {
        assignedToTeacher: teacherId,
        stage: LeadStage.ASSIGNED
      }, { merge: true });
    });
    await batch.commit();
  };

  const autoDistributeLeadsToHODs = async (leadIds: string[]) => {
    const approvedHODs = users.filter(u => u.role === UserRole.HOD && u.isApproved);
    if (approvedHODs.length === 0 || leadIds.length === 0) return;

    const batch = writeBatch(db);
    leadIds.forEach((id, index) => {
      const assignedHOD = approvedHODs[index % approvedHODs.length];
      batch.set(doc(db, 'leads', id), {
        assignedToHOD: assignedHOD.id,
        department: assignedHOD.department || Department.IT,
        stage: LeadStage.ASSIGNED
      }, { merge: true });
    });
    await batch.commit();
  };

  const autoDistributeLeadsToTeachers = async (leadIds: string[], department: Department) => {
    const deptTeachers = users.filter(u => u.role === UserRole.TEACHER && u.department === department && u.isApproved);
    if (deptTeachers.length === 0 || leadIds.length === 0) return;

    const batch = writeBatch(db);
    leadIds.forEach((id, index) => {
      const assignedTeacher = deptTeachers[index % deptTeachers.length];
      batch.set(doc(db, 'leads', id), {
        assignedToTeacher: assignedTeacher.id,
        stage: LeadStage.ASSIGNED
      }, { merge: true });
    });
    await batch.commit();
  };

  const sendMessage = async (msg: Message) => {
    await setDoc(doc(db, 'messages', msg.id), msg);
  };

  const deleteMessage = async (messageId: string) => {
    if (!messageId) return;
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  };

  const markMessagesAsSeen = useCallback(async (partnerId: string, currentUserId: string) => {
    const unseenIds = messages
      .filter(m => m.senderId === partnerId && m.receiverId === currentUserId && m.status !== 'seen')
      .map(m => m.id);

    if (unseenIds.length === 0) return;

    const batch = writeBatch(db);
    unseenIds.forEach(id => {
      batch.set(doc(db, 'messages', id), { status: 'seen' }, { merge: true });
    });
    await batch.commit();
  }, [messages]);

  const addLog = async (userId: string, userName: string, action: UserAction, details: string) => {
    const logId = 'log-' + Date.now();
    await setDoc(doc(db, 'logs', logId), {
      id: logId,
      userId,
      userName,
      action,
      details,
      timestamp: new Date().toLocaleString()
    });
  };

  const exportSystemData = useCallback(() => {
    return JSON.stringify({ users, leads, messages, logs });
  }, [users, leads, messages, logs]);

  const importSystemData = useCallback(async (content: string) => {
    try {
      const data = JSON.parse(content);
      const batch = writeBatch(db);
      if (data.users) data.users.forEach((u: any) => batch.set(doc(db, 'users', u.id), u));
      if (data.leads) data.leads.forEach((l: any) => batch.set(doc(db, 'leads', l.id), l));
      if (data.messages) data.messages.forEach((m: any) => batch.set(doc(db, 'messages', m.id || `m-${Math.random()}`), m));
      if (data.logs) data.logs.forEach((log: any) => batch.set(doc(db, 'logs', log.id || `l-${Math.random()}`), log));
      await batch.commit();
      return true;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
    }
  }, []);

  return (
    <DataContext.Provider value={{ 
      leads, messages, users, logs, loading,
      addLead, batchAddLeads, updateLead, assignLeadsToHOD, assignLeadsToTeacher, 
      autoDistributeLeadsToHODs, autoDistributeLeadsToTeachers,
      sendMessage, deleteMessage, registerUser, addUser, updateUser, deleteUser, handleUserApproval,
      markMessagesAsSeen, addLog, exportSystemData, importSystemData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
