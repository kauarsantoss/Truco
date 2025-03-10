import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Card from "./components/Cards";
import images from "./components/Images"
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Card img1={images["card6c.png"]} img2={images["card2c.png"]} img3={images["card2c.png"]} position="right"  flip={true} />
    <Card img1={images["card3c.png"]} img2={images["card3c.png"]} img3={images["card3c.png"]} position="left"  flip={true}/>
    <Card img1={images["card4c.png"]} img2={images["card4c.png"]} img3={images["card4c.png"]} position="top" flip={true} />
    <Card img1={images["card5c.png"]} img2={images["card5c.png"]} img3={images["card5c.png"]} position="bottom" flip={false} />
  </StrictMode>,
)
