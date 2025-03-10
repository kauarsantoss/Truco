import * as S from "./styles.ts"


export default function Card({ img1, img2, img3, position, flip }) {
    console.log("flip:", flip); // Veja se está true quando esperado
    return (
      <S.Container $position={position} $flip={flip}>
        <S.Card src={img1} />
        <S.Card src={img2} />
        <S.Card src={img3} />
      </S.Container>
    );
}