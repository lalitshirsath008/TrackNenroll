
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StudentLead, Message, User, LeadStage, SystemLog, UserAction, Department, UserRole } from '../types';
import { db, storage } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface DataContextType {
  leads: StudentLead[];
  messages: Message[];
  users: User[];
  logs: SystemLog[];
  loading: boolean;
  toast: Toast | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  addLead: (lead: StudentLead) => Promise<void>;
  batchAddLeads: (newLeads: StudentLead[], replace: boolean) => Promise<void>;
  updateLead: (id: string, updates: Partial<StudentLead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  assignLeadsToHOD: (leadIds: string[], hodId: string) => Promise<void>;
  assignLeadsToTeacher: (leadIds: string[], teacherId: string) => Promise<void>;
  autoDistributeLeadsToHODs: (leadIds: string[]) => Promise<void>;
  autoDistributeLeadsToTeachers: (leadIds: string[], department: Department) => Promise<void>;
  sendMessage: (msg: Message) => Promise<void>;
  registerUser: (user: User) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  handleUserApproval: (userId: string, approverId: string, status: 'approved' | 'rejected') => Promise<void>;
  markMessagesAsSeen: (partnerId: string, currentUserId: string) => Promise<void>;
  addLog: (userId: string, userName: string, action: UserAction, details: string) => Promise<void>;
  exportSystemData: () => string;
  importSystemData: (content: string) => Promise<boolean>;
  uploadProfileImage: (userId: string, file: File) => Promise<string>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<StudentLead[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

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
        const msgData = snapshot.docs
          .map(doc => ({ ...(doc.data() as Message), id: doc.id }))
          .filter(m => m.text && m.senderId && m.receiverId);
        
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
      const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
      const unsub = onSnapshot(q, (snapshot) => {
        const logData = snapshot.docs.map(doc => doc.data() as SystemLog);
        setLogs(logData);
      }, (error) => {
        console.error("Logs sync error:", error);
      });
      return () => unsub();
    } catch (e) {
      console.error("Failed to setup logs query:", e);
    }
  }, []);

  const uploadProfileImage = async (userId: string, file: File): Promise<string> => {
    const storageRef = ref(storage, `profiles/${userId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const addLead = async (lead: StudentLead) => {
    await setDoc(doc(db, 'leads', lead.id), lead);
    showToast(`Student ${lead.name} has been added to the system.`, 'success');
  };

  const batchAddLeads = async (newLeads: StudentLead[], replace: boolean) => {
    const batch = writeBatch(db);
    newLeads.forEach(lead => {
      batch.set(doc(db, 'leads', lead.id), lead);
    });
    await batch.commit();
    showToast(`Batch Import Success: ${newLeads.length} leads synchronized.`, 'success');
  };

  const updateLead = async (id: string, updates: Partial<StudentLead>) => {
    await setDoc(doc(db, 'leads', id), updates, { merge: true });
  };

  const deleteLead = async (id: string) => {
    await deleteDoc(doc(db, 'leads', id));
    showToast("The student record has been permanently deleted.", 'info');
  };

  const registerUser = async (user: User) => {
    await setDoc(doc(db, 'users', user.id), { ...user, isApproved: false, registrationStatus: 'pending' });
    showToast("Registration successful. Access is pending administrative approval.", 'success');
  };

  const addUser = async (user: User) => {
    await setDoc(doc(db, 'users', user.id), { ...user, isApproved: true, registrationStatus: 'approved' });
    showToast(`Account for ${user.name} created and authorized.`, 'success');
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    await setDoc(doc(db, 'users', id), updates, { merge: true });
    showToast("User profile information has been updated.", 'success');
  };

  const deleteUser = async (userId: string) => {
    await deleteDoc(doc(db, 'users', userId));
    showToast("Staff access and credentials have been revoked.", 'info');
  };

  const handleUserApproval = async (userId: string, approverId: string, status: 'approved' | 'rejected') => {
    await setDoc(doc(db, 'users', userId), {
      registrationStatus: status,
      isApproved: status === 'approved',
      approvedBy: approverId,
      approvalDate: new Date().toISOString()
    }, { merge: true });
    showToast(`The account has been ${status === 'approved' ? 'authorized' : 'rejected'}.`, 'info');
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
    showToast(`${leadIds.length} leads assigned to ${hod?.name}.`, 'success');
  };

  const assignLeadsToTeacher = async (leadIds: string[], teacherId: string) => {
    const teacher = users.find(u => u.id === teacherId);
    const batch = writeBatch(db);
    leadIds.forEach(id => {
      batch.set(doc(db, 'leads', id), {
        assignedToTeacher: teacherId,
        stage: LeadStage.ASSIGNED
      }, { merge: true });
    });
    await batch.commit();
    showToast(`${leadIds.length} leads assigned to faculty member ${teacher?.name}.`, 'success');
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
    showToast(`Automatic distribution of ${leadIds.length} leads completed.`, 'success');
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
    showToast(`Successfully distributed ${leadIds.length} leads to department faculty.`, 'success');
  };

  const sendMessage = async (msg: Message) => {
    await setDoc(doc(db, 'messages', msg.id), msg);
  };

  const markMessagesAsSeen = useCallback(async (partnerId: string, currentUserId: string) => {
    const unseenIds = messages
      .filter(m => m.senderId === partnerId && m.receiverId === currentUserId && m.status !== 'seen')
      .map(m => m.id);

    if (unseenIds.length === 0) return;

    const batch = writeBatch(db);
    unseenIds.forEach(id => {
      batch.update(doc(db, 'messages', id), { status: 'seen' });
    });
    
    try {
      await batch.commit();
    } catch (e) {
      console.debug("Silent failure in message synchronization");
    }
  }, [messages]);

  const addLog = async (userId: string, userName: string, action: UserAction, details: string) => {
    const logId = 'log-' + Date.now();
    await setDoc(doc(db, 'logs', logId), {
      id: logId,
      userId,
      userName,
      action,
      details,
      timestamp: new Date().toISOString()
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
      showToast("Institutional database import successful.", 'success');
      return true;
    } catch (e) {
      showToast("Import failed. Please verify the data format.", 'error');
      return false;
    }
  }, []);

  return (
    <DataContext.Provider value={{ 
      leads, messages, users, logs, loading, toast, showToast, hideToast,
      addLead, batchAddLeads, updateLead, deleteLead, assignLeadsToHOD, assignLeadsToTeacher, 
      autoDistributeLeadsToHODs, autoDistributeLeadsToTeachers,
      sendMessage, registerUser, addUser, updateUser, deleteUser, handleUserApproval,
      markMessagesAsSeen, addLog, exportSystemData, importSystemData, uploadProfileImage
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
