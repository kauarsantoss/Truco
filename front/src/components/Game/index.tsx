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
  const [bet, setBet] = useState(1);
  const [oldBet, setOldBet] = useState(1);


  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = ""; // Isso é necessário para que o aviso apareça nos navegadores modernos
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    socket.on("deckCreated", (data) => {
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

    socket.on("teste", (data) => {
      console.log("eu sou gay: ", data); // Para verificar o que está vindo
      if (data?.overallScore) {
        setOverallScore(data.overallScore); // Atualiza apenas o objeto correto
      }
    });
    socket.on("tableUpdated", (updatedTable) => {
      console.log("Table atualizada: " + updatedTable);
      setTable(updatedTable);
    });

    socket.on("gameStateUpdate", (gameState) => {
      console.log("Game State: ", gameState)
      setOverallScore(gameState.overallScore);
      setShackles(gameState.shackles);
      setPlayers(gameState.players);
      setTable(gameState.table);
      setScore(gameState.score);
    });

    socket.on("acceptTruco",(bet) =>{
      setBet(bet)
      Swal.fire({
        title: "Truco Aceito!",
        text: `A rodada agora vale ${bet} pontos!`,
        icon: "success",
      });
    })

    socket.on("updateScore", (gameState) => {
      console.log("Recebendo updateScore: ", gameState);

      setScore({
        rounds: gameState?.score?.rounds ?? 0,
        winners: Array.isArray(gameState?.score?.winners)
            ? gameState.score.winners
            : [0, 0, 0],
      });
    });

    socket.on("playerHandUpdated", (data) => {
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
    };
  }, []);

  useEffect(() => {
    socket.emit("determineGameWinner", score);
  }, [score]);


  useEffect(() => {
    socket.emit("newDeck");
  }, []);
  const handleTrucoRequested = (data) => {
    Swal.close();
    console.log("Recebi do back o que era pra rolar...")
    const { listPlayers, requestingPlayer, newBet } = data;
    console.log("Esse é o objeto que recebi do back", JSON.stringify(data, null, 2));
    console.log("Esse é o meu playerID: ",myPlayerId)
    // Se o jogador atual estiver na lista, mostra o modal
    if (listPlayers.includes(myPlayerId)) {
      console.log("Cai no if do Truco lek")
      const quemPropôs = requestingPlayer % 2 === 0 ? "eles" : "nos";
  
      Swal.fire({
        title: `Truco! Valendo ${newBet} pontos!`,
        icon: "question",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Aceitar",
        denyButtonText: "Recusar",
        cancelButtonText: newBet < 12 ? "Aumentar" : undefined,
      }).then((result) => {
        if (result.isConfirmed) {
          window.alert("Jogador aceitou o truco");
          socket.emit('acceptTruco', { quemPropos: quemPropôs, newBet: newBet });
        } else if (result.isDenied) {
          window.alert("Jogador recusou o truco");
          console.log("bet correu: ",bet)
          console.log("oldBet correu: ",oldBet)
          let betAtual = 0

          switch (newBet) {
            case 3:
              betAtual = 1;
              break;
            case 6:
              betAtual = 3;
              break;
            case 9:
              betAtual = 6;
              break;
            case 12:
              betAtual = 9;
              break;
            default:
              betAtual = 12;
              break;
          }
          
          socket.emit('runTruco', { quemPropos: quemPropôs, bet: betAtual })
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          setOldBet(bet)
          setBet(newBet)
          socket.emit('requestTruco', { playerId: myPlayerId, bet:newBet })
          }
      });
    }
  };
    
  socket.on("trucoRequested", handleTrucoRequested);

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

  // Verifica se algum time atingiu 12 pontos para reiniciar o jogo
  useEffect(() => {
    if (overallScore.nos === 12) {
      Swal.fire({
        title: "🏆 Parabéns!",
        text: "Nós ganhamos o jogo! 🎉",
        icon: "success",
        confirmButtonText: "Jogar novamente",
        showCancelButton: true,
        cancelButtonText: "Sair",
      }).then((result) => {
        if (result.isConfirmed) {
          socket.emit("restartGame"); // Se clicar em "Jogar novamente"
        } else {
          socket.emit("resetGame"); // Se fechar ou clicar em "Sair"
        }
      });
    } else if (overallScore.eles === 12) {
      Swal.fire({
        title: "😢 Fim de jogo!",
        text: "Eles ganharam! Vamos tentar de novo?",
        icon: "error",
        confirmButtonText: "Jogar novamente",
        showCancelButton: true,
        cancelButtonText: "Sair",
      }).then((result) => {
        if (result.isConfirmed) {
          socket.emit("restartGame");
        } else {
          socket.emit("resetGame");
        }
      });
    }
  }, [overallScore]);



  const handleRightClick = (playerId, cardIndex, event) => {
    event.preventDefault();
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) => {
        if (player.id !== playerId) return player;
  
        const isCardBack = player.hand[cardIndex] === "-back.png";
        const originalHand = player.originalHand ?? [...player.hand];
  
        const updatedHand = player.hand.map((card, index) => {
          if (index === cardIndex) {
            return isCardBack ? originalHand[index] : "-back.png";
          }
          return card;
        });
  
        // 👇 envia para o servidor a mão atualizada do jogador
        socket.emit("updateHand", {
          playerId,
          hand: updatedHand,
        });
  
        return {
          ...player,
          hand: updatedHand,
          originalHand,
        };
      })
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
                    src={images["card" + card.src.toLowerCase()]}
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
              {score?.winners && [0, 1, 2].map((roundIndex) => (
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
              {score?.winners && [0, 1, 2].map((roundIndex) => (
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
          <styles.TrucoButton
          onClick={() =>socket.emit('requestTruco', { playerId: myPlayerId, bet:bet })}
          > Truco
          </styles.TrucoButton>
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