import styled, { css } from "styled-components";

export const Container = styled.div<{ $position?: string; $flip?: boolean }>`
  display: flex;
  position: absolute;
  align-items: center;
  justify-content: center;

  ${({ $position, $flip }) => {
    let transform = "";

    if ($position === "left") {
      transform = `translateY(-50%) rotate(${ $flip ? "90deg" : "0deg" })`;
      return css`
        left: 5%;
        top: 50%;
        transform: ${transform};
      `;
    }

    if ($position === "top") {
      transform = `translateX(-50%) rotate(${ $flip ? "180deg" : "0deg" })`;
      return css`
        top: 5%;
        left: 50%;
        transform: ${transform};
      `;
    }

    if ($position === "right") {
      transform = `translateY(-50%) rotate(${ $flip ? "270deg" : "0deg" })`;
      return css`
        right: 5%;
        top: 50%;
        transform: ${transform};
      `;
    }

    if ($position === "bottom") {
      transform = `translateX(-50%) rotate(${ $flip ? "90deg" : "0deg" })`;
      return css`
        bottom: 5%;
        left: 50%;
        transform: ${transform};
      `;
    }

    if ($position === "center") {
      return css`
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      `;
    }
  }}
`;


export const Card = styled.img`
  width: 90px;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: scale(1.1);
  }
`;