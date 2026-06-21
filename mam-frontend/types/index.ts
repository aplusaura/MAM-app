// Auth
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Me {
  id: number;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  full_name: string | null;
  permissions: string[];
  role_slug?: string;
  employee_id?: number;
}

// Departments and Roles
export interface Department { id: number; name: string; description?: string; }
export interface Role { id: number; name: string; slug: string; description?: string; }

// Employees
export interface Employee {
  id: number;
  user_id?: number;
  full_name: string;
  job_title?: string;
  status: string;
  availability_status: string;
  profile_image_url?: string | null;
  department_id?: number;
  role_id?: number;
  phone?: string;
  employment_type?: string;
  skills?: string[];
}

export interface EmployeeCreated {
  id: number;
  full_name: string;
  job_title?: string;
  status: string;
  generated_email: string | null;
  generated_password: string | null;
}

// Clients
export interface Client {
  id: number;
  client_code?: string;
  logo_url?: string;
  company_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  industry?: string;
  service_type?: string;
  status: string;
  monthly_value?: number;
  renewal_date?: string;
  address?: string;
  package_type?: string;
  contract_type?: string;
  start_date?: string;
  contract_value?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Leads
export interface Lead {
  id: number;
  lead_name: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  stage: string;
  interested_service?: string;
  expected_budget?: number;
  assigned_to?: number;
  next_followup_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Projects
export interface Project {
  id: number;
  name: string;
  status: string;
  priority: string;
  progress_percent: number;
  client_id?: number;
  due_date?: string;
  start_date?: string;
  description?: string;
  project_type?: string;
  budget?: number;
  created_at?: string;
}

// Milestones
export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Tasks
export interface Task {
  id: number;
  task_code?: string;
  title: string;
  status: string;
  priority: string;
  assigned_to?: number;
  assigned_by?: number;
  due_date?: string;
  start_date?: string;
  created_at?: string;
  updated_at?: string;
  project_id?: number;
  client_id?: number;
  department_id?: number;
  task_type?: string;
  description?: string;
  estimated_hours?: number;
  parent_task_id?: number;
  revision_notes?: string;
  revision_count?: number;
  revision_type?: string; // "internal" | "external"
  final_link?: string;
  team_leader_name?: string;
  account_manager_name?: string;
}

// Task comment and history (for detail page)
export interface TaskComment {
  id: number;
  task_id: number;
  user_id?: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskChecklistItem {
  id: number;
  label: string;
  is_done: boolean;
  order: number;
}

export interface TaskStatusHistoryItem {
  id: number;
  from_status?: string;
  to_status: string;
  changed_at: string;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  uploaded_by?: number;
  original_filename: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

export interface TaskDetail extends Task {
  comments: TaskComment[];
  checklists: TaskChecklistItem[];
  status_history: TaskStatusHistoryItem[];
  attachments: TaskAttachment[];
  actual_hours?: number;
  created_at?: string;
  updated_at?: string;
}

// Shooting Brief
export interface ShootingBrief {
  id: number;
  task_id: number;
  what_was_shot?: string;
  location?: string;
  shoot_date?: string;
  crew_present?: string;
  what_happened?: string;
  raw_footage_notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

// Finance
export interface Invoice {
  id: number;
  invoice_number: string;
  client_id?: number;
  payment_status: string;
  issue_date: string;
  due_date?: string;
  subtotal: number;
  total_amount: number;
  amount_paid: number;
  tax_amount?: number;
  discount_amount?: number;
  notes?: string;
}

export interface InvoiceItem { description: string; quantity: number; unit_price: number; }

// Reports
export interface RevenueMonth { month: number; total: number; }
export interface TaskStats { total: number; by_status: Record<string, number>; overdue: number; }
export interface ProjectStats {
  total: number;
  by_status: Record<string, number>;
  active_clients_this_month?: number;
  leads_this_month?: number;
  won_leads_this_month?: number;
}

// AI
export interface WeeklyReport {
  period: { from: string; to: string };
  tasks: { completed_this_week: number; currently_overdue: number };
  projects: { active: number; completed_this_week: number };
  finance: { invoices_sent?: number; payments_received?: number; expenses_total?: number; net?: number; revenue_this_week?: number; invoices_issued_this_week?: number; };
  employee_workload?: unknown;
  leads?: unknown;
}

export interface EmployeeLoad {
  employee_id: number;
  full_name: string;
  availability_status: string;
  open_task_count: number;
  load_level: string;
}

export interface WorkloadReport {
  summary: { total_active_employees: number; average_open_tasks_per_employee: number; overloaded_count: number; available_count: number; };
  employee_loads: EmployeeLoad[];
  overloaded_employees: EmployeeLoad[];
  suggestions: string[];
}

export interface DelayReport {
  generated_at: string;
  at_risk_projects: { project_id: number; project_name: string; due_date: string; progress_percent: number; status: string; risk_factors: string[]; risk_level: string; }[];
  overdue_tasks: { id: number; title: string; due_date: string; assigned_to?: number; days_overdue: number; }[];
  summary: { projects_at_risk: number; overdue_tasks_count: number; };
}

export interface SearchResult { type: string; id: number; title: string; subtitle?: string; }

// Time Entries
export interface TimeEntry {
  id: number;
  task_id: number;
  user_id?: number;
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  notes?: string;
  created_at: string;
}

// Leave Requests
export interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  status: string;
  reviewed_by?: number;
  created_at: string;
}

// Work Sessions
export interface WorkSession {
  id: number;
  employee_id: number;
  date: string;
  clock_in: string;
  clock_out?: string;
  total_hours?: number;
}

// Employee Evaluations
export interface EmployeeEvaluation {
  id: number;
  employee_id: number;
  evaluated_by?: number;
  period_month: number;
  period_year: number;
  score: number;
  notes?: string;
  evaluation_type: string;
  created_at: string;
}

// Direct Messages
export interface DirectMessage {
  id: number;
  from_user_id: number;
  to_user_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partner_id: number;
  last_message: string;
  last_at: string;
  unread: number;
}

// Activity Logs
export interface ActivityLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  ip_address?: string;
  created_at: string;
}

// Expense
export interface Expense {
  id: number;
  title: string;
  category?: string;
  amount: number;
  expense_date?: string;
  notes?: string;
  client_id?: number;
  project_id?: number;
  created_at?: string;
}

// Notifications
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  body?: string;
  type?: string;
  entity_type?: string;
  entity_id?: number;
  is_read: boolean;
  created_at: string;
}
