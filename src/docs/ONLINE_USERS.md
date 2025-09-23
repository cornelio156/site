# Sistema de Usuários Online em Tempo Real

## Visão Geral

Este sistema permite mostrar quantos usuários estão acessando o site em tempo real, com atualizações automáticas e interface responsiva.

## Componentes Implementados

### 1. OnlineUsersService (`src/services/OnlineUsersService.ts`)
- **Singleton** que gerencia todos os usuários online
- **Cleanup automático** de usuários inativos (timeout de 1 minuto)
- **Heartbeat** para manter usuários ativos
- **Listeners** para notificar mudanças em tempo real

### 2. useOnlineUsers Hook (`src/hooks/useOnlineUsers.ts`)
- Hook personalizado para usar o serviço
- **Auto-registro** do usuário atual
- **Heartbeat automático** a cada 10 segundos
- **Cleanup automático** ao desmontar componente

### 3. OnlineUsersCounter (`src/components/OnlineUsersCounter.tsx`)
- Componente para exibir contador de usuários
- **3 variantes**: chip, text, detailed
- **Posicionamento**: fixed ou static
- **Cores dinâmicas** baseadas no número de usuários

### 4. OnlineUsersPanel (`src/components/OnlineUsersPanel.tsx`)
- Painel completo com estatísticas detalhadas
- **Lista de usuários** ativos
- **Timestamps** de última atividade
- **Refresh automático** configurável

## Como Usar

### Contador Simples
```tsx
import OnlineUsersCounter from '../components/OnlineUsersCounter';

// Contador fixo no canto superior direito
<OnlineUsersCounter 
  variant="detailed" 
  position="fixed" 
  size="medium" 
/>

// Contador discreto em linha
<OnlineUsersCounter 
  variant="chip" 
  size="small" 
  showDetails={true}
/>
```

### Painel Completo (Admin)
```tsx
import OnlineUsersPanel from '../components/OnlineUsersPanel';

<OnlineUsersPanel 
  showDetails={true} 
  refreshInterval={5000} // 5 segundos
/>
```

### Hook Personalizado
```tsx
import { useOnlineUsers } from '../hooks/useOnlineUsers';

const MyComponent = () => {
  const { onlineCount, isOnline, error } = useOnlineUsers();
  
  return (
    <div>
      Usuários online: {onlineCount}
      Status: {isOnline ? 'Conectado' : 'Desconectado'}
    </div>
  );
};
```

## Funcionalidades

### ✅ Implementado
- [x] Contador de usuários online em tempo real
- [x] Cleanup automático de usuários inativos
- [x] Heartbeat para manter conexões ativas
- [x] Interface responsiva e moderna
- [x] Múltiplas variantes de exibição
- [x] Painel de administração detalhado
- [x] Logs de debug para troubleshooting

### 🔄 Em Tempo Real
- **Atualização automática** a cada 10 segundos
- **Cleanup** de usuários inativos a cada 30 segundos
- **Timeout** de 1 minuto para considerar usuário inativo
- **Notificações instantâneas** para mudanças no contador

## Configuração

### Timeouts (OnlineUsersService)
```typescript
private readonly CLEANUP_INTERVAL = 30000; // 30 segundos
private readonly HEARTBEAT_INTERVAL = 10000; // 10 segundos  
private readonly USER_TIMEOUT = 60000; // 1 minuto
```

### Cores do Status
- 🟢 **Verde**: Usuário muito ativo (< 30 segundos)
- 🟡 **Amarelo**: Usuário ativo (< 1 minuto)
- ⚪ **Cinza**: Usuário inativo (> 1 minuto)

## Localizações no Site

### 1. Página Principal (Home)
- **Contador fixo** no canto superior direito
- **Contador discreto** na seção de vídeos

### 2. Página de Administração
- **Aba dedicada** "Online Users"
- **Painel completo** com estatísticas detalhadas
- **Lista de usuários** ativos

## Troubleshooting

### Problemas Comuns

1. **Contador não atualiza**
   - Verifique se o componente está montado
   - Confirme se o hook está sendo usado corretamente

2. **Usuários não aparecem**
   - Verifique os logs do console
   - Confirme se o serviço está inicializado

3. **Performance lenta**
   - Ajuste os intervalos de cleanup e heartbeat
   - Limite o número de usuários exibidos

### Logs de Debug
```typescript
// Ativar logs detalhados
console.log('Usuário adicionado:', userId);
console.log('Total online:', count);
console.log('Usuários removidos:', inactiveUsers);
```

## Próximas Melhorias

- [ ] Persistência em banco de dados
- [ ] WebSocket para comunicação em tempo real
- [ ] Geolocalização dos usuários
- [ ] Gráficos de estatísticas
- [ ] Notificações push para administradores
- [ ] API REST para dados externos

## Arquitetura

```
OnlineUsersService (Singleton)
├── Map<userId, OnlineUser>
├── Set<listeners>
├── cleanupInterval
└── heartbeatInterval

useOnlineUsers (Hook)
├── addUser()
├── removeUser()
├── updateActivity()
└── addListener()

OnlineUsersCounter (Component)
├── variant: chip | text | detailed
├── position: fixed | static
└── size: small | medium | large

OnlineUsersPanel (Component)
├── showDetails: boolean
├── refreshInterval: number
└── real-time updates
```

## Considerações de Performance

- **Singleton pattern** evita múltiplas instâncias
- **Cleanup automático** previne vazamentos de memória
- **Debounced updates** reduzem re-renders desnecessários
- **Lazy loading** de componentes pesados
- **Memoização** de callbacks e valores computados
