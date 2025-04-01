import { useState, useEffect } from "react";
import * as uuid from 'uuid';
import styles from "./styles.ts";
import images from "../Images"; // Importando as imagens
import io from "socket.io-client";

const socket = io('http://localhost:3333');
interface Message {
    id: string;
    name: string;
    text: string;
}

interface Payload {
    name: string;
    text: string;
}
const Game = () => {
    const [name, setName] = useState('');
    const [text, setText] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [deckId, setDeckId] = useState();
    const [shackles, setShackles] = useState([]);
    const [players, setPlayers] = useState([
    { id: 1, name: "Jogador 1", hand: [images[""], images[""], images[""]], position: "bottom" },
    { id: 2, name: "Jogador 2", hand: [images[""], images[""], images[""]], position: "left" },
    { id: 3, name: "Jogador 3", hand: [images[""], images[""], images[""]], position: "top" },
    { id: 4, name: "Jogador 4", hand: [images[""], images[""], images[""]], position: "right" },
  ]);

    useEffect(() => {
        function receivedMessage(message: Payload) {
            const newMessage: Message = {
                id: uuid.v4(),
                name: message.name,
                text: message.text,
            };

            setMessages([...messages, newMessage]);
        }
        socket.on('msgToClient', (message: Payload) => {
            receivedMessage(message);
            // console.log(message);
        });
    }, [messages, name, text]);

  useEffect(() => {
    const createDeck = async () => {
      try {
        const response = await fetch("https://truco-blnx.onrender.com/truco/newDeck");
        const data = await response.json();
        setDeckId(data.deck_id)
        console.log(data);
      } catch (error) {
        console.error("Erro ao chamar a API:", error);
      }
    };

    createDeck();
    },[]);
    
    useEffect(() => {

    const giveCards = async () => {
        if (deckId) {
        try {
          console.log("DECKID: "+deckId)
          const response = await fetch(`https://truco-blnx.onrender.com/truco/${deckId}/distribuir`);
          const data = await response.json();
          const playerMap = {
                jogador1: 1,
                jogador2: 2,
                jogador3: 3,
                jogador4: 4,
          };
          setShackles(() => {
            const manilhas = data["manilha"] || [];
            const manilhasAtualizadas = [String(manilhas[0]).toLowerCase()+"d",String(manilhas[0]).toLowerCase()+"s",String(manilhas[0]).toLowerCase()+"h",String(manilhas[0]).toLowerCase()+"c"]
            console.log("Manilha: "+ manilhas)
            console.log("Manilhas Atualizadas: "+manilhasAtualizadas)
            return manilhasAtualizadas.map((card) => ({
              id: card, 
              src: images[`card${card}.png`.toLowerCase()] // Ajusta o caminho da imagem
            }));
          });
          
        setPlayers((prevPlayers) => {
            return prevPlayers.map((player) => {
                const cartas = data["jogador"+ player.id] || [];                
                const cartasCompletas = cartas.map(card => {
                    const caminhoImagem = images[`card${card}.png`.toLowerCase()];
                    return caminhoImagem;
                });
        
                return {
                    ...player,
                    hand: cartasCompletas
                };
            });
        });
        
        } catch (error) {
          console.error("Erro ao chamar a API:", error);
        }
      };
      }
    giveCards()
  }, [deckId]);

  useEffect(() => {
    console.log("Shackles atualizados: ", shackles);
}, [shackles]);   

  const [table, setTable] = useState<{ card: string; position?: string }[]>([]);
  const [score, setScore] = useState<{ rounds: number; winners: number[] }>({
    rounds: 0,
    winners: [0, 0, 0], // Um array de 3 elementos, um para cada rodada
  });
 

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
  
    const getCardValue = (cardImage) => {
        const match = cardImage.match(/card(\d+|[kqja])/);
        return match ? match[1] : null;
    };
  
    let winningCard = roundCards[0];
  
    for (let i = 1; i < roundCards.length; i++) {
      const currentCardValue = String(getCardValue(roundCards[i].card)).toUpperCase();
      const winningCardValue = String(getCardValue(winningCard.card)).toUpperCase();
  
      console.log(`Analisando carta: ${roundCards[i].card} (Valor: ${currentCardValue})`);
  
      if (
        currentCardValue &&
        winningCardValue &&
        force.indexOf(currentCardValue) > force.indexOf(winningCardValue)
      ) {
        winningCard = roundCards[i];
        console.log(`Nova carta vencedora: ${winningCard.card}`);
      }
    }
  
    // Determinar qual equipe venceu
    const winningTeam =
      winningCard.position === "bottom" || winningCard.position === "top" ? "1" : "2";
  
    console.log(`Vencedor da rodada: ${winningTeam}`);
    
    addPoints(winningTeam, 1);
    setTable([]);
  };
  

  const addPoints = (team: "1" | "2") => {
    setScore((prevScore) => {
      const newWinners = [...prevScore.winners]; // Cria uma cópia do array de vencedores
      
      if (prevScore.rounds < 3) { 
        newWinners[prevScore.rounds] = team === "1" ? 1 : 2; // Atualiza o vencedor da rodada atual
      }
  
      return {
        ...prevScore,
        rounds: Math.min(prevScore.rounds + 1, 3), // Incrementa a rodada, mas limita a 3
        winners: newWinners, // Atualiza os vencedores
      };
    });
  };
  
  useEffect(() => {
    console.log("Score atual:", score.winners);
    console.log("Rodada atual:", score.rounds);
  }, [score]); 

  return (<>
    <styles.Shackles>
        <styles.Tittle>        
            Manilhas
        </styles.Tittle>
        <styles.StorageShackles>
            {shackles.map((card, index) => (
                <styles.Card
                key={`${index}`} // A chave pode ser o índice aqui, já que você não tem um ID único
                src={card.src} // Usando card.src para acessar a imagem
                $flip={true}
                $isShackles={true}
                />
            ))}
        </styles.StorageShackles>
    </styles.Shackles>
    <styles.Container>
      <styles.Scoreboard>
      <styles.Us>Nós:
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
        </styles.Us>

<styles.They>Eles:
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
</styles.They>

</styles.Scoreboard>
      <styles.Mesa>
        {table.map((item, index) => (
          <styles.TableCard key={index} src={item.card} $flip={true} $position={item.position} />
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
            />
          ))}
        </styles.CardContainer>
      ))}
    </styles.Container>
    </>
  );
};

export default Game;


