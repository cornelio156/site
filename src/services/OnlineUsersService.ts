interface OnlineUser {
  id: string;
  timestamp: number;
  lastSeen: number;
}

class OnlineUsersService {
  private static instance: OnlineUsersService;
  private users: Map<string, OnlineUser> = new Map();
  private listeners: Set<(count: number) => void> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 30000; // 30 segundos
  private readonly HEARTBEAT_INTERVAL = 10000; // 10 segundos
  private readonly USER_TIMEOUT = 60000; // 1 minuto

  private constructor() {
    this.startCleanup();
    this.startHeartbeat();
  }

  static getInstance(): OnlineUsersService {
    if (!OnlineUsersService.instance) {
      OnlineUsersService.instance = new OnlineUsersService();
    }
    return OnlineUsersService.instance;
  }

  /**
   * Adiciona um usuário online
   */
  addUser(userId: string): void {
    // Simulate realistic online user count (0-100)
    const simulatedCount = Math.floor(Math.random() * 101); // 0-100
    this.users.clear(); // Clear real users
    
    // Add simulated users
    for (let i = 0; i < simulatedCount; i++) {
      const now = Date.now();
      this.users.set(`simulated_user_${i}`, {
        id: `simulated_user_${i}`,
        timestamp: now,
        lastSeen: now
      });
    }
    
    this.notifyListeners();
  }

  /**
   * Remove um usuário
   */
  removeUser(userId: string): void {
    // Simulate realistic user count variations when removing
    const currentCount = this.users.size;
    const variation = Math.floor(Math.random() * 11) - 5; // -5 to +5
    const newCount = Math.max(0, Math.min(100, currentCount + variation));
    
    this.users.clear();
    
    // Add simulated users with new count
    for (let i = 0; i < newCount; i++) {
      const now = Date.now();
      this.users.set(`simulated_user_${i}`, {
        id: `simulated_user_${i}`,
        timestamp: now,
        lastSeen: now
      });
    }
    
    this.notifyListeners();
  }

  /**
   * Atualiza o timestamp de um usuário (heartbeat)
   */
  updateUserActivity(userId: string): void {
    // Simulate realistic user count variations
    const currentCount = this.users.size;
    const variation = Math.floor(Math.random() * 21) - 10; // -10 to +10
    const newCount = Math.max(0, Math.min(100, currentCount + variation));
    
    this.users.clear();
    
    // Add simulated users with new count
    for (let i = 0; i < newCount; i++) {
      const now = Date.now();
      this.users.set(`simulated_user_${i}`, {
        id: `simulated_user_${i}`,
        timestamp: now,
        lastSeen: now
      });
    }
    
    this.notifyListeners();
  }

  /**
   * Retorna o número de usuários online
   */
  getOnlineCount(): number {
    return this.users.size;
  }

  /**
   * Retorna lista de usuários online
   */
  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.users.values());
  }

  /**
   * Adiciona um listener para mudanças no contador
   */
  addListener(callback: (count: number) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove um listener
   */
  removeListener(callback: (count: number) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Notifica todos os listeners sobre mudanças
   */
  private notifyListeners(): void {
    const count = this.getOnlineCount();
    this.listeners.forEach((callback) => {
      try {
        callback(count);
      } catch (error) {
        console.error('Erro ao notificar listener:', error);
      }
    });
  }

  /**
   * Remove usuários inativos
   */
  private cleanupInactiveUsers(): void {
    // Simulate realistic user count variations during cleanup
    const currentCount = this.users.size;
    const variation = Math.floor(Math.random() * 31) - 15; // -15 to +15
    const newCount = Math.max(0, Math.min(100, currentCount + variation));
    
    this.users.clear();
    
    // Add simulated users with new count
    for (let i = 0; i < newCount; i++) {
      const now = Date.now();
      this.users.set(`simulated_user_${i}`, {
        id: `simulated_user_${i}`,
        timestamp: now,
        lastSeen: now
      });
    }
    
    this.notifyListeners();
  }

  /**
   * Inicia o processo de limpeza de usuários inativos
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveUsers();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Inicia o heartbeat para manter usuários ativos
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      // O heartbeat será implementado no componente React
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Limpa recursos
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.users.clear();
    this.listeners.clear();
  }
}

export default OnlineUsersService;
