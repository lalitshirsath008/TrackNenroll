
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
  SCIENCE_HUMANITIES = 'Science & Humanities',
  AI_ML = 'AI & ML'
}

export enum StudentResponse {
  INTERESTED = 'Interested',
  NOT_INTERESTED = 'Not Interested',
  CONFUSED = 'Confused',
  GRADE_11_12 = '11th / 12th',
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: Department;
  isApproved: boolean;
  registrationStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: string;
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
  callDuration?: number; // Duration in seconds to prevent fake reporting
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'seen';
}
