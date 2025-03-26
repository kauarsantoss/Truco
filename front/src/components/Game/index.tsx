import { useState } from "react";
import styled from "styled-components";
import images from "../Images"; // Importando as imagens

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100vw;
  height: 100vh;
`;

const Mesa = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  width: 400px;
  height: 300px;
  border: 2px solid #000;
  background-color: green;
`;

const Scoreboard = styled.div`
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 18px;
`;

const CardContainer = styled.div<{ $position?: string }>`
  display: flex;
  position: absolute;
  ${({ $position }) => {
    if ($position === "left") return "left: 5%; top: 50%; transform: translateY(-50%) rotate(90deg); flex-direction: row;";
    if ($position === "top") return "top: 5%; left: 50%; transform: translateX(-50%) rotate(180deg); flex-direction: row;";
    if ($position === "right") return "right: 5%; top: 50%; transform: translateY(-50%) rotate(270deg); flex-direction: row;";
    if ($position === "bottom") return "bottom: 5%; left: 50%; transform: translateX(-50%); flex-direction: row;";
    return "";
  }}
`;

const Card = styled.img<{ $flip?: boolean }>`
  width: 90px;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
  &:hover {
    transform: scale(1.1);
  }
`;

const TableCard = styled(Card)<{ $position?: string }>`
  pointer-events: none;
  position: absolute;
  ${({ $position }) => {
    if ($position === "bottom") return "bottom: 0%; left: 50%; transform: translateX(-50%) rotate(0deg);";
    if ($position === "left") return "left: 10%; top: 50%; transform: translateY(-50%) rotate(90deg);";
    if ($position === "top") return "top: 0%; left: 50%; transform: translateX(-50%) rotate(180deg);";
    if ($position === "right") return "right: 10%; top: 50%; transform: translateY(-50%) rotate(-90deg);";
    return "";
  }}
`;

const Game = () => {
  const [players, setPlayers] = useState([
    { id: 1, name: "Jogador 1", hand: [images["card6c.png"], images["card2c.png"], images["card3c.png"]], position: "bottom" },
    { id: 2, name: "Jogador 2", hand: [images["card4c.png"], images["card5c.png"], images["card3c.png"]], position: "left" },
    { id: 3, name: "Jogador 3", hand: [images["card2c.png"], images["card6c.png"], images["card5c.png"]], position: "top" },
    { id: 4, name: "Jogador 4", hand: [images["card3c.png"], images["card4c.png"], images["card6c.png"]], position: "right" },
  ]);

  const [table, setTable] = useState([]);
  const [score, setScore] = useState<{ nos: number; eles: number }>({ nos: 0, eles: 0 });

  const playCard = (playerId, cardIndex) => {
    const selectedCard = players.find((p) => p.id === playerId)?.hand[cardIndex];
    if (!selectedCard) return;

    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId
          ? { ...player, hand: player.hand.filter((_, index) => index !== cardIndex) }
          : player
      )
    );

    setTable((prevTable) => [...prevTable, { card: selectedCard, position: players.find((p) => p.id === playerId)?.position }]);

    if (table.length === 3) {
      determineRoundWinner([...table, { card: selectedCard, position: players.find((p) => p.id === playerId)?.position }]);
    }
  };

  const determineRoundWinner = (roundCards) => {
    const force = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
    let winningCard = roundCards[0];

    for (let i = 1; i < roundCards.length; i++) {
        console.log("RoundCards: "+roundCards[i].card)
      if (force.indexOf(roundCards[i].card[4]) > force.indexOf(winningCard.card[4])) {
        winningCard = roundCards[i];
        console.log(roundCards[i])
      }
    }

 
    const winningTeam = winningCard.position === "bottom" || winningCard.position === "top" ? "nos" : "eles";
    console.log("ganhador: "+winningTeam)
    addPoints(winningTeam, 1);
    setTable([]);
  };

  const addPoints = (team: "nos" | "eles", points: number) => {
    setScore((prevScore) => ({
      ...prevScore,
      [team]: prevScore[team] + points,
    }));
  };

  return (
    <Container>
      <h1>Jogo de Truco</h1>
      <Scoreboard>
        <div>Nós: {score.nos} pontos</div>
        <div>Eles: {score.eles} pontos</div>
      </Scoreboard>
      <Mesa>
        {table.map((item, index) => (
          <TableCard key={index} src={item.card} $flip={true} $position={item.position} />
        ))}
      </Mesa>
      {players.map((player) => (
        <CardContainer key={player.id} $position={player.position}>
          {player.hand.map((card, index) => (
            <Card
              key={`${player.id}-${index}`}
              src={card}
              $flip={true}
              onClick={() => playCard(player.id, index)}
            />
          ))}
        </CardContainer>
      ))}
    </Container>
  );
};

export default Game;
