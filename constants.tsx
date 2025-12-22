
import { UserRole, Department, StudentLead, User, LeadStage } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Dr. Principal Mehta', email: 'principal@college.edu', role: UserRole.SUPER_ADMIN, isApproved: true, registrationStatus: 'approved' },
  { id: 'u2', name: 'Mrs. Admin Sharma', email: 'admin@college.edu', role: UserRole.ADMIN, isApproved: true, registrationStatus: 'approved' },
  { id: 'u3', name: 'Prof. Patil', email: 'patil.hod@it.edu', role: UserRole.HOD, department: Department.IT, isApproved: true, registrationStatus: 'approved' },
  { id: 'u4', name: 'Ms. Kulkarni', email: 'kulkarni@it.edu', role: UserRole.TEACHER, department: Department.IT, isApproved: true, registrationStatus: 'approved' },
  { id: 'u5', name: 'Mr. Deshmukh', email: 'deshmukh@it.edu', role: UserRole.TEACHER, department: Department.IT, isApproved: true, registrationStatus: 'approved' },
];

export const MOCK_LEADS: StudentLead[] = [
  { id: 'l1', name: 'Rahul Varma', phone: '+919876543210', sourceFile: 'HSC_Leads_March.xlsx', department: Department.IT, stage: LeadStage.ASSIGNED, callVerified: false, assignedToTeacher: 'u4' },
  { id: 'l2', name: 'Sneha Gupta', phone: '+919876543211', sourceFile: 'HSC_Leads_March.xlsx', department: Department.IT, stage: LeadStage.FORWARDED, callVerified: true, assignedToTeacher: 'u4' },
  { id: 'l3', name: 'Amit Singh', phone: '+919876543212', sourceFile: 'SSC_Leads_April.xlsx', department: Department.IT, stage: LeadStage.UNASSIGNED, callVerified: false },
  { id: 'l4', name: 'Priya Mani', phone: '+919876543213', sourceFile: 'HSC_Leads_March.xlsx', department: Department.IT, stage: LeadStage.ASSIGNED, callVerified: false, assignedToTeacher: 'u4' },
];
