import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100vw;
  height: 100vh;
  padding: 10px;
`;

export const Mesa = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  width: 90%;
  max-width: 400px;
  height: 50vh;
  max-height: 300px;
  background-color: green;

  @media (max-width: 600px) {
    width: 100%;
    height: 40vh;
  }
`;

export const Shackles = styled.div`
  position: absolute;
  margin-top: 40px;
  margin-right: 10px;
  top: 0;
  padding: 5px 10px 5px 10px;
  border-radius: 5px;
  background-color: white ;
  right: 0;
`;

export const Tittle = styled.h3`
padding: 0;
text-align:center;
font-size:15px;
`

export const StorageShackles = styled.div`
`
export const Us = styled.div`
  padding: 10px 20px;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

export const They = styled.div`
  padding: 10px 20px;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

export const Ball = styled.div.attrs<{ $isWinner?: string }>(() => ({}))`
  margin-left: 10px;
  border-radius: 30px;
  width: 15px;
  height: 15px;
  background-color: ${({ $isWinner }) => $isWinner || "gray"};
`;

export const Scoreboard = styled.div`
  position: absolute;
  top: 10px;
  left: 0;
  margin-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 10px;
  font-size: 16px;

  @media (max-width: 600px) {
    font-size: 14px;
    padding: 5px;
  }
`;

export const CardContainer = styled.div<{ $position?: string }>`
  display: flex;
  position: absolute;
  ${({ $position }) => {
    if ($position === "left") return "left: 5%; top: 50%; transform: translateY(-50%) rotate(90deg); flex-direction: row;";
    if ($position === "top") return "top: 5%; left: 50%; transform: translateX(-50%) rotate(180deg); flex-direction: row;";
    if ($position === "right") return "right: 5%; top: 50%; transform: translateY(-50%) rotate(270deg); flex-direction: row;";
    if ($position === "bottom") return "bottom: 5%; left: 50%; transform: translateX(-50%); flex-direction: row;";
    return "";
  }}

  @media (max-width: 600px) {
    ${({ $position }) => {
      if ($position === "left") return "left: 2%;";
      if ($position === "right") return "right: 2%;";
      return "";
    }}
  }
`;

export const Card = styled.img<{ $flip?: boolean, $isShackles?: boolean }>`
  width: ${({ $isShackles }) => ($isShackles ? "45px" : "80px")}; /* Ajuste conforme o valor de isShackles */
  cursor: pointer;
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: scale(1.1);
  }

  @media (max-width: 600px) {
    width: ${({ $isShackles }) => ($isShackles ? "30px" : "60px")}; 
  }
`;


export const TableCard = styled(Card)<{ $position?: string }>`
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

export default { Container, Card, CardContainer, Mesa, Scoreboard, TableCard, Us, They, Ball, Shackles, StorageShackles, Tittle};
