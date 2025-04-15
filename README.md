# 🃏 Truco Online

Projeto de Truco online desenvolvido com **React**, **NestJS** e **WebSocket**. Jogue com seus amigos em tempo real, com sistema de apostas, placar dinâmico e animações interativas!

---

## 📸 Preview

![preview](./public/preview.png)

---

## 🚀 Tecnologias

### Frontend
- **React** com Vite
- **TypeScript**
- **Socket.IO Client**
- **TailwindCSS**
- **SweetAlert2** para modais interativos
- **Context API** para gerenciamento de estado
- **React Router Dom**

### Backend
- **NestJS**
- **Socket.IO Server**
- **TypeScript**
- Estrutura modular e escalável

---

## 🧠 Funcionalidades

- 🎮 Criação e entrada em salas de jogo
- 👥 Sistema de times (nós x eles)
- 🔄 Rodadas com lógica de jogo por turno
- 💬 Comunicação em tempo real via WebSocket
- 🔥 Sistema de Truco com:
  - Apostas dinâmicas: 1, 3, 6, 9, 12 pontos
  - Aceitar, Recusar ou Aumentar aposta
  - Resposta síncrona entre jogadores
- 🃏 Distribuição aleatória de cartas
- 👁️‍🗨️ Cartas visíveis ou ocultas de acordo com regras
- 🏆 Cálculo de placar e verificação de vitória
- 💻 Reset automático da rodada após Truco ou final de mão
