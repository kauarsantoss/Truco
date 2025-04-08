import { useState, useEffect } from "react";
import styles from "./styles.ts";
import Swal from "sweetalert2";
import images from "../Images";
import io from "socket.io-client";

const socket = io("http://localhost:3333");

const Game = () => {
  const [myPlayerId, setMyPlayerId] = useState(0)
  const [overallScore, setOverallScore] = useState({ nos: 0, eles: 0 });
  const [shackles, setShackles] = useState([]);
  const [players, setPlayers] = useState([]);
  const [table, setTable] = useState([]);
  const [score, setScore] = useState({ rounds: 0, winners: [0, 0, 0] });

  // Configuração dos eventos do WebSocket
  useEffect(() => {
    socket.on("deckCreated", (data) => {
      // Após a criação do baralho, solicitar a distribuição de cartas
      socket.emit("distributeCards");
    });

    socket.on("myPlayerId",(data) =>{
      console.log("Meu player ID: "+ data)
      setMyPlayerId(data)
    })

    socket.on("deckCreated", (data) => {
      socket.emit("distributeCards");
    });

    socket.on("cardsDistributed", (data) => {
      console.log("Jogadores recebidos:", data);
      setPlayers(data);
    });

    socket.on("shuffleDistributed", (data) => {
      console.debug("Manilhas embaralhadas:", data);
      console.debug("Manilhas:", data.shackles);
      setShackles(data.shackles || []);
    });

    socket.on("penis", (overallScore) => {
      setOverallScore(overallScore);
      console.log("eu sou gay: " + overallScore);
    });

    socket.on("tableUpdated", (updatedTable) => {
      console.log("Table atualizada: ", updatedTable);
      setTable(updatedTable || []);
    });

    socket.on("gameStateUpdate", (gameState) => {
      console.log("Game State: ", gameState);
      setOverallScore(gameState.overallScore);
      setShackles(gameState.shackles);
      setPlayers(gameState.players);
      setTable(gameState.table);
      setScore(gameState.score);
    });

    socket.on("updateScore", (gameState) => {
      console.log("Recebendo updateScore: ", gameState);

      setScore({
        rounds: gameState?.score?.rounds ?? 0,
        winners: Array.isArray(gameState?.score?.winners)
          ? gameState.score.winners
          : [0, 0, 0],
      });

      setOverallScore({
        nos: gameState?.overallScore?.nos ?? 0,
        eles: gameState?.overallScore?.eles ?? 0,
      });
    });

    // Novo manipulador para o evento "playerHandUpdated"
    socket.on("playerHandUpdated", (data) => {
      console.log("Recebendo playerHandUpdated:", data);
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.id === data.playerId ? { ...player, hand: data.hand } : player
        )
      );
    });

    return () => {
      socket.off("deckCreated");
      socket.off("cardsDistributed");
      socket.off("tableUpdated");
      socket.off("gameStateUpdate");
      socket.off("playerHandUpdated");
      socket.off("roundReset");
      socket.off("updateScore");
      socket.off("penis");
    };
  }, []);

  useEffect(() => {
    socket.emit("determineGameWinner", score);
  }, [score]);

  // Ao montar o componente, solicitar a criação do baralho
  useEffect(() => {
    socket.emit("newDeck");
  }, []);

  // Verifica se algum time atingiu 12 pontos para reiniciar o jogo
  useEffect(() => {
    if (overallScore.nos === 12) {
      Swal.fire({
        title: "🏆 Parabéns!",
        text: "Nós ganhamos o jogo! 🎉",
        icon: "success",
        confirmButtonText: "Jogar novamente",
      }).then(() => {
        socket.emit("resetGame");
      });
    } else if (overallScore.eles === 12) {
      Swal.fire({
        title: "😢 Fim de jogo!",
        text: "Eles ganharam! Vamos tentar de novo?",
        icon: "error",
        confirmButtonText: "Jogar novamente",
      }).then(() => {
        socket.emit("resetGame");
      });
    }
  }, [overallScore]);

  // Função para jogar uma carta: emite o evento para o servidor
  const playCard = (playerId, cardIndex) => {
    const player = players.find((p) => p.id === playerId);
    if (!player || !player.hand || cardIndex >= player.hand.length) return;

    const selectedCard = player.hand[cardIndex];
    console.log("`PlayCard: " + selectedCard);
    console.log("Position: " + player.position);
    console.log("playerId: " + playerId);
    console.log("cardIndex: " + cardIndex);
    socket.emit("playCard", {
      playerId,
      cardIndex,
      card: selectedCard,
      position: player.position,
    });
  };

  const getPositionByPlayerId = (playerPosition: string): number => {
    switch (playerPosition) {
      case "bottom":
        return 1;
      case "left":
        return 2;
      case "top":
        return 3;
      case "right":
        return 4;
      default:
        return 0;
    }
  };

  // Trata o clique direito para virar a carta (efeito visual local)
  const handleRightClick = (playerId, cardIndex, event) => {
    event.preventDefault();
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId
          ? {
              ...player,
              hand: player.hand.map((card, index) => {
                if (index === cardIndex) {
                  return card === "-back.png"
                    ? player.originalHand[index]
                    : "-back.png";
                }
                return card;
              }),
            }
          : player
      )
    );
  };

  return (
    <>
      <styles.Shackles>
        <styles.Tittle>Manilhas</styles.Tittle>
        <styles.StorageShackles>
          {shackles.map((card, index) => (
            <styles.Card
              key={index}
              src={images["card" + card.src.toLowerCase()]} // Faz lookup usando a chave enviada (ex.: "card3h.png")
              $flip={true}
              $isShackles={true}
            />
          ))}
        </styles.StorageShackles>
      </styles.Shackles>
      <styles.Container>
        <styles.Scoreboard>
          <styles.Us>
            Nós:
            {score?.winners &&
              [0, 1, 2].map((roundIndex) => (
                <styles.Ball
                  key={roundIndex}
                  $isWinner={
                    score?.winners?.[roundIndex] === 3
                      ? "yellow"
                      : score?.winners?.[roundIndex] === 1
                      ? "green"
                      : score?.winners?.[roundIndex] === 2
                      ? "red"
                      : "gray"
                  }
                />
              ))}
            {overallScore.nos}
          </styles.Us>
          <styles.They>
            Eles:
            {score?.winners &&
              [0, 1, 2].map((roundIndex) => (
                <styles.Ball
                  key={roundIndex}
                  $isWinner={
                    score?.winners?.[roundIndex] === 3
                      ? "yellow"
                      : score?.winners?.[roundIndex] === 2
                      ? "green"
                      : score?.winners?.[roundIndex] === 1
                      ? "red"
                      : "gray"
                  }
                />
              ))}
            {overallScore.eles}
          </styles.They>
        </styles.Scoreboard>
        <styles.Mesa>
          {table.map((item, index) => (
            <styles.TableCard
              key={index}
              src={images["card" + item.card.toLowerCase()]} // Faz lookup usando a chave enviada (ex.: "card3h.png")
              $flip={true}
              $position={item.position}
            />
          ))}
        </styles.Mesa>
        {players.map((player) => (
          <styles.CardContainer key={player.id} $position={player.position}>
            {player.hand.map((card, index) => {
              console.log("PositionPlayer: ", player.position);
              console.log(
                "PositionReturnFunction: ",
                getPositionByPlayerId(player.position)
              );
              console.log(
                `Player ${player.id} | Position: ${player.position} | Hand:`,
                player.hand
              );
              console.log("PlayerID: ", player.id);
              console.log("Meu playerID parte2: ",myPlayerId);
              console.log("O que estou passando para carta da mão: ", "card" + card.toLowerCase())
              console.log("Cartas da mão: ",images["card" + card.toLowerCase()])
              console.log("Carta Teste: ",images["cardjh.png"])
              return (
                <styles.Card
                  key={`${player.id}-${index}`}
                  src={
                    player.id === myPlayerId
                    ? images["card" + card.toLowerCase()]
                    :images["card-back.png"]
                  }
                  $isShackles={false}
                  onClick={() => {
                    if (player.id === myPlayerId) {
                      playCard(player.id, index);
                    }
                  }}
                  onContextMenu={(event) =>
                    handleRightClick(player.id, index, event)
                  }
                />
              );
            })}
          </styles.CardContainer>
        ))}
      </styles.Container>
    </>
  );
};

export default Game;
