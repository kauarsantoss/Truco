import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: Arial, sans-serif;
`;

export const Title = styled.h1`
  margin-bottom: 20px;
`;

export const Mesa = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
  background-color: #2e7d32;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  min-width: 300px;
  min-height: 150px;
`;

export const MesaTitle = styled.h2`
  color: white;
  margin-bottom: 10px;
`;

export const CartasNaMesa = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 10px;
`;

export const JogadoresContainer = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 30px;
  width: 100%;
`;

export const Jogador = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #1e88e5;
  padding: 10px;
  border-radius: 10px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  width: 200px;
`;

export const JogadorNome = styled.h2`
  color: white;
  margin-bottom: 10px;
`;

export const Mao = styled.div`
  display: flex;
  gap: 10px;
`;

export const CartaWrapper = styled.div`
  display: inline-block;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: scale(1.1);
  }
`;