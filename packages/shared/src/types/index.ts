export type TripRole = 'owner' | 'member';

export type ExpenseCategory = 
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'activity'
  | 'shopping'
  | 'groceries'
  | 'flights'
  | 'other';

export type ExpenseSplitType = 'equal' | 'itemized' | 'custom';

export interface PaymentHandles {
  wise?: string;
  revolut?: string;
  duitnow?: string;
  venmo?: string;
  paypal?: string;
  bank_details?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  payment_handles?: PaymentHandles;
  created_at: string;
}

export interface Trip {
  id: string;
  name: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  base_currency: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: TripRole;
  user?: UserProfile;
  joined_at: string;
}

export interface ExpenseModifier {
  name: string;
  amount: number;
}

export interface ExpenseItem {
  id: string;
  expense_id?: string;
  name: string;
  amount: number;
  base_amount?: number;
  quantity: number;
  modifiers?: ExpenseModifier[];
}

export interface ItemAssignment {
  item_id: string;
  user_id: string;
  percentage: number; // 1.0 = 100%, 0.5 = 50%
}

export interface Expense {
  id: string;
  trip_id: string;
  title: string;
  date: string; // ISO 8601
  amount: number;
  currency: string;
  exchange_rate: number; // Multiplier to convert to trip base_currency
  base_currency_amount: number; // amount * exchange_rate
  category: ExpenseCategory;
  split_type?: ExpenseSplitType;
  paid_by_user_id: string;
  image_url?: string;
  notes?: string;
  include_service_charge: boolean;
  service_charge_percent: number;
  include_tax: boolean;
  tax_percent: number;
  split_tax_equally: boolean;
  items?: ExpenseItem[];
  assignments?: ItemAssignment[];
  created_at: string;
  updated_at: string;
}

export interface UserBalance {
  user_id: string;
  total_paid: number;
  total_owed: number;
  net_balance: number; // positive = should receive, negative = owes money
}

export interface SimplifiedDebt {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
}

export interface Settlement {
  id: string;
  trip_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed';
  notes?: string;
  proof_image_url?: string;
  settled_at?: string;
  created_at: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface TripInvitation {
  id: string;
  trip_id: string;
  email: string;
  invited_by: string;
  status: InvitationStatus;
  created_at: string;
  trip?: Trip;
  inviter?: UserProfile;
}

export type NotificationType = 'invite' | 'expense_added' | 'settled' | 'general';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  reference_id?: string;
  message: string;
  read: boolean;
  created_at: string;
}

export type ActivityType = 'expense_added' | 'settled' | 'member_joined';

export interface TripActivity {
  activity_id: string;
  trip_id: string;
  created_at: string;
  activity_type: ActivityType;
  user_id: string;
  amount: number;
  currency: string;
  description: string;
  user?: UserProfile;
}
