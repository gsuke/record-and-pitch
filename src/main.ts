import "./style.css";
import { createAudioController } from "./audio";
import { createUI } from "./ui";

const app = document.querySelector<HTMLDivElement>("#app")!;
const audio = createAudioController();
createUI(app, audio);
