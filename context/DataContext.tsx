
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StudentLead, Message, User, LeadStage } from '../types.ts';
import { MOCK_LEADS, MOCK_USERS } from '../constants.tsx';

interface DataContextType {
  leads: StudentLead[];
  messages: Message[];
  users: User[];
  loading: boolean;
  addLead: (lead: StudentLead) => void;
  updateLead: (id: string, updates: Partial<StudentLead>) => Promise<void>;
  assignLeadsToHOD: (leadIds: string[], hodId: string) => Promise<void>;
  assignLeadsToTeacher: (leadIds: string[], teacherId: string) => Promise<void>;
  sendMessage: (msg: Message) => Promise<void>;
  registerUser: (user: User) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  handleUserApproval: (userId: string, approverId: string, status: 'approved' | 'rejected') => void;
  refreshData: () => Promise<void>;
  markMessagesAsSeen: (partnerId: string, currentUserId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('tracknenroll_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  const [leads, setLeads] = useState<StudentLead[]>(() => {
    const saved = localStorage.getItem('tracknenroll_leads');
    return saved ? JSON.parse(saved) : MOCK_LEADS;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('tracknenroll_messages');
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tracknenroll_messages' && e.newValue) setMessages(JSON.parse(e.newValue));
      if (e.key === 'tracknenroll_leads' && e.newValue) setLeads(JSON.parse(e.newValue));
      if (e.key === 'tracknenroll_users' && e.newValue) setUsers(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => { localStorage.setItem('tracknenroll_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('tracknenroll_leads', JSON.stringify(leads)); }, [leads]);
  useEffect(() => { localStorage.setItem('tracknenroll_messages', JSON.stringify(messages)); }, [messages]);

  const refreshData = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
  };

  const addLead = (lead: StudentLead) => {
    setLeads(prev => [lead, ...prev]);
  };

  const updateLead = async (id: string, updates: Partial<StudentLead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const registerUser = (user: User) => {
    setUsers(prev => [...prev, { ...user, isApproved: false, registrationStatus: 'pending' }]);
  };

  const addUser = (user: User) => {
    setUsers(prev => [...prev, { ...user, isApproved: true, registrationStatus: 'approved' }]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleUserApproval = (userId: string, approverId: string, status: 'approved' | 'rejected') => {
    setUsers(prev => prev.map(u => u.id === userId ? {
      ...u,
      registrationStatus: status,
      isApproved: status === 'approved',
      approvedBy: approverId,
      approvalDate: new Date().toLocaleString()
    } : u));
  };

  const assignLeadsToHOD = async (leadIds: string[], hodId: string) => {
    setLoading(true);
    const hod = users.find(u => u.id === hodId);
    setLeads(prev => prev.map(l => 
      leadIds.includes(l.id) 
        ? { ...l, assignedToHOD: hodId, department: hod?.department || l.department, stage: LeadStage.ASSIGNED } 
        : l
    ));
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
  };

  const assignLeadsToTeacher = async (leadIds: string[], teacherId: string) => {
    setLoading(true);
    setLeads(prev => prev.map(l => 
      leadIds.includes(l.id) 
        ? { ...l, assignedToTeacher: teacherId, stage: LeadStage.ASSIGNED } 
        : l
    ));
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
  };

  const sendMessage = async (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const markMessagesAsSeen = useCallback((partnerId: string, currentUserId: string) => {
    setMessages(prev => prev.map(m => 
      (m.senderId === partnerId && m.receiverId === currentUserId && m.status !== 'seen')
        ? { ...m, status: 'seen' as const }
        : m
    ));
  }, []);

  return (
    <DataContext.Provider value={{ 
      leads, messages, users, loading,
      addLead, updateLead, assignLeadsToHOD, assignLeadsToTeacher, 
      sendMessage, registerUser, addUser, updateUser, deleteUser, handleUserApproval,
      refreshData, markMessagesAsSeen
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
