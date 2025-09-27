import SupabaseService from './SupabaseService';

// User interface - mantém compatibilidade com o frontend
export interface User {
  $id: string;
  email: string;
  name: string;
  password: string;
  created_at: string;
}

// Session interface
export interface SessionData {
  id: string;
  userId: string;
  token: string;
  userAgent: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

export class UserServiceSupabase {
  private static supabase = SupabaseService.getInstance();

  // Login function
  static async login(email: string, password: string): Promise<{ user: User; session: SessionData } | null> {
    try {
      console.log('Attempting login with Supabase for email:', email);
      
      // Get user by email
      const userData = await this.supabase.getUserByEmail(email);
      
      if (!userData) {
        console.log('User not found for email:', email);
        return null;
      }

      // Hash the provided password and compare with stored hash
      const hashedPassword = await this.hashPassword(password);
      if (userData.password !== hashedPassword) {
        console.log('Invalid password for email:', email);
        return null;
      }

      // Convert to User interface
      const user: User = {
        $id: userData.id,
        email: userData.email,
        name: userData.name,
        password: userData.password,
        created_at: userData.created_at
      };

      // Create session
      const sessionToken = this.generateSessionToken();
      const sessionId = this.generateSessionId();
      const sessionData = {
        id: sessionId,
        user_id: user.$id,
        token: sessionToken,
        user_agent: navigator.userAgent,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        is_active: true,
        created_at: new Date().toISOString()
      };

      const session = await this.supabase.createSession(sessionData);
      
      // Convert to SessionData interface
      const sessionDataFormatted: SessionData = {
        id: session.id,
        userId: session.user_id,
        token: session.token,
        userAgent: session.user_agent,
        expiresAt: session.expires_at,
        isActive: session.is_active,
        createdAt: session.created_at
      };

      // Store session token in localStorage
      localStorage.setItem('sessionToken', sessionToken);

      console.log('Login successful for user:', user.email);
      return { user, session: sessionDataFormatted };
    } catch (error) {
      console.error('Error during login:', error);
      return null;
    }
  }

  // Logout function
  static async logout(): Promise<void> {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      
      if (sessionToken) {
        // Get session by token
        const session = await this.supabase.getSessionByToken(sessionToken);
        
        if (session) {
          // Deactivate session
          await this.supabase.updateSession(session.id, { is_active: false });
        }
      }
      
      // Remove session token from localStorage
      localStorage.removeItem('sessionToken');
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still remove token from localStorage even if there's an error
      localStorage.removeItem('sessionToken');
    }
  }

  // Get current session
  static async getCurrentSession(): Promise<SessionData | null> {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      
      if (!sessionToken) {
        return null;
      }

      const session = await this.supabase.getSessionByToken(sessionToken);
      
      if (!session) {
        return null;
      }

      // Check if session is expired
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      
      if (now > expiresAt) {
        // Session expired, deactivate it
        await this.supabase.updateSession(session.id, { is_active: false });
        localStorage.removeItem('sessionToken');
        return null;
      }

      // Convert to SessionData interface
      return {
        id: session.id,
        userId: session.user_id,
        token: session.token,
        userAgent: session.user_agent,
        expiresAt: session.expires_at,
        isActive: session.is_active,
        createdAt: session.created_at
      };
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const userData = await this.supabase.getUserById(userId);
      
      if (!userData) {
        return null;
      }

      // Convert to User interface
      return {
        $id: userData.id,
        email: userData.email,
        name: userData.name,
        password: userData.password,
        created_at: userData.created_at
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Validate session
  static async validateSession(sessionToken: string): Promise<SessionData | null> {
    try {
      const session = await this.supabase.getSessionByToken(sessionToken);
      
      if (!session) {
        return null;
      }

      // Check if session is expired
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      
      if (now > expiresAt) {
        // Session expired, deactivate it
        await this.supabase.updateSession(session.id, { is_active: false });
        return null;
      }

      // Convert to SessionData interface
      return {
        id: session.id,
        userId: session.user_id,
        token: session.token,
        userAgent: session.user_agent,
        expiresAt: session.expires_at,
        isActive: session.is_active,
        createdAt: session.created_at
      };
    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  }

  // Deactivate session
  static async deactivateSession(sessionId: string): Promise<void> {
    try {
      await this.supabase.updateSession(sessionId, { is_active: false });
      console.log('Session deactivated:', sessionId);
    } catch (error) {
      console.error('Error deactivating session:', error);
    }
  }

  // Create new user (for registration)
  static async createUser(userData: {
    email: string;
    name: string;
    password: string;
  }): Promise<User | null> {
    try {
      // Hash the password before saving
      const hashedPassword = await this.hashPassword(userData.password);
      
      const newUser = await this.supabase.createUser({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        created_at: new Date().toISOString()
      });

      // Convert to User interface
      return {
        $id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        password: newUser.password,
        created_at: newUser.created_at
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  // Generate a random session token
  private static generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Update user profile
  static async updateUser(userId: string, updates: {
    name?: string;
    email?: string;
    password?: string;
  }): Promise<User | null> {
    try {
      const client = this.supabase.getClient();
      
      // Prepare update data
      const updateData: any = { ...updates };
      
      // Hash password if provided
      if (updates.password) {
        updateData.password = await this.hashPassword(updates.password);
      }
      
      const { data, error } = await client.from('users').update(updateData).eq('id', userId).select().single();
      
      if (error) {
        console.error('Error updating user:', error);
        return null;
      }

      // Convert to User interface
      return {
        $id: data.id,
        email: data.email,
        name: data.name,
        password: data.password,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  // Change password
  static async changePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const client = this.supabase.getClient();
      
      // Hash the new password before saving
      const hashedPassword = await this.hashPassword(newPassword);
      
      const { error } = await client.from('users').update({ password: hashedPassword }).eq('id', userId);
      
      if (error) {
        console.error('Error changing password:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  }

  // Get all users
  static async getAllUsers(): Promise<User[]> {
    try {
      const client = this.supabase.getClient();
      const { data, error } = await client.from('users').select('*').order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error getting all users:', error);
        return [];
      }

      // Convert to User interface
      return data.map(user => ({
        $id: user.id,
        email: user.email,
        name: user.name,
        password: user.password,
        created_at: user.created_at
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Delete user
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      const client = this.supabase.getClient();
      const { error } = await client.from('users').delete().eq('id', userId);
      
      if (error) {
        console.error('Error deleting user:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Hash password using Web Crypto API (browser)
  private static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Generate unique session ID
  private static generateSessionId(): string {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}
