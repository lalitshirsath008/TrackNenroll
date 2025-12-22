
import { User, StudentLead, Message, UserRole } from '../types';

// Root API endpoint for Localhost Server
const API_BASE = 'http://localhost:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('tracknenroll_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const api = {
  // Auth
  login: async (email: string, pass: string): Promise<{user: User, token: string}> => {
    // In actual use, uncomment the fetch:
    /*
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
    */
    
    // Fallback for immediate browser simulation
    return new Promise((resolve) => {
      setTimeout(() => {
        // Fix: Added missing properties 'isApproved' and 'registrationStatus' to satisfy the User interface requirements for the mock demo user
        resolve({
          user: { 
            id: 'u1', 
            name: 'Super Admin Demo', 
            email, 
            role: UserRole.SUPER_ADMIN,
            isApproved: true,
            registrationStatus: 'approved'
          },
          token: 'mock_jwt_sqlite_token'
        });
      }, 500);
    });
  },

  // Leads (SQLite Backed)
  getLeads: async (): Promise<StudentLead[]> => {
    // This calls the SQLite 'SELECT' endpoint
    const res = await fetch(`${API_BASE}/leads`, { headers: getHeaders() });
    return res.ok ? res.json() : [];
  },

  assignLeads: async (leadIds: string[], assigneeId: string, role: string) => {
    // This calls the SQLite 'UPDATE' endpoint
    return fetch(`${API_BASE}/leads/assign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ leadIds, assigneeId, role })
    });
  },

  updateLeadStatus: async (id: string, updates: Partial<StudentLead>) => {
    return fetch(`${API_BASE}/leads/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
  },

  // Messaging (SQLite Backed)
  getMessages: async (partnerId: string): Promise<Message[]> => {
    const res = await fetch(`${API_BASE}/messages/${partnerId}`, { headers: getHeaders() });
    return res.ok ? res.json() : [];
  }
};
