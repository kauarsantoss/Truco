import { useState, useEffect } from "react";
import styles from "./styles.ts";
import images from "../Images";
import Swal from "sweetalert2";

const Game = () => {
  const [deckId, setDeckId] = useState();
  const [overallScore, setOverallScore] = useState({ nos: 11, eles: 11 });
  const [shackles, setShackles] = useState([]);
  const [players, setPlayers] = useState([
    {
      id: 1,
      name: "Jogador 1",
      hand: [images[""], images[""], images[""]],
      position: "bottom",
    },
    {
      id: 2,
      name: "Jogador 2",
      hand: [images[""], images[""], images[""]],
      position: "left",
    },
    {
      id: 3,
      name: "Jogador 3",
      hand: [images[""], images[""], images[""]],
      position: "top",
    },
    {
      id: 4,
      name: "Jogador 4",
      hand: [images[""], images[""], images[""]],
      position: "right",
    },
  ]);

  useEffect(() => {
    const createDeck = async () => {
      try {
        const response = await fetch(
          "https://truco-blnx.onrender.com/truco/newDeck"
        );
        const data = await response.json();
        setDeckId(data.deck_id);
        console.log(data);
      } catch (error) {
        console.error("Erro ao chamar a API:", error);
      }
    };

    createDeck();
  }, []);
  const giveCards = async () => {
    if (deckId) {
      try {
        console.log("DECKID: " + deckId);
        const response = await fetch(
          `https://truco-blnx.onrender.com/truco/${deckId}/distribuir`
        );
        const data = await response.json();

        setShackles(() => {
          const manilhas = data["manilha"] || [];
          const manilhasAtualizadas = [
            String(manilhas[0]).toLowerCase() + "d",
            String(manilhas[0]).toLowerCase() + "s",
            String(manilhas[0]).toLowerCase() + "h",
            String(manilhas[0]).toLowerCase() + "c",
          ];
          console.log("Manilha: " + manilhas);
          console.log("Manilhas Atualizadas: " + manilhasAtualizadas);
          return manilhasAtualizadas.map((card) => ({
            id: card,
            src: images[`card${card}.png`.toLowerCase()],
          }));
        });

        setPlayers((prevPlayers) =>
          prevPlayers.map((player) => {
            const cartas = data["jogador" + player.id] || [];
            const cartasCompletas = cartas.map(
              (card) => images[`card${card}.png`.toLowerCase()]
            );

            return {
              ...player,
              hand: cartasCompletas,
              originalHand: [...cartasCompletas], // 🔹 Agora armazenamos a mão original!
            };
          })
        );
      } catch (error) {
        console.error("Erro ao chamar a API:", error);
      }
    }
  };

  // ✅ Agora `giveCards` está acessível e será chamado corretamente no `useEffect`
  useEffect(() => {
    giveCards();
  }, [deckId]);

  const shuffle = async () => {
    const response = await fetch(
      `https://truco-blnx.onrender.com/truco/${deckId}/embaralhar`
    );
    const data = await response.json();
  };
  const resetRound = () => {
    setScore({ rounds: 0, winners: [0, 0, 0] });
    setTable([]);
    shuffle();
    giveCards();
  };

  const resetGame = () => {
    setScore({ rounds: 0, winners: [0, 0, 0] });
    setOverallScore({ nos: 0, eles: 0 });
    setTable([]);
    shuffle();
    giveCards();
  };

  useEffect(() => {
    console.log("Shackles atualizados: ", shackles);
  }, [shackles]);

  const [table, setTable] = useState<{ card: string; position?: string }[]>([]);
  const [score, setScore] = useState<{ rounds: number; winners: number[] }>({
    rounds: 0,
    winners: [0, 0, 0],
  });

  const playCard = (playerId, cardIndex) => {
    const selectedCard = players.find((p) => p.id === playerId)?.hand[
      cardIndex
    ];
    if (!selectedCard) return;

    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId
          ? {
              ...player,
              hand: player.hand.filter((_, index) => index !== cardIndex),
            }
          : player
      )
    );

    setTable((prevTable) => [
      ...prevTable,
      {
        card: selectedCard,
        position: players.find((p) => p.id === playerId)?.position,
      },
    ]);

    if (table.length === 3) {
      determineRoundWinner(
        [
          ...table,
          {
            card: selectedCard,
            position: players.find((p) => p.id === playerId)?.position,
          },
        ],
        shackles
      );
    }
  };
  const determineRoundWinner = (roundCards, shackles = []) => {
    const force = ["card-back", "4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];

    const getCardValue = (cardImage) => {
      let match = cardImage.match(/card(\d+|[kqja])/);
      if(cardImage.includes("card-back")){
        return"card-back"
      }
      return match ? match[1].toUpperCase() : null;
    };

    const getCardSuit = (cardImage) => {
      const match = cardImage.match(/(\d+)([dshc])\.png/);
      return match ? match[2] : null;
    };


    let winningCards = [roundCards[0]];
    let hasShackle = shackles.some((shackle) =>
      shackle.id.includes(getCardValue(roundCards[0].card).toLowerCase())
    );

    for (let i = 1; i < roundCards.length; i++) {
      console.log("Valor da carta papai: "+roundCards[i].card)
      const currentCardValue = getCardValue(roundCards[i].card);
      const currentCardSuit = getCardSuit(roundCards[i].card);
      const winningCardValue = getCardValue(winningCards[0].card);
      const winningCardSuit = getCardSuit(winningCards[0].card);

      console.log(
        `Analisando carta: ${roundCards[i].card} (Valor: ${currentCardValue}, Naipe: ${currentCardSuit})`
      );

      const isCurrentShackle = shackles.some((shackle) =>
        shackle.id.includes(currentCardValue.toLowerCase())
      );

      if (isCurrentShackle) {
        if (!hasShackle) {
          winningCards = [roundCards[i]];
          hasShackle = true;
        } else {
          const naipeForca = ["o", "e", "c", "p"];
          if (
            naipeForca.indexOf(currentCardSuit) >
            naipeForca.indexOf(winningCardSuit)
          ) {
            winningCards = [roundCards[i]];
          } else if (
            naipeForca.indexOf(currentCardSuit) ===
            naipeForca.indexOf(winningCardSuit)
          ) {
            winningCards.push(roundCards[i]); // Empate
          }
        }
      } else if (!hasShackle) {
        const currentForce = force.indexOf(currentCardValue);
        const winningForce = force.indexOf(winningCardValue);

        if (currentForce > winningForce) {
          winningCards = [roundCards[i]];
        } else if (currentForce === winningForce) {
          winningCards.push(roundCards[i]); // Empate
        }
      }
    }

    let winningTeam = null;

    if (winningCards.length > 1) {
      console.log("Rodada empatada!");
      winningTeam = "empate";
    } else {
      winningTeam =
        winningCards[0].position === "bottom" ||
        winningCards[0].position === "top"
          ? "1"
          : "2";
      console.log(`Vencedor da rodada: ${winningTeam}`);
    }

    addPoints(winningTeam);
    setTable([]);
  };

  const addPoints = (team) => {
    setScore((prevScore) => {
      const newWinners = [...prevScore.winners];

      if (prevScore.rounds < 3) {
        newWinners[prevScore.rounds] = team === "1" ? 1 : team === "2" ? 2 : 3; // 3 representa empate
      }

      if (newWinners[0] === 3 && prevScore.rounds === 1) {
        return {
          ...prevScore,
          rounds: 2,
          winners: newWinners,
        };
      }

      return {
        ...prevScore,
        rounds: Math.min(prevScore.rounds + 1, 3),
        winners: newWinners,
      };
    });
  };

  useEffect(() => {
    determineGameWinner(score.rounds, score.winners);
  }, [score]);

  const determineGameWinner = (rounds, winners) => {
    if (rounds < 1) return; // Se ainda não houver rodadas, não faz nada
  
    const team1Wins = winners.filter(w => w === 1).length;
    const team2Wins = winners.filter(w => w === 2).length;
    const draws = winners.filter(w => w === 3).length;
  
    console.log(`Rodadas jogadas: ${rounds}`);
    console.log("Time 1 vitórias: ", team1Wins);
    console.log("Time 2 vitórias: ", team2Wins);
    console.log("Empates: ", draws);
  
    // Se a primeira rodada foi empate e a segunda foi vencida, o time leva o ponto
    if (rounds >= 2 && winners[0] === 3) {
      if (winners[1] === 1) {
        setOverallScore(prev => ({ ...prev, nos: prev.nos + 1 }));
      } else if (winners[1] === 2) {
        setOverallScore(prev => ({ ...prev, eles: prev.eles + 1 }));
      }
      resetRound();
      return;
    }
  
    // Se um time venceu mais rodadas que o outro e a soma de rounds é suficiente para definir um vencedor
    if (team1Wins > Math.ceil(rounds / 2)) {
      setOverallScore(prev => ({ ...prev, nos: prev.nos + 1 }));
      resetRound();
    } else if (team2Wins > Math.ceil(rounds / 2)) {
      setOverallScore(prev => ({ ...prev, eles: prev.eles + 1 }));
      resetRound();
    }
  
    // Se houver empate na última rodada, quem ganhou a primeira leva o ponto
    if (rounds === 3 && winners[2] === 3) {
      if (winners[0] === 1) {
        setOverallScore(prev => ({ ...prev, nos: prev.nos + 1 }));
      } else if (winners[0] === 2) {
        setOverallScore(prev => ({ ...prev, eles: prev.eles + 1 }));
      }
      resetRound();
    }
  };
  

  useEffect(() => {
    if (overallScore.nos === 12) {
      Swal.fire({
        title: "🏆 Parabéns!",
        text: "Nós ganhamos o jogo! 🎉",
        icon: "success",
        confirmButtonText: "Jogar novamente",
      }).then(() => resetGame());
    } else if (overallScore.eles === 12) {
      Swal.fire({
        title: "😢 Fim de jogo!",
        text: "Eles ganharam! Vamos tentar de novo?",
        icon: "error",
        confirmButtonText: "Jogar novamente",
      }).then(() => resetGame());
    }
  }, [overallScore]);

  useEffect(() => {
    console.log("Score atual:", score.winners);
    console.log("Rodada atual:", score.rounds);
  }, [score]);

  const handleRightClick = (playerId, cardIndex, event) => {
    event.preventDefault(); 
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId
          ? {
              ...player,
              hand: player.hand.map((card, index) => {
                if (index === cardIndex) {
                  return card === images["card-back.png"] // Se estiver virada, desvira
                    ? player.originalHand[index] // Volta para a carta original
                    : images["card-back.png"]; // Senão, vira para a carta de fundo
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
              key={`${index}`}
              src={card.src}
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
            {[0, 1, 2].map((roundIndex) => (
              <styles.Ball
                key={roundIndex}
                $isWinner={
                  score.winners[roundIndex] === 3
                    ? "yellow"
                    : score.winners[roundIndex] === 1
                    ? "green"
                    : score.winners[roundIndex] === 2
                    ? "red"
                    : "gray"
                }
              />
            ))}
            {overallScore.nos}
          </styles.Us>

          <styles.They>
            Eles:
            {[0, 1, 2].map((roundIndex) => (
              <styles.Ball
                key={roundIndex}
                $isWinner={
                  score.winners[roundIndex] === 3
                    ? "yellow"
                    : score.winners[roundIndex] === 2
                    ? "green"
                    : score.winners[roundIndex] === 1
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
              src={item.card}
              $flip={true}
              $position={item.position}
            />
          ))}
        </styles.Mesa>
        {players.map((player) => (
          <styles.CardContainer key={player.id} $position={player.position}>
            {player.hand.map((card, index) => (
              <styles.Card
                key={`${player.id}-${index}`}
                src={card}
                $flip={true}
                $isShackles={false}
                onClick={() => playCard(player.id, index)}
                onContextMenu={(event) =>
                  handleRightClick(player.id, index, event)
                }
              />
            ))}
          </styles.CardContainer>
        ))}
      </styles.Container>
    </>
  );
};

export default Game;
