
export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  HOD = 'HOD',
  TEACHER = 'Teacher'
}

export enum Department {
  MECHANICAL = 'Mechanical Engineering',
  COMPUTER = 'Computer Technology',
  ETC = 'E&TC Engineering',
  IT = 'Information Technology',
  ELECTRICAL = 'Electrical Engineering',
  AI_ML = 'AI & ML'
}

export enum StudentResponse {
  INTERESTED = 'Interested',
  NOT_INTERESTED = 'Not Interested',
  CONFUSED = 'Confused',
  GRADE_11_12 = '11th / 12th',
  NOT_RESPONDING = 'Not Responding',
  NOT_REACHABLE = 'Not Reachable',
  OTHERS = 'Others'
}

export enum LeadStage {
  UNASSIGNED = 'Unassigned',
  ASSIGNED = 'Assigned',
  TARGETED = 'Targeted by College',
  DISCARDED = 'Discarded',
  FORWARDED = 'Forwarded to Sub-Branch',
  NO_ACTION = 'No Action'
}

export interface StaffVerification {
  status: 'none' | 'pending' | 'responded';
  randomLeadId?: string;
  randomLeadName?: string;
  randomLeadPhone?: string;
  actualDuration?: number;
  teacherResponseDuration?: number;
  timestamp?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  department?: Department;
  isApproved: boolean;
  registrationStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: string;
  verification?: StaffVerification;
}

export interface StudentLead {
  id: string;
  name: string;
  phone: string;
  sourceFile: string;
  assignedToHOD?: string;
  assignedToTeacher?: string;
  department: Department;
  response?: StudentResponse;
  stage: LeadStage;
  callVerified: boolean;
  callTimestamp?: string;
  callDuration?: number;
  notes?: string;
  delegatedFromId?: string;
  delegatedFromName?: string;
  delegatedToName?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'seen';
}

export enum UserAction {
  LOGIN = 'Login',
  LOGOUT = 'Logout',
  IMPORT_LEADS = 'Import Leads',
  MANUAL_ADD = 'Manual Entry',
  VERIFICATION = 'Verification'
}

export interface SystemLog {
  id: string;
  userId: string;
  userName: string;
  action: UserAction;
  details: string;
  timestamp: string;
}
