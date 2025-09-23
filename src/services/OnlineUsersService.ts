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
    const now = Date.now();
    this.users.set(userId, {
      id: userId,
      timestamp: now,
      lastSeen: now
    });
    this.notifyListeners();
    console.log(`Usuário ${userId} adicionado. Total online: ${this.getOnlineCount()}`);
  }

  /**
   * Remove um usuário
   */
  removeUser(userId: string): void {
    this.users.delete(userId);
    this.notifyListeners();
    console.log(`Usuário ${userId} removido. Total online: ${this.getOnlineCount()}`);
  }

  /**
   * Atualiza o timestamp de um usuário (heartbeat)
   */
  updateUserActivity(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.lastSeen = Date.now();
      this.users.set(userId, user);
    }
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
    this.listeners.forEach(callback => {
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
    const now = Date.now();
    const inactiveUsers: string[] = [];

    this.users.forEach((user, userId) => {
      if (now - user.lastSeen > this.USER_TIMEOUT) {
        inactiveUsers.push(userId);
      }
    });

    inactiveUsers.forEach(userId => {
      this.users.delete(userId);
    });

    if (inactiveUsers.length > 0) {
      this.notifyListeners();
      console.log(`Removidos ${inactiveUsers.length} usuários inativos. Total online: ${this.getOnlineCount()}`);
    }
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
