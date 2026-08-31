import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { createAudioController } from "./audio";
import { App } from "./App";

const audio = createAudioController();

const root = document.getElementById("app")!;
createRoot(root).render(
  <StrictMode>
    <App audio={audio} />
  </StrictMode>,
);
