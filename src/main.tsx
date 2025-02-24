import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ToDoApp from "./components/App";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToDoApp />
  </StrictMode>,
)
